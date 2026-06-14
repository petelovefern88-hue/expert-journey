// components/Chart.js
import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

export default function Chart({ candles = [], markers = [] }) {
  const chartContainerRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    chartContainerRef.current.innerHTML = "";

    let chart;
    try {
      chart = createChart(chartContainerRef.current, {
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
    } catch (e) {
      console.error("Chart init error:", e);
      return;
    }

    const normalizeTime = (t) =>
      typeof t === "number" && t > 1e10 ? Math.floor(t / 1000) : t;

    const sorted = [...candles].sort(
      (a, b) => normalizeTime(a.time) - normalizeTime(b.time)
    );

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    candleSeries.setData(
      sorted.map((c) => ({
        time: normalizeTime(c.time),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    if (markers?.length) {
      candleSeries.setMarkers(markers);
    }

    const ema = (data, period) => {
      if (data.length < period) return [];
      const k = 2 / (period + 1);
      let prev = data[0].close;
      return data.map((d, i) => {
        const val = i === 0 ? d.close : d.close * k + prev * (1 - k);
        prev = val;
        return { time: normalizeTime(d.time), value: val };
      });
    };

    const addEMA = (period, color) => {
      const data = ema(sorted, period);
      if (!data.length) return;
      const series = chart.addLineSeries({
        color,
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(data);
    };

    if (sorted.length >= 20) addEMA(20, "#22c55e");
    if (sorted.length >= 50) addEMA(50, "#eab308");
    if (sorted.length >= 200) addEMA(200, "#3b82f6");

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [candles, markers]);

  return <div ref={chartContainerRef} className="w-full h-[320px]" />;
}
