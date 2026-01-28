import { useState } from "react";
import { Link } from "wouter";
import { ChevronRight, ChevronLeft, Menu, X } from "lucide-react";

const sections = [
  { id: "introduction", title: "Introduction" },
  { id: "architecture", title: "Architecture" },
  { id: "trading", title: "Trading Mechanics" },
  { id: "ordertypes", title: "Order Types" },
  { id: "combos", title: "Combos & Parlays" },
  { id: "permissionless", title: "Permissionless Markets" },
  { id: "oracle", title: "Oracle & Resolution" },
  { id: "earn", title: "Earn Program & STLR" },
  { id: "security", title: "Security" },
  { id: "roadmap", title: "Roadmap" },
  { id: "mm", title: "Market Maker API", highlight: true },
];

function IntroductionSection() {
  return (
    <>
      <h2 className="text-xl text-[#66ff66] border-b border-[#66ff66]/30 pb-2 mb-6">Introduction</h2>
      
      <h3 className="text-[#ffaa00] text-lg mb-4">Overview</h3>
      <p className="text-[#66ff66]/80 leading-relaxed mb-6">
        Settlr is a decentralized perpetual futures protocol built natively on Hyperliquid, providing leveraged exposure to real-world binary event outcomes.
      </p>
      <p className="text-[#66ff66]/80 leading-relaxed mb-6">
        By leveraging HyperCore's onchain orderbook execution and HyperEVM smart contracts, Settlr enables up to 50x leverage on prediction-style markets while maintaining non-custodial margin accounts and transparent oracle-driven settlement.
      </p>

      <h3 className="text-[#ffaa00] text-lg mb-4">Core Design Principles</h3>
      <ul className="space-y-3 text-[#66ff66]/80">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Leveraged Binary Exposure:</strong> Transform $0-$1 probability shares into perpetual instruments with funding rate anchoring.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Permissionless Market Creation:</strong> HIP-3 Event Perpetuals allow any user to deploy new event markets.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Composable Parlays:</strong> Structured and custom multi-leg markets with product-of-probabilities pricing.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Robust Risk Management:</strong> Dynamic leverage caps, partial liquidations, and insurance fund backstop.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Minimalist Terminal Interface:</strong> Pure text-based, ASCII-driven UX for professional traders.</span>
        </li>
      </ul>
    </>
  );
}

function ArchitectureSection() {
  return (
    <>
      <h2 className="text-xl text-[#66ff66] border-b border-[#66ff66]/30 pb-2 mb-6">Architecture</h2>
      
      <h3 className="text-[#ffaa00] text-lg mb-4">Hyperliquid Integration Stack</h3>
      <p className="text-[#66ff66]/80 leading-relaxed mb-6">Settlr leverages the full Hyperliquid L1 stack:</p>
      
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#66ff66]/30">
          <thead>
            <tr className="bg-[#66ff66]/10">
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Layer</th>
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Component</th>
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Role in Settlr</th>
            </tr>
          </thead>
          <tbody className="text-[#66ff66]/80">
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3">Consensus</td>
              <td className="p-3 text-[#88ffff]">HyperBFT</td>
              <td className="p-3">Sub-second finality for orders and settlements</td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3">Execution</td>
              <td className="p-3 text-[#88ffff]">HyperCore</td>
              <td className="p-3">Onchain spot & perpetual orderbooks (order matching, liquidations)</td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3">Smart Contracts</td>
              <td className="p-3 text-[#88ffff]">HyperEVM (Cancun-compatible)</td>
              <td className="p-3">Margin vaults, factories, risk engine, oracle adapters</td>
            </tr>
            <tr>
              <td className="p-3">Primitives</td>
              <td className="p-3 text-[#88ffff]">Precompiles</td>
              <td className="p-3">Direct Solidity access to HyperCore state (orders, positions)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-[#ffaa00] text-lg mb-4">Contract Overview</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border border-[#66ff66]/30">
          <thead>
            <tr className="bg-[#66ff66]/10">
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Contract</th>
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Purpose</th>
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Key Functions</th>
            </tr>
          </thead>
          <tbody className="text-[#66ff66]/80">
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3 text-[#88ffff]">MarginVault.sol</td>
              <td className="p-3">Non-custodial user collateral and position management</td>
              <td className="p-3"><code className="text-[#ffaa00]">deposit, withdraw, updatePosition</code></td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3 text-[#88ffff]">RiskEngine.sol</td>
              <td className="p-3">Dynamic leverage caps, maintenance margin checks, liquidation triggers</td>
              <td className="p-3"><code className="text-[#ffaa00]">calculateMaxLeverage, checkLiquidation</code></td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3 text-[#88ffff]">EventPerpFactory.sol</td>
              <td className="p-3">Permissionless creation of single-event perpetuals (HIP-3)</td>
              <td className="p-3"><code className="text-[#ffaa00]">createEventMarket</code></td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3 text-[#88ffff]">ComboFactory.sol</td>
              <td className="p-3">Structured and custom multi-leg parlay deployment</td>
              <td className="p-3"><code className="text-[#ffaa00]">createCombo, createCustomCombo</code></td>
            </tr>
            <tr>
              <td className="p-3 text-[#88ffff]">OracleAdapter.sol</td>
              <td className="p-3">UMA Optimistic Oracle assertion submission and settlement</td>
              <td className="p-3"><code className="text-[#ffaa00]">proposeOutcome, settleMarket</code></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function TradingSection() {
  return (
    <>
      <h2 className="text-xl text-[#66ff66] border-b border-[#66ff66]/30 pb-2 mb-6">Trading Mechanics</h2>
      
      <h3 className="text-[#ffaa00] text-lg mb-4">Single Event Perpetuals</h3>
      <p className="text-[#66ff66]/80 leading-relaxed mb-4">
        Each market is a synthetic perpetual contract with index price in the range [$0.00, $1.00].
      </p>
      <ul className="space-y-3 text-[#66ff66]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Index Price:</strong> Derived from orderbook depth or external feeds (RedStone/Pyth for objective events).</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Funding Rate:</strong> 8-hour payments between longs and shorts to anchor to index.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Mark Price:</strong> 15-minute TWAP of index + premium/discount for liquidation safety.</span>
        </li>
      </ul>

      <h3 className="text-[#ffaa00] text-lg mb-4">Leverage & Margin</h3>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#66ff66]/30">
          <thead>
            <tr className="bg-[#66ff66]/10">
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Parameter</th>
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Value / Formula</th>
            </tr>
          </thead>
          <tbody className="text-[#66ff66]/80">
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3">Max Leverage</td>
              <td className="p-3 text-[#88ffff]">10-50x (dynamic)</td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3">Initial Margin</td>
              <td className="p-3 text-[#88ffff]">1 / leverage</td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3">Maintenance Margin</td>
              <td className="p-3 text-[#88ffff]">50-70% of initial (configurable per market)</td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3">Liquidation Trigger</td>
              <td className="p-3 text-[#88ffff]">Mark price crosses liquidation price</td>
            </tr>
            <tr>
              <td className="p-3">Partial Liquidations</td>
              <td className="p-3 text-[#88ffff]">Supported - reduce position size before full close</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-[#ffaa00] text-lg mb-4">Dynamic Leverage Caps</h3>
      <div className="bg-[#111] border border-[#66ff66]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#66ff66]/90"><code>{`function calculateMaxLeverage(
  uint256 probability,
  uint256 timeToResolution
) public pure returns (uint256) {
  uint256 prob = probability; // 0-10000 (4 decimals)
  uint256 daysLeft = timeToResolution / 86400;

  if (prob < 1000 || prob > 9000 || daysLeft < 7) return 10;
  if (prob < 2000 || prob > 8000 || daysLeft < 30) return 20;
  return 50; // Full leverage otherwise
}`}</code></pre>
      </div>

      <h3 className="text-[#ffaa00] text-lg mb-4">Liquidation Process</h3>
      <ol className="space-y-2 text-[#66ff66]/80 list-decimal list-inside">
        <li>RiskEngine detects maintenance margin breach.</li>
        <li>Partial or full position closed via HyperCore liquidator bots.</li>
        <li>Proceeds returned to user; shortfall covered by insurance fund.</li>
      </ol>
    </>
  );
}

function OrderTypesSection() {
  return (
    <>
      <h2 className="text-xl text-[#66ff66] border-b border-[#66ff66]/30 pb-2 mb-6">Advanced Order Types</h2>
      
      <p className="text-[#66ff66]/80 leading-relaxed mb-6">
        Settlr supports advanced order types beyond simple market orders, enabling sophisticated execution strategies for professional traders.
      </p>

      <h3 className="text-[#ffaa00] text-lg mb-4">Market Orders</h3>
      <p className="text-[#66ff66]/80 leading-relaxed mb-4">
        Immediate execution at the current market price. Best for quick entries when speed is more important than price precision.
      </p>
      <ul className="space-y-3 text-[#66ff66]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Execution:</strong> Instant fill at current probability</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Slippage:</strong> May experience price impact on large orders</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Best For:</strong> High-conviction entries, news-driven trades</span>
        </li>
      </ul>

      <h3 className="text-[#ffaa00] text-lg mb-4">Limit Orders</h3>
      <p className="text-[#66ff66]/80 leading-relaxed mb-4">
        Execute only when the market reaches your specified price. Orders remain pending until the target probability is hit.
      </p>
      <ul className="space-y-3 text-[#66ff66]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Limit Price:</strong> Target probability (0.01 - 0.99) at which order executes</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Execution:</strong> Fills when market price crosses your limit</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Best For:</strong> Value entries, scaling into positions at better prices</span>
        </li>
      </ul>
      <div className="bg-[#111] border border-[#66ff66]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#66ff66]/90"><code>{`Example: Limit Order
├─ Side: YES
├─ Size: $500 (10x leverage)
├─ Limit Price: 0.35 (35% probability)
└─ Status: Pending until market <= 35%`}</code></pre>
      </div>

      <h3 className="text-[#ffaa00] text-lg mb-4">Iceberg Orders</h3>
      <p className="text-[#66ff66]/80 leading-relaxed mb-4">
        Large orders split into smaller visible "clips" to minimize market impact. Only a portion of the total size is shown at any time. The system automatically handles execution timing.
      </p>
      <ul className="space-y-3 text-[#66ff66]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Total Size:</strong> Full position size you want to accumulate</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Clip Size:</strong> Portion executed per batch (must be smaller than total) - the only user input required</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Automatic Timing:</strong> System spaces out clip executions to minimize market impact</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Best For:</strong> Large positions, reducing slippage, hiding order size from other traders</span>
        </li>
      </ul>
      <p className="text-[#66ff66]/60 text-sm mb-4">
        Note: For precise control over execution timing, use TWAP orders instead.
      </p>
      <div className="bg-[#111] border border-[#66ff66]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#66ff66]/90"><code>{`Example: Iceberg Order
├─ Side: NO
├─ Total Size: $5,000 (25x leverage)
├─ Clip Size: $500 (executes in 10 batches)
├─ Timing: Automatic (system-managed)
└─ Status: Partial (3/10 clips filled)`}</code></pre>
      </div>

      <h3 className="text-[#ffaa00] text-lg mb-4">TWAP Orders (Time-Weighted Average Price)</h3>
      <p className="text-[#66ff66]/80 leading-relaxed mb-4">
        Spreads execution over a specified time period at regular intervals. Achieves an average entry price rather than a single execution point.
      </p>
      <ul className="space-y-3 text-[#66ff66]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Duration:</strong> Total time window for execution (e.g., 60 minutes)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Interval:</strong> Time between each slice execution (e.g., every 30 seconds)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Slice Size:</strong> Automatically calculated (Total Size / Number of Intervals)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Best For:</strong> Reducing timing risk, dollar-cost averaging into volatile markets</span>
        </li>
      </ul>
      <div className="bg-[#111] border border-[#66ff66]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#66ff66]/90"><code>{`Example: TWAP Order
├─ Side: YES
├─ Total Size: $2,000 (5x leverage)
├─ Duration: 60 minutes
├─ Interval: 30 seconds
├─ Slices: 120 executions of ~$16.67 each
└─ Status: Active (45/120 slices executed)`}</code></pre>
      </div>

      <h3 className="text-[#ffaa00] text-lg mb-4">Order Lifecycle</h3>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#66ff66]/30">
          <thead>
            <tr className="bg-[#66ff66]/10">
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Status</th>
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Description</th>
            </tr>
          </thead>
          <tbody className="text-[#66ff66]/80">
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3 text-[#88ffff]">Active</td>
              <td className="p-3">Order is live and eligible for execution</td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3 text-[#88ffff]">Partial</td>
              <td className="p-3">Order partially filled (iceberg/TWAP in progress)</td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3 text-[#88ffff]">Filled</td>
              <td className="p-3">Order fully executed - position created</td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3 text-[#88ffff]">Cancelled</td>
              <td className="p-3">Order cancelled by user before completion</td>
            </tr>
            <tr>
              <td className="p-3 text-[#88ffff]">Expired</td>
              <td className="p-3">Order expired before conditions were met</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-[#ffaa00] text-lg mb-4">Leverage with Advanced Orders</h3>
      <p className="text-[#66ff66]/80 leading-relaxed mb-4">
        All order types support leverage from 1x to 50x. The leverage is locked at order creation and applied when the order executes.
      </p>
      <ul className="space-y-3 text-[#66ff66]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Margin:</strong> Calculated as Position Size / Leverage</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Liquidation:</strong> Higher leverage = tighter liquidation threshold</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Risk:</strong> Advanced orders inherit the same risk parameters as market orders</span>
        </li>
      </ul>

      <h3 className="text-[#ffaa00] text-lg mb-4">Order Management</h3>
      <p className="text-[#66ff66]/80 leading-relaxed mb-4">
        Pending orders can be viewed and cancelled from the market detail page. Each order displays:
      </p>
      <ul className="space-y-3 text-[#66ff66]/80">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Order type, side, and leverage</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Total size and remaining size (for partial fills)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Order-specific parameters (limit price, clip size, TWAP schedule)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Execution history with timestamps and fill prices</span>
        </li>
      </ul>
    </>
  );
}

function CombosSection() {
  return (
    <>
      <h2 className="text-xl text-[#66ff66] border-b border-[#66ff66]/30 pb-2 mb-6">Combos & Parlays</h2>
      
      <h3 className="text-[#ffaa00] text-lg mb-4">Structured Combos</h3>
      <p className="text-[#66ff66]/80 leading-relaxed mb-4">Governance-curated multi-outcome markets.</p>
      <ul className="space-y-3 text-[#66ff66]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Pricing Model:</strong> Implied probability = product of leg probabilities (selected side)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Multiplier:</strong> 1 / implied probability</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Deployment:</strong> Single HIP-3 event perpetual representing the combined outcome</span>
        </li>
      </ul>

      <h3 className="text-[#ffaa00] text-lg mb-4">Custom Combos</h3>
      <p className="text-[#66ff66]/80 leading-relaxed mb-4">Permissionless user-created parlays.</p>
      <p className="text-[#66ff66]/80 mb-2"><strong className="text-[#66ff66]">Creation Flow:</strong></p>
      <ol className="space-y-2 text-[#66ff66]/80 list-decimal list-inside mb-4">
        <li>User selects arbitrary active markets and sides (YES/NO)</li>
        <li>Frontend calculates real-time implied probability and multiplier</li>
        <li>ComboFactory deploys new HIP-3 event perpetual</li>
      </ol>
      <p className="text-[#66ff66]/80 mb-8">
        <strong className="text-[#66ff66]">Leg Limit:</strong> None enforced onchain (UI caps at 10 for usability)
      </p>

      <h3 className="text-[#ffaa00] text-lg mb-4">Settlement</h3>
      <p className="text-[#66ff66]/80">
        All legs must resolve to the selected side - <span className="text-[#88ffff]">$1 payout</span>. Any mismatch - <span className="text-[#88ffff]">$0</span>.
      </p>
    </>
  );
}

function PermissionlessSection() {
  return (
    <>
      <h2 className="text-xl text-[#66ff66] border-b border-[#66ff66]/30 pb-2 mb-6">Permissionless Market Creation</h2>
      
      <h3 className="text-[#ffaa00] text-lg mb-4">Mechanism</h3>
      <p className="text-[#66ff66]/80 leading-relaxed mb-4">Leverages HIP-3 Event Perpetuals extension:</p>
      <ol className="space-y-2 text-[#66ff66]/80 list-decimal list-inside mb-8">
        <li>User calls <code className="text-[#ffaa00]">EventPerpFactory.createEventMarket(title, resolutionTimestamp, oracleParams)</code></li>
        <li>Required HYPE stake bonded (slashable for spam)</li>
        <li>New independent event perpetual deployed with custom oracle configuration</li>
        <li>Market immediately appears in global listing and is tradable on HyperCore orderbooks</li>
      </ol>

      <h3 className="text-[#ffaa00] text-lg mb-4">Anti-Spam & Quality Controls</h3>
      <ul className="space-y-3 text-[#66ff66]/80">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Staking Bond:</strong> 500K-1M HYPE (configurable)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Minimum Initial Liquidity:</strong> Encouraged via creator deposit</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Reporting & Hiding:</strong> Community flags - governance hide low-quality markets</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Rate Limits:</strong> Per-wallet creation cooldowns</span>
        </li>
      </ul>
    </>
  );
}

function OracleSection() {
  return (
    <>
      <h2 className="text-xl text-[#66ff66] border-b border-[#66ff66]/30 pb-2 mb-6">Oracle Integration & Resolution</h2>
      
      <h3 className="text-[#ffaa00] text-lg mb-4">Primary Oracle: UMA Optimistic Oracle (V3)</h3>
      <ul className="space-y-3 text-[#66ff66]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Assertion per Market:</strong> Custom identifier + detailed ancillary data</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Proposer:</strong> Protocol-operated bot submits bonded outcome post-event</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Liveness Window:</strong> Default 2 hours</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span><strong className="text-[#66ff66]">Dispute Escalation:</strong> UMA tokenholder vote via Data Verification Mechanism (DVM)</span>
        </li>
      </ul>

      <h3 className="text-[#ffaa00] text-lg mb-4">Fallback Oracles</h3>
      <ul className="space-y-3 text-[#66ff66]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Chainlink / Pyth for objective price-based events</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Median-of-oracles for redundancy</span>
        </li>
      </ul>

      <h3 className="text-[#ffaa00] text-lg mb-4">Resolution Flow</h3>
      <ol className="space-y-2 text-[#66ff66]/80 list-decimal list-inside">
        <li>Event timestamp passed - bot queries defined sources</li>
        <li>Assertion submitted with bond</li>
        <li>Undisputed - settlement price forced to $1 (YES) or $0 (NO)</li>
        <li>All open positions closed at settlement price</li>
        <li>Insurance fund covers any residual shortfall</li>
      </ol>
    </>
  );
}

function EarnSection() {
  return (
    <>
      <h2 className="text-xl text-[#66ff66] border-b border-[#66ff66]/30 pb-2 mb-6">Earn Program & STLR Token</h2>
      
      <h3 className="text-[#ffaa00] text-lg mb-4">Pre-Launch Points System</h3>
      <p className="text-[#66ff66]/80 leading-relaxed mb-4">Users earn STLR points (1:1 claimable at TGE) via:</p>
      
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#66ff66]/30">
          <thead>
            <tr className="bg-[#66ff66]/10">
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Action</th>
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Points Reward</th>
            </tr>
          </thead>
          <tbody className="text-[#66ff66]/80">
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3">Follow @settlrtrade on X</td>
              <td className="p-3 text-[#88ffff]">+1,000 (once)</td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3">Join t.me/settlrtrade</td>
              <td className="p-3 text-[#88ffff]">+1,000 (once)</td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3">First paper trade</td>
              <td className="p-3 text-[#88ffff]">+500 (once)</td>
            </tr>
            <tr>
              <td className="p-3">Weekly PnL Challenge</td>
              <td className="p-3 text-[#88ffff]">+500 per +$10k paper profit (tiered diminishing)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-[#ffaa00] text-lg mb-4">Paper Trading Environment</h3>
      <ul className="space-y-3 text-[#66ff66]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Fixed $10,000 starting mock USDC balance per wallet</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>No real deposits or withdrawals</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Full order execution simulation with PnL tracking</span>
        </li>
      </ul>

      <h3 className="text-[#ffaa00] text-lg mb-4">Weekly Reset</h3>
      <ul className="space-y-3 text-[#66ff66]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>PnL counter resets every Monday 00:00 UTC</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Only positive gains count toward thresholds</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Losses do not carry over</span>
        </li>
      </ul>

      <h3 className="text-[#ffaa00] text-lg mb-4">STLR Tokenomics</h3>
      <p className="text-[#66ff66]/80 leading-relaxed mb-4">
        <strong className="text-[#66ff66]">Total Supply:</strong> <span className="text-[#88ffff]">1,000,000,000 STLR</span> (fixed, no inflation)
      </p>

      <h4 className="text-[#66ff66] mb-4">Allocation</h4>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#66ff66]/30">
          <thead>
            <tr className="bg-[#66ff66]/10">
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Category</th>
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Percentage</th>
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Amount</th>
            </tr>
          </thead>
          <tbody className="text-[#66ff66]/80">
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3">Airdrop</td>
              <td className="p-3 text-[#88ffff]">90%</td>
              <td className="p-3 text-[#88ffff]">900,000,000</td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3">Team</td>
              <td className="p-3 text-[#88ffff]">5%</td>
              <td className="p-3 text-[#88ffff]">50,000,000</td>
            </tr>
            <tr>
              <td className="p-3">Investors</td>
              <td className="p-3 text-[#88ffff]">5%</td>
              <td className="p-3 text-[#88ffff]">50,000,000</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h4 className="text-[#66ff66] mb-4">Value Accrual Mechanism</h4>
      <p className="text-[#66ff66]/80 leading-relaxed mb-4">
        All trading fees accrue to the protocol treasury in USDC/HYPE. Fee revenue is allocated as follows:
      </p>
      <ol className="space-y-4 text-[#66ff66]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ffff] font-bold">1.</span>
          <span>
            <strong className="text-[#66ff66]">50% Buyback & Burn</strong> - Used to purchase STLR on open market (via onchain DEX or HyperCore liquidity). Bought tokens are permanently burned, creating deflationary pressure.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff] font-bold">2.</span>
          <span>
            <strong className="text-[#66ff66]">30% Buyback & Distribute to Stakers</strong> - Used to purchase STLR on open market. Bought tokens are distributed pro-rata to staked STLR holders (veSTLR model planned post-TGE).
          </span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff] font-bold">3.</span>
          <span>
            <strong className="text-[#66ff66]">20% Treasury Accrual</strong> - Retained in treasury for protocol development, insurance fund seeding, liquidity incentives, and operational expenses.
          </span>
        </li>
      </ol>
      <p className="text-[#66ff66]/80 leading-relaxed mb-8">
        This structure aligns incentives: Higher trading volume - increased fee revenue - stronger buy pressure + direct yield for stakers - reduced circulating supply over time - sustainable long-term value capture for holders.
      </p>

      <h3 className="text-[#ffaa00] text-lg mb-4">TGE</h3>
      <p className="text-[#66ff66]/80">
        Scheduled for <span className="text-[#88ffff]">Q1 2026</span>. All earned points converted 1:1 to STLR tokens.
      </p>
    </>
  );
}

function SecuritySection() {
  return (
    <>
      <h2 className="text-xl text-[#66ff66] border-b border-[#66ff66]/30 pb-2 mb-6">Security Considerations</h2>
      
      <h3 className="text-[#ffaa00] text-lg mb-4">Risk Surface</h3>
      <ul className="space-y-3 text-[#66ff66]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Smart contract vulnerabilities (margin logic, factory exploits)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Oracle manipulation / delay attacks</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Front-running on order submission</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Sybil attacks on earn program</span>
        </li>
      </ul>

      <h3 className="text-[#ffaa00] text-lg mb-4">Mitigations</h3>
      <ul className="space-y-3 text-[#66ff66]/80">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Formal audit planned Q1 2026</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Dynamic leverage caps and partial liquidations</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>UMA bond + dispute mechanism</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Wallet-bound points + social verification</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Insurance fund seeded from fees</span>
        </li>
      </ul>
    </>
  );
}

function RoadmapSection() {
  return (
    <>
      <h2 className="text-xl text-[#66ff66] border-b border-[#66ff66]/30 pb-2 mb-6">Roadmap</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-[#66ff66]/30">
          <thead>
            <tr className="bg-[#66ff66]/10">
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Quarter</th>
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Milestones</th>
            </tr>
          </thead>
          <tbody className="text-[#66ff66]/80">
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3 text-[#88ffff]">Q4 2025</td>
              <td className="p-3">Testnet launch, paper trading, earn program, permissionless creation (mock)</td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3 text-[#88ffff]">Q1 2026</td>
              <td className="p-3">Mainnet launch, real HIP-3 deployment, full UMA integration, TGE</td>
            </tr>
            <tr>
              <td className="p-3 text-[#88ffff]">Q2 2026+</td>
              <td className="p-3">Custom combo enhancements, structured products, institutional integrations</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function MarketMakerSection() {
  return (
    <>
      <h2 className="text-xl text-[#88ffff] border-b border-[#88ffff]/30 pb-2 mb-6">Market Maker API Documentation</h2>
      
      <h3 className="text-[#ffaa00] text-lg mb-4">Authentication</h3>
      <p className="text-[#66ff66]/80 leading-relaxed mb-4">
        All API calls require an authenticated session from a connected Hyperliquid wallet.
      </p>
      <p className="text-[#66ff66]/80 leading-relaxed mb-8">
        Connect your wallet on <span className="text-[#88ffff]">settlr.finance</span> first - subsequent API requests will use browser session cookies.
      </p>

      <h3 className="text-[#ffaa00] text-lg mb-4">Base URL</h3>
      <div className="bg-[#111] border border-[#66ff66]/30 p-4 mb-8">
        <code className="text-[#88ffff]">https://settlr.finance/api/mm</code>
      </div>

      <h3 className="text-[#ffaa00] text-lg mb-4">Endpoints</h3>

      <h4 className="text-[#66ff66] mb-3">1. Get Available Markets</h4>
      <div className="bg-[#111] border border-[#66ff66]/30 p-3 mb-4">
        <code className="text-[#88ffff]">GET /markets</code>
      </div>
      <p className="text-[#66ff66]/80 mb-4">Returns list of active markets eligible for quoting.</p>
      <p className="text-[#66ff66]/60 text-sm mb-2">Response Example:</p>
      <div className="bg-[#111] border border-[#66ff66]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#66ff66]/90"><code>{`[
  {
    "id": 1,
    "question": "Trump wins 2028 Election?",
    "category": "Politics",
    "currentProbability": 0.45,
    "status": "active"
  },
  {
    "id": 2,
    "question": "BTC > $150K by EOY 2026?",
    "category": "Crypto",
    "currentProbability": 0.21,
    "status": "active"
  }
]`}</code></pre>
      </div>

      <h4 className="text-[#66ff66] mb-3">2. Check MM Account Status</h4>
      <div className="bg-[#111] border border-[#66ff66]/30 p-3 mb-4">
        <code className="text-[#88ffff]">GET /status/{'{wallet-address}'}</code>
      </div>
      <p className="text-[#66ff66]/80 mb-4">Returns current paper trading account and STLR points.</p>
      <p className="text-[#66ff66]/60 text-sm mb-2">Response Example:</p>
      <div className="bg-[#111] border border-[#66ff66]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#66ff66]/90"><code>{`{
  "exists": true,
  "wallet": "0xAbC...1234",
  "balance": 10000,
  "weeklyPnl": 8200,
  "stlrPoints": 1500
}`}</code></pre>
      </div>

      <h4 className="text-[#66ff66] mb-3">3. Place Order</h4>
      <div className="bg-[#111] border border-[#66ff66]/30 p-3 mb-4">
        <code className="text-[#88ffff]">POST /order</code>
        <span className="text-[#66ff66]/60 ml-4">Content-Type: application/json</span>
      </div>
      <p className="text-[#66ff66]/60 text-sm mb-2">Request Body:</p>
      <div className="bg-[#111] border border-[#66ff66]/30 p-4 overflow-x-auto mb-6">
        <pre className="text-sm text-[#66ff66]/90"><code>{`{
  "wallet": "0xYourWalletAddress",
  "marketId": 1,
  "side": "buy",      // "buy" = long YES, "sell" = short NO
  "size": 100,        // USD notional (minimum $10)
  "price": 0.45,      // Limit price in probability space (0.01-0.99)
  "type": "postOnly"  // "limit", "postOnly", or "market"
}`}</code></pre>
      </div>

      <p className="text-[#66ff66]/60 text-sm mb-2">Parameters:</p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border border-[#66ff66]/30">
          <thead>
            <tr className="bg-[#66ff66]/10">
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Field</th>
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Type</th>
              <th className="text-left p-3 text-[#66ff66] border-b border-[#66ff66]/30">Description</th>
            </tr>
          </thead>
          <tbody className="text-[#66ff66]/80">
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3 text-[#88ffff]">wallet</td>
              <td className="p-3">string</td>
              <td className="p-3">Connected Hyperliquid wallet address</td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3 text-[#88ffff]">marketId</td>
              <td className="p-3">number</td>
              <td className="p-3">From /markets endpoint</td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3 text-[#88ffff]">side</td>
              <td className="p-3">string</td>
              <td className="p-3">"buy" (YES) or "sell" (NO)</td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3 text-[#88ffff]">size</td>
              <td className="p-3">number</td>
              <td className="p-3">USD notional size (min $10)</td>
            </tr>
            <tr className="border-b border-[#66ff66]/10">
              <td className="p-3 text-[#88ffff]">price</td>
              <td className="p-3">number</td>
              <td className="p-3">Limit price (0.01-0.99)</td>
            </tr>
            <tr>
              <td className="p-3 text-[#88ffff]">type</td>
              <td className="p-3">string</td>
              <td className="p-3">"limit", "postOnly", or "market"</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[#66ff66]/60 text-sm mb-2">Response Example:</p>
      <div className="bg-[#111] border border-[#66ff66]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#66ff66]/90"><code>{`{
  "status": "filled",
  "fillPrice": 0.45,
  "size": 100,
  "pnl": 5,
  "newBalance": 10005,
  "txHash": "mock-1234567890"
}`}</code></pre>
      </div>

      <h3 className="text-[#ffaa00] text-lg mb-4">Rate Limits</h3>
      <p className="text-[#66ff66]/80 mb-8">
        <span className="text-[#88ffff]">60 orders per minute</span> per wallet.
      </p>

      <h3 className="text-[#ffaa00] text-lg mb-4">STLR Points Earning</h3>
      <p className="text-[#66ff66]/80 mb-4">Paper trading PnL contributes to weekly challenges:</p>
      <ul className="space-y-3 text-[#66ff66]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Every <span className="text-[#88ffff]">+$10,000</span> net paper PnL in a week earns STLR tokens.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Tiered rewards (diminishing returns):</span>
        </li>
      </ul>
      <div className="ml-8 mb-8 text-[#66ff66]/80">
        <p>First $10k → <span className="text-[#88ffff]">1,000 STLR</span></p>
        <p>Second $10k → <span className="text-[#88ffff]">500 STLR</span></p>
        <p>Third $10k → <span className="text-[#88ffff]">333 STLR</span></p>
        <p className="text-[#66ff66]/60">(continues diminishing)</p>
      </div>
      <ul className="space-y-3 text-[#66ff66]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Weekly reset every Monday 00:00 UTC.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ffff]">•</span>
          <span>Points claimable at January 2026 TGE.</span>
        </li>
      </ul>

      <h3 className="text-[#ffaa00] text-lg mb-4">Dashboard</h3>
      <p className="text-[#66ff66]/80 mb-8">
        Visit <span className="text-[#88ffff]">https://settlr.finance/mm</span> for visual quoting tools and auto-quote functionality (coming soon).
      </p>

      <h3 className="text-[#ffaa00] text-lg mb-4">Current Mode</h3>
      <p className="text-[#66ff66]/80 mb-4">
        All trading is currently in <span className="text-[#88ffff]">paper mode</span> (simulated $10,000 starting balance).
      </p>
      <p className="text-[#66ff66]/80">
        At mainnet launch, the same endpoints will switch to real HyperCore execution with no client-side changes required.
      </p>
    </>
  );
}

export default function Docs() {
  const [activeSection, setActiveSection] = useState("introduction");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentIndex = sections.findIndex(s => s.id === activeSection);
  const prevSection = currentIndex > 0 ? sections[currentIndex - 1] : null;
  const nextSection = currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null;

  const goToSection = (id: string) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderSection = () => {
    switch (activeSection) {
      case "introduction": return <IntroductionSection />;
      case "architecture": return <ArchitectureSection />;
      case "trading": return <TradingSection />;
      case "ordertypes": return <OrderTypesSection />;
      case "combos": return <CombosSection />;
      case "permissionless": return <PermissionlessSection />;
      case "oracle": return <OracleSection />;
      case "earn": return <EarnSection />;
      case "security": return <SecuritySection />;
      case "roadmap": return <RoadmapSection />;
      case "mm": return <MarketMakerSection />;
      default: return <IntroductionSection />;
    }
  };

  return (
    <div className="min-h-screen bg-black font-mono">
      <header className="sticky top-0 z-50 border-b border-[#66ff66]/30 bg-black">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/">
            <span className="text-[#66ff66] font-bold cursor-pointer" data-testid="link-home">
              &lt; SETTLR
            </span>
          </Link>
          <span className="text-[#66ff66]/70 text-sm hidden md:block">Technical Reference - January 2026</span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[#66ff66]"
            data-testid="button-docs-mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="flex w-full overflow-hidden">
        <aside
          className={`fixed md:sticky top-[49px] left-0 h-[calc(100vh-49px)] w-64 bg-black border-r border-[#66ff66]/30 overflow-y-auto z-40 transition-transform ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <nav className="p-4 space-y-1">
            <p className="text-[#ffaa00] text-xs uppercase tracking-wider mb-4">Contents</p>
            {sections.map((section, index) => {
              const isCyan = 'highlight' in section && section.highlight;
              const activeColor = isCyan ? "text-[#88ffff] bg-[#88ffff]/10" : "text-[#66ff66] bg-[#66ff66]/10";
              const inactiveColor = isCyan 
                ? "text-[#88ffff]/60 hover:text-[#88ffff] hover:bg-[#88ffff]/5" 
                : "text-[#66ff66]/60 hover:text-[#66ff66] hover:bg-[#66ff66]/5";
              return (
                <button
                  key={section.id}
                  onClick={() => goToSection(section.id)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                    activeSection === section.id ? activeColor : inactiveColor
                  }`}
                  data-testid={`nav-${section.id}`}
                >
                  <span className="text-[#88ffff] text-xs w-4">{index + 1}.</span>
                  {section.title}
                </button>
              );
            })}
          </nav>
        </aside>

        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <main className="flex-1 w-full min-w-0 max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12 overflow-x-hidden">
          <div className="mb-8">
            <span className="text-[#88ffff] text-sm">Section {currentIndex + 1} of {sections.length}</span>
          </div>

          <div className="min-h-[60vh]">
            {renderSection()}
          </div>

          <div className="border-t border-[#66ff66]/30 pt-8 mt-12 flex items-center justify-between gap-4">
            {prevSection ? (
              <button
                onClick={() => goToSection(prevSection.id)}
                className="flex items-center gap-2 text-[#66ff66]/70 hover:text-[#66ff66] transition-colors"
                data-testid="button-prev-section"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm">{prevSection.title}</span>
              </button>
            ) : (
              <div />
            )}

            {nextSection ? (
              <button
                onClick={() => goToSection(nextSection.id)}
                className="flex items-center gap-2 px-4 py-2 bg-[#66ff66]/10 border border-[#66ff66]/30 text-[#66ff66] hover:bg-[#66ff66]/20 transition-colors"
                data-testid="button-next-section"
              >
                <span className="text-sm">Next: {nextSection.title}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="text-center">
                <p className="text-[#66ff66]/50 text-sm">End of Documentation</p>
                <p className="text-[#66ff66]/30 text-xs mt-1">Settlr Protocol - January 2026</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
