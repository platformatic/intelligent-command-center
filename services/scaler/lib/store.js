'use strict'

const Redis = require('iovalkey')
const {
  ALERTS_PREFIX,
  PERF_HISTORY_PREFIX,
  CLUSTERS_PREFIX,
  LAST_SCALING_PREFIX
} = require('./store-constants')

class Store {
  constructor (redisUrl, log, options = {}) {
    this.redis = new Redis(redisUrl, {
      enableAutoPipelining: true
    })
    this.log = log
    this.alertRetention = options.alertRetention || 60 // 1 minutes in seconds
  }

  async close () {
    if (this.redis) {
      await this.redis.quit()
      this.redis = null
    }
  }

  async #getAlertsByPattern (pattern, timeWindow = 0) {
    const keys = await this.redis.keys(pattern)

    if (keys.length === 0) {
      return []
    }

    const now = Date.now()
    const alerts = []

    const values = await this.redis.mget(keys)
    for (let i = 0; i < values.length; i++) {
      if (!values[i]) continue

      try {
        const alert = JSON.parse(values[i])
        if (timeWindow > 0 && (now - alert.timestamp) > timeWindow) {
          continue
        }
        alerts.push(alert)
      } catch (err) {
        this.log.error({ err, key: keys[i] }, 'Failed to parse alert')
      }
    }

    return alerts.sort((a, b) => a.timestamp - b.timestamp)
  }

  async saveAlert (alert) {
    const { applicationId, podId } = alert
    if (!applicationId || !podId) {
      const missingFields = []
      if (!applicationId) missingFields.push('applicationId')
      if (!podId) missingFields.push('podId')
      throw new Error('Missing required fields: ' + missingFields.join(', '))
    }

    if (alert.healthHistory && !Array.isArray(alert.healthHistory)) {
      this.log.warn({ podId, applicationId }, 'healthHistory is not an array, converting to empty array')
      alert.healthHistory = []
    }

    const timestamp = Date.now()
    const alertWithTimestamp = {
      ...alert,
      timestamp
    }

    const timestampStr = timestamp.toString().padStart(13, '0') // to be "sortable"
    const alertKey = `${ALERTS_PREFIX}app:${applicationId}:pod:${podId}:${timestampStr}`

    const alertStr = JSON.stringify(alertWithTimestamp)
    await this.redis.set(alertKey, alertStr, 'EX', this.alertRetention)
  }

  async getAlertsByApplicationId (applicationId, timeWindow = 0) {
    if (!applicationId) {
      return []
    }

    const pattern = `${ALERTS_PREFIX}app:${applicationId}:pod:*`
    return this.#getAlertsByPattern(pattern, timeWindow)
  }

  async getAlertsByPodId (podId, timeWindow = 0) {
    if (!podId) {
      return []
    }

    const pattern = `${ALERTS_PREFIX}app:*:pod:${podId}:*`
    return this.#getAlertsByPattern(pattern, timeWindow)
  }

  // Performance History Methods
  async loadPerfHistory (applicationId) {
    try {
      const key = `${PERF_HISTORY_PREFIX}${applicationId}`
      const historyStr = await this.redis.get(key)
      if (!historyStr) {
        return []
      }
      return JSON.parse(historyStr)
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to load performance history')
      return []
    }
  }

  async savePerfHistory (applicationId, history) {
    try {
      const key = `${PERF_HISTORY_PREFIX}${applicationId}`
      await this.redis.set(key, JSON.stringify(history))
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to save performance history')
    }
  }

  async addPerfHistoryEvent (applicationId, event, maxHistoryEvents = 10) {
    const history = await this.loadPerfHistory(applicationId)
    history.push(event)

    // Sort by timestamp (newest first)
    history.sort((a, b) => b.timestamp - a.timestamp)

    if (history.length > maxHistoryEvents) {
      history.length = maxHistoryEvents
    }

    await this.savePerfHistory(applicationId, history)
    return history
  }

  // Clusters Methods
  async loadClusters (applicationId) {
    try {
      const key = `${CLUSTERS_PREFIX}${applicationId}`
      const clustersStr = await this.redis.get(key)
      if (!clustersStr) {
        return []
      }
      return JSON.parse(clustersStr)
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to load clusters')
      return []
    }
  }

  async saveClusters (applicationId, clusters) {
    try {
      const key = `${CLUSTERS_PREFIX}${applicationId}`
      await this.redis.set(key, JSON.stringify(clusters))
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to save clusters')
    }
  }

  // Last Scaling Time Methods
  async getLastScalingTime (applicationId) {
    try {
      const key = `${LAST_SCALING_PREFIX}${applicationId}`
      const timeStr = await this.redis.get(key)
      return timeStr ? Number(timeStr) : 0
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to get last scaling time')
      return 0
    }
  }

  async saveLastScalingTime (applicationId, time) {
    try {
      const key = `${LAST_SCALING_PREFIX}${applicationId}`
      await this.redis.set(key, time.toString())
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to save last scaling time')
    }
  }
}

module.exports = Store
