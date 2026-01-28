import { usePositions, usePortfolioSummary } from "@/hooks/use-markets";
import { useMarketStream } from "@/hooks/use-market-stream";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PositionCard } from "@/components/PositionCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, TrendingUp, AlertTriangle, Wallet, DollarSign, User } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useMemo } from "react";
import clsx from "clsx";

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: positions, isLoading: isPosLoading } = usePositions();
  const { data: summary, isLoading: isSummaryLoading } = usePortfolioSummary();
  const { getMarketPrice, isConnected } = useMarketStream();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      setLocation("/");
    }
  }, [user, isAuthLoading, setLocation]);

  const { openPositions, totalUnrealizedPnL, totalRealizedPnL, accountPnL } = useMemo(() => {
    if (!positions) {
      return { 
        openPositions: [], 
        totalUnrealizedPnL: 0, 
        totalRealizedPnL: 0,
        accountPnL: 0
      };
    }

    const open: typeof positions = [];
    let unrealizedPnL = 0;
    let realizedPnL = 0;

    for (const pos of positions) {
      const isClosed = pos.status === "closed" || pos.status === "liquidated";
      
      if (isClosed) {
        realizedPnL += pos.pnl ?? 0;
      } else {
        open.push(pos);
        const currentPrice = getMarketPrice(pos.marketId) ?? pos.market?.currentProbability ?? 50;
        const isLong = pos.side === "YES";
        // size is already the leveraged notional, do NOT multiply by leverage again
        const pnl = isLong
          ? (pos.size * (currentPrice - pos.entryProbability)) / 100
          : (pos.size * (pos.entryProbability - currentPrice)) / 100;
        unrealizedPnL += pnl;
      }
    }

    return { 
      openPositions: open, 
      totalUnrealizedPnL: unrealizedPnL, 
      totalRealizedPnL: realizedPnL,
      accountPnL: unrealizedPnL + realizedPnL
    };
  }, [positions, getMarketPrice]);

  if (isAuthLoading || isPosLoading || isSummaryLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Profile Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 rounded-xl bg-primary/10 text-primary">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold" data-testid="text-profile-title">
                Account Profile
              </h1>
              <p className="text-muted-foreground mt-1" data-testid="text-wallet-address-full">
                {user.walletAddress}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-card border-border p-6 flex items-center gap-4" data-testid="card-account-balance">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Wallet className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Account Balance</p>
                  <h2 className="text-2xl font-bold font-mono tracking-tight" data-testid="text-account-balance">
                    ${parseFloat(user.balance || "0").toLocaleString()}
                  </h2>
                  <p className="text-xs text-muted-foreground">Paper Trading</p>
                </div>
              </div>
            </Card>

            <Card className="bg-card border-border p-6 flex items-center gap-4" data-testid="card-account-pnl">
              <div className={clsx("p-3 rounded-xl", accountPnL >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Account P&L</p>
                <h2 className={clsx("text-2xl font-bold font-mono tracking-tight", accountPnL >= 0 ? "text-primary" : "text-destructive")} data-testid="text-account-pnl">
                  {accountPnL >= 0 ? "+" : ""}${accountPnL.toFixed(2)}
                </h2>
              </div>
            </Card>

            <Card className="bg-card border-border p-6 flex items-center gap-4" data-testid="card-unrealized-pnl-profile">
              <div className={clsx("p-3 rounded-xl", totalUnrealizedPnL >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Unrealized P&L</p>
                <h2 className={clsx("text-2xl font-bold font-mono tracking-tight", totalUnrealizedPnL >= 0 ? "text-primary" : "text-destructive")} data-testid="text-unrealized-pnl-profile">
                  {totalUnrealizedPnL >= 0 ? "+" : ""}${totalUnrealizedPnL.toFixed(2)}
                </h2>
              </div>
            </Card>

            <Card className="bg-card border-border p-6 flex items-center gap-4" data-testid="card-realized-pnl-profile">
              <div className={clsx("p-3 rounded-xl", totalRealizedPnL >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
                <DollarSign className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Realized P&L</p>
                <h2 className={clsx("text-2xl font-bold font-mono tracking-tight", totalRealizedPnL >= 0 ? "text-primary" : "text-destructive")} data-testid="text-realized-pnl-profile">
                  {totalRealizedPnL >= 0 ? "+" : ""}${totalRealizedPnL.toFixed(2)}
                </h2>
              </div>
            </Card>
          </div>
        </div>

        {/* Open Positions Section */}
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-display font-bold flex items-center gap-2" data-testid="text-open-positions-title">
              <AlertTriangle className="w-5 h-5 text-accent" />
              Open Positions ({openPositions.length})
            </h2>
            
            {openPositions.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 border-border/50 bg-transparent" data-testid="card-no-open-positions">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground">
                  <Wallet className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">No open positions</h3>
                <p className="text-muted-foreground mb-6">Start trading markets to see your positions here.</p>
                <Button onClick={() => setLocation("/")} data-testid="button-explore-markets-profile">
                  Explore Markets
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4" data-testid="list-open-positions-profile">
                {openPositions.map((pos) => (
                  <PositionCard 
                    key={pos.id} 
                    position={pos} 
                    currentPrice={getMarketPrice(pos.marketId)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
