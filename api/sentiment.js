import { SYMBOL, badRequest, demo, upstream } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  const { symbol = '', headlines } = req.body || {};
  if (!SYMBOL.test(symbol)) return badRequest(res, 'Invalid symbol.');
  // bound the prompt so the endpoint can't be used as a general-purpose LLM proxy
  if (!Array.isArray(headlines) || headlines.length === 0 || headlines.length > 10)
    return badRequest(res, 'Send 1–10 headlines.');
  const lines = headlines.map((h) => String(h).slice(0, 300));

  const key = process.env.GROQ_API_KEY;
  if (!key) return demo(res);

  const prompt = `
You are a quantitative financial sentiment system.
Analyze the news headlines for ${symbol} and return STRICT JSON:
{
  "sentimentScore": number between -1 and 1,
  "volatilityFactor": number between 0.7 and 1.5,
  "driftFactor": number between 0.7 and 1.5,
  "narrative": "max 40 words"
}

Headlines:
${lines.map((line, i) => `${i + 1}. ${line}`).join('\n')}
`.trim();

  const data = await upstream(res, 'https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  if (!data) return;
  const content = data.choices?.[0]?.message?.content;
  if (!content) return res.status(502).json({ error: 'Groq response did not include content.' });
  res.status(200).json(JSON.parse(content));
}
