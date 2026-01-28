import { useState, useMemo } from "react";
import { useMarkets, useCreateCustomCombo } from "@/hooks/use-markets";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Search, Plus, X, AlertTriangle, Layers, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Market, CustomComboLeg } from "@shared/schema";

function calculateCombo(legs: { price: number; side: "YES" | "NO" }[]) {
  let impliedProb = 1;
  legs.forEach(leg => {
    const legProb = leg.side === "YES" ? leg.price / 100 : (100 - leg.price) / 100;
    impliedProb *= legProb;
  });
  const multiplier = impliedProb > 0 ? 1 / impliedProb : 999;
  return { impliedProbability: impliedProb * 100, multiplier: Math.min(multiplier, 999) };
}

interface ComboBuilderProps {
  onComboCreated?: () => void;
}

export function ComboBuilder({ onComboCreated }: ComboBuilderProps) {
  const [open, setOpen] = useState(false);
  const [comboName, setComboName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLegs, setSelectedLegs] = useState<CustomComboLeg[]>([]);
  
  const { data: markets, isLoading: marketsLoading } = useMarkets();
  const createCombo = useCreateCustomCombo();
  const { toast } = useToast();

  const filteredMarkets = useMemo(() => {
    if (!markets) return [];
    return markets.filter(m => {
      if (!searchQuery) return true;
      return m.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [markets, searchQuery]);

  const comboStats = useMemo(() => {
    if (selectedLegs.length === 0) {
      return { impliedProbability: 0, multiplier: 0 };
    }
    return calculateCombo(selectedLegs);
  }, [selectedLegs]);

  const isMarketSelected = (marketId: number) => {
    return selectedLegs.some(leg => leg.marketId === marketId);
  };

  const addLeg = (market: Market, side: "YES" | "NO") => {
    if (selectedLegs.length >= 10) {
      toast({
        title: "Maximum legs reached",
        description: "A combo can have at most 10 legs.",
        variant: "destructive",
      });
      return;
    }

    if (isMarketSelected(market.id)) {
      toast({
        title: "Market already added",
        description: "This market is already in your combo.",
        variant: "destructive",
      });
      return;
    }

    const newLeg: CustomComboLeg = {
      marketId: market.id,
      marketName: market.question,
      side,
      price: market.currentProbability,
    };

    setSelectedLegs([...selectedLegs, newLeg]);
  };

  const removeLeg = (marketId: number) => {
    setSelectedLegs(selectedLegs.filter(leg => leg.marketId !== marketId));
  };

  const handleCreateCombo = async () => {
    if (!comboName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your combo.",
        variant: "destructive",
      });
      return;
    }

    if (selectedLegs.length < 2) {
      toast({
        title: "More legs needed",
        description: "A combo needs at least 2 legs.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createCombo.mutateAsync({
        name: comboName.trim(),
        legs: selectedLegs,
      });

      toast({
        title: "Combo created!",
        description: `Your combo "${comboName}" has been created.`,
      });

      setComboName("");
      setSelectedLegs([]);
      setOpen(false);
      onComboCreated?.();
    } catch (error) {
      toast({
        title: "Failed to create combo",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const resetAndClose = () => {
    setComboName("");
    setSelectedLegs([]);
    setSearchQuery("");
    setOpen(false);
  };

  const canCreate = comboName.trim() && selectedLegs.length >= 2 && selectedLegs.length <= 10;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetAndClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <button 
          className="terminal-btn flex items-center gap-2"
          data-testid="button-build-custom-combo"
        >
          <Plus className="w-4 h-4" />
          Build Custom Combo
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] sm:h-[90vh] flex flex-col overflow-hidden bg-[#000000] border border-[#66ff66] p-0">
        <DialogHeader className="p-4 border-b border-[#66ff66]">
          <DialogTitle className="flex items-center gap-2 text-[#66ff66] font-mono">
            <Layers className="w-5 h-5" />
            [ BUILD CUSTOM COMBO ]
          </DialogTitle>
          <DialogDescription className="text-[#66ff66]/70 font-mono text-sm">
            Select 2-10 markets to create your custom parlay. All legs must hit for the combo to pay out.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden p-4">
          <input
            placeholder="> Enter combo name (e.g., 'Crypto Moon Shot')"
            value={comboName}
            onChange={(e) => setComboName(e.target.value)}
            className="terminal-input"
            data-testid="input-combo-name"
          />

          <div className="flex flex-col sm:flex-row gap-4 flex-1 overflow-auto">
            <div className="flex-1 flex flex-col min-h-[300px] sm:min-h-0">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-mono text-sm text-[#66ff66]">[ AVAILABLE MARKETS ]</h3>
                <span className="border border-[#66ff66] px-2 py-0.5 text-xs font-mono text-[#66ff66]">
                  {filteredMarkets.length}
                </span>
              </div>
              
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#66ff66]/50" />
                <input
                  placeholder="> Search markets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="terminal-input pl-9"
                  data-testid="input-search-markets"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-2" style={{ scrollbarColor: '#66ff66 #000000' }}>
                <div className="space-y-2">
                  {marketsLoading ? (
                    <div className="text-center py-8 text-[#66ff66]/50 font-mono">Loading markets...</div>
                  ) : filteredMarkets.length === 0 ? (
                    <div className="text-center py-8 text-[#66ff66]/50 font-mono">No markets found</div>
                  ) : (
                    filteredMarkets.map((market) => {
                      const isSelected = isMarketSelected(market.id);
                      return (
                        <div
                          key={market.id}
                          className={`p-3 border ${isSelected ? 'bg-[#66ff66]/10 border-[#66ff66]' : 'border-[#66ff66]/30'} transition-colors`}
                          data-testid={`market-row-${market.id}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-mono text-[#66ff66]">{market.question}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="border border-[#66ff66]/50 px-2 py-0.5 text-xs font-mono text-[#66ff66]/70">{market.category}</span>
                                <span className="text-xs text-[#66ff66]/50 font-mono">
                                  {market.currentProbability}%
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                disabled={isSelected}
                                onClick={() => addLeg(market, "YES")}
                                className="border border-[#66ff66] bg-transparent text-[#66ff66] px-3 py-1 text-sm font-mono flex items-center gap-1 hover:bg-[#66ff66] hover:text-[#000000] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                data-testid={`button-add-yes-${market.id}`}
                              >
                                <Plus className="w-3 h-3" />
                                YES
                              </button>
                              <button
                                disabled={isSelected}
                                onClick={() => addLeg(market, "NO")}
                                className="border border-[#ff0000] bg-transparent text-[#ff0000] px-3 py-1 text-sm font-mono flex items-center gap-1 hover:bg-[#ff0000] hover:text-[#000000] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                data-testid={`button-add-no-${market.id}`}
                              >
                                <Plus className="w-3 h-3" />
                                NO
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="w-full sm:w-80 flex flex-col sm:border-l border-t sm:border-t-0 border-[#66ff66]/30 pt-4 sm:pt-0 sm:pl-4 min-h-0">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-mono text-sm text-[#66ff66]">[ SELECTED LEGS ]</h3>
                <span className="border border-[#66ff66] px-2 py-0.5 text-xs font-mono text-[#66ff66]">
                  {selectedLegs.length}/10
                </span>
              </div>

              <div className="flex-1 overflow-y-auto pr-2" style={{ scrollbarColor: '#66ff66 #000000' }}>
                {selectedLegs.length === 0 ? (
                  <div className="text-center py-8 text-[#66ff66]/50 text-sm font-mono">
                    Add markets to build your combo
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedLegs.map((leg, index) => (
                      <div
                        key={leg.marketId}
                        className="p-3 border border-[#66ff66]/50 bg-[#000000]"
                        data-testid={`selected-leg-${leg.marketId}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-[#66ff66]/50 font-mono">LEG_{index + 1}</span>
                              <span
                                className={`border px-2 py-0.5 text-xs font-mono ${
                                  leg.side === "YES" 
                                    ? "border-[#66ff66] text-[#66ff66]" 
                                    : "border-[#ff0000] text-[#ff0000]"
                                }`}
                                data-testid={`badge-side-${leg.marketId}`}
                              >
                                {leg.side}
                              </span>
                            </div>
                            <p className="text-sm font-mono text-[#66ff66] truncate">{leg.marketName}</p>
                            <span className="text-xs font-mono text-[#66ff66]/50">
                              {leg.price}%
                            </span>
                          </div>
                          <button
                            onClick={() => removeLeg(leg.marketId)}
                            className="text-[#66ff66]/50 hover:text-[#ff0000] transition-colors flex-shrink-0 p-1"
                            data-testid={`button-remove-leg-${leg.marketId}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedLegs.length >= 2 && (
                <div className="mt-4 p-4 border border-[#66ff66] bg-[#000000] space-y-3" data-testid="combo-stats">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#66ff66]/70 font-mono">IMPL_PROB:</span>
                    <span 
                      className={`font-mono font-bold ${comboStats.impliedProbability > 10 ? 'text-[#66ff66]' : 'text-[#66ff66]/50'}`}
                      data-testid="text-implied-probability"
                    >
                      {comboStats.impliedProbability.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#66ff66]/70 font-mono">MULTIPLIER:</span>
                    <span className="font-mono font-bold text-lg text-[#66ff66]" data-testid="text-multiplier">
                      {comboStats.multiplier.toFixed(2)}x
                    </span>
                  </div>
                  {comboStats.impliedProbability < 1 && (
                    <div className="flex items-center gap-2 text-[#ffff00] text-xs font-mono" data-testid="warning-low-probability">
                      <AlertTriangle className="w-4 h-4" />
                      WARNING: Very low probability - high risk
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-[#66ff66]">
          <button 
            onClick={resetAndClose} 
            className="border border-[#66ff66]/50 bg-transparent text-[#66ff66] px-4 py-2 font-mono hover:border-[#66ff66] transition-colors"
            data-testid="button-cancel"
          >
            [ CANCEL ]
          </button>
          <button
            onClick={handleCreateCombo}
            disabled={!canCreate || createCombo.isPending}
            className="border border-[#66ff66] bg-[#66ff66] text-[#000000] px-4 py-2 font-mono font-bold hover:bg-transparent hover:text-[#66ff66] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            data-testid="button-create-combo"
          >
            {createCombo.isPending ? (
              "CREATING..."
            ) : (
              <>
                <Zap className="w-4 h-4" />
                [ CREATE COMBO ]
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
