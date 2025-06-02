'use strict'

function calculateWeights (distinctBodies, requestsCount) {
  const variability = Math.min(distinctBodies / requestsCount, 1)
  const weightFreq = Math.min(0.5 + 0.25 * (1 - variability), 0.75)
  const weightStab = 1 - weightFreq
  return { weightFreq, weightStab }
}

function welfordUpdate (prevStats, value) {
  const { count, mean, m2 } = prevStats

  const newCount = count + 1

  const delta = value - mean
  const newMean = mean + delta / newCount
  const newM2 = m2 + delta * (value - newMean)

  const stdDev = newCount > 1 ? Math.sqrt(newM2 / newCount) : 0

  return {
    count: newCount,
    mean: round(newMean),
    m2: round(newM2),
    stdDev: round(stdDev)
  }
}

function gaussianKernel (x, mean, stdDev, scale = 1) {
  stdDev = stdDev / scale
  if (stdDev === 0) return x === mean ? 1 : 0
  return Math.exp(-((x - mean) ** 2) / (2 * (stdDev ** 2)))
}

function calculateHistScore ({
  avgInterRequestTime,
  stabScore,
  frequencyStats,
  stabilityStats
}) {
  let frequencyScore = gaussianKernel(
    avgInterRequestTime,
    frequencyStats.mean,
    frequencyStats.stdDev,
    2
  )
  let stabilityScore = gaussianKernel(
    stabScore,
    stabilityStats.mean,
    stabilityStats.stdDev,
    2
  )

  frequencyScore = Math.min(1, frequencyScore * frequencyStats.stdDev * Math.sqrt(2 * Math.PI))
  stabilityScore = Math.min(1, stabilityScore * stabilityStats.stdDev * Math.sqrt(2 * Math.PI))

  return (frequencyScore + stabilityScore) / 2
}

function calculateAvgHistScore (scoresHistory, opts) {
  let scoresSum = 0
  let weightsSum = 0

  for (let i = 0; i < scoresHistory.length; i++) {
    const weight = Math.exp(-opts.DECAY_FACTOR * (scoresHistory.length - i - 1))

    scoresSum += weight * scoresHistory[i].score
    weightsSum += weight
  }

  return scoresSum / weightsSum
}

function calculateRecommendationBonus (scoresHistory) {
  let sum = 0
  for (let i = 0; i < scoresHistory.length; i++) {
    sum += scoresHistory[i].recommended
  }
  return (sum / scoresHistory.length) * 0.1
}

function calculateScore (metrics, opts = {}) {
  let {
    distinctUrls,
    distinctBodies,
    requestsCount,
    maxRequestsCount,
    scoresHistory,
    frequencyStats,
    stabilityStats,
    avgInterRequestTime,
    interRequestTimes,
    isFirstRecommendation,
    parentRouteScore,
    parentRouteRequestCount
  } = metrics

  const {
    HISTORY_LENGTH,
    SCORE_THRESHOLD,
    DECAY_FACTOR,
    EXPECTED_IDS,
    HISTORY_WEIGHT,
    PAST_SCORE_WEIGHT,
    SCALE_FACTOR,
    SCALE_SIGMA,
    BASE_TTL,
    MIN_TTL,
    MAX_TTL
  } = opts

  scoresHistory ??= []
  frequencyStats ??= {
    count: 2,
    mean: 1000,
    stdDev: 10,
    m2: 2 * Math.pow(1000, 2)
  }
  stabilityStats ??= {
    count: 2,
    mean: 0.5,
    stdDev: 0.5,
    m2: 2 * Math.pow(0.5, 2)
  }

  const stabScore = 1 / distinctBodies

  for (const time of interRequestTimes) {
    frequencyStats = welfordUpdate(frequencyStats, time)
  }
  stabilityStats = welfordUpdate(stabilityStats, stabScore)

  let freqScore = 0
  if (isFirstRecommendation) {
    freqScore = Math.min(SCALE_FACTOR / avgInterRequestTime, 1)
  } else {
    freqScore = gaussianKernel(
      avgInterRequestTime,
      frequencyStats.mean,
      frequencyStats.stdDev,
      2
    )
    freqScore = Math.min(freqScore, 1)
  }

  const { weightFreq, weightStab } = calculateWeights(distinctBodies, requestsCount)
  const baseScore = weightFreq * freqScore + weightStab * stabScore

  let historyScore = 0.5
  let pastScoreAvg = 0.5
  let recommendationBonus = 0

  if (!isFirstRecommendation) {
    historyScore = calculateHistScore({
      avgInterRequestTime,
      stabScore,
      frequencyStats,
      stabilityStats
    })
    pastScoreAvg = calculateAvgHistScore(scoresHistory, { DECAY_FACTOR })
    recommendationBonus = calculateRecommendationBonus(scoresHistory)
  }

  let score =
    (1 - HISTORY_WEIGHT - PAST_SCORE_WEIGHT) * baseScore +
    HISTORY_WEIGHT * historyScore +
    PAST_SCORE_WEIGHT * pastScoreAvg +
    recommendationBonus

  let skew = 0
  let overlap = 0
  if (distinctUrls > 1) {
    skew = (maxRequestsCount / requestsCount) * (distinctUrls / EXPECTED_IDS)
    overlap = Math.min(parentRouteRequestCount / requestsCount, 1) * parentRouteScore
    score *= (1 - skew) * (1 - overlap)
  }

  let ttlFactor = score
  if (!isFirstRecommendation) {
    ttlFactor *= stabScore * SCALE_FACTOR / avgInterRequestTime
    ttlFactor *= SCALE_SIGMA / (frequencyStats.stdDev || 1)
  }
  const ttl = Math.min(Math.max(BASE_TTL * ttlFactor, MIN_TTL), MAX_TTL)

  const recommended = score >= SCORE_THRESHOLD ? 1 : 0

  score = round(score)

  return {
    score,
    scores: {
      stabilityScore: round(stabScore),
      frequencyScore: round(freqScore),
      weightFrequency: round(weightFreq),
      weightStability: round(weightStab),
      baseScore: round(baseScore),
      historyScore: round(historyScore),
      pastScoreAvg: round(pastScoreAvg),
      recommendationBonus: round(recommendationBonus),
      skew: round(skew),
      overlap: round(overlap)
    },
    ttl: Math.round(ttl),
    recommended: Boolean(recommended),
    frequencyStats,
    stabilityStats,
    scoresHistory: shiftArray(
      scoresHistory,
      {
        score,
        recommended,
        frequency: round(freqScore),
        stability: round(stabScore),
        requestCount: requestsCount
      },
      HISTORY_LENGTH
    )
  }
}

function shiftArray (arr, value, maxLength) {
  return [...arr, value].slice(-maxLength)
}

// Should round till the 2 non-zero digits
function round (n) {
  const log10 = n ? Math.floor(Math.log10(n)) : 0
  const div = log10 < 0 ? Math.pow(10, 1 - log10) : 100

  return Math.round(n * div) / div
}

module.exports = {
  calculateScore,
  welfordUpdate,
  gaussianKernel,
  round
}
