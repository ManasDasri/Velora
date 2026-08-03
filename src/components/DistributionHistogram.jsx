import { useEffect, useRef } from "react";

export default function DistributionHistogram({ values }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || values.length === 0) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, width, height);

    const min = Math.min(...values);
    const max = Math.max(...values);
    const bins = 36;
    const counts = Array(bins).fill(0);
    const span = max - min || 1;

    values.forEach((v) => {
      const index = Math.min(Math.floor(((v - min) / span) * bins), bins - 1);
      counts[index] += 1;
    });

    const maxCount = Math.max(...counts, 1);
    const padding = 12;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    counts.forEach((count, i) => {
      const barWidth = chartWidth / bins - 2;
      const barHeight = (count / maxCount) * chartHeight;
      const x = padding + i * (chartWidth / bins);
      const y = height - padding - barHeight;

      ctx.fillStyle = "rgba(56,189,248,0.8)";
      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }, [values]);

  return (
    <div className="gradient-outline">
      <div className="glass p-3">
        <p className="mb-2 text-sm text-slate-300">Terminal Price Distribution</p>
        <canvas ref={canvasRef} width={900} height={240} className="h-60 w-full rounded-xl bg-slate-950" />
      </div>
    </div>
  );
}
