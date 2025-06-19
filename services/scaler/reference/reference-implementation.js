/**
 * Node.js implementation of Reactive Autoscaler and Trends Learning Algorithms
 * using Fastify. Supports 30–50 daily scaling events, 30-day history, 3-day decay,
 * and reasons in predictions.
 * Date: June 9, 2025, 10:12 PM PDT
 */
const fastify = require('fastify')({ logger: true })
const cron = require('node-cron')

// Constants
const LAMBDA = Math.log(2) / 259200 // 3-day half-life decay rate
const MAX_HISTORY = 1000 // 30-day history (~900–1500 events)
const ELU_THRESHOLD = 0.9
const HEAP_THRESHOLD = 0.85
const MAX_PODS = 20
const MIN_PODS = 1
const SCALE_COOLDOWN = 300 // 300 seconds
// const POST_SCALING_WINDOW = 300
const MAX_CLUSTERS = 5
const PREDICTION_WINDOW = 30 // ±30 seconds
const CONFIDENCE_THRESHOLD = 0.8
const TIME_SLOT_WINDOW = 1800 // 30 minutes

// In-memory stores (replace with database in production)
let performanceHistory = [] // Scaling events
let predictionSchedule = [] // Predicted actions
let activePods = new Set(['pod_1', 'pod_2', 'pod_3']) // Initial pods

class ReactiveAutoscaler {
  constructor () {
    this.lastScaleTime = 0
    this.clusters = []
  }

  // Linear regression slope
  #calculateSlope (values) {
    const n = values.length
    if (n < 2) return 0
    const x = Array.from({ length: n }, (_, i) => i)
    const meanX = (n - 1) / 2
    const meanY = values.reduce((sum, v) => sum + v, 0) / n
    let numerator = 0; let denominator = 0
    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - meanX
      numerator += xDiff * (values[i] - meanY)
      denominator += xDiff * xDiff
    }
    return denominator === 0 ? 0 : numerator / denominator
  }

  // Standard deviation
  #calculateStdDev (values) {
    const n = values.length
    if (n < 2) return 0
    const mean = values.reduce((sum, v) => sum + v, 0) / n
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n
    return Math.sqrt(variance)
  }

  // Euclidean distance
  #euclideanDistance (a, b) {
    return Math.sqrt(
      (a.elu - b.elu) ** 2 +
            (a.heap - b.heap) ** 2 +
            (a.eluSlope - b.eluSlope) ** 2 +
            (a.heapSlope - b.heapSlope) ** 2
    )
  }

  // Step 1: Signal Collection and Trigger
  async collectSignal (podId, subprocessData, currentTime) {
    if (!activePods.has(podId)) activePods.add(podId)
    const isTriggered = subprocessData.some(sub => sub.elu.some(e => e > ELU_THRESHOLD))
    if (!isTriggered) return { triggered: false }
    const evaluation = this.evaluatePodSignal(podId, subprocessData, currentTime)
    return { triggered: true, evaluation }
  }

  // Step 2: Performance History Collection
  recordPerformanceHistory (podsScaled, action, source, preMetrics, postMetrics, currentTime) {
    const successScore = source === 'prediction'
      ? (
          0.6 * (
            0.7 * (postMetrics.elu < ELU_THRESHOLD && postMetrics.heap < HEAP_THRESHOLD ? 1 : 0) +
                0.3 * Math.max(0, 1 - (postMetrics.eluStd + postMetrics.heapStd) / 0.2)
          ) +
            0.4 * Math.max(0, 1 - Math.max(0, Math.abs(podsScaled) - Math.ceil(preMetrics.elu * activePods.size / ELU_THRESHOLD)) / activePods.size)
        )
      : 1.0

    const historyEntry = {
      time: currentTime,
      podsScaled,
      action,
      source,
      successScore,
      preElu: preMetrics.elu,
      preHeap: preMetrics.heap,
      preEluSlope: preMetrics.eluSlope,
      preHeapSlope: preMetrics.heapSlope,
      deltaElu: postMetrics.elu - preMetrics.elu,
      deltaHeap: postMetrics.heap - preMetrics.heap,
      eluStd: postMetrics.eluStd,
      heapStd: postMetrics.heapStd
    }

    historyEntry.cluster = this.#assignToCluster(historyEntry)
    performanceHistory.push(historyEntry)
    if (performanceHistory.length > MAX_HISTORY) performanceHistory.shift()
    this.#updateClusters(historyEntry)
  }

  // Step 3: Cluster Maintenance
  #assignToCluster (entry) {
    if (this.clusters.length === 0) return -1
    let minDistance = Infinity; let closestCluster = -1
    this.clusters.forEach((cluster, index) => {
      const distance = this.#euclideanDistance(
        { elu: entry.preElu, heap: entry.preHeap, eluSlope: entry.preEluSlope, heapSlope: entry.preHeapSlope },
        { elu: cluster.elu, heap: cluster.heap, eluSlope: cluster.eluSlope, heapSlope: cluster.heapSlope }
      )
      if (distance < minDistance) {
        minDistance = distance
        closestCluster = index
      }
    })
    return closestCluster
  }

  #updateClusters (entry) {
    const performance = 0.6 * Math.min(1, Math.max(0, -(entry.deltaElu + entry.deltaHeap) / 0.2)) +
                           0.4 * Math.max(0, 1 - (entry.eluStd + entry.heapStd) / 0.2)
    if (entry.cluster === -1 && this.clusters.length < MAX_CLUSTERS) {
      this.clusters.push({
        elu: entry.preElu,
        heap: entry.preHeap,
        eluSlope: entry.preEluSlope,
        heapSlope: entry.preHeapSlope,
        performance,
        weight: 1
      })
      entry.cluster = this.clusters.length - 1
    } else if (entry.cluster !== -1) {
      const cluster = this.clusters[entry.cluster]
      const w = cluster.weight
      cluster.elu = (w * cluster.elu + entry.preElu) / (w + 1)
      cluster.heap = (w * cluster.heap + entry.preHeap) / (w + 1)
      cluster.eluSlope = (w * cluster.eluSlope + entry.preEluSlope) / (w + 1)
      cluster.heapSlope = (w * cluster.heapSlope + entry.preHeapSlope) / (w + 1)
      cluster.performance = (w * cluster.performance + performance) / (w + 1)
      cluster.weight += 1
    } else {
      let minWeight = Infinity; let minIndex = -1
      this.clusters.forEach((c, i) => {
        if (c.weight < minWeight) {
          minWeight = c.weight
          minIndex = i
        }
      })
      this.clusters[minIndex] = {
        elu: entry.preElu,
        heap: entry.preHeap,
        eluSlope: entry.preEluSlope,
        heapSlope: entry.preHeapSlope,
        performance,
        weight: 1
      }
      entry.cluster = minIndex
    }
  }

  // Step 4: Signal Evaluation and Pod Metrics Analysis
  evaluatePodSignal (podId, subprocessData, currentTime) {
    const n = Math.min(60, subprocessData[0].elu.length)
    const elu = new Array(n).fill(0)
    const heap = new Array(n).fill(0)
    for (let j = 0; j < n; j++) {
      elu[j] = Math.max(...subprocessData.map(sub => sub.elu[j]))
      heap[j] = Math.max(...subprocessData.map(sub => sub.heap[j]))
    }

    const meanElu = elu.reduce((sum, v) => sum + v, 0) / n
    const meanHeap = heap.reduce((sum, v) => sum + v, 0) / n
    const eluSlope = this.#calculateSlope(elu)
    const heapSlope = this.#calculateSlope(heap)
    const eluStd = this.#calculateStdDev(elu)
    const heapStd = this.#calculateStdDev(heap)

    let performanceScore = this.clusters.length > 0 ? 0 : 1.0
    if (this.clusters.length > 0) {
      let weightedSum = 0; let weightSum = 0
      this.clusters.forEach(cluster => {
        const distance = this.#euclideanDistance(
          { elu: meanElu, heap: meanHeap, eluSlope, heapSlope },
          { elu: cluster.elu, heap: cluster.heap, eluSlope: cluster.eluSlope, heapSlope: cluster.heapSlope }
        )
        const similarity = Math.exp(-distance)
        weightedSum += cluster.weight * similarity * cluster.performance
        weightSum += cluster.weight * similarity
      })
      performanceScore = weightedSum / weightSum
    }

    const eluScore = performanceScore * (
      0.6 * Math.max(0, (meanElu - ELU_THRESHOLD) / (1 - ELU_THRESHOLD)) +
            0.25 * Math.min(100 * eluSlope, 1) * (eluSlope > 0 ? 1 : 0) +
            0.15 * Math.min(eluStd, 0.5)
    )
    const heapScore = performanceScore * (
      0.6 * Math.max(0, (meanHeap - HEAP_THRESHOLD) / (1 - HEAP_THRESHOLD)) +
            0.25 * Math.min(100 * heapSlope, 1) * (heapSlope > 0 ? 1 : 0) +
            0.15 * Math.min(heapStd, 0.5)
    )

    const needsScaling = eluScore > 0.5 || heapScore > 0.5 || meanElu > ELU_THRESHOLD + 0.05

    return {
      needsScaling,
      eluScore,
      heapScore,
      metrics: { elu: meanElu, heap: meanHeap, eluSlope, heapSlope, eluStd, heapStd }
    }
  }

  // Step 5: Prediction Integration
  #getPrediction (currentTime) {
    const prediction = predictionSchedule.find(p =>
      Math.abs(currentTime - p.absoluteTime) <= PREDICTION_WINDOW && p.confidence > CONFIDENCE_THRESHOLD
    )
    return prediction || { pods: 0, action: 'none', reasons: {} }
  }

  // Step 6: Replicaset Comparison
  compareReplicaset (podEvaluations, prediction, currentTime) {
    let highLoadPods = 0; let totalEluScore = 0; let totalHeapScore = 0; let totalPerformanceScore = 0
    const preMetrics = { elu: 0, heap: 0, eluSlope: 0, heapSlope: 0 }

    podEvaluations.forEach(({ needsScaling, eluScore, heapScore, metrics }) => {
      if (needsScaling) highLoadPods++
      totalEluScore += eluScore
      totalHeapScore += heapScore
      totalPerformanceScore += this.clusters.length > 0 ? metrics.performanceScore : 1.0
      preMetrics.elu += metrics.elu
      preMetrics.heap += metrics.heap
      preMetrics.eluSlope += metrics.eluSlope
      preMetrics.heapSlope += metrics.heapSlope
    })

    const n = podEvaluations.length || 1
    const avgEluScore = totalEluScore / n
    const avgHeapScore = totalHeapScore / n
    const avgPerformanceScore = totalPerformanceScore / n
    preMetrics.elu /= n
    preMetrics.heap /= n
    preMetrics.eluSlope /= n
    preMetrics.heapSlope /= n

    let scaleUpPods = 0
    if (highLoadPods > 0) {
      const loadRatio = highLoadPods / n
      scaleUpPods = Math.max(1, Math.ceil(n * loadRatio * 0.5))
      const scoreFactor = Math.max(avgEluScore, avgHeapScore) * avgPerformanceScore
      if (scoreFactor > 0.7) {
        scaleUpPods = Math.ceil(scaleUpPods * (1 + 2 * (scoreFactor - 0.7)))
      }
    }

    if (prediction.pods !== 0) {
      return {
        scalePods: prediction.action === 'down' ? -Math.min(Math.abs(prediction.pods), activePods.size - MIN_PODS) : Math.min(prediction.pods, MAX_PODS - activePods.size),
        action: prediction.action,
        source: 'prediction',
        preMetrics,
        reasons: prediction.reasons
      }
    }

    return {
      scalePods: Math.min(scaleUpPods, MAX_PODS - activePods.size),
      action: scaleUpPods > 0 ? 'up' : 'none',
      source: 'signal',
      preMetrics,
      reasons: {}
    }
  }

  // Step 7: Scaling Decision
  async decideScaling (podEvaluations, currentTime) {
    if (currentTime - this.lastScaleTime < SCALE_COOLDOWN) {
      return { podsToScale: 0, action: 'none', reasons: {} }
    }

    const prediction = this.#getPrediction(currentTime)
    const { scalePods, action, source, preMetrics, reasons } = this.compareReplicaset(podEvaluations, prediction, currentTime)

    if (scalePods !== 0) {
      this.lastScaleTime = currentTime
      if (action === 'up') {
        for (let i = 0; i < scalePods; i++) {
          activePods.add(`pod_${activePods.size + i + 1}`)
        }
      } else if (action === 'down') {
        const podsArray = Array.from(activePods)
        for (let i = 0; i < -scalePods; i++) {
          activePods.delete(podsArray[i])
        }
      }

      // Simulate post-scaling metrics
      const postMetrics = this.#simulatePostScaling(preMetrics, scalePods)
      this.recordPerformanceHistory(scalePods, action, source, preMetrics, postMetrics, currentTime)
    }

    return { podsToScale: scalePods, action, reasons }
  }

  // Simulate post-scaling metrics
  #simulatePostScaling (preMetrics, podsScaled) {
    const reduction = podsScaled !== 0 ? 0.2 * Math.abs(podsScaled) : 0
    const noise = () => (Math.random() - 0.5) * 0.05
    return {
      elu: Math.max(0, preMetrics.elu - reduction + noise()),
      heap: Math.max(0, preMetrics.heap - reduction + noise()),
      eluStd: Math.max(0, preMetrics.eluStd * 0.8 + noise()),
      heapStd: Math.max(0, preMetrics.heapStd * 0.8 + noise())
    }
  }

  // Step 8: Pod Management
  updatePods (currentPods) {
    activePods = new Set(currentPods)
  }
}

class TrendsLearningScheduler {
  // Step 1: Historical Data Extraction
  #extractHistory () {
    return performanceHistory
  }

  // Step 2: Time-Slot Analysis
  #timeSlotAnalysis (currentTime) {
    const slots = Array.from({ length: 86400 / TIME_SLOT_WINDOW }, (_, i) => i * TIME_SLOT_WINDOW)
    const results = {}

    slots.forEach(slot => {
      const events = performanceHistory.filter(event =>
        Math.abs((event.time % 86400) - slot) <= TIME_SLOT_WINDOW / 2
      );

      ['up', 'down'].forEach(action => {
        const actionEvents = events.filter(e => e.action === action)
        const weights = actionEvents.map(e => Math.exp(-LAMBDA * (currentTime - e.time)))
        const successScores = actionEvents.map(e => e.successScore)

        let confidence = 0
        let pods = 0
        let eluSum = 0
        let heapSum = 0
        let weightSum = 0

        actionEvents.forEach((e, i) => {
          const w = weights[i] * successScores[i]
          weightSum += w
          eluSum += e.preElu * w
          heapSum += e.preHeap * w
          pods += Math.abs(e.podsScaled) * w
        })

        if (weightSum > 0) {
          confidence = weightSum / (weightSum + 1)
          pods = pods / (weightSum + 1)
          eluSum = eluSum / (weightSum + 0.001)
          heapSum = heapSum / (weightSum + 0.001)
        }

        results[`${slot}_${action}`] = {
          confidence,
          pods: Math.ceil(pods),
          reasons: {
            event_count: actionEvents.length,
            recent_count: actionEvents.filter(e => currentTime - e.time <= 259200).length,
            avg_success: weightSum / (weights.reduce((sum, w) => sum + w, 0) + 0.001),
            avg_elu: eluSum,
            avg_heap: heapSum
          }
        }
      })
    })

    return results
  }

  // Step 3: Sequence Modeling
  #sequenceModeling (slot, currentTime, slotAnalysis) {
    const scaleUpEvents = performanceHistory.filter(event =>
      event.action === 'up' && Math.abs((event.time % 86400) - slot) <= TIME_SLOT_WINDOW / 2
    )

    const sequences = []
    scaleUpEvents.forEach(upEvent => {
      const downEvents = performanceHistory.filter(event =>
        event.action === 'down' && event.time > upEvent.time && event.time - upEvent.time <= 600
      ).sort((a, b) => a.time - b.time)

      downEvents.forEach((downEvent, index) => {
        if (!sequences[index]) sequences[index] = []
        sequences[index].push({
          offset: downEvent.time - upEvent.time,
          pods: Math.abs(downEvent.podsScaled),
          success: downEvent.successScore,
          weight: Math.exp(-LAMBDA * (currentTime - downEvent.time))
        })
      })
    })

    return sequences.map((seq, index) => {
      if (!seq || seq.length === 0) return null
      const weightSum = seq.reduce((sum, s) => sum + s.weight * s.success, 0)
      const offsetSum = seq.reduce((sum, s) => sum + s.offset * s.weight * s.success, 0)
      const podsSum = seq.reduce((sum, s) => sum + s.pods * s.weight * s.success, 0)

      return {
        offset: weightSum > 0 ? offsetSum / weightSum : 0,
        pods: weightSum > 0 ? podsSum / weightSum : 0,
        reasons: {
          seq_count: seq.length,
          avg_offset: weightSum > 0 ? offsetSum / weightSum : 0,
          avg_pods: weightSum > 0 ? podsSum / weightSum : 0
        }
      }
    }).filter(s => s)
  }

  // Step 4: Prediction Validation and Confidence Adjustment
  // Handled in performance history collection

  // Step 5: Prediction Generation
  generatePredictions (currentTime) {
    const slotAnalysis = this.#timeSlotAnalysis(currentTime)
    const newSchedule = []

    Object.keys(slotAnalysis).forEach(key => {
      const [slot, action] = key.split('_')
      const slotData = slotAnalysis[key]

      if (action === 'up' && slotData.confidence > CONFIDENCE_THRESHOLD) {
        const absoluteTime = Math.floor(currentTime / 86400) * 86400 + parseInt(slot) + 86400 // Next day
        newSchedule.push({
          timeOfDay: parseInt(slot),
          absoluteTime,
          action,
          pods: slotData.pods,
          confidence: slotData.confidence,
          reasons: slotData.reasons
        })

        const sequences = this.#sequenceModeling(parseInt(slot), currentTime, slotAnalysis)
        sequences.forEach(seq => {
          newSchedule.push({
            timeOfDay: parseInt(slot) + Math.round(seq.offset),
            absoluteTime: absoluteTime + Math.round(seq.offset),
            action: 'down',
            pods: Math.ceil(seq.pods),
            confidence: slotData.confidence,
            reasons: seq.reasons
          })
        })
      }
    })

    predictionSchedule = newSchedule
  }
}

// Initialize algorithms
const autoscaler = new ReactiveAutoscaler()
const trendsScheduler = new TrendsLearningScheduler()

// Fastify API Endpoints
fastify.post('/signal', async (request, reply) => {
  const { podId, subprocessData, timestamp } = request.body
  if (!podId || !subprocessData || !timestamp) {
    return reply.status(400).send({ error: 'Missing required fields' })
  }

  const result = await autoscaler.collectSignal(podId, subprocessData, timestamp)
  if (!result.triggered) {
    return reply.send({ status: 'No scaling triggered', pods: activePods.size })
  }

  const scalingDecision = await autoscaler.decideScaling([result.evaluation], timestamp)
  return reply.send({
    status: 'Scaling decision made',
    podsToScale: scalingDecision.podsToScale,
    action: scalingDecision.action,
    reasons: scalingDecision.reasons,
    currentPods: Array.from(activePods)
  })
})

fastify.get('/predictions', async (request, reply) => {
  return reply.send({ predictions: predictionSchedule })
})

fastify.post('/update-pods', async (request, reply) => {
  const { currentPods } = request.body
  if (!currentPods || !Array.isArray(currentPods)) {
    return reply.status(400).send({ error: 'Invalid pod list' })
  }

  autoscaler.updatePods(currentPods)
  return reply.send({ status: 'Pods updated', currentPods: Array.from(activePods) })
})

fastify.post('/run-trends', async (request, reply) => {
  const { timestamp } = request.body
  if (!timestamp) {
    return reply.status(400).send({ error: 'Missing timestamp' })
  }

  trendsScheduler.generatePredictions(timestamp)
  return reply.send({ status: 'Trends analysis complete', predictions: predictionSchedule })
})

// Schedule trends learning hourly
cron.schedule('0 * * * *', () => {
  const currentTime = Math.floor(Date.now() / 1000)
  fastify.log.info(`Running trends learning at ${new Date(currentTime * 1000).toISOString()}`)
  trendsScheduler.generatePredictions(currentTime)
})

// Simulation script
async function runSimulation () {
  const currentTime = Math.floor(Date.now() / 1000)
  const baseTime = currentTime - 30 * 86400 // 30 days ago

  // Seed history with synthetic data
  for (let i = 0; i < 1200; i++) {
    const time = baseTime + Math.floor(i * 86400 / 40) // ~40 events/day
    const is2PM = Math.abs((time % 86400) - 50400) <= TIME_SLOT_WINDOW / 2
    const action = is2PM && Math.random() < 0.7 ? 'up' : Math.random() < 0.5 ? 'up' : 'down'
    performanceHistory.push({
      time,
      podsScaled: action === 'up' ? Math.floor(8 + Math.random() * 4) : -Math.floor(2 + Math.random() * 6),
      action,
      source: Math.random() < 0.6 ? 'prediction' : 'signal',
      successScore: 0.7 + Math.random() * 0.3,
      preElu: 0.85 + Math.random() * 0.15,
      preHeap: 0.75 + Math.random() * 0.15,
      preEluSlope: Math.random() * 0.002,
      preHeapSlope: Math.random() * 0.002,
      deltaElu: -Math.random() * 0.2,
      deltaHeap: -Math.random() * 0.2,
      eluStd: Math.random() * 0.1,
      heapStd: Math.random() * 0.1
    })
  }
  performanceHistory = performanceHistory.slice(-MAX_HISTORY)

  // Run trends learning
  trendsScheduler.generatePredictions(currentTime)

  // Simulate scenarios
  const scenarios = [
    { time: currentTime, podId: 'pod_1', subprocessData: [{ elu: Array(60).fill(0.95), heap: Array(60).fill(0.8) }, { elu: Array(60).fill(0.6), heap: Array(60).fill(0.65) }], desc: 'Reactive scale-up' },
    { time: currentTime + 300, podId: 'pod_2', subprocessData: [{ elu: Array(60).fill(0.8), heap: Array(60).fill(0.7) }, { elu: Array(60).fill(0.75), heap: Array(60).fill(0.65) }], desc: 'No scaling' },
    { time: 1623254400, podId: 'pod_3', subprocessData: [{ elu: Array(60).fill(0.9), heap: Array(60).fill(0.8) }, { elu: Array(60).fill(0.6), heap: Array(60).fill(0.65) }], desc: 'Proactive scale-up at 2 PM' },
    { time: 1623254580, podId: 'pod_3', subprocessData: [{ elu: Array(60).fill(0.7), heap: Array(60).fill(0.65) }, { elu: Array(60).fill(0.6), heap: Array(60).fill(0.6) }], desc: 'Proactive scale-down at 2:03 PM' },
    { time: 1623254880, podId: 'pod_3', subprocessData: [{ elu: Array(60).fill(0.65), heap: Array(60).fill(0.6) }, { elu: Array(60).fill(0.6), heap: Array(60).fill(0.6) }], desc: 'Proactive scale-down at 2:08 PM' }
  ]

  console.log('Simulation Start')
  console.log('Initial Pods:', Array.from(activePods))
  const results = []

  for (const scenario of scenarios) {
    console.log(`\nScenario: ${scenario.desc} at ${new Date(scenario.time * 1000).toISOString()}`)
    const response = await fastify.inject({
      method: 'POST',
      url: '/signal',
      payload: { podId: scenario.podId, subprocessData: scenario.subprocessData, timestamp: scenario.time }
    })
    const result = JSON.parse(response.body)
    console.log(`Result: ${result.status}, Pods Scaled: ${result.podsToScale}, Action: ${result.action}`)
    console.log('Reasons:', result.reasons)
    console.log('Current Pods:', result.currentPods || Array.from(activePods))
    results.push(result)
  }

  console.log('\nSimulation Summary:')
  results.forEach((res, i) => {
    console.log(`Scenario ${i + 1}: ${scenarios[i].desc}, Pods Scaled: ${res.podsToScale}, Action: ${res.action}`)
  })
  console.log('Final Pods:', Array.from(activePods))
}

// Start server and run simulation
const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
    console.log('Server running at http://localhost:3000')
    await runSimulation()
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
