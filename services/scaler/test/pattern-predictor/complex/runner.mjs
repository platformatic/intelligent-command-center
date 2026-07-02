// Complex suite — realistic noisy cases. Adapted from the upstream test/complex/runner.js to run
// lib/pattern-predictor. Walk-forward, one step ahead: predict a day, score against its true value,
// append the truth, continue. Prints error metrics per case + aggregate. Informational (exit 0) —
// run it on both implementations and compare the printouts.
//   node test/pattern-predictor/complex/runner.mjs

import { readdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { loadComplex } from '../case-loader.mjs'

const require = createRequire(import.meta.url)
const { buildModel, predict } = require('../../../lib/pattern-predictor/model.js')
const here = dirname(fileURLToPath(import.meta.url))

console.log('Complex suite\n')

const caseNumbers = readdirSync(here)
  .filter((f) => /^\d+\.history\.csv$/.test(f))
  .map((f) => parseInt(f, 10))
  .sort((a, b) => a - b)

const aggregate = { mae: 0, rmse: 0, bias: 0, maxAbs: 0, mape: 0, mapeCount: 0 }
let casesEvaluated = 0

for (const n of caseNumbers) {
  const { label, history, future } = loadComplex(here, n)

  let sumAbs = 0
  let sumSq = 0
  let sumSigned = 0
  let maxAbs = 0
  let sumPct = 0
  let nPct = 0
  // Fresh series per step (buildModel is pure) so each prediction sees the true past.
  let walk = history
  for (const target of future) {
    const got = predict(buildModel(walk), target.date)
    walk = walk.concat({ date: target.date, value: target.value })
    const err = got - target.value
    const abs = Math.abs(err)
    sumAbs += abs
    sumSq += err * err
    sumSigned += err
    if (abs > maxAbs) maxAbs = abs
    if (target.value !== 0) { sumPct += abs / Math.abs(target.value); nPct++ }
  }
  const n0 = future.length
  const mae = sumAbs / n0
  const rmse = Math.sqrt(sumSq / n0)
  const bias = sumSigned / n0
  const mape = nPct > 0 ? (sumPct / nPct) * 100 : NaN

  console.log(
    `case ${n}: n=${n0}  MAE=${mae.toFixed(2)}  RMSE=${rmse.toFixed(2)}  ` +
    `bias=${bias >= 0 ? '+' : ''}${bias.toFixed(2)}  maxAbs=${maxAbs}  ` +
    `MAPE=${Number.isNaN(mape) ? 'n/a' : mape.toFixed(2) + '%'}`
  )
  if (label) console.log(`         ${label}`)

  aggregate.mae += mae
  aggregate.rmse += rmse
  aggregate.bias += bias
  aggregate.maxAbs = Math.max(aggregate.maxAbs, maxAbs)
  if (!Number.isNaN(mape)) { aggregate.mape += mape; aggregate.mapeCount++ }
  casesEvaluated++
}

if (casesEvaluated > 0) {
  const m = casesEvaluated
  const meanMape = aggregate.mapeCount > 0 ? (aggregate.mape / aggregate.mapeCount).toFixed(2) + '%' : 'n/a'
  console.log(
    `\nAggregate over ${m} cases: ` +
    `meanMAE=${(aggregate.mae / m).toFixed(2)}  ` +
    `meanRMSE=${(aggregate.rmse / m).toFixed(2)}  ` +
    `meanBias=${(aggregate.bias / m >= 0 ? '+' : '')}${(aggregate.bias / m).toFixed(2)}  ` +
    `worstMaxAbs=${aggregate.maxAbs}  ` +
    `meanMAPE=${meanMape}`
  )
}
