'use strict'

const Redis = require('iovalkey')
const errors = require('./errors')

const PREFIX = 'scaler:'

class AlertStore {
  constructor (redisUrl, log) {
    if (!redisUrl) {
      throw new Error('Redis URL is required')
    }
    if (!log) {
      throw new Error('Logger is required')
    }

    this.redis = new Redis(redisUrl, {
      enableAutoPipelining: true
    })
    this.log = log
  }

  async close () {
    if (this.redis) {
      await this.redis.quit()
      this.redis = null
    }
  }

  async saveAlert (alert) {
    const { applicationId, serviceId, podId } = alert
    if (!applicationId || !serviceId || !podId) {
      const missingFields = []
      if (!applicationId) missingFields.push('applicationId')
      if (!serviceId) missingFields.push('serviceId')
      if (!podId) missingFields.push('podId')
      throw new errors.MISSING_REQUIRED_FIELDS(missingFields.join(', '))
    }

    // Add timestamp to alert
    const alertWithTimestamp = {
      ...alert,
      timestamp: Date.now()
    }

    const appAlertsList = `${PREFIX}${applicationId}:alerts`
    const podAlertsList = `${PREFIX}${podId}:alerts`

    await this.redis.lpush(appAlertsList, JSON.stringify(alertWithTimestamp))
    await this.redis.lpush(podAlertsList, JSON.stringify(alertWithTimestamp))
  }

  async getAlerts (applicationId) {
    if (!applicationId) {
      return []
    }

    const appAlertsList = `${PREFIX}${applicationId}:alerts`
    const alertsData = await this.redis.lrange(appAlertsList, 0, -1)

    if (!alertsData || alertsData.length === 0) {
      return []
    }

    return alertsData
      .map(data => {
        try {
          return JSON.parse(data)
        } catch (err) {
          this.log.error({ err }, 'Failed to parse alert data')
          return null
        }
      })
      .filter(Boolean) // Remove any null entries
  }

  async getAlertByPodId (podId) {
    if (!podId) {
      return []
    }

    const podAlertsList = `${PREFIX}${podId}:alerts`
    const alertsData = await this.redis.lrange(podAlertsList, 0, -1)

    if (!alertsData || alertsData.length === 0) {
      return []
    }

    return alertsData
      .map(data => {
        try {
          return JSON.parse(data)
        } catch (err) {
          this.log.error({ err }, 'Failed to parse alert data')
          return null
        }
      })
      .filter(Boolean)
  }
}

module.exports = AlertStore
