'use strict'

const Redis = require('iovalkey')
const errors = require('./errors')

const PREFIX = 'scaler:'
const ALERTS_PREFIX = `${PREFIX}alerts:`

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
      throw new errors.MISSING_REQUIRED_FIELDS(missingFields.join(', '))
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
}

module.exports = Store
