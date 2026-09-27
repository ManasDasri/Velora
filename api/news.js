import { SYMBOL, badRequest, demo, upstream } from './_lib.js';

export default async function handler(req, res) {
  const { symbol = '' } = req.query;
  if (!SYMBOL.test(symbol)) return badRequest(res, 'Invalid symbol.');

  const key = process.env.FINNHUB_API_KEY;
  if (!key) return demo(res);

  const day = 24 * 60 * 60 * 1000;
  const url = new URL('https://finnhub.io/api/v1/company-news');
  url.search = new URLSearchParams({
    symbol,
    from: new Date(Date.now() - 7 * day).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    token: key,
  });
  const data = await upstream(res, url);
  if (data) res.status(200).json(Array.isArray(data) ? data.slice(0, 6).map((n) => n.headline).filter(Boolean) : []);
}
