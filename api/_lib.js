// Shared helpers for the serverless functions. API keys are read from the
// server environment only, so they never reach the browser bundle.

export const SYMBOL = /^[A-Z0-9.:-]{1,15}$/i;

export function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

// No key configured: tell the client to use demo data instead of failing.
export function demo(res) {
  return res.status(503).json({ demo: true });
}

export async function upstream(res, url, init) {
  const r = await fetch(url, init);
  if (!r.ok) {
    res.status(502).json({ error: `Upstream request failed (${r.status}).` });
    return null;
  }
  return r.json();
}
