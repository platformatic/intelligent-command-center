'use strict'

const { setInterval } = require('node:timers/promises')
const { request } = require('undici')

class Metrics {
  constructor (prometheusUrl, pollingInterval, timeRange, log) {
    this.prometheusUrl = prometheusUrl
    this.pollingInterval = parseInt(pollingInterval, 10)
    this.timeRange = parseInt(timeRange, 10)
    this.log = log
    this.isPolling = false
    this.controller = null

    // These are examples, we need to defint the set of
    // metrics we want to collect for the scaler.
    // TODOL: Change them
    this.queries = [
      {
        name: 'cpu_usage',
        query: 'sum(rate(process_cpu_seconds_total[5m])) by (service)'
      },
      {
        name: 'memory_usage',
        query: 'sum(process_resident_memory_bytes) by (service)'
      },
      {
        name: 'http_requests',
        query: 'sum(rate(http_request_duration_seconds_count[5m])) by (service)'
      }
    ]
  }

  async start () {
    if (this.isPolling) {
      return
    }

    this.isPolling = true
    this.log.info('Starting metrics polling')
    this._poll()
  }

  stop () {
    if (this.controller) {
      this.controller.abort()
    }
    this.isPolling = false
    this.log.info('Stopped metrics polling')
  }

  async _poll () {
    try {
      if (this.isPolling) {
        this.controller = new AbortController()
        const { signal } = this.controller
        for await (const startTime of setInterval(this.pollingInterval, null, { signal })) {
          this.log.debug({ startTime }, 'Polling metrics')
          await this._collectMetrics()
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        this.log.info({ err }, 'Collection metrics stopped')
      } else {
        this.log.error({ err }, 'Error during metrics polling')
      }
    }
  }

  async _collectMetrics () {
    const now = Math.floor(Date.now() / 1000)
    const start = now - this.timeRange
    const end = now
    const step = Math.max(60, Math.floor(this.timeRange / 60)) // At most 60 data points

    const metricResults = {}

    const queryPromises = []
    for (const { name, query } of this.queries) {
      const queryReq = async () => {
        const url = new URL('/api/v1/query_range', this.prometheusUrl)
        url.searchParams.append('query', query)
        url.searchParams.append('start', start.toString())
        url.searchParams.append('end', end.toString())
        url.searchParams.append('step', step.toString())

        const { statusCode, body } = await request(url)

        if (statusCode !== 200) {
          const error = await body.text()
          throw new Error(`Prometheus API error: ${error}`)
        }

        const data = await body.json()

        if (data.status === 'success' && data.data?.result) {
          return { name, result: data.data.result }
        } else {
          this.log.warn({ data }, `Invalid response for metric ${name}`)
          throw new Error(`Invalid response for metric ${name}`)
        }
      }
      queryPromises.push(queryReq())
    }

    const results = await Promise.allSettled(queryPromises)

    results.forEach((result, index) => {
      const { name, query } = this.queries[index]
      if (result.status === 'fulfilled') {
        const { name, result: metricData } = result.value
        metricResults[name] = metricData
      } else {
        this.log.error({ error: result.reason, query }, `Failed to fetch metric ${name}`)
      }
    })

    this.processMetrics(metricResults)
    return metricResults
  }

  processMetrics (metrics) {
    this.log.debug({ metrics }, 'Processed metric data')
    // TODO: Put in the storage?
  }
}

module.exports = Metrics
