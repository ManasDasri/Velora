// All keyed requests go through our serverless functions in /api, which hold
// the API keys. A 503 { demo: true } means no key is configured: use demo data.
const api = async (path, fallback) => {
  const response = await fetch(path);
  if (response.status === 503) return fallback();
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request to ${path} failed.`);
  return data;
};

const normalizeBar = (bar) => ({
  close: Number(bar.close),
  open: Number(bar.open),
  high: Number(bar.high),
  low: Number(bar.low),
  volume: Number(bar.volume),
  datetime: bar.datetime,
});

const generateDemoSeries = (symbol) => {
  const today = new Date();
  let value = 100 + symbol.length * 11;
  return Array.from({ length: 240 }, (_, idx) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (239 - idx));
    value *= 1 + (Math.random() - 0.49) * 0.02;
    return {
      datetime: day.toISOString(),
      open: value * (1 - 0.008),
      high: value * (1 + 0.012),
      low: value * (1 - 0.014),
      close: value,
      volume: 900_000 + Math.floor(Math.random() * 500_000),
    };
  });
};

export const fetchOHLCV = async (symbol, interval = "1day", outputsize = 240) => {
  const params = new URLSearchParams({ symbol, interval, outputsize: String(outputsize) });
  const data = await api(`/api/ohlcv?${params}`, () => null);
  if (!data) {
    return generateDemoSeries(symbol);
  }
  if (!data.values?.length) {
    throw new Error(data.message || "No OHLCV values returned for this symbol.");
  }
  return data.values.reverse().map(normalizeBar);
};

export const fetchHeadlinePack = async (symbol) => {
  const headlines = await api(`/api/news?symbol=${encodeURIComponent(symbol)}`, () => [
    `${symbol} prints strong quarter amid resilient macro backdrop`,
    `${symbol} analysts highlight efficiency expansion opportunity`,
    `${symbol} options flow suggests elevated speculative demand`,
  ]);
  return headlines.length ? headlines : [`No major headlines found for ${symbol} this week.`];
};

export const fetchMarketSnapshot = (symbol) =>
  api(`/api/snapshot?symbol=${encodeURIComponent(symbol)}`, () => ({
    changePercent: Number(((Math.random() - 0.5) * 4).toFixed(2)),
    dayHigh: null,
    dayLow: null,
    marketCap: null,
    peTTM: null,
  }));
