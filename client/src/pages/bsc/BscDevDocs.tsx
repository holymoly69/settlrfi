import { useState } from "react";
import { BscNavbar } from "@/components/bsc/BscNavbar";
import { Footer } from "@/components/Footer";
import { Link } from "wouter";
import { Lock, Unlock, Copy, Check, ExternalLink } from "lucide-react";

const BSC_CONTRACTS = {
  mainnet: {
    chainId: 56,
    chainName: "BNB Smart Chain Mainnet",
    rpcUrl: "https://bsc-dataseed.binance.org/",
    explorer: "https://bscscan.com",
    contracts: {
      vault: "0x0000000000000000000000000000000000000000",
      marketFactory: "0x0000000000000000000000000000000000000000",
      positionManager: "0x0000000000000000000000000000000000000000",
      oracle: "0x0000000000000000000000000000000000000000",
      stlrToken: "0x0000000000000000000000000000000000000000",
    },
    status: "pending_deployment",
  },
  testnet: {
    chainId: 97,
    chainName: "BNB Smart Chain Testnet",
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
    explorer: "https://testnet.bscscan.com",
    contracts: {
      vault: "0x0000000000000000000000000000000000000000",
      marketFactory: "0x0000000000000000000000000000000000000000",
      positionManager: "0x0000000000000000000000000000000000000000",
      oracle: "0x0000000000000000000000000000000000000000",
      stlrToken: "0x0000000000000000000000000000000000000000",
    },
    status: "pending_deployment",
  },
};

const CONTRACT_ABIS = {
  vault: {
    name: "SettlrVault",
    description: "Handles BNB/BUSD deposits and withdrawals",
    functions: [
      "deposit(uint256 amount)",
      "withdraw(uint256 amount)",
      "getBalance(address user) view returns (uint256)",
      "getTotalDeposits() view returns (uint256)",
    ],
  },
  marketFactory: {
    name: "MarketFactory",
    description: "Creates and manages prediction markets",
    functions: [
      "createMarket(string question, uint256 resolutionDate, bytes32 oracleId)",
      "resolveMarket(uint256 marketId, bool outcome)",
      "getMarket(uint256 marketId) view returns (Market)",
      "getActiveMarkets() view returns (uint256[])",
    ],
  },
  positionManager: {
    name: "PositionManager",
    description: "Manages leveraged positions and liquidations",
    functions: [
      "openPosition(uint256 marketId, bool side, uint256 size, uint256 leverage)",
      "closePosition(uint256 positionId)",
      "liquidatePosition(uint256 positionId)",
      "getPosition(uint256 positionId) view returns (Position)",
    ],
  },
  oracle: {
    name: "SettlrOracle",
    description: "Chainlink/UMA oracle integration for market resolution",
    functions: [
      "requestResolution(bytes32 questionId)",
      "fulfillResolution(bytes32 requestId, bool outcome)",
      "getLatestAnswer(bytes32 questionId) view returns (bool, uint256)",
    ],
  },
};

function ContractCard({ name, address, explorer, abi }: { 
  name: string; 
  address: string; 
  explorer: string;
  abi: typeof CONTRACT_ABIS.vault;
}) {
  const [copied, setCopied] = useState(false);
  
  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDeployed = address !== "0x0000000000000000000000000000000000000000";

  return (
    <div 
      className="p-4 font-mono"
      style={{ 
        backgroundColor: '#0a0a0a',
        border: '1px solid #f0b90b'
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold" style={{ color: '#f0b90b' }}>{abi.name}</h3>
          <p className="text-xs mt-1" style={{ color: '#888888' }}>{abi.description}</p>
        </div>
        <span 
          className="text-[10px] px-2 py-0.5"
          style={{ 
            backgroundColor: isDeployed ? '#00ff88' : '#ff6600',
            color: '#000000'
          }}
        >
          {isDeployed ? 'DEPLOYED' : 'PENDING'}
        </span>
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <code 
          className="text-xs flex-1 px-2 py-1 truncate"
          style={{ backgroundColor: '#1a1a1a', color: '#888888' }}
        >
          {address}
        </code>
        <button 
          onClick={copyAddress}
          className="p-1.5 transition-colors"
          style={{ color: copied ? '#00ff88' : '#f0b90b' }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
        {isDeployed && (
          <a 
            href={`${explorer}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5"
            style={{ color: '#f0b90b' }}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      
      <div>
        <div className="text-[10px] mb-2" style={{ color: '#666666' }}>FUNCTIONS:</div>
        <div className="space-y-1">
          {abi.functions.map((fn, i) => (
            <code 
              key={i}
              className="block text-[10px] px-2 py-1"
              style={{ backgroundColor: '#1a1a1a', color: '#cc66ff' }}
            >
              {fn}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BscDevDocs() {
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<"testnet" | "mainnet">("testnet");

  const handleUnlock = async () => {
    try {
      const response = await fetch("/api/verify-dev-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      
      if (response.ok) {
        setIsUnlocked(true);
        setError("");
      } else {
        setError("Invalid passcode");
      }
    } catch {
      setError("Verification failed");
    }
  };

  const network = BSC_CONTRACTS[selectedNetwork];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <BscNavbar />
      
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link href="/bsc">
            <span className="text-sm font-mono cursor-pointer" style={{ color: '#f0b90b' }}>
              &lt; Back to Markets
            </span>
          </Link>
        </div>

        {!isUnlocked ? (
          <div className="max-w-md mx-auto text-center">
            <div 
              className="p-8 font-mono"
              style={{ 
                backgroundColor: '#0a0a0a',
                border: '1px solid #f0b90b'
              }}
            >
              <Lock className="h-12 w-12 mx-auto mb-4" style={{ color: '#f0b90b' }} />
              <h1 className="text-xl font-bold mb-2" style={{ color: '#f0b90b' }}>
                Developer Access
              </h1>
              <p className="text-sm mb-6" style={{ color: '#888888' }}>
                Enter passcode to view BSC contract documentation
              </p>
              
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                placeholder="Enter passcode"
                className="w-full px-4 py-3 mb-4 font-mono text-center"
                style={{ 
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333333',
                  color: '#ffffff'
                }}
                data-testid="input-dev-password"
              />
              
              {error && (
                <p className="text-sm mb-4" style={{ color: '#ff4444' }}>{error}</p>
              )}
              
              <button
                onClick={handleUnlock}
                className="w-full px-6 py-3 font-mono transition-all"
                style={{ 
                  backgroundColor: '#f0b90b',
                  color: '#000000'
                }}
                data-testid="button-unlock"
              >
                Unlock
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-8">
              <Unlock className="h-6 w-6" style={{ color: '#00ff88' }} />
              <h1 className="text-2xl font-bold font-mono" style={{ color: '#f0b90b' }}>
                BSC Contract Documentation
              </h1>
            </div>

            <div className="flex gap-2 mb-8">
              <button
                onClick={() => setSelectedNetwork("testnet")}
                className="px-4 py-2 font-mono text-sm transition-all"
                style={{ 
                  backgroundColor: selectedNetwork === "testnet" ? '#f0b90b' : '#1a1a1a',
                  color: selectedNetwork === "testnet" ? '#000000' : '#f0b90b',
                  border: '1px solid #f0b90b'
                }}
              >
                Testnet (Chain ID: 97)
              </button>
              <button
                onClick={() => setSelectedNetwork("mainnet")}
                className="px-4 py-2 font-mono text-sm transition-all"
                style={{ 
                  backgroundColor: selectedNetwork === "mainnet" ? '#f0b90b' : '#1a1a1a',
                  color: selectedNetwork === "mainnet" ? '#000000' : '#f0b90b',
                  border: '1px solid #f0b90b'
                }}
              >
                Mainnet (Chain ID: 56)
              </button>
            </div>

            <div 
              className="p-4 mb-8 font-mono"
              style={{ 
                backgroundColor: '#0a0a0a',
                border: '1px solid #333333'
              }}
            >
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span style={{ color: '#666666' }}>Network:</span>{" "}
                  <span style={{ color: '#f0b90b' }}>{network.chainName}</span>
                </div>
                <div>
                  <span style={{ color: '#666666' }}>Chain ID:</span>{" "}
                  <span style={{ color: '#f0b90b' }}>{network.chainId}</span>
                </div>
                <div>
                  <span style={{ color: '#666666' }}>RPC:</span>{" "}
                  <span style={{ color: '#888888' }}>{network.rpcUrl}</span>
                </div>
                <div>
                  <span style={{ color: '#666666' }}>Explorer:</span>{" "}
                  <a 
                    href={network.explorer} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#f0b90b' }}
                  >
                    {network.explorer}
                  </a>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              {Object.entries(network.contracts).map(([key, address]) => (
                <ContractCard
                  key={key}
                  name={key}
                  address={address}
                  explorer={network.explorer}
                  abi={CONTRACT_ABIS[key as keyof typeof CONTRACT_ABIS] || CONTRACT_ABIS.vault}
                />
              ))}
            </div>

            <div 
              className="mt-8 p-4 font-mono text-sm"
              style={{ 
                backgroundColor: '#1a1a1a',
                border: '1px solid #ff6600'
              }}
            >
              <div className="flex items-start gap-2">
                <span style={{ color: '#ff6600' }}>[!]</span>
                <div style={{ color: '#888888' }}>
                  <p className="mb-2">
                    <strong style={{ color: '#ff6600' }}>Note:</strong> All contracts are pending deployment.
                  </p>
                  <p>
                    Contract addresses will be updated once BSC mainnet/testnet deployment is complete.
                    Check back for updates or contact the team on Discord.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
