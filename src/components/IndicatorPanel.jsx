import { formatCompactNumber, formatPct } from "../utils/format";

const rowClass = "flex items-center justify-between rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-2";

export default function IndicatorPanel({ indicators, snapshot }) {
  return (
    <div className="gradient-outline">
      <div className="glass p-4">
        <p className="mb-3 text-sm text-slate-300">Technical + Market Data Pack</p>
        <div className="space-y-2 text-sm">
          <div className={rowClass}>
            <span className="text-slate-300">SMA20 / SMA50</span>
            <span className="text-slate-100">
              {indicators.sma20 ? indicators.sma20.toFixed(2) : "—"} / {indicators.sma50 ? indicators.sma50.toFixed(2) : "—"}
            </span>
          </div>
          <div className={rowClass}>
            <span className="text-slate-300">RSI(14)</span>
            <span className="text-slate-100">{indicators.rsi14 ? indicators.rsi14.toFixed(1) : "—"}</span>
          </div>
          <div className={rowClass}>
            <span className="text-slate-300">Realized Vol (30d)</span>
            <span className="text-slate-100">
              {indicators.realizedVol30 ? formatPct(indicators.realizedVol30) : "—"}
            </span>
          </div>
          <div className={rowClass}>
            <span className="text-slate-300">Max Drawdown</span>
            <span className="text-slate-100">{formatPct(indicators.maxDrawdown)}</span>
          </div>
          <div className={rowClass}>
            <span className="text-slate-300">Volume Regime (5d/30d)</span>
            <span className="text-slate-100">{indicators.volumeRegime ? `${indicators.volumeRegime.toFixed(2)}x` : "—"}</span>
          </div>
          <div className={rowClass}>
            <span className="text-slate-300">Day Range</span>
            <span className="text-slate-100">
              {snapshot.dayLow && snapshot.dayHigh ? `${snapshot.dayLow.toFixed(2)} - ${snapshot.dayHigh.toFixed(2)}` : "—"}
            </span>
          </div>
          <div className={rowClass}>
            <span className="text-slate-300">Market Cap</span>
            <span className="text-slate-100">{formatCompactNumber(snapshot.marketCap)}</span>
          </div>
          <div className={rowClass}>
            <span className="text-slate-300">P/E (TTM)</span>
            <span className="text-slate-100">{snapshot.peTTM ? snapshot.peTTM.toFixed(2) : "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
