import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

export default function Chart({ candles = [], markers = [] }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const emaSeriesRef = useRef({});

  // ===== EMA CALC (optimized) =====
  const calcEMA = (data, period) => {
    if (!data.length) return [];

    const k = 2 / (period + 1);
    let ema = data[0].close;
    const result = new Array(data.length);

    for (let i = 0; i < data.length; i++) {
      const price = data[i].close;
      ema = i === 0 ? price : price * k + ema * (1 - k);

      result[i] = {
        time: Math.floor(data[i].time / 1000),
        value: ema,
      };
    }

    return result;
  };

  // ===== INIT CHART (ONLY ONCE) =====
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#0b1220" },
        textColor: "#d1d5db",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      width: containerRef.current.clientWidth,
      height: 320,
      timeScale: {
        borderColor: "rgba(255,255,255,0.2)",
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.2)",
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    candleSeriesRef.current = candleSeries;

    emaSeriesRef.current.ema20 = chart.addLineSeries({
      color: "#22c55e",
      lineWidth: 1,
    });

    emaSeriesRef.current.ema50 = chart.addLineSeries({
      color: "#eab308",
      lineWidth: 1,
    });

    emaSeriesRef.current.ema200 = chart.addLineSeries({
      color: "#3b82f6",
      lineWidth: 1,
    });

    // ===== ResizeObserver (เทพกว่า window resize) =====
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });

    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, []);

  // ===== UPDATE DATA ONLY =====
  useEffect(() => {
    if (!candles.length || !candleSeriesRef.current) return;

    const formatted = candles.map((c) => ({
      time: Math.floor(c.time / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeriesRef.current.setData(formatted);

    emaSeriesRef.current.ema20?.setData(calcEMA(candles, 20));
    emaSeriesRef.current.ema50?.setData(calcEMA(candles, 50));
    emaSeriesRef.current.ema200?.setData(calcEMA(candles, 200));
  }, [candles]);

  // ===== MARKERS =====
  useEffect(() => {
    if (!markers.length || !candleSeriesRef.current) return;
    candleSeriesRef.current.setMarkers(markers);
  }, [markers]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[320px] rounded-xl overflow-hidden"
    />
  );
}
