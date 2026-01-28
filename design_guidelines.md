# Design Guidelines: Prediction Market Trading Platform

## Design Approach

**Selected Framework:** Design System Approach inspired by modern trading platforms (Robinhood's accessibility + Bloomberg Terminal's data density + Coinbase Pro's professionalism)

**Core Principles:**
- Information density without overwhelming users
- Immediate data clarity and scanability
- Precision-first interface design
- Professional financial application standards

## Typography

**Font System:**
- **Primary UI:** Inter or DM Sans (weights: 400, 500, 600, 700)
- **Numerical Data:** JetBrains Mono or Roboto Mono (weights: 400, 500, 600) - for all prices, percentages, quantities, and financial figures
- **Hierarchy:**
  - Hero/Page titles: text-3xl to text-4xl, font-semibold
  - Section headers: text-xl to text-2xl, font-semibold
  - Card titles: text-base to text-lg, font-medium
  - Body text: text-sm to text-base
  - Data labels: text-xs to text-sm, uppercase tracking-wide
  - Numerical values: monospace, text-sm to text-2xl depending on prominence

## Layout System

**Spacing Primitives:** Consistently use Tailwind units of 2, 4, 6, 8, 12, 16, 20 (as in p-4, gap-6, space-y-8, etc.)

**Grid Structure:**
- Main container: max-w-[1920px] with px-4 md:px-6 lg:px-8
- Dashboard layouts: CSS Grid with 12-column system for flexibility
- Responsive breakpoints: mobile-first, adjusting at md: (768px) and lg: (1024px)

## Core Components

### Navigation & Header
**Top Navigation Bar:**
- Fixed position, full-width, height h-16
- Left: Logo + primary navigation links (Markets, Portfolio, Orders, Analytics)
- Center: Search bar with market/contract quick access
- Right: Account balance summary (total value in monospace), notifications, account dropdown
- Bottom border separator

**Secondary Navigation (Trading Views):**
- Tab system for switching between Spot/Leveraged/Cross-Margin modes
- Pills/segmented control design, subtle background differentiation

### Dashboard Layout
**Three-Column Grid (Desktop):**
1. **Left Sidebar** (w-64 to w-72): Market list, watchlist, trending contracts
2. **Main Content** (flex-1): Primary trading interface, charts, order forms
3. **Right Sidebar** (w-80 to w-96): Open positions, order book, recent trades

**Mobile:** Stack vertically, collapsible sidebars accessed via slide-out panels

### Card Components
**Standard Card Structure:**
- Rounded corners: rounded-lg
- Padding: p-4 to p-6
- Borders: 1px border with subtle border treatment
- Internal spacing: space-y-4 for vertical stacking

**Card Types:**
- **Market Card:** Contract name + current price (large, monospace) + 24h change + mini sparkline chart
- **Position Card:** Contract + entry price + current P&L (prominent, monospace with +/- prefix) + liquidation price + action buttons
- **Order Card:** Order type badge + quantity + price + status indicator + cancel button

### Trading Interface
**Chart Area:**
- Full-width within main content area
- TradingView-style candlestick charts with time interval selectors
- Height: min-h-[400px] to min-h-[600px]
- Integrated drawing tools and indicators toolbar (compact, icon-based)

**Order Entry Panel:**
- Dual-column layout: Buy side | Sell side
- Input fields: Amount, Price (limit), Leverage slider (1x to 10x with visual indicator)
- Real-time calculation displays: Total cost, estimated liquidation, fees
- Large action buttons: full-width, h-12 to h-14

### Data Tables
**Order Book / Trade History:**
- Three-column layout: Price | Amount | Total
- Row height: h-8, text-sm, monospace for numbers
- Alternating row backgrounds for readability
- Sticky headers
- Depth visualization via subtle background bars

**Positions Table:**
- Columns: Market | Size | Entry | Current | P&L | Actions
- Sortable headers
- Row actions: Adjust, Close, Add Margin (icon buttons)

### Form Elements
**Inputs:**
- Height: h-10 to h-12
- Rounded: rounded-md
- Monospace for numerical inputs
- Labels: text-xs to text-sm, font-medium, mb-2

**Buttons:**
- Primary actions: h-10 to h-12, rounded-md, font-medium
- Icon buttons: w-10 h-10, rounded-md
- Button groups for related actions (segment joined with rounded corners on ends only)

### Status Indicators
**Badges:**
- Small: px-2 py-1, text-xs, rounded-full
- Usage: Order status (Filled, Partial, Pending), leverage indicators (5x, 10x)

**Progress Bars:**
- For margin usage, position health
- Height: h-2, rounded-full
- Multi-segment for risk zones

### Overlays & Modals
**Modal Structure:**
- Max-width: max-w-lg to max-w-2xl
- Padding: p-6 to p-8
- Header with title + close button
- Content area with generous spacing
- Footer with action buttons (right-aligned)

## Images

**Hero Section:** Large hero image (h-[400px] to h-[500px]) showing abstract financial data visualization, trading terminal screens, or dynamic market activity graphics. Position above main trading interface on landing/marketing pages.

**Placement:** Full-width container, responsive scaling, overlaid with centered CTA content including "Start Trading" primary button with backdrop-blur background treatment.

**Additional Images:** Feature cards showcasing leverage mechanics, cross-margin benefits, risk management tools (icon-style illustrations, 200x200 to 300x300px).

## Animations

**Minimal, Data-Focused:**
- Number counters: Smooth increment/decrement for price updates
- Chart transitions: Subtle fade when changing timeframes
- Avoid distracting motion; focus on data clarity