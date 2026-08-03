import { formatMoney, formatPct } from "../utils/format";

export default function ProbabilityConeTable({ cone }) {
  return (
    <div className="gradient-outline">
      <div className="glass overflow-auto p-4">
        <p className="mb-2 text-sm text-slate-300">Multi-Horizon Probability Cone</p>
        <table className="w-full text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="py-1 text-left">Day</th>
              <th className="py-1 text-right">Expected</th>
              <th className="py-1 text-right">P10</th>
              <th className="py-1 text-right">P50</th>
              <th className="py-1 text-right">P90</th>
              <th className="py-1 text-right">Up %</th>
            </tr>
          </thead>
          <tbody>
            {cone.map((row) => (
              <tr key={row.day} className="border-t border-slate-700/70">
                <td className="py-1 text-slate-200">D+{row.day}</td>
                <td className="py-1 text-right text-slate-100">{formatMoney(row.expected)}</td>
                <td className="py-1 text-right text-slate-100">{formatMoney(row.p10)}</td>
                <td className="py-1 text-right text-slate-100">{formatMoney(row.p50)}</td>
                <td className="py-1 text-right text-slate-100">{formatMoney(row.p90)}</td>
                <td className="py-1 text-right text-slate-100">{formatPct(row.upProbability)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
