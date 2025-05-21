'use strict'

const { request } = require('undici')

class Metrics {
  constructor (prometheusUrl, log, options = {}) {
    this.prometheusUrl = prometheusUrl
    this.log = log
    this.timeRange = options.timeRange || 60
  }

  #queryMetricWithApplicationId = async ({ metricName, applicationId, timeRange, step = 1 }) => {
    const now = Math.floor(Date.now() / 1000)
    const start = now - timeRange
    const end = now

    try {
      const url = new URL('/api/v1/query_range', this.prometheusUrl)
      const query = `${metricName}{applicationId="${applicationId}"}`

      url.searchParams.append('query', query)
      url.searchParams.append('start', start.toString())
      url.searchParams.append('end', end.toString())
      url.searchParams.append('step', step.toString())

      this.log.debug({ url: url.toString() }, 'Querying Prometheus')

      const { statusCode, body } = await request(url)

      if (statusCode !== 200) {
        const error = await body.text()
        throw new Error(`Prometheus API error: ${error}`)
      }

      const data = await body.json()

      if (data.status === 'success' && data.data?.result) {
        // Group results by podId
        const resultsByPodId = {}

        for (const item of data.data.result) {
          const podId = item?.metric?.podId || item?.metric?.instanceId || 'unknown'
          if (!resultsByPodId[podId]) {
            resultsByPodId[podId] = []
          }
          resultsByPodId[podId].push(item)
        }

        return resultsByPodId
      } else {
        this.log.warn({ data }, `Invalid response for metric ${metricName}`)
        throw new Error(`Invalid response for metric ${metricName}`)
      }
    } catch (err) {
      this.log.error({ err, metricName, applicationId }, 'Error querying Prometheus')
      throw err
    }
  }

  async queryNodeJsHeapSize (applicationId, timeRange) {
    return this.#queryMetricWithApplicationId({
      metricName: 'nodejs_heap_size_total_bytes',
      applicationId,
      timeRange: timeRange ?? this.timeRange
    })
  }

  async queryEventLoopUtilization (applicationId, timeRange) {
    return this.#queryMetricWithApplicationId({
      metricName: 'nodejs_eventloop_utilization',
      applicationId,
      timeRange: timeRange ?? this.timeRange
    })
  }

  async getApplicationMetrics (applicationId, timeRange, step = 1) {
    try {
      const effectiveTimeRange = timeRange ?? this.timeRange
      const [heapSizeByPod, eventLoopUtilizationByPod] = await Promise.all([
        this.queryNodeJsHeapSize(applicationId, effectiveTimeRange),
        this.queryEventLoopUtilization(applicationId, effectiveTimeRange)
      ])

      // Combine results by pod ID
      const allPodIds = new Set([
        ...Object.keys(heapSizeByPod),
        ...Object.keys(eventLoopUtilizationByPod)
      ])

      const podMetrics = {}

      for (const podId of allPodIds) {
        podMetrics[podId] = {
          heapSize: heapSizeByPod[podId] || [],
          eventLoopUtilization: eventLoopUtilizationByPod[podId] || []
        }
      }

      return podMetrics
    } catch (err) {
      this.log.error({ err, applicationId }, 'Error getting application metrics')
      throw err
    }
  }

  async #queryAllApplicationsMetric (metricName, timeRange, step = 1) {
    const now = Math.floor(Date.now() / 1000)
    const start = now - (timeRange ?? this.timeRange)
    const end = now

    try {
      const url = new URL('/api/v1/query_range', this.prometheusUrl)
      const query = `${metricName}`

      url.searchParams.append('query', query)
      url.searchParams.append('start', start.toString())
      url.searchParams.append('end', end.toString())
      url.searchParams.append('step', step.toString())

      this.log.debug({ url: url.toString() }, 'Querying Prometheus for all applications')

      const { statusCode, body } = await request(url)

      if (statusCode !== 200) {
        const error = await body.text()
        throw new Error(`Prometheus API error: ${error}`)
      }

      const data = await body.json()

      if (data.status === 'success' && data.data?.result) {
        // Group results by applicationId then by podId
        const resultsByApplicationId = {}

        for (const item of data.data.result) {
          const applicationId = item?.metric?.applicationId || 'unknown'
          const podId = item?.metric?.podId || item?.metric?.instanceId || 'unknown'

          if (!resultsByApplicationId[applicationId]) {
            resultsByApplicationId[applicationId] = {}
          }

          if (!resultsByApplicationId[applicationId][podId]) {
            resultsByApplicationId[applicationId][podId] = []
          }

          resultsByApplicationId[applicationId][podId].push(item)
        }

        return resultsByApplicationId
      } else {
        this.log.warn({ data }, `Invalid response for metric ${metricName}`)
        throw new Error(`Invalid response for metric ${metricName}`)
      }
    } catch (err) {
      this.log.error({ err, metricName }, 'Error querying Prometheus for all applications')
      throw err
    }
  }

  async getAllApplicationsMetrics (timeRange, step = 1) {
    try {
      const effectiveTimeRange = timeRange ?? this.timeRange
      const [heapSizeByApp, eventLoopUtilizationByApp] = await Promise.all([
        this.#queryAllApplicationsMetric('nodejs_heap_size_total_bytes', effectiveTimeRange, step),
        this.#queryAllApplicationsMetric('nodejs_eventloop_utilization', effectiveTimeRange, step)
      ])

      const appMetrics = {}

      // Combine all application IDs from both metrics
      const allAppIds = new Set([
        ...Object.keys(heapSizeByApp),
        ...Object.keys(eventLoopUtilizationByApp)
      ])

      for (const appId of allAppIds) {
        const heapSizeForApp = heapSizeByApp[appId] || {}
        const eventLoopUtilForApp = eventLoopUtilizationByApp[appId] || {}

        // Combine all pod IDs for this application
        const allPodIds = new Set([
          ...Object.keys(heapSizeForApp),
          ...Object.keys(eventLoopUtilForApp)
        ])

        const podMetrics = {}

        for (const podId of allPodIds) {
          podMetrics[podId] = {
            heapSize: heapSizeForApp[podId] || [],
            eventLoopUtilization: eventLoopUtilForApp[podId] || []
          }
        }

        appMetrics[appId] = podMetrics
      }

      return appMetrics
    } catch (err) {
      this.log.error({ err }, 'Error getting metrics for all applications')
      throw err
    }
  }
}

module.exports = Metrics
