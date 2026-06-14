import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  ColorType,
} from "lightweight-charts";

export default function Chart({ candles = [], markers = [] }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const emaRef = useRef({});

  const calcEMA = (data, period) => {
    if (!data.length) return [];

    const k = 2 / (period + 1);
    let ema = data[0].close;

    return data.map((d, i) => {
      ema = i === 0 ? d.close : d.close * k + ema * (1 - k);

      return {
        time: Math.floor(d.time / 1000),
        value: ema,
      };
    });
  };

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0b1220" },
        textColor: "#d1d5db",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      width: containerRef.current.clientWidth,
      height: 320,
    });

    chartRef.current = chart;

    // ✅ NEW API (สำคัญ)
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
    });

    candleRef.current = candle;

    emaRef.current.ema20 = chart.addSeries(LineSeries, {
      color: "#22c55e",
      lineWidth: 1,
    });

    emaRef.current.ema50 = chart.addSeries(LineSeries, {
      color: "#eab308",
      lineWidth: 1,
    });

    emaRef.current.ema200 = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 1,
    });

    const resize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
      });
    };

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candles.length || !candleRef.current) return;

    const sorted = [...candles].sort((a, b) => a.time - b.time);

    const formatted = sorted.map((c) => ({
      time: Math.floor(c.time / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleRef.current.setData(formatted);

    emaRef.current.ema20?.setData(calcEMA(sorted, 20));
    emaRef.current.ema50?.setData(calcEMA(sorted, 50));
    emaRef.current.ema200?.setData(calcEMA(sorted, 200));
  }, [candles]);

  useEffect(() => {
    if (markers.length && candleRef.current) {
      candleRef.current.setMarkers(markers);
    }
  }, [markers]);

  return <div ref={containerRef} className="w-full h-[320px]" />;
}
