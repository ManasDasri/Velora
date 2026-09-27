import useWidth from "../utils/useWidth";
import { niceTicks } from "../utils/ticks";
import { formatMoney } from "../utils/format";

const BINS = 40;
const PAD = { top: 22, bottom: 26, side: 4 };

// Where the simulated paths end up. Bars left of today's price are losses; the darkest are the worst 5%.
export default function Distribution({ result }) {
  const [ref, width] = useWidth(500);
  const height = 220;
  const { finals, spot, metrics } = result;

  // Trim the extreme 0.5% on each side so one wild path doesn't flatten the chart; they land in the edge bins.
  const lo = finals[Math.floor(finals.length * 0.005)];
  const hi = finals[Math.floor(finals.length * 0.995)];
  const binW = (hi - lo) / BINS || 1;
  const counts = Array(BINS).fill(0);
  for (const v of finals) counts[Math.min(BINS - 1, Math.max(0, Math.floor((v - lo) / binW)))] += 1;
  const peak = Math.max(...counts);

  const x = (v) => PAD.side + ((v - lo) / (hi - lo)) * (width - 2 * PAD.side);
  const barH = (c) => (c / peak) * (height - PAD.top - PAD.bottom);
  const ticks = niceTicks(lo, hi, width < 480 ? 3 : 5).filter((v) => v >= lo && v <= hi);

  const tone = (edge) => (edge + binW <= metrics.var95 ? "fill-down" : edge + binW / 2 < spot ? "fill-down/35" : "fill-up/35");

  return (
    <div ref={ref}>
      <svg width={width} height={height} className="block" role="img" aria-label={`Distribution of ${finals.length} simulated final prices`}>
        {counts.map((c, i) => {
          const edge = lo + i * binW;
          return <rect key={i} x={x(edge) + 0.5} width={Math.max(1, x(edge + binW) - x(edge) - 1)} y={height - PAD.bottom - barH(c)} height={barH(c)} className={tone(edge)} />;
        })}
        <line x1={PAD.side} x2={width - PAD.side} y1={height - PAD.bottom} y2={height - PAD.bottom} className="stroke-rule" />
        {ticks.map((v) => (
          <text key={v} x={x(v)} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">
            ${v.toLocaleString("en-US")}
          </text>
        ))}
        <line x1={x(spot)} x2={x(spot)} y1={12} y2={height - PAD.bottom} className="stroke-ink" strokeDasharray="2 3" />
        <text x={x(spot)} y={10} textAnchor="middle" className="fill-ink text-[11px] font-medium">
          Today {formatMoney(spot)}
        </text>
      </svg>
    </div>
  );
}
