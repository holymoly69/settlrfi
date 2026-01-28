# Settlr.fi - Leveraged Prediction Markets Platform

## Overview
Settlr is a decentralized protocol designed for leveraged trading on prediction market outcomes. It enables users to take up to 50x leverage on binary events such as elections, crypto prices, and cultural occurrences. The platform aims to combine the speculative nature of prediction markets with the high-yield potential of leveraged perpetual-style positions. The project is built as a full-stack TypeScript application with a React frontend and an Express backend, utilizing PostgreSQL for data persistence.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
- **Frontend**: React with TypeScript, Vite, Wouter for routing, TanStack React Query for state management, shadcn/ui (Radix UI), Tailwind CSS, Recharts, Framer Motion.
- **Backend**: Express.js with TypeScript, Node.js, esbuild.
- **Database**: PostgreSQL with Drizzle ORM for schema management and `connect-pg-simple` for session storage.
- **Authentication**: Web3 wallet authentication (MetaMask, Rabby, WalletConnect) using nonce-based security, signature verification, and replay protection. Requires HyperEVM network.
- **Shared Code**: A `/shared` directory for common schemas, routes, and models ensuring type safety across client and server. Zod schemas are used for API validation.

### Key Features
- **Market Simulation**: A dynamic market simulation system with random walk price algorithms, synthetic order books, and Server-Sent Events (SSE) for real-time updates.
- **Exotic Bet Markets**: Special high-risk/high-reward markets with unique probability behaviors (e.g., oscillating 0.01-3% with rare jumps to 99%) to incentivize early user engagement.
- **Trading Capabilities**: Live PnL tracking, ability to close positions, portfolio views for open and closed positions, and a $500,000 maximum position size.
- **Social Features**: User profiles with custom display names, a site-wide activity feed, real-time liquidation notifications via "Settlrekt Overlay," and an STLR leaderboard.
- **STLR Earn System**: A points-based system rewarding users for onboarding actions (Twitter follow, Telegram join, first trade) and weekly PnL milestones on official markets. STLR tokens persist indefinitely.
- **Referral System**: Unique referral codes for users, offering STLR bonuses for referred users who complete onboarding and ongoing earnings (5% of referred users' STLR).
- **Combos (Time-Lock Parlays)**: Multi-leg prediction markets where users place time-locked leveraged positions, settling automatically at a chosen future date without liquidations.
- **HyperEVM Integration**: Utilizes HyperEVM (Hyperliquid's EVM-compatible layer) for blockchain interactions, including a Vault contract for HYPE deposits/withdrawals.
- **Market Maker API**: Programmatic API for market makers to place orders, with current mock trading and future integration for real Hyperliquid execution.

### Security
- **CSRF Protection**: Double-submit cookie pattern using `csrf-csrf` for all state-changing POST endpoints.
- **Rate Limiting**: Implemented for general API access, authentication attempts, and trading actions.
- **Session Security**: httpOnly, secure, sameSite=strict cookies with PostgreSQL-backed sessions and a 7-day TTL.
- **Access Control**: Ensures users interact only with their own positions and appropriate permissions for market resolution.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **Drizzle ORM**: Database interaction and schema management.

### Authentication & Blockchain
- **viem**: Web3 library for blockchain interaction and signature verification.
- **MetaMask, Rabby, WalletConnect**: Supported Web3 wallets.

### UI & Utilities
- **Radix UI**: Headless UI components.
- **Lucide React**: Icon library.
- **date-fns**: Date manipulation utilities.

### Build & Development
- **Vite**: Frontend development server and bundler.
- **esbuild**: Backend bundling.
- **TypeScript**: Language.

### Environment Variables
- `DATABASE_URL`
- `SESSION_SECRET`
- `ISSUER_URL`
- `REPL_ID`

## Deployment Notes

### Critical: Single Port Requirement
Replit Reserved VM and Autoscale deployments **only support a single external port**. The `.replit` file must have only ONE `[[ports]]` entry:
```
[[ports]]
localPort = 5000
externalPort = 80
```
If multiple ports are configured, production will return "Not Found" errors. Replit may automatically add port entries when services bind to new ports - always check and remove extra entries before deploying.

**IMPORTANT FOR TESTING**: Never test the production build on a different port (e.g., PORT=5001). Replit auto-detects port bindings and adds them to .replit, which breaks production. Always stop the dev server first and test on port 5000 only.

### Production Mode Detection
The server automatically detects production mode in two ways:
1. `NODE_ENV === "production"` (standard method)
2. Running from bundled `.cjs` file in `/dist/` folder (detects via `__filename`)

This ensures the deployment works correctly even if `NODE_ENV` is not explicitly set in the deployment config, preventing the app from trying to start the Vite dev server in production.