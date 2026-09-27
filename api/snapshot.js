import { SYMBOL, badRequest, demo, upstream } from './_lib.js';

export default async function handler(req, res) {
  const { symbol = '' } = req.query;
  if (!SYMBOL.test(symbol)) return badRequest(res, 'Invalid symbol.');

  const key = process.env.FINNHUB_API_KEY;
  if (!key) return demo(res);

  const s = encodeURIComponent(symbol);
  const quote = await upstream(res, `https://finnhub.io/api/v1/quote?symbol=${s}&token=${key}`);
  if (!quote) return;
  const metric = await upstream(res, `https://finnhub.io/api/v1/stock/metric?symbol=${s}&metric=all&token=${key}`);
  if (!metric) return;

  const m = metric.metric || {};
  res.status(200).json({
    changePercent: Number(quote.dp) || 0,
    dayHigh: Number(quote.h) || null,
    dayLow: Number(quote.l) || null,
    marketCap: Number(m.marketCapitalization) || null,
    peTTM: Number(m.peTTM) || null,
  });
}
