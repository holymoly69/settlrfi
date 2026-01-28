import { pgTable, text, serial, integer, bigint, boolean, timestamp, numeric, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
export * from "./models/auth";
import { users } from "./models/auth";

// === TABLE DEFINITIONS ===

export const markets = pgTable("markets", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  resolutionDate: timestamp("resolution_date").notNull(),
  category: text("category").notNull(), // e.g. "Politics", "Crypto", "Sports"
  currentProbability: numeric("current_probability", { precision: 10, scale: 2 }).notNull().default("50"), // 0-100 decimal precision
  volume24h: integer("volume_24h").default(0),
  status: text("status", { enum: ["active", "resolved", "canceled"] }).default("active").notNull(),
  creator: text("creator"), // wallet address of creator (null for system markets)
  isPermissionless: boolean("is_permissionless").default(false), // flag for user-created markets
  createdAt: timestamp("created_at").defaultNow(),
  // UMA Oracle resolution fields
  resolved: boolean("resolved").default(false),
  outcome: boolean("outcome"), // null = unresolved, true = YES, false = NO
  resolvedAt: timestamp("resolved_at"),
});

export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Matching auth user id type
  marketId: integer("market_id").references(() => markets.id).notNull(),
  side: text("side", { enum: ["YES", "NO"] }).notNull(),
  size: bigint("size", { mode: "number" }).notNull(), // Amount in USD (supports up to 10B+)
  leverage: integer("leverage").notNull().default(1),
  entryProbability: numeric("entry_probability", { precision: 10, scale: 2 }).notNull(),
  liquidationProbability: numeric("liquidation_probability", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["open", "closed", "liquidated"] }).default("open").notNull(),
  pnl: bigint("pnl", { mode: "number" }).default(0), // Realized PnL (supports large values)
  createdAt: timestamp("created_at").defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  marketId: integer("market_id").references(() => markets.id).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(), // Probability 0-100
  size: bigint("size", { mode: "number" }).notNull(), // Supports up to 10B+
  side: text("side", { enum: ["YES", "NO"] }).notNull(),
  userId: text("user_id"), // Allow null for legacy/simulated trades
  timestamp: timestamp("timestamp").defaultNow(),
});

export const siteVisits = pgTable("site_visits", {
  id: serial("id").primaryKey(),
  visitorId: text("visitor_id").notNull(),
  path: text("path").notNull(),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at").defaultNow(),
});

// System settings for tracking weekly resets and other admin state
export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin audit log for tracking all admin actions
export const adminAuditLog = pgTable("admin_audit_log", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(), // e.g., "set-balance", "reset", "backfill-trades", "manual-liquidate"
  targetWallet: text("target_wallet"), // wallet address affected (if applicable)
  details: text("details").notNull(), // JSON string with action details
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// === RELATIONS ===

export const marketsRelations = relations(markets, ({ many }) => ({
  positions: many(positions),
  trades: many(trades),
}));

export const positionsRelations = relations(positions, ({ one }) => ({
  market: one(markets, {
    fields: [positions.marketId],
    references: [markets.id],
  }),
}));

export const tradesRelations = relations(trades, ({ one }) => ({
  market: one(markets, {
    fields: [trades.marketId],
    references: [markets.id],
  }),
}));

// === SCHEMAS ===

export const insertMarketSchema = createInsertSchema(markets).omit({ id: true, createdAt: true });
// Omit fields that are handled by backend logic or defaults
export const insertPositionSchema = createInsertSchema(positions).omit({ 
  id: true, 
  userId: true, 
  createdAt: true, 
  closedAt: true,
  status: true, 
  pnl: true,
  entryProbability: true, // Calculated from current market price
  liquidationProbability: true // Calculated from leverage
});
export const insertTradeSchema = createInsertSchema(trades).omit({ id: true, timestamp: true });

// === EXPLICIT API CONTRACT TYPES ===

export type Market = typeof markets.$inferSelect;
export type InsertMarket = z.infer<typeof insertMarketSchema>;

export type Position = typeof positions.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;

// Request Types
export type CreatePositionRequest = InsertPosition;
export type ClosePositionRequest = { positionId: number };

// Response Types
export type MarketResponse = Market;
export type PositionResponse = Position & { market?: Market };
export type TradeResponse = Trade;

// Portfolio Summary
export interface PortfolioSummary {
  totalInvested: number;
  totalPnl: number;
  activePositions: number;
}

// Cross-Margin Portfolio Metrics
export interface CrossMarginMetrics {
  cashBalance: number;           // Available cash (not locked in positions)
  usedMargin: number;            // Total margin locked in positions
  unrealizedPnL: number;         // Sum of all open position PnLs
  equity: number;                // cashBalance + usedMargin + unrealizedPnL
  freeMargin: number;            // Equity available for new positions
  maintenanceMargin: number;     // Minimum margin required to avoid liquidation
  marginRatio: number;           // equity / maintenanceMargin (< 1 = liquidation)
  isAtRisk: boolean;             // True if margin ratio < 1.2 (warning threshold)
}

// === COMBO TYPES (TypeScript interfaces - not database tables) ===

export interface ComboLeg {
  marketId: number;
  marketName: string;
  side: "YES" | "NO";
  probability: number;
}

export interface Combo {
  id: number;
  name: string;
  category: "Combo";
  probability: number;
  multiplier: number;
  volume24h: number;
  openInterest: number;
  legs: ComboLeg[];
  expiry: Date | string;
  isCombo: true;
}

// === USER PROFILES ===

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").unique().notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

// === CUSTOM COMBOS (User-created parlays) ===

export const customCombos = pgTable("custom_combos", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  creatorId: text("creator_id").notNull(),
  creatorAddress: text("creator_address"),
  legs: text("legs").notNull(), // JSON string of CustomComboLeg[]
  impliedProbability: numeric("implied_probability", { precision: 10, scale: 6 }).notNull(),
  multiplier: numeric("multiplier", { precision: 10, scale: 2 }).notNull(),
  volume24h: integer("volume_24h").default(0),
  openInterest: integer("open_interest").default(0),
  status: text("status", { enum: ["active", "resolved", "canceled"] }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export interface CustomComboLeg {
  marketId: number;
  marketName: string;
  side: "YES" | "NO";
  price: number; // Current probability at time of leg selection (0-100)
}

export const insertCustomComboSchema = createInsertSchema(customCombos).omit({
  id: true,
  creatorId: true,
  createdAt: true,
  volume24h: true,
  openInterest: true,
  status: true,
});

export type CustomCombo = typeof customCombos.$inferSelect;
export type InsertCustomCombo = z.infer<typeof insertCustomComboSchema>;

// Frontend-friendly custom combo with parsed legs
export interface CustomComboResponse {
  id: number;
  name: string;
  creatorId: string;
  creatorAddress: string | null;
  legs: CustomComboLeg[];
  impliedProbability: number;
  multiplier: number;
  volume24h: number;
  openInterest: number;
  status: string;
  createdAt: Date | string | null;
}

// Request type for creating custom combos
export interface CreateCustomComboRequest {
  name: string;
  legs: CustomComboLeg[];
}

// === COMBO POSITIONS ===
// Time-locked positions on parlay probability with leverage

export const comboPositions = pgTable("combo_positions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  comboId: integer("combo_id").references(() => customCombos.id).notNull(),
  side: text("side", { enum: ["YES", "NO"] }).notNull(), // Long (YES) or Short (NO) on probability
  
  // Investment and leverage
  stake: bigint("stake", { mode: "number" }).notNull(), // USD amount invested
  leverage: integer("leverage").default(1).notNull(), // Leverage multiplier (1-50x)
  
  // Probability tracking for PnL calculation
  entryProbability: numeric("entry_probability", { precision: 10, scale: 6 }).notNull(),
  exitProbability: numeric("exit_probability", { precision: 10, scale: 6 }), // Set when position closes
  
  // Time-lock - position auto-closes at this date (00:00 GMT)
  lockDate: timestamp("lock_date").notNull(), // The unlock/settlement date
  
  pnl: bigint("pnl", { mode: "number" }).default(0),
  status: text("status", { enum: ["open", "settled", "cancelled"] }).default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const insertComboPositionSchema = createInsertSchema(comboPositions).omit({
  id: true,
  userId: true,
  createdAt: true,
  closedAt: true,
  status: true,
  pnl: true,
  exitProbability: true,
});

export type ComboPosition = typeof comboPositions.$inferSelect;
export type InsertComboPosition = z.infer<typeof insertComboPositionSchema>;

// Combo positions relations
export const comboPositionsRelations = relations(comboPositions, ({ one }) => ({
  combo: one(customCombos, {
    fields: [comboPositions.comboId],
    references: [customCombos.id],
  }),
}));

// === ORDERS (Limit orders and advanced order types) ===

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  marketId: integer("market_id").references(() => markets.id).notNull(),
  orderType: text("order_type", { enum: ["market", "limit", "iceberg", "twap"] }).notNull(),
  side: text("side", { enum: ["YES", "NO"] }).notNull(),
  totalSize: integer("total_size").notNull(),
  filledSize: integer("filled_size").default(0).notNull(),
  remainingSize: integer("remaining_size").notNull(),
  visibleSize: integer("visible_size"),
  leverage: integer("leverage").default(1).notNull(),
  limitPrice: numeric("limit_price", { precision: 10, scale: 4 }),
  twapDurationMs: integer("twap_duration_ms"),
  twapIntervalMs: integer("twap_interval_ms"),
  twapNextExecuteAt: timestamp("twap_next_execute_at"),
  status: text("status", { enum: ["pending", "active", "partial", "filled", "cancelled", "expired"] }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  updatedAt: timestamp("updated_at"),
});

export const orderExecutions = pgTable("order_executions", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  executionPrice: numeric("execution_price", { precision: 10, scale: 4 }).notNull(),
  executionSize: integer("execution_size").notNull(),
  positionId: integer("position_id").references(() => positions.id),
  executedAt: timestamp("executed_at").defaultNow(),
});

// Orders relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  market: one(markets, {
    fields: [orders.marketId],
    references: [markets.id],
  }),
  executions: many(orderExecutions),
}));

export const orderExecutionsRelations = relations(orderExecutions, ({ one }) => ({
  order: one(orders, {
    fields: [orderExecutions.orderId],
    references: [orders.id],
  }),
  position: one(positions, {
    fields: [orderExecutions.positionId],
    references: [positions.id],
  }),
}));

// Insert schemas for orders
export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  filledSize: true,
  status: true,
});

export const insertOrderExecutionSchema = createInsertSchema(orderExecutions).omit({
  id: true,
  executedAt: true,
});

// Types for orders
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderExecution = typeof orderExecutions.$inferSelect;
export type InsertOrderExecution = z.infer<typeof insertOrderExecutionSchema>;
