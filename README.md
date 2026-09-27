# Velora

Velora is an AI-powered stochastic market forecasting platform built with React + Vite. It models stock terminal price distributions with Monte Carlo simulation (up to 1,000 paths), Geometric Brownian Motion, and a 3-state Markov chain, then dynamically adjusts risk assumptions using Groq LLaMA 3.3 sentiment analysis on live headlines.

## Core capabilities

- A plain-language answer up front: how often the stock ends above today's price across 2,000 simulated paths, with median, 80% range, VaR(95%) and CVaR(95%)
- Price history flowing into a probability fan (50/80/90% bands, median, sample paths) with hover readouts for any day
- Monte Carlo engine on daily log returns with a 3-state Markov chain (down/flat/up days) and optional jump days; seeded, so results are stable while you adjust controls
- Horizon (10–90 trading days), scenario presets (Base, Risk-on, Risk-off, Stress) and jump frequency re-run the simulation instantly, without refetching data
- Live daily prices from Twelve Data, headlines, quote and fundamentals from Finnhub
- Groq LLaMA 3.3-70B reads the week's headlines; its sentiment nudges drift and volatility (clamped server- and client-side)
- Terminal distribution, checkpoint table, Markov transition odds, simulated day mix, and recent-trading stats (volatility, RSI, moving averages, drawdown, volume)
- SVG charts, no charting library

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment:

   ```bash
   cp .env.example .env
   ```

3. Add API keys in `.env` (and in Vercel → Project → Settings → Environment Variables for production):

   - `TWELVE_DATA_API_KEY`
   - `FINNHUB_API_KEY`
   - `GROQ_API_KEY`

   The keys are only read by the serverless functions in `api/`, so they never ship in the browser bundle. Don't prefix them with `VITE_` — Vite embeds `VITE_*` variables in the public JavaScript.

4. Run (serves the frontend and the `api/` functions together):

   ```bash
   npx vercel dev
   ```

If the Twelve Data key is missing, Velora runs in demo mode with clearly labelled synthetic prices; missing Finnhub or Groq keys just hide headlines and the AI read.

Check the simulation engine with `npm run check`.
