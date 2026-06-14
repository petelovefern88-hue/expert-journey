// ✅ components/Chart.js — Real TradingView Chart Renderer (with EMA20/50/200)
import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

export default function Chart({ candles = [], markers = [] }) {
  const chartContainerRef = useRef();

  useEffect(() => {
    if (!chartContainerRef.current || !candles.length) return;

    chartContainerRef.current.innerHTML = "";

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#0b1220" },
        textColor: "#d1d5db",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 320,
      timeScale: { borderColor: "rgba(255,255,255,0.2)" },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.2)" },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    // ✅ FIX 1: normalizeTime — รองรับทั้ง ms และ seconds
    const normalizeTime = (t) => (t > 1e10 ? Math.floor(t / 1000) : t);

    candleSeries.setData(
      candles.map((c) => ({
        time: normalizeTime(c.time),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    const ema = (data, period) => {
      const k = 2 / (period + 1);
      let emaArr = [];
      let prev = data[0].close;
      data.forEach((d, i) => {
        const val = i === 0 ? d.close : d.close * k + prev * (1 - k);
        // ✅ FIX 1: ใช้ normalizeTime แทน Math.floor(d.time / 1000)
        emaArr.push({ time: normalizeTime(d.time), value: val });
        prev = val;
      });
      return emaArr;
    };

    const ema20 = chart.addLineSeries({ color: "#22c55e", lineWidth: 1.5 });
    const ema50 = chart.addLineSeries({ color: "#eab308", lineWidth: 1.5 });
    const ema200 = chart.addLineSeries({ color: "#3b82f6", lineWidth: 1.5 });

    // ✅ FIX 2: Guard — setData เฉพาะเมื่อมี candles พอ
    if (candles.length >= 20) ema20.setData(ema(candles, 20));
    if (candles.length >= 50) ema50.setData(ema(candles, 50));
    if (candles.length >= 200) ema200.setData(ema(candles, 200));

    if (markers?.length) {
      candleSeries.setMarkers(markers);
    }

    // ✅ FIX 3: null check ใน resize — ป้องกัน crash หลัง unmount
    const resize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
    };
  }, [candles, markers]);

  return <div ref={chartContainerRef} className="w-full h-[320px]" />;
}
