// Schedule suite — per-slot baseline. Adapted from the upstream test/schedule/runner.js to run
// lib/pattern-predictor's predictSchedule. For each future day: predict the full 48-slot schedule
// from history, score it against the true day, append the truth, continue (one day ahead, fresh
// array per step). Errors aggregate over every (day, slot). Informational (exit 0) — run it on both
// implementations and compare the printouts.
//   node test/pattern-predictor/schedule/runner.mjs   (slow, ~5 min)
//
// The prediction is the MIN pod floor for a slot; the truth is demand. Signed error e = pred − actual:
//   e > 0  overscale  → wasted pods (cost), paid with certainty
//   e < 0  underscale → reactive autoscaler covers up to BUFFER_K pods; beyond that it's an SLO breach.

import { readdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { loadSchedule } from '../case-loader.mjs'

const require = createRequire(import.meta.url)
const { predictSchedule } = require('../../../lib/pattern-predictor/model.js')
const here = dirname(fileURLToPath(import.meta.url))

// Walk-forward burn-in: forecast (and absorb the truth of) the first WARMUP future days WITHOUT
// scoring them, so the metrics measure steady-state skill rather than skill at a regime boundary.
const WARMUP = 7

// ── business parameters (PLACEHOLDERS — set to your real infra/cost values) ──
const BUFFER_K = 5 // pods the reactive autoscaler can add before a breach
const COST = { wOver: 1.0, wUnder: 0.3, p: 2 } // asymmetric convex cost
function slotCost (e) {
  if (e >= 0) return COST.wOver * Math.pow(e, COST.p)
  const u = -e
  if (u <= BUFFER_K) return COST.wUnder * u
  return COST.wUnder * BUFFER_K + COST.wOver * Math.pow(u - BUFFER_K, COST.p)
}

const pct = (sortedAsc, p) => sortedAsc.length ? sortedAsc[Math.min(sortedAsc.length - 1, Math.floor(p / 100 * sortedAsc.length))] : 0
const sum = (a) => a.reduce((x, y) => x + y, 0)
const mean = (a) => a.length ? sum(a) / a.length : 0

console.log(`Schedule suite (per-slot baseline)   [warmup=${WARMUP}, BUFFER_K=${BUFFER_K}, cost wOver=${COST.wOver} wUnder=${COST.wUnder} p=${COST.p}]\n`)

const caseNumbers = readdirSync(here)
  .filter((f) => /^\d+\.history\.csv$/.test(f))
  .map((f) => parseInt(f, 10))
  .sort((a, b) => a - b)

const agg = []

for (const n of caseNumbers) {
  const { label, history, future } = loadSchedule(here, n)
  const S = future[0].slots.length

  const errs = []; const acts = []; const preds = []
  const t0 = Date.now()
  let walk = history
  future.forEach((day, j) => {
    const pred = predictSchedule(walk, day.date)
    if (j >= WARMUP) {
      for (let s = 0; s < S; s++) { preds.push(pred[s]); acts.push(day.slots[s]); errs.push(pred[s] - day.slots[s]) }
    }
    walk = walk.concat({ date: day.date, slots: day.slots })
  })
  const ms = Date.now() - t0

  const nTot = errs.length
  const abs = errs.map(Math.abs)
  const absSorted = [...abs].sort((a, b) => a - b)
  const over = errs.filter((e) => e > 0)
  const under = errs.filter((e) => e < 0).map((e) => -e)

  // accuracy
  const mae = mean(abs)
  const rmse = Math.sqrt(mean(abs.map((x) => x * x)))
  const bias = mean(errs)
  const wmape = sum(acts) ? sum(abs) / sum(acts) * 100 : NaN
  const mape = (() => { let s = 0; let k = 0; for (let i = 0; i < nTot; i++) if (acts[i] !== 0) { s += abs[i] / acts[i]; k++ } return k ? s / k * 100 : NaN })()

  // posture
  const overRate = over.length / nTot * 100
  const underRate = under.length / nTot * 100
  const exactRate = errs.filter((e) => e === 0).length / nTot * 100
  const meanOverMag = mean(over)
  const meanUnderMag = mean(under)

  // tail
  const worstOver = over.length ? Math.max(...over) : 0
  const worstUnder = under.length ? Math.max(...under) : 0

  // business axes
  const waste = sum(over)
  const shortfall = sum(under)
  const breaches = under.filter((u) => u > BUFFER_K).length
  const asym = mean(errs.map(slotCost))

  // invalid outputs
  const negPreds = preds.filter((p) => p < 0).length

  // floor-region misses (pred==0 where truth>0)
  const floorIdx = []
  for (let i = 0; i < nTot; i++) if (preds[i] === 0 && acts[i] > 0) floorIdx.push(i)
  const floorClamped = floorIdx.length
  const floorMAE = floorClamped ? mean(floorIdx.map((i) => abs[i])) : 0
  const floorMaxAbs = floorClamped ? Math.max(...floorIdx.map((i) => abs[i])) : 0

  console.log(`case ${String(n).padStart(2)}  S=${S} n=${nTot}  (${(ms / 1000).toFixed(1)}s)  ${label.split(' — ')[0]}`)
  console.log(`  accuracy   MAE ${mae.toFixed(2)}  RMSE ${rmse.toFixed(2)}  bias ${bias >= 0 ? '+' : ''}${bias.toFixed(2)}  WMAPE ${wmape.toFixed(1)}%  MAPE ${Number.isNaN(mape) ? 'n/a' : mape.toFixed(1) + '%'}`)
  console.log(`  posture    over ${overRate.toFixed(0)}% (avg +${meanOverMag.toFixed(1)})  under ${underRate.toFixed(0)}% (avg -${meanUnderMag.toFixed(1)})  exact ${exactRate.toFixed(0)}%`)
  console.log(`  tail       |e| p50 ${pct(absSorted, 50)}  p95 ${pct(absSorted, 95)}  p99 ${pct(absSorted, 99)}   worstOver +${worstOver}  worstUnder -${worstUnder}`)
  console.log(`  business   waste ${waste} pod·slots  shortfall ${shortfall}  breaches(>${BUFFER_K}) ${breaches}`)
  console.log(`  invalid    negPreds ${negPreds}`)
  console.log(`  floor      clamped ${floorClamped}  MAE ${floorMAE.toFixed(2)}  maxAbs ${floorMaxAbs}`)
  console.log(`  cost       asym ${asym.toFixed(2)} /slot`)

  agg.push({ n, mae, rmse, bias, wmape, asym, waste, shortfall, breaches, worstUnder, worstOver, negPreds, underRate, overRate, floorClamped, floorMaxAbs })
}

if (agg.length) {
  const m = agg.length
  console.log('\nAggregate over ' + m + ' cases:')
  console.log(`  accuracy   meanMAE ${mean(agg.map((a) => a.mae)).toFixed(2)}  meanRMSE ${mean(agg.map((a) => a.rmse)).toFixed(2)}  meanBias ${(mean(agg.map((a) => a.bias)) >= 0 ? '+' : '')}${mean(agg.map((a) => a.bias)).toFixed(2)}  meanWMAPE ${mean(agg.map((a) => a.wmape)).toFixed(1)}%`)
  console.log(`  posture    meanUnderRate ${mean(agg.map((a) => a.underRate)).toFixed(0)}%  meanOverRate ${mean(agg.map((a) => a.overRate)).toFixed(0)}%`)
  console.log(`  business   totWaste ${sum(agg.map((a) => a.waste))}  totShortfall ${sum(agg.map((a) => a.shortfall))}  totBreaches ${sum(agg.map((a) => a.breaches))}`)
  console.log(`  tail       worstUnder -${Math.max(...agg.map((a) => a.worstUnder))}  worstOver +${Math.max(...agg.map((a) => a.worstOver))}`)
  console.log(`  invalid    totNegPreds ${sum(agg.map((a) => a.negPreds))}`)
  console.log(`  floor      totClamped ${sum(agg.map((a) => a.floorClamped))}  maxClampError ${Math.max(...agg.map((a) => a.floorMaxAbs))}`)
  console.log(`  cost       meanAsym ${mean(agg.map((a) => a.asym)).toFixed(2)} /slot`)
}
