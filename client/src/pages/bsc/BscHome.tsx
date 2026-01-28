import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useMarkets, usePositions } from "@/hooks/use-markets";
import { useMarketStream } from "@/hooks/use-market-stream";
import { useBscAuth } from "@/hooks/use-bsc-auth";
import { BscNavbar } from "@/components/bsc/BscNavbar";
import { Footer } from "@/components/Footer";
import { CreateMarketModal } from "@/components/CreateMarketModal";
import { Search, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface BscMarket {
  id: number;
  question: string;
  description: string;
  imageUrl: string | null;
  resolutionDate: string | Date;
  category: string;
  currentProbability: number;
  volume24h: number;
  status: string;
  creator: string | null;
  isPermissionless: boolean;
  createdAt: string | Date;
  resolved: boolean | null;
  outcome: boolean | null;
  resolvedAt: string | Date | null;
}

function BscMarketCard({ market, livePrice }: { market: BscMarket; livePrice?: number }) {
  const probability = livePrice ?? market.currentProbability;
  const isYesFavorite = probability > 50;
  const isBscMarket = market.category === "BSC";
  
  const formatVolume = (vol: number) => {
    if (vol >= 1_000_000_000) return `$${(vol / 1_000_000_000).toFixed(1)}B`;
    if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(0)}M`;
    if (vol >= 1_000) return `$${(vol / 1_000).toFixed(0)}K`;
    return `$${vol.toLocaleString()}`;
  };

  return (
    <div 
      className="h-full p-4 font-mono transition-all hover:scale-[1.02]"
      style={{ 
        backgroundColor: '#0a0a0a',
        border: isBscMarket ? '2px solid #f0b90b' : '1px solid #333333'
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span 
          className="text-[10px] px-2 py-0.5 uppercase tracking-wider"
          style={{ 
            backgroundColor: isBscMarket ? '#f0b90b' : '#1a1a1a',
            color: isBscMarket ? '#000000' : '#888888',
            border: isBscMarket ? 'none' : '1px solid #333333'
          }}
        >
          {market.category}
        </span>
        <div className="flex items-center gap-1 text-[10px]" style={{ color: '#666666' }}>
          <Clock className="h-3 w-3" />
          {format(new Date(market.resolutionDate), "MMM yyyy")}
        </div>
      </div>
      
      <h3 
        className="font-medium mb-4 line-clamp-2 text-sm leading-tight"
        style={{ color: '#ffffff' }}
      >
        {market.question}
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isYesFavorite ? (
              <TrendingUp className="h-4 w-4" style={{ color: '#00ff88' }} />
            ) : (
              <TrendingDown className="h-4 w-4" style={{ color: '#ff4444' }} />
            )}
            <span 
              className="text-2xl font-bold"
              style={{ color: isYesFavorite ? '#00ff88' : '#ff4444' }}
            >
              {probability.toFixed(1)}%
            </span>
          </div>
          <div className="text-right">
            <div className="text-[10px]" style={{ color: '#666666' }}>24h Vol</div>
            <div className="text-xs font-medium" style={{ color: '#f0b90b' }}>
              {formatVolume(market.volume24h)}
            </div>
          </div>
        </div>
        
        <div 
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <div 
            className="h-full transition-all duration-500"
            style={{ 
              width: `${probability}%`,
              backgroundColor: isYesFavorite ? '#00ff88' : '#ff4444'
            }}
          />
        </div>
        
        <div className="flex justify-between text-[10px]" style={{ color: '#666666' }}>
          <span>YES {probability.toFixed(0)}%</span>
          <span>NO {(100 - probability).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

const BUILD_VERSION = "v1.0.0-bsc";

const BSC_ECOSYSTEM_MARKETS = [
  {
    id: 10001,
    question: "BNB > $1000 by 2026?",
    description: "Will BNB trade above $1,000 USD on any major exchange before Jan 1, 2026?",
    imageUrl: null,
    resolutionDate: "2026-01-01T00:00:00.000Z",
    category: "BSC",
    currentProbability: 42.5,
    volume24h: 890000000,
    status: "active",
    creator: null,
    isPermissionless: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    resolved: false,
    outcome: null,
    resolvedAt: null,
  },
  {
    id: 10002,
    question: "PancakeSwap TVL > $10B by 2026?",
    description: "Will PancakeSwap total value locked exceed $10 billion before 2026?",
    imageUrl: null,
    resolutionDate: "2026-01-01T00:00:00.000Z",
    category: "BSC",
    currentProbability: 38.7,
    volume24h: 450000000,
    status: "active",
    creator: null,
    isPermissionless: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    resolved: false,
    outcome: null,
    resolvedAt: null,
  },
  {
    id: 10003,
    question: "Venus Protocol becomes #1 BSC lending?",
    description: "Will Venus Protocol become the largest lending protocol on BSC by TVL in 2026?",
    imageUrl: null,
    resolutionDate: "2026-12-31T00:00:00.000Z",
    category: "BSC",
    currentProbability: 55.2,
    volume24h: 320000000,
    status: "active",
    creator: null,
    isPermissionless: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    resolved: false,
    outcome: null,
    resolvedAt: null,
  },
  {
    id: 10004,
    question: "Binance burns 50M+ BNB by 2027?",
    description: "Will Binance cumulative BNB burns exceed 50 million tokens before 2027?",
    imageUrl: null,
    resolutionDate: "2027-01-01T00:00:00.000Z",
    category: "BSC",
    currentProbability: 67.8,
    volume24h: 275000000,
    status: "active",
    creator: null,
    isPermissionless: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    resolved: false,
    outcome: null,
    resolvedAt: null,
  },
  {
    id: 10005,
    question: "BSC daily transactions > Ethereum?",
    description: "Will BSC average daily transactions exceed Ethereum mainnet in 2026?",
    imageUrl: null,
    resolutionDate: "2026-12-31T00:00:00.000Z",
    category: "BSC",
    currentProbability: 71.3,
    volume24h: 198000000,
    status: "active",
    creator: null,
    isPermissionless: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    resolved: false,
    outcome: null,
    resolvedAt: null,
  },
  {
    id: 10006,
    question: "opBNB reaches 10k TPS?",
    description: "Will opBNB Layer 2 achieve 10,000 transactions per second before 2027?",
    imageUrl: null,
    resolutionDate: "2027-01-01T00:00:00.000Z",
    category: "BSC",
    currentProbability: 48.9,
    volume24h: 156000000,
    status: "active",
    creator: null,
    isPermissionless: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    resolved: false,
    outcome: null,
    resolvedAt: null,
  },
  {
    id: 10007,
    question: "BNB Greenfield hits 1M users?",
    description: "Will BNB Greenfield decentralized storage reach 1 million users before 2027?",
    imageUrl: null,
    resolutionDate: "2027-01-01T00:00:00.000Z",
    category: "BSC",
    currentProbability: 35.6,
    volume24h: 124000000,
    status: "active",
    creator: null,
    isPermissionless: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    resolved: false,
    outcome: null,
    resolvedAt: null,
  },
  {
    id: 10008,
    question: "CZ returns as Binance CEO?",
    description: "Will Changpeng Zhao return as Binance CEO before 2028?",
    imageUrl: null,
    resolutionDate: "2028-01-01T00:00:00.000Z",
    category: "BSC",
    currentProbability: 22.4,
    volume24h: 89000000,
    status: "active",
    creator: null,
    isPermissionless: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    resolved: false,
    outcome: null,
    resolvedAt: null,
  },
];

interface StatsData {
  daily: { volume: number; volumeBillions: number; trades: number };
  allTime: { volume: number; volumeBillions: number; trades: number };
}

function formatVolume(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  return `$${value.toLocaleString()}`;
}

function AnimatedCounter({ value, isVolume = false }: { value: number; isVolume?: boolean }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const duration = 1500;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  if (isVolume) {
    return <span>{formatVolume(count)}</span>;
  }
  return <span>{count.toLocaleString()}</span>;
}

export default function BscHome() {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: markets, isLoading, error } = useMarkets();
  const { getMarketPrice } = useMarketStream();
  const { isAuthenticated, user } = useBscAuth();
  const { data: positions } = usePositions();
  const openPositions = positions?.filter((p) => p.status === "open") || [];
  
  const { data: stats } = useQuery<StatsData>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000,
  });

  const allMarkets = [...BSC_ECOSYSTEM_MARKETS, ...(markets || [])];
  
  const filteredMarkets = allMarkets.filter(m => {
    const matchesCategory = filter === "all" || m.category.toLowerCase() === filter.toLowerCase();
    const matchesSearch = !searchQuery || 
      m.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ["All", "BSC", ...Array.from(new Set(markets?.map(m => m.category) || [])).filter(c => c !== "BSC").sort()];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <BscNavbar />
      
      {isAuthenticated && openPositions.length > 0 && (
        <section 
          className="px-4 sm:px-6 lg:px-8 py-3"
          style={{ backgroundColor: '#000000', borderBottom: '1px solid #f0b90b' }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#f0b90b' }} />
                <p className="text-sm font-medium font-mono" style={{ color: '#f0b90b' }} data-testid="text-open-positions-count">
                  <span style={{ color: '#f0b90b' }}>{openPositions.length}</span> open {openPositions.length === 1 ? "position" : "positions"}
                </p>
              </div>
              <Link href="/bsc/portfolio">
                <button 
                  className="px-4 py-2 text-sm font-mono transition-all"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#f0b90b',
                    border: '1px solid #f0b90b'
                  }}
                  data-testid="button-view-positions"
                >
                  View Portfolio
                </button>
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="px-4 sm:px-6 lg:px-8 py-6" style={{ background: '#000000' }}>
        <div className="max-w-5xl mx-auto text-center font-mono text-sm">
          <p className="text-sm mb-3" style={{ color: '#f0b90b', opacity: 0.8 }}>
            Leveraged Event Contracts on BNB Smart Chain
          </p>
          <div className="text-xs mb-2" style={{ color: '#444444' }}>
            ────────────────────────────────────────────────────────────
          </div>
          <div className="space-y-1" style={{ color: '#f0b90b' }}>
            <div data-testid="stat-total-volume">
              Total Volume: ${stats?.allTime.volumeBillions?.toFixed(2) || "0.00"}B
            </div>
            <div data-testid="stat-daily-trades">
              24h Trades: <AnimatedCounter value={stats?.daily.trades || 0} />
            </div>
            <div data-testid="stat-markets">
              Markets: <AnimatedCounter value={markets?.length || 0} />
            </div>
          </div>
          <div className="text-xs mt-2" style={{ color: '#444444' }}>
            ────────────────────────────────────────────────────────────
          </div>
          <div className="text-xs mt-3" style={{ color: '#ff6600' }} data-testid="text-disclaimer">
            [!] testnet: paper trading with simulated data [{BUILD_VERSION}]
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 py-4" style={{ background: '#000000' }}>
        <div className="max-w-5xl mx-auto">
          <div 
            className="p-4 font-mono text-center"
            style={{ 
              backgroundColor: 'transparent',
              border: '1px solid #cc66ff'
            }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <span className="text-sm" style={{ color: '#cc66ff' }}>
                Create your own permissionless prediction market
              </span>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 text-sm font-mono transition-all"
                style={{
                  backgroundColor: '#cc66ff',
                  color: '#000000',
                  border: '1px solid #cc66ff'
                }}
                data-testid="button-create-market-cta"
              >
                Create Market
              </button>
            </div>
          </div>
        </div>
      </section>

      <CreateMarketModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        walletAddress={user?.walletAddress}
      />

      <main id="markets" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              placeholder="Search markets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 h-11 font-mono bg-black border text-sm"
              style={{ borderColor: '#f0b90b', color: '#f0b90b' }}
              data-testid="input-search-markets"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide items-center">
            <span className="text-xs font-mono flex-shrink-0" style={{ color: '#444444' }}>FILTER:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat.toLowerCase())}
                data-testid={`filter-${cat.toLowerCase()}`}
                className="px-4 py-2 text-sm font-mono transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  backgroundColor: filter === cat.toLowerCase() ? '#f0b90b' : '#000000',
                  color: filter === cat.toLowerCase() ? '#000000' : '#f0b90b',
                  border: '1px solid #f0b90b'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i} 
                className="h-64 animate-pulse"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #f0b90b' }}
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-destructive">Failed to load markets. Please try again.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarkets?.map((market, i) => (
              <motion.div
                key={market.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Link href={`/bsc/market/${market.id}`}>
                  <div className="cursor-pointer">
                    <BscMarketCard market={market} livePrice={getMarketPrice(market.id)} />
                  </div>
                </Link>
              </motion.div>
            ))}
            
            {filteredMarkets?.length === 0 && (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                No markets found.
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
