import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useMarkets, usePositions } from "@/hooks/use-markets";
import { useMarketStream } from "@/hooks/use-market-stream";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MarketCard } from "@/components/MarketCard";
import { CreateMarketModal } from "@/components/CreateMarketModal";
import { 
  ChevronLeft, 
  ChevronRight, 
  Flame
} from "lucide-react";
import { motion } from "framer-motion";

const BUILD_VERSION = "v2.0.7";

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

const categorySymbols: Record<string, string> = {
  "Politics": "[VOTE]",
  "Crypto": "[$BTC]",
  "Tech": "[</>]",
  "Space": "[>*<]",
  "Sports": "[MVP]",
  "Entertainment": "[>>>]",
  "Gaming": "[GG!]",
  "World": "[WWW]",
  "Culture": "[$$$]",
  "Exotic Bet": "[!!!]",
};

const categoryDisplayNames: Record<string, string> = {
  "Exotic Bet": "Exotic",
};

function getCategorySymbol(category: string): string {
  return categorySymbols[category] || "[???]";
}

function getCategoryDisplayName(category: string): string {
  return categoryDisplayNames[category] || category;
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: markets, isLoading, error } = useMarkets();
  const { getMarketPrice } = useMarketStream();
  const { isAuthenticated, user } = useAuth();
  const { data: positions } = usePositions();
  const openPositions = positions?.filter((p) => p.status === "open") || [];
  
  const carouselRef = useRef<HTMLDivElement>(null);
  const categoryMarketsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  
  const { data: stats } = useQuery<StatsData>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000,
  });

  const hotMarkets = markets
    ?.slice()
    .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))
    .slice(0, 10) || [];

  const categories = Array.from(new Set(markets?.map(m => m.category) || [])).sort();

  const categoryMarkets = selectedCategory 
    ? markets?.filter(m => m.category === selectedCategory) || []
    : [];

  useEffect(() => {
    if (selectedCategory && categoryMarkets.length > 0 && categoryMarketsRef.current) {
      setTimeout(() => {
        categoryMarketsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedCategory, categoryMarkets.length]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || hotMarkets.length === 0) return;

    const autoScroll = setInterval(() => {
      const maxScroll = carousel.scrollWidth - carousel.clientWidth;
      if (carousel.scrollLeft >= maxScroll - 10) {
        carousel.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        carousel.scrollBy({ left: 320, behavior: 'smooth' });
      }
    }, 4000);

    return () => clearInterval(autoScroll);
  }, [hotMarkets.length]);

  const updateScrollButtons = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    setCanScrollLeft(carousel.scrollLeft > 0);
    setCanScrollRight(carousel.scrollLeft < carousel.scrollWidth - carousel.clientWidth - 10);
  };

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.addEventListener('scroll', updateScrollButtons);
    updateScrollButtons();
    return () => carousel.removeEventListener('scroll', updateScrollButtons);
  }, [hotMarkets.length]);

  const scrollCarousel = (direction: 'left' | 'right') => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const scrollAmount = direction === 'left' ? -320 : 320;
    carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      {/* Open Positions Alert */}
      {isAuthenticated && openPositions.length > 0 && (
        <section 
          className="px-4 sm:px-6 lg:px-8 py-3"
          style={{ backgroundColor: '#000000', borderBottom: '1px solid #66ff66' }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="live-dot" />
                <p className="text-sm font-medium font-mono" style={{ color: '#66ff66' }} data-testid="text-open-positions-count">
                  <span style={{ color: '#66ff66' }}>{openPositions.length}</span> open {openPositions.length === 1 ? "position" : "positions"}
                </p>
              </div>
              <Link href="/portfolio">
                <button 
                  className="terminal-btn text-sm"
                  data-testid="button-view-positions"
                >
                  View Portfolio
                </button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Hero Section - compact */}
      <section className="px-4 sm:px-6 lg:px-8 py-6" style={{ background: '#000000' }}>
        <div className="max-w-5xl mx-auto text-center font-mono text-sm">
          <p className="text-sm mb-3" style={{ color: '#66ff66', opacity: 0.8 }}>
            Leveraged Event Contracts on Hyperliquid
          </p>
          <div className="text-xs mb-2" style={{ color: '#444444' }}>
            ────────────────────────────────────────────────────────────
          </div>
          <div className="space-y-1" style={{ color: '#66ff66' }}>
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
          <div className="text-xs mt-3" style={{ color: '#ffaa00' }} data-testid="text-disclaimer">
            [!] testnet: paper trading with simulated data [{BUILD_VERSION}]
          </div>
        </div>
      </section>

      {/* Create Market CTA */}
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

      {/* Create Market Modal */}
      <CreateMarketModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        walletAddress={user?.walletAddress}
      />

      {/* Hot Markets Carousel */}
      <section className="px-4 sm:px-6 lg:px-8 py-8" style={{ background: '#000000' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Flame className="w-6 h-6" style={{ color: '#ff6b35' }} />
              <h2 className="text-xl font-mono font-bold" style={{ color: '#66ff66' }} data-testid="text-hot-markets-title">
                HOT MARKETS
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => scrollCarousel('left')}
                disabled={!canScrollLeft}
                className="p-2 transition-all disabled:opacity-30"
                style={{ 
                  border: '1px solid #66ff66',
                  color: '#66ff66',
                  backgroundColor: 'transparent'
                }}
                data-testid="button-carousel-left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollCarousel('right')}
                disabled={!canScrollRight}
                className="p-2 transition-all disabled:opacity-30"
                style={{ 
                  border: '1px solid #66ff66',
                  color: '#66ff66',
                  backgroundColor: 'transparent'
                }}
                data-testid="button-carousel-right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className="flex-shrink-0 w-80 h-64 skeleton-neon"
                  style={{ backgroundColor: '#000000', border: '1px solid #66ff66' }}
                />
              ))}
            </div>
          ) : (
            <div 
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {hotMarkets.map((market, i) => (
                <div 
                  key={market.id} 
                  className="flex-shrink-0 w-80"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <MarketCard market={market} index={i} livePrice={getMarketPrice(market.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Category Cards */}
      <section className="px-4 sm:px-6 lg:px-8 py-12" style={{ background: '#000000' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-mono font-bold text-center mb-8" style={{ color: '#66ff66' }} data-testid="text-categories-title">
            BROWSE BY CATEGORY
          </h2>
          
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category) => {
              const symbol = getCategorySymbol(category);
              const marketCount = markets?.filter(m => m.category === category).length || 0;
              
              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center p-6 w-36 transition-all cursor-pointer"
                  style={{ 
                    border: '1px solid #66ff66',
                    backgroundColor: selectedCategory === category ? 'rgba(102, 255, 102, 0.05)' : 'transparent'
                  }}
                  onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                  data-testid={`category-card-${category.toLowerCase()}`}
                >
                  <span 
                    className="text-lg font-mono font-bold mb-3"
                    style={{ color: '#00ffff' }}
                  >
                    {symbol}
                  </span>
                  <span 
                    className="text-sm font-mono font-bold mb-1"
                    style={{ color: selectedCategory === category ? '#66ff66' : '#cccccc' }}
                  >
                    {getCategoryDisplayName(category)}
                  </span>
                  <span className="text-xs font-mono mb-3" style={{ color: '#666666' }}>
                    {marketCount} {marketCount === 1 ? 'market' : 'markets'}
                  </span>
                  <button
                    className="px-4 py-1.5 text-xs font-mono transition-all"
                    style={{
                      backgroundColor: selectedCategory === category ? '#66ff66' : 'transparent',
                      color: selectedCategory === category ? '#000000' : '#66ff66',
                      border: '1px solid #66ff66'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategory(selectedCategory === category ? null : category);
                    }}
                    data-testid={`button-trade-${category.toLowerCase()}`}
                  >
                    {selectedCategory === category ? 'Close' : 'Trade'}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Selected Category Markets */}
      {selectedCategory && categoryMarkets.length > 0 && (
        <section 
          ref={categoryMarketsRef}
          className="px-4 sm:px-6 lg:px-8 py-8" 
          style={{ background: '#000000', borderTop: '1px solid #333333' }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-mono font-bold" style={{ color: '#66ff66' }} data-testid="text-selected-category">
                {selectedCategory.toUpperCase()} MARKETS
              </h3>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-sm font-mono px-4 py-2 transition-all"
                style={{ color: '#ff6666', border: '1px solid #ff6666' }}
                data-testid="button-close-category"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryMarkets.map((market, i) => (
                <motion.div
                  key={market.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <MarketCard market={market} index={i} livePrice={getMarketPrice(market.id)} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* View All Markets Button */}
      <section className="px-4 sm:px-6 lg:px-8 py-12" style={{ background: '#000000' }}>
        <div className="max-w-5xl mx-auto text-center">
          <Link href="/markets">
            <button
              className="px-8 py-3 text-sm font-mono font-bold transition-all"
              style={{
                backgroundColor: 'transparent',
                color: '#66ff66',
                border: '2px solid #66ff66'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#66ff66';
                e.currentTarget.style.color = '#000000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#66ff66';
              }}
              data-testid="button-view-all-markets"
            >
              VIEW ALL MARKETS
            </button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
