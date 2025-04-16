'use strict'

const { queryRangePrometheus } = require('./prom')

const step = '3'

// For the cache the timeWindow is 15 minutes
const getCacheStats = async ({ applicationId = null, timeWindow = 15 } = {}) => {
  let missQuery, hitQuery
  if (applicationId) {
    // We sum up otherwise we have the hit/cache per service
    missQuery = `sum(http_cache_miss_count{applicationId="${applicationId}"})`
    hitQuery = `sum(http_cache_hit_count{applicationId="${applicationId}"})`
  } else {
    missQuery = 'sum(http_cache_miss_count)'
    hitQuery = 'sum(http_cache_hit_count)'
  }

  const end = Math.floor(new Date().getTime() / 1000)
  const start = Math.floor(end - timeWindow * 60)

  const [missRes, hitRes] = await Promise.all([
    queryRangePrometheus(missQuery, start, end, step),
    queryRangePrometheus(hitQuery, start, end, step)
  ])

  const numberOfPoints = missRes?.data?.result[0]?.values.length
  const data = []
  for (let i = 0; i < numberOfPoints; i++) {
    const date = hitRes?.data?.result[0]?.values[i][0]
    const hit = hitRes?.data?.result[0]?.values[i][1]
    const miss = missRes?.data?.result[0]?.values[i][1]
    data.push({
      date: new Date(date * 1000),
      hit,
      miss
    })
  }

  return data
}

module.exports = {
  getCacheStats
}
