const FALLBACK = {
  sentimentScore: 0.12,
  volatilityFactor: 1.08,
  driftFactor: 1.06,
  narrative:
    "Sentiment skews mildly bullish with constructive macro narrative, but event risk still supports slightly elevated volatility assumptions.",
};

// The prompt and the Groq key live in /api/sentiment; this only sends headlines.
export const synthesizeSentiment = async (symbol, headlines) => {
  if (headlines.length === 0) {
    return FALLBACK;
  }

  const response = await fetch("/api/sentiment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, headlines: headlines.slice(0, 10) }),
  });
  if (response.status === 503) {
    return FALLBACK;
  }
  if (!response.ok) {
    throw new Error("Groq sentiment synthesis failed.");
  }

  const parsed = await response.json();
  return {
    sentimentScore: Number(parsed.sentimentScore) || 0,
    volatilityFactor: Number(parsed.volatilityFactor) || 1,
    driftFactor: Number(parsed.driftFactor) || 1,
    narrative: parsed.narrative || FALLBACK.narrative,
  };
};
