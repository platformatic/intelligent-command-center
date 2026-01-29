'use strict'

const { queryPrometheus, queryRangePrometheus } = require('./prom')

function normalizeTelemetryId (telemetryId) {
  return (!telemetryId || telemetryId === 'unknown') ? 'X' : telemetryId
}

function getTelemetryId (metric) {
  return metric.caller || metric.callerTelemetryId || metric.telemetry_id
}

const createMaxServiceCount = ({ timeWindow, offset = '1ms' }) =>
  'sum by (applicationId, serviceId, caller) ' +
  '(' +
  'label_replace(' +
  'label_replace(' +
  `max_over_time(http_request_all_duration_seconds_count[${timeWindow}] offset ${offset}), ` +
  '"caller", "$1", "telemetry_id", "(.+)"' +
  '), ' +
  '"caller", "$1", "callerTelemetryId", "(.+)"' +
  ')' +
  ')'

const createMaxServiceLatency = ({ timeWindow, offset = '1ms' }) =>
  'sum by (applicationId, serviceId, caller) ' +
  '(' +
  'label_replace(' +
  'label_replace(' +
  `max_over_time(http_request_all_duration_seconds_sum[${timeWindow}] offset ${offset}), ` +
  '"caller", "$1", "telemetry_id", "(.+)"' +
  '), ' +
  '"caller", "$1", "callerTelemetryId", "(.+)"' +
  ')' +
  ')'

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
    const { applicationId, serviceId } = metric
    const caller = getTelemetryId(metric)
    const normalizedCaller = normalizeTelemetryId(caller)

    const applicationName = serviceNamesMap[applicationId]
    const serviceName = `${applicationName}-${serviceId}`
    const maxCountValue = parseFloat(value[1])

    const minCountMetric = minCounts.data.result.find(
      (r) =>
        r.metric.applicationId === applicationId &&
        r.metric.serviceId === serviceId &&
        normalizeTelemetryId(getTelemetryId(r.metric)) === normalizedCaller
    )
    const minCountValue = parseFloat(minCountMetric?.value?.[1] ?? 0)

    const maxLatencyMetric = maxLatencies.data.result.find(
      (r) =>
        r.metric.applicationId === applicationId &&
        r.metric.serviceId === serviceId &&
        normalizeTelemetryId(getTelemetryId(r.metric)) === normalizedCaller
    )
    const maxLatencyValue = parseFloat(maxLatencyMetric?.value?.[1])

    const minLatencyMetric = minLatencies.data.result.find(
      (r) =>
        r.metric.applicationId === applicationId &&
        r.metric.serviceId === serviceId &&
        normalizeTelemetryId(getTelemetryId(r.metric)) === normalizedCaller
    )
    const minLatencyValue = parseFloat(minLatencyMetric?.value?.[1] ?? 0)

    servicesLinks[normalizedCaller] = servicesLinks[normalizedCaller] || {}

    const count = (maxCountValue - minCountValue) || 0
    const latencyValue = maxLatencyValue - minLatencyValue || 0

    if (count === 0 || latencyValue === 0) continue

    servicesLinks[normalizedCaller][serviceName] = {
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
  'sum by (applicationId, serviceId, caller) ' +
  '(' +
  'label_replace(' +
  'label_replace(' +
  `max_over_time(thread_cpu_percent_usage{applicationId="${applicationId}", serviceId="${serviceId}"}[${timeWindow}]), ` +
  '"caller", "$1", "telemetry_id", "(.+)"' +
  '), ' +
  '"caller", "$1", "callerTelemetryId", "(.+)"' +
  ')' +
  ')'

const createThreadMaxHeapQuery = ({ applicationId, serviceId, timeWindow }) =>
  'sum by (applicationId, serviceId, caller) ' +
  '(' +
  'label_replace(' +
  'label_replace(' +
  `max_over_time(nodejs_heap_size_total_bytes{applicationId="${applicationId}", serviceId="${serviceId}"}[${timeWindow}]), ` +
  '"caller", "$1", "telemetry_id", "(.+)"' +
  '), ' +
  '"caller", "$1", "callerTelemetryId", "(.+)"' +
  ')' +
  ')'

const createThreadMaxLoopQuery = ({ applicationId, serviceId, timeWindow }) =>
  'sum by (applicationId, serviceId, caller) ' +
  '(' +
  'label_replace(' +
  'label_replace(' +
  `max_over_time(nodejs_eventloop_utilization{applicationId="${applicationId}", serviceId="${serviceId}"}[${timeWindow}]), ` +
  '"caller", "$1", "telemetry_id", "(.+)"' +
  '), ' +
  '"caller", "$1", "callerTelemetryId", "(.+)"' +
  ')' +
  ')'

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

const THREAD_COUNT_TIME_WINDOW_SECONDS = 60

async function getThreadCountByPod ({ applicationId, serviceId = null }) {
  let query = `nodejs_eventloop_utilization{applicationId="${applicationId}"`
  if (serviceId) {
    query += `,serviceId="${serviceId}"`
  }
  query += '}'

  const now = Math.floor(Date.now() / 1000)
  const start = now - THREAD_COUNT_TIME_WINDOW_SECONDS
  const end = now

  let result
  try {
    result = await queryRangePrometheus(query, start, end, '15s')
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

  for (const { metric, values } of result.data.result) {
    if (!values || values.length === 0) continue

    let { serviceId, instanceId, workerId } = metric

    if (!serviceId || !instanceId) continue

    if (!threadCounts[serviceId]) {
      threadCounts[serviceId] = {}
    }

    if (!threadCounts[serviceId][instanceId]) {
      threadCounts[serviceId][instanceId] = new Set()
    }

    workerId ??= 'initial'
    threadCounts[serviceId][instanceId].add(workerId)
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
