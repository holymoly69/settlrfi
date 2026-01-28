import { useEffect, useRef, useState, useMemo } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData, Time, CandlestickSeries, LineSeries } from "lightweight-charts";

interface TradingViewChartProps {
  marketId: number;
  currentProbability: number;
}

type TimeFrame = "5m" | "30m" | "1H" | "4H" | "1D" | "1W";
type ChartMode = "candle" | "line";

interface TimeFrameConfig {
  label: string;
  intervalMs: number;
  candleCount: number;
  volatility: number;
}

const timeFrameConfigs: Record<TimeFrame, TimeFrameConfig> = {
  "5m": { label: "5m", intervalMs: 5 * 60 * 1000, candleCount: 60, volatility: 1.5 },
  "30m": { label: "30m", intervalMs: 30 * 60 * 1000, candleCount: 48, volatility: 2.5 },
  "1H": { label: "1H", intervalMs: 60 * 60 * 1000, candleCount: 48, volatility: 3 },
  "4H": { label: "4H", intervalMs: 4 * 60 * 60 * 1000, candleCount: 42, volatility: 5 },
  "1D": { label: "1D", intervalMs: 24 * 60 * 60 * 1000, candleCount: 60, volatility: 8 },
  "1W": { label: "1W", intervalMs: 7 * 24 * 60 * 60 * 1000, candleCount: 52, volatility: 12 },
};

function generateCandleData(
  basePrice: number,
  config: TimeFrameConfig,
  marketId: number
): CandlestickData[] {
  const data: CandlestickData[] = [];
  let price = basePrice;
  const now = Date.now();
  const seed = marketId * 12345;

  const seededRandom = (i: number) => {
    const x = Math.sin(seed + i * 9999) * 10000;
    return x - Math.floor(x);
  };

  for (let i = config.candleCount - 1; i >= 0; i--) {
    const timestamp = Math.floor((now - i * config.intervalMs) / 1000) as Time;
    
    const change = (seededRandom(i) - 0.5) * config.volatility;
    const trendBias = (seededRandom(i + 1000) - 0.5) * 0.5;
    
    const open = Math.max(0.5, Math.min(99.5, price));
    const close = Math.max(0.5, Math.min(99.5, price + change + trendBias));
    const wickUp = seededRandom(i + 2000) * (config.volatility / 2);
    const wickDown = seededRandom(i + 3000) * (config.volatility / 2);
    const high = Math.min(99.5, Math.max(open, close) + wickUp);
    const low = Math.max(0.5, Math.min(open, close) - wickDown);

    data.push({
      time: timestamp,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
    });

    price = close;
  }

  if (data.length > 0) {
    const lastCandle = data[data.length - 1];
    lastCandle.close = basePrice;
    lastCandle.high = Math.max(lastCandle.high, basePrice);
    lastCandle.low = Math.min(lastCandle.low, basePrice);
  }

  return data;
}

function generateLineData(
  basePrice: number,
  config: TimeFrameConfig,
  marketId: number
): LineData[] {
  const candleData = generateCandleData(basePrice, config, marketId);
  return candleData.map(candle => ({
    time: candle.time,
    value: candle.close,
  }));
}

export function TradingViewChart({ marketId, currentProbability }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("1H");
  const [chartMode, setChartMode] = useState<ChartMode>("candle");

  const config = timeFrameConfigs[timeFrame];

  const candleData = useMemo(
    () => generateCandleData(currentProbability, config, marketId),
    [currentProbability, config, marketId]
  );

  const lineData = useMemo(
    () => generateLineData(currentProbability, config, marketId),
    [currentProbability, config, marketId]
  );

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#888888",
        fontFamily: "'JetBrains Mono', monospace",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(102, 255, 102, 0.1)" },
        horzLines: { color: "rgba(102, 255, 102, 0.1)" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#66ff66",
          width: 1,
          style: 2,
          labelBackgroundColor: "#1a1a1a",
        },
        horzLine: {
          color: "#66ff66",
          width: 1,
          style: 2,
          labelBackgroundColor: "#1a1a1a",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(102, 255, 102, 0.3)",
        scaleMargins: {
          top: 0.05,
          bottom: 0.05,
        },
        autoScale: true,
        entireTextOnly: true,
      },
      timeScale: {
        borderColor: "rgba(102, 255, 102, 0.3)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      lineSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;

    if (candleSeriesRef.current) {
      chartRef.current.removeSeries(candleSeriesRef.current);
      candleSeriesRef.current = null;
    }
    if (lineSeriesRef.current) {
      chartRef.current.removeSeries(lineSeriesRef.current);
      lineSeriesRef.current = null;
    }

    if (chartMode === "candle") {
      const candleSeries = chartRef.current.addSeries(CandlestickSeries, {
        upColor: "#66ff66",
        downColor: "#ff6666",
        borderUpColor: "#66ff66",
        borderDownColor: "#ff6666",
        wickUpColor: "#66ff66",
        wickDownColor: "#ff6666",
        priceFormat: {
          type: "custom",
          formatter: (price: number) => `${price.toFixed(2)}%`,
          minMove: 0.01,
        },
      });
      candleSeries.setData(candleData);
      candleSeriesRef.current = candleSeries;

      candleSeries.createPriceLine({
        price: 0,
        color: "rgba(102, 255, 102, 0.2)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "0%",
      });
      candleSeries.createPriceLine({
        price: 50,
        color: "rgba(136, 255, 255, 0.4)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "50%",
      });
      candleSeries.createPriceLine({
        price: 100,
        color: "rgba(102, 255, 102, 0.2)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "100%",
      });
    } else {
      const lineSeries = chartRef.current.addSeries(LineSeries, {
        color: "#88ffff",
        lineWidth: 2,
        priceFormat: {
          type: "custom",
          formatter: (price: number) => `${price.toFixed(2)}%`,
          minMove: 0.01,
        },
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: "#88ffff",
        crosshairMarkerBackgroundColor: "#000000",
      });
      lineSeries.setData(lineData);
      lineSeriesRef.current = lineSeries;

      lineSeries.createPriceLine({
        price: 0,
        color: "rgba(102, 255, 102, 0.2)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "0%",
      });
      lineSeries.createPriceLine({
        price: 50,
        color: "rgba(136, 255, 255, 0.4)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "50%",
      });
      lineSeries.createPriceLine({
        price: 100,
        color: "rgba(102, 255, 102, 0.2)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "100%",
      });
    }

    chartRef.current.timeScale().fitContent();
  }, [chartMode, candleData, lineData]);

  useEffect(() => {
    if (chartMode === "candle" && candleSeriesRef.current) {
      candleSeriesRef.current.setData(candleData);
      chartRef.current?.timeScale().fitContent();
    } else if (chartMode === "line" && lineSeriesRef.current) {
      lineSeriesRef.current.setData(lineData);
      chartRef.current?.timeScale().fitContent();
    }
  }, [timeFrame, candleData, lineData, chartMode]);

  const ohlcInfo = candleData.length > 0 ? candleData[candleData.length - 1] : null;
  const priceChange = ohlcInfo && candleData.length > 1 
    ? ohlcInfo.close - candleData[candleData.length - 2].close 
    : 0;

  return (
    <div className="flex flex-col h-full font-mono">
      <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#444444" }}>
            PROBABILITY
          </div>
          <div className="flex items-baseline gap-2">
            <span 
              className="text-3xl font-bold"
              style={{ color: "#88ffff" }}
              data-testid="text-chart-probability"
            >
              {currentProbability.toFixed(2)}%
            </span>
            {priceChange !== 0 && (
              <span 
                className="text-sm"
                style={{ color: priceChange >= 0 ? "#66ff66" : "#ff6666" }}
              >
                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex gap-1" style={{ border: "1px solid rgba(102, 255, 102, 0.3)", padding: "2px" }}>
            {(["5m", "30m", "1H", "4H", "1D", "1W"] as TimeFrame[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFrame(tf)}
                className="px-2 py-1 text-xs font-mono transition-colors"
                style={{
                  backgroundColor: timeFrame === tf ? "#66ff66" : "transparent",
                  color: timeFrame === tf ? "#000000" : "#888888",
                }}
                data-testid={`button-timeframe-${tf}`}
              >
                {tf}
              </button>
            ))}
          </div>
          
          <div className="flex gap-1" style={{ border: "1px solid rgba(102, 255, 102, 0.3)", padding: "2px" }}>
            <button
              onClick={() => setChartMode("candle")}
              className="px-2 py-1 text-xs font-mono transition-colors"
              style={{
                backgroundColor: chartMode === "candle" ? "#66ff66" : "transparent",
                color: chartMode === "candle" ? "#000000" : "#888888",
              }}
              data-testid="button-chart-mode-candle"
            >
              Candles
            </button>
            <button
              onClick={() => setChartMode("line")}
              className="px-2 py-1 text-xs font-mono transition-colors"
              style={{
                backgroundColor: chartMode === "line" ? "#66ff66" : "transparent",
                color: chartMode === "line" ? "#000000" : "#888888",
              }}
              data-testid="button-chart-mode-line"
            >
              Line
            </button>
          </div>
        </div>
      </div>

      {ohlcInfo && chartMode === "candle" && (
        <div className="flex gap-4 mb-2 text-xs" style={{ color: "#888888" }}>
          <span>O: <span style={{ color: "#66ff66" }}>{ohlcInfo.open.toFixed(2)}%</span></span>
          <span>H: <span style={{ color: "#88ffff" }}>{ohlcInfo.high.toFixed(2)}%</span></span>
          <span>L: <span style={{ color: "#ff6666" }}>{ohlcInfo.low.toFixed(2)}%</span></span>
          <span>C: <span style={{ color: ohlcInfo.close >= ohlcInfo.open ? "#66ff66" : "#ff6666" }}>{ohlcInfo.close.toFixed(2)}%</span></span>
        </div>
      )}

      <div 
        ref={chartContainerRef} 
        className="flex-1 w-full min-h-[300px]"
        style={{ backgroundColor: "transparent" }}
        data-testid="chart-container"
      />

    </div>
  );
}
