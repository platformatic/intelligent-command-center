'use strict'

// Median of a list of numbers. Returns 0 for an empty list. Does not mutate the input.
function median (numbers) {
  if (numbers.length === 0) return 0
  const s = numbers.slice().sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// Trimmed mean: drop floor(n * trim) values from each end of the sorted list and average
// the rest. Returns 0 for an empty list. Does not mutate the input.
function trimmedMean (numbers, trim) {
  if (numbers.length === 0) return 0
  const cut = Math.floor(numbers.length * trim)
  const s = numbers.slice().sort((a, b) => a - b)
  const kept = s.slice(cut, s.length - cut)
  return kept.reduce((sum, n) => sum + n, 0) / kept.length
}

// Median absolute deviation scaled to approximate a standard deviation. Spread is measured
// around the median, so a handful of outliers can't inflate it. Returns 0 for an empty list.
function robustScale (numbers) {
  if (numbers.length === 0) return 0
  const med = median(numbers)
  return 1.4826 * median(numbers.map((x) => Math.abs(x - med)))
}

// Within-regime noise from consecutive first differences: differencing cancels a slowly
// moving level, robustScale of the diffs leaves the step-to-step noise, and dividing by √2
// undoes the variance doubling differencing introduces. Returns 0 for fewer than two values.
function diffScale (numbers) {
  if (numbers.length < 2) return 0
  const diffs = []
  for (let i = 1; i < numbers.length; i++) {
    diffs.push(numbers[i] - numbers[i - 1])
  }
  return robustScale(diffs) / Math.sqrt(2)
}

// Clipped standardized squared error: each residual is scaled by sigma, squared, and capped
// at clip² so a single large residual can't dominate the objective.
function robustLoss (residuals, sigma, clip = 3) {
  let loss = 0
  for (const r of residuals) {
    const e = r / sigma
    loss += Math.min(e * e, clip * clip)
  }
  return loss
}

// Measured noise scale: the irreducible floor combined with the within-regime spread estimated
// from consecutive differences (diffScale), so a real step or trend doesn't inflate it. Always
// ≥ floor; empty/short input falls back to the floor.
function noiseScale (residuals, floor = 3) {
  const tau = diffScale(residuals)
  return Math.sqrt(floor * floor + tau * tau)
}

// Linear-interpolation percentile (p in [0, 100]). Empty → 0. Does not mutate the input.
function percentile (numbers, p) {
  if (numbers.length === 0) return 0
  const s = numbers.slice().sort((a, b) => a - b)
  if (s.length === 1) return s[0]
  const idx = (p / 100) * (s.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return s[lo]
  return s[lo] + (idx - lo) * (s[hi] - s[lo])
}

module.exports = { median, trimmedMean, robustScale, diffScale, robustLoss, noiseScale, percentile }
