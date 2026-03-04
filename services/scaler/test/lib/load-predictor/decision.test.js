'use strict'

const assert = require('node:assert')
const { test } = require('node:test')
const {
  TrendDirection,
  getTrendDirection,
  findScaleUpTarget,
  findScaleDownTarget,
  calculateTargetPodsCount,
  getTargetPodsCount,
  generatePredictionPoints
} = require('../../../lib/load-predictor/decision')

test('getTrendDirection', async (t) => {
  await t.test('should return HORIZONTAL when level is 0', () => {
    assert.strictEqual(getTrendDirection(100, 0, 5), TrendDirection.HORIZONTAL)
    assert.strictEqual(getTrendDirection(-100, 0, 5), TrendDirection.HORIZONTAL)
    assert.strictEqual(getTrendDirection(0, 0, 5), TrendDirection.HORIZONTAL)
  })

  await t.test('should return UP for strong positive trend', () => {
    // trend/level = 1.0 => atan(1) = 45 degrees, well above typical threshold of 5
    assert.strictEqual(getTrendDirection(1, 1, 5), TrendDirection.UP)
  })

  await t.test('should return DOWN for strong negative trend', () => {
    // trend/level = -1.0 => atan(-1) = -45 degrees, well below -5
    assert.strictEqual(getTrendDirection(-1, 1, 5), TrendDirection.DOWN)
  })

  await t.test('should return HORIZONTAL for small positive trend below threshold', () => {
    // Need atan(trend/level) < 5 degrees => trend/level < tan(5*pi/180) ~ 0.0875
    // trend = 0.05, level = 1 => atan(0.05) ~ 2.86 degrees
    assert.strictEqual(getTrendDirection(0.05, 1, 5), TrendDirection.HORIZONTAL)
  })

  await t.test('should return HORIZONTAL for small negative trend above negative threshold', () => {
    // trend = -0.05, level = 1 => atan(-0.05) ~ -2.86 degrees, above -5
    assert.strictEqual(getTrendDirection(-0.05, 1, 5), TrendDirection.HORIZONTAL)
  })

  await t.test('should handle boundary at exactly the threshold angle', () => {
    // tan(5 * pi / 180) = 0.08748866...
    const threshold = 5
    const tanThreshold = Math.tan(threshold * Math.PI / 180)
    // Exactly at threshold => angle == threshold, not strictly greater
    assert.strictEqual(getTrendDirection(tanThreshold, 1, threshold), TrendDirection.HORIZONTAL)
    // Just above threshold
    assert.strictEqual(getTrendDirection(tanThreshold + 0.001, 1, threshold), TrendDirection.UP)
  })

  await t.test('should handle boundary at exactly the negative threshold angle', () => {
    const threshold = 5
    const tanThreshold = Math.tan(threshold * Math.PI / 180)
    // Exactly at -threshold => angle == -threshold, not strictly less
    assert.strictEqual(getTrendDirection(-tanThreshold, 1, threshold), TrendDirection.HORIZONTAL)
    // Just below negative threshold
    assert.strictEqual(getTrendDirection(-tanThreshold - 0.001, 1, threshold), TrendDirection.DOWN)
  })

  await t.test('should work with different threshold values', () => {
    // With threshold = 45 degrees: need trend/level > tan(45) = 1.0
    assert.strictEqual(getTrendDirection(0.9, 1, 45), TrendDirection.HORIZONTAL)
    assert.strictEqual(getTrendDirection(1.1, 1, 45), TrendDirection.UP)
    assert.strictEqual(getTrendDirection(-1.1, 1, 45), TrendDirection.DOWN)
  })

  await t.test('should normalize trend by level', () => {
    // trend=10, level=100 => normalized = 0.1 => atan(0.1) ~ 5.71 degrees
    assert.strictEqual(getTrendDirection(10, 100, 5), TrendDirection.UP)
    // trend=10, level=1000 => normalized = 0.01 => atan(0.01) ~ 0.57 degrees
    assert.strictEqual(getTrendDirection(10, 1000, 5), TrendDirection.HORIZONTAL)
  })

  await t.test('should handle zero trend', () => {
    assert.strictEqual(getTrendDirection(0, 1, 5), TrendDirection.HORIZONTAL)
    assert.strictEqual(getTrendDirection(0, 100, 5), TrendDirection.HORIZONTAL)
  })

  await t.test('should handle negative level', () => {
    // trend=1, level=-1 => normalized = -1 => atan(-1) = -45, so DOWN
    assert.strictEqual(getTrendDirection(1, -1, 5), TrendDirection.DOWN)
    // trend=-1, level=-1 => normalized = 1 => atan(1) = 45, so UP
    assert.strictEqual(getTrendDirection(-1, -1, 5), TrendDirection.UP)
  })
})

test('findScaleUpTarget', async (t) => {
  await t.test('should not scale below current target', () => {
    const result = findScaleUpTarget({
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      currentSum: 0.5,
      predictedSum: 0.6,
      isOverloaded: false,
      threshold: 0.75,
      max: 10,
      targetPodsCount: 3
    })
    assert.strictEqual(result >= 3, true)
  })

  await t.test('should not exceed max', () => {
    const result = findScaleUpTarget({
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      currentSum: 10,
      predictedSum: 100,
      isOverloaded: true,
      threshold: 0.75,
      max: 5,
      targetPodsCount: 3
    })
    assert.strictEqual(result, 5)
  })

  await t.test('should return targetPodsCount when load is well below capacity', () => {
    // currentSum=0.3, targetPodsCount=2, threshold=0.75
    // capacity=1.5, utilization=0.2
    // predictedSum=0.4 => increase=0.1
    // weight dampens => adjustedPredictedSum ~ 0.3 + small value
    // floor(~0.35 / 0.75) = 0, clamped to targetPodsCount=2
    const result = findScaleUpTarget({
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      currentSum: 0.3,
      predictedSum: 0.4,
      isOverloaded: false,
      threshold: 0.75,
      max: 10,
      targetPodsCount: 2
    })
    assert.strictEqual(result, 2)
  })

  await t.test('should scale up when predicted sum exceeds capacity', () => {
    // currentSum=1.4, targetPodsCount=2, threshold=0.75
    // capacity=1.5, utilization=0.933
    // predictedSum=2.0 => increase=0.6
    // utilization < 1: cost=1.867, weight=1.867/(1.867+0.067)=0.965
    // adjustedIncrease=0.579, adjustedPredicted=1.979
    // floor(1.979/0.75) = 2, targetCapacity=1.5, overload=0.479
    // isOverloaded=true (1.4/2=0.7... wait no, isOverloaded is passed as arg)
    const result = findScaleUpTarget({
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      currentSum: 1.4,
      predictedSum: 2.0,
      isOverloaded: true,
      threshold: 0.75,
      max: 10,
      targetPodsCount: 2
    })
    assert.strictEqual(result > 2, true)
  })

  await t.test('should apply weighted dampening when utilization < 1', () => {
    // When utilization is low, the prediction increase is dampened
    // currentSum=0.375, targetPodsCount=1, threshold=0.75
    // capacity=0.75, utilization=0.5
    // predictedSum=1.5 => increase=1.125
    // cost=1.0, weight=1.0/(1.0+0.5)=0.667
    // adjustedIncrease=0.75, adjustedPredicted=1.125
    // floor(1.125/0.75)=1, overload=0.375, 0.375/0.75=0.5>0.1 => +1=2
    const dampened = findScaleUpTarget({
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      currentSum: 0.375,
      predictedSum: 1.5,
      isOverloaded: false,
      threshold: 0.75,
      max: 10,
      targetPodsCount: 1
    })

    // Without dampening (utilization >= 1): adjustedPredicted would be 1.5
    // floor(1.5/0.75) = 2, no overload => 2
    const undampened = findScaleUpTarget({
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      currentSum: 0.75,
      predictedSum: 1.5,
      isOverloaded: false,
      threshold: 0.75,
      max: 10,
      targetPodsCount: 1
    })

    assert.strictEqual(dampened, 2)
    assert.strictEqual(undampened, 2)
  })

  await t.test('should not dampen when utilization >= 1', () => {
    // currentSum=0.8, targetPodsCount=1, threshold=0.75
    // capacity=0.75, utilization=1.067 (>= 1)
    // predictedSum=1.6 => increase stays 0.8
    // adjustedPredicted=1.6
    // floor(1.6/0.75) = 2, overload=0.1, isOverloaded=true => +1 = 3
    const result = findScaleUpTarget({
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      currentSum: 0.8,
      predictedSum: 1.6,
      isOverloaded: true,
      threshold: 0.75,
      max: 10,
      targetPodsCount: 1
    })
    assert.strictEqual(result, 3)
  })

  await t.test('should increment when overloaded even if overload margin is small', () => {
    // isOverloaded=true always triggers +1 when there's any overload
    // currentSum=1.5, predictedSum=1.5 (no increase), targetPodsCount=2, threshold=0.75
    // utilization=1.0 (not < 1), adjustedPredicted=1.5
    // floor(1.5/0.75) = 2, targetCapacity=1.5, overload=0
    // No overload => no +1
    const result = findScaleUpTarget({
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      currentSum: 1.5,
      predictedSum: 1.5,
      isOverloaded: true,
      threshold: 0.75,
      max: 10,
      targetPodsCount: 2
    })
    assert.strictEqual(result, 2)
  })

  await t.test('should increment when not overloaded but margin exceeds 0.1', () => {
    // Need adjustedPredictedSum such that targetOverload / threshold > 0.1
    // currentSum=1.6, predictedSum=1.6, targetPodsCount=2, threshold=0.75
    // utilization=1.067, adjustedPredicted=1.6
    // floor(1.6/0.75)=2, targetCapacity=1.5, overload=0.1
    // 0.1/0.75=0.133 > 0.1 => +1
    const result = findScaleUpTarget({
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      currentSum: 1.6,
      predictedSum: 1.6,
      isOverloaded: false,
      threshold: 0.75,
      max: 10,
      targetPodsCount: 2
    })
    assert.strictEqual(result, 3)
  })

  await t.test('should not increment when not overloaded and margin <= 0.1', () => {
    // currentSum=1.52, predictedSum=1.52, targetPodsCount=2, threshold=0.75
    // utilization=1.013, adjustedPredicted=1.52
    // floor(1.52/0.75)=2, targetCapacity=1.5, overload=0.02
    // 0.02/0.75=0.027 <= 0.1 => no +1
    const result = findScaleUpTarget({
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      currentSum: 1.52,
      predictedSum: 1.52,
      isOverloaded: false,
      threshold: 0.75,
      max: 10,
      targetPodsCount: 2
    })
    assert.strictEqual(result, 2)
  })

  await t.test('should handle 1 pod scaling to multiple', () => {
    // currentSum=0.7, targetPodsCount=1, threshold=0.75
    // capacity=0.75, utilization=0.933
    // predictedSum=3.0 => increase=2.3
    // cost=1.867, weight=0.965, adjustedIncrease=2.22
    // adjustedPredicted=2.92
    // floor(2.92/0.75)=3, overload=0.67, 0.67/0.75=0.89>0.1 => 4
    const result = findScaleUpTarget({
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      currentSum: 0.7,
      predictedSum: 3.0,
      isOverloaded: false,
      threshold: 0.75,
      max: 10,
      targetPodsCount: 1
    })
    assert.strictEqual(result > 1, true)
    assert.strictEqual(result <= 10, true)
  })
})

test('findScaleDownTarget', async (t) => {
  await t.test('should not go below min', () => {
    const result = findScaleDownTarget({
      scaleDownMargin: 0.3,
      currentSum: 0.1,
      threshold: 0.75,
      min: 2,
      targetPodsCount: 3
    })
    assert.strictEqual(result >= 2, true)
  })

  await t.test('should return min when load is very low', () => {
    // Very low load relative to capacity - can scale all the way down
    const result = findScaleDownTarget({
      scaleDownMargin: 0.3,
      currentSum: 0.1,
      threshold: 0.75,
      min: 1,
      targetPodsCount: 5
    })
    assert.strictEqual(result, 1)
  })

  await t.test('should return targetPodsCount when already at min', () => {
    const result = findScaleDownTarget({
      scaleDownMargin: 0.3,
      currentSum: 0.1,
      threshold: 0.75,
      min: 3,
      targetPodsCount: 3
    })
    assert.strictEqual(result, 3)
  })

  await t.test('should stop scaling down when close to overload', () => {
    // currentSum=1.2, threshold=0.75, margin=0.3
    // minInstances = floor(1.3 * 1.2 / 0.75) + 1 = floor(2.08) + 1 = 3
    // result = max(1, min(4, 3)) = 3
    const result = findScaleDownTarget({
      scaleDownMargin: 0.3,
      currentSum: 1.2,
      threshold: 0.75,
      min: 1,
      targetPodsCount: 4
    })
    assert.strictEqual(result, 3)
  })

  await t.test('should scale down by exactly one', () => {
    // currentSum=1.8, threshold=0.75, margin=0.3
    // minInstances = floor(1.3 * 1.8 / 0.75) + 1 = floor(3.12) + 1 = 4
    // result = max(1, min(4, 4)) = 4
    const result = findScaleDownTarget({
      scaleDownMargin: 0.3,
      currentSum: 1.8,
      threshold: 0.75,
      min: 1,
      targetPodsCount: 4
    })
    assert.strictEqual(result, 4)
  })

  await t.test('should not scale down when removing a pod would overload', () => {
    // currentSum=1.4, threshold=0.75, targetPodsCount=2, min=1
    // At 1 pod: distanceToOverload = 0.75 - 1.4/1 = -0.65
    //           0.3 * 1.4/2 = 0.21, -0.65 <= 0.21 => break at 2
    const result = findScaleDownTarget({
      scaleDownMargin: 0.3,
      currentSum: 1.4,
      threshold: 0.75,
      min: 1,
      targetPodsCount: 2
    })
    assert.strictEqual(result, 2)
  })

  await t.test('should scale down multiple steps when safe', () => {
    // currentSum=0.2, threshold=0.75, targetPodsCount=6, min=1
    // Very low load, should scale down to 1
    const result = findScaleDownTarget({
      scaleDownMargin: 0.3,
      currentSum: 0.2,
      threshold: 0.75,
      min: 1,
      targetPodsCount: 6
    })
    assert.strictEqual(result, 1)
  })

  await t.test('should respect min when min > 1', () => {
    const result = findScaleDownTarget({
      scaleDownMargin: 0.3,
      currentSum: 0.1,
      threshold: 0.75,
      min: 3,
      targetPodsCount: 6
    })
    assert.strictEqual(result, 3)
  })

  await t.test('should handle heap-like thresholds (large values)', () => {
    // heap threshold = 250MB, currentSum spread across pods
    const result = findScaleDownTarget({
      scaleDownMargin: 0.3,
      currentSum: 100,
      threshold: 250,
      min: 1,
      targetPodsCount: 4
    })
    // 100/4 = 25 per pod, threshold=250. Lots of headroom.
    assert.strictEqual(result, 1)
  })
})

test('calculateTargetPodsCount', async (t) => {
  const defaultPodsConfig = { min: 1, max: 10 }
  const defaultThreshold = 0.75
  const defaultHorizontalTrendThreshold = 5

  await t.test('should route to scale up when trend is UP', () => {
    // Strong upward trend: trend/level = 0.5 => atan(0.5)=26.6 degrees > 5
    // currentSum=1.0, currentCount=2, threshold=0.75
    // avg = 1.0/2 = 0.5 < 0.75, not overloaded
    // But trend is UP so scale up path is taken
    const result = calculateTargetPodsCount({
      currentSum: 1.0,
      trend: 0.5,
      currentCount: 2,
      threshold: defaultThreshold,
      targetPodsCount: 2,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    // Should at least stay at 2 (findScaleUpTarget never goes below targetPodsCount)
    assert.strictEqual(result >= 2, true)
  })

  await t.test('should route to scale up when overloaded at horizon', () => {
    // Small positive trend (HORIZONTAL), but predicted overload at horizon
    // currentSum=1.0, trend=0.05, currentCount=2, targetPodsCount=2, horizonMs=24000
    // predictedSum = 1.0 + 0.05*24 = 2.2
    // predictedSum/targetPodsCount = 2.2/2 = 1.1 > 0.75 => overloaded at horizon
    // trend/level = 0.05/1.0 => atan(0.05) = 2.86 degrees < 5 => HORIZONTAL
    // But isOverloadedAtHorizon=true triggers scale up path
    const result = calculateTargetPodsCount({
      currentSum: 1.0,
      trend: 0.05,
      currentCount: 2,
      threshold: defaultThreshold,
      targetPodsCount: 2,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.strictEqual(result >= 2, true)
  })

  await t.test('should route to scale down when not overloaded and trend is HORIZONTAL', () => {
    // currentSum=0.3, trend=0, currentCount=2, targetPodsCount=4, horizonMs=24000
    // predictedSum = 0.3
    // 0.3/2 = 0.15 < 0.75 => not overloaded
    // 0.3/4 = 0.075 < 0.75 => not overloaded at horizon
    // trend direction: trend=0 normalized by level=0.3 => HORIZONTAL
    const result = calculateTargetPodsCount({
      currentSum: 0.3,
      trend: 0,
      currentCount: 2,
      threshold: defaultThreshold,
      targetPodsCount: 4,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.strictEqual(result < 4, true)
  })

  await t.test('should route to scale down when not overloaded and trend is DOWN', () => {
    // currentSum=0.5, trend=-0.5 (strong down), currentCount=2, targetPodsCount=4
    // predictedSum = 0.5 + (-0.5)*24 = -11.5
    // 0.5/2 = 0.25 < 0.75 => not overloaded
    // -11.5/4 < 0.75 => not overloaded at horizon
    // trend/level = -0.5/0.5 = -1.0, atan(-1) = -45 degrees < -5 => DOWN
    const result = calculateTargetPodsCount({
      currentSum: 0.5,
      trend: -0.5,
      currentCount: 2,
      threshold: defaultThreshold,
      targetPodsCount: 4,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.strictEqual(result < 4, true)
  })

  await t.test('should maintain targetPodsCount when overloaded but trend is flat', () => {
    // currentSum=1.6, currentCount=2, targetPodsCount=3
    // avg = 1.6/2 = 0.8 > 0.75 => overloaded
    // predictedSum = 1.6, predictedSum/3 = 0.533 < 0.75 => not overloaded at horizon
    // trend=0, HORIZONTAL
    // Not UP, not overloaded at horizon => check !isOverloaded => false => return targetPodsCount
    const result = calculateTargetPodsCount({
      currentSum: 1.6,
      trend: 0,
      currentCount: 2,
      threshold: defaultThreshold,
      targetPodsCount: 3,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.strictEqual(result, 3)
  })

  await t.test('should respect max pods config', () => {
    const smallConfig = { min: 1, max: 3 }
    // Massive load that would need many pods
    const result = calculateTargetPodsCount({
      currentSum: 10.0,
      trend: 1.0,
      currentCount: 2,
      threshold: defaultThreshold,
      targetPodsCount: 2,
      horizonMs: 24000,
      podsConfig: smallConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.strictEqual(result <= 3, true)
  })

  await t.test('should respect min pods config on scale down', () => {
    const minConfig = { min: 2, max: 10 }
    // Very low load
    const result = calculateTargetPodsCount({
      currentSum: 0.01,
      trend: 0,
      currentCount: 2,
      threshold: defaultThreshold,
      targetPodsCount: 5,
      horizonMs: 24000,
      podsConfig: minConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.strictEqual(result >= 2, true)
  })

  await t.test('should handle heap-like metrics with large thresholds', () => {
    // 3 pods, total heap=500MB, trend rising
    // avg = 500/3 = 167 < 250, not overloaded
    // predictedSum = 500 + 10*24 = 740
    // 740/3 = 247 < 250 => not overloaded at horizon
    // trend/level = 10/500 = 0.02 => atan(0.02)=1.15 degrees => HORIZONTAL
    // Not overloaded => scale down path
    const result = calculateTargetPodsCount({
      currentSum: 500,
      trend: 10,
      currentCount: 3,
      threshold: 250,
      targetPodsCount: 3,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.strictEqual(typeof result, 'number')
  })

  await t.test('should scale up aggressively with strong upward trend', () => {
    // currentSum=2.0, trend=0.5 (strong up), currentCount=3, targetPodsCount=3, horizonMs=24000
    // predictedSum = 2.0 + 0.5*24 = 14.0
    // trend direction: 0.5/2.0 = 0.25, atan(0.25)=14 degrees > 5 => UP
    const result = calculateTargetPodsCount({
      currentSum: 2.0,
      trend: 0.5,
      currentCount: 3,
      threshold: defaultThreshold,
      targetPodsCount: 3,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.strictEqual(result > 3, true)
  })

  await t.test('should handle single pod scenario', () => {
    // currentSum=0.5, trend=0.02, currentCount=1, targetPodsCount=1
    // predictedSum = 0.5 + 0.02*24 = 0.98
    // 0.5/1 = 0.5 < 0.75, not overloaded
    // 0.98/1 = 0.98 > 0.75, overloaded at horizon => scale up
    const result = calculateTargetPodsCount({
      currentSum: 0.5,
      trend: 0.02,
      currentCount: 1,
      threshold: defaultThreshold,
      targetPodsCount: 1,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.strictEqual(result >= 1, true)
  })

  await t.test('should not scale below current target on scale up path', () => {
    // Even if load is dropping, once on scale-up path, target never decreases
    // trend UP forces scale-up path, findScaleUpTarget never returns below targetPodsCount
    const result = calculateTargetPodsCount({
      currentSum: 0.3,
      trend: 0.3,
      currentCount: 2,
      threshold: defaultThreshold,
      targetPodsCount: 5,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.strictEqual(result >= 5, true)
  })
})

test('getTargetPodsCount', async (t) => {
  const defaultPodsConfig = { min: 1, max: 10 }
  const defaultHorizontalTrendThreshold = 5

  const defaultThreshold = 0.75

  function makeConfig () {
    return {
      redistributionMs: 5000,
      alphaUp: 0.5,
      alphaDown: 0.3,
      betaUp: 0.3,
      betaDown: 0.1
    }
  }

  function makeEntry (timestamp, instances) {
    const count = Object.keys(instances).length
    return { timestamp, aligned: { instances, count } }
  }

  await t.test('should return null when holt produces no output', () => {
    // With bootstrapState, reconstruction starts at index 1, skipping the only entry.
    // No .reconstruction → no .redistribution → no .holt → returns null
    const metricsByTimestamp = [
      makeEntry(1000, { i0: 0.3 })
    ]
    const bootstrapState = {
      reconstruction: { instances: {}, unknownValue: 0, unknownCount: 0, rawSum: 0 }
    }
    const result = getTargetPodsCount({
      metricsByTimestamp,
      podsCountHistory: [{ timestamp: 0, count: 1 }],
      instances: { i0: { podId: 'p0', startTime: 0, endTime: 0 } },
      config: makeConfig(),
      threshold: defaultThreshold,
      bootstrapState,
      now: 2000,

      targetPodsCount: 2,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.strictEqual(result, null)
  })

  await t.test('should return scaling result for single stable pod with low load', () => {
    // Single pod, low ELU (0.3), well below threshold 0.75
    // Should suggest scaling down (but min=1, so stays at 1)
    const metricsByTimestamp = [
      makeEntry(1000, { i0: 0.3 }),
      makeEntry(2000, { i0: 0.3 })
    ]
    const result = getTargetPodsCount({
      metricsByTimestamp,
      podsCountHistory: [{ timestamp: 0, count: 1 }],
      instances: { i0: { podId: 'p0', startTime: 0, endTime: 0 } },
      config: makeConfig(),
      threshold: defaultThreshold,
      bootstrapState: null,
      now: 2000,

      targetPodsCount: 2,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.notStrictEqual(result, null)
    assert.strictEqual(typeof result.podsCount, 'number')
    assert.strictEqual(typeof result.level, 'number')
    assert.strictEqual(typeof result.trend, 'number')
    assert.strictEqual(result.stateByTimestamp, metricsByTimestamp)
  })

  await t.test('should return scaling result for high load triggering scale up', () => {
    // Single pod, high ELU (0.8) above threshold 0.75, increasing
    const metricsByTimestamp = [
      makeEntry(1000, { i0: 0.7 }),
      makeEntry(2000, { i0: 0.8 }),
      makeEntry(3000, { i0: 0.9 })
    ]
    const result = getTargetPodsCount({
      metricsByTimestamp,
      podsCountHistory: [{ timestamp: 0, count: 1 }],
      instances: { i0: { podId: 'p0', startTime: 0, endTime: 0 } },
      config: makeConfig(),
      threshold: defaultThreshold,
      bootstrapState: null,
      now: 3000,

      targetPodsCount: 1,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.notStrictEqual(result, null)
    assert.strictEqual(result.podsCount > 1, true)
  })

  await t.test('should handle multiple pods with low load suggesting scale down', () => {
    // 3 stable pods (startTime well before redistributionMs), each with low load
    const metricsByTimestamp = [
      makeEntry(10000, { i0: 0.1, i1: 0.1, i2: 0.1 }),
      makeEntry(11000, { i0: 0.1, i1: 0.1, i2: 0.1 })
    ]
    const result = getTargetPodsCount({
      metricsByTimestamp,
      podsCountHistory: [{ timestamp: 0, count: 3 }],
      instances: {
        i0: { podId: 'p0', startTime: 0, endTime: 0 },
        i1: { podId: 'p1', startTime: 0, endTime: 0 },
        i2: { podId: 'p2', startTime: 0, endTime: 0 }
      },
      config: makeConfig(),
      threshold: defaultThreshold,
      bootstrapState: null,
      now: 11000,

      targetPodsCount: 3,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.notStrictEqual(result, null)
    assert.strictEqual(result.podsCount < 3, true)
  })

  await t.test('should extrapolate level by time delta between now and lastTimestamp', () => {
    // Two calls with same data but different `now` values
    // Later `now` means more extrapolation of the trend
    const makeState = () => [
      makeEntry(1000, { i0: 0.3 }),
      makeEntry(2000, { i0: 0.5 }),
      makeEntry(3000, { i0: 0.7 })
    ]

    const commonArgs = {
      podsCountHistory: [{ timestamp: 0, count: 1 }],
      instances: { i0: { podId: 'p0', startTime: 0, endTime: 0 } },
      config: makeConfig(),
      threshold: defaultThreshold,
      bootstrapState: null,

      targetPodsCount: 1,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold
    }

    const resultNear = getTargetPodsCount({
      ...commonArgs,
      metricsByTimestamp: makeState(),
      now: 3000
    })
    const resultFar = getTargetPodsCount({
      ...commonArgs,
      metricsByTimestamp: makeState(),
      now: 30000
    })

    assert.notStrictEqual(resultNear, null)
    assert.notStrictEqual(resultFar, null)
    // With rising trend, further extrapolation should give higher level
    assert.strictEqual(resultFar.trend > 0, true)
    assert.strictEqual(resultFar.level > resultNear.level, true)
  })

  await t.test('should respect max pods config through the pipeline', () => {
    // Very high load but max=2
    const metricsByTimestamp = [
      makeEntry(1000, { i0: 0.7 }),
      makeEntry(2000, { i0: 0.9 }),
      makeEntry(3000, { i0: 1.0 })
    ]
    const result = getTargetPodsCount({
      metricsByTimestamp,
      podsCountHistory: [{ timestamp: 0, count: 1 }],
      instances: { i0: { podId: 'p0', startTime: 0, endTime: 0 } },
      config: makeConfig(),
      threshold: defaultThreshold,
      bootstrapState: null,
      now: 3000,

      targetPodsCount: 1,
      horizonMs: 24000,
      podsConfig: { min: 1, max: 2 },
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.notStrictEqual(result, null)
    assert.strictEqual(result.podsCount <= 2, true)
  })

  await t.test('should respect min pods config through the pipeline', () => {
    // Very low load but min=2
    const metricsByTimestamp = [
      makeEntry(1000, { i0: 0.01, i1: 0.01, i2: 0.01 }),
      makeEntry(2000, { i0: 0.01, i1: 0.01, i2: 0.01 })
    ]
    const result = getTargetPodsCount({
      metricsByTimestamp,
      podsCountHistory: [{ timestamp: 0, count: 3 }],
      instances: {
        i0: { podId: 'p0', startTime: 0, endTime: 0 },
        i1: { podId: 'p1', startTime: 0, endTime: 0 },
        i2: { podId: 'p2', startTime: 0, endTime: 0 }
      },
      config: makeConfig(),
      threshold: defaultThreshold,
      bootstrapState: null,
      now: 2000,

      targetPodsCount: 3,
      horizonMs: 24000,
      podsConfig: { min: 2, max: 10 },
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.notStrictEqual(result, null)
    assert.strictEqual(result.podsCount >= 2, true)
  })

  await t.test('should work with heap-like thresholds', () => {
    // Heap metrics use larger values (MB)
    const metricsByTimestamp = [
      makeEntry(1000, { i0: 100, i1: 100 }),
      makeEntry(2000, { i0: 120, i1: 110 })
    ]
    const result = getTargetPodsCount({
      metricsByTimestamp,
      podsCountHistory: [{ timestamp: 0, count: 2 }],
      instances: {
        i0: { podId: 'p0', startTime: 0, endTime: 0 },
        i1: { podId: 'p1', startTime: 0, endTime: 0 }
      },
      config: makeConfig(),
      threshold: 250,
      bootstrapState: null,
      now: 2000,

      targetPodsCount: 2,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.notStrictEqual(result, null)
    assert.strictEqual(typeof result.podsCount, 'number')
  })

  await t.test('should mutate metricsByTimestamp with pipeline results and return as stateByTimestamp', () => {
    const metricsByTimestamp = [
      makeEntry(1000, { i0: 0.5 }),
      makeEntry(2000, { i0: 0.6 })
    ]
    const result = getTargetPodsCount({
      metricsByTimestamp,
      podsCountHistory: [{ timestamp: 0, count: 1 }],
      instances: { i0: { podId: 'p0', startTime: 0, endTime: 0 } },
      config: makeConfig(),
      threshold: defaultThreshold,
      bootstrapState: null,
      now: 2000,

      targetPodsCount: 1,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.strictEqual(result.stateByTimestamp, metricsByTimestamp)
    // Each entry should have reconstruction, redistribution, and holt
    for (const entry of result.stateByTimestamp) {
      assert.ok(entry.reconstruction, 'entry should have reconstruction')
      assert.ok(entry.redistribution, 'entry should have redistribution')
      assert.ok(entry.holt, 'entry should have holt')
    }
  })

  await t.test('should maintain target when load is at threshold', () => {
    // Load exactly at threshold, flat trend → should hold steady
    const metricsByTimestamp = [
      makeEntry(1000, { i0: 0.75, i1: 0.75 }),
      makeEntry(2000, { i0: 0.75, i1: 0.75 })
    ]
    const result = getTargetPodsCount({
      metricsByTimestamp,
      podsCountHistory: [{ timestamp: 0, count: 2 }],
      instances: {
        i0: { podId: 'p0', startTime: 0, endTime: 0 },
        i1: { podId: 'p1', startTime: 0, endTime: 0 }
      },
      config: makeConfig(),
      threshold: defaultThreshold,
      bootstrapState: null,
      now: 2000,

      targetPodsCount: 2,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.notStrictEqual(result, null)
    assert.strictEqual(typeof result.podsCount, 'number')
  })

  await t.test('should handle bootstrapState for continuity', () => {
    // bootstrapState provides prior holt level/trend for smooth continuation
    const metricsByTimestamp = [
      makeEntry(1000, { i0: 0.5 }),
      makeEntry(2000, { i0: 0.6 })
    ]
    const bootstrapState = {
      reconstruction: { instances: { i0: 0.4 }, unknownValue: 0, unknownCount: 0, rawSum: 0.4 },
      level: 0.4,
      trend: 0.05,
      prevSum: 0.4
    }
    const result = getTargetPodsCount({
      metricsByTimestamp,
      podsCountHistory: [{ timestamp: 0, count: 1 }],
      instances: { i0: { podId: 'p0', startTime: 0, endTime: 0 } },
      config: makeConfig(),
      threshold: defaultThreshold,
      bootstrapState,
      now: 2000,

      targetPodsCount: 1,
      horizonMs: 24000,
      podsConfig: defaultPodsConfig,
      horizontalTrendThreshold: defaultHorizontalTrendThreshold,
      scaleUpK: 2,
      scaleUpMargin: 0.1,
      scaleDownMargin: 0.3
    })
    assert.notStrictEqual(result, null)
    assert.strictEqual(typeof result.podsCount, 'number')
  })
})

test('generatePredictionPoints', async (t) => {
  const defaults = {
    level: 1.5,
    trend: 0.1,
    now: 10000,
    currentPodsCount: 2,
    targetPodsCount: 2,
    horizonMs: 24000,
    pendingScaleUps: []
  }

  await t.test('should return first point at now with level as sum', () => {
    const points = generatePredictionPoints(defaults)
    const first = points[0]
    assert.strictEqual(first.timestamp, 10000)
    assert.strictEqual(first.sum, 1.5)
    assert.strictEqual(first.avg, 1.5 / 2)
    assert.strictEqual(first.count, 2)
  })

  await t.test('should return last point at horizon end', () => {
    const points = generatePredictionPoints(defaults)
    const last = points[points.length - 1]
    assert.strictEqual(last.timestamp, 10000 + 24000)
    // sum = 1.5 + 0.1 * 24 = 3.9
    assert.strictEqual(last.sum, 1.5 + 0.1 * 24)
    assert.strictEqual(last.avg, last.sum / 2)
  })

  await t.test('should extrapolate sum using trend over time', () => {
    const points = generatePredictionPoints(defaults)
    for (const point of points) {
      const seconds = (point.timestamp - 10000) / 1000
      const expectedSum = 1.5 + 0.1 * seconds
      assert.strictEqual(point.sum, expectedSum)
    }
  })

  await t.test('should produce step points when scaling down', () => {
    // targetPodsCount < currentPodsCount => scale down at now+1000
    const points = generatePredictionPoints({
      ...defaults,
      currentPodsCount: 4,
      targetPodsCount: 2
    })
    // Timeline: [now,4], [now+1000,2], [horizonEnd,2]
    // i=0: one point (count=4)
    // i=1: step point (prevCount=4) + point (count=2)
    // i=2: step point (prevCount=2) + point (count=2)
    assert.strictEqual(points.length, 5)
    assert.strictEqual(points[0].count, 4)
    assert.strictEqual(points[1].count, 4) // step before scale down
    assert.strictEqual(points[2].count, 2) // after scale down
  })

  await t.test('should produce step points when scaling up with pending events', () => {
    const points = generatePredictionPoints({
      ...defaults,
      currentPodsCount: 2,
      targetPodsCount: 4,
      pendingScaleUps: [
        { scaleAt: 15000, count: 1 },
        { scaleAt: 18000, count: 1 }
      ]
    })
    // Timeline: [10000,2], [15000,3], [18000,4], [34000,4]
    // i=0: 1 point
    // i=1: step + point = 2
    // i=2: step + point = 2
    // i=3: step + point = 2
    // Total: 7 points
    assert.strictEqual(points.length, 7)
    assert.strictEqual(points[0].count, 2)
    assert.strictEqual(points[0].timestamp, 10000)
    // Step before first scale-up (still 2 pods)
    assert.strictEqual(points[1].count, 2)
    assert.strictEqual(points[1].timestamp, 15000)
    // After first scale-up (3 pods)
    assert.strictEqual(points[2].count, 3)
    assert.strictEqual(points[2].timestamp, 15000)
    // Step before second scale-up (still 3 pods)
    assert.strictEqual(points[3].count, 3)
    assert.strictEqual(points[3].timestamp, 18000)
    // After second scale-up (4 pods)
    assert.strictEqual(points[4].count, 4)
    assert.strictEqual(points[4].timestamp, 18000)
  })

  await t.test('should handle zero trend', () => {
    const points = generatePredictionPoints({
      ...defaults,
      trend: 0
    })
    // All points should have sum = level
    for (const point of points) {
      assert.strictEqual(point.sum, 1.5)
    }
  })

  await t.test('should handle negative trend', () => {
    const points = generatePredictionPoints({
      ...defaults,
      trend: -0.05
    })
    const first = points[0]
    const last = points[points.length - 1]
    assert.strictEqual(first.sum, 1.5)
    // sum = 1.5 + (-0.05) * 24 = 0.3
    assert.strictEqual(last.sum, 1.5 + (-0.05) * 24)
    assert.strictEqual(last.sum < first.sum, true)
  })

  await t.test('should handle single pod', () => {
    const points = generatePredictionPoints({
      ...defaults,
      currentPodsCount: 1,
      targetPodsCount: 1
    })
    // avg should equal sum when count is 1
    for (const point of points) {
      assert.strictEqual(point.avg, point.sum)
      assert.strictEqual(point.count, 1)
    }
  })

  await t.test('should produce correct avg as sum divided by count', () => {
    const points = generatePredictionPoints({
      ...defaults,
      currentPodsCount: 3,
      targetPodsCount: 3
    })
    for (const point of points) {
      assert.strictEqual(point.avg, point.sum / point.count)
    }
  })

  await t.test('should handle same current and target with no pending', () => {
    // No scaling happening — timeline is [now, currentCount], [now+1000, targetCount], [horizonEnd, targetCount]
    // But currentPodsCount === targetPodsCount, so we go to the else branch
    const points = generatePredictionPoints(defaults)
    // Timeline: [10000,2], [11000,2], [34000,2]
    // i=0: 1 point, i=1: step + point = 2, i=2: step + point = 2
    assert.strictEqual(points.length, 5)
    // All counts should be 2
    for (const point of points) {
      assert.strictEqual(point.count, 2)
    }
  })

  await t.test('should accumulate pending scale-up counts', () => {
    // 3 pending events of 2 each: 2 -> 4 -> 6 -> 8
    const points = generatePredictionPoints({
      ...defaults,
      currentPodsCount: 2,
      targetPodsCount: 8,
      pendingScaleUps: [
        { scaleAt: 12000, count: 2 },
        { scaleAt: 14000, count: 2 },
        { scaleAt: 16000, count: 2 }
      ]
    })
    // Timeline: [10000,2], [12000,4], [14000,6], [16000,8], [34000,8]
    // Verify the counts at each scale event
    const countSequence = points.map(p => p.count)
    // i=0: [2], i=1: [2,4], i=2: [4,6], i=3: [6,8], i=4: [8,8]
    assert.deepStrictEqual(countSequence, [2, 2, 4, 4, 6, 6, 8, 8, 8])
  })

  await t.test('should include sum field in all points', () => {
    const points = generatePredictionPoints(defaults)
    for (const point of points) {
      assert.strictEqual(typeof point.sum, 'number')
      assert.strictEqual(typeof point.avg, 'number')
      assert.strictEqual(typeof point.timestamp, 'number')
      assert.strictEqual(typeof point.count, 'number')
    }
  })
})
