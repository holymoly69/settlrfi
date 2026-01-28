import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";
import { useClosePosition, usePartialClosePosition } from "@/hooks/use-markets";
import { useToast } from "@/hooks/use-toast";
import clsx from "clsx";
import type { Position, Market } from "@shared/schema";

interface MarketPositionCardProps {
  position: Position & { market?: Market };
  currentPrice: number;
}

export function MarketPositionCard({ position, currentPrice }: MarketPositionCardProps) {
  const closePosition = useClosePosition();
  const partialClose = usePartialClosePosition();
  const { toast } = useToast();
  const [showPartialClose, setShowPartialClose] = useState(false);
  const [closePercent, setClosePercent] = useState(50);

  const isLong = position.side === "YES";
  // entryProbability is normalized to number in usePositions hook, but TypeScript doesn't know
  const entryProb = typeof position.entryProbability === 'number' 
    ? position.entryProbability 
    : parseFloat(position.entryProbability.toString());
  const currentProb = currentPrice;
  
  // size is already the leveraged notional, do NOT multiply by leverage again
  const unrealizedPnL = isLong
    ? (position.size * (currentProb - entryProb)) / 100
    : (position.size * (entryProb - currentProb)) / 100;

  // margin is the actual capital at risk
  const margin = Math.ceil(position.size / position.leverage);
  // PnL percentage is gain relative to total size (leveraged notional)
  const pnlPercent = position.size > 0 ? (unrealizedPnL / position.size) * 100 : 0;
  const isProfitable = unrealizedPnL >= 0;
  const isClosed = position.status === "closed" || position.status === "liquidated";

  const handleClose = async () => {
    try {
      await closePosition.mutateAsync(position.id);
      toast({
        title: "Position Closed",
        description: `Closed ${position.side} position with ${unrealizedPnL >= 0 ? "+" : ""}$${unrealizedPnL.toFixed(2)} PnL`,
      });
    } catch (error) {
      toast({
        title: "Failed to Close",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handlePartialClose = async () => {
    try {
      await partialClose.mutateAsync({ id: position.id, percent: closePercent });
      const closeSize = Math.floor(position.size * (closePercent / 100));
      toast({
        title: "Partial Close Complete",
        description: `Closed ${closePercent}% ($${closeSize}) of your position`,
      });
      setShowPartialClose(false);
    } catch (error) {
      toast({
        title: "Failed to Close",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  if (isClosed) return null;

  const isPending = closePosition.isPending || partialClose.isPending;

  return (
    <Card className="p-4 border border-border/60" data-testid={`card-market-position-${position.id}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Badge 
            variant={position.side === "YES" ? "default" : "destructive"}
            data-testid={`badge-position-side-${position.id}`}
          >
            {position.side} {position.leverage}x
          </Badge>
          <span className="text-sm text-muted-foreground font-mono">
            ${margin.toLocaleString()} margin
          </span>
        </div>
        <div 
          className={clsx(
            "text-right font-mono font-bold text-lg",
            isProfitable ? "text-primary" : "text-destructive"
          )}
          data-testid={`text-position-pnl-${position.id}`}
        >
          {isProfitable ? "+" : ""}${unrealizedPnL.toFixed(2)}
          <span className="text-xs opacity-70 ml-1">
            ({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}%)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm mb-4">
        <div>
          <p className="text-muted-foreground text-xs mb-1">Entry</p>
          <p className="font-mono">{entryProb}%</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs mb-1">Current</p>
          <p className="font-mono">{currentProb.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs mb-1">Liq. Price</p>
          <p className="font-mono text-destructive">{position.liquidationProbability}%</p>
        </div>
      </div>

      {showPartialClose ? (
        <div className="space-y-4 pt-3 border-t border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Close amount:</span>
            <span className="font-mono font-bold">{closePercent}%</span>
          </div>
          <Slider
            value={[closePercent]}
            onValueChange={([val]) => setClosePercent(val)}
            min={10}
            max={100}
            step={10}
            className="w-full"
            data-testid={`slider-partial-close-${position.id}`}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>${Math.floor(position.size * (closePercent / 100)).toLocaleString()} closing</span>
            <span>${Math.floor(position.size * ((100 - closePercent) / 100)).toLocaleString()} remaining</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPartialClose(false)}
              disabled={isPending}
              className="flex-1"
              data-testid={`button-cancel-partial-${position.id}`}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handlePartialClose}
              disabled={isPending}
              className="flex-1"
              data-testid={`button-confirm-partial-${position.id}`}
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : `Close ${closePercent}%`}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPartialClose(true)}
            disabled={isPending}
            className="flex-1"
            data-testid={`button-partial-close-${position.id}`}
          >
            Partial Close
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleClose}
            disabled={isPending}
            className="flex-1"
            data-testid={`button-close-position-${position.id}`}
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Close All"}
          </Button>
        </div>
      )}
    </Card>
  );
}
