import { SYMBOL, badRequest, demo, upstream } from './_lib.js';

const INTERVALS = new Set(['1min', '5min', '15min', '30min', '1h', '4h', '1day', '1week', '1month']);

export default async function handler(req, res) {
  const { symbol = '', interval = '1day', outputsize = '240' } = req.query;
  if (!SYMBOL.test(symbol)) return badRequest(res, 'Invalid symbol.');
  if (!INTERVALS.has(interval)) return badRequest(res, 'Invalid interval.');
  const size = Math.min(Math.max(Number(outputsize) || 240, 1), 5000);

  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) return demo(res);

  const url = new URL('https://api.twelvedata.com/time_series');
  url.search = new URLSearchParams({ symbol, interval, outputsize: String(size), apikey: key, format: 'JSON' });
  const data = await upstream(res, url);
  if (data) res.status(200).json(data);
}
