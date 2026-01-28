import { useRoute, Link } from "wouter";
import { useMarket, useMarketTrades, usePositionsByMarket } from "@/hooks/use-markets";
import { useMarketStream } from "@/hooks/use-market-stream";
import { BscNavbar } from "@/components/bsc/BscNavbar";
import { Footer } from "@/components/Footer";
import { OrderForm } from "@/components/OrderForm";
import { OrderBook } from "@/components/OrderBook";
import { TradingViewChart } from "@/components/TradingViewChart";
import { MarketPositionCard } from "@/components/MarketPositionCard";
import { PendingOrdersPanel } from "@/components/PendingOrdersPanel";
import { Loader2, Calendar, Info, History, TrendingUp, Zap, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function BscMarketDetail() {
  const [, params] = useRoute("/bsc/market/:id");
  const id = Number(params?.id);
  const { toast } = useToast();
  
  const { data: market, isLoading, error } = useMarket(id);
  const { data: trades } = useMarketTrades(id);
  const { data: positions } = usePositionsByMarket(id);
  const { isAuthenticated, user } = useAuth();
  const { getMarketPrice } = useMarketStream();

  const openPositions = positions?.filter(p => p.status === "open") || [];

  const resolveMutation = useMutation({
    mutationFn: async ({ outcome }: { outcome: boolean }) => {
      const res = await apiRequest("POST", `/api/markets/${id}/resolve`, { outcome });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/markets', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/markets'] });
      toast({
        title: "Market Resolved",
        description: `Market resolved to ${data.outcome ? 'YES ($1)' : 'NO ($0)'} via UMA Oracle (mock)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Resolution Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const canResolve = isAuthenticated && market && !market.resolved && 
    market.creator && user?.walletAddress === market.creator;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center particle-bg">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4" style={{ color: '#f0b90b' }} />
          <p className="text-muted-foreground">Loading market...</p>
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4 particle-bg">
        <h1 className="text-2xl font-bold mb-2">Market not found</h1>
        <p className="text-muted-foreground">This market may have been deleted or does not exist.</p>
      </div>
    );
  }

  const probability = getMarketPrice(id) ?? market.currentProbability;
  const getProbColor = (p: number) => p >= 70 ? '#00ff88' : p >= 40 ? '#f0b90b' : '#ff3366';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BscNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-muted-foreground border border-white/10">
                  {market.category}
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: 'rgba(240, 185, 11, 0.1)', color: '#f0b90b', borderColor: '#f0b90b' }}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#f0b90b' }} />
                  LIVE
                </span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-display font-bold leading-tight" data-testid="text-market-question">
                {market.question}
              </h1>

              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Resolves {format(new Date(market.resolutionDate), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Vol: ${(market.volume24h || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" style={{ color: '#f0b90b' }} />
                  Up to 50x leverage
                </div>
              </div>

              <div className="glass-card rounded-xl p-4 flex items-center justify-between" style={{ border: '1px solid #f0b90b' }}>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Probability</p>
                  <span 
                    className="text-4xl font-bold font-mono"
                    style={{ color: getProbColor(probability) }}
                    data-testid="text-current-probability"
                  >
                    {probability}%
                  </span>
                </div>
                <div className="w-32 h-3" style={{ backgroundColor: '#333' }}>
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${probability}%`,
                      backgroundColor: '#f0b90b'
                    }}
                  />
                </div>
              </div>

              <div 
                className="font-mono p-4"
                style={{ backgroundColor: '#000000', border: '1px solid #f0b90b' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ color: '#f0b90b' }}>RESOLUTION STATUS</span>
                  <span style={{ color: '#444444' }}>|</span>
                  <span style={{ color: '#444444' }}>UMA Oracle (mock)</span>
                </div>
                
                {market.resolved ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {market.outcome ? (
                        <CheckCircle className="w-5 h-5" style={{ color: '#66ff66' }} />
                      ) : (
                        <XCircle className="w-5 h-5" style={{ color: '#ff6666' }} />
                      )}
                      <span 
                        className="text-lg font-bold"
                        style={{ color: market.outcome ? '#66ff66' : '#ff6666' }}
                        data-testid="text-resolution-outcome"
                      >
                        Settled: {market.outcome ? 'YES ($1.00)' : 'NO ($0.00)'}
                      </span>
                    </div>
                    {market.resolvedAt && (
                      <p style={{ color: '#444444' }} className="text-sm">
                        Resolved on {format(new Date(market.resolvedAt), 'MMM d, yyyy HH:mm')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p style={{ color: '#f0b90b' }} className="text-sm">
                      Status: <span style={{ color: '#88ffff' }}>Unresolved</span> (Expected: {format(new Date(market.resolutionDate), 'MMM d, yyyy')})
                    </p>
                    
                    {canResolve && (
                      <div className="flex items-center gap-4 pt-2">
                        <button
                          onClick={() => resolveMutation.mutate({ outcome: true })}
                          disabled={resolveMutation.isPending}
                          className="font-mono text-sm transition-colors py-2 px-4"
                          style={{ 
                            backgroundColor: 'transparent',
                            border: '1px solid #66ff66',
                            color: '#66ff66'
                          }}
                          data-testid="button-resolve-yes"
                        >
                          {resolveMutation.isPending ? '...' : '> resolve YES'}
                        </button>
                        <button
                          onClick={() => resolveMutation.mutate({ outcome: false })}
                          disabled={resolveMutation.isPending}
                          className="font-mono text-sm transition-colors py-2 px-4"
                          style={{ 
                            backgroundColor: 'transparent',
                            border: '1px solid #ff6666',
                            color: '#ff6666'
                          }}
                          data-testid="button-resolve-no"
                        >
                          {resolveMutation.isPending ? '...' : '> resolve NO'}
                        </button>
                      </div>
                    )}
                    
                    {!canResolve && market.creator && (
                      <p style={{ color: '#444444' }} className="text-xs">
                        Only the market creator can resolve this market
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 h-[350px] flex flex-col overflow-hidden" style={{ border: '1px solid #f0b90b' }}>
              <TradingViewChart 
                marketId={market.id} 
                currentProbability={probability} 
              />
            </div>

            {/* Order Book - Main prominent position */}
            <OrderBook marketId={market.id} currentProbability={market.currentProbability} />

            {isAuthenticated && openPositions.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" style={{ color: '#f0b90b' }} />
                  Your Positions ({openPositions.length})
                </h3>
                <div className="space-y-3">
                  {openPositions.map((position) => (
                    <MarketPositionCard 
                      key={position.id}
                      position={position}
                      currentPrice={market.currentProbability}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="glass-card rounded-xl p-5" style={{ border: '1px solid #f0b90b' }}>
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Rules & Details
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {market.description}
              </p>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="sticky top-24 space-y-6">
              <OrderForm market={market} />
              <PendingOrdersPanel marketId={market.id} />
              
              {/* Recent Trades - Compact in sidebar */}
              <div 
                className="hidden lg:block overflow-hidden"
                style={{ backgroundColor: '#000000', border: '1px solid #f0b90b' }}
              >
                <div className="p-3 flex items-center gap-2" style={{ borderBottom: '1px solid #f0b90b' }}>
                  <History className="h-4 w-4" style={{ color: '#f0b90b' }} />
                  <h3 className="font-mono font-semibold text-sm" style={{ color: '#f0b90b' }}>Recent Trades</h3>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground text-[10px] border-b sticky top-0 bg-black" style={{ borderColor: '#f0b90b' }}>
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Time</th>
                        <th className="px-3 py-2 text-left font-medium">Side</th>
                        <th className="px-3 py-2 text-right font-medium">Size</th>
                        <th className="px-3 py-2 text-right font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: '#333' }}>
                      {trades?.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground text-xs">
                            No trades yet
                          </td>
                        </tr>
                      ) : (
                        trades?.slice(0, 8).map((trade) => (
                          <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-3 py-1.5 text-muted-foreground font-mono">
                              {format(new Date(trade.timestamp!), 'HH:mm:ss')}
                            </td>
                            <td className={`px-3 py-1.5 font-bold font-mono ${trade.side === 'YES' ? 'text-primary' : 'text-destructive'}`}>
                              {trade.side === 'YES' ? 'LONG' : 'SHORT'}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono">
                              ${trade.size.toLocaleString()}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                              {trade.price}%
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
