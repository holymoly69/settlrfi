import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, integer, boolean, bigint } from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  walletAddress: varchar("wallet_address").unique(),
  balance: varchar("balance").default("10000"), // Starting balance for MVP testing
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // STLR Earn/Airdrop fields (bigint to support values > 2.1 billion)
  stlrPoints: bigint("stlr_points", { mode: "number" }).default(0),
  weeklyPnl: bigint("weekly_pnl", { mode: "number" }).default(0),
  weekStart: varchar("week_start"), // YYYY-MM-DD of current week's Monday
  twitterFollowed: boolean("twitter_followed").default(false),
  telegramJoined: boolean("telegram_joined").default(false),
  firstTradeDone: boolean("first_trade_done").default(false),
  // Referral system fields (bigint for large values)
  referralCode: varchar("referral_code").unique(), // Unique code for sharing
  referredBy: varchar("referred_by"), // User ID of the person who referred them
  referralCount: bigint("referral_count", { mode: "number" }).default(0), // Number of completed referrals
  referralStlrEarned: bigint("referral_stlr_earned", { mode: "number" }).default(0), // STLR earned from referrals
  referralBonusClaimed: boolean("referral_bonus_claimed").default(false), // Prevents duplicate 1000 STLR bonus
  // Combo trade challenge (one-time STLR reward)
  comboTradeDone: boolean("combo_trade_done").default(false),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
