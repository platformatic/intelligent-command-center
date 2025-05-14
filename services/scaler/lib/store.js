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

  async saveAlert (alert) {
    const { applicationId, podId } = alert
    if (!applicationId || !podId) {
      const missingFields = []
      if (!applicationId) missingFields.push('applicationId')
      if (!podId) missingFields.push('podId')
      throw new errors.MISSING_REQUIRED_FIELDS(missingFields.join(', '))
    }

    // Ensure healthHistory is properly stored if present
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
    const appAlertKey = `${ALERTS_PREFIX}app:${applicationId}:${timestampStr}`
    const podAlertKey = `${ALERTS_PREFIX}pod:${podId}:${timestampStr}`

    const alertKey = `${ALERTS_PREFIX}${timestampStr}`

    const alertStr = JSON.stringify(alertWithTimestamp)
    await this.redis.set(alertKey, alertStr, 'EX', this.alertRetention)
    await this.redis.set(appAlertKey, alertKey, 'EX', this.alertRetention)
    await this.redis.set(podAlertKey, alertKey, 'EX', this.alertRetention)
  }

  async getAlertsByPattern (keyPattern, timeWindow = 0) {
    if (!keyPattern) {
      return []
    }

    const keys = await this.redis.keys(keyPattern)

    if (!keys || keys.length === 0) {
      return []
    }

    const alertKeys = await this.redis.mget(keys)

    const validAlertKeys = []
    for (let i = 0; i < alertKeys.length; i++) {
      if (alertKeys[i] !== null) {
        validAlertKeys.push(alertKeys[i])
      }
    }

    if (validAlertKeys.length === 0) {
      return []
    }

    const alertsData = await this.redis.mget(validAlertKeys)

    const parsedAlerts = []
    for (let i = 0; i < alertsData.length; i++) {
      const data = alertsData[i]
      if (data === null) continue

      try {
        const parsedAlert = JSON.parse(data)
        if (parsedAlert) {
          parsedAlerts.push(parsedAlert)
        }
      } catch (err) {
        this.log.error({ err }, 'Failed to parse alert data')
      }
    }

    if (timeWindow > 0) {
      const timeWindowCutoff = Date.now() - (timeWindow * 1000)
      const filteredAlerts = []
      for (let i = 0; i < parsedAlerts.length; i++) {
        const alert = parsedAlerts[i]
        if (alert.timestamp >= timeWindowCutoff) {
          filteredAlerts.push(alert)
        }
      }
      parsedAlerts.length = 0
      for (let i = 0; i < filteredAlerts.length; i++) {
        parsedAlerts.push(filteredAlerts[i])
      }
    }

    // Sort alerts by timestamp for consistent ordering (oldest first, chronological)
    parsedAlerts.sort((a, b) => a.timestamp - b.timestamp)
    return parsedAlerts
  }

  async getAlerts (applicationId, timeWindow = 0) {
    if (!applicationId) {
      return []
    }
    const keyPattern = `${ALERTS_PREFIX}app:${applicationId}:*`
    return this.getAlertsByPattern(keyPattern, timeWindow)
  }

  async getAlertByPodId (podId, timeWindow = 0) {
    if (!podId) {
      return []
    }
    const keyPattern = `${ALERTS_PREFIX}pod:${podId}:*`
    return this.getAlertsByPattern(keyPattern, timeWindow)
  }
}

module.exports = Store
