const TWELVE_BASE = "https://api.twelvedata.com/time_series";
const FINNHUB_BASE = "https://finnhub.io/api/v1";

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
  const key = import.meta.env.VITE_TWELVE_DATA_API_KEY;
  if (!key) {
    return generateDemoSeries(symbol);
  }

  const url = new URL(TWELVE_BASE);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("outputsize", String(outputsize));
  url.searchParams.set("apikey", key);
  url.searchParams.set("format", "JSON");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Failed to load market data from Twelve Data.");
  }
  const data = await response.json();
  if (!data.values?.length) {
    throw new Error(data.message || "No OHLCV values returned for this symbol.");
  }
  return data.values.reverse().map(normalizeBar);
};

export const fetchHeadlinePack = async (symbol) => {
  const key = import.meta.env.VITE_FINNHUB_API_KEY;
  if (!key) {
    return [
      `${symbol} prints strong quarter amid resilient macro backdrop`,
      `${symbol} analysts highlight efficiency expansion opportunity`,
      `${symbol} options flow suggests elevated speculative demand`,
    ];
  }

  const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  const url = new URL(`${FINNHUB_BASE}/company-news`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("token", key);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Failed to load headline context from Finnhub.");
  }
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    return [`No major headlines found for ${symbol} this week.`];
  }
  return data.slice(0, 6).map((item) => item.headline).filter(Boolean);
};

export const fetchMarketSnapshot = async (symbol) => {
  const key = import.meta.env.VITE_FINNHUB_API_KEY;
  if (!key) {
    return {
      changePercent: Number(((Math.random() - 0.5) * 4).toFixed(2)),
      dayHigh: null,
      dayLow: null,
      marketCap: null,
      peTTM: null,
    };
  }

  const [quoteResponse, metricResponse] = await Promise.all([
    fetch(`${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`),
    fetch(
      `${FINNHUB_BASE}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${key}`,
    ),
  ]);

  if (!quoteResponse.ok) {
    throw new Error("Failed to load quote snapshot from Finnhub.");
  }
  if (!metricResponse.ok) {
    throw new Error("Failed to load valuation metrics from Finnhub.");
  }

  const quoteData = await quoteResponse.json();
  const metricData = await metricResponse.json();
  const metrics = metricData.metric || {};

  return {
    changePercent: Number(quoteData.dp) || 0,
    dayHigh: Number(quoteData.h) || null,
    dayLow: Number(quoteData.l) || null,
    marketCap: Number(metrics.marketCapitalization) || null,
    peTTM: Number(metrics.peTTM) || null,
  };
};
