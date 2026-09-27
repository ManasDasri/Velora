// All keyed requests go through our serverless functions in /api, which hold
// the API keys. A 503 { demo: true } means no key is configured: use demo data.
const DEMO = Symbol("demo");

const api = async (path) => {
  const response = await fetch(path);
  if (response.status === 503) return DEMO;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request to ${path} failed (${response.status}).`);
  return data;
};

// Deterministic per symbol, so the demo chart for a ticker is the same on every visit.
const demoSeries = (symbol, length) => {
  let seed = [...symbol].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
  const rand = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0) / 4294967296);
  const normal = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
  const day = new Date();
  const dates = [];
  while (dates.length < length) {
    if (day.getDay() % 6 !== 0) dates.unshift(day.toISOString().slice(0, 10));
    day.setDate(day.getDate() - 1);
  }
  let close = 60 + (Math.abs(seed) % 240);
  return dates.map((datetime) => {
    close *= Math.exp(0.0003 + 0.016 * normal());
    return { datetime, close, volume: 1_000_000 * (0.6 + rand()) };
  });
};

export const fetchMarketData = async (symbol, bars = 500) => {
  const q = encodeURIComponent(symbol);
  const [series, headlines, snapshot] = await Promise.all([
    api(`/api/ohlcv?symbol=${q}&interval=1day&outputsize=${bars}`),
    api(`/api/news?symbol=${q}`),
    api(`/api/snapshot?symbol=${q}`),
  ]);

  const demo = series === DEMO;
  if (!demo && !series.values?.length) throw new Error(series.message || `No price history found for ${symbol}.`);

  return {
    demo,
    bars: demo
      ? demoSeries(symbol, bars)
      : series.values.reverse().map((b) => ({ datetime: b.datetime, close: Number(b.close), volume: Number(b.volume) })),
    headlines: headlines === DEMO ? [] : headlines,
    snapshot: snapshot === DEMO ? null : snapshot,
  };
};
