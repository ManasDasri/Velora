# Velora

Velora is an AI-powered stochastic market forecasting platform built with React + Vite. It models stock terminal price distributions with Monte Carlo simulation (up to 1,000 paths), Geometric Brownian Motion, and a 3-state Markov chain, then dynamically adjusts risk assumptions using Groq LLaMA 3.3 sentiment analysis on live headlines.

## Core capabilities

- Live OHLCV ingestion from Twelve Data and company headline context from Finnhub
- Extra live data pack: quote change %, day range, market cap, and P/E (TTM) from Finnhub
- Monte Carlo engine with regime-switching volatility and jump-shock stress events
- Groq LLaMA 3.3-70B contextual sentiment synthesis to influence drift/vol assumptions
- Native HTML5 Canvas fan chart and histogram rendering (no charting library dependency)
- Risk analytics: expected terminal price, upside probability, VaR(95%), CVaR(95%)
- Regime occupancy heatmap and Markov transition matrix diagnostics
- Scenario presets (Base, Risk-On, Risk-Off, Black Swan) that jointly reweight drift/vol/shock assumptions
- Technical indicator panel: SMA20/50, RSI(14), realized volatility, max drawdown, volume regime
- Multi-horizon probability cone table across forecast checkpoints

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

If any key is missing, Velora automatically runs in demo mode with synthetic data and fallback sentiment.
