import { usePositions, usePortfolioSummary, useCrossMarginMetrics, useComboPositions, useCloseComboPosition, useLiveCustomCombo, type ComboPositionWithCombo } from "@/hooks/use-markets";
import { useMarketStream } from "@/hooks/use-market-stream";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PositionCard } from "@/components/PositionCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, AlertTriangle, Wallet, CheckCircle, DollarSign, Shield, Gauge, Activity, Layers, X } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

function ComboPositionCard({ position, onClose, isClosing }: { 
  position: ComboPositionWithCombo; 
  onClose: (id: number) => void; 
  isClosing: boolean;
}) {
  const { data: liveCombo } = useLiveCustomCombo(position.comboId);
  
  const isParlay = position.positionType === "parlay";
  const isClosed = position.status !== "open";
  const isWon = position.status === "won";
  const isLost = position.status === "lost";
  
  const entryProb = position.entryProbability ? parseFloat(position.entryProbability.toString()) : 0;
  const currentProb = liveCombo?.impliedProbability ?? position.combo.impliedProbability;
  const size = position.size || 0;
  
  let unrealizedPnL = 0;
  if (!isClosed && !isParlay && size > 0) {
    if (position.side === "YES") {
      unrealizedPnL = (size * (currentProb - entryProb)) / 100;
    } else {
      unrealizedPnL = (size * (entryProb - currentProb)) / 100;
    }
  }
  
  const isProfitable = unrealizedPnL >= 0;
  
  return (
    <Card 
      className={clsx(
        "p-4 flex flex-col gap-3",
        isClosed && "opacity-60"
      )}
      data-testid={`card-combo-position-${position.id}`}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <Link href={`/combos/${position.comboId}`}>
          <span 
            className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-2 flex items-center gap-1"
            data-testid={`link-combo-position-${position.id}`}
          >
            <Layers className="w-4 h-4 flex-shrink-0" />
            {position.combo.name}
          </span>
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge 
            variant={position.side === "YES" ? "default" : "destructive"}
            data-testid={`badge-combo-side-${position.id}`}
          >
            {position.side}
          </Badge>
          <Badge 
            variant="outline"
            data-testid={`badge-combo-type-${position.id}`}
          >
            {isParlay ? "Parlay" : `Trade ${position.leverage}x`}
          </Badge>
          {isClosed && (
            <Badge 
              variant={isWon ? "default" : isLost ? "destructive" : "outline"}
              data-testid={`badge-combo-status-${position.id}`}
            >
              {position.status.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {position.combo.legs.length} legs: {position.combo.legs.map(l => `${l.marketName.slice(0, 20)}...`).join(" + ")}
      </div>

      {isParlay ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mb-1">Stake</p>
            <p className="font-mono font-medium" data-testid={`text-combo-stake-${position.id}`}>
              ${(position.stake || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mb-1">Potential Payout</p>
            <p className="font-mono text-primary font-medium" data-testid={`text-combo-payout-${position.id}`}>
              ${(position.potentialPayout || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mb-1">Multiplier</p>
            <p className="font-mono" data-testid={`text-combo-multiplier-${position.id}`}>
              {position.combo.multiplier.toFixed(2)}x
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mb-1">Status</p>
            <p className={clsx(
              "font-mono font-bold",
              isWon ? "text-primary" : isLost ? "text-destructive" : "text-foreground"
            )} data-testid={`text-combo-parlay-status-${position.id}`}>
              {isClosed ? (isWon ? "WON" : isLost ? "LOST" : "CLOSED") : "PENDING"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mb-1">Size</p>
            <p className="font-mono font-medium" data-testid={`text-combo-size-${position.id}`}>
              ${size.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mb-1">Leverage</p>
            <p className="font-mono" data-testid={`text-combo-leverage-${position.id}`}>
              {position.leverage}x
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mb-1">Entry</p>
            <p className="font-mono" data-testid={`text-combo-entry-${position.id}`}>
              {entryProb.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mb-1">Current</p>
            <p className="font-mono" data-testid={`text-combo-current-${position.id}`}>
              {currentProb.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mb-1">
              {isClosed ? "Realized PnL" : "Unrealized PnL"}
            </p>
            <p 
              className={clsx(
                "font-mono font-bold",
                isClosed 
                  ? (position.pnl ?? 0) >= 0 ? "text-primary" : "text-destructive"
                  : isProfitable ? "text-primary" : "text-destructive"
              )}
              data-testid={`text-combo-pnl-${position.id}`}
            >
              {isClosed ? (
                <>
                  {(position.pnl ?? 0) >= 0 ? "+" : ""}${(position.pnl ?? 0).toFixed(2)}
                </>
              ) : (
                <>
                  {isProfitable ? "+" : ""}${unrealizedPnL.toFixed(2)}
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {!isClosed && (
        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onClose(position.id)}
            disabled={isClosing}
            data-testid={`button-close-combo-${position.id}`}
          >
            {isClosing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <X className="w-4 h-4 mr-1" />
            )}
            Close
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function Portfolio() {
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const { data: positions, isLoading: isPosLoading } = usePositions();
  const { data: summary, isLoading: isSummaryLoading } = usePortfolioSummary();
  const { data: marginMetrics, isLoading: isMarginLoading } = useCrossMarginMetrics();
  const { data: comboPositions, isLoading: isComboLoading } = useComboPositions();
  const closeComboPosition = useCloseComboPosition();
  const { markets, getMarketPrice, isConnected } = useMarketStream();
  const [closingId, setClosingId] = useState<number | null>(null);

  const handleCloseComboPosition = async (id: number) => {
    setClosingId(id);
    try {
      await closeComboPosition.mutateAsync(id);
      toast({
        title: "Position Closed",
        description: "Your combo position has been closed successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to Close",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setClosingId(null);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && !user) {
      setLocation("/");
    }
  }, [user, isAuthLoading, setLocation]);

  // Include markets Map in dependencies to force recalculation on every SSE update
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
        
        // Get live price from SSE stream (with decimals) or fall back to DB value
        const currentPrice = markets.get(pos.marketId)?.currentProbability ?? pos.market?.currentProbability ?? 50;
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
      closedPositions: closed, 
      totalUnrealizedPnL: unrealizedPnL, 
      totalRealizedPnL: realizedPnL
    };
  }, [positions, markets]);
  
  // Use backend-calculated usedMargin from cross-margin metrics (more reliable)
  const usedMargin = marginMetrics?.usedMargin ?? 0;

  // Separate combo positions into open and closed
  const { openComboPositions, closedComboPositions } = useMemo(() => {
    if (!comboPositions) {
      return { openComboPositions: [], closedComboPositions: [] };
    }
    
    const open: ComboPositionWithCombo[] = [];
    const closed: ComboPositionWithCombo[] = [];
    
    for (const pos of comboPositions) {
      if (pos.status === "open") {
        open.push(pos);
      } else {
        closed.push(pos);
      }
    }
    
    return { openComboPositions: open, closedComboPositions: closed };
  }, [comboPositions]);

  if (isAuthLoading || isPosLoading || isSummaryLoading || isMarginLoading || isComboLoading) {
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-12">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <h1 className="text-3xl font-display font-bold" data-testid="text-portfolio-title">
            Portfolio Dashboard
          </h1>
          {isConnected && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Live prices
            </span>
          )}
        </div>

        {/* Balance Overview Card */}
        <Card className="bg-card border-border p-6 mb-8" data-testid="card-balance-overview">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-primary/20 text-primary">
                <Wallet className="w-10 h-10" />
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

        {/* Cross-Margin Status Card */}
        {marginMetrics && openPositions.length > 0 && (
          <Card className={clsx(
            "border p-6 mb-8",
            marginMetrics.marginRatio < 1 ? "bg-destructive/10 border-destructive" :
            marginMetrics.isAtRisk ? "bg-amber-500/10 border-amber-500" : 
            "bg-card border-border"
          )} data-testid="card-cross-margin">
            <div className="flex items-center gap-2 mb-4">
              <Shield className={clsx(
                "w-5 h-5",
                marginMetrics.marginRatio < 1 ? "text-destructive" :
                marginMetrics.isAtRisk ? "text-amber-500" : "text-primary"
              )} />
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

            {/* Margin Health Bar */}
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
          <Card className="bg-card border-border p-6 flex items-center gap-4" data-testid="card-total-invested">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <DollarSign className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Invested</p>
              <h2 className="text-2xl font-bold font-mono tracking-tight" data-testid="text-total-invested">
                ${(summary?.totalInvested || 0).toLocaleString()}
              </h2>
            </div>
          </Card>
          
          <Card className="bg-card border-border p-6 flex items-center gap-4" data-testid="card-unrealized-pnl">
            <div className={clsx("p-3 rounded-xl", totalUnrealizedPnL >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Unrealized PnL</p>
              <h2 className={clsx("text-2xl font-bold font-mono tracking-tight", totalUnrealizedPnL >= 0 ? "text-primary" : "text-destructive")} data-testid="text-unrealized-pnl">
                {totalUnrealizedPnL >= 0 ? "+" : ""}${totalUnrealizedPnL.toFixed(2)}
              </h2>
            </div>
          </Card>

          <Card className="bg-card border-border p-6 flex items-center gap-4" data-testid="card-realized-pnl">
            <div className={clsx("p-3 rounded-xl", totalRealizedPnL >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
              <DollarSign className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Realized PnL</p>
              <h2 className={clsx("text-2xl font-bold font-mono tracking-tight", totalRealizedPnL >= 0 ? "text-primary" : "text-destructive")} data-testid="text-realized-pnl">
                {totalRealizedPnL >= 0 ? "+" : ""}${totalRealizedPnL.toFixed(2)}
              </h2>
            </div>
          </Card>

          <Card className="bg-card border-border p-6 flex items-center gap-4" data-testid="card-active-positions">
            <div className="p-3 rounded-xl bg-accent/10 text-accent">
              <AlertTriangle className="w-8 h-8" />
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
            <h2 className="text-xl font-display font-bold" data-testid="text-open-positions-title">
              Open Positions
            </h2>
            
            {openPositions.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 border-border/50 bg-transparent" data-testid="card-no-positions">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground">
                  <Wallet className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">No active positions</h3>
                <p className="text-muted-foreground mb-6">Start trading markets to see your portfolio here.</p>
                <Button onClick={() => setLocation("/")} data-testid="button-explore-markets">
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
              <h2 className="text-xl font-display font-bold flex items-center gap-2" data-testid="text-closed-positions-title">
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

          {/* Combo Positions Section */}
          {(openComboPositions.length > 0 || closedComboPositions.length > 0) && (
            <>
              <section className="space-y-4 mt-8">
                <h2 className="text-xl font-display font-bold flex items-center gap-2" data-testid="text-combo-positions-title">
                  <Layers className="w-5 h-5 text-primary" />
                  Combo Positions
                </h2>
                
                {openComboPositions.length === 0 ? (
                  <Card className="p-8 text-center border-dashed border-2 border-border/50 bg-transparent" data-testid="card-no-combo-positions">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground">
                      <Layers className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1">No open combo positions</h3>
                    <p className="text-muted-foreground mb-6">Place parlay bets or probability trades on combo markets.</p>
                    <Button onClick={() => setLocation("/combos")} data-testid="button-explore-combos">
                      Explore Combos
                    </Button>
                  </Card>
                ) : (
                  <div className="grid gap-4" data-testid="list-open-combo-positions">
                    {openComboPositions.map((pos) => (
                      <ComboPositionCard 
                        key={pos.id} 
                        position={pos}
                        onClose={handleCloseComboPosition}
                        isClosing={closingId === pos.id}
                      />
                    ))}
                  </div>
                )}
              </section>

              {closedComboPositions.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-xl font-display font-bold flex items-center gap-2" data-testid="text-closed-combo-positions-title">
                    <CheckCircle className="w-5 h-5 text-muted-foreground" />
                    Closed Combo Positions
                  </h2>
                  
                  <div className="grid gap-4" data-testid="list-closed-combo-positions">
                    {closedComboPositions.map((pos) => (
                      <ComboPositionCard 
                        key={pos.id} 
                        position={pos}
                        onClose={handleCloseComboPosition}
                        isClosing={closingId === pos.id}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
