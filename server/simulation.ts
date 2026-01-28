import type { Market, Position } from "@shared/schema";
import { db } from "./db";
import { markets, positions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import { calculateCrossMarginMetrics, getPositionsToLiquidate, calculatePositionMargin } from "./riskEngine";
import { broadcastLiquidation, type LiquidationEvent } from "./routes";
import { tickOrderEngine } from "./orderEngine";
import { randomBytes } from "crypto";

// Cryptographically secure random number generator [0, 1)
// Uses crypto.randomBytes instead of Math.random to prevent prediction attacks
function secureRandom(): number {
  const bytes = randomBytes(4);
  const value = bytes.readUInt32BE(0);
  return value / 0x100000000; // Divide by 2^32 to get [0, 1) range
}

export interface OrderBookEntry {
  price: number;
  size: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface MarketState {
  marketId: number;
  currentProbability: number;
  orderBook: OrderBook;
  lastDbUpdate: number;
  isExotic: boolean;
  hasJumped: boolean;
}

export interface ComboState {
  comboId: number;
  legs: { marketId: number; side: "YES" | "NO" }[];
  currentProbability: number; // Calculated from component markets
  multiplier: number;
  orderBook: OrderBook;
}

const marketStates: Map<number, MarketState> = new Map();
const comboStates: Map<number, ComboState> = new Map();
let simulationInterval: NodeJS.Timeout | null = null;
let mockLiquidationInterval: NodeJS.Timeout | null = null;
let mockLiquidationIdCounter = 1000000; // Start high to avoid collisions with real IDs
const DB_UPDATE_INTERVAL = 30000; // 30 seconds
const MOCK_LIQUIDATION_INTERVAL = 30000; // Generate mock liquidation every 30 seconds for demo

// Exotic bet constants
const EXOTIC_MIN_PROB = 0.01;
const EXOTIC_MAX_PROB = 3;
const EXOTIC_JUMP_CHANCE = 0.0001; // 0.01% chance per update
const EXOTIC_JUMP_TARGET = 99;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getRandomDelta(): number {
  const random = secureRandom();
  
  // Add randomized "no movement" periods (40% chance)
  if (random < 0.4) {
    return 0;
  }
  
  // 50% chance of small move (±0.2 to ±0.8) - slower, smaller moves
  if (random < 0.9) {
    const magnitude = 0.2 + secureRandom() * 0.6;
    // Add non-uniform direction bias based on secondary random
    const directionBias = secureRandom();
    return directionBias > 0.5 ? magnitude : -magnitude;
  }
  
  // 10% chance of larger move (±1 to ±2) - reduced from ±3 to ±5
  const magnitude = 1 + secureRandom() * 1;
  const directionRandom = secureRandom();
  return directionRandom > 0.5 ? magnitude : -magnitude;
}

function getExoticDelta(currentProb: number, hasJumped: boolean): { newProb: number; jumped: boolean } {
  // If already jumped, stay at high probability with small oscillation
  if (hasJumped) {
    const delta = (secureRandom() - 0.5) * 2; // ±1%
    return { newProb: clamp(currentProb + delta, 90, 99), jumped: true };
  }
  
  // Check for rare jump event (0.01% chance)
  if (secureRandom() < EXOTIC_JUMP_CHANCE) {
    console.log(`[exotic] RARE JUMP! Market jumping to ${EXOTIC_JUMP_TARGET}%`);
    return { newProb: EXOTIC_JUMP_TARGET, jumped: true };
  }
  
  // Normal exotic oscillation between 0.01% and 3%
  const delta = (secureRandom() - 0.5) * 0.5; // ±0.25%
  const newProb = clamp(currentProb + delta, EXOTIC_MIN_PROB, EXOTIC_MAX_PROB);
  return { newProb, jumped: false };
}

function generateOrderBook(currentProbability: number): OrderBook {
  const bids: OrderBookEntry[] = [];
  const asks: OrderBookEntry[] = [];
  
  const numLevels = 5 + Math.floor(secureRandom() * 3); // 5-7 levels each side
  
  // Generate bids (below current price)
  for (let i = 0; i < numLevels; i++) {
    const distance = (i + 1) * (1 + secureRandom() * 0.5); // 1-1.5 points per level
    const price = Math.max(1, Math.round(currentProbability - distance));
    
    // Exponential decay: more volume near mid price
    const decayFactor = Math.exp(-0.3 * i);
    const baseSize = 100 + secureRandom() * 4900; // 100-5000 USD
    const size = Math.round(baseSize * decayFactor);
    
    if (price > 0 && size >= 100) {
      bids.push({ price, size });
    }
  }
  
  // Generate asks (above current price)
  for (let i = 0; i < numLevels; i++) {
    const distance = (i + 1) * (1 + secureRandom() * 0.5);
    const price = Math.min(99, Math.round(currentProbability + distance));
    
    const decayFactor = Math.exp(-0.3 * i);
    const baseSize = 100 + secureRandom() * 4900;
    const size = Math.round(baseSize * decayFactor);
    
    if (price < 100 && size >= 100) {
      asks.push({ price, size });
    }
  }
  
  // Sort: bids descending, asks ascending
  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);
  
  return { bids, asks };
}

async function checkLiquidations(): Promise<void> {
  try {
    const openPositions = await storage.getAllOpenPositions();
    
    // Group positions by user for cross-margin calculation
    const positionsByUser = new Map<string, typeof openPositions>();
    for (const pos of openPositions) {
      const existing = positionsByUser.get(pos.userId) || [];
      existing.push(pos);
      positionsByUser.set(pos.userId, existing);
    }
    
    const getPrice = (marketId: number): number | null => {
      const state = marketStates.get(marketId);
      return state?.currentProbability ?? null;
    };
    
    // Check each user's portfolio for cross-margin liquidation
    for (const [userId, userPositions] of Array.from(positionsByUser.entries())) {
      // Get user's cash balance
      const user = await storage.getUser(userId);
      if (!user) continue;
      
      const cashBalance = parseFloat(user.balance || "0");
      const metrics = calculateCrossMarginMetrics(cashBalance, userPositions, getPrice);
      
      // If margin ratio < 1, portfolio is underwater - liquidate positions
      if (metrics.marginRatio < 1) {
        console.log(`[cross-margin] User ${userId} margin ratio: ${metrics.marginRatio.toFixed(2)} - triggering liquidation`);
        
        const toLiquidate = getPositionsToLiquidate(
          userPositions, 
          metrics.equity, 
          metrics.maintenanceMargin, 
          getPrice
        );
        
        for (const pos of toLiquidate) {
          const currentPrice = getPrice(pos.marketId) ?? parseFloat(pos.entryProbability.toString());
          console.log(`[cross-margin] Liquidating position ${pos.id} - User: ${userId}, Side: ${pos.side}, Entry: ${pos.entryProbability}%, Current: ${Math.floor(currentPrice)}%`);
          
          const result = await storage.liquidatePosition(pos.id, Math.floor(currentPrice));
          if (result) {
            console.log(`[cross-margin] Position ${pos.id} liquidated with PnL: $${result.pnl}`);
            
            const user = await storage.getUser(userId);
            const profile = await storage.getProfile(user?.walletAddress || "");
            const displayName = profile?.displayName || 
              (user?.walletAddress ? `0x${user.walletAddress.slice(2, 6)}...${user.walletAddress.slice(-4)}` : "Unknown");
            
            const market = await storage.getMarket(pos.marketId);
            const liquidationEvent: LiquidationEvent = {
              id: result.id,
              timestamp: new Date(),
              user: {
                address: user?.walletAddress || "",
                displayName,
              },
              market: {
                id: pos.marketId,
                question: market?.question || "Unknown Market",
              },
              size: pos.size,
              side: pos.side as "YES" | "NO",
            };
            
            broadcastLiquidation(liquidationEvent);
          }
        }
      }
    }
  } catch (error) {
    console.error('[liquidation] Error checking liquidations:', error);
  }
}

async function updatePrices(): Promise<void> {
  const now = Date.now();
  
  for (const [marketId, state] of Array.from(marketStates.entries())) {
    if (state.isExotic) {
      // Exotic bet: oscillate 0.01-3% with rare jump to 99%
      const result = getExoticDelta(state.currentProbability, state.hasJumped);
      state.currentProbability = Number(result.newProb.toFixed(8)); // Keep high precision
      state.hasJumped = result.jumped;
    } else {
      // Regular market: apply random walk
      const delta = getRandomDelta();
      const newProb = clamp(state.currentProbability + delta, 5, 95);
      state.currentProbability = Number(newProb.toFixed(4)); // Standard precision
    }
    
    // Regenerate order book
    state.orderBook = generateOrderBook(state.currentProbability);
    
    // Update database periodically (skip exotic bets - they stay in memory only)
    // Exotic bets need decimal precision that integer DB column can't store
    if (!state.isExotic && now - state.lastDbUpdate >= DB_UPDATE_INTERVAL) {
      try {
        await db
          .update(markets)
          .set({ currentProbability: state.currentProbability.toString() })
          .where(eq(markets.id, marketId));
        state.lastDbUpdate = now;
      } catch (error) {
        console.error(`Failed to update market ${marketId} in database:`, error);
      }
    }
  }
  
  // Update combo probabilities based on new market prices
  updateComboProbabilities();
  
  // Check for liquidations after price updates
  await checkLiquidations();
  
  // Process pending orders (limit, iceberg, TWAP)
  await tickOrderEngine();
}

function getRandomInterval(): number {
  // Return random interval between 6-16 seconds for slower, less predictable updates
  // Use non-linear distribution to make timing harder to predict
  const baseInterval = 6000;
  const variableInterval = Math.pow(secureRandom(), 1.5) * 10000; // Skewed distribution
  const interval = baseInterval + variableInterval;
  
  // In production, double the interval to reduce server costs (12-32 seconds)
  if (process.env.NODE_ENV === "production") {
    return interval * 2;
  }
  return interval;
}

function scheduleNextUpdate(): void {
  const interval = getRandomInterval();
  simulationInterval = setTimeout(async () => {
    try {
      await updatePrices();
    } catch (error: any) {
      console.error('[simulation] updatePrices error:', error.message);
    }
    // Always schedule next update, even if there was an error
    scheduleNextUpdate();
  }, interval);
}

// Mock usernames for demo liquidations
const mockUsernames = [
  "CryptoWhale42", "DegenerateTrader", "LeverageKing", "MoonBoi", "RektAgain",
  "DiamondHands", "PaperHands", "YOLOmaster", "BTCmaxi", "ETHbull",
  "FOMObuyer", "BearishBob", "BullishBill", "MarginCaller", "StopLossIgnorer"
];

function generateMockLiquidation(): void {
  const states = Array.from(marketStates.values());
  if (states.length === 0) return;
  
  const randomMarket = states[Math.floor(secureRandom() * states.length)];
  const randomUsername = mockUsernames[Math.floor(secureRandom() * mockUsernames.length)];
  const randomSize = Math.floor(secureRandom() * 50000) + 1000; // $1k - $51k
  
  storage.getMarket(randomMarket.marketId).then(market => {
    if (!market) return;
    
    mockLiquidationIdCounter++;
    const mockEvent: LiquidationEvent = {
      id: mockLiquidationIdCounter,
      timestamp: new Date(),
      user: {
        address: `0x${secureRandom().toString(16).slice(2, 10)}...${secureRandom().toString(16).slice(2, 6)}`,
        displayName: randomUsername,
      },
      market: {
        id: randomMarket.marketId,
        question: market.question,
      },
      size: randomSize,
      side: secureRandom() > 0.5 ? "YES" : "NO",
    };
    
    broadcastLiquidation(mockEvent);
  }).catch(() => {});
}

function startMockLiquidations(): void {
  if (mockLiquidationInterval) {
    clearInterval(mockLiquidationInterval);
  }
  
  // Generate first mock after 10 seconds, then every 15 seconds
  setTimeout(() => {
    generateMockLiquidation();
    mockLiquidationInterval = setInterval(generateMockLiquidation, MOCK_LIQUIDATION_INTERVAL);
  }, 10000);
}

export function startSimulation(initialMarkets: Market[]): void {
  // Stop any existing simulation
  if (simulationInterval) {
    clearTimeout(simulationInterval);
  }
  
  // Initialize market states
  marketStates.clear();
  const now = Date.now();
  
  for (const market of initialMarkets) {
    const isExotic = market.category === "Exotic Bet";
    const currentProb = typeof market.currentProbability === 'string' ? parseFloat(market.currentProbability) : market.currentProbability;
    marketStates.set(market.id, {
      marketId: market.id,
      currentProbability: currentProb,
      orderBook: generateOrderBook(currentProb),
      lastDbUpdate: now,
      isExotic,
      hasJumped: isExotic && currentProb > 50, // Assume jumped if already high
    });
  }
  
  const exoticCount = initialMarkets.filter(m => m.category === "Exotic Bet").length;
  console.log(`Simulation started for ${initialMarkets.length} markets (${exoticCount} exotic)`);
  
  // Start the update loop
  scheduleNextUpdate();
  
  // Start mock liquidation feed for demo purposes
  startMockLiquidations();
}

export function getMarketState(marketId: number): MarketState | undefined {
  return marketStates.get(marketId);
}

export function getAllMarketStates(): MarketState[] {
  const states = Array.from(marketStates.values());
  // Debug: log occasionally to verify simulation is running
  if (Math.random() < 0.01) { // 1% chance to log
    console.log(`[SSE-debug] Returning ${states.length} market states`);
  }
  return states;
}

export function addMarket(market: Market): void {
  if (!marketStates.has(market.id)) {
    const isExotic = market.category === "Exotic Bet";
    const currentProb = typeof market.currentProbability === 'string' ? parseFloat(market.currentProbability) : market.currentProbability;
    marketStates.set(market.id, {
      marketId: market.id,
      currentProbability: currentProb,
      orderBook: generateOrderBook(currentProb),
      lastDbUpdate: Date.now(),
      isExotic,
      hasJumped: isExotic && currentProb > 50,
    });
  }
}

export function stopSimulation(): void {
  if (simulationInterval) {
    clearTimeout(simulationInterval);
    simulationInterval = null;
  }
  if (mockLiquidationInterval) {
    clearInterval(mockLiquidationInterval);
    mockLiquidationInterval = null;
  }
}

export function removeMarket(marketId: number): void {
  marketStates.delete(marketId);
}

export function removeMarkets(marketIds: number[]): void {
  for (const id of marketIds) {
    marketStates.delete(id);
  }
}

// === COMBO PROBABILITY TRACKING ===

// Calculate combo probability from component market probabilities
function calculateComboProbability(legs: { marketId: number; side: "YES" | "NO" }[]): { probability: number; multiplier: number } {
  let impliedProb = 1;
  
  for (const leg of legs) {
    const marketState = marketStates.get(leg.marketId);
    if (!marketState) continue;
    
    const marketProb = marketState.currentProbability / 100;
    const legProb = leg.side === "YES" ? marketProb : (1 - marketProb);
    impliedProb *= legProb;
  }
  
  const probability = impliedProb * 100; // Convert back to 0-100 scale
  const multiplier = impliedProb > 0 ? Math.min(1 / impliedProb, 999) : 999;
  
  return { probability, multiplier };
}

// Update all combo probabilities based on current market prices
function updateComboProbabilities(): void {
  for (const [comboId, state] of Array.from(comboStates.entries())) {
    const { probability, multiplier } = calculateComboProbability(state.legs);
    state.currentProbability = Number(probability.toFixed(6));
    state.multiplier = Number(multiplier.toFixed(2));
    state.orderBook = generateOrderBook(state.currentProbability);
  }
}

// Register a combo for live probability tracking
export function registerCombo(comboId: number, legs: { marketId: number; side: "YES" | "NO" }[]): void {
  if (comboStates.has(comboId)) return;
  
  const { probability, multiplier } = calculateComboProbability(legs);
  comboStates.set(comboId, {
    comboId,
    legs,
    currentProbability: probability,
    multiplier,
    orderBook: generateOrderBook(probability),
  });
}

// Remove a combo from tracking
export function unregisterCombo(comboId: number): void {
  comboStates.delete(comboId);
}

// Get current combo state
export function getComboState(comboId: number): ComboState | undefined {
  return comboStates.get(comboId);
}

// Get all combo states
export function getAllComboStates(): ComboState[] {
  return Array.from(comboStates.values());
}
