export default function MetricCard({ label, value, tone = "neutral" }) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
        ? "text-rose-300"
        : "text-sky-200";

  return (
    <div className="gradient-outline">
      <div className="glass p-4 transition duration-300 hover:-translate-y-0.5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
      </div>
    </div>
  );
}
