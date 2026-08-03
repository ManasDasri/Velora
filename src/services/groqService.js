const FALLBACK = {
  sentimentScore: 0.12,
  volatilityFactor: 1.08,
  driftFactor: 1.06,
  narrative:
    "Sentiment skews mildly bullish with constructive macro narrative, but event risk still supports slightly elevated volatility assumptions.",
};

export const synthesizeSentiment = async (symbol, headlines) => {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  if (!key || headlines.length === 0) {
    return FALLBACK;
  }

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
${headlines.map((line, i) => `${i + 1}. ${line}`).join("\n")}
`.trim();

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error("Groq sentiment synthesis failed.");
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq response did not include content.");
  }

  const parsed = JSON.parse(content);
  return {
    sentimentScore: Number(parsed.sentimentScore) || 0,
    volatilityFactor: Number(parsed.volatilityFactor) || 1,
    driftFactor: Number(parsed.driftFactor) || 1,
    narrative: parsed.narrative || FALLBACK.narrative,
  };
};
