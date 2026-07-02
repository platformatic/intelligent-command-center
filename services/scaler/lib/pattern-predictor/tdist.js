'use strict'

// Two-sided Student-t critical value via the regularized incomplete beta — no normal
// approximation, which is badly wrong at the low df / tiny α these gates run at. Numerical
// Recipes gammaln / betacf / betai.

function gammaln (x) {
  const cof = [
    76.18009172947146, -86.50532032941678, 24.01409824083091,
    -1.231739572450155, 0.001208650973866179, -0.000005395239384953
  ]
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  let y = x
  for (let j = 0; j < 6; j++) {
    y += 1
    ser += cof[j] / y
  }
  return -tmp + Math.log(2.5066282746310007 * ser / x)
}

// Continued-fraction evaluation for the incomplete beta (Lentz's method).
function betacf (a, b, x) {
  const MAX_ITER = 200
  const EPS = 3e-12
  const FPMIN = 1e-300
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - qab * x / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

// Regularized incomplete beta I_x(a, b).
function betai (a, b, x) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const front = Math.exp(
    gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x)
  )
  if (x < (a + 1) / (a + b + 2)) {
    return front * betacf(a, b, x) / a
  }
  return 1 - front * betacf(b, a, 1 - x) / b
}

// Two-sided tail of the Student-t distribution: P(|T_df| > t) = I_x(df/2, 1/2),
// x = df / (df + t²). Monotonically decreasing in t ≥ 0.
function studentTwoSidedTail (t, df) {
  return betai(df / 2, 0.5, df / (df + t * t))
}

// Smallest t ≥ 0 whose two-sided tail is ≤ alpha. df ≤ 0 or alpha ∉ (0, 1) → Infinity, so a
// gate built on this fails closed. The tail decreases in t, so bracket hi by doubling from 1
// (cap 1e8), then 200 bisection steps. Memoised: the gates only ever ask for a handful of
// (df, alpha) pairs, but ask millions of times during discovery — without the cache each call
// re-runs the bisection's incomplete-beta series and dominates the whole run.
const criticalCache = new Map()

function tCriticalTwoSided (df, alpha) {
  if (df <= 0 || alpha <= 0 || alpha >= 1) return Infinity

  const key = df + ',' + alpha
  const cached = criticalCache.get(key)
  if (cached !== undefined) return cached

  let result
  let hi = 1
  while (studentTwoSidedTail(hi, df) > alpha) {
    hi *= 2
    if (hi > 1e8) { result = hi; break }
  }
  if (result === undefined) {
    let lo = 0
    for (let iter = 0; iter < 200; iter++) {
      const mid = (lo + hi) / 2
      if (studentTwoSidedTail(mid, df) > alpha) lo = mid
      else hi = mid
    }
    result = (lo + hi) / 2
  }

  criticalCache.set(key, result)
  return result
}

module.exports = { tCriticalTwoSided, studentTwoSidedTail }
