// Monte Carlo engine. Everything is per bar (one trading day for daily data):
// mu and sigma are the mean and std of historical daily log returns, and each
// simulated step draws one day's log return. No annualisation, no dt.

const BEAR = 0;
const NEUTRAL = 1;
const BULL = 2;
const STATE_VOL = [1.25, 1, 0.8]; // bear days are wilder, bull days calmer
const BAND_QS = { p5: 0.05, p10: 0.1, p25: 0.25, p50: 0.5, p75: 0.75, p90: 0.9, p95: 0.95 };

// Seeded PRNG so moving a slider doesn't reshuffle every number on screen.
const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const normal = (rand) => {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
};

const quantile = (sorted, q) => sorted[Math.floor((sorted.length - 1) * q)];
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);

export const estimateModel = (closes) => {
  const returns = [];
  for (let i = 1; i < closes.length; i += 1) returns.push(Math.log(closes[i] / closes[i - 1]));
  const mu = mean(returns);
  const sigma = Math.sqrt(returns.reduce((s, r) => s + (r - mu) ** 2, 0) / Math.max(returns.length - 1, 1)) || 0.02;

  const cut = sigma * 0.35;
  const states = returns.map((r) => (r > cut ? BULL : r < -cut ? BEAR : NEUTRAL));
  const counts = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (let i = 1; i < states.length; i += 1) counts[states[i - 1]][states[i]] += 1;
  const matrix = counts.map((row) => {
    const total = row[0] + row[1] + row[2];
    return total ? row.map((c) => c / total) : [1 / 3, 1 / 3, 1 / 3];
  });

  return { mu: Number.isFinite(mu) ? mu : 0, sigma, matrix, lastState: states.at(-1) ?? NEUTRAL };
};

/**
 * driftTilt: extra daily drift in units of sigma (0.03 ≈ +11%/yr for a 1.5%-vol stock).
 * volScale: multiplies sigma. jumpChance: per-day probability of a jump of ~N(0, 4σ).
 */
export const runSimulation = ({ closes, horizon = 30, paths = 2000, driftTilt = 0, volScale = 1, jumpChance = 0.01, seed = 7 }) => {
  const rand = mulberry32(seed);
  const model = estimateModel(closes);
  const spot = closes.at(-1);
  const muEff = model.mu + driftTilt * model.sigma;
  const sigmaEff = model.sigma * volScale;

  // columns[t][p] = price of path p after t steps; column 0 is today.
  const columns = Array.from({ length: horizon + 1 }, () => new Float64Array(paths));
  columns[0].fill(spot);
  const occupancy = Array.from({ length: horizon }, () => [0, 0, 0]);

  for (let p = 0; p < paths; p += 1) {
    let state = model.lastState;
    let price = spot;
    for (let t = 0; t < horizon; t += 1) {
      const row = model.matrix[state];
      const r = rand();
      state = r < row[0] ? BEAR : r < row[0] + row[1] ? NEUTRAL : BULL;
      occupancy[t][state] += 1;

      const vol = sigmaEff * STATE_VOL[state];
      let step = muEff + vol * normal(rand);
      if (rand() < jumpChance) step += 4 * model.sigma * normal(rand);
      price *= Math.exp(step);
      columns[t + 1][p] = price;
    }
  }

  // A handful of raw paths for texture on the chart, taken before sorting.
  const samples = Array.from({ length: Math.min(24, paths) }, (_, p) => columns.map((col) => col[p]));

  const bands = columns.map((col) => {
    col.sort();
    const band = { mean: mean(col), up: 0 };
    for (const [k, q] of Object.entries(BAND_QS)) band[k] = quantile(col, q);
    let above = 0;
    for (let i = 0; i < col.length; i += 1) if (col[i] > spot) above += 1;
    band.up = above / col.length;
    return band;
  });

  const finals = columns[horizon]; // sorted
  const var95 = quantile(finals, 0.05);
  let tailSum = 0;
  let tailN = 0;
  for (let i = 0; i < finals.length && finals[i] <= var95; i += 1) {
    tailSum += finals[i];
    tailN += 1;
  }

  const checkpoints = [...new Set([5, 10, 20, 30, 60, 90, horizon])].filter((d) => d <= horizon).sort((a, b) => a - b);

  return {
    spot,
    horizon,
    paths,
    model: { ...model, annualVol: model.sigma * Math.sqrt(252) },
    bands,
    samples,
    finals,
    occupancy: occupancy.map((row) => row.map((c) => c / paths)),
    checkpoints: checkpoints.map((day) => ({ day, ...bands[day] })),
    metrics: { ...bands[horizon], var95, cvar95: tailN ? tailSum / tailN : var95 },
  };
};
