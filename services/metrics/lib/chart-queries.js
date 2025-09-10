'use strict'

const serviceIdFilter = (serviceId) => serviceId ? `, serviceId="${serviceId}"` : ''

const createRSSMemoryPodChartQuery = (podId, serviceId = null) =>
  `process_resident_memory_bytes{instanceId="${podId}"${serviceIdFilter(serviceId)}}`

const createTotalHEAPMemoryPodChartQuery = (podId, serviceId = null) => {
  if (!serviceId) {
    return `sum(nodejs_heap_size_total_bytes{instanceId="${podId}"})`
  }
  return `nodejs_heap_size_total_bytes{instanceId="${podId}"${serviceIdFilter(serviceId)}}`
}

const createOldHeapSpacePodChartQuery = (podId, serviceId = null) => {
  if (!serviceId) {
    return `sum(nodejs_heap_space_size_total_bytes{instanceId="${podId}", space="old"})`
  }
  return `nodejs_heap_space_size_total_bytes{instanceId="${podId}", space="old"${serviceIdFilter(serviceId)}}`
}

const createNewHeapSpacePodChartQuery = (podId, serviceId = null) => {
  if (!serviceId) {
    return `sum(nodejs_heap_space_size_total_bytes{instanceId="${podId}", space="new"})`
  }
  return `nodejs_heap_space_size_total_bytes{instanceId="${podId}", space="new"${serviceIdFilter(serviceId)}}`
}

const createUsedHEAPMemoryPodChartQuery = (podId, serviceId = null) => {
  if (!serviceId) {
    return `sum(nodejs_heap_size_used_bytes{instanceId="${podId}"})`
  }
  return `nodejs_heap_size_used_bytes{instanceId="${podId}"${serviceIdFilter(serviceId)}}`
}

const createCPUPodChartQuery = (podId, serviceId = null) => {
  if (!serviceId) {
    return `process_cpu_percent_usage{instanceId="${podId}"}`
  }
  return `thread_cpu_percent_usage{instanceId="${podId}"${serviceIdFilter(serviceId)}}`
}

// We need the `max` because we have different ELU per service in the same pod. We cannot average (if we have 10 services, one can be 99% and the other 0%) and we cannot sum up.
// So we take the max, which is also coherent with teh pod detail (where we also take the max).
const createEventLoopPodChartQuery = (podId, serviceId = null) =>
  `max(nodejs_eventloop_utilization{instanceId="${podId}"${serviceIdFilter(serviceId)}})`

// quantile as fraction, so 0.95 for 95th percentile
const createLatencyPodChartQuery = (podId, serviceId, quantile) =>
    `http_request_all_summary_seconds{instanceId="${podId}", serviceId="${serviceId}", quantile="${quantile}"}`

module.exports = {
  createRSSMemoryPodChartQuery,
  createTotalHEAPMemoryPodChartQuery,
  createUsedHEAPMemoryPodChartQuery,
  createCPUPodChartQuery,
  createEventLoopPodChartQuery,
  createLatencyPodChartQuery,
  createOldHeapSpacePodChartQuery,
  createNewHeapSpacePodChartQuery
}
