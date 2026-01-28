import { useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp } from "lucide-react";

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CandlestickChartProps {
  marketId: number;
  currentProbability: number;
}

type TimeFrame = "1H" | "4H" | "1D" | "1W";
type ChartMode = "line" | "candle";

function generateCandleData(basePrice: number, count: number, volatility: number): CandleData[] {
  const data: CandleData[] = [];
  let price = basePrice;
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 15 * 60 * 1000);
    const timeStr = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

    const change = (Math.random() - 0.5) * volatility;
    const open = Math.max(1, Math.min(99, price));
    const close = Math.max(1, Math.min(99, price + change));
    const high = Math.max(open, close) + Math.random() * (volatility / 2);
    const low = Math.min(open, close) - Math.random() * (volatility / 2);

    data.push({
      time: timeStr,
      open: Math.round(open * 10) / 10,
      high: Math.min(99, Math.round(high * 10) / 10),
      low: Math.max(1, Math.round(low * 10) / 10),
      close: Math.round(close * 10) / 10,
      volume: Math.floor(Math.random() * 50000) + 10000,
    });

    price = close;
  }

  return data;
}

const CustomCandleShape = (props: any) => {
  const { x, y, width, payload } = props;
  if (!payload) return null;

  const { open, close, high, low } = payload;
  const isUp = close >= open;
  const color = isUp ? "hsl(var(--primary))" : "hsl(var(--destructive))";
  
  const yScale = (val: number) => {
    const range = props.yAxisDomain || [0, 100];
    const height = props.height || 300;
    return height - ((val - range[0]) / (range[1] - range[0])) * height;
  };

  const candleTop = Math.max(open, close);
  const candleBottom = Math.min(open, close);
  const candleHeight = Math.max(2, Math.abs(close - open) * 2.5);

  return (
    <g>
      <line
        x1={x + width / 2}
        y1={y - (high - candleTop) * 2.5}
        x2={x + width / 2}
        y2={y + candleHeight + (candleBottom - low) * 2.5}
        stroke={color}
        strokeWidth={1}
      />
      <rect
        x={x + 2}
        y={y}
        width={Math.max(width - 4, 4)}
        height={Math.max(candleHeight, 2)}
        fill={isUp ? color : color}
        stroke={color}
        strokeWidth={1}
        rx={1}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload[0]) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-card border border-border/60 rounded p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-2 font-mono">{data.time}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted-foreground">Open:</span>
        <span className="font-mono text-right">{data.open}%</span>
        <span className="text-muted-foreground">High:</span>
        <span className="font-mono text-right text-primary">{data.high}%</span>
        <span className="text-muted-foreground">Low:</span>
        <span className="font-mono text-right text-destructive">{data.low}%</span>
        <span className="text-muted-foreground">Close:</span>
        <span className={`font-mono text-right ${data.close >= data.open ? "text-primary" : "text-destructive"}`}>
          {data.close}%
        </span>
      </div>
      {data.volume && (
        <div className="mt-2 pt-2 border-t border-border/40 text-xs">
          <span className="text-muted-foreground">Volume: </span>
          <span className="font-mono">${data.volume.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export function CandlestickChart({ marketId, currentProbability }: CandlestickChartProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("1H");
  const [chartMode, setChartMode] = useState<ChartMode>("line");

  const candleCount = useMemo(() => {
    switch (timeFrame) {
      case "1H": return 12;
      case "4H": return 24;
      case "1D": return 48;
      case "1W": return 84;
      default: return 24;
    }
  }, [timeFrame]);

  const volatility = useMemo(() => {
    switch (timeFrame) {
      case "1H": return 3;
      case "4H": return 5;
      case "1D": return 8;
      case "1W": return 12;
      default: return 5;
    }
  }, [timeFrame]);

  const chartData = useMemo(
    () => generateCandleData(currentProbability, candleCount, volatility),
    [currentProbability, candleCount, volatility, marketId]
  );

  const minVal = Math.max(0, Math.min(...chartData.map(d => d.low)) - 5);
  const maxVal = Math.min(100, Math.max(...chartData.map(d => d.high)) + 5);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-sm text-muted-foreground">Current Probability</div>
          <div className={`text-3xl font-mono font-bold ${currentProbability > 50 ? "text-primary" : "text-destructive"}`}>
            {currentProbability}%
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1">
            {(["1H", "4H", "1D", "1W"] as TimeFrame[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFrame(tf)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors border ${
                  timeFrame === tf
                    ? "bg-primary text-primary-foreground border-primary/60"
                    : "bg-transparent text-muted-foreground border-border/60 hover:text-foreground hover:border-border/80"
                }`}
                data-testid={`button-timeframe-${tf}`}
              >
                {tf}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={chartMode === "line" ? "secondary" : "ghost"}
              className={`gap-1 text-xs h-8 px-3 ${chartMode === "line" ? "text-white" : "text-muted-foreground"}`}
              onClick={() => setChartMode("line")}
              data-testid="button-chart-mode-line"
            >
              <TrendingUp className="h-3 w-3" />
              Line
            </Button>
            <Button
              size="sm"
              variant={chartMode === "candle" ? "secondary" : "ghost"}
              className={`gap-1 text-xs h-8 px-3 ${chartMode === "candle" ? "text-white" : "text-muted-foreground"}`}
              onClick={() => setChartMode("candle")}
              data-testid="button-chart-mode-candle"
            >
              <BarChart3 className="h-3 w-3" />
              Candle
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[minVal, maxVal]}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={50}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            {chartMode === "line" ? (
              <Line
                type="monotone"
                dataKey="close"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                filter="url(#glow)"
              />
            ) : (
              <Bar
                dataKey="close"
                shape={<CustomCandleShape height={280} yAxisDomain={[minVal, maxVal]} />}
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.close >= entry.open ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                  />
                ))}
              </Bar>
            )}
            {chartMode === "line" && (
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground border-t border-border/40 pt-2">
        <div className="flex items-center gap-4">
          {chartMode === "candle" && (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-primary"></span>
                Bullish
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-destructive"></span>
                Bearish
              </span>
            </>
          )}
          {chartMode === "line" && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-primary animate-pulse"></span>
              Live Price
            </span>
          )}
        </div>
        <span className="font-mono">TradingView Style</span>
      </div>
    </div>
  );
}
