import { useEffect, useMemo, useRef, useState } from "react";
import FanChart from "./components/FanChart";
import Distribution from "./components/Distribution";
import Regimes from "./components/Regimes";
import { fetchMarketData } from "./services/marketDataService";
import { synthesizeSentiment } from "./services/groqService";
import { formatChange, formatCompact, formatMoney, formatPct } from "./utils/format";
import { maxDrawdown, realizedVolatility, rsi, sma, volumeRegime } from "./utils/indicators";
import { runSimulation } from "./utils/simulation";

const HORIZONS = [10, 30, 60, 90];
const PATHS = 2000;
// tilt: extra daily drift in sigma units. vol: volatility multiplier. jump: jump-frequency multiplier.
const SCENARIOS = {
  base: { label: "Base", tilt: 0, vol: 1, jump: 1, hint: "History as it is" },
  riskOn: { label: "Risk-on", tilt: 0.03, vol: 0.9, jump: 0.7, hint: "Stronger drift, calmer days" },
  riskOff: { label: "Risk-off", tilt: -0.03, vol: 1.2, jump: 1.3, hint: "Weaker drift, choppier days" },
  stress: { label: "Stress", tilt: -0.08, vol: 1.6, jump: 2.5, hint: "Sell-off with frequent jumps" },
};
const SENTIMENT_TILT = 0.04; // a fully bullish headline read adds 0.04σ of drift per day

function Segmented({ name, options, value, onChange }) {
  return (
    <div role="radiogroup" aria-label={name} className="inline-flex rounded-md border border-rule bg-surface p-0.5">
      {options.map(([key, label, hint]) => (
        <label key={key} title={hint} className="cursor-pointer">
          <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} className="peer sr-only" />
          <span className="block whitespace-nowrap rounded px-2.5 py-1.5 text-sm sm:px-3 text-muted transition-colors peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-fan">
            {label}
          </span>
        </label>
      ))}
    </div>
  );
}

function Figure({ label, value, note, title }) {
  return (
    <div title={title}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-medium text-ink">{value}</dd>
      {note && <dd className="text-sm text-muted">{note}</dd>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="border-t border-rule py-10">
      <h2 className="mb-6 font-serif text-3xl text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default function App() {
  const [input, setInput] = useState("AAPL");
  const [data, setData] = useState(null);
  const [sentiment, setSentiment] = useState({ status: "idle" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [horizon, setHorizon] = useState(30);
  const [scenarioKey, setScenarioKey] = useState("base");
  const [jumpPct, setJumpPct] = useState(1);
  const request = useRef(0);

  const load = async (raw) => {
    const symbol = raw.trim().toUpperCase();
    if (!symbol) return;
    const id = ++request.current;
    setLoading(true);
    setError("");
    try {
      const next = await fetchMarketData(symbol);
      if (id !== request.current) return;
      setData({ ...next, symbol });
      setSentiment({ status: next.headlines.length ? "loading" : "idle" });
      // The headline read arrives after the chart; the forecast re-runs when it lands.
      synthesizeSentiment(symbol, next.headlines)
        .then((s) => id === request.current && setSentiment(s ? { status: "done", ...s } : { status: "idle" }))
        .catch((e) => id === request.current && setSentiment({ status: "error", message: e.message }));
    } catch (e) {
      if (id === request.current) setError(`Couldn't load ${symbol}. ${e.message}`);
    } finally {
      if (id === request.current) setLoading(false);
    }
  };

  useEffect(() => {
    load("AAPL");
  }, []);

  const closes = useMemo(() => data?.bars.map((b) => b.close) ?? [], [data]);
  const scenario = SCENARIOS[scenarioKey];
  const read = sentiment.status === "done" ? sentiment : null;

  const result = useMemo(() => {
    if (closes.length < 30) return null;
    return runSimulation({
      closes,
      horizon,
      paths: PATHS,
      driftTilt: scenario.tilt + SENTIMENT_TILT * (read?.score ?? 0),
      volScale: scenario.vol * (read?.volatilityFactor ?? 1),
      jumpChance: (jumpPct / 100) * scenario.jump,
    });
  }, [closes, horizon, scenario, jumpPct, read]);

  const stats = useMemo(
    () =>
      data && {
        vol30: realizedVolatility(closes, 30),
        rsi14: rsi(closes, 14),
        sma20: sma(closes, 20),
        sma50: sma(closes, 50),
        drawdown: maxDrawdown(closes),
        volume: volumeRegime(data.bars),
      },
    [data, closes],
  );

  const m = result?.metrics;
  const snap = data?.snapshot;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rule bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 sm:px-6">
          <p className="font-serif text-2xl leading-none">Velora</p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              load(input);
            }}
          >
            <label htmlFor="ticker" className="sr-only">
              Ticker symbol
            </label>
            <input
              id="ticker"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              maxLength={15}
              autoComplete="off"
              spellCheck="false"
              className="w-28 rounded-md border border-rule bg-paper px-3 py-1.5 text-sm font-medium uppercase outline-none focus-visible:border-fan focus-visible:ring-2 focus-visible:ring-fan/30"
            />
            <button disabled={loading} className="rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50">
              {loading ? "Loading…" : "Forecast"}
            </button>
          </form>
          {data && (
            <p className="ml-auto text-sm text-muted">
              <span className="font-medium text-ink">{data.symbol}</span> last close {formatMoney(closes.at(-1))}
              {Number.isFinite(snap?.changePercent) && (
                <span className={snap.changePercent >= 0 ? " text-up" : " text-down"}>
                  {" "}
                  {snap.changePercent >= 0 ? "+" : "−"}
                  {Math.abs(snap.changePercent).toFixed(2)}% today
                </span>
              )}
            </p>
          )}
        </div>
      </header>

      {data?.demo && (
        <p className="bg-ink px-4 py-2 text-center text-sm text-paper/85">
          Demo mode: these are synthetic prices, not real {data.symbol} data. Add the API keys in Vercel to use live market data.
        </p>
      )}

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {error && <p className="mt-6 rounded-md border border-down/40 bg-down/5 px-4 py-3 text-sm text-down">{error}</p>}

        {!result ? (
          <p className="py-24 font-serif text-3xl text-muted">{loading ? `Simulating ${input}…` : "Enter a ticker to see its forecast."}</p>
        ) : (
          <>
            <section className="pb-6 pt-10 sm:pt-14">
              <h1 className="max-w-4xl font-serif text-4xl leading-[1.08] tracking-tight sm:text-6xl">
                In {horizon} trading days, {data.symbol} ends above today’s {formatMoney(result.spot)} in {formatPct(m.up)} of{" "}
                {PATHS.toLocaleString()} simulated paths.
              </h1>

              <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-4">
                <Figure label="Median outcome" value={formatMoney(m.p50)} note={formatChange(m.p50, result.spot)} />
                <Figure label="8 in 10 paths land between" value={`${formatMoney(m.p10)} – ${formatMoney(m.p90)}`} note={`${formatChange(m.p10, result.spot)} to ${formatChange(m.p90, result.spot)}`} />
                <Figure label="1 in 20 paths ends below" value={formatMoney(m.var95)} note={formatChange(m.var95, result.spot)} title="Value at risk, 95%" />
                <Figure label="Average of those worst paths" value={formatMoney(m.cvar95)} note={formatChange(m.cvar95, result.spot)} title="Conditional value at risk (expected shortfall), 95%" />
              </dl>
            </section>

            <section className={`transition-opacity ${loading ? "opacity-50" : ""}`}>
              <FanChart bars={data.bars} result={result} revealKey={data.symbol + data.bars.length} />
              <p className="mt-2 text-sm text-muted">
                Shaded bands hold the middle 50%, 80% and 90% of paths. The line through them is the median. Hover to read any day.
              </p>
            </section>

            <section className="flex flex-wrap items-end gap-x-8 gap-y-5 py-8">
              <div>
                <p className="mb-2 text-sm text-muted">Horizon</p>
                <Segmented name="Horizon" value={String(horizon)} onChange={(v) => setHorizon(Number(v))} options={HORIZONS.map((h) => [String(h), `${h}d`, `${h} trading days`])} />
              </div>
              <div>
                <p className="mb-2 text-sm text-muted">Scenario</p>
                <Segmented name="Scenario" value={scenarioKey} onChange={setScenarioKey} options={Object.entries(SCENARIOS).map(([k, s]) => [k, s.label, s.hint])} />
              </div>
              <label className="min-w-56 flex-1 sm:max-w-xs">
                <span className="mb-2 flex justify-between text-sm text-muted">
                  Chance of a jump day <span className="text-ink">{jumpPct}%</span>
                </span>
                <input type="range" min={0} max={5} step={0.5} value={jumpPct} onChange={(e) => setJumpPct(Number(e.target.value))} className="w-full accent-fan" />
              </label>
              <p className="basis-full text-sm text-muted">{scenario.hint}. Changes re-run all {PATHS.toLocaleString()} paths instantly.</p>
            </section>

            <Section title="Where the paths end">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-[3fr_2fr]">
                <div>
                  <Distribution result={result} />
                  <p className="mt-2 text-sm text-muted">Each bar counts paths ending at that price. Red is below today; the darkest red is the worst 5%.</p>
                </div>
                <table className="w-full self-start text-sm">
                  <thead>
                    <tr className="border-b border-rule text-left text-muted">
                      <th className="pb-2 font-normal">Days ahead</th>
                      <th className="pb-2 text-right font-normal">Median</th>
                      <th className="pb-2 text-right font-normal">8 in 10 between</th>
                      <th className="pb-2 text-right font-normal">Above today</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.checkpoints.map((c) => (
                      <tr key={c.day} className="border-b border-rule/60">
                        <td className="py-2">{c.day}</td>
                        <td className="py-2 text-right">{formatMoney(c.p50)}</td>
                        <td className="py-2 text-right text-muted">
                          {formatMoney(c.p10)} – {formatMoney(c.p90)}
                        </td>
                        <td className={`py-2 text-right ${c.up >= 0.5 ? "text-up" : "text-down"}`}>{formatPct(c.up)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="What the headlines say">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-[2fr_3fr]">
                <div>
                  {sentiment.status === "loading" && <p className="text-muted">Reading this week’s headlines…</p>}
                  {sentiment.status === "error" && <p className="text-down">{sentiment.message}</p>}
                  {sentiment.status === "idle" && (
                    <p className="text-muted">{data.demo ? "Headlines aren’t available in demo mode, so the forecast uses price history only." : "No headlines this week, so the forecast uses price history only."}</p>
                  )}
                  {read && (
                    <>
                      <p className="font-serif text-2xl leading-snug">{read.narrative}</p>
                      <p className="mt-4 text-sm text-muted">
                        Read as {read.score > 0.15 ? "bullish" : read.score < -0.15 ? "bearish" : "neutral"} ({read.score.toFixed(2)}). The forecast{" "}
                        {Math.abs(read.score) < 0.05 ? "keeps its drift" : `leans ${read.score > 0 ? "up" : "down"}`} and scales volatility by ×{read.volatilityFactor.toFixed(2)}.
                      </p>
                    </>
                  )}
                </div>
                {data.headlines.length > 0 && (
                  <ul className="divide-y divide-rule border-y border-rule text-sm">
                    {data.headlines.map((h, i) => (
                      <li key={i} className="py-3">
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Section>

            <Section title="Day-to-day patterns">
              <Regimes result={result} />
            </Section>

            <Section title="Recent trading">
              <dl className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
                <Figure label="Volatility, last 30 days" value={formatPct(stats.vol30, 1)} note="annualised" />
                <Figure label="RSI (14 days)" value={stats.rsi14?.toFixed(0) ?? "—"} note={stats.rsi14 > 70 ? "overbought" : stats.rsi14 < 30 ? "oversold" : "neutral range"} />
                <Figure label="20 / 50-day average" value={`${formatMoney(stats.sma20)} / ${formatMoney(stats.sma50)}`} note={stats.sma20 > stats.sma50 ? "short-term trend up" : "short-term trend down"} />
                <Figure label="Largest drop from a peak" value={formatPct(stats.drawdown, 1)} note={`over ${closes.length} sessions`} />
                <Figure label="Volume vs 30-day average" value={stats.volume ? `${stats.volume.toFixed(2)}×` : "—"} note="last 5 sessions" />
                <Figure label="Market cap" value={snap?.marketCap ? `$${formatCompact(snap.marketCap * 1e6)}` : "—"} />
                <Figure label="P/E, trailing 12 months" value={snap?.peTTM ? snap.peTTM.toFixed(1) : "—"} />
                <Figure label="Today’s range" value={snap?.dayLow ? `${formatMoney(snap.dayLow)} – ${formatMoney(snap.dayHigh)}` : "—"} />
              </dl>
            </Section>
          </>
        )}
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-muted sm:px-6 md:grid-cols-[2fr_1fr]">
          <p className="max-w-prose">
            Velora estimates daily return and volatility from about two years of closing prices, then simulates {PATHS.toLocaleString()} futures. Each simulated day
            moves between down, flat and up states using the transition odds seen in history, with rare jump days added on top. An AI read of the week’s headlines
            can nudge the drift and volatility. The result is a spread of possibilities, not a prediction.
          </p>
          <p>Not investment advice. Past behaviour of a price is a weak guide to its future.</p>
        </div>
      </footer>
    </div>
  );
}
