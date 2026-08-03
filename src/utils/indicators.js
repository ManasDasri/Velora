const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);

export const sma = (values, period) => {
  if (values.length < period) return null;
  return mean(values.slice(-period));
};

export const rsi = (values, period = 14) => {
  if (values.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i += 1) {
    const delta = values[i] - values[i - 1];
    if (delta >= 0) gains += delta;
    else losses += Math.abs(delta);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
};

export const maxDrawdown = (values) => {
  let peak = values[0];
  let worst = 0;
  values.forEach((value) => {
    if (value > peak) peak = value;
    const drawdown = (value - peak) / peak;
    if (drawdown < worst) worst = drawdown;
  });
  return Math.abs(worst);
};

export const realizedVolatility = (values, window = 30) => {
  if (values.length < window + 1) return null;
  const sample = values.slice(-(window + 1));
  const returns = [];
  for (let i = 1; i < sample.length; i += 1) {
    returns.push(Math.log(sample[i] / sample[i - 1]));
  }
  const avg = mean(returns);
  const variance = returns.reduce((sum, value) => sum + (value - avg) ** 2, 0) / Math.max(returns.length - 1, 1);
  return Math.sqrt(variance) * Math.sqrt(252);
};

export const volumeRegime = (bars) => {
  if (bars.length < 30) return null;
  const recent = mean(bars.slice(-5).map((bar) => bar.volume));
  const baseline = mean(bars.slice(-30).map((bar) => bar.volume));
  if (baseline === 0) return null;
  return recent / baseline;
};
