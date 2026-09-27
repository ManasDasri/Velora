const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const formatMoney = (v) => (Number.isFinite(v) ? money.format(v) : "—");
export const formatPct = (v, digits = 0) => (Number.isFinite(v) ? `${(v * 100).toFixed(digits)}%` : "—");
// Change from a reference, e.g. formatChange(110, 100) → "+10.0%". Uses a real minus sign.
export const formatChange = (v, ref) => {
  if (!Number.isFinite(v) || !Number.isFinite(ref)) return "—";
  const pct = (v / ref - 1) * 100;
  return `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`;
};
export const formatCompact = (v) => (Number.isFinite(v) ? compact.format(v) : "—");
