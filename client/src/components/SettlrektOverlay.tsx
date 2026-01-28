import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, X } from "lucide-react";
import { useLiquidationStream, type LiquidationEvent } from "@/hooks/use-liquidation-stream";
import { Button } from "@/components/ui/button";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function truncateQuestion(question: string, maxLength: number = 40): string {
  if (question.length <= maxLength) return question;
  return question.slice(0, maxLength - 3) + "...";
}

export function SettlrektOverlay() {
  const [location] = useLocation();
  const { latestLiquidation } = useLiquidationStream();
  const [visibleEvent, setVisibleEvent] = useState<LiquidationEvent | null>(null);
  const [lastEventId, setLastEventId] = useState<number | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);

  // Hide on docs pages (both Hyperliquid and BSC)
  const isDocsPage = location === "/docs" || location.startsWith("/bsc/docs") || location === "/bsc/devdocs";
  
  useEffect(() => {
    if (isDisabled || isDocsPage) return;
    
    if (latestLiquidation && latestLiquidation.id !== lastEventId) {
      setVisibleEvent(latestLiquidation);
      setLastEventId(latestLiquidation.id);

      const timer = setTimeout(() => {
        setVisibleEvent(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [latestLiquidation, lastEventId, isDisabled, isDocsPage]);

  const handleTurnOff = () => {
    setIsDisabled(true);
    setVisibleEvent(null);
  };

  if (isDisabled || isDocsPage) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 pointer-events-none"
      data-testid="settlrekt-overlay-container"
    >
      <AnimatePresence>
        {visibleEvent && (
          <motion.div
            key={visibleEvent.id}
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="pointer-events-auto"
            data-testid={`settlrekt-notification-${visibleEvent.id}`}
          >
            <div className="bg-destructive/90 backdrop-blur-md border border-destructive rounded-md p-4 shadow-lg max-w-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Skull className="w-6 h-6 text-destructive-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-destructive-foreground text-sm" data-testid="settlrekt-title">
                    SETTLREKT!
                  </p>
                  <p className="text-destructive-foreground/90 text-sm mt-1" data-testid="settlrekt-message">
                    <span className="font-medium">{visibleEvent.user.displayName}</span>
                    {" "}liquidated{" "}
                    <span className="font-mono font-semibold">{formatCurrency(visibleEvent.size)}</span>
                    {" "}on{" "}
                    <span className="font-medium">"{truncateQuestion(visibleEvent.market.question)}"</span>
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleTurnOff}
                  className="flex-shrink-0 text-destructive-foreground/70 hover:text-destructive-foreground hover:bg-destructive-foreground/10"
                  data-testid="button-turn-off-rekt"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
