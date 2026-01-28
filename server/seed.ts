import { db } from "./db";
import { markets, users, positions, trades, systemSettings, customCombos, comboPositions } from "@shared/schema";
import { eq, isNull, isNotNull, sql, notInArray } from "drizzle-orm";
import crypto from "crypto";

const SYSTEM_MARKETS = [
  { id: 1, question: "Trump wins 2028 Election?", description: "Will Donald Trump win the 2028 US Presidential Election?", category: "Politics", currentProbability: 35, volume24h: 125000000, resolutionDate: new Date("2028-11-05") },
  { id: 2, question: "Bitcoin > $150k by 2026?", description: "Will Bitcoin trade above $150,000 USD on Coinbase before Jan 1, 2026?", category: "Crypto", currentProbability: 45, volume24h: 540000000, resolutionDate: new Date("2026-01-01") },
  { id: 3, question: "SpaceX lands on Mars by 2030?", description: "Will SpaceX successfully land a crewed mission on Mars before 2030?", category: "Space", currentProbability: 25, volume24h: 30000000, resolutionDate: new Date("2030-01-01") },
  { id: 4, question: "GPT-6 released in 2026?", description: "Will OpenAI release GPT-6 to the public during the calendar year 2026?", category: "Tech", currentProbability: 65, volume24h: 89000000, resolutionDate: new Date("2027-01-01") },
  { id: 8, question: "Biden runs for 2028 re-election?", description: "Will Joe Biden officially announce a presidential campaign for 2028?", category: "Politics", currentProbability: 5, volume24h: 45000000, resolutionDate: new Date("2027-12-31") },
  { id: 9, question: "DeSantis wins 2028 GOP primary?", description: "Will Ron DeSantis win the 2028 Republican presidential primary?", category: "Politics", currentProbability: 15, volume24h: 38000000, resolutionDate: new Date("2028-08-01") },
  { id: 10, question: "Newsom wins 2028 DNC primary?", description: "Will Gavin Newsom win the 2028 Democratic presidential primary?", category: "Politics", currentProbability: 40, volume24h: 52000000, resolutionDate: new Date("2028-08-01") },
  { id: 11, question: "ETH > $10k by 2026?", description: "Will Ethereum trade above $10,000 USD on Coinbase before Jan 1, 2026?", category: "Crypto", currentProbability: 30, volume24h: 280000000, resolutionDate: new Date("2026-01-01") },
  { id: 12, question: "Solana flips Ethereum by 2027?", description: "Will Solana market cap exceed Ethereum market cap before 2027?", category: "Crypto", currentProbability: 8, volume24h: 120000000, resolutionDate: new Date("2027-01-01") },
  { id: 13, question: "BTC ETF > $100B AUM by 2026?", description: "Will US spot Bitcoin ETFs collectively hold over $100B AUM before 2026?", category: "Crypto", currentProbability: 55, volume24h: 310000000, resolutionDate: new Date("2026-01-01") },
  { id: 14, question: "Apple releases AR glasses 2026?", description: "Will Apple release consumer AR glasses to public in 2026?", category: "Tech", currentProbability: 20, volume24h: 72000000, resolutionDate: new Date("2027-01-01") },
  { id: 15, question: "Tesla Full Self-Driving Level 5 by 2027?", description: "Will Tesla achieve SAE Level 5 autonomous driving certification before 2027?", category: "Tech", currentProbability: 12, volume24h: 89000000, resolutionDate: new Date("2027-01-01") },
  { id: 16, question: "Claude-4 beats GPT-5 on benchmarks?", description: "Will Claude-4 outperform GPT-5 on MMLU benchmark upon release?", category: "Tech", currentProbability: 45, volume24h: 56000000, resolutionDate: new Date("2027-01-01") },
  { id: 17, question: "Lakers win 2026 NBA Championship?", description: "Will the Los Angeles Lakers win the 2025-2026 NBA Championship?", category: "Sports", currentProbability: 8, volume24h: 150000000, resolutionDate: new Date("2026-06-30") },
  { id: 18, question: "Messi wins 2026 World Cup?", description: "Will Lionel Messi win the 2026 FIFA World Cup with Argentina?", category: "Sports", currentProbability: 15, volume24h: 420000000, resolutionDate: new Date("2026-07-31") },
  { id: 19, question: "Yankees win 2026 World Series?", description: "Will the New York Yankees win the 2026 MLB World Series?", category: "Sports", currentProbability: 10, volume24h: 98000000, resolutionDate: new Date("2026-11-01") },
  { id: 20, question: "Taylor Swift retires by 2028?", description: "Will Taylor Swift announce retirement from touring before 2028?", category: "Culture", currentProbability: 5, volume24h: 32000000, resolutionDate: new Date("2028-01-01") },
  { id: 21, question: "Marvel releases X-Men MCU film 2026?", description: "Will Marvel Studios release an X-Men film in the MCU during 2026?", category: "Culture", currentProbability: 70, volume24h: 41000000, resolutionDate: new Date("2027-01-01") },
  { id: 22, question: "Elon Musk net worth > $500B by 2027?", description: "Will Elon Musk net worth exceed $500 billion before 2027?", category: "Culture", currentProbability: 25, volume24h: 67000000, resolutionDate: new Date("2027-01-01") },
  { id: 23, question: "Alien contact confirmed by 2030?", description: "Will any government officially confirm extraterrestrial contact before 2030?", category: "Exotic Bet", currentProbability: 1, volume24h: 5000000, resolutionDate: new Date("2030-01-01") },
  { id: 24, question: "Yellowstone erupts by 2030?", description: "Will the Yellowstone supervolcano have a major eruption before 2030?", category: "Exotic Bet", currentProbability: 1, volume24h: 3500000, resolutionDate: new Date("2030-01-01") },
  { id: 25, question: "Time travel demonstrated by 2035?", description: "Will any scientific institution publicly demonstrate time travel before 2035?", category: "Exotic Bet", currentProbability: 1, volume24h: 2800000, resolutionDate: new Date("2035-01-01") },
  { id: 26, question: "Cold fusion achieves net energy by 2028?", description: "Will cold fusion achieve sustained net positive energy output before 2028?", category: "Exotic Bet", currentProbability: 2, volume24h: 4200000, resolutionDate: new Date("2028-01-01") },
  { id: 27, question: "First trillionaire by 2027?", description: "Will any individual achieve a confirmed net worth of $1 trillion before 2027?", category: "Exotic Bet", currentProbability: 3, volume24h: 18000000, resolutionDate: new Date("2027-01-01") },
  { id: 28, question: "Will Donald Trump kiss a man on the lips?", description: "Will Donald Trump publicly kiss a man on the lips before 2030?", category: "Exotic Bet", currentProbability: 1, volume24h: 1500000, resolutionDate: new Date("2030-01-01") },
];

export async function seedMarkets() {
  console.log("Checking for missing markets...");
  
  for (const market of SYSTEM_MARKETS) {
    const [existing] = await db.select().from(markets).where(eq(markets.id, market.id));
    
    if (!existing) {
      console.log(`Seeding market: ${market.question}`);
      await db.insert(markets).values({
        id: market.id,
        question: market.question,
        description: market.description,
        category: market.category,
        currentProbability: market.currentProbability.toString(),
        volume24h: market.volume24h,
        resolutionDate: market.resolutionDate,
        status: "active",
        isPermissionless: false,
        creator: null,
        imageUrl: null,
      });
    }
  }
  
  const allMarkets = await db.select().from(markets);
  console.log(`Database now has ${allMarkets.length} markets`);
}

// Generate unique referral codes for any users missing them
export async function seedReferralCodes() {
  const usersWithoutCodes = await db.select().from(users).where(isNull(users.referralCode));
  
  if (usersWithoutCodes.length === 0) {
    return;
  }
  
  console.log(`Found ${usersWithoutCodes.length} users without referral codes, generating...`);
  
  for (const user of usersWithoutCodes) {
    const referralCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    await db.update(users).set({ referralCode }).where(eq(users.id, user.id));
  }
  
  console.log(`Generated referral codes for ${usersWithoutCodes.length} users`);
}

// ONE-TIME: Restore missing STLR from all historical profitable positions
export async function restoreMissingStlr() {
  console.log("Restoring missing STLR from historical positions...");
  
  // Get all users
  const allUsers = await db.select().from(users);
  
  // Get all closed positions
  const allPositions = await db.select().from(positions);
  
  // Helper function to calculate milestone reward with decay
  function calculateMilestoneReward(currentStlr: number): number {
    if (currentStlr >= 250000) return 1;
    const decayFactor = 1 + (currentStlr / 2500);
    const reward = Math.floor(1000 / decayFactor);
    return Math.max(1, reward);
  }
  
  // Calculate total points for milestones starting from a given STLR amount
  function calculatePointsForMilestones(numMilestones: number, startingStlr: number): number {
    let totalPoints = 0;
    let runningStlr = startingStlr;
    for (let m = 1; m <= numMilestones; m++) {
      const reward = calculateMilestoneReward(runningStlr);
      totalPoints += reward;
      runningStlr += reward;
    }
    return totalPoints;
  }
  
  let totalRestored = 0;
  let usersUpdated = 0;
  
  for (const user of allUsers) {
    // Sum ALL positive PnL from closed positions for this user
    const userPositions = allPositions.filter((p: any) => 
      p.userId === user.id && 
      (p.status === 'closed' || p.status === 'liquidated') &&
      (p.pnl || 0) > 0
    );
    
    const totalProfitPnl = userPositions.reduce((sum: number, p: any) => sum + (p.pnl || 0), 0);
    
    if (totalProfitPnl <= 0) continue;
    
    // Calculate how many milestones this represents
    const totalMilestones = Math.floor(totalProfitPnl / 10000);
    
    if (totalMilestones <= 0) continue;
    
    const currentStlr = user.stlrPoints || 0;
    
    // Calculate what STLR SHOULD be from milestones alone (starting from 0)
    // This gives us the minimum milestone STLR they should have
    const milestoneStlr = calculatePointsForMilestones(totalMilestones, 0);
    
    // They should have AT LEAST milestoneStlr (plus any social rewards they earned)
    // If current is less than milestone STLR alone, add the difference
    if (milestoneStlr > currentStlr) {
      const toAdd = milestoneStlr - currentStlr;
      const newStlr = currentStlr + toAdd;
      
      await db.update(users)
        .set({ stlrPoints: newStlr })
        .where(eq(users.id, user.id));
      
      console.log(`User ${user.walletAddress?.slice(0, 10)}...: +${toAdd.toLocaleString()} STLR (${currentStlr.toLocaleString()} -> ${newStlr.toLocaleString()}), profit: $${totalProfitPnl.toLocaleString()}, milestones: ${totalMilestones.toLocaleString()}`);
      totalRestored += toAdd;
      usersUpdated++;
    }
  }
  
  console.log(`STLR restoration complete: ${totalRestored.toLocaleString()} STLR restored for ${usersUpdated} users`);
}

// ONE-TIME FIX: Liquidate user 0xfd6410, set STLR to 1M, reset balance
// This runs once on startup and is tracked via systemSettings to prevent re-running
// Uses direct DB operations (no simulation dependency) for production safety
const TARGET_WALLET = "0xfd6410";
const TARGET_BALANCE = "10000";
const TARGET_STLR = 1000000; // 1 million

export async function fixTargetUser() {
  const FIX_KEY = "fix_user_0xfd6410_v3"; // v3: set STLR to 1M
  
  // Check if already applied
  const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, FIX_KEY));
  if (existing) {
    return; // Already applied
  }
  
  console.log(`[one-time-fix] Looking for user ${TARGET_WALLET}...`);
  
  // Find user by wallet address prefix (case-insensitive)
  const [targetUser] = await db.select()
    .from(users)
    .where(sql`LOWER(wallet_address) LIKE ${TARGET_WALLET.toLowerCase() + '%'}`);
  
  if (!targetUser) {
    console.log(`[one-time-fix] User ${TARGET_WALLET} not found in database, will retry on next restart`);
    // DO NOT mark as applied - we want to retry on production where user exists
    return;
  }
  
  console.log(`[one-time-fix] Found user: ${targetUser.walletAddress}`);
  const currentStlr = targetUser.stlrPoints || 0;
  const newStlr = TARGET_STLR; // Set to 1 million
  
  // Get all open positions for this user
  const userPositions = await db.select()
    .from(positions)
    .where(sql`${positions.userId} = ${targetUser.id} AND ${positions.status} = 'open'`);
  
  let positionsLiquidated = 0;
  
  // Force close all positions (mark as liquidated) - no simulation dependency
  for (const pos of userPositions) {
    try {
      // Use entry price as liquidation price (simple close)
      const liquidationPrice = parseFloat(pos.entryProbability.toString()) || 50;
      
      await db.update(positions)
        .set({ 
          status: "liquidated",
          pnl: 0, // Zero out PnL since we're force-liquidating
          closedAt: new Date()
        })
        .where(eq(positions.id, pos.id));
      
      positionsLiquidated++;
    } catch (error) {
      console.error(`[one-time-fix] Failed to close position ${pos.id}:`, error);
      // Continue with other positions
    }
  }
  
  // Set STLR to half and reset balance
  await db.update(users)
    .set({ 
      stlrPoints: newStlr,
      balance: TARGET_BALANCE
    })
    .where(eq(users.id, targetUser.id));
  
  // Only mark as applied AFTER all operations succeed
  await db.insert(systemSettings).values({ 
    key: FIX_KEY, 
    value: JSON.stringify({
      appliedAt: new Date().toISOString(),
      wallet: targetUser.walletAddress,
      positionsLiquidated,
      previousStlr: currentStlr,
      newStlr: newStlr,
      newBalance: TARGET_BALANCE
    })
  });
  
  console.log(`[one-time-fix] User ${targetUser.walletAddress} fixed:`);
  console.log(`  - Closed ${positionsLiquidated} open positions`);
  console.log(`  - Set STLR: ${currentStlr.toLocaleString()} -> ${newStlr.toLocaleString()}`);
  console.log(`  - Reset balance to $${TARGET_BALANCE}`);
}

// ONE-TIME FIX: Drop all users with balance > $2,000,000 down to $1,000
// This runs once on startup and is tracked via systemSettings to prevent re-running
export async function fixHighBalanceUsers() {
  const FIX_KEY = "fix_high_balance_users_v2"; // v2: threshold changed to 2M
  const BALANCE_THRESHOLD = 2000000; // 2 million
  const NEW_BALANCE = "1000";
  
  // Check if already applied
  const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, FIX_KEY));
  if (existing) {
    return; // Already applied
  }
  
  console.log(`[high-balance-fix] Looking for users with balance > $${BALANCE_THRESHOLD.toLocaleString()}...`);
  
  // Find all users with balance over threshold
  const highBalanceUsers = await db.select()
    .from(users)
    .where(sql`CAST(${users.balance} AS NUMERIC) > ${BALANCE_THRESHOLD}`);
  
  if (highBalanceUsers.length === 0) {
    console.log(`[high-balance-fix] No users found with balance > $${BALANCE_THRESHOLD.toLocaleString()}`);
    await db.insert(systemSettings).values({ key: FIX_KEY, value: JSON.stringify({ appliedAt: new Date().toISOString(), usersAffected: 0 }) });
    return;
  }
  
  console.log(`[high-balance-fix] Found ${highBalanceUsers.length} users to adjust`);
  
  const affectedUsers: { wallet: string; oldBalance: string; newBalance: string }[] = [];
  
  for (const user of highBalanceUsers) {
    const oldBalance = user.balance || "0";
    
    await db.update(users)
      .set({ balance: NEW_BALANCE })
      .where(eq(users.id, user.id));
    
    affectedUsers.push({
      wallet: user.walletAddress || "unknown",
      oldBalance: oldBalance,
      newBalance: NEW_BALANCE
    });
    
    console.log(`[high-balance-fix] ${user.walletAddress || "unknown"}: $${parseFloat(oldBalance).toLocaleString()} -> $${NEW_BALANCE}`);
  }
  
  // Mark fix as applied
  await db.insert(systemSettings).values({ 
    key: FIX_KEY, 
    value: JSON.stringify({
      appliedAt: new Date().toISOString(),
      usersAffected: affectedUsers.length,
      threshold: BALANCE_THRESHOLD,
      newBalance: NEW_BALANCE,
      users: affectedUsers
    })
  });
  
  console.log(`[high-balance-fix] Complete: ${affectedUsers.length} users dropped to $${NEW_BALANCE}`);
}

// ONE-TIME FIX: Drop wallet 0x10d6d4 to $1,000
export async function fixWallet10d6d4() {
  const FIX_KEY = "fix_wallet_0x10d6d4_v1";
  const TARGET_WALLET = "0x10d6d4";
  const NEW_BALANCE = "1000";
  
  const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, FIX_KEY));
  if (existing) return;
  
  console.log(`[wallet-fix] Looking for wallet ${TARGET_WALLET}...`);
  
  const [targetUser] = await db.select()
    .from(users)
    .where(sql`LOWER(wallet_address) LIKE ${TARGET_WALLET.toLowerCase() + '%'}`);
  
  if (!targetUser) {
    console.log(`[wallet-fix] Wallet ${TARGET_WALLET} not found, will retry on next restart`);
    return;
  }
  
  const oldBalance = targetUser.balance || "0";
  
  await db.update(users)
    .set({ balance: NEW_BALANCE })
    .where(eq(users.id, targetUser.id));
  
  await db.insert(systemSettings).values({ 
    key: FIX_KEY, 
    value: JSON.stringify({
      appliedAt: new Date().toISOString(),
      wallet: targetUser.walletAddress,
      oldBalance,
      newBalance: NEW_BALANCE
    })
  });
  
  console.log(`[wallet-fix] ${targetUser.walletAddress}: $${parseFloat(oldBalance).toLocaleString()} -> $${NEW_BALANCE}`);
}

// ONE-TIME FIX: Drop STLR to 1.5M for specific wallets
export async function fixStlrCap() {
  const FIX_KEY = "fix_stlr_cap_1_5m_v1";
  const TARGET_WALLETS = ["0x8b1ada", "0xfd6410"];
  const NEW_STLR = 1500000;
  
  const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, FIX_KEY));
  if (existing) return;
  
  console.log(`[stlr-cap-fix] Capping STLR to ${NEW_STLR.toLocaleString()} for ${TARGET_WALLETS.length} wallets...`);
  
  const affectedUsers: { wallet: string; oldStlr: number; newStlr: number }[] = [];
  
  for (const prefix of TARGET_WALLETS) {
    const [targetUser] = await db.select()
      .from(users)
      .where(sql`LOWER(wallet_address) LIKE ${prefix.toLowerCase() + '%'}`);
    
    if (!targetUser) {
      console.log(`[stlr-cap-fix] Wallet ${prefix} not found, skipping`);
      continue;
    }
    
    const oldStlr = targetUser.stlrPoints || 0;
    if (oldStlr <= NEW_STLR) {
      console.log(`[stlr-cap-fix] ${targetUser.walletAddress}: ${oldStlr.toLocaleString()} STLR already below cap`);
      continue;
    }
    
    await db.update(users)
      .set({ stlrPoints: NEW_STLR })
      .where(eq(users.id, targetUser.id));
    
    affectedUsers.push({
      wallet: targetUser.walletAddress || "unknown",
      oldStlr,
      newStlr: NEW_STLR
    });
    
    console.log(`[stlr-cap-fix] ${targetUser.walletAddress}: ${oldStlr.toLocaleString()} -> ${NEW_STLR.toLocaleString()} STLR`);
  }
  
  if (affectedUsers.length === 0) {
    console.log(`[stlr-cap-fix] No target wallets found, will retry on next restart`);
    return;
  }
  
  await db.insert(systemSettings).values({ 
    key: FIX_KEY, 
    value: JSON.stringify({
      appliedAt: new Date().toISOString(),
      usersAffected: affectedUsers.length,
      users: affectedUsers
    })
  });
  
  console.log(`[stlr-cap-fix] Complete: ${affectedUsers.length} users capped to ${NEW_STLR.toLocaleString()} STLR`);
}

// ONE-TIME: Reset all user balances to $10k (runs once, then never again)
export async function resetAllBalancesOnce() {
  const FIX_KEY = "one_time_balance_reset_jan16_2026";
  
  // Check if already applied
  const [existingSetting] = await db.select()
    .from(systemSettings)
    .where(eq(systemSettings.key, FIX_KEY));
  
  if (existingSetting) {
    console.log(`[balance-reset] Already applied, skipping`);
    return;
  }
  
  console.log(`[balance-reset] Resetting ALL user balances to $10,000...`);
  
  // Get count before reset
  const allUsers = await db.select().from(users);
  const userCount = allUsers.length;
  
  // Reset all balances to $10k
  await db.update(users).set({ balance: "10000" });
  
  // Record that this fix was applied
  await db.insert(systemSettings).values({ 
    key: FIX_KEY, 
    value: JSON.stringify({
      appliedAt: new Date().toISOString(),
      usersReset: userCount
    })
  });
  
  console.log(`[balance-reset] Complete: ${userCount} users reset to $10,000`);
}

// ALWAYS: Remove all user-made markets on every startup
export async function cleanupUserContent() {
  console.log(`[cleanup] Starting market cleanup...`);
  
  try {
    // Count before
    const beforeResult = await db.execute(sql`SELECT COUNT(*) as cnt FROM markets`);
    const beforeCount = Number(beforeResult.rows[0]?.cnt || 0);
    console.log(`[cleanup] Markets before: ${beforeCount}`);
    
    if (beforeCount <= 25) {
      console.log(`[cleanup] No cleanup needed`);
      return;
    }
    
    // Delete ALL foreign key dependencies in order:
    // 1. order_executions (references orders)
    await db.execute(sql`DELETE FROM order_executions WHERE order_id IN (SELECT id FROM orders WHERE market_id NOT IN (1,2,3,4,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28))`);
    console.log(`[cleanup] Deleted order_executions`);
    
    // 2. orders (references markets)
    await db.execute(sql`DELETE FROM orders WHERE market_id NOT IN (1,2,3,4,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28)`);
    console.log(`[cleanup] Deleted orders`);
    
    // 3. combo_positions (references custom_combos)
    await db.execute(sql`DELETE FROM combo_positions`);
    console.log(`[cleanup] Deleted combo_positions`);
    
    // 4. custom_combos
    await db.execute(sql`DELETE FROM custom_combos`);
    console.log(`[cleanup] Deleted custom_combos`);
    
    // 5. trades (references markets)
    await db.execute(sql`DELETE FROM trades WHERE market_id NOT IN (1,2,3,4,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28)`);
    console.log(`[cleanup] Deleted trades`);
    
    // 6. positions (references markets)
    await db.execute(sql`DELETE FROM positions WHERE market_id NOT IN (1,2,3,4,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28)`);
    console.log(`[cleanup] Deleted positions`);
    
    // 7. markets
    const delResult = await db.execute(sql`DELETE FROM markets WHERE id NOT IN (1,2,3,4,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28)`);
    console.log(`[cleanup] Deleted ${delResult.rowCount} markets`);
    
    // Count after
    const afterResult = await db.execute(sql`SELECT COUNT(*) as cnt FROM markets`);
    const afterCount = Number(afterResult.rows[0]?.cnt || 0);
    console.log(`[cleanup] Markets after: ${afterCount}`);
    
  } catch (error) {
    console.error(`[cleanup] ERROR:`, error);
  }
}
