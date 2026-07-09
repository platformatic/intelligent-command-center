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
  const numberOfPoints = cpuRes?.data?.result[0]?.values.length
  const data = []
  for (let i = 0; i < numberOfPoints; i++) {
    const date = cpuRes?.data?.result[0]?.values[i][0]
    const cpu = parseFloat(cpuRes?.data?.result[0]?.values[i][1]) // CPU is in [0,100] perc
    const eventLoop = parseFloat(eventLoopRes?.data?.result[0]?.values[i][1]) * 100 // ELU is in [0,1]
    data.push({
      date: new Date(date * 1000),
      cpu,
      eventLoop
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
