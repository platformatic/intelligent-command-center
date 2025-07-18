'use strict'

const { join } = require('node:path')
const fastify = require('fastify')
const runSimulation = require('./simulate')

async function start () {
  const app = fastify({ logger: false })

  app.register(require('@fastify/websocket'))
  app.register(require('@fastify/static'), {
    root: join(__dirname, 'public'),
    prefix: '/public/'
  })

  const simulation = await runSimulation()

  // Store pod metrics history for the last 5 minutes (sampled every 5 seconds)
  const podMetricsHistory = []
  setInterval(() => {
    const pods = getPodsMetrics()
    const now = new Date()
    const podCount = pods.length

    const avgElu = pods.length ? pods.reduce((sum, p) => sum + p.elu, 0) / pods.length : 0
    const avgHeap = pods.length ? pods.reduce((sum, p) => sum + (p.usedHeap / (p.totalHeap || 1) * 100), 0) / pods.length : 0

    podMetricsHistory.push({
      timestamp: now,
      podCount,
      avgElu,
      avgHeap
    })
    // Keep only last 5 minutes
    const fiveMinAgo = Date.now() - 5 * 60 * 1000
    while (podMetricsHistory.length && podMetricsHistory[0].timestamp < fiveMinAgo) {
      podMetricsHistory.shift()
    }
  }, 5000)

  function getPodsMetrics () {
    const metrics = []
    const applications = simulation.replicaSet.applications

    for (const application of applications) {
      metrics.push({
        podId: application.podId,
        reqPerSec: Math.round(application.reqPerSec),
        elu: application.elu * 100,
        usedHeap: application.usedHeapMb,
        totalHeap: application.totalHeapMb
      })
    }

    return metrics
  }

  async function getScaleEventsChartData () {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    const scaleEvents = await simulation.server.platformatic.entities.scaleEvent.find({
      limit: 100000,
      where: { createdAt: { gte: fiveMinAgo.toISOString() } },
      orderBy: [{ field: 'createdAt', direction: 'asc' }]
    })

    const timestamps = []
    const values = []

    for (const scaleEvent of scaleEvents) {
      const timestamp = new Date(scaleEvent.createdAt).toLocaleTimeString()
      timestamps.push(timestamp)
      values.push(scaleEvent.replicas)
    }
    return {
      type: 'line',
      data: {
        labels: timestamps,
        datasets: [{
          label: 'Replicas',
          data: values,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Replicas'
          }
        },
        scales: {
          x: { display: true },
          y: {
            beginAtZero: true,
            suggestedMin: 0,
            suggestedMax: 10,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    }
  }

  async function getPerfHistoryChartsData () {
    const perfHistory = await simulation.server.platformatic.entities.performanceHistory.find({
      limit: 100000,
      orderBy: [{ field: 'eventTimestamp', direction: 'asc' }]
    })

    const perfHistoryByDay = {}
    for (const perfEvent of perfHistory) {
      const day = new Date(perfEvent.eventTimestamp).toISOString().substring(0, 10).replace(/-/g, '/')
      if (!perfHistoryByDay[day]) {
        perfHistoryByDay[day] = []
      }
      perfHistoryByDay[day].push(perfEvent)
    }

    const chartsByDay = {}
    for (const day in perfHistoryByDay) {
      const perfHistoryChartData = getPerfHistoryChartData(perfHistoryByDay[day])

      const predictionsChartData = await getPredictionsChartData(day)
      const predictionsDatasets = predictionsChartData.data?.datasets
      if (predictionsDatasets) {
        perfHistoryChartData.data.datasets.push(...predictionsDatasets)
      }

      chartsByDay[day] = perfHistoryChartData
    }

    return chartsByDay
  }

  function getPerfHistoryChartData (dayPerfHistory) {
    const data = []

    for (const perfEvent of dayPerfHistory) {
      const timestamp = new Date(perfEvent.eventTimestamp).toISOString()
      data.push({ x: timestamp, y: perfEvent.totalPods })
    }

    return generatePodChart({
      data,
      label: 'Replicas',
      title: ''
    })
  }

  async function getPredictionsChartData (date) {
    const chartDate = new Date(date ?? Date.now())

    let predictions = await simulation.server.store.getPredictions()
    predictions = predictions.sort((a, b) => a.absoluteTime - b.absoluteTime)

    let data = []

    for (const prediction of predictions) {
      const predictionTimestamp = new Date(prediction.absoluteTime)
      chartDate.setHours(predictionTimestamp.getHours())
      chartDate.setMinutes(predictionTimestamp.getMinutes())
      chartDate.setSeconds(predictionTimestamp.getSeconds())
      chartDate.setMilliseconds(predictionTimestamp.getMilliseconds())

      data.push({ x: chartDate.toISOString(), y: prediction.pods })
    }

    data = data.sort((a, b) => new Date(a.x) - new Date(b.x))

    return generatePodChart({
      data,
      label: 'Predicted replicas',
      title: 'Predictions',
      color: 'rgb(255, 140, 0)'
    })
  }

  function generatePodChart (options = {}) {
    let { data, label, title, chart, color, backgroundColor } = options
    color = color ?? 'rgb(75, 192, 192)'
    backgroundColor = color ?? 'rgba(75, 192, 192, 0.2)'

    if (chart === undefined) {
      chart = {
        type: 'line',
        data: { datasets: [] },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: title
            }
          },
          scales: {
            x: {
              display: true,
              type: 'time',
              time: {
                unit: 'hour'
              }
            },
            y: {
              beginAtZero: true,
              suggestedMin: 0,
              suggestedMax: 10,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      }
    }

    chart.data.datasets.push({
      label,
      data,
      borderColor: color,
      backgroundColor,
      tension: 0.1
    })

    return chart
  }

  async function calculatePredictions () {
    const { body } = await simulation.server.inject({
      method: 'POST',
      url: '/predictions/calculate'
    })

    const result = JSON.parse(body)
    console.log('Calculated Predictions: ', result)
  }

  app.post('/api/autocannon', async (request, reply) => {
    try {
      const { reqSec, timeout, podIds } = request.body
      if (!reqSec || !timeout) {
        return reply.code(400).send('Missing reqSec or timeout')
      }

      simulation.replicaSet.autocannon(reqSec, timeout, podIds)
      return { ok: true }
    } catch (err) {
      reply.code(400).send(err && err.message ? err.message : 'Failed to start autocannon')
    }
  })

  app.get('/api/pods', async (request, reply) => {
    try {
      return getPodsMetrics()
    } catch (error) {
      reply.code(500).send({ error: 'Failed to get pods metrics' })
    }
  })

  app.get('/api/metrics', async (request, reply) => {
    // Only return last 5 minutes
    const fiveMinAgo = Date.now() - 5 * 60 * 1000
    const filtered = podMetricsHistory.filter(m => m.timestamp >= fiveMinAgo)
    reply.send({
      timestamps: filtered.map(m => m.timestamp),
      podCounts: filtered.map(m => m.podCount),
      avgElu: filtered.map(m => m.avgElu),
      avgHeap: filtered.map(m => m.avgHeap)
    })
  })

  app.get('/api/charts', async (request, reply) => {
    try {
      const scaleEventsChart = await getScaleEventsChartData()
      return { scaleEventsChart }
    } catch (error) {
      console.error(error)
      reply.code(500).send({ error: 'Failed to generate chart data' })
    }
  })

  app.get('/api/predictions', async (request, reply) => {
    try {
      const predictionsChart = await getPredictionsChartData()
      return { predictionsChart }
    } catch (error) {
      console.error(error)
      reply.code(500).send({ error: 'Failed to get predictions chart data' })
    }
  })

  app.post('/api/predictions/calculate', async (request, reply) => {
    try {
      await calculatePredictions()
      return { ok: true }
    } catch (err) {
      console.error(err)
      reply.code(400).send(err && err.message ? err.message : 'Failed to calculate predictions')
    }
  })

  app.get('/api/perf-history-charts', async (request, reply) => {
    try {
      const chartsByDay = await getPerfHistoryChartsData()
      return chartsByDay
    } catch (error) {
      console.error(error)
      reply.code(500).send({ error: 'Failed to get performance history charts' })
    }
  })

  app.post('/api/perf-history/generate', async (request, reply) => {
    try {
      const { scheduleDescription, durationMins, amount } = request.body
      await simulation.generatePerformanceHistory({ scheduleDescription, durationMins, amount })
      return { ok: true }
    } catch (err) {
      reply.code(400).send(err && err.message ? err.message : 'Failed to generate performance history')
    }
  })

  // Serve the main HTML page from public/index.html
  app.get('/', async (request, reply) => {
    return reply.sendFile('index.html')
  })

  try {
    await app.listen({ port: 3022, host: '0.0.0.0' })
    console.log('Server running on http://localhost:3022')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
