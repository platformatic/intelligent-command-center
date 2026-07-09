'use strict'

const { queryRangePrometheus } = require('./prom')
const {
  createRSSMemoryQuery,
  createTotalHEAPMemoryQuery,
  createUsedHEAPMemoryQuery,
  createCPUQuery,
  createEventLoopQuery,
  createLatencyQuery
} = require('./queries')

const { toGB } = require('./utils')

const step = '5s'

const getMemMetrics = async ({ appId, timeWindow, instance }) => {
  const end = new Date().getTime() / 1000
  const start = end - timeWindow * 60

  const rssMemoryQuery = createRSSMemoryQuery({ appId, instance })
  const totalHEAPMemoryQuery = createTotalHEAPMemoryQuery({ appId, instance })
  const usedHEAPMemoryQuery = createUsedHEAPMemoryQuery({ appId, instance })
  const [rssRes, totalHeapRes, usedHeapRes] = await Promise.all([
    queryRangePrometheus(rssMemoryQuery, start, end, step),
    queryRangePrometheus(totalHEAPMemoryQuery, start, end, step),
    queryRangePrometheus(usedHEAPMemoryQuery, start, end, step)
  ])

  const numberOfPoints = rssRes?.data?.result[0]?.values.length
  const data = []
  for (let i = 0; i < numberOfPoints; i++) {
    const date = rssRes?.data?.result[0]?.values[i][0]
    const rssSize = rssRes?.data?.result[0]?.values[i][1]
    const rss = toGB(rssSize)
    const totalHeapSize = totalHeapRes?.data?.result[0]?.values[i][1]
    const totalHeap = toGB(totalHeapSize)
    const usedHeapSize = usedHeapRes?.data?.result[0]?.values[i][1]
    const usedHeap = toGB(usedHeapSize)
    data.push({
      date: new Date(date * 1000),
      rss,
      usedHeap,
      totalHeap
    })
  }

  return data
}

const getCpuEventMetrics = async ({ appId, timeWindow, instance }) => {
  const end = new Date().getTime() / 1000
  const start = end - timeWindow * 60
  const cpuQuery = createCPUQuery({ appId, instance })
  const eventLoopQuery = createEventLoopQuery({ appId, instance })

  const [cpuRes, eventLoopRes] = await Promise.all([
    queryRangePrometheus(cpuQuery, start, end, step),
    queryRangePrometheus(eventLoopQuery, start, end, step)
  ])

  // CPU and ELU come from different scrape targets: CPU is cAdvisor
  // `rate(container_cpu_usage[1m])` joined with kube-state-metrics (three targets,
  // and rate[1m] needs ~1m of history), while ELU is the app's own gauge, present
  // from the moment the runtime boots. So at cold start their range results differ
  // in both length and start time. Two consequences we must handle:
  //   1. Index-aligning the arrays would plot ELU against CPU timestamps. Merge on
  //      the shared timestamp instead so each metric keeps its own time axis.
  //   2. Gating the whole panel on the CPU series length shows "No Data" until CPU
  //      warms up, even though ELU is ready. Emit a row whenever EITHER has a value
  //      (missing metric -> null, rendered as a gap by the chart).
  const cpuByTs = new Map()
  for (const [ts, v] of cpuRes?.data?.result[0]?.values ?? []) {
    cpuByTs.set(ts, parseFloat(v)) // CPU is already a percentage of the pod's CPU limit
  }
  const eluByTs = new Map()
  for (const [ts, v] of eventLoopRes?.data?.result[0]?.values ?? []) {
    eluByTs.set(ts, parseFloat(v) * 100) // ELU is a [0,1] fraction
  }

  const timestamps = [...new Set([...cpuByTs.keys(), ...eluByTs.keys()])].sort((a, b) => a - b)
  const data = []
  for (const ts of timestamps) {
    data.push({
      date: new Date(ts * 1000),
      cpu: cpuByTs.has(ts) ? cpuByTs.get(ts) : null,
      eventLoop: eluByTs.has(ts) ? eluByTs.get(ts) : null
    })
  }
  return data
}

const getLatencyMetrics = async ({ appId, entrypoint, timeWindow, instance }) => {
  const end = new Date().getTime() / 1000
  const start = end - timeWindow * 60
  const latencyQuery90 = createLatencyQuery({ appId, entrypoint, quantile: '0.9', instance })
  const latencyQuery95 = createLatencyQuery({ appId, entrypoint, quantile: '0.95', instance })
  const latencyQuery99 = createLatencyQuery({ appId, entrypoint, quantile: '0.99', instance })
  const [latencyRes90, latencyRes95, latencyRes99] = await Promise.all([
    queryRangePrometheus(latencyQuery90, start, end, step),
    queryRangePrometheus(latencyQuery95, start, end, step),
    queryRangePrometheus(latencyQuery99, start, end, step)
  ])
  const numberOfPoints = latencyRes90?.data?.result[0]?.values.length
  const data = []
  for (let i = 0; i < numberOfPoints; i++) {
    const date = latencyRes90?.data?.result[0]?.values[i][0]
    const p90 = parseFloat(latencyRes90?.data?.result[0]?.values[i][1]) * 1000 || null
    const p95 = parseFloat(latencyRes95?.data?.result[0]?.values[i][1]) * 1000 || null
    const p99 = parseFloat(latencyRes99?.data?.result[0]?.values[i][1]) * 1000 || null
    data.push({
      date: new Date(date * 1000),
      p90,
      p95,
      p99
    })
  }
  return data
}

module.exports = {
  getMemMetrics,
  getCpuEventMetrics,
  getLatencyMetrics
}
