import { useEffect, useRef } from "react";

const percentile = (values, q) => values[Math.floor((values.length - 1) * q)];

export default function PathFanChart({ paths }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || paths.length === 0) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, width, height);

    const steps = paths[0].length;
    const bands = [];
    for (let t = 0; t < steps; t += 1) {
      const column = paths.map((row) => row[t]).sort((a, b) => a - b);
      bands.push({
        p10: percentile(column, 0.1),
        p25: percentile(column, 0.25),
        p50: percentile(column, 0.5),
        p75: percentile(column, 0.75),
        p90: percentile(column, 0.9),
      });
    }

    const low = Math.min(...bands.map((d) => d.p10));
    const high = Math.max(...bands.map((d) => d.p90));
    const yScale = (v) => height - ((v - low) / (high - low || 1)) * (height - 20) - 10;
    const xScale = (i) => (i / (steps - 1)) * (width - 20) + 10;

    const drawBand = (upperKey, lowerKey, fill) => {
      ctx.beginPath();
      bands.forEach((b, i) => {
        const x = xScale(i);
        const y = yScale(b[upperKey]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      for (let i = bands.length - 1; i >= 0; i -= 1) {
        const x = xScale(i);
        const y = yScale(bands[i][lowerKey]);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };

    drawBand("p90", "p10", "rgba(56,189,248,0.12)");
    drawBand("p75", "p25", "rgba(56,189,248,0.22)");

    ctx.beginPath();
    bands.forEach((b, i) => {
      const x = xScale(i);
      const y = yScale(b.p50);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [paths]);

  return (
    <div className="gradient-outline">
      <div className="glass p-3">
        <p className="mb-2 text-sm text-slate-300">Monte Carlo Fan Chart</p>
        <canvas ref={canvasRef} width={900} height={320} className="h-80 w-full rounded-xl bg-slate-950" />
      </div>
    </div>
  );
}
