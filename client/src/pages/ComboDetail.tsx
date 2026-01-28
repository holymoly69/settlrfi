import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useCombo } from "@/hooks/use-markets";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TradingViewChart } from "@/components/TradingViewChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Loader2, Calendar, Info, Layers, TrendingUp, Zap, AlertTriangle, CheckCircle2, DollarSign, Target } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

function formatLockDate(date: Date | null): string {
  if (!date) return "Not set";
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}

function parseDateToGMT(dateString: string): Date | null {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

export default function ComboDetail() {
  const [, params] = useRoute("/combo/:id");
  const id = Number(params?.id);
  
  const { data: combo, isLoading, error } = useCombo(id);
  const { isAuthenticated, connect } = useAuth();
  const { toast } = useToast();

  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [stake, setStake] = useState("");
  const [leverage, setLeverage] = useState(1);
  const [lockDate, setLockDate] = useState<Date | null>(null);

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: { comboId: number; side: string; stake: number; leverage: number; lockDate: string; entryProbability: number }) => {
      return apiRequest("POST", "/api/combo-positions", orderData);
    },
    onSuccess: () => {
      toast({
        title: "Position Opened",
        description: `Your ${side} position has been opened with ${leverage}x leverage.`,
      });
      setStake("");
      setLeverage(1);
      setLockDate(null);
      queryClient.invalidateQueries({ queryKey: ["/api/combo-positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to open position",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center particle-bg">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-accent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading combo...</p>
        </div>
      </div>
    );
  }

  if (error || !combo) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4 particle-bg">
        <h1 className="text-2xl font-bold mb-2">Combo not found</h1>
        <p className="text-muted-foreground mb-4">This combo may have been removed or does not exist.</p>
        <Link href="/combos">
          <Button variant="outline">Back to Combos</Button>
        </Link>
      </div>
    );
  }

  const probability = combo.probability;
  const parsedStake = parseFloat(stake) || 0;
  const notionalSize = parsedStake * leverage;

  const estimatePnLRange = () => {
    if (parsedStake <= 0 || !lockDate) return { min: 0, max: 0 };
    const probMove = 10;
    const entryProb = probability;
    
    if (side === "YES") {
      const maxProb = Math.min(100, entryProb + probMove);
      const minProb = Math.max(0, entryProb - probMove);
      const maxPnL = notionalSize * (maxProb - entryProb) / 100;
      const minPnL = notionalSize * (minProb - entryProb) / 100;
      return { min: minPnL, max: maxPnL };
    } else {
      const maxProb = Math.min(100, entryProb + probMove);
      const minProb = Math.max(0, entryProb - probMove);
      const maxPnL = notionalSize * (entryProb - minProb) / 100;
      const minPnL = notionalSize * (entryProb - maxProb) / 100;
      return { min: minPnL, max: maxPnL };
    }
  };

  const pnlRange = estimatePnLRange();

  const handlePlaceOrder = () => {
    if (!isAuthenticated) {
      connect();
      return;
    }

    if (parsedStake <= 0) {
      toast({
        title: "Invalid stake",
        description: "Please enter a valid stake amount.",
        variant: "destructive",
      });
      return;
    }

    if (!lockDate) {
      toast({
        title: "Lock date required",
        description: "Please select a lock date for your position.",
        variant: "destructive",
      });
      return;
    }

    placeOrderMutation.mutate({
      comboId: id,
      side,
      stake: parsedStake,
      leverage,
      lockDate: lockDate.toISOString(),
      entryProbability: probability,
    });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-accent/20 text-accent border border-accent/30 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  {combo.legs.length}-Leg Combo
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  LIVE
                </span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-display font-bold leading-tight" data-testid="text-combo-name">
                {combo.name}
              </h1>

              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Expires {format(new Date(combo.expiry), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Vol: ${combo.volume24h.toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent" />
                  <span className="gradient-text font-bold">{combo.multiplier.toFixed(2)}x Multiplier</span>
                </div>
              </div>

              <div 
                className="p-4 flex items-center justify-between"
                style={{ backgroundColor: '#000000', border: '1px solid #66ff66' }}
              >
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1 font-mono" style={{ color: '#444444' }}>Combined Probability</p>
                  <span 
                    className="text-4xl font-bold font-mono"
                    style={{ color: '#66ff66' }}
                    data-testid="text-current-probability"
                  >
                    {probability}%
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider mb-1 font-mono" style={{ color: '#444444' }}>Payout Multiplier</p>
                  <span className="text-4xl font-bold font-mono" style={{ color: '#66ff66' }} data-testid="text-multiplier">
                    {combo.multiplier.toFixed(2)}x
                  </span>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 h-[350px] flex flex-col overflow-hidden">
              <TradingViewChart 
                marketId={combo.id + 10000}
                currentProbability={probability} 
              />
            </div>

            <div className="glass-card-glow rounded-xl p-1">
              <div className="flex items-center gap-2 px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20 rounded-t-xl">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-yellow-500 font-medium">Time-Lock Parlay System</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  This is a time-lock parlay market. Your position will automatically close at the specified lock date (00:00 GMT).
                  PnL is determined by probability movement from entry to lock date. No liquidations - positions held until lock date.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent" />
                Combo Legs ({combo.legs.length})
              </h3>
              
              <div className="glass-card rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground text-xs border-b border-white/5 bg-white/[0.02]">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Market</th>
                      <th className="px-4 py-3 text-center font-medium">Outcome</th>
                      <th className="px-4 py-3 text-right font-medium">Probability</th>
                      <th className="px-4 py-3 text-center font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {combo.legs.map((leg, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-4">
                          <Link href={`/market/${leg.marketId}`}>
                            <span className="hover:text-accent transition-colors cursor-pointer">
                              {leg.marketName}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            leg.side === 'YES' 
                              ? 'bg-primary/20 text-primary' 
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            {leg.side}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right font-mono">
                          {leg.probability}%
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                How Time-Lock Parlays Work
              </h3>
              <div className="text-muted-foreground text-sm space-y-2">
                <p>
                  Time-lock parlays allow you to take leveraged positions on combo outcomes with a fixed exit date.
                  Your position automatically closes at the lock date (00:00 GMT), with PnL based on probability movement.
                </p>
                <p>
                  <span className="text-accent font-semibold">Key Features:</span> No liquidation risk - positions are held until the lock date regardless of probability movement.
                  Higher leverage amplifies both gains and losses based on probability change.
                </p>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <h3 className="font-display font-semibold mb-3">Market Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">24h Volume</p>
                  <p className="text-lg font-mono font-semibold">${combo.volume24h.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Open Interest</p>
                  <p className="text-lg font-mono font-semibold">${combo.openInterest.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Legs</p>
                  <p className="text-lg font-mono font-semibold">{combo.legs.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Multiplier</p>
                  <p className="text-lg font-mono font-semibold gradient-text">{combo.multiplier.toFixed(2)}x</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="sticky top-24">
              <div className="glass-card-glow rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-accent/10 to-secondary/10">
                  <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                    <Zap className="h-4 w-4 text-accent" />
                    Time-Lock Position
                  </h3>
                </div>

                <div className="p-5 space-y-6">
                  <div className="flex gap-2">
                    <Button
                      variant={side === "YES" ? "default" : "outline"}
                      className={`flex-1 ${side === "YES" ? "bg-primary hover:bg-primary/90 neon-glow-green" : ""}`}
                      onClick={() => setSide("YES")}
                      data-testid="button-side-yes"
                    >
                      YES (Long)
                    </Button>
                    <Button
                      variant={side === "NO" ? "default" : "outline"}
                      className={`flex-1 ${side === "NO" ? "bg-destructive hover:bg-destructive/90 neon-glow-red" : ""}`}
                      onClick={() => setSide("NO")}
                      data-testid="button-side-no"
                    >
                      NO (Short)
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Stake Amount (USD)
                    </label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={stake}
                      onChange={(e) => setStake(e.target.value)}
                      className="bg-input/50 border-border/40 font-mono text-lg"
                      data-testid="input-stake"
                    />
                    <div className="flex gap-2">
                      {[50, 100, 250, 500].map((val) => (
                        <Button
                          key={val}
                          variant="outline"
                          size="sm"
                          onClick={() => setStake(val.toString())}
                          className="flex-1 text-xs"
                          data-testid={`button-stake-${val}`}
                        >
                          ${val}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Lock Date (00:00 GMT)
                    </label>
                    <Input
                      type="date"
                      min={today}
                      onChange={(e) => setLockDate(parseDateToGMT(e.target.value))}
                      className="bg-input/50 border-border/40 font-mono"
                      data-testid="input-lock-date"
                    />
                    {lockDate && (
                      <p className="text-xs text-muted-foreground">
                        Position locks: {formatLockDate(lockDate)} at 00:00 GMT
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Leverage
                      </label>
                      <span className="text-accent font-bold font-mono">{leverage}x</span>
                    </div>
                    <Slider
                      value={[leverage]}
                      onValueChange={([val]) => setLeverage(val)}
                      min={1}
                      max={50}
                      step={1}
                      className="py-2"
                      data-testid="slider-leverage"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>1x</span>
                      <span>25x</span>
                      <span>50x</span>
                    </div>
                  </div>

                  <div className="glass-card rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Stake</span>
                      <span className="font-mono">${parsedStake.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Leverage</span>
                      <span className="font-mono text-accent">{leverage}x</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Notional Size</span>
                      <span className="font-mono">${notionalSize.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Entry Probability</span>
                      <span className="font-mono">{probability}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Lock Date</span>
                      <span className="font-mono">{formatLockDate(lockDate)}</span>
                    </div>
                    <div className="border-t border-white/10 pt-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Est. PnL Range (±10%)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-sm ${pnlRange.min < 0 ? 'text-destructive' : 'text-primary'}`}>
                          {pnlRange.min >= 0 ? '+' : ''}${pnlRange.min.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground text-xs">to</span>
                        <span className={`font-mono text-sm ${pnlRange.max < 0 ? 'text-destructive' : 'text-primary'}`}>
                          {pnlRange.max >= 0 ? '+' : ''}${pnlRange.max.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full btn-glow"
                    size="lg"
                    onClick={handlePlaceOrder}
                    disabled={placeOrderMutation.isPending}
                    data-testid="button-place-order"
                  >
                    {placeOrderMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    {placeOrderMutation.isPending ? "Opening Position..." : isAuthenticated ? "Open Time-Lock Position" : "Connect Wallet"}
                  </Button>
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
