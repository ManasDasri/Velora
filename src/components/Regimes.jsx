import { formatPct } from "../utils/format";

const NAMES = ["Down day", "Flat day", "Up day"];
const FILLS = ["bg-down", "bg-flat", "bg-up"];

// Left: how often one kind of day follows another in the price history.
// Right: the mix of day types across the simulated horizon.
export default function Regimes({ result }) {
  const { matrix, lastState } = result.model;
  const occupancy = result.occupancy;
  const avg = [0, 1, 2].map((s) => occupancy.reduce((sum, row) => sum + row[s], 0) / occupancy.length);

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
      <div>
        <p className="mb-3 text-sm text-muted">
          After the last session, a <span className="text-ink">{NAMES[lastState].toLowerCase()}</span>, what came next historically:
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="pb-2 font-normal">After a…</th>
              {NAMES.map((n) => (
                <th key={n} className="pb-2 text-right font-normal">
                  {n.split(" ")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, from) => (
              <tr key={from} className={from === lastState ? "font-medium text-ink" : "text-ink/80"}>
                <td className="py-1 pr-2">{NAMES[from].toLowerCase()}</td>
                {row.map((p, to) => (
                  <td key={to} className="p-0.5 text-right">
                    <span className="block rounded px-2 py-1" style={{ background: `rgb(51 70 211 / ${(p * 0.55).toFixed(2)})` }}>
                      {formatPct(p)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <p className="mb-3 text-sm text-muted">Mix of simulated days over the next {occupancy.length}:</p>
        <div className="flex h-24 items-stretch gap-px" aria-hidden="true">
          {occupancy.map((row, t) => (
            <div key={t} className="flex flex-1 flex-col-reverse">
              {row.map((share, s) => (
                <div key={s} className={`${FILLS[s]} opacity-60`} style={{ height: `${share * 100}%` }} />
              ))}
            </div>
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {NAMES.map((n, s) => (
            <li key={n} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-sm ${FILLS[s]}`} />
              {n}s <span className="text-muted">{formatPct(avg[s])}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
