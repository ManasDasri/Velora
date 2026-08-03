export default function StateHeatmap({ occupancy }) {
  const labels = ["Bear", "Neutral", "Bull"];
  const colors = ["bg-rose-500", "bg-amber-400", "bg-emerald-500"];

  return (
    <div className="gradient-outline">
      <div className="glass p-4">
        <p className="mb-3 text-sm text-slate-300">Markov Regime Occupancy</p>
        <div className="space-y-3">
          {labels.map((label, idx) => {
            const avg = occupancy.reduce((sum, row) => sum + row[idx], 0) / Math.max(occupancy.length, 1);
            return (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                  <span>{label}</span>
                  <span>{(avg * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full ${colors[idx]}`} style={{ width: `${Math.max(2, avg * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
