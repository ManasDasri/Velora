// Sanity check for the engine: `npm run check`.
// With no jumps, the 30-day spread must match what the historical volatility implies.
import assert from "node:assert/strict";
import { runSimulation } from "./simulation.js";

let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const normal = () => Math.sqrt(-2 * Math.log(rand())) * Math.cos(2 * Math.PI * rand());

const dailyVol = 0.018;
const closes = [100];
for (let i = 0; i < 500; i += 1) closes.push(closes.at(-1) * Math.exp(dailyVol * normal()));

const r = runSimulation({ closes, horizon: 30, paths: 4000, jumpChance: 0 });
const halfWidth = Math.log(r.metrics.p90 / r.metrics.p10) / 2;
const theory = 1.2816 * r.model.sigma * Math.sqrt(30); // regime vol scaling shifts this a little

assert.ok(Math.abs(halfWidth / theory - 1) < 0.15, `P10–P90 half-width ${halfWidth} vs theory ${theory}`);
assert.ok(r.metrics.p10 < r.metrics.p50 && r.metrics.p50 < r.metrics.p90);
assert.ok(r.metrics.cvar95 <= r.metrics.var95);
assert.equal(r.bands.length, 31);
assert.deepEqual(runSimulation({ closes, horizon: 10, seed: 3 }).metrics, runSimulation({ closes, horizon: 10, seed: 3 }).metrics);
console.log(`ok: 30d P10–P90 half-width ${(halfWidth * 100).toFixed(1)}% vs theory ${(theory * 100).toFixed(1)}%`);
