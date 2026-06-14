import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

export default function Chart({ candles = [] }) {
  const ref = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!ref.current || chartRef.current) return;

    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: 300,
    });

    const candleSeries = chart.addCandlestickSeries();
    chartRef.current = candleSeries;

    return () => chart.remove();
  }, []);

  useEffect(() => {
    if (!chartRef.current || !candles.length) return;

    const data = candles.map((c) => ({
      time: Math.floor(c.time / 1000),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    chartRef.current.setData(data);
  }, [candles]);

  return <div ref={ref} style={{ width: "100%", height: 300 }} />;
}
