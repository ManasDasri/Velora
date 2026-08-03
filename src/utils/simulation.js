const EPSILON = 1e-8;

const classifyState = (ret, sigma) => {
  if (ret > sigma * 0.35) {
    return 2;
  }
  if (ret < -sigma * 0.35) {
    return 0;
  }
  return 1;
};

const estimateModel = (closes) => {
  const returns = [];
  for (let i = 1; i < closes.length; i += 1) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }

  const mu = returns.reduce((sum, value) => sum + value, 0) / (returns.length || 1);
  const sigma = Math.sqrt(
    returns.reduce((sum, value) => sum + (value - mu) ** 2, 0) / (Math.max(returns.length - 1, 1)),
  );

  const states = returns.map((ret) => classifyState(ret, sigma || EPSILON));
  const matrix = Array.from({ length: 3 }, () => Array(3).fill(0));

  for (let i = 1; i < states.length; i += 1) {
    matrix[states[i - 1]][states[i]] += 1;
  }

  for (let i = 0; i < 3; i += 1) {
    const rowSum = matrix[i].reduce((sum, value) => sum + value, 0);
    if (rowSum === 0) {
      matrix[i] = [1 / 3, 1 / 3, 1 / 3];
    } else {
      matrix[i] = matrix[i].map((value) => value / rowSum);
    }
  }

  return {
    mu: Number.isFinite(mu) ? mu : 0,
    sigma: Number.isFinite(sigma) ? sigma : 0.02,
    matrix,
    lastState: states.at(-1) ?? 1,
  };
};

const pickNextState = (row) => {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < row.length; i += 1) {
    cumulative += row[i];
    if (r <= cumulative) {
      return i;
    }
  }
  return row.length - 1;
};

const randomNormal = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export const runSimulation = ({
  closes,
  horizonDays = 30,
  paths = 1000,
  sentiment = 0,
  shockChance = 0.03,
  driftBias = 1,
  volatilityBias = 1,
}) => {
  const model = estimateModel(closes);
  const driftMultiplier = (1 + sentiment * 0.4) * driftBias;
  const volMultiplier = (1 + Math.abs(sentiment) * 0.25) * volatilityBias;
  const stateVolScale = [1.25, 1, 0.8];
  const dt = 1 / 252;
  const s0 = closes.at(-1);
  const simulations = [];
  const finalPrices = [];
  const stateOccupancy = Array.from({ length: horizonDays }, () => [0, 0, 0]);

  for (let p = 0; p < paths; p += 1) {
    let state = model.lastState;
    let price = s0;
    const line = [price];

    for (let t = 0; t < horizonDays; t += 1) {
      state = pickNextState(model.matrix[state]);
      stateOccupancy[t][state] += 1;

      const sigmaStep = model.sigma * volMultiplier * stateVolScale[state];
      const z = randomNormal();
      const shock = Math.random() < shockChance ? (Math.random() - 0.5) * sigmaStep * 8 : 0;
      const drift = (model.mu * driftMultiplier - 0.5 * sigmaStep * sigmaStep) * dt;
      const diffusion = sigmaStep * Math.sqrt(dt) * z;

      price *= Math.exp(drift + diffusion + shock);
      line.push(price);
    }

    simulations.push(line);
    finalPrices.push(price);
  }

  finalPrices.sort((a, b) => a - b);
  const quantile = (q) => finalPrices[Math.floor((finalPrices.length - 1) * q)];
  const expected = finalPrices.reduce((sum, value) => sum + value, 0) / finalPrices.length;
  const current = closes.at(-1);
  const upProbability = finalPrices.filter((price) => price > current).length / finalPrices.length;
  const var95 = quantile(0.05);
  const cvar95 =
    finalPrices.filter((value) => value <= var95).reduce((sum, value) => sum + value, 0) /
    Math.max(finalPrices.filter((value) => value <= var95).length, 1);
  const checkpointDays = Array.from(new Set([5, 10, 20, 30, 60, 90, horizonDays])).filter(
    (day) => day > 0 && day <= horizonDays,
  );
  const cone = checkpointDays.map((day) => {
    const idx = day;
    const values = simulations.map((path) => path[idx]).sort((a, b) => a - b);
    const expectedAtDay = values.reduce((sum, value) => sum + value, 0) / values.length;
    return {
      day,
      expected: expectedAtDay,
      p10: values[Math.floor((values.length - 1) * 0.1)],
      p50: values[Math.floor((values.length - 1) * 0.5)],
      p90: values[Math.floor((values.length - 1) * 0.9)],
      upProbability: values.filter((value) => value > current).length / values.length,
    };
  });

  return {
    simulations,
    finalPrices,
    stateOccupancy: stateOccupancy.map((row) => row.map((v) => v / paths)),
    metrics: {
      expected,
      p10: quantile(0.1),
      p50: quantile(0.5),
      p90: quantile(0.9),
      upProbability,
      var95,
      cvar95,
      dailyVolatility: model.sigma,
      annualizedVolatility: model.sigma * Math.sqrt(252),
    },
    matrix: model.matrix,
    cone,
  };
};
