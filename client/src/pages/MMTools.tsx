import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Play, Square, TrendingUp, Activity } from "lucide-react";

interface MMMarket {
  id: number;
  question: string;
  category: string;
  currentProbability: number;
  hyperAssetId: number | null;
  status: string;
}

interface MMStatus {
  exists: boolean;
  wallet?: string;
  balance?: number;
  weeklyPnl?: number;
  stlrPoints?: number;
  message?: string;
}

interface OrderResponse {
  status: string;
  fillPrice?: number;
  size?: number;
  side?: string;
  marketId?: number;
  pnl?: number;
  newBalance?: number;
  txHash?: string;
  message?: string;
  orderId?: string;
}

export default function MMTools() {
  const { isAuthenticated, user } = useAuth();
  const walletAddress = user?.walletAddress;
  const { toast } = useToast();
  
  const [selectedMarket, setSelectedMarket] = useState<number | null>(null);
  const [bidSpread, setBidSpread] = useState(2);
  const [askSpread, setAskSpread] = useState(2);
  const [orderSize, setOrderSize] = useState(100);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteInterval, setQuoteInterval] = useState<NodeJS.Timeout | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderResponse[]>([]);

  const { data: markets, isLoading: marketsLoading } = useQuery<MMMarket[]>({
    queryKey: ["/api/mm/markets"],
  });

  const { data: mmStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery<MMStatus>({
    queryKey: ["/api/mm/status", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return { exists: false };
      const res = await fetch(`/api/mm/status/${walletAddress}`);
      return res.json();
    },
    enabled: !!walletAddress,
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (order: { side: "buy" | "sell"; price: number }) => {
      if (!walletAddress || !selectedMarket) throw new Error("Missing wallet or market");
      const res = await apiRequest("POST", "/api/mm/order", {
        wallet: walletAddress,
        marketId: selectedMarket,
        side: order.side,
        size: orderSize,
        price: order.price,
        type: "postOnly",
      });
      return res.json();
    },
    onSuccess: (data: OrderResponse) => {
      setRecentOrders(prev => [data, ...prev.slice(0, 9)]);
      refetchStatus();
    },
    onError: (error: Error) => {
      toast({
        title: "Order Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startQuoting = () => {
    if (!selectedMarket || !walletAddress) {
      toast({
        title: "Error",
        description: "Select a market first",
        variant: "destructive",
      });
      return;
    }

    setIsQuoting(true);
    const market = markets?.find(m => m.id === selectedMarket);
    if (!market) return;

    const quoteOnce = () => {
      const currentPrice = market.currentProbability / 100;
      const bidPrice = Math.max(0.01, currentPrice - (bidSpread / 100));
      const askPrice = Math.min(0.99, currentPrice + (askSpread / 100));

      placeOrderMutation.mutate({ side: "buy", price: bidPrice });
      placeOrderMutation.mutate({ side: "sell", price: askPrice });
    };

    quoteOnce();
    const interval = setInterval(quoteOnce, 5000);
    setQuoteInterval(interval);
  };

  const stopQuoting = () => {
    setIsQuoting(false);
    if (quoteInterval) {
      clearInterval(quoteInterval);
      setQuoteInterval(null);
    }
  };

  const selectedMarketData = markets?.find(m => m.id === selectedMarket);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div 
          className="font-mono mb-6 px-4 py-3"
          style={{ borderBottom: '1px solid #66ff66' }}
        >
          <h1 style={{ color: '#66ff66' }} className="text-lg">{'>'} mm_tools --quoting</h1>
          <p style={{ color: '#888888' }} className="text-sm mt-1">
            Market maker dashboard for programmatic quoting (paper mode)
          </p>
        </div>

        {!isAuthenticated ? (
          <div 
            className="font-mono p-6 text-center"
            style={{ border: '1px solid #66ff66', backgroundColor: '#000' }}
          >
            <p style={{ color: '#ffaa00' }}>Connect wallet to access MM tools</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className="p-4 font-mono"
                style={{ border: '1px solid #333', backgroundColor: '#0a0a0a' }}
              >
                <div className="text-sm mb-3" style={{ color: '#ffaa00' }}>MM Account Status</div>
                {statusLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#66ff66' }} />
                ) : mmStatus?.exists ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: '#888888' }}>Balance:</span>
                      <span style={{ color: '#88ffff' }}>${mmStatus.balance?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#888888' }}>Weekly PnL:</span>
                      <span style={{ color: (mmStatus.weeklyPnl || 0) >= 0 ? '#66ff66' : '#ff6666' }}>
                        {(mmStatus.weeklyPnl || 0) >= 0 ? '+' : ''}${(mmStatus.weeklyPnl || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#888888' }}>STLR Points:</span>
                      <span style={{ color: '#88ffff' }}>{mmStatus.stlrPoints?.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: '#888888' }}>
                    No MM account yet. Place an order to create one.
                  </p>
                )}
              </div>

              <div 
                className="p-4 font-mono"
                style={{ border: '1px solid #333', backgroundColor: '#0a0a0a' }}
              >
                <div className="text-sm mb-3" style={{ color: '#ffaa00' }}>Quoting Status</div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2"
                    style={{ 
                      backgroundColor: isQuoting ? '#66ff66' : '#444444',
                      borderRadius: '50%',
                    }}
                  />
                  <span style={{ color: isQuoting ? '#66ff66' : '#888888' }}>
                    {isQuoting ? 'Active - Quoting every 5s' : 'Stopped'}
                  </span>
                </div>
                {selectedMarketData && (
                  <div className="mt-2 text-xs" style={{ color: '#888888' }}>
                    Market: {selectedMarketData.question}
                  </div>
                )}
              </div>
            </div>

            <div 
              className="p-4 font-mono"
              style={{ border: '1px solid #66ff66', backgroundColor: '#000' }}
            >
              <div className="text-sm mb-4" style={{ color: '#66ff66' }}>Quoting Configuration</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#888888' }}>Select Market</label>
                  <select
                    value={selectedMarket || ""}
                    onChange={(e) => setSelectedMarket(Number(e.target.value) || null)}
                    className="w-full p-2 text-sm font-mono"
                    style={{ 
                      backgroundColor: '#0a0a0a', 
                      border: '1px solid #333',
                      color: '#88ffff',
                    }}
                    data-testid="select-market"
                  >
                    <option value="">-- Select Market --</option>
                    {markets?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.question} ({m.currentProbability}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#888888' }}>Order Size ($)</label>
                  <input
                    type="number"
                    value={orderSize}
                    onChange={(e) => setOrderSize(Number(e.target.value))}
                    min={10}
                    max={10000}
                    className="w-full p-2 text-sm font-mono"
                    style={{ 
                      backgroundColor: '#0a0a0a', 
                      border: '1px solid #333',
                      color: '#88ffff',
                    }}
                    data-testid="input-order-size"
                  />
                </div>

                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#888888' }}>Bid Spread (%)</label>
                  <input
                    type="number"
                    value={bidSpread}
                    onChange={(e) => setBidSpread(Number(e.target.value))}
                    min={0.5}
                    max={10}
                    step={0.5}
                    className="w-full p-2 text-sm font-mono"
                    style={{ 
                      backgroundColor: '#0a0a0a', 
                      border: '1px solid #333',
                      color: '#66ff66',
                    }}
                    data-testid="input-bid-spread"
                  />
                </div>

                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#888888' }}>Ask Spread (%)</label>
                  <input
                    type="number"
                    value={askSpread}
                    onChange={(e) => setAskSpread(Number(e.target.value))}
                    min={0.5}
                    max={10}
                    step={0.5}
                    className="w-full p-2 text-sm font-mono"
                    style={{ 
                      backgroundColor: '#0a0a0a', 
                      border: '1px solid #333',
                      color: '#ff6666',
                    }}
                    data-testid="input-ask-spread"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                {!isQuoting ? (
                  <button
                    onClick={startQuoting}
                    disabled={!selectedMarket || placeOrderMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-mono transition-all disabled:opacity-50"
                    style={{ 
                      border: '1px solid #66ff66',
                      color: '#000',
                      backgroundColor: '#66ff66',
                    }}
                    data-testid="button-start-quoting"
                  >
                    <Play className="w-4 h-4" />
                    {'>'} start_quoting
                  </button>
                ) : (
                  <button
                    onClick={stopQuoting}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-mono transition-all"
                    style={{ 
                      border: '1px solid #ff6666',
                      color: '#000',
                      backgroundColor: '#ff6666',
                    }}
                    data-testid="button-stop-quoting"
                  >
                    <Square className="w-4 h-4" />
                    {'>'} stop_quoting
                  </button>
                )}
              </div>
            </div>

            <div 
              className="p-4 font-mono"
              style={{ border: '1px solid #333', backgroundColor: '#0a0a0a' }}
            >
              <div className="flex items-center gap-2 text-sm mb-3" style={{ color: '#ffaa00' }}>
                <Activity className="w-4 h-4" />
                Recent Orders
              </div>
              {recentOrders.length === 0 ? (
                <p className="text-sm" style={{ color: '#444444' }}>No orders yet</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {recentOrders.map((order, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between text-xs py-1"
                      style={{ borderBottom: '1px solid #222' }}
                    >
                      <span style={{ color: order.status === 'filled' ? '#66ff66' : '#ffaa00' }}>
                        [{order.status}]
                      </span>
                      <span style={{ color: order.side === 'buy' ? '#66ff66' : '#ff6666' }}>
                        {order.side?.toUpperCase()} ${order.size}
                      </span>
                      <span style={{ color: '#88ffff' }}>
                        @ {(order.fillPrice ?? 0).toFixed(4)}
                      </span>
                      <span style={{ color: (order.pnl ?? 0) >= 0 ? '#66ff66' : '#ff6666' }}>
                        {(order.pnl ?? 0) >= 0 ? '+' : ''}{order.pnl ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div 
              className="p-4 font-mono text-xs"
              style={{ border: '1px solid #333', backgroundColor: '#0a0a0a' }}
            >
              <div className="text-sm mb-2" style={{ color: '#ffaa00' }}>API Documentation</div>
              <pre style={{ color: '#888888' }} className="overflow-x-auto">
{`POST /api/mm/order
{
  "wallet": "0x...",
  "marketId": 1,
  "side": "buy" | "sell",
  "size": 100,
  "price": 0.72,
  "type": "limit" | "postOnly" | "market"
}

GET /api/mm/status/:wallet
GET /api/mm/markets`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
