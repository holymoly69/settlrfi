import { Link } from "wouter";
import { type Market } from "@shared/schema";
import { TrendingUp, Users, Clock, Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MarketCardProps {
  market: Market;
  index?: number;
  livePrice?: number; // Real-time price from stream, falls back to market.currentProbability
}

// Category colors for consistent branding
const categoryColors: Record<string, string> = {
  'Politics': '#ff6b6b',    // red
  'Crypto': '#ffa500',      // orange  
  'Sports': '#66ff66',      // green
  'Tech': '#66b3ff',        // blue
  'Culture': '#cc66ff',     // purple
  'Space': '#88ffff',       // cyan
  'Science': '#ffff66',     // yellow
  'Exotic Bet': '#ff00ff',  // magenta
  'default': '#66ff66'      // fallback green
};

export function MarketCard({ market, index = 0, livePrice }: MarketCardProps) {
  const buttonColor = '#ffaa00'; // Unified orange/gold for all trade buttons
  const isHot = (market.volume24h || 0) > 10000;
  // Use live price from stream if available, otherwise fall back to stored probability
  const rawProbability = livePrice ?? market.currentProbability;
  const isExotic = market.category === 'Exotic Bet';
  // Format probability: exotic bets show 3 decimals, regular markets show 2
  const probability = isExotic 
    ? Number(rawProbability).toFixed(3) 
    : Number(rawProbability).toFixed(2);

  return (
    <Link href={`/market/${market.id}`}>
      <div 
        className="group cursor-pointer h-full font-mono relative"
        style={{ backgroundColor: '#000000' }}
        data-testid={`card-market-${market.id}`}
      >
        {/* ASCII Corner Decorations + Border */}
        <div className="absolute top-0 left-0 text-xs select-none" style={{ color: '#66ff66' }}>┌</div>
        <div className="absolute top-0 right-0 text-xs select-none" style={{ color: '#66ff66' }}>┐</div>
        <div className="absolute bottom-0 left-0 text-xs select-none" style={{ color: '#66ff66' }}>└</div>
        <div className="absolute bottom-0 right-0 text-xs select-none" style={{ color: '#66ff66' }}>┘</div>
        
        <div 
          className="h-full p-5"
          style={{ border: '1px solid #66ff66' }}
        >
          <div className="flex flex-col h-full">
            {/* Header: Category & Hot Badge */}
            <div className="flex justify-between items-start mb-4 gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span 
                  className="px-2 py-0.5 text-xs font-mono"
                  style={{ 
                    border: '1px solid #ffaa00',
                    color: '#ffaa00'
                  }}
                >
                  [{market.category}]
                </span>
                {market.isPermissionless && (
                  <span 
                    className="px-2 py-0.5 text-xs font-mono"
                    style={{ 
                      border: '1px solid #cc66ff',
                      color: '#cc66ff'
                    }}
                    data-testid="badge-user-market"
                  >
                    [User] NEW
                  </span>
                )}
                {market.resolved && (
                  <span 
                    className="px-2 py-0.5 text-xs font-mono"
                    style={{ 
                      border: `1px solid ${market.outcome ? '#66ff66' : '#ff6666'}`,
                      color: market.outcome ? '#66ff66' : '#ff6666'
                    }}
                    data-testid="badge-resolved"
                  >
                    [SETTLED: {market.outcome ? 'YES' : 'NO'}]
                  </span>
                )}
              </div>
              {isHot && !market.resolved && (
                <span className="hot-badge flex items-center gap-1" data-testid="badge-hot">
                  <Flame className="w-3 h-3" />
                  HOT
                </span>
              )}
            </div>

            {/* Question */}
            <h3 
              className="font-mono text-base font-semibold mb-4 line-clamp-2 leading-snug"
              style={{ color: '#66ff66' }}
            >
              {market.question}
            </h3>

            {/* Probability Display */}
            <div className="mt-auto space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p 
                    className="text-[10px] uppercase tracking-wider mb-1 font-mono"
                    style={{ color: '#444444' }}
                  >
                    PROBABILITY
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span 
                      className="text-3xl font-bold font-mono"
                      style={{ color: '#88ffff' }}
                      data-testid="text-probability"
                    >
                      {probability}
                    </span>
                    <span className="text-lg font-mono" style={{ color: '#444444' }}>%</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <p 
                    className="text-[10px] uppercase tracking-wider mb-1 font-mono"
                    style={{ color: '#444444' }}
                  >
                    24H VOL
                  </p>
                  <span 
                    className="text-lg font-mono flex items-center justify-end gap-1"
                    style={{ color: '#66ff66' }}
                  >
                    <TrendingUp className="w-3 h-3" style={{ color: '#66ff66' }} />
                    ${(market.volume24h || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Probability Bar */}
              <div 
                className="h-1 w-full"
                style={{ backgroundColor: '#444444' }}
              >
                <div 
                  className="h-full transition-all duration-500"
                  style={{ 
                    width: `${probability}%`,
                    backgroundColor: '#88ffff'
                  }}
                />
              </div>

              {/* Footer Stats */}
              <div 
                className="flex items-center justify-between gap-2 text-[11px] pt-3 font-mono flex-wrap"
                style={{ 
                  color: '#444444',
                  borderTop: '1px solid #66ff66'
                }}
              >
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(market.resolutionDate), { addSuffix: true })}
                </span>
                {market.isPermissionless && market.creator ? (
                  <span 
                    className="flex items-center gap-1.5"
                    style={{ color: '#cc66ff' }}
                    data-testid="text-creator-address"
                  >
                    by {market.creator.slice(0, 6)}...{market.creator.slice(-4)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    {Math.floor(Math.random() * 500) + 50}
                  </span>
                )}
              </div>

              {/* Trade Button - Rainbow Terminal Style */}
              <div>
                <button 
                  className="w-full py-2.5 text-sm font-mono font-semibold cursor-pointer transition-all duration-200"
                  style={{
                    backgroundColor: 'transparent',
                    border: `1px solid ${buttonColor}`,
                    color: buttonColor
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = buttonColor;
                    e.currentTarget.style.color = '#000000';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = buttonColor;
                  }}
                  data-testid="button-trade"
                >
                  &gt; trade 50x
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
