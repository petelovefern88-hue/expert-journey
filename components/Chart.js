import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

export default function Chart({ candles = [], markers = [] }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const emaRef = useRef({});

  const ema = (data, period) => {
    if (!data.length) return [];

    const k = 2 / (period + 1);
    let prev = data[0].close;

    return data.map((d, i) => {
      const val = i === 0 ? d.close : d.close * k + prev * (1 - k);
      prev = val;

      return {
        time: Math.floor(d.time / 1000),
        value: val,
      };
    });
  };

  useEffect(() => {
    if (!ref.current) return;

    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: 320,
    });

    chartRef.current = chart;

    // ✅ ใช้ API ที่รองรับ “ทุกเวอร์ชัน”
    const candle = chart.addCandlestickSeries();
    candleRef.current = candle;

    emaRef.current.e20 = chart.addLineSeries({ color: "#22c55e" });
    emaRef.current.e50 = chart.addLineSeries({ color: "#eab308" });
    emaRef.current.e200 = chart.addLineSeries({ color: "#3b82f6" });

    const resize = () => {
      chart.applyOptions({
        width: ref.current.clientWidth,
      });
    };

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!candles.length || !candleRef.current) return;

    const data = candles
      .slice()
      .sort((a, b) => a.time - b.time)
      .map((c) => ({
        time: Math.floor(c.time / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

    candleRef.current.setData(data);

    emaRef.current.e20?.setData(ema(candles, 20));
    emaRef.current.e50?.setData(ema(candles, 50));
    emaRef.current.e200?.setData(ema(candles, 200));
  }, [candles]);

  useEffect(() => {
    if (markers.length) {
      candleRef.current?.setMarkers(markers);
    }
  }, [markers]);

  return <div ref={ref} className="w-full h-[320px]" />;
}
