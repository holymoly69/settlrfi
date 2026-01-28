import { useState, useEffect, useRef, useCallback } from "react";

export interface LiquidationEvent {
  id: number;
  timestamp: Date;
  user: { address: string; displayName: string };
  market: { id: number; question: string };
  size: number;
  side: "YES" | "NO";
}

interface UseLiquidationStreamResult {
  latestLiquidation: LiquidationEvent | null;
  isConnected: boolean;
  error: string | null;
}

export function useLiquidationStream(): UseLiquidationStreamResult {
  const [latestLiquidation, setLatestLiquidation] = useState<LiquidationEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/liquidations/stream");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLatestLiquidation({
          ...data,
          timestamp: new Date(data.timestamp),
        });
      } catch (err) {
        console.error("Failed to parse liquidation SSE data:", err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError("Connection lost");
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

  return { latestLiquidation, isConnected, error };
}
