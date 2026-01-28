import { useState } from "react";
import { type Market } from "@shared/schema";
import { useCreatePosition, useCreateOrder, useCrossMarginMetrics, type CreateOrderInput } from "@/hooks/use-markets";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Wallet, ArrowRight, Zap, TrendingUp, TrendingDown, AlertTriangle, Clock, Layers, Target } from "lucide-react";
import { z } from "zod";

type OrderType = "market" | "limit" | "iceberg" | "twap";

interface OrderFormProps {
  market: Market;
}

export function OrderForm({ market }: OrderFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState<string>("100");
  const [leverage, setLeverage] = useState([1]);
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [clipSize, setClipSize] = useState<string>("");
  const [twapDuration, setTwapDuration] = useState<string>("60");
  const [twapInterval, setTwapInterval] = useState<string>("30");
  
  const createPosition = useCreatePosition();
  const createOrder = useCreateOrder();
  const { data: marginMetrics } = useCrossMarginMetrics();

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(balance);
  };

  const cashBalance = parseFloat(user?.balance || "0") || 0;
  const freeMargin = marginMetrics?.freeMargin ?? cashBalance;
  const currentProb = parseFloat(String(market.currentProbability)) || 50;
  const leverageVal = leverage[0];
  const size = parseFloat(amount) || 0;
  const totalNotional = size * leverageVal;
  
  const liquidationBuffer = 100 / leverageVal;
  let liqProb = 0;
  if (side === "YES") {
    liqProb = Math.max(0, currentProb - liquidationBuffer);
  } else {
    liqProb = Math.min(100, currentProb + liquidationBuffer);
  }
  liqProb = Math.round(liqProb * 100) / 100;

  const validateAdvancedInputs = (): string | null => {
    if (orderType === "limit") {
      const price = parseFloat(limitPrice);
      if (isNaN(price) || price < 0 || price > 100) {
        return "Limit price must be between 0 and 100%";
      }
    }
    if (orderType === "iceberg") {
      const clip = parseFloat(clipSize);
      if (isNaN(clip) || clip <= 0) {
        return "Clip size must be greater than 0";
      }
      if (clip >= totalNotional) {
        return "Clip size must be less than total position size";
      }
      // Validate limit price if provided (required for controlled execution)
      if (limitPrice) {
        const price = parseFloat(limitPrice);
        if (isNaN(price) || price < 0 || price > 100) {
          return "Limit price must be between 0 and 100%";
        }
      }
    }
    if (orderType === "twap") {
      const duration = parseFloat(twapDuration);
      const interval = parseFloat(twapInterval);
      if (isNaN(duration) || duration <= 0) {
        return "Duration must be greater than 0 minutes";
      }
      if (isNaN(interval) || interval <= 0) {
        return "Interval must be greater than 0 seconds";
      }
      if (interval > duration * 60) {
        return "Interval cannot be longer than total duration";
      }
    }
    return null;
  };

  const handlePlaceOrder = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please connect your wallet to trade.",
        variant: "destructive",
      });
      return;
    }

    const numAmount = z.coerce.number().safeParse(amount);
    if (!numAmount.success || numAmount.data <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid investment amount.",
        variant: "destructive",
      });
      return;
    }

    if (numAmount.data > freeMargin) {
      toast({
        title: "Insufficient Margin",
        description: `Maximum trade size is $${Math.floor(freeMargin).toLocaleString()} (your free margin).`,
        variant: "destructive",
      });
      return;
    }

    const validationError = validateAdvancedInputs();
    if (validationError) {
      toast({
        title: "Invalid Order Parameters",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    const positionSize = numAmount.data * leverageVal;

    if (orderType === "market") {
      createPosition.mutate({
        marketId: market.id,
        side,
        size: positionSize,
        leverage: leverageVal,
      }, {
        onSuccess: () => {
          toast({
            title: "Position Opened",
            description: `${leverageVal}x ${side} position for $${amount}`,
          });
          resetForm();
        },
        onError: (error) => {
          toast({
            title: "Order Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      });
    } else {
      const orderData: CreateOrderInput = {
        marketId: market.id,
        orderType,
        side,
        totalSize: positionSize,
        leverage: leverageVal,
      };

      if (orderType === "limit") {
        orderData.limitPrice = parseFloat(limitPrice);
      }
      if (orderType === "iceberg") {
        orderData.visibleSize = parseFloat(clipSize);
        // Iceberg orders use limit price for execution control
        if (limitPrice) {
          orderData.limitPrice = parseFloat(limitPrice);
        }
      }
      if (orderType === "twap") {
        orderData.twapDurationMs = parseFloat(twapDuration) * 60 * 1000;
        orderData.twapIntervalMs = parseFloat(twapInterval) * 1000;
      }

      createOrder.mutate(orderData, {
        onSuccess: () => {
          const orderTypeLabel = orderType.toUpperCase();
          toast({
            title: "Order Placed",
            description: `${orderTypeLabel} order: ${leverageVal}x ${side} for $${amount}`,
          });
          resetForm();
        },
        onError: (error) => {
          toast({
            title: "Order Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      });
    }
  };

  const resetForm = () => {
    setAmount("100");
    setLeverage([1]);
    setLimitPrice("");
    setClipSize("");
    setTwapDuration("60");
    setTwapInterval("30");
  };

  const isPending = createPosition.isPending || createOrder.isPending;
  const isYes = side === "YES";

  const getOrderTypeIcon = (type: OrderType) => {
    switch (type) {
      case "market": return <Zap className="w-3 h-3" />;
      case "limit": return <Target className="w-3 h-3" />;
      case "iceberg": return <Layers className="w-3 h-3" />;
      case "twap": return <Clock className="w-3 h-3" />;
    }
  };

  const getButtonText = () => {
    if (isPending) {
      return orderType === "market" ? "Opening Position..." : "Placing Order...";
    }
    if (orderType === "market") {
      return isYes ? "Open Long" : "Open Short";
    }
    return `Place ${orderType.toUpperCase()} Order`;
  };

  return (
    <div 
      className="overflow-hidden flex flex-col" 
      style={{ backgroundColor: '#000000', border: '1px solid #66ff66' }}
      data-testid="order-form"
    >
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #66ff66' }}>
        <h3 className="font-mono font-semibold flex items-center gap-2" style={{ color: '#66ff66' }}>
          <Zap className="h-4 w-4" style={{ color: '#66ff66' }} />
          Place Order
        </h3>
        <div className="flex items-center gap-1 text-xs font-mono" style={{ color: marginMetrics ? '#66ff66' : '#444444' }}>
          <Wallet className="w-3 h-3" />
          {formatBalance(freeMargin)} {marginMetrics ? 'FREE' : ''}
        </div>
      </div>

      <div className="p-4 space-y-5">
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider font-mono" style={{ color: '#444444' }}>Order Type</label>
          <Select value={orderType} onValueChange={(val) => setOrderType(val as OrderType)}>
            <SelectTrigger 
              className="font-mono bg-black border-white/20 focus:border-[#66ff66]"
              data-testid="select-order-type"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-black border-[#66ff66]">
              <SelectItem value="market" className="font-mono">
                <span className="flex items-center gap-2">
                  <Zap className="w-3 h-3" style={{ color: '#66ff66' }} />
                  Market
                </span>
              </SelectItem>
              <SelectItem value="limit" className="font-mono">
                <span className="flex items-center gap-2">
                  <Target className="w-3 h-3" style={{ color: '#66ff66' }} />
                  Limit
                </span>
              </SelectItem>
              <SelectItem value="iceberg" className="font-mono">
                <span className="flex items-center gap-2">
                  <Layers className="w-3 h-3" style={{ color: '#66ff66' }} />
                  Iceberg
                </span>
              </SelectItem>
              <SelectItem value="twap" className="font-mono">
                <span className="flex items-center gap-2">
                  <Clock className="w-3 h-3" style={{ color: '#66ff66' }} />
                  TWAP
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide("YES")}
            data-testid="button-side-yes"
            className="py-3 font-bold font-mono flex items-center justify-center gap-2 transition-all"
            style={{
              backgroundColor: isYes ? '#66ff66' : '#000000',
              color: isYes ? '#000000' : '#66ff66',
              border: '1px solid #66ff66'
            }}
          >
            <TrendingUp className="w-4 h-4" />
            LONG
          </button>
          <button
            onClick={() => setSide("NO")}
            data-testid="button-side-no"
            className="py-3 font-bold font-mono flex items-center justify-center gap-2 transition-all"
            style={{
              backgroundColor: !isYes ? '#ff3366' : '#000000',
              color: !isYes ? '#000000' : '#ff3366',
              border: '1px solid #ff3366'
            }}
          >
            <TrendingDown className="w-4 h-4" />
            SHORT
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Margin (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
            <Input 
              type="number"
              value={amount}
              onChange={(e) => {
                const val = e.target.value;
                const num = parseFloat(val) || 0;
                if (num <= freeMargin) {
                  setAmount(val);
                }
              }}
              className="pl-6 font-mono bg-black/30 border-white/10 focus:border-accent/50 text-lg h-12"
              placeholder="0.00"
              data-testid="input-amount"
            />
            <Button 
              size="sm" 
              variant="ghost" 
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-xs text-accent"
              onClick={() => setAmount(Math.floor(freeMargin).toString())}
              data-testid="button-max"
            >
              MAX
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[11px] uppercase tracking-wider font-mono" style={{ color: '#444444' }}>Leverage</label>
            <span 
              className="text-sm font-bold font-mono px-3 py-1"
              style={{
                backgroundColor: '#000000',
                border: '1px solid #66ff66',
                color: '#66ff66'
              }}
              data-testid="text-leverage"
            >
              {leverageVal}x
            </span>
          </div>
          <Slider
            value={leverage}
            onValueChange={setLeverage}
            max={50}
            min={1}
            step={1}
            className="py-3"
            data-testid="slider-leverage"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>1x</span>
            <span>10x</span>
            <span>25x</span>
            <span>50x</span>
          </div>
        </div>

        {(orderType === "limit" || orderType === "iceberg") && (
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider font-mono" style={{ color: '#444444' }}>
              {orderType === "iceberg" ? "Limit Price (max fill price)" : "Limit Price (0-100%)"}
            </label>
            <div className="relative">
              <Input 
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="pr-8 font-mono bg-black/30 border-white/10 focus:border-[#66ff66] h-10"
                placeholder={currentProb.toFixed(1)}
                min={0}
                max={100}
                step={0.1}
                data-testid="input-limit-price"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">%</span>
            </div>
            <p className="text-[10px] font-mono" style={{ color: '#444444' }}>
              Current: {currentProb.toFixed(2)}%
              {orderType === "iceberg" && " | Clips fill only at or below this price"}
            </p>
          </div>
        )}

        {orderType === "iceberg" && (
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider font-mono" style={{ color: '#444444' }}>
              Clip Size (visible per fill)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
              <Input 
                type="number"
                value={clipSize}
                onChange={(e) => setClipSize(e.target.value)}
                className="pl-6 font-mono bg-black/30 border-white/10 focus:border-[#66ff66] h-10"
                placeholder="100"
                min={1}
                data-testid="input-clip-size"
              />
            </div>
            <p className="text-[10px] font-mono" style={{ color: '#444444' }}>
              Must be less than total size: ${totalNotional.toLocaleString()}
            </p>
          </div>
        )}

        {orderType === "twap" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider font-mono" style={{ color: '#444444' }}>
                Duration (min)
              </label>
              <Input 
                type="number"
                value={twapDuration}
                onChange={(e) => setTwapDuration(e.target.value)}
                className="font-mono bg-black/30 border-white/10 focus:border-[#66ff66] h-10"
                placeholder="60"
                min={1}
                data-testid="input-twap-duration"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider font-mono" style={{ color: '#444444' }}>
                Interval (sec)
              </label>
              <Input 
                type="number"
                value={twapInterval}
                onChange={(e) => setTwapInterval(e.target.value)}
                className="font-mono bg-black/30 border-white/10 focus:border-[#66ff66] h-10"
                placeholder="30"
                min={1}
                data-testid="input-twap-interval"
              />
            </div>
            <p className="col-span-2 text-[10px] font-mono" style={{ color: '#444444' }}>
              {Math.floor(parseFloat(twapDuration || "0") * 60 / parseFloat(twapInterval || "1"))} slices over {twapDuration || 0} minutes
            </p>
          </div>
        )}

        {leverageVal >= 20 && (
          <div 
            className="flex items-center gap-2 px-3 py-2"
            style={{ backgroundColor: '#000000', border: '1px solid #ff3366' }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#ff3366' }} />
            <span className="text-xs font-mono" style={{ color: '#ff3366' }}>High leverage increases liquidation risk</span>
          </div>
        )}

        <div className="space-y-2 pt-4 border-t border-white/5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {orderType === "limit" ? "Limit Price" : "Entry Price"}
            </span>
            <span className="font-mono">
              {orderType === "limit" && limitPrice ? `${parseFloat(limitPrice).toFixed(2)}%` : `${currentProb.toFixed(2)}%`}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Position Size</span>
            <span className="font-mono font-bold text-accent" data-testid="text-position-size">
              ${totalNotional.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Liquidation Price</span>
            <span className="font-mono text-destructive" data-testid="text-liquidation">
              {liqProb}%
            </span>
          </div>
          {orderType !== "market" && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Type</span>
              <span className="font-mono flex items-center gap-1" style={{ color: '#66ff66' }}>
                {getOrderTypeIcon(orderType)}
                {orderType.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4" style={{ borderTop: '1px solid #66ff66' }}>
        <button 
          className="w-full h-12 text-lg font-bold font-mono transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: isYes ? '#66ff66' : '#ff3366',
            color: '#000000',
            border: `1px solid ${isYes ? '#66ff66' : '#ff3366'}`,
            opacity: (isPending || size <= 0) ? 0.5 : 1,
            cursor: (isPending || size <= 0) ? 'not-allowed' : 'pointer'
          }}
          onClick={handlePlaceOrder}
          disabled={isPending || size <= 0}
          data-testid="button-place-order"
        >
          {isPending ? (
            <span className="animate-pulse">{getButtonText()}</span>
          ) : (
            <>
              {getButtonText()}
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
        <p className="mt-3 text-center text-[10px] font-mono flex items-center justify-center gap-1" style={{ color: '#444444' }}>
          <AlertCircle className="w-3 h-3" />
          Leverage trading involves significant risk
        </p>
      </div>
    </div>
  );
}
