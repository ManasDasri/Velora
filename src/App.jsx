import { useEffect, useState } from "react";
import MetricCard from "./components/MetricCard";
import PathFanChart from "./components/PathFanChart";
import DistributionHistogram from "./components/DistributionHistogram";
import StateHeatmap from "./components/StateHeatmap";
import IndicatorPanel from "./components/IndicatorPanel";
import ProbabilityConeTable from "./components/ProbabilityConeTable";
import { fetchHeadlinePack, fetchMarketSnapshot, fetchOHLCV } from "./services/marketDataService";
import { synthesizeSentiment } from "./services/groqService";
import { formatMoney, formatPct, formatSignedPct } from "./utils/format";
import { maxDrawdown, realizedVolatility, rsi, sma, volumeRegime } from "./utils/indicators";
import { runSimulation } from "./utils/simulation";

const matrixRows = ["Bear", "Neutral", "Bull"];
const scenarios = {
  base: { label: "Base", driftBias: 1, volatilityBias: 1, shockMultiplier: 1 },
  riskOn: { label: "Risk-On", driftBias: 1.12, volatilityBias: 0.88, shockMultiplier: 0.85 },
  riskOff: { label: "Risk-Off", driftBias: 0.9, volatilityBias: 1.2, shockMultiplier: 1.2 },
  blackSwan: { label: "Black Swan", driftBias: 0.74, volatilityBias: 1.7, shockMultiplier: 2.2 },
};

export default function App() {
  const [symbol, setSymbol] = useState("AAPL");
  const [horizonDays, setHorizonDays] = useState(30);
  const [paths, setPaths] = useState(1000);
  const [shockChance, setShockChance] = useState(3);
  const [interval, setInterval] = useState("1day");
  const [lookback, setLookback] = useState(320);
  const [scenarioKey, setScenarioKey] = useState("base");
  const [state, setState] = useState({
    loading: false,
    error: "",
    bars: [],
    result: null,
    sentiment: null,
    headlines: [],
    snapshot: { changePercent: 0, dayHigh: null, dayLow: null, marketCap: null, peTTM: null },
    indicators: { sma20: null, sma50: null, rsi14: null, realizedVol30: null, maxDrawdown: 0, volumeRegime: null },
  });

  const runForecast = async () => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const [bars, headlines, snapshot] = await Promise.all([
        fetchOHLCV(symbol, interval, lookback),
        fetchHeadlinePack(symbol),
        fetchMarketSnapshot(symbol),
      ]);
      const sentiment = await synthesizeSentiment(symbol, headlines);
      const closes = bars.map((bar) => bar.close);
      const scenario = scenarios[scenarioKey];
      const result = runSimulation({
        closes,
        horizonDays,
        paths,
        shockChance: (shockChance / 100) * scenario.shockMultiplier,
        sentiment: sentiment.sentimentScore * sentiment.driftFactor,
        driftBias: scenario.driftBias,
        volatilityBias: scenario.volatilityBias * sentiment.volatilityFactor,
      });

      result.metrics.expected *= sentiment.driftFactor;
      result.metrics.p90 *= sentiment.driftFactor;
      result.metrics.p10 /= sentiment.volatilityFactor;

      const indicators = {
        sma20: sma(closes, 20),
        sma50: sma(closes, 50),
        rsi14: rsi(closes, 14),
        realizedVol30: realizedVolatility(closes, 30),
        maxDrawdown: maxDrawdown(closes),
        volumeRegime: volumeRegime(bars),
      };

      setState({
        loading: false,
        error: "",
        bars,
        result,
        sentiment,
        headlines,
        snapshot,
        indicators,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to compute forecast.",
      }));
    }
  };

  const [isDemoMode, setIsDemoMode] = useState(false);
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setIsDemoMode(!d.live))
      .catch(() => setIsDemoMode(true));
  }, []);

  const matrix = state.result?.matrix ?? [];
  const metrics = state.result?.metrics;
  const currentPrice = state.bars.at(-1)?.close;
  const activeScenario = scenarios[scenarioKey];
  const tickerItems = state.headlines.length
    ? [...state.headlines, ...state.headlines]
    : ["Run a forecast to stream contextual headlines", "Velora sentiment pulse awaits", "Regime-aware simulation ready"];

  return (
    <main className="app-shell min-h-screen">
      <div className="aurora-layer" />
      <div className="noise-mask" />

      <div className="reactbits-grid mx-auto max-w-7xl px-4 py-6 md:px-8">
        <header className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="glass p-5">
            <p className="inline-flex rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-sky-200">
              REACTBITS-STYLE UI UPGRADE
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">Velora Quantum Desk</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-200 md:text-base">
              AI-driven stochastic forecasting with cinematic controls, live narrative context, and regime-aware risk analytics.
              {isDemoMode ? " Demo mode is active until API keys are configured." : ""}
            </p>
          </div>

          <div className="gradient-outline self-stretch">
            <div className="glass flex h-full min-w-[280px] items-center justify-center p-5 text-center">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Current Symbol</p>
                <p className="mt-2 text-4xl font-extrabold text-sky-300">{symbol}</p>
                <p className="mt-2 text-xs text-slate-300">Last close: {currentPrice ? formatMoney(currentPrice) : "—"}</p>
                <p className="mt-1 text-xs text-slate-300">Scenario: {activeScenario.label}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="gradient-outline mb-5">
          <div className="glass p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
              <label className="text-xs text-slate-300">
                Ticker Symbol
                <input
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value.toUpperCase())}
                  className="rb-input w-full"
                  placeholder="AAPL"
                />
              </label>
              <label className="text-xs text-slate-300">
                Interval
                <select value={interval} onChange={(event) => setInterval(event.target.value)} className="rb-input w-full">
                  <option value="1day">1 Day</option>
                  <option value="4h">4 Hour</option>
                  <option value="1h">1 Hour</option>
                </select>
              </label>
              <label className="text-xs text-slate-300">
                Lookback Bars
                <select value={lookback} onChange={(event) => setLookback(Number(event.target.value))} className="rb-input w-full">
                  <option value={180}>180</option>
                  <option value={240}>240</option>
                  <option value={320}>320</option>
                  <option value={500}>500</option>
                </select>
              </label>
              <label className="text-xs text-slate-300">
                Forecast Horizon
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={horizonDays}
                  onChange={(event) => setHorizonDays(Number(event.target.value))}
                  className="rb-input w-full"
                />
              </label>
              <label className="text-xs text-slate-300">
                Monte Carlo Paths
                <input
                  type="number"
                  min={100}
                  max={1000}
                  step={100}
                  value={paths}
                  onChange={(event) => setPaths(Math.min(1000, Number(event.target.value)))}
                  className="rb-input w-full"
                />
              </label>
              <label className="text-xs text-slate-300">
                Shock Intensity ({shockChance}%)
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={shockChance}
                  onChange={(event) => setShockChance(Number(event.target.value))}
                  className="mt-3 w-full accent-sky-400"
                />
              </label>
              <button onClick={runForecast} disabled={state.loading} className="shiny-button mt-5 px-4 py-2 text-sm">
                {state.loading ? "Synthesizing Forecast..." : "Launch Forecast"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(scenarios).map(([key, scenario]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setScenarioKey(key)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    scenarioKey === key
                      ? "border-sky-300/70 bg-sky-400/20 text-sky-100"
                      : "border-slate-700/70 bg-slate-900/70 text-slate-300 hover:bg-slate-800/80"
                  }`}
                >
                  {scenario.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {state.error && <p className="mb-4 rounded-xl border border-rose-400/40 bg-rose-950/40 p-3 text-sm text-rose-200">{state.error}</p>}

        {metrics && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard label="Expected Terminal" value={formatMoney(metrics.expected)} tone="positive" />
              <MetricCard label="Probability Up" value={formatPct(metrics.upProbability)} tone={metrics.upProbability > 0.5 ? "positive" : "negative"} />
              <MetricCard label="VaR (95%)" value={formatMoney(metrics.var95)} tone="negative" />
              <MetricCard label="CVaR (95%)" value={formatMoney(metrics.cvar95)} tone="negative" />
              <MetricCard
                label="Daily Move"
                value={formatSignedPct(state.snapshot.changePercent)}
                tone={state.snapshot.changePercent >= 0 ? "positive" : "negative"}
              />
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PathFanChart paths={state.result.simulations} />
              </div>
              <div className="space-y-4">
                <StateHeatmap occupancy={state.result.stateOccupancy} />
                <IndicatorPanel indicators={state.indicators} snapshot={state.snapshot} />
              </div>
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <DistributionHistogram values={state.result.finalPrices} />
              </div>
              <div className="gradient-outline">
                <div className="glass p-4">
                  <p className="mb-2 text-sm text-slate-300">AI Narrative Pulse</p>
                  <p className="text-sm leading-relaxed text-slate-100">{state.sentiment?.narrative}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    Sentiment {state.sentiment?.sentimentScore?.toFixed(2)} · Vol x
                    {state.sentiment?.volatilityFactor?.toFixed(2)} · Drift x
                    {state.sentiment?.driftFactor?.toFixed(2)} · Sim Vol {formatPct(metrics.annualizedVolatility)}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-2">P10: {formatMoney(metrics.p10)}</div>
                    <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-2">P50: {formatMoney(metrics.p50)}</div>
                    <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-2">P90: {formatMoney(metrics.p90)}</div>
                    <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-2">Upside: {formatPct(metrics.upProbability)}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-2">
              <ProbabilityConeTable cone={state.result.cone} />
              <div className="gradient-outline">
                <div className="glass overflow-auto p-4">
                  <p className="mb-2 text-sm text-slate-300">Markov Transition Matrix</p>
                  <table className="w-full text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="py-1 text-left">From \ To</th>
                        <th className="py-1 text-right">Bear</th>
                        <th className="py-1 text-right">Neutral</th>
                        <th className="py-1 text-right">Bull</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.map((row, idx) => (
                        <tr key={matrixRows[idx]} className="border-t border-slate-700/70">
                          <td className="py-1 text-slate-300">{matrixRows[idx]}</td>
                          {row.map((value, valueIdx) => (
                            <td key={`${idx}-${valueIdx}`} className="py-1 text-right text-slate-100">
                              {(value * 100).toFixed(1)}%
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="gradient-outline">
                <div className="glass p-4">
                  <p className="mb-2 text-sm text-slate-300">Headline Context</p>
                  <div className="ticker rounded-xl border border-slate-700/60 bg-slate-950/60 py-2">
                    <div className="ticker-track">
                      {tickerItems.map((line, idx) => (
                        <span key={`${line}-${idx}`} className="ticker-item">
                          {line}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {state.headlines.slice(0, 6).map((line) => (
                      <li key={line} className="headline-chip">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="gradient-outline">
                <div className="glass p-4">
                  <p className="mb-2 text-sm text-slate-300">Scenario Intelligence</p>
                  <p className="text-sm text-slate-200">
                    Scenario presets now alter drift, volatility, and shock rate simultaneously. Use Risk-Off and Black Swan to rehearse
                    downside tails before entering size.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-2">
                      Bars loaded: {state.bars.length}
                    </div>
                    <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-2">Interval: {interval}</div>
                    <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-2">Lookback: {lookback}</div>
                    <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-2">Scenario: {activeScenario.label}</div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
