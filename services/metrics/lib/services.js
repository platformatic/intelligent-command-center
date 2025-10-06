'use strict'

const { queryPrometheus } = require('./prom')

const createMaxServiceCount = ({ timeWindow, offset = '1ms' }) =>
  'sum by (applicationId, serviceId, telemetry_id) ' +
  `(max_over_time(http_request_all_duration_seconds_count[${timeWindow}] offset ${offset}))`

const createMaxServiceLatency = ({ timeWindow, offset = '1ms' }) =>
  'sum by (applicationId, serviceId, telemetry_id) ' +
  `(max_over_time(http_request_all_duration_seconds_sum[${timeWindow}] offset ${offset}))`

const createAvgCountServiceQuery = ({ timeWindow }) =>
  `avg(sum by (applicationId, serviceId) (increase(http_request_all_duration_seconds_count[${timeWindow}])))`

const createLatencyQuery = ({ quantile, timeWindow }) =>
  `histogram_quantile(${quantile}, sum(rate(http_request_all_duration_seconds_bucket[${timeWindow}])) by (le))`

const getServicesMetrics = async (applications, options) => {
  const timeWindow = getTimeWindow(options)

  const maxCallsPerServiceQuery = createMaxServiceCount({ timeWindow })
  const minCallsPerServiceQuery = createMaxServiceCount({ timeWindow: '1y', offset: timeWindow })

  const maxLatencyPerServiceQuery = createMaxServiceLatency({ timeWindow })
  const minLatencyPerServiceQuery = createMaxServiceLatency({ timeWindow: '1y', offset: timeWindow })

  const avgCountQuery = createAvgCountServiceQuery({ timeWindow })
  const overallLatency50Query = createLatencyQuery({ quantile: '0.5', timeWindow })
  const overallLatency95Query = createLatencyQuery({ quantile: '0.95', timeWindow })

  const [maxCounts, minCounts, maxLatencies, minLatencies, averageCounts, overall50p, overall90p] =
    await Promise.all([
      queryPrometheus(maxCallsPerServiceQuery),
      queryPrometheus(minCallsPerServiceQuery),
      queryPrometheus(maxLatencyPerServiceQuery),
      queryPrometheus(minLatencyPerServiceQuery),
      queryPrometheus(avgCountQuery),
      queryPrometheus(overallLatency50Query),
      queryPrometheus(overallLatency95Query)
    ])

  const averageCallsCount = parseFloat(
    averageCounts.data?.result?.[0]?.value?.[1]
  ) || 0
  const overall50pLatency =
    parseFloat(overall50p.data?.result?.[0]?.value?.[1]) * 1000 || null // in ms
  const overall95pLatency =
    parseFloat(overall90p.data?.result?.[0]?.value?.[1]) * 1000 || null // in ms

  const serviceNamesMap = {}
  for (const application of applications) {
    const { id, name } = application
    serviceNamesMap[id] = name
  }

  const servicesLinks = {}
  for (const { metric, value } of maxCounts.data.result) {
    const { applicationId, serviceId, telemetry_id: caller } = metric
    if (caller === 'unknown') continue

    const applicationName = serviceNamesMap[applicationId]
    const serviceName = `${applicationName}-${serviceId}`
    const maxCountValue = parseFloat(value[1])

    const minCountMetric = minCounts.data.result.find(
      (r) =>
        r.metric.applicationId === applicationId &&
        r.metric.serviceId === serviceId &&
        r.metric.telemetry_id === caller
    )
    const minCountValue = parseFloat(minCountMetric?.value?.[1] ?? 0)

    const maxLatencyMetric = maxLatencies.data.result.find(
      (r) =>
        r.metric.applicationId === applicationId &&
        r.metric.serviceId === serviceId &&
        r.metric.telemetry_id === caller
    )
    const maxLatencyValue = parseFloat(maxLatencyMetric?.value?.[1])

    const minLatencyMetric = minLatencies.data.result.find(
      (r) =>
        r.metric.applicationId === applicationId &&
        r.metric.serviceId === serviceId &&
        r.metric.telemetry_id === caller
    )
    const minLatencyValue = parseFloat(minLatencyMetric?.value?.[1] ?? 0)

    servicesLinks[caller] = servicesLinks[caller] || {}

    const count = (maxCountValue - minCountValue) || 0
    const latencyValue = maxLatencyValue - minLatencyValue || 0

    if (count === 0 || latencyValue === 0) continue

    servicesLinks[caller][serviceName] = {
      count,
      latency: (latencyValue / count) * 1000 // in ms
    }
  }

  return {
    averageCallsCount,
    overall50pLatency,
    overall95pLatency,
    servicesLinks
  }
}

const createThreadMaxCPUQuery = ({ applicationId, serviceId, timeWindow }) =>
  'sum by (applicationId, serviceId, telemetry_id) ' +
  `(max_over_time(thread_cpu_percent_usage{applicationId="${applicationId}", serviceId="${serviceId}"}[${timeWindow}]))`

const createThreadMaxHeapQuery = ({ applicationId, serviceId, timeWindow }) =>
  'sum by (applicationId, serviceId, telemetry_id) ' +
  `(max_over_time(nodejs_heap_size_total_bytes{applicationId="${applicationId}", serviceId="${serviceId}"}[${timeWindow}]))`

const createThreadMaxLoopQuery = ({ applicationId, serviceId, timeWindow }) =>
  'sum by (applicationId, serviceId, telemetry_id) ' +
  `(max_over_time(nodejs_eventloop_utilization{applicationId="${applicationId}", serviceId="${serviceId}"}[${timeWindow}]))`

async function getServiceThreadMetrics ({ applicationId, serviceId }, options) {
  const timeWindow = getTimeWindow(options)

  const [maxCpu, maxHeap, maxLoop] = await Promise.all([
    queryPrometheus(createThreadMaxCPUQuery({ applicationId, serviceId, timeWindow })),
    queryPrometheus(createThreadMaxHeapQuery({ applicationId, serviceId, timeWindow })),
    queryPrometheus(createThreadMaxLoopQuery({ applicationId, serviceId, timeWindow }))
  ])

  return {
    cpu: maybeValue(maxCpu),
    heap: maybeValue(maxHeap),
    loop: maybeValue(maxLoop)
  }
}

function maybeValue (maybe) {
  const value = parseFloat(maybe.data.result?.[0]?.value?.[1])
  return Number.isFinite(value) ? value : 0
}

function getTimeWindow ({ start, end }) {
  const startSeconds = new Date(start).getTime() / 1000
  const endSeconds = new Date(end).getTime() / 1000
  const duration = Math.floor(endSeconds - startSeconds)
  return `${duration}s`
}

async function getThreadCountByPod ({ applicationId }) {
  const query = `nodejs_eventloop_utilization{applicationId="${applicationId}"}`

  let result
  try {
    result = await queryPrometheus(query)
  } catch (err) {
    const error = new Error(`Failed to query Prometheus: ${err.message}`)
    error.statusCode = 503
    error.cause = err
    throw error
  }

  if (!result.data || !result.data.result) {
    const error = new Error('Invalid response from Prometheus')
    error.statusCode = 500
    throw error
  }

  if (result.data.result.length === 0) {
    return {}
  }

  const threadCounts = {}

  for (const { metric } of result.data.result) {
    const { serviceId, instanceId, workerId } = metric

    if (!serviceId || !instanceId) continue

    if (!threadCounts[serviceId]) {
      threadCounts[serviceId] = {}
    }

    if (!threadCounts[serviceId][instanceId]) {
      threadCounts[serviceId][instanceId] = new Set()
    }

    if (workerId !== undefined) {
      threadCounts[serviceId][instanceId].add(workerId)
    }
  }

  const threadCountsByService = {}
  for (const serviceId in threadCounts) {
    threadCountsByService[serviceId] = {}
    for (const instanceId in threadCounts[serviceId]) {
      const workerIds = threadCounts[serviceId][instanceId]
      threadCountsByService[serviceId][instanceId] = workerIds.size > 0 ? workerIds.size : 1
    }
  }

  return threadCountsByService
}

module.exports = {
  getServicesMetrics,
  getServiceThreadMetrics,
  getThreadCountByPod
}
