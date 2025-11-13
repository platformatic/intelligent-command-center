'use strict'

const Redis = require('iovalkey')
const { scanKeys } = require('../../../lib/redis-utils')
const {
  ALERTS_PREFIX,
  PERF_HISTORY_PREFIX,
  CLUSTERS_PREFIX,
  LAST_SCALING_PREFIX,
  PREDICTIONS_PREFIX
} = require('./store-constants')

class Store {
  constructor (redisUrl, log, options = {}) {
    this.valkey = new Redis(redisUrl, {
      enableAutoPipelining: true
    })
    this.log = log
    this.alertRetention = options.alertRetention || 60 // 1 minutes in seconds
  }

  async close () {
    if (this.valkey) {
      await this.valkey.quit()
      this.valkey = null
    }
  }

  async #getAlertsByPattern (pattern, timeWindow = 0) {
    const keys = await scanKeys(this.valkey, pattern)

    if (keys.length === 0) {
      return []
    }

    const now = Date.now()
    const alerts = []

    const pipeline = this.valkey.pipeline()
    for (const key of keys) {
      pipeline.get(key)
    }
    const results = await pipeline.exec()

    for (let i = 0; i < results.length; i++) {
      const [err, value] = results[i]
      if (err || !value) continue

      try {
        const alert = JSON.parse(value)
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
    const alertKey = `${ALERTS_PREFIX}{app:${applicationId}}:pod:${podId}:${timestampStr}`

    const alertStr = JSON.stringify(alertWithTimestamp)
    await this.valkey.set(alertKey, alertStr, 'EX', this.alertRetention)
  }

  async getAlertsByApplicationId (applicationId, timeWindow = 0) {
    if (!applicationId) {
      return []
    }

    const pattern = `${ALERTS_PREFIX}{app:${applicationId}}:pod:*`
    return this.#getAlertsByPattern(pattern, timeWindow)
  }

  async getAlertsByPodId (podId, timeWindow = 0) {
    if (!podId) {
      return []
    }

    const pattern = `${ALERTS_PREFIX}{app:*}:pod:${podId}:*`
    return this.#getAlertsByPattern(pattern, timeWindow)
  }

  async loadPerfHistory (applicationId) {
    try {
      const key = `${PERF_HISTORY_PREFIX}${applicationId}`
      const historyStr = await this.valkey.get(key)
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
      await this.valkey.set(key, JSON.stringify(history))
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to save performance history')
    }
  }

  async addPerfHistoryEvent (applicationId, event, maxHistoryEvents = 10) {
    const history = await this.loadPerfHistory(applicationId)
    history.push(event)

    history.sort((a, b) => b.timestamp - a.timestamp)

    if (history.length > maxHistoryEvents) {
      history.length = maxHistoryEvents
    }

    await this.savePerfHistory(applicationId, history)
    return history
  }

  async loadClusters (applicationId) {
    try {
      const key = `${CLUSTERS_PREFIX}${applicationId}`
      const clustersStr = await this.valkey.get(key)
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
      await this.valkey.set(key, JSON.stringify(clusters))
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to save clusters')
    }
  }

  async getLastScalingTime (applicationId) {
    try {
      const key = `${LAST_SCALING_PREFIX}${applicationId}`
      const timeStr = await this.valkey.get(key)
      return timeStr ? Number(timeStr) : 0
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to get last scaling time')
      return 0
    }
  }

  async saveLastScalingTime (applicationId, time) {
    try {
      const key = `${LAST_SCALING_PREFIX}${applicationId}`
      await this.valkey.set(key, time.toString())
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to save last scaling time')
    }
  }

  async savePredictions (predictions) {
    try {
      const key = `${PREDICTIONS_PREFIX}all`
      const sortedPredictions = [...predictions]
        .filter(p => p.applicationId)
        .sort((a, b) => a.absoluteTime - b.absoluteTime)
      await this.valkey.set(key, JSON.stringify(sortedPredictions))
    } catch (err) {
      this.log.error({ err }, 'Failed to save predictions')
    }
  }

  async getPredictions () {
    try {
      const key = `${PREDICTIONS_PREFIX}all`
      const predictionsStr = await this.valkey.get(key)
      if (!predictionsStr) {
        return []
      }
      return JSON.parse(predictionsStr)
    } catch (err) {
      this.log.error({ err }, 'Failed to get predictions')
      return []
    }
  }

  async getApplicationPredictions (applicationId) {
    const allPredictions = await this.getPredictions()
    return allPredictions.filter(p => p.applicationId === applicationId)
  }

  async getNextPrediction () {
    const predictions = await this.getPredictions()
    return predictions.length > 0 ? predictions[0] : null
  }

  async removePrediction (predictionToRemove) {
    try {
      const predictions = await this.getPredictions()
      const filteredPredictions = predictions.filter(p =>
        !(p.applicationId === predictionToRemove.applicationId &&
          p.absoluteTime === predictionToRemove.absoluteTime &&
          p.action === predictionToRemove.action &&
          p.pods === predictionToRemove.pods)
      )
      await this.savePredictions(filteredPredictions)
      return filteredPredictions
    } catch (err) {
      this.log.error({ err, predictionToRemove }, 'Failed to remove prediction')
      return []
    }
  }

  async replaceApplicationPredictions (applicationId, newPredictions) {
    try {
      const allPredictions = await this.getPredictions()
      const otherPredictions = allPredictions.filter(p => p.applicationId !== applicationId)
      const predictionsWithAppId = newPredictions.map(p => ({ ...p, applicationId }))
      const combined = [...otherPredictions, ...predictionsWithAppId]
      await this.savePredictions(combined)
      return combined
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to replace application predictions')
      return []
    }
  }
}

module.exports = Store
