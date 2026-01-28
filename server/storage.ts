import { users, markets, positions, trades, customCombos, userProfiles, orders, orderExecutions, comboPositions } from "@shared/schema";
import type { InsertMarket, InsertPosition, InsertTrade, Market, Position, Trade, UpsertUser, User, CustomCombo, CustomComboLeg, CustomComboResponse, UserProfile, Order, InsertOrder, OrderExecution, InsertOrderExecution, ComboPosition } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage"; // Import auth storage

export interface IStorage {
  // User methods (delegated to authStorage)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserBalance(userId: string, amount: number): Promise<User | undefined>;

  // Market methods
  getMarkets(): Promise<Market[]>;
  getMarket(id: number): Promise<Market | undefined>;
  createMarket(market: InsertMarket): Promise<Market>;
  resolveMarket(id: number, outcome: boolean): Promise<Market>;
  
  // Position methods
  getPositions(userId: string): Promise<(Position & { market: Market })[]>;
  getPositionsByMarket(userId: string, marketId: number): Promise<(Position & { market: Market })[]>;
  getPosition(id: number): Promise<Position | undefined>;
  getAllOpenPositions(): Promise<(Position & { market: Market })[]>;
  getAllPositions(): Promise<Position[]>;
  createPosition(position: InsertPosition & { userId: string, entryProbability: string, liquidationProbability: string }): Promise<Position>;
  closePosition(id: number, pnl: number): Promise<Position>;
  liquidatePosition(id: number, currentProbability: number): Promise<Position | null>;
  partialClosePosition(id: number, closePercent: number, pnl: number): Promise<{ closedPosition: Position; remainingPosition: Position | null; closeSize: number }>;
  
  // Trade methods
  getTrades(marketId: number): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;

  // Custom Combo methods
  getCustomCombos(): Promise<CustomComboResponse[]>;
  getCustomCombo(id: number): Promise<CustomComboResponse | undefined>;
  createCustomCombo(combo: { name: string; creatorId: string; creatorAddress?: string; legs: CustomComboLeg[]; impliedProbability: string; multiplier: string }): Promise<CustomComboResponse>;

  // User Profile methods
  getProfile(walletAddress: string): Promise<UserProfile | undefined>;
  setProfile(walletAddress: string, displayName: string): Promise<UserProfile>;

  // Order methods
  getOrders(userId: string): Promise<Order[]>;
  getOrdersByMarket(userId: string, marketId: number): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getActiveOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder & { userId: string }): Promise<Order>;
  updateOrder(id: number, updates: Partial<Order>): Promise<Order>;
  cancelOrder(id: number): Promise<Order>;
  createOrderExecution(execution: InsertOrderExecution): Promise<OrderExecution>;
  getOrderExecutions(orderId: number): Promise<OrderExecution[]>;

  // Combo Position methods
  getComboPositions(userId: string): Promise<(ComboPosition & { combo: CustomComboResponse })[]>;
  getComboPosition(id: number): Promise<ComboPosition | undefined>;
  getAllOpenComboPositions(): Promise<ComboPosition[]>;
  createComboPosition(position: {
    userId: string;
    comboId: number;
    side: "YES" | "NO";
    stake: number;
    leverage: number;
    entryProbability: string;
    lockDate: Date;
  }): Promise<ComboPosition>;
  closeComboPosition(id: number, pnl: number, exitProbability: string, status?: "settled" | "cancelled"): Promise<ComboPosition>;
}

export class DatabaseStorage implements IStorage {
  // Delegate to authStorage
  async getUser(id: string): Promise<User | undefined> {
    return authStorage.getUser(id);
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    return authStorage.upsertUser(user);
  }

  async updateUserBalance(userId: string, amount: number): Promise<User | undefined> {
    // Use NUMERIC for proper decimal arithmetic, then convert back to VARCHAR
    const [updated] = await db
      .update(users)
      .set({
        balance: sql`CAST(CAST(${users.balance} AS NUMERIC) + ${amount} AS VARCHAR)`,
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  // Markets
  async getMarkets(): Promise<Market[]> {
    return await db.select().from(markets).orderBy(desc(markets.volume24h));
  }

  async getMarket(id: number): Promise<Market | undefined> {
    const [market] = await db.select().from(markets).where(eq(markets.id, id));
    return market;
  }

  async createMarket(market: InsertMarket): Promise<Market> {
    const [newMarket] = await db.insert(markets).values({
      ...market,
      currentProbability: (market.currentProbability ?? 50).toString(),
    }).returning();
    return newMarket;
  }

  async resolveMarket(id: number, outcome: boolean): Promise<Market> {
    const [updated] = await db
      .update(markets)
      .set({
        resolved: true,
        outcome: outcome,
        resolvedAt: new Date(),
        status: "resolved",
        currentProbability: outcome ? "100" : "0", // Set to $1 or $0
      })
      .where(eq(markets.id, id))
      .returning();
    return updated;
  }

  // Positions - returns all positions (open, closed, liquidated) for the user
  async getPositions(userId: string): Promise<(Position & { market: Market })[]> {
    const result = await db
      .select({
        position: positions,
        market: markets,
      })
      .from(positions)
      .innerJoin(markets, eq(positions.marketId, markets.id))
      .where(eq(positions.userId, userId))
      .orderBy(desc(positions.createdAt));
    
    return result.map(r => ({ ...r.position, market: r.market }));
  }

  async getPosition(id: number): Promise<Position | undefined> {
    const [position] = await db.select().from(positions).where(eq(positions.id, id));
    return position;
  }

  async createPosition(position: InsertPosition & { userId: string, entryProbability: string, liquidationProbability: string }): Promise<Position> {
    const [newPosition] = await db.insert(positions).values({
      ...position,
      entryProbability: position.entryProbability,
      liquidationProbability: position.liquidationProbability,
    }).returning();
    return newPosition;
  }

  async closePosition(id: number, pnl: number): Promise<Position> {
    const [updated] = await db
      .update(positions)
      .set({ 
        status: "closed", 
        closedAt: new Date(),
        pnl: pnl,
      })
      .where(eq(positions.id, id))
      .returning();
    return updated;
  }

  async liquidatePosition(id: number, currentProbability: number): Promise<Position | null> {
    // Atomic update: only liquidate if still open (prevents double liquidation)
    const [updated] = await db
      .update(positions)
      .set({ 
        status: "liquidated", 
        closedAt: new Date(),
      })
      .where(and(eq(positions.id, id), eq(positions.status, "open")))
      .returning();
    
    if (!updated) {
      // Position was already closed/liquidated by another process
      return null;
    }

    // Calculate margin first
    const margin = Math.ceil(updated.size / updated.leverage);
    
    const entryProb = parseFloat(updated.entryProbability.toString());
    
    // Calculate realized PnL using the same formula as manual close
    // size is already the notional (leveraged) amount, so don't multiply by leverage again
    let pnl: number;
    if (updated.side === "YES") {
      pnl = updated.size * (currentProbability - entryProb) / 100;
    } else {
      pnl = updated.size * (entryProb - currentProbability) / 100;
    }
    pnl = Math.round(pnl);
    
    // Cap losses at margin - user cannot lose more than their collateral
    if (pnl < -margin) {
      pnl = -margin;
    }
    
    // Update PnL on the position
    const [finalPosition] = await db
      .update(positions)
      .set({ pnl })
      .where(eq(positions.id, id))
      .returning();
    
    // Calculate what to return to user: margin + pnl
    // At liquidation, pnl should be approximately -margin, so balanceChange ≈ 0
    const balanceChange = margin + pnl;
    
    // Apply the full balance change - same as manual close
    // If positive: user gets some margin back
    // If negative: user loses margin plus additional funds (slippage/gap)
    // If zero: margin fully lost, no change needed
    if (balanceChange !== 0) {
      await this.updateUserBalance(updated.userId, balanceChange);
    }
    
    return finalPosition;
  }

  async getAllOpenPositions(): Promise<(Position & { market: Market })[]> {
    const result = await db
      .select({
        position: positions,
        market: markets,
      })
      .from(positions)
      .innerJoin(markets, eq(positions.marketId, markets.id))
      .where(eq(positions.status, "open"))
      .orderBy(desc(positions.createdAt));
    
    return result.map(r => ({ ...r.position, market: r.market }));
  }

  async getAllPositions(): Promise<Position[]> {
    return await db.select().from(positions).orderBy(desc(positions.createdAt));
  }

  async partialClosePosition(id: number, closePercent: number, pnl: number): Promise<{ closedPosition: Position; remainingPosition: Position | null; closeSize: number }> {
    const [position] = await db.select().from(positions).where(eq(positions.id, id));
    if (!position) throw new Error("Position not found");

    const closeSize = Math.floor(position.size * (closePercent / 100));
    const remainingSize = position.size - closeSize;

    if (closePercent >= 100 || remainingSize <= 0) {
      const [closed] = await db
        .update(positions)
        .set({ status: "closed", closedAt: new Date(), pnl })
        .where(eq(positions.id, id))
        .returning();
      return { closedPosition: closed, remainingPosition: null, closeSize: position.size };
    }

    const [remaining] = await db
      .update(positions)
      .set({ size: remainingSize })
      .where(eq(positions.id, id))
      .returning();

    const [closed] = await db.insert(positions).values({
      userId: position.userId,
      marketId: position.marketId,
      side: position.side,
      size: closeSize,
      leverage: position.leverage,
      entryProbability: position.entryProbability.toString(),
      liquidationProbability: position.liquidationProbability.toString(),
      status: "closed",
      closedAt: new Date(),
      pnl: pnl,
    }).returning();

    return { closedPosition: closed, remainingPosition: remaining, closeSize };
  }

  async getPositionsByMarket(userId: string, marketId: number): Promise<(Position & { market: Market })[]> {
    const result = await db
      .select({
        position: positions,
        market: markets,
      })
      .from(positions)
      .innerJoin(markets, eq(positions.marketId, markets.id))
      .where(and(eq(positions.userId, userId), eq(positions.marketId, marketId)))
      .orderBy(desc(positions.createdAt));
    
    return result.map(r => ({ ...r.position, market: r.market }));
  }

  // Trades
  async getTrades(marketId: number): Promise<Trade[]> {
    return await db
      .select()
      .from(trades)
      .where(eq(trades.marketId, marketId))
      .orderBy(desc(trades.timestamp))
      .limit(50);
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const [newTrade] = await db.insert(trades).values(trade).returning();
    return newTrade;
  }

  // Custom Combos
  private parseCustomCombo(combo: CustomCombo): CustomComboResponse {
    return {
      id: combo.id,
      name: combo.name,
      creatorId: combo.creatorId,
      creatorAddress: combo.creatorAddress,
      legs: JSON.parse(combo.legs) as CustomComboLeg[],
      impliedProbability: parseFloat(combo.impliedProbability),
      multiplier: parseFloat(combo.multiplier),
      volume24h: combo.volume24h || 0,
      openInterest: combo.openInterest || 0,
      status: combo.status,
      createdAt: combo.createdAt,
    };
  }

  async getCustomCombos(): Promise<CustomComboResponse[]> {
    const combos = await db.select().from(customCombos).orderBy(desc(customCombos.createdAt));
    return combos.map(c => this.parseCustomCombo(c));
  }

  async getCustomCombo(id: number): Promise<CustomComboResponse | undefined> {
    const [combo] = await db.select().from(customCombos).where(eq(customCombos.id, id));
    return combo ? this.parseCustomCombo(combo) : undefined;
  }

  async createCustomCombo(combo: { name: string; creatorId: string; creatorAddress?: string; legs: CustomComboLeg[]; impliedProbability: string; multiplier: string }): Promise<CustomComboResponse> {
    const [newCombo] = await db.insert(customCombos).values({
      name: combo.name,
      creatorId: combo.creatorId,
      creatorAddress: combo.creatorAddress || null,
      legs: JSON.stringify(combo.legs),
      impliedProbability: combo.impliedProbability,
      multiplier: combo.multiplier,
    }).returning();
    return this.parseCustomCombo(newCombo);
  }

  // User Profiles
  async getProfile(walletAddress: string): Promise<UserProfile | undefined> {
    const normalizedAddress = walletAddress.toLowerCase();
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.walletAddress, normalizedAddress));
    return profile;
  }

  async setProfile(walletAddress: string, displayName: string): Promise<UserProfile> {
    const normalizedAddress = walletAddress.toLowerCase();
    const existing = await this.getProfile(normalizedAddress);
    
    if (existing) {
      const [updated] = await db
        .update(userProfiles)
        .set({ displayName })
        .where(eq(userProfiles.walletAddress, normalizedAddress))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userProfiles).values({
        walletAddress: normalizedAddress,
        displayName,
      }).returning();
      return created;
    }
  }

  // Orders
  async getOrders(userId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByMarket(userId: string, marketId: number): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.marketId, marketId)))
      .orderBy(desc(orders.createdAt));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getActiveOrders(): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(
        or(
          eq(orders.status, "pending"),
          eq(orders.status, "active"),
          eq(orders.status, "partial")
        )
      )
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(order: InsertOrder & { userId: string }): Promise<Order> {
    const [newOrder] = await db.insert(orders).values({
      ...order,
      limitPrice: order.limitPrice?.toString(),
    }).returning();
    return newOrder;
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order> {
    const [updated] = await db
      .update(orders)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async cancelOrder(id: number): Promise<Order> {
    const [cancelled] = await db
      .update(orders)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();
    return cancelled;
  }

  async createOrderExecution(execution: InsertOrderExecution): Promise<OrderExecution> {
    const [newExecution] = await db.insert(orderExecutions).values({
      ...execution,
      executionPrice: execution.executionPrice.toString(),
    }).returning();
    return newExecution;
  }

  async getOrderExecutions(orderId: number): Promise<OrderExecution[]> {
    return await db
      .select()
      .from(orderExecutions)
      .where(eq(orderExecutions.orderId, orderId))
      .orderBy(desc(orderExecutions.executedAt));
  }

  // Combo Positions
  async getComboPositions(userId: string): Promise<(ComboPosition & { combo: CustomComboResponse })[]> {
    const result = await db
      .select({
        position: comboPositions,
        combo: customCombos,
      })
      .from(comboPositions)
      .innerJoin(customCombos, eq(comboPositions.comboId, customCombos.id))
      .where(eq(comboPositions.userId, userId))
      .orderBy(desc(comboPositions.createdAt));
    
    return result.map(r => ({ 
      ...r.position, 
      combo: this.parseCustomCombo(r.combo) 
    }));
  }

  async getComboPosition(id: number): Promise<ComboPosition | undefined> {
    const [position] = await db.select().from(comboPositions).where(eq(comboPositions.id, id));
    return position;
  }

  async getAllOpenComboPositions(): Promise<ComboPosition[]> {
    return await db
      .select()
      .from(comboPositions)
      .where(eq(comboPositions.status, "open"));
  }

  async createComboPosition(position: {
    userId: string;
    comboId: number;
    side: "YES" | "NO";
    stake: number;
    leverage: number;
    entryProbability: string;
    lockDate: Date;
  }): Promise<ComboPosition> {
    const [newPosition] = await db.insert(comboPositions).values({
      userId: position.userId,
      comboId: position.comboId,
      side: position.side,
      stake: position.stake,
      leverage: position.leverage,
      entryProbability: position.entryProbability,
      lockDate: position.lockDate,
    }).returning();
    return newPosition;
  }

  async closeComboPosition(id: number, pnl: number, exitProbability: string, status: "settled" | "cancelled" = "settled"): Promise<ComboPosition> {
    const [closed] = await db
      .update(comboPositions)
      .set({
        status,
        pnl,
        exitProbability,
        closedAt: new Date(),
      })
      .where(eq(comboPositions.id, id))
      .returning();
    return closed;
  }
}

export const storage = new DatabaseStorage();
