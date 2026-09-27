// Reports which integrations are configured (never the keys themselves).
export default function handler(req, res) {
  const env = process.env;
  res.status(200).json({
    live: Boolean(env.TWELVE_DATA_API_KEY && env.FINNHUB_API_KEY && env.GROQ_API_KEY),
  });
}
