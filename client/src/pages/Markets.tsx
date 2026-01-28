import { useState } from "react";
import { useMarkets } from "@/hooks/use-markets";
import { useMarketStream } from "@/hooks/use-market-stream";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MarketCard } from "@/components/MarketCard";
import { Search } from "lucide-react";
import { motion } from "framer-motion";

export default function Markets() {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: markets, isLoading, error } = useMarkets();
  const { getMarketPrice } = useMarketStream();

  const filteredMarkets = markets?.filter(m => {
    const matchesCategory = filter === "all" || m.category.toLowerCase() === filter.toLowerCase();
    const matchesSearch = !searchQuery || 
      m.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ["All", ...Array.from(new Set(markets?.map(m => m.category) || [])).sort()];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main id="markets" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-mono font-bold mb-8" style={{ color: '#66ff66' }} data-testid="text-all-markets-title">
          ALL MARKETS
        </h1>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              placeholder="Search markets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="terminal-input pl-11 h-11 w-full"
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
                  backgroundColor: filter === cat.toLowerCase() ? '#66ff66' : '#000000',
                  color: filter === cat.toLowerCase() ? '#000000' : '#66ff66',
                  border: '1px solid #66ff66'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Markets Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i} 
                className="h-64 skeleton-neon"
                style={{ backgroundColor: '#000000', border: '1px solid #66ff66' }}
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
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <MarketCard market={market} index={i} livePrice={getMarketPrice(market.id)} />
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
