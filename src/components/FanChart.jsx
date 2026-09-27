import { useState } from "react";
import useWidth from "../utils/useWidth";
import { niceTicks } from "../utils/ticks";
import { formatChange, formatMoney, formatPct } from "../utils/format";

const PAD = { top: 16, right: 64, bottom: 30, left: 8 };
const shortDate = (iso) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const line = (points) => points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
const area = (top, bottom) => `${line(top)}${line([...bottom].reverse()).replace("M", "L")}Z`;

export default function FanChart({ bars, result, revealKey }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const height = width < 640 ? 300 : 400;

  const { bands, samples, horizon, spot } = result;
  // Show about three times the horizon in history so the fan gets a fair share of the width.
  const history = bars.slice(-Math.min(160, Math.max(60, horizon * 3)));
  const total = history.length - 1 + horizon;
  const innerW = width - PAD.left - PAD.right;
  const x = (i) => PAD.left + (i / total) * innerW;
  const today = history.length - 1;

  const lows = [...history.map((b) => b.close), ...bands.map((b) => b.p5)];
  const highs = [...history.map((b) => b.close), ...bands.map((b) => b.p95)];
  const ticks = niceTicks(Math.min(...lows), Math.max(...highs), height < 350 ? 4 : 6);
  const [lo, hi] = [ticks[0], ticks.at(-1)];
  const y = (v) => PAD.top + (1 - (v - lo) / (hi - lo)) * (height - PAD.top - PAD.bottom);

  const fan = (key) => bands.map((b, t) => [x(today + t), y(b[key])]);
  const narrow = width < 560;
  const dateTicks = (narrow ? [0] : [0, 0.33, 0.66]).map((f) => Math.round(f * today));
  const dayTicks = narrow ? [horizon] : [Math.round(horizon / 2), horizon];

  const onMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const i = Math.round(((event.clientX - box.left - PAD.left) / innerW) * total);
    setHover(i >= 0 && i <= total ? i : null);
  };

  let readout = null;
  if (hover !== null) {
    if (hover <= today) {
      const bar = history[hover];
      readout = { x: x(hover), y: y(bar.close), title: shortDate(bar.datetime), lines: [formatMoney(bar.close)] };
    } else {
      const t = hover - today;
      const b = bands[t];
      readout = {
        x: x(hover),
        y: y(b.p50),
        title: `${t} trading day${t > 1 ? "s" : ""} ahead`,
        lines: [`Median ${formatMoney(b.p50)}`, `80% between ${formatMoney(b.p10)} and ${formatMoney(b.p90)}`, `${formatPct(b.up)} of paths above today`],
      };
    }
  }

  return (
    <div ref={ref} className="relative">
      <svg
        width={width}
        height={height}
        className="block touch-none select-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Price history and a ${horizon}-day forecast fan. Median ${formatMoney(bands[horizon].p50)}, 80% of paths between ${formatMoney(bands[horizon].p10)} and ${formatMoney(bands[horizon].p90)}.`}
      >
        <defs>
          <clipPath id="reveal">
            <rect key={revealKey} className="reveal" x={x(today)} y={PAD.top} width={width - PAD.right - x(today)} height={height - PAD.top - PAD.bottom} />
          </clipPath>
        </defs>

        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} className="stroke-rule" />
            <text x={width - PAD.right + 10} y={y(v)} dy="0.32em" className="fill-muted text-[11px]">
              ${v.toLocaleString("en-US", { maximumFractionDigits: ticks[1] - ticks[0] < 1 ? 2 : 0 })}
            </text>
          </g>
        ))}

        {dateTicks.map((i) => (
          <text key={i} x={x(i)} y={height - 8} className="fill-muted text-[11px]">
            {shortDate(history[i].datetime)}
          </text>
        ))}
        <text x={x(today)} y={height - 8} textAnchor="middle" className="fill-ink text-[11px] font-medium">
          Today
        </text>
        {dayTicks.map((t) => (
          <text key={t} x={x(today + t)} y={height - 8} textAnchor={t === horizon ? "end" : "middle"} className="fill-muted text-[11px]">
            +{t}d
          </text>
        ))}

        <line x1={x(today)} x2={x(today)} y1={PAD.top} y2={height - PAD.bottom} className="stroke-ink/30" strokeDasharray="2 3" />
        <line x1={x(today)} x2={width - PAD.right} y1={y(spot)} y2={y(spot)} className="stroke-ink/40" strokeDasharray="1 3" />

        <g clipPath="url(#reveal)">
          <path d={area(fan("p95"), fan("p5"))} className="fill-fan/10" />
          <path d={area(fan("p90"), fan("p10"))} className="fill-fan/15" />
          <path d={area(fan("p75"), fan("p25"))} className="fill-fan/25" />
          {samples.map((s, p) => (
            <path key={p} d={line(s.map((v, t) => [x(today + t), y(v)]))} className="fill-none stroke-fan/15" strokeWidth="1" />
          ))}
          <path d={line(fan("p50"))} className="fill-none stroke-fan" strokeWidth="2" />
        </g>

        <path d={line(history.map((b, i) => [x(i), y(b.close)]))} className="fill-none stroke-ink" strokeWidth="1.75" strokeLinejoin="round" />
        <circle cx={x(today)} cy={y(spot)} r="3.5" className="fill-ink" />

        {readout && (
          <g pointerEvents="none">
            <line x1={readout.x} x2={readout.x} y1={PAD.top} y2={height - PAD.bottom} className="stroke-ink/50" />
            <circle cx={readout.x} cy={readout.y} r="4" className="fill-paper stroke-ink" strokeWidth="1.5" />
          </g>
        )}
      </svg>

      {readout && (
        <div
          className="pointer-events-none absolute top-3 rounded-md border border-rule bg-surface px-3 py-2 text-xs shadow-sm"
          style={readout.x > width / 2 ? { right: width - readout.x + 12 } : { left: readout.x + 12 }}
        >
          <p className="font-medium text-ink">{readout.title}</p>
          {readout.lines.map((l) => (
            <p key={l} className="text-muted">
              {l}
            </p>
          ))}
          {hover > today && <p className="text-muted">{formatChange(bands[hover - today].p50, spot)} median change</p>}
        </div>
      )}
    </div>
  );
}
