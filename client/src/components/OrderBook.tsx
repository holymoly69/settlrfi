import { useState, useEffect, useCallback, useMemo } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface OrderBookLevel {
  price: number;
  size: number;
}

interface OrderBookData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  currentProbability: number;
}

interface OrderBookProps {
  marketId: number;
  currentProbability?: number;
  compact?: boolean;
}

const DECIMAL_OPTIONS = [0.01, 0.1, 0.5, 1, 2, 5];

export function OrderBook({ marketId, currentProbability, compact = false }: OrderBookProps) {
  const [location] = useLocation();
  const isBsc = location.startsWith('/bsc');
  const accentColor = isBsc ? '#f0b90b' : '#66ff66';
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decimalPrecision, setDecimalPrecision] = useState(1);

  const fetchOrderBook = useCallback(async () => {
    try {
      const response = await fetch(`/api/markets/${marketId}/orderbook`);
      if (!response.ok) {
        throw new Error("Failed to fetch order book");
      }
      const data = await response.json();
      setOrderBook(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [marketId]);

  useEffect(() => {
    fetchOrderBook();
    const intervalId = setInterval(fetchOrderBook, 2000);
    return () => clearInterval(intervalId);
  }, [fetchOrderBook]);

  const groupedData = useMemo(() => {
    if (!orderBook) return { bids: [], asks: [] };

    const groupLevels = (levels: OrderBookLevel[], isBid: boolean) => {
      const grouped = new Map<number, number>();
      
      levels.forEach(level => {
        const groupedPrice = isBid 
          ? Math.floor(level.price / decimalPrecision) * decimalPrecision
          : Math.ceil(level.price / decimalPrecision) * decimalPrecision;
        
        const existing = grouped.get(groupedPrice) || 0;
        grouped.set(groupedPrice, existing + level.size);
      });

      return Array.from(grouped.entries())
        .map(([price, size]) => ({ price, size }))
        .sort((a, b) => isBid ? b.price - a.price : a.price - b.price);
    };

    return {
      bids: groupLevels(orderBook.bids, true),
      asks: groupLevels(orderBook.asks, false)
    };
  }, [orderBook, decimalPrecision]);

  if (isLoading) {
    return (
      <div 
        className="p-6 flex items-center justify-center min-h-[280px]"
        style={{ backgroundColor: '#000000', border: `1px solid ${accentColor}` }}
      >
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: accentColor }} data-testid="orderbook-loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="p-6 text-center min-h-[280px] flex items-center justify-center"
        style={{ backgroundColor: '#000000', border: `1px solid ${accentColor}` }}
      >
        <p className="text-sm font-mono" style={{ color: '#444444' }} data-testid="orderbook-error">
          Unable to load order book
        </p>
      </div>
    );
  }

  if (!orderBook) {
    return (
      <div 
        className="p-6 flex items-center justify-center min-h-[280px]"
        style={{ backgroundColor: '#000000', border: `1px solid ${accentColor}` }}
      >
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: accentColor }} data-testid="orderbook-loading" />
      </div>
    );
  }

  const displayRows = compact ? 6 : 8;
  const bids = groupedData.bids.slice(0, displayRows);
  const asks = groupedData.asks.slice(0, displayRows);

  const maxBidSize = Math.max(...bids.map(b => b.size), 1);
  const maxAskSize = Math.max(...asks.map(a => a.size), 1);
  const maxSize = Math.max(maxBidSize, maxAskSize);

  const formatPrice = (price: number) => {
    if (decimalPrecision < 1) {
      return price.toFixed(2);
    }
    return price.toFixed(decimalPrecision < 1 ? 2 : 1);
  };

  return (
    <div 
      className="overflow-hidden" 
      style={{ backgroundColor: '#000000', border: `1px solid ${accentColor}` }}
      data-testid="orderbook-container"
    >
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${accentColor}` }}>
        <h3 className="font-mono font-semibold flex items-center gap-2 text-sm" style={{ color: accentColor }}>
          <BookOpen className="h-4 w-4" style={{ color: accentColor }} />
          Order Book
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" data-testid="decimal-selector">
            {DECIMAL_OPTIONS.map((dec) => (
              <button
                key={dec}
                onClick={() => setDecimalPrecision(dec)}
                className="px-2 py-0.5 text-[10px] font-mono transition-colors"
                style={{
                  backgroundColor: decimalPrecision === dec ? accentColor : 'transparent',
                  color: decimalPrecision === dec ? '#000000' : '#666666',
                  border: decimalPrecision === dec ? 'none' : '1px solid #333333'
                }}
                data-testid={`decimal-${dec}`}
              >
                {dec}
              </button>
            ))}
          </div>
          {currentProbability !== undefined && (
            <span 
              className="font-mono text-sm font-bold"
              style={{ color: accentColor }}
            >
              {currentProbability}%
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-2 text-[10px] text-muted-foreground uppercase tracking-wider">
          <div className="grid grid-cols-2">
            <span>Size</span>
            <span className="text-right text-primary">Bid</span>
          </div>
          <div className="grid grid-cols-2">
            <span className="text-destructive">Ask</span>
            <span className="text-right">Size</span>
          </div>
        </div>

        <div className="space-y-0.5">
          {Array.from({ length: Math.max(bids.length, asks.length) }).map((_, i) => {
            const bid = bids[i];
            const ask = asks[i];
            
            return (
              <div 
                key={i} 
                className="grid grid-cols-2 gap-3 text-xs font-mono py-1"
                data-testid={`orderbook-row-${i}`}
              >
                <div className="grid grid-cols-2 items-center relative">
                  {bid ? (
                    <>
                      <div 
                        className="absolute inset-y-0 right-0 rounded-sm transition-all duration-500"
                        style={{ 
                          width: `${(bid.size / maxSize) * 100}%`,
                          background: 'rgba(0,255,136,0.15)'
                        }}
                      />
                      <span className="text-muted-foreground z-10" data-testid={`bid-size-${i}`}>
                        ${bid.size.toLocaleString()}
                      </span>
                      <span className="text-right z-10 font-medium" style={{ color: '#00ff88' }} data-testid={`bid-price-${i}`}>
                        {formatPrice(bid.price)}%
                      </span>
                    </>
                  ) : (
                    <span className="col-span-2 text-muted-foreground/30 text-center">-</span>
                  )}
                </div>

                <div className="grid grid-cols-2 items-center relative">
                  {ask ? (
                    <>
                      <div 
                        className="absolute inset-y-0 left-0 rounded-sm transition-all duration-500"
                        style={{ 
                          width: `${(ask.size / maxSize) * 100}%`,
                          background: 'rgba(255,51,102,0.15)'
                        }}
                      />
                      <span className="z-10 font-medium" style={{ color: '#ff3366' }} data-testid={`ask-price-${i}`}>
                        {formatPrice(ask.price)}%
                      </span>
                      <span className="text-right text-muted-foreground z-10" data-testid={`ask-size-${i}`}>
                        ${ask.size.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="col-span-2 text-muted-foreground/30 text-center">-</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ background: '#00ff88' }} />
            <span className="text-muted-foreground">Bids</span>
          </div>
          <span className="font-mono text-muted-foreground">
            Mid: <span className="text-white font-medium">{orderBook.currentProbability}%</span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Asks</span>
            <div className="w-2 h-2 rounded-sm" style={{ background: '#ff3366' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
