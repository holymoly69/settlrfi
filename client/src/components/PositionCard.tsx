import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useClosePosition, usePartialClosePosition } from "@/hooks/use-markets";
import { useToast } from "@/hooks/use-toast";
import clsx from "clsx";
import type { Position, Market } from "@shared/schema";

interface PositionCardProps {
  position: Position & { market?: Market };
  currentPrice?: number;
}

export function PositionCard({ position, currentPrice }: PositionCardProps) {
  const closePosition = useClosePosition();
  const partialClose = usePartialClosePosition();
  const { toast } = useToast();
  const [showPartialClose, setShowPartialClose] = useState(false);
  const [closePercent, setClosePercent] = useState(50);

  const isLong = position.side === "YES";
  // Probabilities are normalized in usePositions hook, but TypeScript doesn't know
  const entryProb = typeof position.entryProbability === 'number' 
    ? position.entryProbability 
    : parseFloat(position.entryProbability.toString());
  const marketProb = position.market?.currentProbability;
  const normalizedMarketProb = marketProb !== undefined 
    ? (typeof marketProb === 'number' ? marketProb : parseFloat(marketProb.toString()))
    : 50;
  const currentProb = currentPrice ?? normalizedMarketProb;
  
  // size is already the leveraged notional, do NOT multiply by leverage again
  const unrealizedPnL = isLong
    ? (position.size * (currentProb - entryProb)) / 100
    : (position.size * (entryProb - currentProb)) / 100;

  const margin = Math.ceil(position.size / position.leverage);
  // PnL percentage is gain relative to total size (leveraged notional)
  const pnlPercent = position.size > 0 ? (unrealizedPnL / position.size) * 100 : 0;
  const isProfitable = unrealizedPnL >= 0;
  const isClosed = position.status === "closed" || position.status === "liquidated";

  // Liquidation warning logic
  const liqPrice = typeof position.liquidationProbability === 'number'
    ? position.liquidationProbability
    : parseFloat(position.liquidationProbability.toString());
  const distanceToLiq = Math.abs(currentProb - liqPrice);
  const isLiquidated = isLong 
    ? currentProb <= liqPrice 
    : currentProb >= liqPrice;
  const liqWarningThreshold = 5; // Warn when within 5 percentage points
  const liqDangerThreshold = 2; // Danger when within 2 percentage points
  const isNearLiquidation = !isClosed && !isLiquidated && distanceToLiq <= liqWarningThreshold;
  const isVeryNearLiquidation = !isClosed && !isLiquidated && distanceToLiq <= liqDangerThreshold;

  const handleClose = async () => {
    try {
      await closePosition.mutateAsync(position.id);
      toast({
        title: "Position Closed",
        description: `Successfully closed your ${position.side} position`,
      });
    } catch (error) {
      toast({
        title: "Failed to Close Position",
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

  const isPending = closePosition.isPending || partialClose.isPending;

  return (
    <Card 
      className={clsx(
        "p-4 flex flex-col gap-3",
        isClosed && "opacity-60",
        isVeryNearLiquidation && "border-destructive border-2 animate-pulse",
        isNearLiquidation && !isVeryNearLiquidation && "border-yellow-500 border"
      )}
      data-testid={`card-position-${position.id}`}
    >
      {isNearLiquidation && (
        <div className={clsx(
          "flex items-center gap-2 p-2 rounded text-sm font-medium",
          isVeryNearLiquidation 
            ? "bg-destructive/20 text-destructive" 
            : "bg-yellow-500/20 text-yellow-500"
        )} data-testid={`warning-liquidation-${position.id}`}>
          <AlertTriangle className="w-4 h-4" />
          {isVeryNearLiquidation 
            ? `DANGER: Liquidation imminent! Only ${distanceToLiq.toFixed(1)}% away`
            : `Warning: Approaching liquidation (${distanceToLiq.toFixed(1)}% away)`
          }
        </div>
      )}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <Link href={`/market/${position.marketId}`}>
          <span 
            className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-2 flex items-center gap-1"
            data-testid={`link-position-market-${position.id}`}
          >
            {position.market?.question || `Market #${position.marketId}`}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </span>
        </Link>
        <Badge 
          variant={position.side === "YES" ? "default" : "destructive"}
          className="flex-shrink-0"
          data-testid={`badge-position-side-${position.id}`}
        >
          {position.side} {position.leverage}x
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mb-1">Size</p>
          <p className="font-mono font-medium" data-testid={`text-position-size-${position.id}`}>
            ${position.size.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mb-1">Entry</p>
          <p className="font-mono" data-testid={`text-position-entry-${position.id}`}>
            {entryProb}%
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mb-1">Current</p>
          <p className="font-mono" data-testid={`text-position-current-${position.id}`}>
            {typeof currentProb === 'number' ? currentProb.toFixed(1) : currentProb}%
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
            data-testid={`text-position-pnl-${position.id}`}
          >
            {isClosed ? (
              <>
                {(position.pnl ?? 0) >= 0 ? "+" : ""}${(position.pnl ?? 0).toFixed(2)}
              </>
            ) : (
              <>
                {isProfitable ? "+" : ""}${unrealizedPnL.toFixed(2)}
                <span className="text-xs opacity-70 ml-1">
                  ({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}%)
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
        <span className="text-xs text-muted-foreground font-mono" data-testid={`text-position-date-${position.id}`}>
          {isClosed ? "Closed" : "Opened"}{" "}
          {position.createdAt ? formatDistanceToNow(new Date(position.createdAt), { addSuffix: true }) : ""}
        </span>
        
        {!isClosed && !showPartialClose && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPartialClose(true)}
              disabled={isPending}
              data-testid={`button-partial-close-${position.id}`}
            >
              Partial
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleClose}
              disabled={isPending}
              data-testid={`button-close-position-${position.id}`}
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Close All"
              )}
            </Button>
          </div>
        )}

        {isClosed && (
          <Badge variant="secondary" data-testid={`badge-position-status-${position.id}`}>
            {position.status === "liquidated" ? "Liquidated" : "Closed"}
          </Badge>
        )}
      </div>

      {!isClosed && showPartialClose && (
        <div className="space-y-3 pt-3 mt-3 border-t border-border/40">
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
      )}
    </Card>
  );
}
