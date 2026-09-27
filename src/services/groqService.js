const clamp = (x, lo, hi, fallback) => (Number.isFinite(Number(x)) ? Math.min(hi, Math.max(lo, Number(x))) : fallback);

// The prompt and the Groq key live in /api/sentiment; this only sends headlines.
// Returns null when there's nothing to read or no key is configured.
export const synthesizeSentiment = async (symbol, headlines) => {
  if (headlines.length === 0) return null;

  const response = await fetch("/api/sentiment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, headlines: headlines.slice(0, 10) }),
  });
  if (response.status === 503) return null;
  if (!response.ok) throw new Error("The headline read failed. The forecast below uses history only.");

  const parsed = await response.json();
  return {
    score: clamp(parsed.sentimentScore, -1, 1, 0),
    volatilityFactor: clamp(parsed.volatilityFactor, 0.7, 1.5, 1),
    narrative: String(parsed.narrative || ""),
  };
};
