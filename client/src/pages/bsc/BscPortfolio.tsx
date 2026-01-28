import { usePositions, usePortfolioSummary, useCrossMarginMetrics } from "@/hooks/use-markets";
import { useMarketStream } from "@/hooks/use-market-stream";
import { BscNavbar } from "@/components/bsc/BscNavbar";
import { Footer } from "@/components/Footer";
import { PositionCard } from "@/components/PositionCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, TrendingUp, AlertTriangle, Wallet, CheckCircle, DollarSign, Shield, Gauge } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useEffect, useMemo } from "react";
import clsx from "clsx";

export default function BscPortfolio() {
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: positions, isLoading: isPosLoading } = usePositions();
  const { data: summary, isLoading: isSummaryLoading } = usePortfolioSummary();
  const { data: marginMetrics, isLoading: isMarginLoading } = useCrossMarginMetrics();
  const { markets, getMarketPrice, isConnected } = useMarketStream();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      setLocation("/bsc");
    }
  }, [user, isAuthLoading, setLocation]);

  const { openPositions, closedPositions, totalUnrealizedPnL, totalRealizedPnL } = useMemo(() => {
    if (!positions) {
      return { 
        openPositions: [], 
        closedPositions: [], 
        totalUnrealizedPnL: 0, 
        totalRealizedPnL: 0
      };
    }

    const open: typeof positions = [];
    const closed: typeof positions = [];
    let unrealizedPnL = 0;
    let realizedPnL = 0;

    for (const pos of positions) {
      const isClosed = pos.status === "closed" || pos.status === "liquidated";
      
      if (isClosed) {
        closed.push(pos);
        realizedPnL += pos.pnl ?? 0;
      } else {
        open.push(pos);
        
        const currentPrice = markets.get(pos.marketId)?.currentProbability ?? pos.market?.currentProbability ?? 50;
        const isLong = pos.side === "YES";
        const pnl = isLong
          ? (pos.size * (currentPrice - pos.entryProbability)) / 100
          : (pos.size * (pos.entryProbability - currentPrice)) / 100;
        unrealizedPnL += pnl;
      }
    }

    return { 
      openPositions: open, 
      closedPositions: closed, 
      totalUnrealizedPnL: unrealizedPnL, 
      totalRealizedPnL: realizedPnL
    };
  }, [positions, markets]);
  
  const usedMargin = marginMetrics?.usedMargin ?? 0;

  if (isAuthLoading || isPosLoading || isSummaryLoading || isMarginLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: '#f0b90b' }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BscNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-12">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <h1 className="text-3xl font-display font-bold" style={{ color: '#f0b90b' }} data-testid="text-portfolio-title">
            Portfolio Dashboard
          </h1>
          {isConnected && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#f0b90b' }} />
              Live prices
            </span>
          )}
        </div>

        <Card className="bg-card p-6 mb-8" style={{ borderColor: '#f0b90b' }} data-testid="card-balance-overview">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(240, 185, 11, 0.2)' }}>
                <Wallet className="w-10 h-10" style={{ color: '#f0b90b' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Account Balance</p>
                <h2 className="text-3xl font-bold font-mono tracking-tight" data-testid="text-account-balance">
                  ${parseFloat(user?.balance || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-lg font-mono">
              <span className="text-muted-foreground">+</span>
              <span className={clsx("font-bold", totalUnrealizedPnL >= 0 ? "text-primary" : "text-destructive")}>
                {totalUnrealizedPnL >= 0 ? "+" : ""}{totalUnrealizedPnL.toFixed(2)}
              </span>
              <span className="text-muted-foreground text-sm">(unrealized)</span>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-muted-foreground font-medium mb-1">Effective Balance</p>
              <h2 className={clsx(
                "text-3xl font-bold font-mono tracking-tight",
                (parseFloat(user?.balance || "0") + usedMargin + totalUnrealizedPnL) >= parseFloat(user?.balance || "0") ? "text-primary" : "text-destructive"
              )} data-testid="text-effective-balance">
                ${(parseFloat(user?.balance || "0") + usedMargin + totalUnrealizedPnL).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Paper Trading</p>
            </div>
          </div>
        </Card>

        {marginMetrics && openPositions.length > 0 && (
          <Card className={clsx(
            "border p-6 mb-8",
            marginMetrics.marginRatio < 1 ? "bg-destructive/10 border-destructive" :
            marginMetrics.isAtRisk ? "bg-amber-500/10 border-amber-500" : 
            "bg-card"
          )} style={{ borderColor: marginMetrics.marginRatio >= 1 && !marginMetrics.isAtRisk ? '#f0b90b' : undefined }} data-testid="card-cross-margin">
            <div className="flex items-center gap-2 mb-4">
              <Shield className={clsx(
                "w-5 h-5",
                marginMetrics.marginRatio < 1 ? "text-destructive" :
                marginMetrics.isAtRisk ? "text-amber-500" : ""
              )} style={{ color: marginMetrics.marginRatio >= 1 && !marginMetrics.isAtRisk ? '#f0b90b' : undefined }} />
              <h3 className="font-semibold">Cross-Margin Status</h3>
              {marginMetrics.marginRatio < 1 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-full">
                  LIQUIDATION RISK
                </span>
              )}
              {marginMetrics.isAtRisk && marginMetrics.marginRatio >= 1 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-500 text-black rounded-full">
                  AT RISK
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Equity</p>
                <p className={clsx(
                  "text-xl font-bold font-mono",
                  marginMetrics.equity >= marginMetrics.usedMargin ? "text-primary" : "text-destructive"
                )} data-testid="text-equity">
                  ${marginMetrics.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Free Margin</p>
                <p className={clsx(
                  "text-xl font-bold font-mono",
                  marginMetrics.freeMargin > 0 ? "text-primary" : "text-destructive"
                )} data-testid="text-free-margin">
                  ${marginMetrics.freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">Available for new positions</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Used Margin</p>
                <p className="text-xl font-bold font-mono" data-testid="text-used-margin">
                  ${marginMetrics.usedMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Margin Ratio</p>
                <div className="flex items-center gap-2">
                  <Gauge className={clsx(
                    "w-5 h-5",
                    marginMetrics.marginRatio < 1 ? "text-destructive" :
                    marginMetrics.marginRatio < 1.2 ? "text-amber-500" : "text-primary"
                  )} />
                  <p className={clsx(
                    "text-xl font-bold font-mono",
                    marginMetrics.marginRatio < 1 ? "text-destructive" :
                    marginMetrics.marginRatio < 1.2 ? "text-amber-500" : "text-primary"
                  )} data-testid="text-margin-ratio">
                    {marginMetrics.marginRatio === Infinity ? "-" : `${(marginMetrics.marginRatio * 100).toFixed(0)}%`}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">Liquidation at 100%</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Margin Health</span>
                <span>{marginMetrics.marginRatio < Infinity ? `${Math.min(200, marginMetrics.marginRatio * 100).toFixed(0)}%` : "Safe"}</span>
              </div>
              <Progress 
                value={Math.min(100, (marginMetrics.marginRatio / 2) * 100)}
                className={clsx(
                  "h-2",
                  marginMetrics.marginRatio < 1 ? "[&>div]:bg-destructive" :
                  marginMetrics.marginRatio < 1.2 ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"
                )}
              />
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <Card className="bg-card p-6 flex items-center gap-4" style={{ borderColor: '#f0b90b' }} data-testid="card-total-invested">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(240, 185, 11, 0.1)' }}>
              <DollarSign className="w-8 h-8" style={{ color: '#f0b90b' }} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Invested</p>
              <h2 className="text-2xl font-bold font-mono tracking-tight" data-testid="text-total-invested">
                ${(summary?.totalInvested || 0).toLocaleString()}
              </h2>
            </div>
          </Card>
          
          <Card className="bg-card p-6 flex items-center gap-4" style={{ borderColor: '#f0b90b' }} data-testid="card-unrealized-pnl">
            <div className={clsx("p-3 rounded-xl", totalUnrealizedPnL >= 0 ? "bg-primary/10" : "bg-destructive/10")}>
              <TrendingUp className={clsx("w-8 h-8", totalUnrealizedPnL >= 0 ? "text-primary" : "text-destructive")} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Unrealized PnL</p>
              <h2 className={clsx("text-2xl font-bold font-mono tracking-tight", totalUnrealizedPnL >= 0 ? "text-primary" : "text-destructive")} data-testid="text-unrealized-pnl">
                {totalUnrealizedPnL >= 0 ? "+" : ""}${totalUnrealizedPnL.toFixed(2)}
              </h2>
            </div>
          </Card>

          <Card className="bg-card p-6 flex items-center gap-4" style={{ borderColor: '#f0b90b' }} data-testid="card-realized-pnl">
            <div className={clsx("p-3 rounded-xl", totalRealizedPnL >= 0 ? "bg-primary/10" : "bg-destructive/10")}>
              <DollarSign className={clsx("w-8 h-8", totalRealizedPnL >= 0 ? "text-primary" : "text-destructive")} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Realized PnL</p>
              <h2 className={clsx("text-2xl font-bold font-mono tracking-tight", totalRealizedPnL >= 0 ? "text-primary" : "text-destructive")} data-testid="text-realized-pnl">
                {totalRealizedPnL >= 0 ? "+" : ""}${totalRealizedPnL.toFixed(2)}
              </h2>
            </div>
          </Card>

          <Card className="bg-card p-6 flex items-center gap-4" style={{ borderColor: '#f0b90b' }} data-testid="card-active-positions">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(240, 185, 11, 0.1)' }}>
              <AlertTriangle className="w-8 h-8" style={{ color: '#f0b90b' }} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Active Positions</p>
              <h2 className="text-2xl font-bold font-mono tracking-tight" data-testid="text-active-positions">
                {openPositions.length}
              </h2>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-display font-bold" style={{ color: '#f0b90b' }} data-testid="text-open-positions-title">
              Open Positions
            </h2>
            
            {openPositions.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 bg-transparent" style={{ borderColor: '#f0b90b' }} data-testid="card-no-positions">
                <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(240, 185, 11, 0.1)' }}>
                  <Wallet className="w-6 h-6" style={{ color: '#f0b90b' }} />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">No active positions</h3>
                <p className="text-muted-foreground mb-6">Start trading markets to see your portfolio here.</p>
                <Button onClick={() => setLocation("/bsc")} style={{ backgroundColor: '#f0b90b', color: '#000000' }} data-testid="button-explore-markets">
                  Explore Markets
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4" data-testid="list-open-positions">
                {openPositions.map((pos) => (
                  <PositionCard 
                    key={pos.id} 
                    position={pos} 
                    currentPrice={markets.get(pos.marketId)?.currentProbability}
                  />
                ))}
              </div>
            )}
          </section>

          {closedPositions.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-display font-bold flex items-center gap-2" style={{ color: '#f0b90b' }} data-testid="text-closed-positions-title">
                <CheckCircle className="w-5 h-5 text-muted-foreground" />
                Closed Positions
              </h2>
              
              <div className="grid gap-4" data-testid="list-closed-positions">
                {closedPositions.map((pos) => (
                  <PositionCard key={pos.id} position={pos} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
