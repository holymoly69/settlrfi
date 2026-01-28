import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext, type ReactNode } from "react";

interface OrderBookEntry {
  price: number;
  size: number;
}

interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface MarketStreamData {
  marketId: number;
  currentProbability: number;
  orderBook: OrderBook;
}

interface MarketStreamState {
  markets: Map<number, MarketStreamData>;
  isConnected: boolean;
  error: string | null;
}

interface MarketStreamContextValue {
  markets: Map<number, MarketStreamData>;
  isConnected: boolean;
  error: string | null;
  getMarketPrice: (marketId: number) => number | undefined;
  getMarketData: (marketId: number) => MarketStreamData | undefined;
}

const MarketStreamContext = createContext<MarketStreamContextValue | null>(null);

export function MarketStreamProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MarketStreamState>({
    markets: new Map(),
    isConnected: false,
    error: null,
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/markets/stream");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setState(prev => ({ ...prev, isConnected: true, error: null }));
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.markets && Array.isArray(data.markets)) {
          const marketsMap = new Map<number, MarketStreamData>();
          for (const market of data.markets) {
            marketsMap.set(market.marketId, {
              marketId: market.marketId,
              currentProbability: market.currentProbability,
              orderBook: market.orderBook,
            });
          }
          setState(prev => ({ ...prev, markets: marketsMap }));
        }
      } catch (err) {
        console.error("Failed to parse SSE data:", err);
      }
    };

    eventSource.onerror = () => {
      setState(prev => ({ ...prev, isConnected: false, error: "Connection lost" }));
      eventSource.close();
      
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current += 1;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const getMarketPrice = useCallback((marketId: number): number | undefined => {
    return state.markets.get(marketId)?.currentProbability;
  }, [state.markets]);

  const getMarketData = useCallback((marketId: number): MarketStreamData | undefined => {
    return state.markets.get(marketId);
  }, [state.markets]);

  // Memoize the context value to prevent unnecessary re-renders
  // This ensures components only re-render when actual data changes
  const value: MarketStreamContextValue = useMemo(() => ({
    markets: state.markets,
    isConnected: state.isConnected,
    error: state.error,
    getMarketPrice,
    getMarketData,
  }), [state.markets, state.isConnected, state.error, getMarketPrice, getMarketData]);

  return (
    <MarketStreamContext.Provider value={value}>
      {children}
    </MarketStreamContext.Provider>
  );
}

export function useMarketStream(): MarketStreamContextValue {
  const context = useContext(MarketStreamContext);
  if (!context) {
    throw new Error("useMarketStream must be used within a MarketStreamProvider");
  }
  return context;
}
