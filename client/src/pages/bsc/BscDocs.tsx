import { useState } from "react";
import { Link } from "wouter";
import { ChevronRight, ChevronLeft, Menu, X, ExternalLink } from "lucide-react";
import { BscNavbar } from "@/components/bsc/BscNavbar";
import { Footer } from "@/components/Footer";

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
      <h2 className="text-xl text-[#f0b90b] border-b border-[#f0b90b]/30 pb-2 mb-6">Introduction</h2>
      
      <h3 className="text-[#ff6600] text-lg mb-4">Overview</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-6">
        Settlr BSC is a decentralized perpetual futures protocol built natively on BNB Smart Chain, providing leveraged exposure to real-world binary event outcomes with ultra-low transaction costs.
      </p>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-6">
        By leveraging BSC's EVM-compatible infrastructure and 3-second block times, Settlr BSC enables up to 50x leverage on prediction-style markets while maintaining non-custodial BEP-20 margin accounts and transparent Chainlink/UMA oracle-driven settlement.
      </p>

      <h3 className="text-[#ff6600] text-lg mb-4">Core Design Principles</h3>
      <ul className="space-y-3 text-[#f0b90b]/80">
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Leveraged Binary Exposure:</strong> Transform $0-$1 probability shares into perpetual instruments with funding rate anchoring on BSC.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Permissionless Market Creation:</strong> BscEventPerpFactory allows any user to deploy new event markets with BNB staking bonds.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Composable Parlays:</strong> Structured and custom multi-leg markets with product-of-probabilities pricing via BscComboFactory.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Robust Risk Management:</strong> Dynamic leverage caps, partial liquidations, and insurance fund backstop using BUSD/BNB reserves.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Ultra-Low Fees:</strong> BSC's ~$0.05-0.20 gas costs enable high-frequency trading strategies.</span>
        </li>
      </ul>

      <h3 className="text-[#ff6600] text-lg mb-4 mt-8">BNB Smart Chain Benefits</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Feature</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Value</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Block Time</td>
              <td className="p-3 text-[#88ccff]">~3 seconds</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Average Gas Fee</td>
              <td className="p-3 text-[#88ccff]">$0.05 - $0.20 per tx</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">EVM Compatibility</td>
              <td className="p-3 text-[#88ccff]">Full Solidity/Vyper support</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Chain ID (Mainnet)</td>
              <td className="p-3 text-[#88ccff]">56</td>
            </tr>
            <tr>
              <td className="p-3">Chain ID (Testnet)</td>
              <td className="p-3 text-[#88ccff]">97</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function ArchitectureSection() {
  return (
    <>
      <h2 className="text-xl text-[#f0b90b] border-b border-[#f0b90b]/30 pb-2 mb-6">Architecture</h2>
      
      <h3 className="text-[#ff6600] text-lg mb-4">BSC Integration Stack</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-6">Settlr BSC leverages the full BNB Smart Chain infrastructure:</p>
      
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Layer</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Component</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Role in Settlr</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Consensus</td>
              <td className="p-3 text-[#88ccff]">PoSA (Proof of Staked Authority)</td>
              <td className="p-3">21 validators providing 3-second block finality</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Execution</td>
              <td className="p-3 text-[#88ccff]">BSC EVM (Cancun-compatible)</td>
              <td className="p-3">Smart contract execution for all trading operations</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Token Standard</td>
              <td className="p-3 text-[#88ccff]">BEP-20</td>
              <td className="p-3">STLR token, collateral tokens, LP tokens</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Oracles</td>
              <td className="p-3 text-[#88ccff]">Chainlink + UMA</td>
              <td className="p-3">Price feeds and event outcome resolution</td>
            </tr>
            <tr>
              <td className="p-3">Indexer</td>
              <td className="p-3 text-[#88ccff]">The Graph (BSC Subgraph)</td>
              <td className="p-3">Event indexing, historical data, analytics</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Contract Overview</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Contract</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Purpose</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Key Functions</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">BscMarginVault.sol</td>
              <td className="p-3">Non-custodial BEP-20 collateral and position management</td>
              <td className="p-3"><code className="text-[#ff6600]">depositBNB, depositBUSD, withdraw, updatePosition</code></td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">BscRiskEngine.sol</td>
              <td className="p-3">Dynamic leverage caps, maintenance margin, liquidation triggers</td>
              <td className="p-3"><code className="text-[#ff6600]">calculateMaxLeverage, checkLiquidation, getMarginRatio</code></td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">BscEventPerpFactory.sol</td>
              <td className="p-3">Permissionless creation of single-event perpetuals</td>
              <td className="p-3"><code className="text-[#ff6600]">createEventMarket, setOracleParams</code></td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">BscComboFactory.sol</td>
              <td className="p-3">Structured and custom multi-leg parlay deployment</td>
              <td className="p-3"><code className="text-[#ff6600]">createCombo, createCustomCombo</code></td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">ChainlinkAdapter.sol</td>
              <td className="p-3">Chainlink BSC price feed integration</td>
              <td className="p-3"><code className="text-[#ff6600]">getLatestPrice, validateFeed</code></td>
            </tr>
            <tr>
              <td className="p-3 text-[#88ccff]">UmaOracleAdapter.sol</td>
              <td className="p-3">UMA Optimistic Oracle for subjective event resolution</td>
              <td className="p-3"><code className="text-[#ff6600]">proposeOutcome, settleMarket, disputeAssertion</code></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Network Configuration</h3>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 overflow-x-auto mb-6">
        <pre className="text-sm text-[#f0b90b]/90"><code>{`// BSC Mainnet Configuration
{
  "chainId": 56,
  "chainName": "BNB Smart Chain",
  "nativeCurrency": {
    "name": "BNB",
    "symbol": "BNB",
    "decimals": 18
  },
  "rpcUrls": [
    "https://bsc-dataseed.binance.org/",
    "https://bsc-dataseed1.defibit.io/",
    "https://bsc-dataseed1.ninicoin.io/"
  ],
  "blockExplorerUrls": ["https://bscscan.com"]
}

// BSC Testnet Configuration
{
  "chainId": 97,
  "chainName": "BSC Testnet",
  "nativeCurrency": {
    "name": "tBNB",
    "symbol": "tBNB",
    "decimals": 18
  },
  "rpcUrls": [
    "https://data-seed-prebsc-1-s1.binance.org:8545/",
    "https://data-seed-prebsc-2-s1.binance.org:8545/"
  ],
  "blockExplorerUrls": ["https://testnet.bscscan.com"]
}`}</code></pre>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Deployed Contracts (Testnet)</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Contract</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Address (BSC Testnet)</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">BscMarginVault</td>
              <td className="p-3 text-[#88ccff] font-mono text-xs">0x... (TBD - Testnet deployment pending)</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">BscRiskEngine</td>
              <td className="p-3 text-[#88ccff] font-mono text-xs">0x... (TBD)</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">BscEventPerpFactory</td>
              <td className="p-3 text-[#88ccff] font-mono text-xs">0x... (TBD)</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">BscComboFactory</td>
              <td className="p-3 text-[#88ccff] font-mono text-xs">0x... (TBD)</td>
            </tr>
            <tr>
              <td className="p-3">STLR Token (BEP-20)</td>
              <td className="p-3 text-[#88ccff] font-mono text-xs">0x... (TBD)</td>
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
      <h2 className="text-xl text-[#f0b90b] border-b border-[#f0b90b]/30 pb-2 mb-6">Trading Mechanics</h2>
      
      <h3 className="text-[#ff6600] text-lg mb-4">Single Event Perpetuals</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        Each market is a synthetic perpetual contract with index price in the range [$0.00, $1.00], settled on BSC.
      </p>
      <ul className="space-y-3 text-[#f0b90b]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Index Price:</strong> Derived from on-chain orderbook depth or Chainlink feeds for objective events.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Funding Rate:</strong> 8-hour payments between longs and shorts to anchor mark price to index.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Mark Price:</strong> 15-minute TWAP of index + premium/discount for liquidation safety.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Settlement:</strong> Binary resolution to $0 or $1 via UMA Optimistic Oracle or Chainlink.</span>
        </li>
      </ul>

      <h3 className="text-[#ff6600] text-lg mb-4">Leverage & Margin</h3>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Parameter</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Value / Formula</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Max Leverage</td>
              <td className="p-3 text-[#88ccff]">10-50x (dynamic based on probability & time)</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Initial Margin</td>
              <td className="p-3 text-[#88ccff]">1 / leverage (e.g., 2% for 50x)</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Maintenance Margin</td>
              <td className="p-3 text-[#88ccff]">50-70% of initial margin (configurable per market)</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Liquidation Trigger</td>
              <td className="p-3 text-[#88ccff]">Mark price crosses liquidation threshold</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Partial Liquidations</td>
              <td className="p-3 text-[#88ccff]">Supported - reduces position size before full close</td>
            </tr>
            <tr>
              <td className="p-3">Collateral Types</td>
              <td className="p-3 text-[#88ccff]">BNB, BUSD, USDT (BEP-20)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Dynamic Leverage Caps</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        Maximum leverage is dynamically adjusted based on market probability and time to resolution:
      </p>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#f0b90b]/90"><code>{`// BscRiskEngine.sol
function calculateMaxLeverage(
  uint256 probability,    // 0-10000 (4 decimals, e.g., 5000 = 50%)
  uint256 timeToResolution // seconds until event
) public pure returns (uint256 maxLeverage) {
  uint256 daysLeft = timeToResolution / 86400;

  // Edge probability or short time = reduced leverage
  if (probability < 1000 || probability > 9000 || daysLeft < 7) {
    return 10; // 10x max for risky conditions
  }
  
  if (probability < 2000 || probability > 8000 || daysLeft < 30) {
    return 20; // 20x for moderate conditions
  }
  
  return 50; // Full 50x for stable conditions
}`}</code></pre>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Liquidation Process</h3>
      <ol className="space-y-2 text-[#f0b90b]/80 list-decimal list-inside mb-8">
        <li>BscRiskEngine detects maintenance margin breach via mark price update.</li>
        <li>Keeper bots call <code className="text-[#ff6600]">liquidatePosition()</code> on the Vault contract.</li>
        <li>Partial liquidation executed if possible (50% position reduction).</li>
        <li>Full liquidation if margin ratio falls below 25% of maintenance.</li>
        <li>Remaining collateral returned to user; shortfall covered by insurance fund.</li>
        <li>Liquidation penalty (1-2.5%) paid to liquidator as incentive.</li>
      </ol>

      <h3 className="text-[#ff6600] text-lg mb-4">Gas Optimization</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        BSC's low gas costs enable efficient trading:
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Operation</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Gas Used</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Est. Cost (@ 5 gwei)</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Deposit BNB</td>
              <td className="p-3 text-[#88ccff]">~45,000</td>
              <td className="p-3">~$0.03</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Open Position</td>
              <td className="p-3 text-[#88ccff]">~120,000</td>
              <td className="p-3">~$0.08</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Close Position</td>
              <td className="p-3 text-[#88ccff]">~100,000</td>
              <td className="p-3">~$0.07</td>
            </tr>
            <tr>
              <td className="p-3">Create Market</td>
              <td className="p-3 text-[#88ccff]">~350,000</td>
              <td className="p-3">~$0.25</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function OrderTypesSection() {
  return (
    <>
      <h2 className="text-xl text-[#f0b90b] border-b border-[#f0b90b]/30 pb-2 mb-6">Advanced Order Types</h2>
      
      <p className="text-[#f0b90b]/80 leading-relaxed mb-6">
        Settlr BSC supports advanced order types beyond simple market orders, enabling sophisticated execution strategies optimized for BSC's fast block times.
      </p>

      <h3 className="text-[#ff6600] text-lg mb-4">Market Orders</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        Immediate execution at the current market price. Confirmed within ~3 seconds on BSC.
      </p>
      <ul className="space-y-3 text-[#f0b90b]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Execution:</strong> Instant fill at current orderbook price</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Slippage Protection:</strong> Configurable max slippage (default 1%)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Best For:</strong> High-conviction entries, news-driven trades, quick exits</span>
        </li>
      </ul>

      <h3 className="text-[#ff6600] text-lg mb-4">Limit Orders</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        Execute only when the market reaches your specified probability. Orders stored on-chain until conditions met.
      </p>
      <ul className="space-y-3 text-[#f0b90b]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Limit Price:</strong> Target probability (0.01 - 0.99) at which order executes</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Time-In-Force:</strong> GTC (Good-Til-Cancelled), IOC (Immediate-Or-Cancel), FOK (Fill-Or-Kill)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Best For:</strong> Value entries, scaling into positions at better prices</span>
        </li>
      </ul>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#f0b90b]/90"><code>{`Example: Limit Order on BSC
├─ Side: YES (Long)
├─ Size: 500 BUSD (10x leverage)
├─ Limit Price: 0.35 (35% probability)
├─ Time-In-Force: GTC
├─ Gas Cost: ~$0.05
└─ Status: Pending until market ≤ 35%`}</code></pre>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Iceberg Orders</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        Large orders split into smaller visible "clips" to minimize market impact. Executed automatically by keeper bots.
      </p>
      <ul className="space-y-3 text-[#f0b90b]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Total Size:</strong> Full position size to accumulate</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Clip Size:</strong> Portion executed per batch (user-defined)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Randomization:</strong> Optional random delay between clips (5-30 seconds)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Best For:</strong> Large positions, hiding order size from other traders</span>
        </li>
      </ul>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#f0b90b]/90"><code>{`Example: Iceberg Order on BSC
├─ Side: NO (Short)
├─ Total Size: 5,000 BUSD (25x leverage)
├─ Clip Size: 500 BUSD (10 batches)
├─ Delay: Random 10-20s between clips
├─ Total Gas Cost: ~$0.50 (10 txs)
└─ Status: Partial (3/10 clips filled)`}</code></pre>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">TWAP Orders (Time-Weighted Average Price)</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        Spreads execution over a specified time period at regular intervals. Ideal for volatile markets.
      </p>
      <ul className="space-y-3 text-[#f0b90b]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Duration:</strong> Total execution window (e.g., 60 minutes)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Interval:</strong> Time between slices (min 30 seconds on BSC)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Price Limit:</strong> Optional max/min price to pause execution</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Best For:</strong> Reducing timing risk, DCA into volatile events</span>
        </li>
      </ul>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#f0b90b]/90"><code>{`Example: TWAP Order on BSC
├─ Side: YES
├─ Total Size: 2,000 BUSD (5x leverage)
├─ Duration: 60 minutes
├─ Interval: 30 seconds
├─ Slices: 120 executions of ~16.67 BUSD each
├─ Price Limit: Max 0.60 probability
└─ Status: Active (45/120 slices executed, avg price 0.52)`}</code></pre>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Order Lifecycle</h3>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Status</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Description</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">Pending</td>
              <td className="p-3">Order submitted, awaiting block confirmation</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">Active</td>
              <td className="p-3">Order confirmed on-chain, eligible for execution</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">Partial</td>
              <td className="p-3">Order partially filled (iceberg/TWAP in progress)</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">Filled</td>
              <td className="p-3">Order fully executed - position created</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">Cancelled</td>
              <td className="p-3">Order cancelled by user (gas refund on BSC)</td>
            </tr>
            <tr>
              <td className="p-3 text-[#88ccff]">Expired</td>
              <td className="p-3">Order expired (for time-limited orders)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function CombosSection() {
  return (
    <>
      <h2 className="text-xl text-[#f0b90b] border-b border-[#f0b90b]/30 pb-2 mb-6">Combos & Parlays</h2>
      
      <h3 className="text-[#ff6600] text-lg mb-4">Structured Combos</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        Governance-curated multi-outcome markets deployed via BscComboFactory.
      </p>
      <ul className="space-y-3 text-[#f0b90b]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Pricing Model:</strong> Implied probability = product of leg probabilities (selected sides)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Multiplier:</strong> 1 / implied probability (e.g., 3 legs at 50% each = 8x payout)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Deployment:</strong> Single BEP-20 event perpetual representing the combined outcome</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Leverage:</strong> Reduced max leverage (typically 5-20x) due to compounded risk</span>
        </li>
      </ul>

      <h3 className="text-[#ff6600] text-lg mb-4">Custom Combos</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        Permissionless user-created parlays on BSC.
      </p>
      <p className="text-[#f0b90b]/80 mb-2"><strong className="text-[#f0b90b]">Creation Flow:</strong></p>
      <ol className="space-y-2 text-[#f0b90b]/80 list-decimal list-inside mb-8">
        <li>User selects 2-10 active markets and sides (YES/NO) via UI</li>
        <li>Frontend calculates real-time implied probability and multiplier</li>
        <li>User confirms and pays BNB gas (~$0.25) to deploy</li>
        <li>BscComboFactory deploys new event perpetual with linked resolution</li>
        <li>Combo immediately tradeable by all users</li>
      </ol>

      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#f0b90b]/90"><code>{`// BscComboFactory.sol
function createCustomCombo(
  uint256[] calldata marketIds,  // Array of market IDs
  bool[] calldata sides,         // true = YES, false = NO for each leg
  string calldata comboName      // User-defined name
) external payable returns (address comboMarket) {
  require(marketIds.length >= 2 && marketIds.length <= 10, "Invalid leg count");
  require(msg.value >= creationFee, "Insufficient BNB");
  
  // Deploy new combo perpetual
  comboMarket = _deployComboPerp(marketIds, sides, comboName);
  
  emit ComboCreated(msg.sender, comboMarket, marketIds, sides);
}`}</code></pre>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Combo Pricing Example</h3>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Leg</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Market</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Side</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Probability</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">1</td>
              <td className="p-3">BTC &gt; $100K by Q1 2026</td>
              <td className="p-3 text-[#88ccff]">YES</td>
              <td className="p-3">65%</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">2</td>
              <td className="p-3">ETH &gt; $5K by Q1 2026</td>
              <td className="p-3 text-[#88ccff]">YES</td>
              <td className="p-3">55%</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">3</td>
              <td className="p-3">BNB &gt; $400 by Q1 2026</td>
              <td className="p-3 text-[#88ccff]">YES</td>
              <td className="p-3">40%</td>
            </tr>
            <tr className="bg-[#f0b90b]/5">
              <td className="p-3 font-bold" colSpan={2}>Combo Probability</td>
              <td className="p-3"></td>
              <td className="p-3 text-[#88ccff] font-bold">14.3% (0.65 x 0.55 x 0.40)</td>
            </tr>
            <tr className="bg-[#f0b90b]/5">
              <td className="p-3 font-bold" colSpan={2}>Payout Multiplier</td>
              <td className="p-3"></td>
              <td className="p-3 text-[#88ccff] font-bold">7.0x (1 / 0.143)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Settlement</h3>
      <p className="text-[#f0b90b]/80">
        All legs must resolve to the selected side for <span className="text-[#88ccff]">$1 payout</span>. 
        Any single leg mismatch results in <span className="text-[#88ccff]">$0 payout</span>.
        Settlement occurs after the last leg resolves.
      </p>
    </>
  );
}

function PermissionlessSection() {
  return (
    <>
      <h2 className="text-xl text-[#f0b90b] border-b border-[#f0b90b]/30 pb-2 mb-6">Permissionless Market Creation</h2>
      
      <h3 className="text-[#ff6600] text-lg mb-4">Mechanism</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        Any user can create new event markets on BSC using the BscEventPerpFactory:
      </p>
      <ol className="space-y-2 text-[#f0b90b]/80 list-decimal list-inside mb-8">
        <li>User calls <code className="text-[#ff6600]">BscEventPerpFactory.createEventMarket()</code> with market parameters</li>
        <li>Required BNB stake bonded (slashable for spam/manipulation)</li>
        <li>New event perpetual deployed as independent BEP-20 contract</li>
        <li>Market indexed by The Graph subgraph and appears in global listing</li>
        <li>Trading begins immediately with configurable initial liquidity</li>
      </ol>

      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#f0b90b]/90"><code>{`// BscEventPerpFactory.sol
function createEventMarket(
  string calldata title,           // "BTC > $150K by Dec 2026?"
  string calldata description,     // Detailed resolution criteria
  uint256 resolutionTimestamp,     // Unix timestamp for resolution
  OracleType oracleType,           // CHAINLINK or UMA
  bytes calldata oracleParams      // Chainlink feed ID or UMA ancillary data
) external payable returns (address market) {
  require(msg.value >= stakingBond, "Insufficient BNB bond");
  require(resolutionTimestamp > block.timestamp + minDuration, "Too soon");
  
  market = _deployEventPerp(title, description, resolutionTimestamp, oracleType, oracleParams);
  
  stakes[market] = Stake({
    creator: msg.sender,
    amount: msg.value,
    slashed: false
  });
  
  emit MarketCreated(market, msg.sender, title, resolutionTimestamp);
}`}</code></pre>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Anti-Spam & Quality Controls</h3>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Control</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Mechanism</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">Staking Bond</td>
              <td className="p-3">0.5-2 BNB (governance-configurable), slashable for spam</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">Minimum Duration</td>
              <td className="p-3">Resolution must be at least 24 hours in future</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">Rate Limiting</td>
              <td className="p-3">Max 3 markets per wallet per 24 hours</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">Community Flagging</td>
              <td className="p-3">Users can report duplicate/inappropriate markets</td>
            </tr>
            <tr>
              <td className="p-3 text-[#88ccff]">Governance Hide</td>
              <td className="p-3">DAO can hide (not delete) low-quality markets from UI</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Oracle Configuration</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        Market creators must specify resolution oracle:
      </p>
      <ul className="space-y-3 text-[#f0b90b]/80">
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Chainlink:</strong> For objective price-based events (BTC price, ETH price, etc.)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">UMA Optimistic Oracle:</strong> For subjective events (elections, sports, custom)</span>
        </li>
      </ul>
    </>
  );
}

function OracleSection() {
  return (
    <>
      <h2 className="text-xl text-[#f0b90b] border-b border-[#f0b90b]/30 pb-2 mb-6">Oracle Integration & Resolution</h2>
      
      <h3 className="text-[#ff6600] text-lg mb-4">Chainlink on BSC</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        For objective price-based events, Settlr BSC integrates Chainlink Data Feeds on BNB Smart Chain:
      </p>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Feed</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Address (BSC Mainnet)</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Decimals</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">BTC/USD</td>
              <td className="p-3 text-[#88ccff] font-mono text-xs">0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf</td>
              <td className="p-3">8</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">ETH/USD</td>
              <td className="p-3 text-[#88ccff] font-mono text-xs">0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e</td>
              <td className="p-3">8</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">BNB/USD</td>
              <td className="p-3 text-[#88ccff] font-mono text-xs">0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE</td>
              <td className="p-3">8</td>
            </tr>
            <tr>
              <td className="p-3">BUSD/USD</td>
              <td className="p-3 text-[#88ccff] font-mono text-xs">0xcBb98864Ef56E9042e7d2efef76141f15731B82f</td>
              <td className="p-3">8</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#f0b90b]/90"><code>{`// ChainlinkAdapter.sol
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

function resolvePriceEvent(
  address market,
  address priceFeed,
  uint256 targetPrice,
  bool isAbove
) external returns (bool outcome) {
  AggregatorV3Interface feed = AggregatorV3Interface(priceFeed);
  (, int256 price, , uint256 updatedAt, ) = feed.latestRoundData();
  
  require(block.timestamp - updatedAt < 1 hours, "Stale price");
  
  uint256 currentPrice = uint256(price);
  outcome = isAbove ? currentPrice > targetPrice : currentPrice < targetPrice;
  
  IEventPerp(market).settle(outcome ? 1e18 : 0);
  
  emit PriceEventResolved(market, currentPrice, outcome);
}`}</code></pre>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">UMA Optimistic Oracle (V3)</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        For subjective events (elections, sports, custom outcomes), Settlr BSC uses UMA's Optimistic Oracle deployed on BSC:
      </p>
      <ul className="space-y-3 text-[#f0b90b]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Assertion:</strong> Custom identifier + detailed ancillary data describing resolution criteria</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Proposer:</strong> Protocol-operated bot submits bonded outcome post-event</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Liveness Window:</strong> 2 hours default (configurable per market)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Dispute Escalation:</strong> UMA tokenholder vote via Data Verification Mechanism (DVM)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Bond:</strong> 500 BUSD default (slashed if disputed and loses)</span>
        </li>
      </ul>

      <h3 className="text-[#ff6600] text-lg mb-4">Resolution Flow</h3>
      <ol className="space-y-2 text-[#f0b90b]/80 list-decimal list-inside mb-8">
        <li>Event timestamp passed - resolution bot queries defined data sources</li>
        <li>Bot calls <code className="text-[#ff6600]">proposeOutcome()</code> with BUSD bond</li>
        <li>2-hour liveness window begins for community verification</li>
        <li>If disputed: Escalates to UMA DVM for tokenholder vote (48-72 hours)</li>
        <li>If undisputed: Settlement price forced to $1 (YES) or $0 (NO)</li>
        <li>All open positions closed at settlement price automatically</li>
        <li>Insurance fund covers any residual shortfall from liquidations</li>
      </ol>

      <h3 className="text-[#ff6600] text-lg mb-4">Oracle Addresses (BSC)</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Contract</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Address (BSC Mainnet)</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">UMA Optimistic Oracle V3</td>
              <td className="p-3 text-[#88ccff] font-mono text-xs">0x... (Deployed on BSC)</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Chainlink Registry</td>
              <td className="p-3 text-[#88ccff] font-mono text-xs">0x... (BSC Feed Registry)</td>
            </tr>
            <tr>
              <td className="p-3">SettlrOracleAdapter</td>
              <td className="p-3 text-[#88ccff] font-mono text-xs">0x... (TBD)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function EarnSection() {
  return (
    <>
      <h2 className="text-xl text-[#f0b90b] border-b border-[#f0b90b]/30 pb-2 mb-6">Earn Program & STLR Token</h2>
      
      <h3 className="text-[#ff6600] text-lg mb-4">Pre-Launch Points System</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        Users earn STLR points (1:1 claimable at TGE) via various on-chain and off-chain activities:
      </p>
      
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Action</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Points Reward</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Follow @settlrtrade on X</td>
              <td className="p-3 text-[#88ccff]">+1,000 (once)</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Join t.me/settlrtrade</td>
              <td className="p-3 text-[#88ccff]">+1,000 (once)</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">First paper trade on BSC</td>
              <td className="p-3 text-[#88ccff]">+500 (once)</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Weekly PnL Challenge</td>
              <td className="p-3 text-[#88ccff]">+500 per +$10k paper profit (tiered)</td>
            </tr>
            <tr>
              <td className="p-3">Referral Program</td>
              <td className="p-3 text-[#88ccff]">10% of referee's earned points</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Paper Trading on BSC</h3>
      <ul className="space-y-3 text-[#f0b90b]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span>Fixed $10,000 starting mock BUSD balance per wallet</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span>No real deposits or withdrawals required</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span>Full order execution simulation with realistic PnL tracking</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span>Connect any BSC-compatible wallet (MetaMask, Trust Wallet, etc.)</span>
        </li>
      </ul>

      <h3 className="text-[#ff6600] text-lg mb-4">Weekly Challenge Reset</h3>
      <ul className="space-y-3 text-[#f0b90b]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span>PnL counter resets every Monday 00:00 UTC</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span>Only positive gains count toward point thresholds</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span>Tiered rewards with diminishing returns per $10k bracket</span>
        </li>
      </ul>

      <h3 className="text-[#ff6600] text-lg mb-4">STLR Token (BEP-20)</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        STLR will launch as a BEP-20 token on BSC with cross-chain bridge to HyperEVM.
      </p>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        <strong className="text-[#f0b90b]">Total Supply:</strong> <span className="text-[#88ccff]">1,000,000,000 STLR</span> (fixed, no inflation)
      </p>

      <h4 className="text-[#f0b90b] mb-4">Allocation</h4>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Category</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Percentage</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Amount</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Airdrop (Points Conversion)</td>
              <td className="p-3 text-[#88ccff]">90%</td>
              <td className="p-3 text-[#88ccff]">900,000,000</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">Team (4-year vesting)</td>
              <td className="p-3 text-[#88ccff]">5%</td>
              <td className="p-3 text-[#88ccff]">50,000,000</td>
            </tr>
            <tr>
              <td className="p-3">Investors (2-year vesting)</td>
              <td className="p-3 text-[#88ccff]">5%</td>
              <td className="p-3 text-[#88ccff]">50,000,000</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h4 className="text-[#f0b90b] mb-4">Value Accrual Mechanism</h4>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        All trading fees accrue to protocol treasury in BNB/BUSD. Fee revenue allocated:
      </p>
      <ol className="space-y-4 text-[#f0b90b]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ccff] font-bold">1.</span>
          <span>
            <strong className="text-[#f0b90b]">50% Buyback & Burn</strong> - STLR purchased on PancakeSwap and permanently burned.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff] font-bold">2.</span>
          <span>
            <strong className="text-[#f0b90b]">30% Staker Distribution</strong> - STLR purchased and distributed to veSTLR stakers.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff] font-bold">3.</span>
          <span>
            <strong className="text-[#f0b90b]">20% Treasury</strong> - Protocol development, insurance fund, liquidity incentives.
          </span>
        </li>
      </ol>

      <h3 className="text-[#ff6600] text-lg mb-4">Referral Program</h3>
      <ul className="space-y-3 text-[#f0b90b]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Referrer:</strong> Earns 10% of all STLR points earned by referees</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Referee:</strong> Gets 5% bonus on all earned points</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Tracking:</strong> Unique referral codes linked to wallet addresses</span>
        </li>
      </ul>

      <h3 className="text-[#ff6600] text-lg mb-4">TGE Timeline</h3>
      <p className="text-[#f0b90b]/80">
        Scheduled for <span className="text-[#88ccff]">Q1 2026</span>. All earned points converted 1:1 to STLR tokens.
        Initial liquidity provided on PancakeSwap (BSC) with bridge to HyperEVM for cross-platform utility.
      </p>
    </>
  );
}

function SecuritySection() {
  return (
    <>
      <h2 className="text-xl text-[#f0b90b] border-b border-[#f0b90b]/30 pb-2 mb-6">Security Considerations</h2>
      
      <h3 className="text-[#ff6600] text-lg mb-4">Risk Surface</h3>
      <ul className="space-y-3 text-[#f0b90b]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span>Smart contract vulnerabilities (margin logic, factory exploits, reentrancy)</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span>Oracle manipulation / delayed price feed attacks</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span>Front-running via BSC mempool monitoring</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span>Sybil attacks on earn program and referral system</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span>Validator centralization risks (21 PoSA validators)</span>
        </li>
      </ul>

      <h3 className="text-[#ff6600] text-lg mb-4">Mitigations</h3>
      <ul className="space-y-3 text-[#f0b90b]/80 mb-8">
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Formal Audit:</strong> Scheduled Q1 2026 with top-tier security firm</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">BEP-20 Standards:</strong> Full compliance with BSC token standards</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">BscScan Verification:</strong> All contracts verified and open-source</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Multisig Treasury:</strong> 3-of-5 Gnosis Safe for protocol funds</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Dynamic Leverage:</strong> Automatic leverage reduction for risky positions</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Chainlink TWAP:</strong> Time-weighted prices resist flash loan manipulation</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">UMA Bond System:</strong> Economic security for subjective resolutions</span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span><strong className="text-[#f0b90b]">Insurance Fund:</strong> Seeded from fees for liquidation shortfalls</span>
        </li>
      </ul>

      <h3 className="text-[#ff6600] text-lg mb-4">Bug Bounty Program</h3>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Severity</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Bounty Range</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">Critical</td>
              <td className="p-3">$50,000 - $100,000 BUSD</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">High</td>
              <td className="p-3">$10,000 - $50,000 BUSD</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">Medium</td>
              <td className="p-3">$1,000 - $10,000 BUSD</td>
            </tr>
            <tr>
              <td className="p-3 text-[#88ccff]">Low</td>
              <td className="p-3">$100 - $1,000 BUSD</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Contract Verification</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        All Settlr BSC contracts are verified on BscScan with full source code:
      </p>
      <ul className="space-y-3 text-[#f0b90b]/80">
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span>Mainnet: <a href="https://bscscan.com" target="_blank" rel="noopener noreferrer" className="text-[#88ccff] underline">bscscan.com</a></span>
        </li>
        <li className="flex gap-3">
          <span className="text-[#88ccff]">•</span>
          <span>Testnet: <a href="https://testnet.bscscan.com" target="_blank" rel="noopener noreferrer" className="text-[#88ccff] underline">testnet.bscscan.com</a></span>
        </li>
      </ul>
    </>
  );
}

function RoadmapSection() {
  return (
    <>
      <h2 className="text-xl text-[#f0b90b] border-b border-[#f0b90b]/30 pb-2 mb-6">Roadmap</h2>
      
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Phase</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Timeline</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Milestones</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">Phase 1: BSC Testnet</td>
              <td className="p-3">Q4 2025</td>
              <td className="p-3">
                <ul className="list-disc list-inside space-y-1">
                  <li>Deploy contracts to BSC Testnet (Chain ID: 97)</li>
                  <li>Paper trading with mock BUSD</li>
                  <li>STLR points earn program launch</li>
                  <li>Permissionless market creation (testnet)</li>
                </ul>
              </td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">Phase 2: BSC Mainnet</td>
              <td className="p-3">Q1 2026</td>
              <td className="p-3">
                <ul className="list-disc list-inside space-y-1">
                  <li>Mainnet deployment (Chain ID: 56)</li>
                  <li>Full UMA + Chainlink oracle integration</li>
                  <li>STLR TGE and PancakeSwap listing</li>
                  <li>Real BNB/BUSD trading enabled</li>
                  <li>Security audit completion</li>
                </ul>
              </td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">Phase 3: Cross-Chain</td>
              <td className="p-3">Q2 2026</td>
              <td className="p-3">
                <ul className="list-disc list-inside space-y-1">
                  <li>Bridge to HyperEVM (Hyperliquid L1)</li>
                  <li>Cross-chain STLR transfers</li>
                  <li>Unified liquidity pools</li>
                  <li>Multi-chain market creation</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td className="p-3 text-[#88ccff]">Phase 4: Expansion</td>
              <td className="p-3">Q3 2026+</td>
              <td className="p-3">
                <ul className="list-disc list-inside space-y-1">
                  <li>Venus Protocol integration (lending)</li>
                  <li>PancakeSwap LP incentives</li>
                  <li>Mobile app launch</li>
                  <li>Institutional API access</li>
                  <li>Additional chain deployments</li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Cross-Chain Bridge Architecture</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        The BSC-HyperEVM bridge enables seamless asset and position transfer:
      </p>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 overflow-x-auto mb-6">
        <pre className="text-sm text-[#f0b90b]/90"><code>{`BSC (Chain ID: 56)                    HyperEVM (Hyperliquid L1)
┌──────────────────┐                  ┌──────────────────┐
│  BscMarginVault  │                  │  HyperMarginVault │
│  BscComboFactory │   ← Bridge →     │  EventPerpFactory │
│  STLR (BEP-20)   │                  │  STLR (Native)    │
└──────────────────┘                  └──────────────────┘
        │                                      │
        └──────────── LayerZero / ────────────┘
                      Wormhole

Features:
• Lock-and-mint bridge mechanism
• ~15 minute cross-chain finality
• Unified STLR token with native swap
• Position migration (planned Q3 2026)`}</code></pre>
      </div>
    </>
  );
}

function MarketMakerSection() {
  return (
    <>
      <h2 className="text-xl text-[#88ccff] border-b border-[#88ccff]/30 pb-2 mb-6">Market Maker API Documentation</h2>
      
      <h3 className="text-[#ff6600] text-lg mb-4">Authentication</h3>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-4">
        All API calls require an authenticated session from a connected BSC wallet.
      </p>
      <p className="text-[#f0b90b]/80 leading-relaxed mb-8">
        Connect your wallet on <span className="text-[#88ccff]">settlr.finance/bsc</span> first. 
        Sign the authentication message - subsequent API requests use browser session cookies.
      </p>

      <h3 className="text-[#ff6600] text-lg mb-4">Base URL</h3>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 mb-8">
        <code className="text-[#88ccff]">https://settlr.finance/api/bsc/mm</code>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Endpoints</h3>

      <h4 className="text-[#f0b90b] mb-3">1. Get Available Markets</h4>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-3 mb-4">
        <code className="text-[#88ccff]">GET /markets</code>
      </div>
      <p className="text-[#f0b90b]/80 mb-4">Returns list of active BSC markets eligible for quoting.</p>
      <p className="text-[#f0b90b]/60 text-sm mb-2">Response Example:</p>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#f0b90b]/90"><code>{`[
  {
    "id": 1,
    "question": "BTC > $100K by Q1 2026?",
    "category": "Crypto",
    "currentProbability": 0.65,
    "status": "active",
    "chain": "BSC",
    "oracleType": "CHAINLINK"
  },
  {
    "id": 2,
    "question": "BNB > $500 by Dec 2026?",
    "category": "Crypto",
    "currentProbability": 0.32,
    "status": "active",
    "chain": "BSC",
    "oracleType": "CHAINLINK"
  }
]`}</code></pre>
      </div>

      <h4 className="text-[#f0b90b] mb-3">2. Check MM Account Status</h4>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-3 mb-4">
        <code className="text-[#88ccff]">GET /status/{'{wallet-address}'}</code>
      </div>
      <p className="text-[#f0b90b]/80 mb-4">Returns current paper trading account and STLR points.</p>
      <p className="text-[#f0b90b]/60 text-sm mb-2">Response Example:</p>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#f0b90b]/90"><code>{`{
  "exists": true,
  "wallet": "0xAbC...1234",
  "chain": "BSC",
  "balance": 10000,
  "weeklyPnl": 8200,
  "stlrPoints": 1500,
  "referralCode": "SETTLR-ABC123"
}`}</code></pre>
      </div>

      <h4 className="text-[#f0b90b] mb-3">3. Place Order</h4>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-3 mb-4">
        <code className="text-[#88ccff]">POST /order</code>
        <span className="text-[#f0b90b]/60 ml-4">Content-Type: application/json</span>
      </div>
      <p className="text-[#f0b90b]/60 text-sm mb-2">Request Body:</p>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 overflow-x-auto mb-6">
        <pre className="text-sm text-[#f0b90b]/90"><code>{`{
  "wallet": "0xYourBscWalletAddress",
  "marketId": 1,
  "side": "buy",       // "buy" = long YES, "sell" = short NO
  "size": 100,         // BUSD notional (minimum $10)
  "price": 0.65,       // Limit price in probability space (0.01-0.99)
  "type": "postOnly",  // "limit", "postOnly", or "market"
  "leverage": 10       // 1-50x based on market conditions
}`}</code></pre>
      </div>

      <p className="text-[#f0b90b]/60 text-sm mb-2">Parameters:</p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Field</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Type</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Description</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">wallet</td>
              <td className="p-3">string</td>
              <td className="p-3">Connected BSC wallet address</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">marketId</td>
              <td className="p-3">number</td>
              <td className="p-3">From /markets endpoint</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">side</td>
              <td className="p-3">string</td>
              <td className="p-3">"buy" (YES) or "sell" (NO)</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">size</td>
              <td className="p-3">number</td>
              <td className="p-3">BUSD notional size (min $10)</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">price</td>
              <td className="p-3">number</td>
              <td className="p-3">Limit price (0.01-0.99)</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">type</td>
              <td className="p-3">string</td>
              <td className="p-3">"limit", "postOnly", or "market"</td>
            </tr>
            <tr>
              <td className="p-3 text-[#88ccff]">leverage</td>
              <td className="p-3">number</td>
              <td className="p-3">1-50x (dynamic cap based on market)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[#f0b90b]/60 text-sm mb-2">Response Example:</p>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#f0b90b]/90"><code>{`{
  "status": "filled",
  "fillPrice": 0.65,
  "size": 100,
  "leverage": 10,
  "pnl": 5,
  "newBalance": 10005,
  "gasUsed": "120000",
  "txHash": "0xabc...def"
}`}</code></pre>
      </div>

      <h4 className="text-[#f0b90b] mb-3">4. Batch Orders</h4>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-3 mb-4">
        <code className="text-[#88ccff]">POST /orders/batch</code>
      </div>
      <p className="text-[#f0b90b]/80 mb-4">Submit multiple orders in single request for gas efficiency.</p>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#f0b90b]/90"><code>{`{
  "wallet": "0xYourBscWalletAddress",
  "orders": [
    { "marketId": 1, "side": "buy", "size": 50, "price": 0.60, "type": "limit" },
    { "marketId": 1, "side": "sell", "size": 50, "price": 0.70, "type": "limit" },
    { "marketId": 2, "side": "buy", "size": 100, "price": 0.30, "type": "postOnly" }
  ]
}`}</code></pre>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">WebSocket Feed</h3>
      <p className="text-[#f0b90b]/80 mb-4">Real-time market data via WebSocket connection:</p>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 mb-8">
        <code className="text-[#88ccff]">wss://settlr.finance/ws/bsc</code>
      </div>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#f0b90b]/90"><code>{`// Subscribe to orderbook
{ "op": "subscribe", "channel": "orderbook", "marketId": 1 }

// Subscribe to trades
{ "op": "subscribe", "channel": "trades", "marketId": 1 }

// Subscribe to positions (requires auth)
{ "op": "subscribe", "channel": "positions", "wallet": "0x..." }`}</code></pre>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Rate Limits</h3>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Endpoint</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Limit</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">POST /order</td>
              <td className="p-3 text-[#88ccff]">60 requests per minute per wallet</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">POST /orders/batch</td>
              <td className="p-3 text-[#88ccff]">20 requests per minute (max 10 orders each)</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3">GET /markets</td>
              <td className="p-3 text-[#88ccff]">100 requests per minute</td>
            </tr>
            <tr>
              <td className="p-3">WebSocket</td>
              <td className="p-3 text-[#88ccff]">50 messages per second</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Error Codes</h3>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border border-[#f0b90b]/30">
          <thead>
            <tr className="bg-[#f0b90b]/10">
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Code</th>
              <th className="text-left p-3 text-[#f0b90b] border-b border-[#f0b90b]/30">Description</th>
            </tr>
          </thead>
          <tbody className="text-[#f0b90b]/80">
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">INSUFFICIENT_BALANCE</td>
              <td className="p-3">Account balance too low for order size</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">INVALID_LEVERAGE</td>
              <td className="p-3">Requested leverage exceeds market cap</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">MARKET_CLOSED</td>
              <td className="p-3">Market resolved or suspended</td>
            </tr>
            <tr className="border-b border-[#f0b90b]/10">
              <td className="p-3 text-[#88ccff]">RATE_LIMITED</td>
              <td className="p-3">Too many requests, slow down</td>
            </tr>
            <tr>
              <td className="p-3 text-[#88ccff]">INVALID_SIGNATURE</td>
              <td className="p-3">Wallet authentication failed</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">SDK & Examples</h3>
      <p className="text-[#f0b90b]/80 mb-4">
        TypeScript SDK and example bots available on GitHub:
      </p>
      <div className="bg-[#111] border border-[#f0b90b]/30 p-4 overflow-x-auto mb-8">
        <pre className="text-sm text-[#f0b90b]/90"><code>{`// Install SDK
npm install @settlr/bsc-sdk

// Basic usage
import { SettlrBscClient } from '@settlr/bsc-sdk';

const client = new SettlrBscClient({
  rpcUrl: 'https://bsc-dataseed.binance.org/',
  privateKey: process.env.PRIVATE_KEY
});

// Place market maker quotes
await client.placeOrder({
  marketId: 1,
  side: 'buy',
  size: 100,
  price: 0.60,
  type: 'postOnly'
});`}</code></pre>
      </div>

      <h3 className="text-[#ff6600] text-lg mb-4">Paper Trading Note</h3>
      <p className="text-[#f0b90b]/80 mb-4">
        All trading is currently in <span className="text-[#88ccff]">paper mode</span> (simulated $10,000 starting balance).
      </p>
      <p className="text-[#f0b90b]/80">
        Mainnet launch with real BNB/BUSD trading scheduled for <span className="text-[#88ccff]">Q1 2026</span>.
      </p>
    </>
  );
}

export default function BscDocs() {
  const [activeSection, setActiveSection] = useState("introduction");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    setMobileMenuOpen(false);
  };

  const renderSection = () => {
    switch (activeSection) {
      case "introduction":
        return <IntroductionSection />;
      case "architecture":
        return <ArchitectureSection />;
      case "trading":
        return <TradingSection />;
      case "ordertypes":
        return <OrderTypesSection />;
      case "combos":
        return <CombosSection />;
      case "permissionless":
        return <PermissionlessSection />;
      case "oracle":
        return <OracleSection />;
      case "earn":
        return <EarnSection />;
      case "security":
        return <SecuritySection />;
      case "roadmap":
        return <RoadmapSection />;
      case "mm":
        return <MarketMakerSection />;
      default:
        return <IntroductionSection />;
    }
  };

  const currentIndex = sections.findIndex((s) => s.id === activeSection);
  const prevSection = currentIndex > 0 ? sections[currentIndex - 1] : null;
  const nextSection = currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-black font-mono">
      <BscNavbar />

      <div className="md:hidden border-b border-[#f0b90b]/20 bg-black sticky top-14 z-40">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center justify-between w-full px-4 py-3 text-[#f0b90b]"
          data-testid="button-mobile-docs-menu"
        >
          <span className="text-sm">
            {sections.find((s) => s.id === activeSection)?.title || "Documentation"}
          </span>
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-black border-b border-[#f0b90b]/20 max-h-[60vh] overflow-y-auto">
            <nav className="p-4 space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                    activeSection === section.id
                      ? section.highlight
                        ? "text-[#88ccff] bg-[#88ccff]/10"
                        : "text-[#f0b90b] bg-[#f0b90b]/10"
                      : section.highlight
                      ? "text-[#88ccff]/60 hover:text-[#88ccff]"
                      : "text-[#f0b90b]/50 hover:text-[#f0b90b]"
                  }`}
                  data-testid={`mobile-docs-nav-${section.id}`}
                >
                  {section.highlight && <span className="mr-2">[NEW]</span>}
                  {section.title}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>

      <div className="flex max-w-7xl mx-auto">
        <aside className="hidden md:block w-64 shrink-0 border-r border-[#f0b90b]/20 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <nav className="p-6 space-y-1">
            <div className="mb-6">
              <Link href="/bsc">
                <span className="text-[#f0b90b]/60 hover:text-[#f0b90b] text-sm flex items-center gap-2 cursor-pointer" data-testid="link-back-to-bsc">
                  <ChevronLeft className="w-4 h-4" />
                  Back to BSC Markets
                </span>
              </Link>
            </div>
            <h3 className="text-[#f0b90b] text-sm font-bold mb-4">DOCUMENTATION</h3>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                  activeSection === section.id
                    ? section.highlight
                      ? "text-[#88ccff] bg-[#88ccff]/10 border-l-2 border-[#88ccff]"
                      : "text-[#f0b90b] bg-[#f0b90b]/10 border-l-2 border-[#f0b90b]"
                    : section.highlight
                    ? "text-[#88ccff]/60 hover:text-[#88ccff] hover:bg-[#88ccff]/5"
                    : "text-[#f0b90b]/50 hover:text-[#f0b90b] hover:bg-[#f0b90b]/5"
                }`}
                data-testid={`docs-nav-${section.id}`}
              >
                {section.highlight && <span className="mr-1">[NEW]</span>}
                {section.title}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="p-6 md:p-12">
            <div className="max-w-3xl">
              {renderSection()}

              <div className="flex justify-between items-center mt-12 pt-8 border-t border-[#f0b90b]/20">
                {prevSection ? (
                  <button
                    onClick={() => handleSectionClick(prevSection.id)}
                    className="flex items-center gap-2 text-[#f0b90b]/60 hover:text-[#f0b90b] transition-colors"
                    data-testid="button-prev-section"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-sm">{prevSection.title}</span>
                  </button>
                ) : (
                  <div />
                )}
                {nextSection && (
                  <button
                    onClick={() => handleSectionClick(nextSection.id)}
                    className="flex items-center gap-2 text-[#f0b90b]/60 hover:text-[#f0b90b] transition-colors"
                    data-testid="button-next-section"
                  >
                    <span className="text-sm">{nextSection.title}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}
