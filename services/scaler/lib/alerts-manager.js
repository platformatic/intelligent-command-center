'use strict'

// Define Redis key prefix for triggered pods
const TRIGGERED_PODS_PREFIX = 'scaler:triggered-pods:'

class AlertsManager {
  constructor (app, options = {}) {
    this.app = app
    this.debounceWindow = process.env.PLT_SCALER_DEBOUNCE || 10000 // the defualt is for tests
    this.cleanupInterval = options.cleanupInterval || 100
  }

  clearRecentTriggers () {
    return this._deleteTriggeredPodKeys('*')
  }

  setDebounceWindow (ms) {
    this.debounceWindow = ms
  }

  async getLastTriggeredTime (podId) {
    try {
      const key = this._getTriggeredPodKey(podId)
      const value = await this.app.store.redis.get(key)
      return value ? Number(value) : null
    } catch (err) {
      this.app.log.error({ err, podId }, 'Failed to get triggered pod timestamp from Redis')
      return null
    }
  }

  async setLastTriggeredTime (podId, timestamp) {
    try {
      const key = this._getTriggeredPodKey(podId)
      const expiry = Math.max(1, Math.ceil(this.debounceWindow / 1000))
      await this.app.store.redis.set(key, timestamp.toString(), 'EX', expiry)
      this.app.log.debug({ podId, timestamp, ttl: expiry }, 'Set pod trigger timestamp in Redis')
    } catch (err) {
      this.app.log.error({ err, podId, timestamp }, 'Failed to set triggered pod timestamp in Redis')
    }
  }

  async _deleteTriggeredPodKeys (pattern) {
    try {
      const keys = await this.app.store.redis.keys(`${TRIGGERED_PODS_PREFIX}${pattern}`)

      if (keys.length > 0) {
        await this.app.store.redis.del(keys)
        this.app.log.debug({ deletedCount: keys.length }, 'Deleted triggered pod entries')
      }

      return keys.length
    } catch (err) {
      this.app.log.error({ err, pattern }, 'Failed to delete triggered pod keys from Redis')
      return 0
    }
  }

  _getTriggeredPodKey (podId) {
    return `${TRIGGERED_PODS_PREFIX}${podId}`
  }

  async processAlert (alert) {
    const { applicationId, serviceId, podId, elu, heapUsed, heapTotal, unhealthy, healthHistory } = alert

    this.app.log.debug({
      applicationId,
      serviceId,
      podId,
      elu,
      heapUsed,
      heapTotal,
      unhealthy
    }, 'Processing alert')

    await this.app.store.saveAlert({
      applicationId,
      serviceId,
      podId,
      elu,
      heapUsed,
      heapTotal,
      unhealthy,
      healthHistory
    })

    const now = Date.now()
    const lastTriggered = await this.getLastTriggeredTime(podId)

    if (!lastTriggered || (now - lastTriggered) > this.debounceWindow) {
      this.app.log.info({ podId, unhealthy }, 'Triggering scaler for unhealthy pod')
      await this.app.notifyScaler(podId)
      await this.setLastTriggeredTime(podId, now)
    } else {
      this.app.log.debug({
        podId,
        timeSinceLastTrigger: now - lastTriggered,
        debounceWindow: this.debounceWindow
      }, 'Skipping scaler trigger for recently triggered pod')
    }
  }
}

module.exports = AlertsManager
