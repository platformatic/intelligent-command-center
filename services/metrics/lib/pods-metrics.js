'use strict'
const {
  queryPrometheus,
  queryRangePrometheus
} = require('./prom')

const {
  createRSSMemoryPodQuery,
  createTotalHEAPMemoryPodQuery,
  createUsedHEAPMemoryPodQuery,
  createMemoryLimitPodQuery,
  createAllocatedCPUPodQuery,
  createCPUPodQuery,
  createEventLoopPodQuery
} = require('./queries')

const {
  createRSSMemoryPodChartQuery,
  createTotalHEAPMemoryPodChartQuery,
  createUsedHEAPMemoryPodChartQuery,
  createCPUPodChartQuery,
  createEventLoopPodChartQuery,
  createLatencyPodChartQuery,
  createOldHeapSpacePodChartQuery,
  createNewHeapSpacePodChartQuery
} = require('./chart-queries')

const { toGB } = require('./utils')

const getPodMemMetrics = async ({ podId, timeWindow }) => {
  const rssMemoryQuery = createRSSMemoryPodQuery({ podId, timeWindow })
  const totalHEAPMemoryQuery = createTotalHEAPMemoryPodQuery({ podId, timeWindow })
  const usedHEAPMemoryQuery = createUsedHEAPMemoryPodQuery({ podId, timeWindow })
  const memoryLimitQuery = createMemoryLimitPodQuery(podId)

  const [rssRes, totalHeapRes, usedHeapRes, podMemoryLimitRes] = await Promise.all([
    queryPrometheus(rssMemoryQuery),
    queryPrometheus(totalHEAPMemoryQuery),
    queryPrometheus(usedHEAPMemoryQuery),
    queryPrometheus(memoryLimitQuery)
  ])
  const rss = toGB(parseFloat(rssRes?.data?.result[0]?.value[1]))
  const totalHeap = toGB(parseFloat(totalHeapRes?.data?.result[0]?.value[1]))
  const usedHeap = toGB(parseFloat(usedHeapRes?.data?.result[0]?.value[1]))
  const podMemoryLimit = toGB(parseFloat(podMemoryLimitRes?.data?.result[0]?.value[1]))
  return { rss, totalHeap, usedHeap, podMemoryLimit }
}

const getPodCpuEventMetrics = async ({ podId, timeWindow }) => {
  const cpuQuery = createCPUPodQuery({ podId, timeWindow })
  const eventLoopQuery = createEventLoopPodQuery({ podId, timeWindow })
  const podCoresQuery = createAllocatedCPUPodQuery({ podId })
  const [cpuRes, eventLoopRes, podCoresRes] = await Promise.all([
    queryPrometheus(cpuQuery),
    queryPrometheus(eventLoopQuery),
    queryPrometheus(podCoresQuery)
  ])
  const cpuCores = parseFloat(cpuRes?.data?.result[0]?.value[1]) || 0 // in cores
  const podCores = parseFloat(podCoresRes?.data?.result[0]?.value[1]) || 1
  const cpu = (cpuCores / podCores) * 100 // in percentage of available cores
  const eventLoop = (parseFloat(eventLoopRes?.data?.result[0]?.value[1]) || 0) * 100
  return { cpu, eventLoop, podCores }
}

const getPodChartsMetrics = async ({ podId, entrypoint, serviceId = null }) => {
  // If entrypoint is provided, use it to get latency metrics. Otherwise, use serviceId
  const latencyServiceId = entrypoint || serviceId

  const chartWindowInMinutes = 5

  const end = new Date().getTime() / 1000
  const start = end - chartWindowInMinutes * 60
  // Note that this must be <= of the refresh interval of the chart in ui.
  // Otherwise we shift the chart but the data ars not updated
  const step = '2s'

  const rssMemoryQuery = createRSSMemoryPodChartQuery(podId, serviceId)
  const totalHEAPMemoryQuery = createTotalHEAPMemoryPodChartQuery(podId, serviceId)
  const usedHEAPMemoryQuery = createUsedHEAPMemoryPodChartQuery(podId, serviceId)
  const oldSpaceSizeQuery = createOldHeapSpacePodChartQuery(podId, serviceId)
  const newSpaceSizeQuery = createNewHeapSpacePodChartQuery(podId, serviceId)
  const cpuQuery = createCPUPodChartQuery(podId, serviceId)
  const eventLoopQuery = createEventLoopPodChartQuery(podId, serviceId)
  const latencyQuery50 = createLatencyPodChartQuery(podId, latencyServiceId, '0.5')
  const latencyQuery90 = createLatencyPodChartQuery(podId, latencyServiceId, '0.9')
  const latencyQuery95 = createLatencyPodChartQuery(podId, latencyServiceId, '0.95')
  const latencyQuery99 = createLatencyPodChartQuery(podId, latencyServiceId, '0.99')
  const [rssRes, totalHeapRes, usedHeapRes, oldSpaceSizeRes, newSpaceSizeRes, cpuRes, eventLoopRes, latencyRes50, latencyRes90, latencyRes95, latencyRes99] = await Promise.all([
    queryRangePrometheus(rssMemoryQuery, start, end, step),
    queryRangePrometheus(totalHEAPMemoryQuery, start, end, step),
    queryRangePrometheus(usedHEAPMemoryQuery, start, end, step),
    queryRangePrometheus(oldSpaceSizeQuery, start, end, step),
    queryRangePrometheus(newSpaceSizeQuery, start, end, step),
    queryRangePrometheus(cpuQuery, start, end, step),
    queryRangePrometheus(eventLoopQuery, start, end, step),
    queryRangePrometheus(latencyQuery50, start, end, step),
    queryRangePrometheus(latencyQuery90, start, end, step),
    queryRangePrometheus(latencyQuery95, start, end, step),
    queryRangePrometheus(latencyQuery99, start, end, step)
  ])

  const numberOfPoints = rssRes?.data?.result[0]?.values.length
  const data = []
  for (let i = 0; i < numberOfPoints; i++) {
    const date = rssRes?.data?.result[0]?.values[i][0]
    const rss = rssRes?.data?.result[0]?.values[i][1]
    const totalHeapSize = totalHeapRes?.data?.result[0]?.values[i][1]
    const usedHeapSize = usedHeapRes?.data?.result[0]?.values[i][1]
    const oldSpaceSize = oldSpaceSizeRes?.data?.result[0]?.values[i][1]
    const newSpaceSize = newSpaceSizeRes?.data?.result[0]?.values[i][1]
    const cpu = cpuRes?.data?.result[0]?.values[i][1]
    const elu = eventLoopRes?.data?.result[0]?.values[i][1]
    let latency50 = 0
    if (latencyRes50?.data?.result[0]?.values[i]) {
      latency50 = parseFloat(latencyRes50?.data?.result[0]?.values[i][1]) * 1000
    }
    let latency90 = 0
    if (latencyRes90?.data?.result[0]?.values[i]) {
      latency90 = parseFloat(latencyRes90?.data?.result[0]?.values[i][1]) * 1000
    }
    let latency95 = 0
    if (latencyRes95?.data?.result[0]?.values[i]) {
      latency95 = parseFloat(latencyRes95?.data?.result[0]?.values[i][1]) * 1000
    }
    let latency99 = 0
    if (latencyRes99?.data?.result[0]?.values[i]) {
      latency99 = parseFloat(latencyRes99?.data?.result[0]?.values[i][1]) * 1000
    }

    data.push({
      date: new Date(date * 1000),
      cpu,
      elu,
      rss,
      usedHeapSize,
      totalHeapSize,
      newSpaceSize,
      oldSpaceSize,
      latencies: {
        p50: latency50,
        p90: latency90,
        p95: latency95,
        p99: latency99
      }
    })
  }

  return data
}

module.exports = {
  getPodMemMetrics,
  getPodCpuEventMetrics,
  getPodChartsMetrics
}
