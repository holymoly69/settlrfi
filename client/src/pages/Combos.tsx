import { useState } from "react";
import { Link } from "wouter";
import { useCombos, useCustomCombos } from "@/hooks/use-markets";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ComboBuilder } from "@/components/ComboBuilder";
import { Search, Layers, TrendingUp, Flame, Clock, User } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import type { Combo, CustomComboResponse } from "@shared/schema";

function ComboCard({ combo }: { combo: Combo }) {
  const isHot = combo.volume24h > 200000;
  const probability = combo.probability;

  return (
    <Link href={`/combo/${combo.id}`}>
      <div 
        className="group relative bg-black border border-[#66ff66] overflow-hidden cursor-pointer h-full transition-all hover:shadow-[0_0_20px_rgba(0,255,65,0.3)]"
        data-testid={`card-combo-${combo.id}`}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(0,255,65,0.1) 0%, transparent 50%)'
          }}
        />

        <div className="p-5 flex flex-col h-full relative z-10">
          <div className="flex justify-between items-start mb-4 gap-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-medium bg-black text-[#ffaa00] border border-[#ffaa00]">
                <Layers className="w-3 h-3 inline mr-1" />
                {combo.legs.length}-Leg Combo
              </span>
            </div>
            {isHot && (
              <span className="hot-badge flex items-center gap-1" data-testid="badge-hot">
                <Flame className="w-3 h-3" />
                HOT
              </span>
            )}
          </div>

          <h3 className="font-display text-base font-semibold mb-2 line-clamp-2 text-[#66ff66] group-hover:text-[#00ff88] transition-colors leading-snug">
            {combo.name}
          </h3>

          <div className="space-y-1 mb-4">
            {combo.legs.slice(0, 3).map((leg, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[#444444]">
                <span className={`font-mono font-bold ${leg.side === 'YES' ? 'text-[#66ff66]' : 'text-[#ff3366]'}`}>
                  {leg.side}
                </span>
                <span className="truncate text-[#66ff66]/70">{leg.marketName}</span>
              </div>
            ))}
            {combo.legs.length > 3 && (
              <span className="text-xs text-[#444444]">+{combo.legs.length - 3} more</span>
            )}
          </div>

          <div className="mt-auto space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] text-[#444444] uppercase tracking-wider mb-1">Win Probability</p>
                <div className="flex items-baseline gap-1">
                  <span 
                    className="text-2xl font-bold font-mono"
                    style={{ 
                      color: '#88ffff'
                    }}
                    data-testid="text-probability"
                  >
                    {probability}
                  </span>
                  <span className="text-lg text-[#444444]">%</span>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-[10px] text-[#444444] uppercase tracking-wider mb-1">Multiplier</p>
                <span className="text-xl font-bold font-mono text-[#88ffff]" data-testid="text-multiplier">
                  {combo.multiplier.toFixed(2)}x
                </span>
              </div>
            </div>

            <div className="prob-bar">
              <div 
                className="prob-bar-fill"
                style={{ 
                  width: `${probability}%`,
                  backgroundColor: '#66ff66'
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#444444] pt-3 border-t border-[#444444]">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(combo.expiry), { addSuffix: true })}
              </span>
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" />
                ${combo.volume24h.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CustomComboCard({ combo }: { combo: CustomComboResponse }) {
  const probability = Number(combo.impliedProbability) * 100;
  const multiplier = Number(combo.multiplier);
  const legs = typeof combo.legs === 'string' ? JSON.parse(combo.legs) : combo.legs;

  const truncateAddress = (address: string | null) => {
    if (!address) return 'Anonymous';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Link href={`/custom-combo/${combo.id}`}>
      <div 
        className="group relative bg-black border border-[#66ff66] overflow-hidden cursor-pointer h-full transition-all hover:shadow-[0_0_20px_rgba(0,255,65,0.3)]"
        data-testid={`card-custom-combo-${combo.id}`}
      >
        <div className="p-5 flex flex-col h-full">
          <div className="flex justify-between items-start mb-3 gap-2">
            <span className="px-2 py-0.5 text-xs bg-black text-[#ffaa00] border border-[#ffaa00]">
              <Layers className="w-3 h-3 inline mr-1" />
              {legs.length}-Leg
            </span>
            <span className="px-2 py-0.5 text-xs bg-black text-[#66ff66] border border-[#444444]">
              <User className="w-3 h-3 inline mr-1" />
              {truncateAddress(combo.creatorAddress)}
            </span>
          </div>

          <h3 
            className="font-display text-base font-semibold mb-3 line-clamp-2 text-[#66ff66] group-hover:text-[#00ff88] transition-colors"
            data-testid={`text-custom-combo-name-${combo.id}`}
          >
            {combo.name}
          </h3>

          <div className="space-y-1 mb-4 flex-1">
            {legs.slice(0, 3).map((leg: { marketName: string; side: string; price: number }, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[#444444]">
                <span 
                  className={`text-[10px] px-1.5 py-0 border ${
                    leg.side === 'YES' 
                      ? 'bg-black text-[#66ff66] border-[#66ff66]' 
                      : 'bg-black text-[#ff3366] border-[#ff3366]'
                  }`}
                >
                  {leg.side}
                </span>
                <span className="truncate text-[#66ff66]/70">{leg.marketName}</span>
              </div>
            ))}
            {legs.length > 3 && (
              <span className="text-xs text-[#444444]">+{legs.length - 3} more</span>
            )}
          </div>

          <div className="mt-auto pt-3 border-t border-[#444444]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] text-[#444444] uppercase tracking-wider mb-1">Probability</p>
                <span 
                  className="text-lg font-bold font-mono"
                  style={{ color: '#88ffff' }}
                  data-testid={`text-custom-combo-probability-${combo.id}`}
                >
                  {probability.toFixed(2)}%
                </span>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#444444] uppercase tracking-wider mb-1">Multiplier</p>
                <span 
                  className="text-lg font-bold font-mono text-[#88ffff]"
                  data-testid={`text-custom-combo-multiplier-${combo.id}`}
                >
                  {multiplier.toFixed(2)}x
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Combos() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: combos, isLoading, error } = useCombos();
  const { data: customCombos, isLoading: customCombosLoading, refetch: refetchCustomCombos } = useCustomCombos();

  const filteredCombos = combos?.filter(c => {
    if (!searchQuery) return true;
    return c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.legs.some(leg => leg.marketName.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const filteredCustomCombos = customCombos?.filter(c => {
    if (!searchQuery) return true;
    const legs = typeof c.legs === 'string' ? JSON.parse(c.legs) : c.legs;
    return c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      legs.some((leg: { marketName: string }) => leg.marketName.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="min-h-screen bg-black text-[#66ff66] flex flex-col">
      <Navbar />

      <section className="relative py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute top-10 left-1/4 w-[400px] h-[400px] pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(0,255,65,0.1) 0%, transparent 70%)' }} />
        <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(0,255,65,0.1) 0%, transparent 70%)' }} />

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-black border border-[#66ff66] mb-6">
              <Layers className="w-5 h-5 text-[#66ff66]" />
              <span className="text-[#66ff66] font-semibold">Structured Parlays</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
              <span className="text-[#66ff66]">Combo Markets</span>
            </h1>
            
            <p className="text-lg text-[#444444] max-w-2xl mx-auto mb-8">
              Bet on multiple outcomes at once with <span className="text-[#66ff66] font-bold">higher multipliers</span>. 
              All legs must hit for the combo to pay out.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 lg:pb-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#444444]" />
            <input 
              placeholder="Search combos..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 h-11 bg-black border border-[#66ff66] text-[#66ff66] placeholder:text-[#444444] focus:outline-none focus:shadow-[0_0_10px_rgba(0,255,65,0.3)]"
              data-testid="input-search-combos"
            />
          </div>
          <ComboBuilder onComboCreated={() => refetchCustomCombos()} />
        </div>

        <section className="mb-12">
          <div className="text-xs font-mono mb-4" style={{ color: '#444444' }}>
            ────────────────────────────────────────────────────────────
          </div>
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-[#66ff66]">
            <Flame className="w-5 h-5 text-[#ffaa00]" />
            Curated Combos
          </h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-black border border-[#66ff66] h-72 skeleton-neon" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-[#ff3366]">Failed to load combos. Please try again.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCombos?.map((combo, i) => (
                <motion.div
                  key={combo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <ComboCard combo={combo} />
                </motion.div>
              ))}
              
              {filteredCombos?.length === 0 && (
                <div className="col-span-full text-center py-20 text-[#444444]">
                  No curated combos found.
                </div>
              )}
            </div>
          )}
        </section>

        <section>
          <div className="text-xs font-mono mb-4" style={{ color: '#444444' }}>
            ────────────────────────────────────────────────────────────
          </div>
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-[#66ff66]">
            <User className="w-5 h-5 text-[#88ffff]" />
            Custom Combos
          </h2>
          
          {customCombosLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-black border border-[#66ff66] h-56 skeleton-neon" />
              ))}
            </div>
          ) : filteredCustomCombos && filteredCustomCombos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCustomCombos.map((combo, i) => (
                <motion.div
                  key={combo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <CustomComboCard combo={combo} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-[#444444] bg-black border border-[#444444]">
              <Layers className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="mb-2">No custom combos yet</p>
              <p className="text-sm">Be the first to create a custom combo!</p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
