export const formatMoney = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export const formatPct = (value) =>
  `${(value * 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;

export const formatSignedPct = (value) =>
  `${value >= 0 ? "+" : ""}${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;

export const formatCompactNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
};
