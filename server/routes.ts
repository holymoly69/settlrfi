import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getSession } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { users } from "@shared/models/auth";
import { eq, sql, desc, notInArray, inArray } from "drizzle-orm";
import { positions, trades, markets, userProfiles, orderExecutions, systemSettings, adminAuditLog } from "@shared/schema";
import { getMarketState, getAllMarketStates, getComboState, registerCombo, removeMarkets } from "./simulation";
import { calculateCrossMarginMetrics, calculatePositionMargin, calculatePositionPnL } from "./riskEngine";
import type { Combo, ComboLeg } from "@shared/schema";
import { siteVisits } from "@shared/schema";
import rateLimit from "express-rate-limit";
import { doubleCsrf } from "csrf-csrf";
import cookieParser from "cookie-parser";
import { verifyMessage } from "viem";
import { randomBytes, timingSafeEqual } from "crypto";

// Simple session middleware for mock wallet auth
declare module "express-session" {
  interface SessionData {
    walletAddress?: string;
    userId?: string;
  }
}

// === Server-side numeric normalization ===
// Database numeric types (e.g., numeric(10,2)) are returned as strings by Drizzle ORM
// These functions normalize them to numbers before sending to clients for consistent API contracts

type MarketLike = { currentProbability: string | number; [key: string]: unknown };
type PositionLike = { 
  entryProbability: string | number; 
  liquidationProbability: string | number;
  market?: MarketLike | null;
  [key: string]: unknown;
};

function normalizeMarket<T extends MarketLike>(market: T): T {
  return {
    ...market,
    currentProbability: typeof market.currentProbability === 'number' 
      ? market.currentProbability 
      : parseFloat(String(market.currentProbability))
  };
}

function normalizePosition<T extends PositionLike>(position: T): T {
  return {
    ...position,
    entryProbability: typeof position.entryProbability === 'number'
      ? position.entryProbability
      : parseFloat(String(position.entryProbability)),
    liquidationProbability: typeof position.liquidationProbability === 'number'
      ? position.liquidationProbability
      : parseFloat(String(position.liquidationProbability)),
    market: position.market ? normalizeMarket(position.market) : position.market,
  };
}

// Auth middleware - verifies user is logged in
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

// In-memory nonce store for wallet authentication (prevents replay attacks)
// In production, use Redis or database for distributed systems
const authNonces = new Map<string, { nonce: string; createdAt: number; walletAddress: string }>();

// Generate a cryptographically secure nonce using Node.js crypto module
function generateNonce(): string {
  return randomBytes(24).toString('base64url');
}

// Generate a unique referral code (8 characters, alphanumeric)
function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

// Award STLR to referrer (5% of referred user's STLR)
async function awardReferralBonus(referredUserId: string, stlrAmount: number): Promise<void> {
  if (stlrAmount <= 0) return;
  
  const [referredUser] = await db.select().from(users).where(eq(users.id, referredUserId));
  if (!referredUser?.referredBy) return;
  
  const [referrer] = await db.select().from(users).where(eq(users.id, referredUser.referredBy));
  if (!referrer) return;
  
  // 5% bonus for referrer
  const referralBonus = Math.floor(stlrAmount * 0.05);
  if (referralBonus <= 0) return;
  
  await db.update(users)
    .set({
      stlrPoints: (referrer.stlrPoints || 0) + referralBonus,
      referralStlrEarned: (referrer.referralStlrEarned || 0) + referralBonus,
    })
    .where(eq(users.id, referrer.id));
}

// === Liquidation SSE Infrastructure ===
export interface LiquidationEvent {
  id: number;
  timestamp: Date;
  user: { address: string; displayName: string };
  market: { id: number; question: string };
  size: number;
  side: "YES" | "NO";
}

const recentLiquidations: LiquidationEvent[] = [];
const MAX_RECENT_LIQUIDATIONS = 10;
const liquidationClients = new Set<Response>();

export function broadcastLiquidation(event: LiquidationEvent): void {
  recentLiquidations.unshift(event);
  if (recentLiquidations.length > MAX_RECENT_LIQUIDATIONS) {
    recentLiquidations.pop();
  }
  
  const data = JSON.stringify(event);
  for (const client of Array.from(liquidationClients)) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (err) {
      liquidationClients.delete(client);
    }
  }
}

// Clean up expired nonces periodically (run every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  const entries = Array.from(authNonces.entries());
  for (const [key, value] of entries) {
    if (now - value.createdAt > fiveMinutes) {
      authNonces.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs (much more lenient for real-time apps)
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit auth attempts
  message: { message: "Too many authentication attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Development: 12 orders per minute (5 second avg cooldown)
// Production: 1 order per 5 seconds (strict enforcement)
const isProduction = process.env.NODE_ENV === "production";
const tradeLimiter = rateLimit({
  windowMs: isProduction ? 5 * 1000 : 1 * 60 * 1000, // 5 seconds in prod, 1 minute in dev
  max: isProduction ? 1 : 12, // 1 per 5 seconds in prod, 12 per minute in dev
  message: { message: "Please wait 5 seconds between orders." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin rate limiter - strict to prevent brute force attacks
const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Only 5 admin attempts per minute
  message: { message: "Too many admin attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Timing-safe password verification to prevent timing attacks
function verifyAdminPassword(inputPassword: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error("[security] ADMIN_PASSWORD not set - admin access denied");
    return false;
  }
  
  const input = Buffer.from((inputPassword || "").trim());
  const stored = Buffer.from(adminPassword.trim());
  
  // Constant-time comparison (prevents timing attacks)
  if (input.length !== stored.length) {
    // Still do a comparison to maintain constant time
    const dummy = Buffer.alloc(stored.length);
    timingSafeEqual(dummy, stored);
    return false;
  }
  
  return timingSafeEqual(input, stored);
}

async function logAdminAction(req: Request, action: string, targetWallet: string | null, details: object) {
  try {
    await db.insert(adminAuditLog).values({
      action,
      targetWallet,
      details: JSON.stringify(details),
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
  } catch (error) {
    console.error("[admin-audit] Failed to log action:", error);
  }
}

// Weekly reset tracking (persisted in database)
function getIsoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

async function getLastResetWeek(): Promise<string | null> {
  try {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'last_weekly_reset'));
    return setting?.value || null;
  } catch {
    return null; // Table may not exist yet
  }
}

async function setLastResetWeek(week: string): Promise<void> {
  try {
    await db.insert(systemSettings)
      .values({ key: 'last_weekly_reset', value: week, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: week, updatedAt: new Date() }
      });
  } catch (err) {
    console.error("[weekly-reset] Failed to persist reset week:", err);
  }
}

async function performWeeklyReset(): Promise<{ usersReset: number; positionsClosed: number }> {
  console.log("[weekly-reset] Starting weekly reset...");
  
  // 1. Close all open positions (force liquidate at current price)
  const openPositions = await storage.getAllPositions();
  const activePositions = openPositions.filter(p => p.status === 'open');
  let positionsClosed = 0;
  
  for (const position of activePositions) {
    try {
      await db.update(positions)
        .set({ status: "liquidated", closedAt: new Date() })
        .where(eq(positions.id, position.id));
      positionsClosed++;
    } catch (err) {
      console.error(`[weekly-reset] Failed to close position ${position.id}:`, err);
    }
  }
  
  // 2. Reset all balances to $10,000 and halve STLR points
  const allUsers = await db.select().from(users);
  for (const user of allUsers) {
    const newStlr = Math.floor((user.stlrPoints || 0) / 2);
    await db.update(users)
      .set({ 
        balance: "10000",
        stlrPoints: newStlr,
        weeklyPnl: 0,
      })
      .where(eq(users.id, user.id));
  }
  
  console.log(`[weekly-reset] Complete: ${allUsers.length} users reset, ${positionsClosed} positions closed, STLR halved`);
  return { usersReset: allUsers.length, positionsClosed };
}

// Schedule weekly reset check (runs every hour, executes on Mondays)
async function scheduleWeeklyReset(): Promise<void> {
  setInterval(async () => {
    const now = new Date();
    const currentWeek = getIsoWeek(now);
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday
    const hour = now.getUTCHours();
    
    // Only run on Monday between 00:00-01:00 UTC, and only once per week
    if (dayOfWeek === 1 && hour === 0) {
      const lastReset = await getLastResetWeek();
      if (lastReset !== currentWeek) {
        try {
          await performWeeklyReset();
          await setLastResetWeek(currentWeek);
          console.log(`[weekly-reset] Reset complete for week ${currentWeek}`);
        } catch (error) {
          console.error("[weekly-reset] Failed:", error);
        }
      }
    }
  }, 60 * 60 * 1000); // Check every hour
  
  console.log("[weekly-reset] Scheduler initialized - resets every Monday 00:00 UTC");
}

// Auto-settle combo positions where lockDate has passed
async function settleExpiredComboPositions(): Promise<number> {
  const now = new Date();
  const openPositions = await storage.getAllOpenComboPositions();
  let settled = 0;
  
  for (const position of openPositions) {
    // Check if lockDate has passed
    if (position.lockDate && new Date(position.lockDate) <= now) {
      try {
        // Get current combo probability
        const combo = await storage.getCustomCombo(position.comboId);
        if (!combo) continue;
        
        // Get live probability from simulation state (normalize to number)
        const comboState = getComboState(position.comboId);
        const rawExitProb = comboState?.currentProbability ?? combo.impliedProbability;
        const exitProb = typeof rawExitProb === "number" ? rawExitProb : parseFloat(String(rawExitProb));
        const entryProb = parseFloat(position.entryProbability || "0");
        const stake = position.stake || 0;
        const leverage = position.leverage || 1;
        const notionalSize = stake * leverage;
        
        // Skip if probability values are invalid
        if (isNaN(exitProb) || isNaN(entryProb)) {
          console.error(`[combo-settlement] Invalid probability for position ${position.id}: exit=${exitProb}, entry=${entryProb}`);
          continue;
        }
        
        // PnL formula: notionalSize * (exitProb - entryProb) / 100
        // YES side: profit when probability goes up
        // NO side: profit when probability goes down
        let pnl: number;
        if (position.side === "YES") {
          pnl = notionalSize * (exitProb - entryProb) / 100;
        } else {
          pnl = notionalSize * (entryProb - exitProb) / 100;
        }
        
        // Return stake + pnl to user (minimum 0)
        const returnAmount = Math.max(0, stake + pnl);
        await storage.updateUserBalance(position.userId, returnAmount);
        
        // Close the position
        await storage.closeComboPosition(position.id, Math.floor(pnl), exitProb.toFixed(6));
        settled++;
        
        console.log(`[combo-settlement] Position ${position.id} settled: PnL $${pnl.toFixed(2)}, exitProb ${exitProb.toFixed(2)}%`);
      } catch (err) {
        console.error(`[combo-settlement] Failed to settle position ${position.id}:`, err);
      }
    }
  }
  
  return settled;
}

// Schedule combo position settlement check (runs every 5 minutes)
async function scheduleComboSettlement(): Promise<void> {
  setInterval(async () => {
    try {
      const settled = await settleExpiredComboPositions();
      if (settled > 0) {
        console.log(`[combo-settlement] Settled ${settled} expired positions`);
      }
    } catch (error) {
      console.error("[combo-settlement] Scheduler error:", error);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
  
  // Also run immediately on startup
  const initialSettled = await settleExpiredComboPositions();
  console.log(`[combo-settlement] Scheduler initialized - ${initialSettled} positions settled on startup`);
}

// Export for use in index.ts
export { scheduleWeeklyReset, performWeeklyReset, scheduleComboSettlement };

// CSRF Protection setup - only enforce in production (isProduction defined above with rate limiters)
const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET || "fallback-csrf-secret",
  getSessionIdentifier: (req: Request) => req.sessionID || "anonymous",
  cookieName: "__csrf",
  cookieOptions: {
    httpOnly: true,
    sameSite: isProduction ? "strict" : "lax",
    secure: isProduction,
    path: "/",
  },
  getCsrfTokenFromRequest: (req: Request) => req.headers["x-csrf-token"] as string,
});

// CSRF middleware that skips validation in development but still works in production
const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (!isProduction) {
    // In development, skip CSRF validation but still set the cookie for testing
    return next();
  }
  return doubleCsrfProtection(req, res, next);
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup session (reuse existing session infrastructure)
  app.set("trust proxy", 1);
  app.use(cookieParser());  // Required for CSRF protection
  app.use(getSession());
  
  // Apply general rate limiting to all routes
  app.use("/api", generalLimiter);
  
  // Disable ETag to prevent caching
  app.set("etag", false);
  
  // Cache-busting middleware for ALL API responses - prevent CDN/browser caching
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    next();
  });
  
  // Health check endpoint for autoscale deployments
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  
  // Debug endpoint to check simulation status
  app.get("/api/debug/simulation", (_req, res) => {
    const states = getAllMarketStates();
    res.json({
      marketCount: states.length,
      sampleProbabilities: states.slice(0, 3).map(s => ({
        id: s.marketId,
        prob: s.currentProbability
      })),
      timestamp: Date.now()
    });
  });
  
  // CSRF token endpoint - clients fetch token before making state-changing requests
  app.get("/api/csrf-token", (req, res) => {
    const token = generateCsrfToken(req, res);
    res.json({ csrfToken: token });
  });

  // Auth challenge endpoint - issues a nonce for wallet signature
  app.post("/api/auth/challenge", authLimiter, (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ message: "Wallet address is required" });
      }
      
      // Basic Ethereum address validation
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({ message: "Invalid wallet address format" });
      }
      
      const normalizedAddress = walletAddress.toLowerCase();
      const nonce = generateNonce();
      
      // Store nonce with wallet address and timestamp
      authNonces.set(nonce, {
        nonce,
        createdAt: Date.now(),
        walletAddress: normalizedAddress,
      });
      
      res.json({ nonce });
    } catch (error) {
      console.error("Challenge generation error:", error);
      res.status(500).json({ message: "Failed to generate challenge" });
    }
  });

  // Real Wallet Auth Routes (MetaMask/Rabby/WalletConnect) with signature verification
  app.post("/api/wallet/connect", authLimiter, async (req, res) => {
    try {
      const { walletAddress, message, signature, nonce, referralCode: refCode } = req.body;
      
      // Validate required fields
      if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ message: "Wallet address is required" });
      }
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }
      if (!signature || typeof signature !== 'string') {
        return res.status(400).json({ message: "Signature is required" });
      }
      if (!nonce || typeof nonce !== 'string') {
        return res.status(400).json({ message: "Nonce is required" });
      }
      
      // Basic Ethereum address validation
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({ message: "Invalid wallet address format" });
      }
      
      const normalizedAddress = walletAddress.toLowerCase();
      
      // Verify the nonce exists and matches the wallet address
      const storedNonce = authNonces.get(nonce);
      if (!storedNonce) {
        return res.status(400).json({ message: "Invalid or expired nonce. Please try again." });
      }
      
      // Verify nonce was issued for this wallet address
      if (storedNonce.walletAddress !== normalizedAddress) {
        return res.status(400).json({ message: "Nonce was not issued for this wallet address" });
      }
      
      // Verify nonce hasn't expired (5 minutes)
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      if (now - storedNonce.createdAt > fiveMinutes) {
        authNonces.delete(nonce); // Clean up expired nonce
        return res.status(400).json({ message: "Nonce expired. Please try again." });
      }
      
      // Invalidate nonce immediately to prevent replay attacks
      authNonces.delete(nonce);
      
      // Verify the message format (must be our sign-in message with nonce)
      if (!message.startsWith('Sign in to Settlr')) {
        return res.status(400).json({ message: "Invalid message format" });
      }
      
      // Verify the nonce is embedded in the message
      if (!message.includes(`Nonce: ${nonce}`)) {
        return res.status(400).json({ message: "Message does not contain the correct nonce" });
      }
      
      // Verify signature matches the claimed wallet address
      try {
        const isValid = await verifyMessage({
          address: walletAddress as `0x${string}`,
          message,
          signature: signature as `0x${string}`,
        });
        
        if (!isValid) {
          return res.status(401).json({ message: "Invalid signature" });
        }
      } catch (verifyError) {
        console.error("Signature verification error:", verifyError);
        return res.status(401).json({ message: "Signature verification failed" });
      }
      
      // Check if user already exists with this wallet
      const [existingUser] = await db.select().from(users).where(eq(users.walletAddress, normalizedAddress));
      
      if (existingUser) {
        // Set session for existing user
        req.session.userId = existingUser.id;
        req.session.walletAddress = normalizedAddress;
        
        return res.json({
          id: existingUser.id,
          walletAddress: existingUser.walletAddress,
          balance: existingUser.balance,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
        });
      }
      
      // Check for valid referrer if referral code provided
      let referrerId: string | null = null;
      if (refCode && typeof refCode === 'string') {
        const [referrer] = await db.select().from(users)
          .where(eq(users.referralCode, refCode.toUpperCase()));
        if (referrer) {
          referrerId = referrer.id;
        }
      }
      
      // Create new user with $10,000 paper trading balance and unique referral code
      const newReferralCode = generateReferralCode();
      const [newUser] = await db.insert(users).values({
        walletAddress: normalizedAddress,
        balance: "10000",
        firstName: `Trader`,
        lastName: normalizedAddress.slice(0, 6),
        referralCode: newReferralCode,
        referredBy: referrerId,
      }).returning();
      
      // Set session
      req.session.userId = newUser.id;
      req.session.walletAddress = normalizedAddress;
      
      res.json({
        id: newUser.id,
        walletAddress: newUser.walletAddress,
        balance: newUser.balance,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      });
    } catch (error) {
      console.error("Wallet connect error:", error);
      res.status(500).json({ message: "Failed to connect wallet" });
    }
  });

  app.get("/api/auth/user", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    res.json({
      id: user.id,
      walletAddress: user.walletAddress,
      balance: user.balance,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  });

  // Logout with CSRF protection to prevent logout attacks
  app.post("/api/logout", csrfProtection, (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // Dev docs password verification (BSC contracts page)
  app.post("/api/verify-dev-password", (req, res) => {
    const { password } = req.body;
    const devPassword = process.env.BSC_DEV_PASSWORD;
    
    if (!devPassword) {
      return res.status(500).json({ message: "Dev password not configured" });
    }
    
    if (password === devPassword) {
      return res.json({ success: true });
    }
    return res.status(401).json({ message: "Invalid password" });
  });

  // === User Profiles ===
  
  // Profile update rate limiter (stricter than general)
  const profileLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit profile updates to 10 per 15 minutes
    message: { message: "Too many profile updates, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Helper to generate default display name from wallet address
  function getDefaultDisplayName(address: string): string {
    const normalized = address.toLowerCase();
    return "0x" + normalized.slice(2, 6) + "..." + normalized.slice(-4);
  }

  // GET /api/profile/:address - Get profile by wallet address
  app.get("/api/profile/:address", async (req, res) => {
    try {
      const { address } = req.params;
      
      // Validate Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ message: "Invalid wallet address format" });
      }
      
      const profile = await storage.getProfile(address);
      
      if (profile && profile.displayName) {
        return res.json({
          walletAddress: profile.walletAddress,
          displayName: profile.displayName,
          createdAt: profile.createdAt,
        });
      }
      
      // Return default display name if no profile or no custom name set
      return res.json({
        walletAddress: address.toLowerCase(),
        displayName: getDefaultDisplayName(address),
        createdAt: null,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // POST /api/profile - Update own profile (requires auth)
  app.post("/api/profile", csrfProtection, profileLimiter, isAuthenticated, async (req, res) => {
    try {
      const { displayName } = req.body;
      
      // Validation: displayName is required
      if (!displayName || typeof displayName !== 'string') {
        return res.status(400).json({ message: "Display name is required" });
      }
      
      // Validation: 3-20 characters
      if (displayName.length < 3 || displayName.length > 20) {
        return res.status(400).json({ message: "Display name must be 3-20 characters" });
      }
      
      // Validation: alphanumeric and underscores only
      if (!/^[a-zA-Z0-9_]+$/.test(displayName)) {
        return res.status(400).json({ message: "Display name can only contain letters, numbers, and underscores" });
      }
      
      const walletAddress = req.session.walletAddress;
      if (!walletAddress) {
        return res.status(401).json({ message: "Wallet address not found in session" });
      }
      
      const profile = await storage.setProfile(walletAddress, displayName);
      
      res.json({
        walletAddress: profile.walletAddress,
        displayName: profile.displayName,
        createdAt: profile.createdAt,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // === Markets ===
  app.get(api.markets.list.path, async (req, res) => {
    try {
      const markets = await storage.getMarkets();
      res.json(markets.map(normalizeMarket));
    } catch (err: any) {
      console.error("[api/markets] Database error:", err.message);
      res.status(500).json({ message: "Failed to fetch markets", error: err.message });
    }
  });

  // V2 endpoint to bypass stubborn caches
  app.get("/api/markets/v2", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    try {
      const markets = await storage.getMarkets();
      res.json(markets.map(normalizeMarket));
    } catch (err: any) {
      console.error("[api/markets/v2] Database error:", err.message);
      res.status(500).json({ message: "Failed to fetch markets", error: err.message });
    }
  });

  // Create new market (permissionless) - with CSRF protection
  app.post("/api/markets", csrfProtection, isAuthenticated, async (req, res) => {
    try {
      const { question, description, category, resolutionDate } = req.body;
      
      if (!question || !category || !resolutionDate) {
        return res.status(400).json({ message: "Missing required fields: question, category, resolutionDate" });
      }

      const walletAddress = req.session.walletAddress;
      
      const newMarket = await storage.createMarket({
        question,
        description: description || "",
        category,
        resolutionDate: new Date(resolutionDate),
        currentProbability: "50",
        volume24h: 0,
        status: "active",
        creator: walletAddress || null,
        isPermissionless: true,
        imageUrl: null,
      });

      res.status(201).json(newMarket);
    } catch (error) {
      console.error("Error creating market:", error);
      res.status(500).json({ message: "Failed to create market" });
    }
  });

  // === SSE Market Stream (must be before :id route) ===
  app.get("/api/markets/stream", (req, res) => {
    // Disable request timeout for long-lived connection
    req.socket?.setTimeout(0);
    req.socket?.setNoDelay(true);
    req.socket?.setKeepAlive(true);
    
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-store, no-transform, must-revalidate");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();

    // Send initial ping
    res.write(":ping\n\n");

    const sendUpdate = () => {
      try {
        if (res.writableEnded) {
          clearInterval(intervalId);
          return;
        }
        const states = getAllMarketStates();
        if (states.length === 0) {
          res.write(":heartbeat\n\n");
          return;
        }
        const data = JSON.stringify({ markets: states });
        res.write(`data: ${data}\n\n`);
      } catch (err: any) {
        console.error('[SSE] Error:', err.message);
        clearInterval(intervalId);
      }
    };

    const intervalId = setInterval(sendUpdate, 2000);
    sendUpdate();

    req.on("close", () => {
      clearInterval(intervalId);
    });
  });

  // === SSE Liquidation Stream (Settlrekt) ===
  app.get("/api/liquidations/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    liquidationClients.add(res);

    for (const event of recentLiquidations) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    req.on("close", () => {
      liquidationClients.delete(res);
    });
  });

  app.get(api.markets.get.path, async (req, res) => {
    const marketId = Number(req.params.id);
    const market = await storage.getMarket(marketId);
    if (!market) {
      return res.status(404).json({ message: "Market not found" });
    }
    // Use real-time probability from simulation if available
    const state = getMarketState(marketId);
    if (state) {
      // Use numeric probability directly (normalized at response level)
      (market as any).currentProbability = state.currentProbability;
    }
    res.json(normalizeMarket(market));
  });

  // === Order Book ===
  app.get("/api/markets/:id/orderbook", async (req, res) => {
    const marketId = Number(req.params.id);
    const state = getMarketState(marketId);
    
    // If simulation hasn't started yet, return empty order book with default probability
    if (!state) {
      // Try to get probability from database as fallback
      const market = await storage.getMarket(marketId);
      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }
      
      // Return empty order book with market's stored probability
      return res.json({
        bids: [],
        asks: [],
        currentProbability: parseFloat(market.currentProbability.toString()),
      });
    }

    res.json({
      bids: state.orderBook.bids,
      asks: state.orderBook.asks,
      currentProbability: state.currentProbability,
    });
  });

  app.get(api.markets.trades.path, async (req, res) => {
    const trades = await storage.getTrades(Number(req.params.id));
    res.json(trades);
  });

  // === Positions ===
  app.get(api.positions.list.path, isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const positions = await storage.getPositions(userId);
    res.json(positions.map(normalizePosition));
  });

  app.post(api.positions.create.path, csrfProtection, tradeLimiter, isAuthenticated, async (req, res) => {
    try {
      const input = api.positions.create.input.parse(req.body);
      const userId = req.session.userId!;
      
      const market = await storage.getMarket(input.marketId);
      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }

      // Use real-time price from simulation for entry if available
      const marketState = getMarketState(input.marketId);
      const entryProbability = marketState ? marketState.currentProbability : parseFloat(market.currentProbability.toString());
      
      // Calculate liquidation probability based on notional size and leverage
      const leverage = Math.max(1, input.leverage ?? 1);
      
      // Validate minimum position size (must be at least $10 to avoid rounding issues)
      if (input.size < 10) {
        return res.status(400).json({ message: "Minimum position size is $10" });
      }
      
      // Validate maximum position size - $1M in production
      const maxPositionSize = isProduction ? 1000000 : 500000;
      if (input.size > maxPositionSize) {
        return res.status(400).json({ message: `Maximum position size is $${maxPositionSize.toLocaleString()}` });
      }
      
      // Enforce maximum 100 open positions per account
      const userPositions = await storage.getPositions(userId);
      const userOpenPositions = userPositions.filter(p => p.status === "open");
      if (userOpenPositions.length >= 100) {
        return res.status(400).json({ message: "Maximum 100 open positions per account. Close some positions to open new ones." });
      }
      
      const liquidationBuffer = 100 / leverage;
      let liquidationProbability = 0;
      
      if (input.side === "YES") {
        liquidationProbability = Math.max(0, entryProbability - liquidationBuffer);
      } else {
        liquidationProbability = Math.min(100, entryProbability + liquidationBuffer);
      }

      // Calculate required margin (collateral)
      const margin = Math.ceil(input.size / leverage);
      
      // Check user has sufficient margin using cross-margin system
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Calculate cross-margin metrics to get free margin (includes unrealized PnL)
      const allPositions = await storage.getPositions(userId);
      const openPositions = allPositions.filter(p => p.status === "open");
      const cashBalance = parseFloat(user.balance || "0");
      
      const getPrice = (marketId: number) => {
        const state = getMarketState(marketId);
        return state?.currentProbability ?? null;
      };
      
      const marginMetrics = calculateCrossMarginMetrics(cashBalance, openPositions, getPrice);
      
      // Check if user has enough free margin (cash + unrealized PnL - used margin)
      if (marginMetrics.freeMargin < margin) {
        return res.status(400).json({ 
          message: `Insufficient margin. Required: $${margin}, Free Margin: $${Math.floor(marginMetrics.freeMargin)} (includes unrealized PnL)`
        });
      }
      
      // Deduct margin from user balance first
      await storage.updateUserBalance(userId, -margin);
      
      const position = await storage.createPosition({
        ...input,
        leverage, // Use sanitized leverage (always >= 1)
        userId,
        entryProbability: entryProbability.toFixed(8),
        liquidationProbability: liquidationProbability.toFixed(8),
      });

      // Record trade in database
      await storage.createTrade({
        marketId: input.marketId,
        price: entryProbability.toFixed(8),
        size: input.size, // Notional size
        side: input.side,
        userId,
      });

      // Check for first trade bonus (STLR earn system)
      // Only award if trading on official markets, not user-made (permissionless) markets
      if (!user.firstTradeDone && !market.isPermissionless) {
        const firstTradeBonus = 500;
        await db.update(users)
          .set({
            firstTradeDone: true,
            stlrPoints: (user.stlrPoints || 0) + firstTradeBonus,
          })
          .where(eq(users.id, userId));
        
        // Award referral bonus (5% of first trade bonus)
        await awardReferralBonus(userId, firstTradeBonus);
        
        // Check if this completes onboarding (twitter + telegram + first trade)
        // Award 1000 STLR to referrer when referred user completes full onboarding
        // Use referralBonusClaimed flag to prevent duplicate bonuses
        if (user.twitterFollowed && user.telegramJoined && user.referredBy && !user.referralBonusClaimed) {
          const [referrer] = await db.select().from(users).where(eq(users.id, user.referredBy));
          if (referrer) {
            const referralCompletionBonus = 1000;
            // Mark the referred user as having claimed their referral bonus
            await db.update(users)
              .set({ referralBonusClaimed: true })
              .where(eq(users.id, userId));
            
            // Award the referrer
            await db.update(users)
              .set({
                stlrPoints: (referrer.stlrPoints || 0) + referralCompletionBonus,
                referralStlrEarned: (referrer.referralStlrEarned || 0) + referralCompletionBonus,
                referralCount: (referrer.referralCount || 0) + 1,
              })
              .where(eq(users.id, referrer.id));
          }
        }
      }

      res.status(201).json(position);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.positions.close.path, csrfProtection, tradeLimiter, isAuthenticated, async (req, res) => {
    const positionId = Number(req.params.id);
    const position = await storage.getPosition(positionId);
    
    if (!position) {
      return res.status(404).json({ message: "Position not found" });
    }

    if (position.userId !== req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get current price from simulation, fall back to DB
    const marketState = getMarketState(position.marketId);
    let currentProb: number;
    
    if (marketState) {
      currentProb = marketState.currentProbability;
    } else {
      const market = await storage.getMarket(position.marketId);
      if (!market) return res.status(404).json({ message: "Market not found" });
      currentProb = parseFloat(market.currentProbability.toString());
    }

    // Calculate margin first (this is what was locked when position opened)
    const margin = Math.ceil(position.size / position.leverage);
    
    const entryProb = parseFloat(position.entryProbability.toString());
    
    // Calculate realized PnL
    // size is already the notional (leveraged) amount, so don't multiply by leverage again
    // For YES: pnl = size * (currentProb - entryProb) / 100
    // For NO: pnl = size * (entryProb - currentProb) / 100
    let pnl: number;
    if (position.side === "YES") {
      pnl = position.size * (currentProb - entryProb) / 100;
    } else {
      pnl = position.size * (entryProb - currentProb) / 100;
    }
    pnl = Math.round(pnl);
    
    // Cap losses at margin - user cannot lose more than their collateral
    // Profits are uncapped (leverage amplifies gains)
    if (pnl < -margin) {
      pnl = -margin;
    }

    // Close the position with calculated PnL
    const updatedPosition = await storage.closePosition(positionId, pnl);

    // Record close trade in database (opposite side to show it's a close)
    await storage.createTrade({
      marketId: position.marketId,
      price: currentProb.toFixed(8),
      size: position.size, // Notional size
      side: position.side === "YES" ? "NO" : "YES", // Opposite side for close
      userId: req.session.userId,
    });

    // Return margin + PnL to user's balance
    // If pnl = -margin, user gets 0 back (full loss of collateral)
    // If pnl > 0, user gets margin + profit
    const balanceChange = margin + pnl;
    await storage.updateUserBalance(position.userId, balanceChange);

    // Update weekly PnL for earn tracking (only positive PnL counts)
    // Only award STLR for trading on official markets, not user-made (permissionless) markets
    const positionMarket = await storage.getMarket(position.marketId);
    const isPermissionlessMarket = positionMarket?.isPermissionless ?? false;
    
    if (pnl > 0 && !isPermissionlessMarket) {
      try {
        const [user] = await db.select().from(users).where(eq(users.id, position.userId));
        if (user) {
          const currentWeek = getCurrentWeekMonday();
          let weeklyPnl = user.weeklyPnl || 0;
          
          if (user.weekStart !== currentWeek) {
            weeklyPnl = 0;
          }
          
          const oldMilestones = Math.floor(weeklyPnl / 10000);
          const newWeeklyPnl = weeklyPnl + pnl;
          const newMilestones = Math.floor(newWeeklyPnl / 10000);
          
          // Award STLR with diminishing returns per milestone (based on user's current STLR)
          const currentStlr = user.stlrPoints || 0;
          const pointsToAdd = calculatePointsForMilestones(oldMilestones, newMilestones, currentStlr);
          const newPoints = currentStlr + pointsToAdd;
          
          await db.update(users)
            .set({
              weeklyPnl: newWeeklyPnl,
              weekStart: currentWeek,
              stlrPoints: newPoints,
            })
            .where(eq(users.id, position.userId));
          
          // Award referral bonus (5% of milestone STLR)
          await awardReferralBonus(position.userId, pointsToAdd);
        }
      } catch (err) {
        console.error("Error updating weekly PnL:", err);
      }
    }

    res.json(updatedPosition);
  });

  // Partial close position
  app.post(api.positions.partialClose.path, csrfProtection, tradeLimiter, isAuthenticated, async (req, res) => {
    try {
      const positionId = Number(req.params.id);
      const { percent } = api.positions.partialClose.input.parse(req.body);
      const position = await storage.getPosition(positionId);
      
      if (!position) {
        return res.status(404).json({ message: "Position not found" });
      }

      if (position.userId !== req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const marketState = getMarketState(position.marketId);
      let currentProb: number;
      
      if (marketState) {
        currentProb = marketState.currentProbability;
      } else {
        const market = await storage.getMarket(position.marketId);
        if (!market) return res.status(404).json({ message: "Market not found" });
        currentProb = parseFloat(market.currentProbability.toString());
      }

      // Calculate close size first
      const closeSize = Math.floor(position.size * (percent / 100));
      if (closeSize <= 0) {
        return res.status(400).json({ message: "Close size too small" });
      }
      
      // Calculate margin for the closed portion
      const closedMargin = Math.ceil(closeSize / position.leverage);
      
      const entryProb = parseFloat(position.entryProbability.toString());
      let pnl: number;
      if (position.side === "YES") {
        pnl = closeSize * (currentProb - entryProb) / 100;
      } else {
        pnl = closeSize * (entryProb - currentProb) / 100;
      }
      pnl = Math.round(pnl);
      
      // Cap losses at margin for the closed portion
      if (pnl < -closedMargin) {
        pnl = -closedMargin;
      }

      const result = await storage.partialClosePosition(positionId, percent, pnl);

      // Return closed margin + PnL to user's balance
      const balanceChange = closedMargin + pnl;
      await storage.updateUserBalance(position.userId, balanceChange);

      // Update weekly PnL for earn tracking (only positive PnL counts)
      // Only award STLR for trading on official markets, not user-made (permissionless) markets
      const partialMarket = await storage.getMarket(position.marketId);
      const isPartialPermissionless = partialMarket?.isPermissionless ?? false;
      
      if (pnl > 0 && !isPartialPermissionless) {
        try {
          const [user] = await db.select().from(users).where(eq(users.id, position.userId));
          if (user) {
            const currentWeek = getCurrentWeekMonday();
            let weeklyPnl = user.weeklyPnl || 0;
            
            if (user.weekStart !== currentWeek) {
              weeklyPnl = 0;
            }
            
            const oldMilestones = Math.floor(weeklyPnl / 10000);
            const newWeeklyPnl = weeklyPnl + pnl;
            const newMilestones = Math.floor(newWeeklyPnl / 10000);
            
            // Award STLR with diminishing returns per milestone (based on user's current STLR)
            const currentStlr = user.stlrPoints || 0;
            const pointsToAdd = calculatePointsForMilestones(oldMilestones, newMilestones, currentStlr);
            const newPoints = currentStlr + pointsToAdd;
            
            await db.update(users)
              .set({
                weeklyPnl: newWeeklyPnl,
                weekStart: currentWeek,
                stlrPoints: newPoints,
              })
              .where(eq(users.id, position.userId));
          }
        } catch (err) {
          console.error("Error updating weekly PnL:", err);
        }
      }

      res.json({ closedPosition: result.closedPosition, remainingPosition: result.remainingPosition });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Get positions by market
  app.get(api.positions.byMarket.path, isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const marketId = Number(req.params.marketId);
    const positions = await storage.getPositionsByMarket(userId, marketId);
    res.json(positions.map(normalizePosition));
  });

  // === Orders (Limit, Iceberg, TWAP) ===
  
  // Get all orders for the current user
  app.get("/api/orders", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const orders = await storage.getOrders(userId);
    res.json(orders);
  });

  // Get orders for a specific market
  app.get("/api/orders/market/:marketId", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const marketId = Number(req.params.marketId);
    const orders = await storage.getOrdersByMarket(userId, marketId);
    res.json(orders);
  });

  // Create a new order
  app.post("/api/orders", csrfProtection, tradeLimiter, isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { marketId, orderType, side, totalSize, visibleSize, limitPrice, twapDurationMs, twapIntervalMs, expiresAt, leverage = 1 } = req.body;

      // Validate required fields
      if (!marketId || !orderType || !side || !totalSize) {
        return res.status(400).json({ message: "Missing required fields: marketId, orderType, side, totalSize" });
      }

      // Validate leverage
      if (leverage < 1 || leverage > 50) {
        return res.status(400).json({ message: "Leverage must be between 1 and 50" });
      }

      // Validate orderType
      const validOrderTypes = ["market", "limit", "iceberg", "twap"];
      if (!validOrderTypes.includes(orderType)) {
        return res.status(400).json({ message: "Invalid orderType. Must be: market, limit, iceberg, or twap" });
      }

      // Validate side
      if (side !== "YES" && side !== "NO") {
        return res.status(400).json({ message: "Invalid side. Must be YES or NO" });
      }

      // Validate size
      if (totalSize < 10) {
        return res.status(400).json({ message: "Minimum order size is $10" });
      }
      
      // Validate maximum position size - $1M in production
      const maxOrderSize = isProduction ? 1000000 : 500000;
      if (totalSize > maxOrderSize) {
        return res.status(400).json({ message: `Maximum order size is $${maxOrderSize.toLocaleString()}` });
      }
      
      // Enforce maximum 100 open positions per account  
      const userOpenPositions = await storage.getPositions(userId);
      const activePositionCount = userOpenPositions.filter(p => p.status === "open").length;
      if (activePositionCount >= 100) {
        return res.status(400).json({ message: "Maximum 100 open positions per account. Close some positions to open new ones." });
      }

      // Validate market exists
      const market = await storage.getMarket(marketId);
      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }

      // Type-specific validations
      if (orderType === "limit") {
        if (limitPrice === undefined || limitPrice === null) {
          return res.status(400).json({ message: "Limit orders require a limitPrice" });
        }
        if (limitPrice < 0 || limitPrice > 100) {
          return res.status(400).json({ message: "limitPrice must be between 0 and 100" });
        }
      }

      if (orderType === "iceberg") {
        if (!visibleSize || visibleSize <= 0) {
          return res.status(400).json({ message: "Iceberg orders require a positive visibleSize (clip size)" });
        }
        if (visibleSize >= totalSize) {
          return res.status(400).json({ message: "Iceberg visibleSize must be less than totalSize" });
        }
      }

      if (orderType === "twap") {
        if (!twapDurationMs || twapDurationMs <= 0) {
          return res.status(400).json({ message: "TWAP orders require a positive twapDurationMs" });
        }
        if (!twapIntervalMs || twapIntervalMs <= 0) {
          return res.status(400).json({ message: "TWAP orders require a positive twapIntervalMs" });
        }
        if (twapIntervalMs > twapDurationMs) {
          return res.status(400).json({ message: "TWAP interval cannot exceed duration" });
        }
      }

      // Create the order (status defaults to "active" in DB)
      const order = await storage.createOrder({
        userId,
        marketId,
        orderType,
        side,
        totalSize,
        remainingSize: totalSize,
        visibleSize: orderType === "iceberg" ? visibleSize : null,
        leverage: leverage,
        limitPrice: orderType === "limit" ? String(limitPrice) : null,
        twapDurationMs: orderType === "twap" ? twapDurationMs : null,
        twapIntervalMs: orderType === "twap" ? twapIntervalMs : null,
        twapNextExecuteAt: orderType === "twap" ? new Date() : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      // For market orders, they're processed immediately on next tick
      // Other order types wait for conditions to be met

      console.log(`[orders] Created ${orderType} order ${order.id} for user ${userId}: ${side} $${totalSize} on market ${marketId}`);

      res.status(201).json(order);
    } catch (err) {
      console.error("Error creating order:", err);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Cancel an order
  app.post("/api/orders/:orderId/cancel", csrfProtection, isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const orderId = Number(req.params.orderId);

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Verify ownership
      if (order.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to cancel this order" });
      }

      // Check if order can be cancelled
      if (order.status === "filled" || order.status === "cancelled") {
        return res.status(400).json({ message: `Cannot cancel an order with status: ${order.status}` });
      }

      const cancelledOrder = await storage.cancelOrder(orderId);
      console.log(`[orders] Cancelled order ${orderId} for user ${userId}`);

      res.json(cancelledOrder);
    } catch (err) {
      console.error("Error cancelling order:", err);
      res.status(500).json({ message: "Failed to cancel order" });
    }
  });

  // Get order executions for an order
  app.get("/api/orders/:orderId/executions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const orderId = Number(req.params.orderId);

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Verify ownership
      if (order.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to view this order" });
      }

      const executions = await storage.getOrderExecutions(orderId);
      res.json(executions);
    } catch (err) {
      console.error("Error fetching executions:", err);
      res.status(500).json({ message: "Failed to fetch executions" });
    }
  });

  // === Portfolio ===
  app.get(api.portfolio.summary.path, isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const positions = await storage.getPositions(userId);
    
    let totalInvested = 0;
    let totalPnl = 0;

    // Calculate unrealized PnL for active positions
    for (const pos of positions) {
      // totalInvested shows actual margin (capital at risk), not leveraged notional
      totalInvested += Math.ceil(pos.size / pos.leverage);
      
      // Use same PnL formula as close position
      // market.currentProbability is typed as string because it's numeric in schema
      const probStr = pos.market.currentProbability?.toString() || "0";
      const currentProb = parseFloat(probStr);
      const entryProb = parseFloat(pos.entryProbability.toString());
      
      let pnl = 0;
      if (pos.side === "YES") {
        pnl = pos.size * (currentProb - entryProb) / 100;
      } else {
        pnl = pos.size * (entryProb - currentProb) / 100;
      }
      
      // Note: Don't cap unrealized losses to show true risk exposure
      // Realized losses are capped at margin when positions are actually closed
      
      totalPnl += pnl;
    }

    res.json({
      totalInvested: Math.round(totalInvested),
      totalPnl: Math.round(totalPnl),
      activePositions: positions.length
    });
  });

  // Cross-margin metrics endpoint
  app.get("/api/portfolio/margin", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const allPositions = await storage.getPositions(userId);
    const openPositions = allPositions.filter(p => p.status === "open");
    const cashBalance = parseFloat(user.balance || "0");

    const getPrice = (marketId: number) => {
      const state = getMarketState(marketId);
      return state?.currentProbability ?? null;
    };

    const metrics = calculateCrossMarginMetrics(cashBalance, openPositions, getPrice);
    res.json(metrics);
  });

  // === Combos (Structured Parlays) ===
  const mockCombos: Combo[] = [
    {
      id: 1,
      name: "Crypto Bull Run 2026",
      category: "Combo",
      probability: 22,
      multiplier: 4.55,
      volume24h: 245000,
      openInterest: 890000,
      legs: [
        { marketId: 2, marketName: "Bitcoin > $150k by 2026?", side: "YES", probability: 62 },
        { marketId: 4, marketName: "GPT-6 released in 2026?", side: "YES", probability: 70 },
      ],
      expiry: new Date("2026-01-01"),
      isCombo: true,
    },
    {
      id: 2,
      name: "Trump + Space Exploration",
      category: "Combo",
      probability: 11,
      multiplier: 9.09,
      volume24h: 178000,
      openInterest: 520000,
      legs: [
        { marketId: 1, marketName: "Trump wins 2028 Election?", side: "YES", probability: 45 },
        { marketId: 3, marketName: "SpaceX lands on Mars by 2030?", side: "YES", probability: 25 },
      ],
      expiry: new Date("2028-11-05"),
      isCombo: true,
    },
    {
      id: 3,
      name: "Tech Revolution Bundle",
      category: "Combo",
      probability: 17,
      multiplier: 5.88,
      volume24h: 312000,
      openInterest: 1100000,
      legs: [
        { marketId: 4, marketName: "GPT-6 released in 2026?", side: "YES", probability: 70 },
        { marketId: 3, marketName: "SpaceX lands on Mars by 2030?", side: "YES", probability: 25 },
      ],
      expiry: new Date("2027-01-01"),
      isCombo: true,
    },
    {
      id: 4,
      name: "Bear Market Hedge",
      category: "Combo",
      probability: 14,
      multiplier: 7.14,
      volume24h: 156000,
      openInterest: 430000,
      legs: [
        { marketId: 2, marketName: "Bitcoin > $150k by 2026?", side: "NO", probability: 38 },
        { marketId: 1, marketName: "Trump wins 2028 Election?", side: "NO", probability: 55 },
      ],
      expiry: new Date("2026-01-01"),
      isCombo: true,
    },
    {
      id: 5,
      name: "Full Moon Shot",
      category: "Combo",
      probability: 4,
      multiplier: 25.0,
      volume24h: 89000,
      openInterest: 210000,
      legs: [
        { marketId: 2, marketName: "Bitcoin > $150k by 2026?", side: "YES", probability: 62 },
        { marketId: 3, marketName: "SpaceX lands on Mars by 2030?", side: "YES", probability: 25 },
        { marketId: 4, marketName: "GPT-6 released in 2026?", side: "YES", probability: 70 },
      ],
      expiry: new Date("2026-01-01"),
      isCombo: true,
    },
    {
      id: 6,
      name: "Political Chaos",
      category: "Combo",
      probability: 25,
      multiplier: 4.0,
      volume24h: 420000,
      openInterest: 780000,
      legs: [
        { marketId: 1, marketName: "Trump wins 2028 Election?", side: "YES", probability: 45 },
        { marketId: 4, marketName: "GPT-6 released in 2026?", side: "NO", probability: 30 },
      ],
      expiry: new Date("2028-11-05"),
      isCombo: true,
    },
    {
      id: 7,
      name: "Degen Special",
      category: "Combo",
      probability: 2,
      multiplier: 50.0,
      volume24h: 67000,
      openInterest: 95000,
      legs: [
        { marketId: 1, marketName: "Trump wins 2028 Election?", side: "YES", probability: 45 },
        { marketId: 2, marketName: "Bitcoin > $150k by 2026?", side: "YES", probability: 62 },
        { marketId: 3, marketName: "SpaceX lands on Mars by 2030?", side: "YES", probability: 25 },
        { marketId: 4, marketName: "GPT-6 released in 2026?", side: "YES", probability: 70 },
      ],
      expiry: new Date("2030-01-01"),
      isCombo: true,
    },
  ];

  app.get("/api/combos", (req, res) => {
    res.json(mockCombos);
  });

  app.get("/api/combos/:id", (req, res) => {
    const comboId = Number(req.params.id);
    const combo = mockCombos.find(c => c.id === comboId);
    if (!combo) {
      return res.status(404).json({ message: "Combo not found" });
    }
    res.json(combo);
  });

  // === Custom Combos (User-Created Parlays) ===

  // Helper function to calculate combo probability and multiplier
  function calculateComboStats(legs: { price: number; side: "YES" | "NO" }[]) {
    let impliedProb = 1;
    legs.forEach(leg => {
      const legProb = leg.side === "YES" ? leg.price / 100 : (100 - leg.price) / 100;
      impliedProb *= legProb;
    });
    const multiplier = impliedProb > 0 ? 1 / impliedProb : 999;
    return { 
      impliedProbability: impliedProb.toFixed(6), 
      multiplier: Math.min(multiplier, 999).toFixed(2) 
    };
  }

  app.get("/api/custom-combos", async (req, res) => {
    try {
      const customCombos = await storage.getCustomCombos();
      res.json(customCombos);
    } catch (error) {
      console.error("Error fetching custom combos:", error);
      res.status(500).json({ message: "Failed to fetch custom combos" });
    }
  });

  app.get("/api/custom-combos/:id", async (req, res) => {
    try {
      const comboId = Number(req.params.id);
      const combo = await storage.getCustomCombo(comboId);
      if (!combo) {
        return res.status(404).json({ message: "Custom combo not found" });
      }
      res.json(combo);
    } catch (error) {
      console.error("Error fetching custom combo:", error);
      res.status(500).json({ message: "Failed to fetch custom combo" });
    }
  });

  app.post("/api/custom-combos", csrfProtection, isAuthenticated, async (req, res) => {
    try {
      const { name, legs } = req.body;
      
      // Validate input
      if (!name || !legs || !Array.isArray(legs) || legs.length < 2 || legs.length > 10) {
        return res.status(400).json({ message: "Invalid request: need name and 2-10 legs" });
      }

      // Calculate stats from legs
      const { impliedProbability, multiplier } = calculateComboStats(legs);

      const userId = req.session.userId!;
      const walletAddress = req.session.walletAddress;
      const newCombo = await storage.createCustomCombo({
        name,
        creatorId: userId,
        creatorAddress: walletAddress,
        legs,
        impliedProbability,
        multiplier,
      });

      res.status(201).json(newCombo);
    } catch (error) {
      console.error("Error creating custom combo:", error);
      res.status(500).json({ message: "Failed to create custom combo" });
    }
  });

  // === Combo Positions (Binary Bets & Probability Trades) ===

  // Get live combo probability from simulation
  app.get("/api/custom-combos/:id/live", async (req, res) => {
    try {
      const comboId = Number(req.params.id);
      const combo = await storage.getCustomCombo(comboId);
      
      if (!combo) {
        return res.status(404).json({ message: "Combo not found" });
      }

      // Get combo state from simulation (live probability)
      const comboState = getComboState(comboId);
      
      if (comboState) {
        res.json({
          ...combo,
          impliedProbability: comboState.currentProbability,
          multiplier: comboState.multiplier,
          orderBook: comboState.orderBook,
          isLive: true,
        });
      } else {
        // Register combo for tracking if not already registered
        const legs = combo.legs.map(leg => ({
          marketId: leg.marketId,
          side: leg.side,
        }));
        registerCombo(comboId, legs);
        
        // Return with recalculated probability
        const newState = getComboState(comboId);
        res.json({
          ...combo,
          impliedProbability: newState?.currentProbability ?? combo.impliedProbability,
          multiplier: newState?.multiplier ?? combo.multiplier,
          orderBook: newState?.orderBook ?? { bids: [], asks: [] },
          isLive: true,
        });
      }
    } catch (error) {
      console.error("Error fetching live combo:", error);
      res.status(500).json({ message: "Failed to fetch live combo" });
    }
  });

  // Get user's combo positions
  app.get("/api/combo-positions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const positions = await storage.getComboPositions(userId);
      res.json(positions);
    } catch (error) {
      console.error("Error fetching combo positions:", error);
      res.status(500).json({ message: "Failed to fetch combo positions" });
    }
  });

  // Open a time-locked combo position
  app.post("/api/combo-positions", csrfProtection, tradeLimiter, isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { comboId, side, stake, leverage, lockDate, entryProbability } = req.body;

      // Validate required fields
      if (!comboId) {
        return res.status(400).json({ message: "comboId is required" });
      }

      if (!["YES", "NO"].includes(side)) {
        return res.status(400).json({ message: "side must be 'YES' or 'NO'" });
      }

      if (!stake || stake <= 0) {
        return res.status(400).json({ message: "stake must be greater than 0" });
      }

      const actualLeverage = Math.min(Math.max(leverage || 1, 1), 50);

      if (!lockDate) {
        return res.status(400).json({ message: "lockDate is required" });
      }

      const lockDateParsed = new Date(lockDate);
      if (isNaN(lockDateParsed.getTime())) {
        return res.status(400).json({ message: "lockDate must be a valid ISO date string" });
      }

      if (lockDateParsed <= new Date()) {
        return res.status(400).json({ message: "lockDate must be in the future" });
      }

      if (typeof entryProbability !== "number" || entryProbability < 0 || entryProbability > 100) {
        return res.status(400).json({ message: "entryProbability must be a number between 0 and 100" });
      }

      // Verify combo exists
      const combo = await storage.getCustomCombo(comboId);
      if (!combo) {
        return res.status(404).json({ message: "Combo not found" });
      }

      // Get user and check balance
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const userBalance = parseFloat(user.balance || "0");

      if (stake > userBalance) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Deduct stake from balance
      await storage.updateUserBalance(userId, -stake);

      // Create position
      const position = await storage.createComboPosition({
        userId,
        comboId,
        side,
        stake,
        leverage: actualLeverage,
        entryProbability: entryProbability.toFixed(6),
        lockDate: lockDateParsed,
      });

      // Award 1,000 STLR for first combo trade (one-time reward)
      let comboRewardAwarded = 0;
      if (!user.comboTradeDone) {
        await db.update(users)
          .set({ 
            comboTradeDone: true,
            stlrPoints: (user.stlrPoints || 0) + 1000,
          })
          .where(eq(users.id, userId));
        comboRewardAwarded = 1000;
        console.log(`[combo-reward] Awarded 1,000 STLR to user ${userId} for first combo trade`);
      }

      res.status(201).json({
        position,
        comboRewardAwarded,
        message: `Position opened: $${stake} ${side} @ ${entryProbability.toFixed(2)}% (${actualLeverage}x leverage), locked until ${lockDateParsed.toISOString().split('T')[0]}${comboRewardAwarded > 0 ? ' (+1,000 STLR bonus!)' : ''}`,
      });
    } catch (error) {
      console.error("Error creating combo position:", error);
      res.status(500).json({ message: "Failed to create combo position" });
    }
  });

  // Close a combo position (manual close before lock date)
  app.post("/api/combo-positions/:id/close", csrfProtection, tradeLimiter, isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const positionId = Number(req.params.id);

      const position = await storage.getComboPosition(positionId);
      if (!position) {
        return res.status(404).json({ message: "Position not found" });
      }

      if (position.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to close this position" });
      }

      if (position.status !== "open") {
        return res.status(400).json({ message: "Position is already closed" });
      }

      // Get current combo probability for exit price
      const combo = await storage.getCustomCombo(position.comboId);
      if (!combo) {
        return res.status(404).json({ message: "Combo not found" });
      }

      const comboState = getComboState(position.comboId);
      const exitProbability = comboState?.currentProbability ?? combo.impliedProbability;
      const entryProbability = parseFloat(position.entryProbability?.toString() || "0");
      const stake = position.stake || 0;
      const leverage = position.leverage || 1;

      // Calculate PnL: (stake * leverage) * (exitProb - entryProb) / 100
      // For NO side, negate the price movement
      let pnl: number;
      if (position.side === "YES") {
        pnl = (stake * leverage) * (exitProbability - entryProbability) / 100;
      } else {
        pnl = (stake * leverage) * (entryProbability - exitProbability) / 100;
      }

      // Return stake + pnl to user (can't be negative beyond stake)
      const totalReturn = stake + pnl;
      const returnAmount = Math.max(0, totalReturn);
      await storage.updateUserBalance(userId, returnAmount);

      const closedPosition = await storage.closeComboPosition(
        positionId, 
        Math.floor(pnl), 
        exitProbability.toFixed(6),
        "settled"
      );

      res.json({
        position: closedPosition,
        pnl: Math.floor(pnl),
        returned: Math.floor(returnAmount),
        message: `Position closed at ${exitProbability.toFixed(2)}% with ${pnl >= 0 ? "+" : ""}$${Math.floor(pnl)} PnL`,
      });
    } catch (error) {
      console.error("Error closing combo position:", error);
      res.status(500).json({ message: "Failed to close combo position" });
    }
  });

  // === UMA Oracle Mock Resolution ===
  app.post("/api/markets/:id/resolve", csrfProtection, isAuthenticated, async (req, res) => {
    try {
      const marketId = Number(req.params.id);
      const { outcome } = req.body; // true = YES, false = NO
      
      if (typeof outcome !== "boolean") {
        return res.status(400).json({ message: "Outcome must be a boolean (true for YES, false for NO)" });
      }

      const market = await storage.getMarket(marketId);
      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }

      // Only creator can resolve their own markets
      // System markets (no creator) cannot be resolved by users - they require admin (future feature)
      const walletAddress = req.session.walletAddress;
      if (!market.creator) {
        return res.status(403).json({ message: "System markets can only be resolved by admins" });
      }
      if (market.creator !== walletAddress) {
        return res.status(403).json({ message: "Only the market creator can resolve this market" });
      }

      // Check if already resolved
      if (market.resolved) {
        return res.status(400).json({ message: "Market is already resolved" });
      }

      // Mock UMA resolution: update market state
      const updatedMarket = await storage.resolveMarket(marketId, outcome);
      
      res.json(updatedMarket);
    } catch (error) {
      console.error("Error resolving market:", error);
      res.status(500).json({ message: "Failed to resolve market" });
    }
  });

  // === STLR Earn/Airdrop System ===
  
  // Helper: Get current week's Monday as YYYY-MM-DD
  function getCurrentWeekMonday(): string {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - diff);
    monday.setUTCHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  }

  // Helper: Calculate diminishing STLR rewards for milestone range
  // Uses aggressive asymptotic curve: starts at 1000 STLR per $10k, drops to 1 STLR per $10k after 250k STLR
  // Formula: reward = max(1, floor(1000 / (1 + userStlr/2500)))
  // At 0 STLR: 1000, at 2500: 500, at 7500: 250, at 22500: 100, at 247500: 10, at 250000+: 1
  function calculateMilestoneReward(milestoneNumber: number, currentUserStlr: number = 0): number {
    // More aggressive curve based on total STLR accumulated
    // After 250k STLR, rewards drop to 1 STLR per $10k profit
    if (currentUserStlr >= 250000) {
      return 1;
    }
    // Exponential decay curve: starts high, drops aggressively
    const decayFactor = 1 + (currentUserStlr / 2500);
    const reward = Math.floor(1000 / decayFactor);
    return Math.max(1, reward);
  }

  // Calculate total points for milestones from oldMilestone+1 to newMilestone
  function calculatePointsForMilestones(oldMilestones: number, newMilestones: number, currentUserStlr: number = 0): number {
    let totalPoints = 0;
    let runningStlr = currentUserStlr;
    for (let m = oldMilestones + 1; m <= newMilestones; m++) {
      const reward = calculateMilestoneReward(m, runningStlr);
      totalPoints += reward;
      runningStlr += reward; // Update running total for next calculation
    }
    return totalPoints;
  }

  // Get earn status
  app.get("/api/earn/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Calculate weeklyPnl from ACTUAL positions data (source of truth)
      // Sum of positive PnL from positions closed this week
      const currentWeek = getCurrentWeekMonday();
      const weekStartDate = new Date(currentWeek);
      
      const userPositions = await db.select().from(positions)
        .where(eq(positions.userId, userId));
      
      // Filter to closed positions this week with positive PnL
      const actualWeeklyPnl = userPositions
        .filter(p => {
          if (p.status !== 'closed' && p.status !== 'liquidated') return false;
          if (!p.closedAt) return false;
          const closedDate = new Date(p.closedAt);
          return closedDate >= weekStartDate && (p.pnl || 0) > 0;
        })
        .reduce((sum, p) => sum + (p.pnl || 0), 0);

      // Read-only: Calculate what STLR should be based on actual PnL
      // But DON'T write to database - just return calculated values
      const cachedWeeklyPnl = user.weekStart === currentWeek ? (user.weeklyPnl || 0) : 0;
      let displayStlrPoints = user.stlrPoints || 0;
      
      // If there are missing milestones, calculate what bonus STLR should be displayed
      if (actualWeeklyPnl > cachedWeeklyPnl) {
        const cachedMilestones = Math.floor(cachedWeeklyPnl / 10000);
        const actualMilestones = Math.floor(actualWeeklyPnl / 10000);
        
        if (actualMilestones > cachedMilestones) {
          const missingPoints = calculatePointsForMilestones(cachedMilestones, actualMilestones, displayStlrPoints);
          displayStlrPoints += missingPoints;
        }
      }

      // Check if unlocked (wallet connected + social tasks + first trade)
      const isUnlocked = user.twitterFollowed && user.telegramJoined && user.firstTradeDone;

      res.json({
        walletAddress: user.walletAddress,
        stlrPoints: displayStlrPoints,
        weeklyPnl: actualWeeklyPnl,
        weekStart: currentWeek,
        twitterFollowed: user.twitterFollowed || false,
        telegramJoined: user.telegramJoined || false,
        firstTradeDone: user.firstTradeDone || false,
        comboTradeDone: user.comboTradeDone || false,
        isUnlocked,
        // Referral data
        referralCode: user.referralCode || null,
        referralCount: user.referralCount || 0,
        referralStlrEarned: user.referralStlrEarned || 0,
      });
    } catch (error) {
      console.error("Error fetching earn status:", error);
      res.status(500).json({ message: "Failed to fetch earn status" });
    }
  });

  // Get referral stats endpoint
  app.get("/api/referral/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has completed onboarding (required for referral link)
      const isOnboarded = user.twitterFollowed && user.telegramJoined && user.firstTradeDone;
      
      // Generate referral code if missing
      if (!user.referralCode) {
        const newCode = generateReferralCode();
        await db.update(users)
          .set({ referralCode: newCode })
          .where(eq(users.id, userId));
        user.referralCode = newCode;
      }

      res.json({
        referralCode: user.referralCode,
        referralCount: user.referralCount || 0,
        referralStlrEarned: user.referralStlrEarned || 0,
        isOnboarded,
      });
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ message: "Failed to fetch referral stats" });
    }
  });

  // Claim social task (Twitter or Telegram)
  app.post("/api/earn/social", csrfProtection, isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { task, signature } = req.body; // task: "twitter" | "telegram"

      if (!task || !["twitter", "telegram"].includes(task)) {
        return res.status(400).json({ message: "Invalid task type" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if already claimed
      if (task === "twitter" && user.twitterFollowed) {
        return res.status(400).json({ message: "Twitter task already completed" });
      }
      if (task === "telegram" && user.telegramJoined) {
        return res.status(400).json({ message: "Telegram task already completed" });
      }

      // Award points (1000 per social task)
      const pointsToAdd = 1000;
      const newPoints = (user.stlrPoints || 0) + pointsToAdd;

      const updateData: Record<string, unknown> = {
        stlrPoints: newPoints,
      };

      if (task === "twitter") {
        updateData.twitterFollowed = true;
      } else {
        updateData.telegramJoined = true;
      }

      await db.update(users).set(updateData).where(eq(users.id, userId));
      
      // Award referral bonus (5% of social task bonus)
      await awardReferralBonus(userId, pointsToAdd);
      
      // Check if this social task completes onboarding (for referral bonus)
      // Use referralBonusClaimed flag to prevent duplicate bonuses
      const willBeTwitterFollowed = task === "twitter" ? true : user.twitterFollowed;
      const willBeTelegramJoined = task === "telegram" ? true : user.telegramJoined;
      
      if (willBeTwitterFollowed && willBeTelegramJoined && user.firstTradeDone && user.referredBy && !user.referralBonusClaimed) {
        // User just completed onboarding with this social task
        const [referrer] = await db.select().from(users).where(eq(users.id, user.referredBy));
        if (referrer) {
          const referralCompletionBonus = 1000;
          // Mark the referred user as having claimed their referral bonus
          await db.update(users)
            .set({ referralBonusClaimed: true })
            .where(eq(users.id, userId));
          
          await db.update(users)
            .set({
              stlrPoints: (referrer.stlrPoints || 0) + referralCompletionBonus,
              referralStlrEarned: (referrer.referralStlrEarned || 0) + referralCompletionBonus,
              referralCount: (referrer.referralCount || 0) + 1,
            })
            .where(eq(users.id, referrer.id));
        }
      }

      res.json({
        success: true,
        task,
        pointsAwarded: pointsToAdd,
        totalPoints: newPoints,
      });
    } catch (error) {
      console.error("Error claiming social task:", error);
      res.status(500).json({ message: "Failed to claim task" });
    }
  });

  // Update weekly PnL (called when positions are closed)
  app.post("/api/earn/pnl", csrfProtection, isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { pnlChange } = req.body;

      if (typeof pnlChange !== "number") {
        return res.status(400).json({ message: "Invalid PnL value" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only track positive PnL for challenges
      if (pnlChange <= 0) {
        return res.json({ success: true, pointsAwarded: 0 });
      }

      // Check if week needs reset
      const currentWeek = getCurrentWeekMonday();
      let weeklyPnl = user.weeklyPnl || 0;

      if (user.weekStart !== currentWeek) {
        weeklyPnl = 0;
      }

      const oldMilestones = Math.floor(weeklyPnl / 10000);
      const newWeeklyPnl = weeklyPnl + pnlChange;
      const newMilestones = Math.floor(newWeeklyPnl / 10000);

      // Award STLR with diminishing returns per milestone (based on user's current STLR)
      const currentStlr = user.stlrPoints || 0;
      const pointsToAdd = calculatePointsForMilestones(oldMilestones, newMilestones, currentStlr);
      const newPoints = currentStlr + pointsToAdd;

      await db.update(users)
        .set({
          weeklyPnl: newWeeklyPnl,
          weekStart: currentWeek,
          stlrPoints: newPoints,
        })
        .where(eq(users.id, userId));

      // Award referral bonus (5% of milestone STLR)
      if (pointsToAdd > 0) {
        await awardReferralBonus(userId, pointsToAdd);
      }

      res.json({
        success: true,
        weeklyPnl: newWeeklyPnl,
        pointsAwarded: pointsToAdd,
        totalPoints: newPoints,
      });
    } catch (error) {
      console.error("Error updating PnL:", error);
      res.status(500).json({ message: "Failed to update PnL" });
    }
  });

  // Sync STLR points with actual PnL (recalculate any missing awards)
  app.post("/api/earn/sync", csrfProtection, isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Calculate actual weeklyPnl from positions data
      const currentWeek = getCurrentWeekMonday();
      const weekStartDate = new Date(currentWeek);
      
      const userPositions = await db.select().from(positions)
        .where(eq(positions.userId, userId));
      
      // Sum of positive PnL from positions closed this week
      const actualWeeklyPnl = userPositions
        .filter(p => {
          if (p.status !== 'closed' && p.status !== 'liquidated') return false;
          if (!p.closedAt) return false;
          const closedDate = new Date(p.closedAt);
          return closedDate >= weekStartDate && (p.pnl || 0) > 0;
        })
        .reduce((sum, p) => sum + (p.pnl || 0), 0);

      // Get cached weeklyPnl (what STLR was based on)
      const cachedWeeklyPnl = user.weekStart === currentWeek ? (user.weeklyPnl || 0) : 0;
      
      // If actual is higher, calculate missing milestones and award STLR
      if (actualWeeklyPnl > cachedWeeklyPnl) {
        const cachedMilestones = Math.floor(cachedWeeklyPnl / 10000);
        const actualMilestones = Math.floor(actualWeeklyPnl / 10000);
        
        const currentStlr = user.stlrPoints || 0;
        const missingPoints = calculatePointsForMilestones(cachedMilestones, actualMilestones, currentStlr);
        const newPoints = currentStlr + missingPoints;
        
        // Update user with synced values
        await db.update(users)
          .set({
            weeklyPnl: actualWeeklyPnl,
            weekStart: currentWeek,
            stlrPoints: newPoints,
          })
          .where(eq(users.id, userId));
        
        // Award referral bonus (5% of synced STLR)
        if (missingPoints > 0) {
          await awardReferralBonus(userId, missingPoints);
        }
        
        return res.json({
          success: true,
          synced: true,
          previousWeeklyPnl: cachedWeeklyPnl,
          actualWeeklyPnl,
          milestonesAwarded: actualMilestones - cachedMilestones,
          stlrAwarded: missingPoints,
          totalStlr: newPoints,
        });
      }
      
      res.json({
        success: true,
        synced: false,
        message: "STLR already in sync with PnL",
        weeklyPnl: actualWeeklyPnl,
        stlrPoints: user.stlrPoints || 0,
      });
    } catch (error) {
      console.error("Error syncing STLR:", error);
      res.status(500).json({ message: "Failed to sync STLR" });
    }
  });

  // === Market Maker API ===
  
  // Asset ID mapping table: Settlr market IDs -> future HIP-3 asset IDs (populated at mainnet launch)
  const settlrToHyperAsset: Record<string, number> = {
    // Will be populated with real HIP-3 asset IDs post-deployment
    // 'btc-150k': 12345,
    // 'trump-2028': 67890,
  };
  
  // MM order validation schema
  const mmOrderSchema = z.object({
    wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
    marketId: z.number().int().positive(),
    side: z.enum(["buy", "sell"]),
    size: z.number().positive().min(10, "Minimum size is $10").max(500000, "Maximum position size is $500,000"),
    price: z.number().min(0.01).max(0.99, "Price must be between 0.01 and 0.99"),
    type: z.enum(["limit", "postOnly", "market"]).default("limit"),
  });
  
  // MM order rate limiter (more generous for MMs)
  const mmLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 orders per minute for MMs
    message: { message: "Too many orders, please slow down." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  // POST /api/mm/order - Place order as market maker (TEMPORARILY DISABLED)
  app.post("/api/mm/order", (_req, res) => {
    return res.status(503).json({ 
      message: "Market maker API is temporarily disabled for maintenance. Please check back later.",
      status: "disabled"
    });
  });
  
  // Original MM order implementation preserved below for re-enabling later
  // See git history for full implementation details
  const _mmOrderImplementationDisabled = true; // marker for code search
  
  /* MM Implementation Notes:
     - Was using mmLimiter, isAuthenticated middleware
     - Validated wallet matches authenticated user
     - Mock mode with simulated fills and PnL
     - STLR rewards for profitable trades on official markets
     - Ready for Hyperliquid integration at launch
  */
  
  // Helper to satisfy type checker - remove when re-enabling
  const _unusedMmVars = { mmOrderSchema, mmLimiter, _mmOrderImplementationDisabled };
  
  // GET /api/mm/status - Get MM account status
  app.get("/api/mm/status/:wallet", async (req, res) => {
    try {
      const wallet = req.params.wallet.toLowerCase();
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        return res.status(400).json({ message: "Invalid wallet address" });
      }
      
      const [mmUser] = await db.select().from(users).where(eq(users.walletAddress, wallet));
      
      if (!mmUser) {
        return res.json({
          exists: false,
          message: "No MM account found. Place an order to create one.",
        });
      }
      
      res.json({
        exists: true,
        wallet: mmUser.walletAddress,
        balance: parseFloat(mmUser.balance || "0"),
        weeklyPnl: mmUser.weeklyPnl || 0,
        stlrPoints: mmUser.stlrPoints || 0,
      });
    } catch (error) {
      console.error("MM status error:", error);
      res.status(500).json({ message: "Failed to get MM status" });
    }
  });
  
  // GET /api/mm/markets - Get available markets for MM quoting
  app.get("/api/mm/markets", async (_req, res) => {
    try {
      const markets = await storage.getMarkets();
      const marketData = markets.map((m) => {
        const state = getMarketState(m.id);
        const currentProb = state?.currentProbability ?? parseFloat(m.currentProbability.toString());
        return {
          id: m.id,
          question: m.question,
          category: m.category,
          currentProbability: currentProb,
          hyperAssetId: settlrToHyperAsset[String(m.id)] || null,
          status: m.status,
        };
      });
      res.json(marketData);
    } catch (error) {
      console.error("MM markets error:", error);
      res.status(500).json({ message: "Failed to get markets" });
    }
  });

  // === Visit Tracking ===
  app.post("/api/track-visit", async (req, res) => {
    try {
      const { visitorId, path } = req.body;
      const userAgent = req.headers['user-agent'] || '';
      const referrer = req.headers['referer'] || '';
      
      await db.insert(siteVisits).values({
        visitorId: visitorId || 'anonymous',
        path: path || '/',
        userAgent,
        referrer,
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to track visit" });
    }
  });

  // === Admin Stats (password protected with timing-safe comparison) ===
  app.post("/api/admin/stats", adminLimiter, async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!verifyAdminPassword(password)) {
        console.log("[security] Failed admin auth attempt on /api/admin/stats");
        return res.status(401).json({ message: "Invalid password" });
      }

      await logAdminAction(req, "view-stats", null, {});
      
      // Get all users with stats
      const allUsers = await db.select().from(users);
      const allPositions = await storage.getAllPositions();
      const allMarkets = await storage.getMarkets();
      
      // Get visit stats
      const allVisits = await db.select().from(siteVisits);
      const uniqueVisitors = new Set(allVisits.map(v => v.visitorId)).size;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const visitsToday = allVisits.filter(v => v.createdAt && new Date(v.createdAt) >= today).length;
      const uniqueVisitorsToday = new Set(
        allVisits.filter(v => v.createdAt && new Date(v.createdAt) >= today).map(v => v.visitorId)
      ).size;
      
      // Calculate stats
      const totalUsers = allUsers.length;
      const totalTrades = allPositions.length;
      const openPositions = allPositions.filter(p => p.status === 'open').length;
      const closedPositions = allPositions.filter(p => p.status === 'closed').length;
      const liquidatedPositions = allPositions.filter(p => p.status === 'liquidated').length;
      
      // Volume = sum of position sizes (notional value)
      const totalVolume = allPositions.reduce((sum, p) => sum + (p.size || 0), 0);
      
      // Additional metrics
      const totalRealizedPnl = allPositions
        .filter(p => p.status !== 'open')
        .reduce((sum, p) => sum + (p.pnl || 0), 0);
      
      const avgLeverage = totalTrades > 0 
        ? Math.round(allPositions.reduce((sum, p) => sum + (p.leverage || 1), 0) / totalTrades)
        : 0;
      
      const winningTrades = allPositions.filter(p => p.status !== 'open' && (p.pnl || 0) > 0).length;
      const losingTrades = allPositions.filter(p => p.status !== 'open' && (p.pnl || 0) < 0).length;
      const winRate = closedPositions + liquidatedPositions > 0 
        ? Math.round((winningTrades / (closedPositions + liquidatedPositions)) * 100)
        : 0;
      
      // Total STLR awarded
      const totalStlr = allUsers.reduce((sum, u) => sum + (u.stlrPoints || 0), 0);
      
      // Open interest (sum of open position sizes - notional value)
      const openInterest = allPositions
        .filter(p => p.status === 'open')
        .reduce((sum, p) => sum + (p.size || 0), 0);
      
      // Average position size (margin)
      const avgPositionSize = totalTrades > 0 
        ? Math.round(totalVolume / totalTrades)
        : 0;
      
      // Daily active traders (users who traded today)
      const dailyTraders = new Set(
        allPositions
          .filter(p => p.createdAt && new Date(p.createdAt) >= today)
          .map(p => p.userId)
      ).size;
      
      // Trades today
      const tradesToday = allPositions.filter(p => p.createdAt && new Date(p.createdAt) >= today).length;
      
      // Platform edge (negative of user PnL = house profit)
      const platformEdge = -totalRealizedPnl;
      
      // Most active market by position count
      const marketPositionCounts = new Map<number, number>();
      allPositions.forEach(p => {
        marketPositionCounts.set(p.marketId, (marketPositionCounts.get(p.marketId) || 0) + 1);
      });
      let topMarketId = 0;
      let topMarketCount = 0;
      marketPositionCounts.forEach((count, marketId) => {
        if (count > topMarketCount) {
          topMarketCount = count;
          topMarketId = marketId;
        }
      });
      const topMarket = allMarkets.find(m => m.id === topMarketId);
      const topMarketName = topMarket?.question?.slice(0, 30) || 'N/A';
      
      // User details with trade counts
      const userStats = allUsers.map(u => {
        const userPositions = allPositions.filter(p => p.userId === u.id);
        return {
          wallet: u.walletAddress || u.email || `User-${u.id}`,
          balance: parseFloat(u.balance || "10000"),
          trades: userPositions.length,
          openPositions: userPositions.filter(p => p.status === 'open').length,
          pnl: parseFloat(u.balance || "10000") - 10000,
          stlr: u.stlrPoints || 0,
          joined: u.createdAt || new Date().toISOString(),
        };
      }).sort((a, b) => new Date(b.joined).getTime() - new Date(a.joined).getTime());
      
      // Recent trades
      const recentTrades = allPositions
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, 20)
        .map(p => {
          const market = allMarkets.find(m => m.id === p.marketId);
          const user = allUsers.find(u => u.id === p.userId);
          return {
            id: p.id,
            wallet: user?.walletAddress ? user.walletAddress.slice(0, 10) + '...' : user?.email?.slice(0, 10) || 'Unknown',
            market: market?.question ? market.question.slice(0, 30) + '...' : 'Unknown Market',
            side: p.side,
            size: p.size || 0,
            leverage: p.leverage || 1,
            status: p.status || 'unknown',
            pnl: p.pnl || 0,
            date: p.createdAt,
          };
        });
      
      // Markets summary
      const marketStats = allMarkets.map(m => ({
        id: m.id,
        question: m.question?.slice(0, 40) || 'Untitled Market',
        category: m.category || 'Uncategorized',
        probability: m.currentProbability ?? 50,
        volume: m.volume24h || 0,
        status: m.status || 'active',
      }));
      
      // Referral stats - users who have made referrals
      const referralStats = allUsers
        .filter(u => (u.referralCount || 0) > 0)
        .map(u => ({
          wallet: u.walletAddress || `User-${u.id}`,
          referralCode: u.referralCode || 'N/A',
          referralCount: u.referralCount || 0,
          referralStlrEarned: u.referralStlrEarned || 0,
          stlr: u.stlrPoints || 0,
          balance: parseFloat(u.balance || "10000"),
        }))
        .sort((a, b) => b.referralCount - a.referralCount);
      
      // Total referral stats
      const totalReferrals = allUsers.reduce((sum, u) => sum + (u.referralCount || 0), 0);
      const totalReferralStlr = allUsers.reduce((sum, u) => sum + (u.referralStlrEarned || 0), 0);
      
      res.json({
        summary: {
          totalUsers,
          totalTrades,
          openPositions,
          closedPositions,
          liquidatedPositions,
          totalVolume,
          totalMarkets: allMarkets.length,
          totalVisits: allVisits.length,
          uniqueVisitors,
          visitsToday,
          uniqueVisitorsToday,
          totalStlr,
          totalRealizedPnl,
          avgLeverage,
          winRate,
          winningTrades,
          losingTrades,
          openInterest,
          avgPositionSize,
          dailyTraders,
          tradesToday,
          platformEdge,
          topMarketName,
          totalReferrals,
          totalReferralStlr,
        },
        users: userStats,
        recentTrades,
        markets: marketStats,
        referrals: referralStats,
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Failed to get admin stats" });
    }
  });

  // === Admin Reset (password protected with timing-safe comparison) ===
  app.post("/api/admin/reset", adminLimiter, async (req, res) => {
    try {
      const { password, action } = req.body;
      
      if (!verifyAdminPassword(password)) {
        console.log("[security] Failed admin auth attempt on /api/admin/reset");
        return res.status(401).json({ message: "Invalid password" });
      }

      await logAdminAction(req, "reset", null, { action });
      
      if (action === "reset_balances") {
        // Reset all user balances to $10,000 and STLR to 0
        await db.update(users).set({ 
          balance: "10000",
          stlrPoints: 0 
        });
        
        // Delete all positions to clean corrupted data
        await db.delete(positions);
        
        console.log("[admin] Reset all user balances to $10,000 and cleared positions");
        return res.json({ success: true, message: "All balances reset to $10,000, positions cleared" });
      }
      
      if (action === "fix_negative_balances") {
        // Only fix users with negative or zero balances
        await db.update(users)
          .set({ balance: "10000" })
          .where(sql`CAST(balance AS DECIMAL) <= 0`);
        
        console.log("[admin] Fixed negative balances");
        return res.json({ success: true, message: "Negative balances fixed" });
      }
      
      if (action === "fix_corrupted") {
        // Targeted fix: reset excessive balances and STLR
        
        // Fix balances > $5,000,000 - reset to $10,000
        const balanceResult = await db.update(users)
          .set({ balance: "10000" })
          .where(sql`CAST(balance AS DECIMAL) > 5000000`)
          .returning();
        
        // Fix STLR > 5,000,000 - cap at 1,000,000
        const stlrResult = await db.update(users)
          .set({ stlrPoints: 1000000 })
          .where(sql`stlr_points > 5000000`)
          .returning();
        
        const balancesFixed = balanceResult.length;
        const stlrFixed = stlrResult.length;
        
        console.log(`[admin] Targeted fix: ${balancesFixed} balances reset to $10k, ${stlrFixed} STLR capped at 1M`);
        return res.json({ 
          success: true, 
          message: `Fixed ${balancesFixed} balances (>$5M → $10k) and ${stlrFixed} STLR (>5M → 1M)` 
        });
      }
      
      // REMOVED: delete_corrupted action - too dangerous, deleted legitimate high-balance users
      // If truly corrupted accounts exist, use fix_corrupted to reset them instead of deleting
      
      res.status(400).json({ message: "Invalid action. Use 'reset_balances', 'fix_negative_balances', or 'fix_corrupted'" });
    } catch (error) {
      console.error("Admin reset error:", error);
      res.status(500).json({ message: "Failed to reset" });
    }
  });

  // === Admin Set Balance/STLR (password protected with timing-safe comparison) ===
  // Supports: balance only, stlrPoints only, or both
  app.post("/api/admin/set-balance", adminLimiter, async (req, res) => {
    try {
      const { password, walletAddress, balance, stlrPoints } = req.body;
      
      if (!verifyAdminPassword(password)) {
        console.log("[security] Failed admin auth attempt on /api/admin/set-balance");
        return res.status(401).json({ message: "Invalid password" });
      }
      
      if (!walletAddress || (balance === undefined && stlrPoints === undefined)) {
        return res.status(400).json({ message: "walletAddress and at least one of balance/stlrPoints are required" });
      }

      const normalizedAddress = walletAddress.toLowerCase().trim();
      
      await logAdminAction(req, "set-balance", normalizedAddress, { 
        newBalance: balance, 
        newStlrPoints: stlrPoints 
      });
      
      // Check if user exists (case-insensitive search)
      const [existingUser] = await db.select()
        .from(users)
        .where(sql`LOWER(wallet_address) = ${normalizedAddress}`);
      
      if (existingUser) {
        // Update existing user - support balance only, STLR only, or both
        const updateFields: any = {};
        if (balance !== undefined) {
          updateFields.balance = String(balance);
        }
        if (stlrPoints !== undefined) {
          updateFields.stlrPoints = Number(stlrPoints);
        }
        
        await db.update(users)
          .set(updateFields)
          .where(sql`LOWER(wallet_address) = ${normalizedAddress}`);
        
        const balanceMsg = balance !== undefined ? `balance: $${Number(balance).toLocaleString()}` : '';
        const stlrMsg = stlrPoints !== undefined ? `STLR: ${Number(stlrPoints).toLocaleString()}` : '';
        const separator = balanceMsg && stlrMsg ? ', ' : '';
        console.log(`[admin] Updated user ${walletAddress}: ${balanceMsg}${separator}${stlrMsg}`);
        return res.json({ 
          success: true, 
          message: `Updated ${walletAddress.slice(0, 10)}... - ${balanceMsg}${separator}${stlrMsg}`,
          action: "updated"
        });
      } else {
        // Create new user with specified balance (default $10k if not specified)
        const newBalance = balance !== undefined ? String(balance) : "10000";
        const newStlr = stlrPoints !== undefined ? Number(stlrPoints) : 0;
        
        const [newUser] = await db.insert(users).values({
          walletAddress: normalizedAddress,
          balance: newBalance,
          firstName: "Trader",
          lastName: normalizedAddress.slice(0, 6),
          stlrPoints: newStlr,
        }).returning();
        
        console.log(`[admin] Created user ${walletAddress} with balance $${newBalance}, STLR: ${newStlr}`);
        return res.json({ 
          success: true, 
          message: `Created ${walletAddress.slice(0, 10)}... with $${Number(newBalance).toLocaleString()} balance, ${newStlr} STLR`,
          action: "created"
        });
      }
    } catch (error) {
      console.error("Admin set-balance error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // === Admin Manual Liquidation (password protected) ===
  app.post("/api/admin/liquidate-user", adminLimiter, async (req, res) => {
    try {
      const { password, walletAddress, setStlr } = req.body;
      
      if (!verifyAdminPassword(password)) {
        console.log("[security] Failed admin auth attempt on /api/admin/liquidate-user");
        return res.status(401).json({ message: "Invalid password" });
      }
      
      if (!walletAddress) {
        return res.status(400).json({ message: "walletAddress is required" });
      }
      
      const normalizedAddress = walletAddress.toLowerCase().trim();
      
      // Find user
      const [targetUser] = await db.select()
        .from(users)
        .where(sql`LOWER(wallet_address) = ${normalizedAddress}`);
      
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get all open positions for this user
      const userPositions = await db.select()
        .from(positions)
        .where(sql`${positions.userId} = ${targetUser.id} AND ${positions.status} = 'open'`);
      
      let positionsLiquidated = 0;
      let totalLoss = 0;
      
      // Force liquidate all positions at current market price
      for (const pos of userPositions) {
        const marketState = getMarketState(pos.marketId);
        const currentPrice = marketState?.currentProbability ?? parseFloat(pos.entryProbability.toString());
        
        const result = await storage.liquidatePosition(pos.id, Math.floor(currentPrice));
        if (result) {
          positionsLiquidated++;
          totalLoss += Math.abs(result.pnl || 0);
        }
      }
      
      // Set STLR if specified
      if (setStlr !== undefined) {
        await db.update(users)
          .set({ stlrPoints: Number(setStlr) })
          .where(eq(users.id, targetUser.id));
      }
      
      // Log the action
      await logAdminAction(req, "manual-liquidate", normalizedAddress, {
        positionsLiquidated,
        totalLoss,
        setStlr,
      });
      
      console.log(`[admin] Manual liquidation: ${walletAddress} - ${positionsLiquidated} positions, loss: $${totalLoss}`);
      
      res.json({
        success: true,
        message: `Liquidated ${positionsLiquidated} positions for ${walletAddress.slice(0, 10)}...`,
        positionsLiquidated,
        totalLoss,
        stlrSet: setStlr,
      });
    } catch (error) {
      console.error("Admin liquidate-user error:", error);
      res.status(500).json({ message: "Failed to liquidate user" });
    }
  });

  // === Admin Backfill Trades (password protected with timing-safe comparison) ===
  app.post("/api/admin/backfill-trades", adminLimiter, async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!verifyAdminPassword(password)) {
        console.log("[security] Failed admin auth attempt on /api/admin/backfill-trades");
        return res.status(401).json({ message: "Invalid password" });
      }

      await logAdminAction(req, "backfill-trades", null, {});
      
      // Get all positions
      const allPositions = await storage.getAllPositions();
      
      // Get all existing trades to check which positions already have trades
      const existingTrades = await db.select({
        marketId: trades.marketId,
        userId: trades.userId,
        timestamp: trades.timestamp,
      }).from(trades);
      
      // Create a set of unique identifiers for existing trades
      // Using marketId + userId + timestamp as a composite key
      const existingTradeKeys = new Set(
        existingTrades.map(t => `${t.marketId}-${t.userId}-${t.timestamp?.getTime()}`)
      );
      
      let createdCount = 0;
      
      for (const position of allPositions) {
        // Check if a trade already exists for this position
        const positionKey = `${position.marketId}-${position.userId}-${position.createdAt?.getTime()}`;
        
        if (!existingTradeKeys.has(positionKey)) {
          // Create trade record from position
          await storage.createTrade({
            marketId: position.marketId,
            price: position.entryProbability,
            size: position.size,
            side: position.side,
            userId: position.userId,
          });
          
          // Manually update the timestamp to match position creation if possible
          // Note: createTrade uses defaultNow() so we do a separate update
          if (position.createdAt) {
            await db.update(trades)
              .set({ timestamp: position.createdAt })
              .where(
                sql`${trades.marketId} = ${position.marketId} 
                AND ${trades.userId} = ${position.userId} 
                AND ${trades.size} = ${position.size}
                AND ${trades.price} = ${position.entryProbability}
                AND ${trades.side} = ${position.side}
                AND ${trades.timestamp} = (SELECT MAX(timestamp) FROM trades WHERE market_id = ${position.marketId} AND user_id = ${position.userId})`
              );
          }
          
          createdCount++;
        }
      }
      
      console.log(`[admin] Backfilled ${createdCount} trades from ${allPositions.length} positions`);
      res.json({ 
        success: true, 
        message: `Created ${createdCount} trade records from ${allPositions.length} positions`,
        tradesCreated: createdCount,
        totalPositions: allPositions.length,
      });
    } catch (error) {
      console.error("Admin backfill-trades error:", error);
      res.status(500).json({ message: "Failed to backfill trades" });
    }
  });

  // === Admin Close User-Made Markets (password protected) ===
  // This closes all user-created markets (non-seed markets) and force-closes all positions in them
  app.post("/api/admin/close-user-markets", adminLimiter, async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!verifyAdminPassword(password)) {
        console.log("[security] Failed admin auth attempt on /api/admin/close-user-markets");
        return res.status(401).json({ message: "Invalid password" });
      }

      await logAdminAction(req, "close-user-markets", null, {});
      
      // Seed market IDs that should NOT be closed
      const SEED_MARKET_IDS = [1, 2, 3, 4, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];
      
      console.log("[admin] Starting aggressive cleanup...");
      
      // FIRST: Delete directly from database using raw SQL to ensure it works
      const deleteResult = await db.execute(sql`
        DELETE FROM markets 
        WHERE id NOT IN (1, 2, 3, 4, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28)
      `);
      console.log("[admin] Direct SQL delete result:", deleteResult);
      
      // Get all user-made markets (not in seed IDs)
      const allMarkets = await storage.getMarkets();
      const userMadeMarkets = allMarkets.filter(m => !SEED_MARKET_IDS.includes(m.id));
      
      if (userMadeMarkets.length === 0) {
        return res.json({
          success: true,
          message: "No user-made markets found to close",
          marketsDeleted: 0,
          positionsClosed: 0,
          totalRefunded: 0,
        });
      }
      
      let positionsClosed = 0;
      let totalRefunded = 0;
      const affectedUsers = new Set<string>();
      
      // Get all open positions across all user-made markets
      const allPositions = await storage.getAllPositions();
      const positionsToClose = allPositions.filter(
        p => p.status === "open" && userMadeMarkets.some(m => m.id === p.marketId)
      );
      
      // Force-close each position and refund the margin
      for (const position of positionsToClose) {
        try {
          // Refund the margin to the user
          const posUser = await storage.getUser(position.userId);
          if (posUser) {
            const refundAmount = position.size / position.leverage; // margin = size / leverage
            const currentBalance = parseFloat(posUser.balance || "0");
            await storage.updateUserBalance(position.userId, currentBalance + refundAmount);
            totalRefunded += refundAmount;
            affectedUsers.add(position.userId);
          }
          
          // Close the position with 0 PnL (force close)
          await db.update(positions)
            .set({
              status: "closed" as const,
              pnl: 0,
              closedAt: new Date(),
            })
            .where(eq(positions.id, position.id));
          
          positionsClosed++;
        } catch (err) {
          console.error(`[admin] Failed to close position ${position.id}:`, err);
        }
      }
      
      // Delete user-made markets from database
      const marketIdsToDelete = userMadeMarkets.map(m => m.id);
      await db.delete(markets).where(inArray(markets.id, marketIdsToDelete));
      
      // CRITICAL: Also remove markets from the in-memory simulation to prevent mismatch
      removeMarkets(marketIdsToDelete);
      
      console.log(`[admin] Closed ${positionsClosed} positions in ${userMadeMarkets.length} user-made markets, refunded $${totalRefunded.toFixed(2)} to ${affectedUsers.size} users`);
      
      res.json({
        success: true,
        message: `Closed ${userMadeMarkets.length} user-made markets and ${positionsClosed} positions`,
        marketsDeleted: userMadeMarkets.length,
        positionsClosed,
        totalRefunded: Math.round(totalRefunded * 100) / 100,
        affectedUsers: affectedUsers.size,
      });
    } catch (error) {
      console.error("Admin close-user-markets error:", error);
      res.status(500).json({ message: "Failed to close user-made markets" });
    }
  });

  // === Public Stats ===
  app.get("/api/stats", async (_req, res) => {
    try {
      // Get REAL volume from actual positions (same as admin dashboard)
      const allPositions = await storage.getAllPositions();
      
      // Total volume = sum of all position sizes (notional value)
      const totalVolume = allPositions.reduce((sum, p) => sum + (p.size || 0), 0);
      const totalTrades = allPositions.length;
      
      // Daily stats (positions created in last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dailyPositions = allPositions.filter(p => p.createdAt && new Date(p.createdAt) >= oneDayAgo);
      const dailyVolume = dailyPositions.reduce((sum, p) => sum + (p.size || 0), 0);
      const dailyTrades = dailyPositions.length;

      // Format in billions for display
      const formatBillions = (val: number) => Math.round(val / 1e9 * 100) / 100;

      res.json({
        daily: {
          volume: dailyVolume,
          volumeBillions: formatBillions(dailyVolume),
          trades: dailyTrades,
        },
        allTime: {
          volume: totalVolume,
          volumeBillions: formatBillions(totalVolume),
          trades: totalTrades,
        },
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // === Activity Feed ===
  app.get("/api/activity/feed", async (req, res) => {
    try {
      // Get recent trades with user profiles and market info
      // Only include trades with userId (user-initiated trades)
      const result = await db
        .select({
          id: trades.id,
          timestamp: trades.timestamp,
          side: trades.side,
          size: trades.size,
          price: trades.price,
          userId: trades.userId,
          marketId: trades.marketId,
          marketQuestion: markets.question,
          displayName: userProfiles.displayName,
        })
        .from(trades)
        .innerJoin(markets, eq(trades.marketId, markets.id))
        .leftJoin(userProfiles, eq(trades.userId, userProfiles.walletAddress))
        .where(sql`${trades.userId} IS NOT NULL`)
        .orderBy(desc(trades.timestamp))
        .limit(50);

      // Format the response
      const feed = result.map((row) => {
        // Generate default display name from wallet address if no profile
        const address = row.userId || "";
        const defaultName = address ? `0x${address.slice(2, 6)}...${address.slice(-4)}` : "Anonymous";
        
        return {
          id: row.id,
          timestamp: row.timestamp,
          type: "trade" as const,
          side: row.side,
          size: row.size,
          price: row.price,
          user: {
            address: row.userId,
            displayName: row.displayName || defaultName,
          },
          market: {
            id: row.marketId,
            question: row.marketQuestion,
          },
        };
      });

      res.json(feed);
    } catch (error) {
      console.error("Error fetching activity feed:", error);
      res.status(500).json({ message: "Failed to fetch activity feed" });
    }
  });

  // === STLR Leaderboard ===
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const result = await db
        .select({
          walletAddress: users.walletAddress,
          stlrPoints: users.stlrPoints,
          weeklyPnl: users.weeklyPnl,
          displayName: userProfiles.displayName,
        })
        .from(users)
        .leftJoin(userProfiles, eq(users.walletAddress, userProfiles.walletAddress))
        .where(sql`${users.stlrPoints} > 0`)
        .orderBy(desc(users.stlrPoints))
        .limit(100);

      const leaderboard = result.map((row, index) => {
        const address = row.walletAddress || "";
        const defaultName = address ? `0x${address.slice(2, 6)}...${address.slice(-4)}` : "Anonymous";
        
        return {
          rank: index + 1,
          walletAddress: row.walletAddress || "",
          displayName: row.displayName || defaultName,
          stlrPoints: row.stlrPoints || 0,
          weeklyPnl: row.weeklyPnl || 0,
        };
      });

      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Seeding is now handled by runStartupTasks() in index.ts
  // This allows the server to start listening before DB operations

  return httpServer;
}

// Removed redundant seedDatabase function that used numeric as number
