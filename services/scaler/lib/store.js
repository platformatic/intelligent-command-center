'use strict'

const Redis = require('iovalkey')
const { scanKeys } = require('../../../lib/redis-utils')
const {
  ALERTS_PREFIX,
  PERF_HISTORY_PREFIX,
  CLUSTERS_PREFIX,
  LAST_SCALING_PREFIX,
  SOFT_LIMITS_PREFIX,
  BUCKET_PREFIX,
  SUGGESTIONS_PREFIX,
  SUGGESTION_WINDOWS_PREFIX
} = require('./store-constants')

class Store {
  constructor (redisUrl, log, options = {}) {
    this.valkey = new Redis(redisUrl, {
      enableAutoPipelining: true
    })
    this.log = log
    this.alertRetention = options.alertRetention || 60 // 1 minutes in seconds
  }

  #scopedKey (prefix, applicationId, controllerId = null) {
    if (controllerId) {
      return `${prefix}${applicationId}:${controllerId}`
    }
    return `${prefix}${applicationId}`
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

  async loadPerfHistory (applicationId, controllerId = null) {
    try {
      const key = this.#scopedKey(PERF_HISTORY_PREFIX, applicationId, controllerId)
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

  async savePerfHistory (applicationId, history, controllerId = null) {
    try {
      const key = this.#scopedKey(PERF_HISTORY_PREFIX, applicationId, controllerId)
      await this.valkey.set(key, JSON.stringify(history))
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to save performance history')
    }
  }

  async addPerfHistoryEvent (applicationId, event, maxHistoryEvents = 10, controllerId = null) {
    const history = await this.loadPerfHistory(applicationId, controllerId)
    history.push(event)

    history.sort((a, b) => b.timestamp - a.timestamp)

    if (history.length > maxHistoryEvents) {
      history.length = maxHistoryEvents
    }

    await this.savePerfHistory(applicationId, history, controllerId)
    return history
  }

  async loadClusters (applicationId, controllerId = null) {
    try {
      const key = this.#scopedKey(CLUSTERS_PREFIX, applicationId, controllerId)
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

  async saveClusters (applicationId, clusters, controllerId = null) {
    try {
      const key = this.#scopedKey(CLUSTERS_PREFIX, applicationId, controllerId)
      await this.valkey.set(key, JSON.stringify(clusters))
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to save clusters')
    }
  }

  async getLastScalingTime (applicationId, direction, controllerId = null) {
    try {
      const key = controllerId
        ? `${LAST_SCALING_PREFIX}${applicationId}:${controllerId}:${direction}`
        : `${LAST_SCALING_PREFIX}${applicationId}:${direction}`
      const timeStr = await this.valkey.get(key)
      return timeStr ? Number(timeStr) : 0
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to get last scaling time')
      return 0
    }
  }

  async saveLastScalingTime (applicationId, time, direction, controllerId = null) {
    try {
      const key = controllerId
        ? `${LAST_SCALING_PREFIX}${applicationId}:${controllerId}:${direction}`
        : `${LAST_SCALING_PREFIX}${applicationId}:${direction}`
      await this.valkey.set(key, time.toString())
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to save last scaling time')
    }
  }

  async saveSoftLimits (applicationId, limits, ttlSeconds) {
    try {
      const key = `${SOFT_LIMITS_PREFIX}${applicationId}`
      const payload = JSON.stringify({ ...limits, computedAt: Date.now() })
      if (ttlSeconds && ttlSeconds > 0) {
        await this.valkey.set(key, payload, 'EX', Math.ceil(ttlSeconds))
      } else {
        await this.valkey.set(key, payload)
      }
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to save soft limits')
    }
  }

  async getSoftLimits (applicationId) {
    try {
      const key = `${SOFT_LIMITS_PREFIX}${applicationId}`
      const str = await this.valkey.get(key)
      return str ? JSON.parse(str) : null
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to get soft limits')
      return null
    }
  }

  async clearSoftLimits (applicationId) {
    try {
      await this.valkey.del(`${SOFT_LIMITS_PREFIX}${applicationId}`)
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to clear soft limits')
    }
  }

  // The pattern-predictor's reviewable floor suggestions (flat list + grouped runs), refreshed on
  // every updatePredictions run and read by the dashboard. One JSON blob per application.
  async saveSuggestions (applicationId, payload) {
    try {
      const key = `${SUGGESTIONS_PREFIX}${applicationId}`
      await this.valkey.set(key, JSON.stringify({ ...payload, computedAt: Date.now() }))
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to save suggestions')
    }
  }

  async getSuggestions (applicationId) {
    try {
      const str = await this.valkey.get(`${SUGGESTIONS_PREFIX}${applicationId}`)
      return str ? JSON.parse(str) : null
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to get suggestions')
      return null
    }
  }

  async clearSuggestions (applicationId) {
    try {
      await this.valkey.del(`${SUGGESTIONS_PREFIX}${applicationId}`)
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to clear suggestions')
    }
  }

  // Per-pattern time windows (observed + forecast), one JSON blob per application keyed by pattern
  // id: { [patternId]: [{ slotStart, slotEnd, pods, predicted }] }. A plain SET overwrites the whole
  // blob every updatePredictions run, so stale pattern ids from a prior run can never leak.
  async saveSuggestionWindows (applicationId, byPatternId) {
    try {
      const key = `${SUGGESTION_WINDOWS_PREFIX}${applicationId}`
      await this.valkey.set(key, JSON.stringify(byPatternId))
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to save suggestion windows')
    }
  }

  async getSuggestionWindows (applicationId) {
    try {
      const str = await this.valkey.get(`${SUGGESTION_WINDOWS_PREFIX}${applicationId}`)
      return str ? JSON.parse(str) : null
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to get suggestion windows')
      return null
    }
  }

  async clearSuggestionWindows (applicationId) {
    try {
      await this.valkey.del(`${SUGGESTION_WINDOWS_PREFIX}${applicationId}`)
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to clear suggestion windows')
    }
  }

  #bucketKeys (applicationId) {
    return {
      pointer: `${BUCKET_PREFIX}${applicationId}`,
      targets: `${BUCKET_PREFIX}${applicationId}:targets`
    }
  }

  async readBucket (applicationId) {
    try {
      const { pointer, targets } = this.#bucketKeys(applicationId)
      const pointerStr = await this.valkey.get(pointer)
      if (!pointerStr) return null
      const { slotStart, isFirst } = JSON.parse(pointerStr)
      const raw = await this.valkey.lrange(targets, 0, -1)
      const parsed = raw.map((s) => {
        const i = s.indexOf(':')
        return { ts: Number(s.slice(0, i)), value: Number(s.slice(i + 1)) }
      })
      return { slotStart, isFirst, targets: parsed }
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to read bucket')
      return null
    }
  }

  async openBucket ({ applicationId, slotStart, isFirst, seed, ttlSeconds }) {
    try {
      const { pointer, targets } = this.#bucketKeys(applicationId)
      const pipeline = this.valkey.pipeline()
      pipeline.set(pointer, JSON.stringify({ slotStart, isFirst }), 'EX', ttlSeconds)
      pipeline.del(targets)
      if (seed) {
        pipeline.rpush(targets, `${seed.ts}:${seed.value}`)
        pipeline.expire(targets, ttlSeconds)
      }
      await pipeline.exec()
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to open bucket')
    }
  }

  async appendBucketTarget ({ applicationId, ts, value, ttlSeconds }) {
    try {
      const { pointer, targets } = this.#bucketKeys(applicationId)
      const pipeline = this.valkey.pipeline()
      pipeline.rpush(targets, `${ts}:${value}`)
      pipeline.expire(targets, ttlSeconds)
      pipeline.expire(pointer, ttlSeconds)
      await pipeline.exec()
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to append bucket target')
    }
  }

  async clearBucket (applicationId) {
    try {
      const { pointer, targets } = this.#bucketKeys(applicationId)
      await this.valkey.del(pointer, targets)
    } catch (err) {
      this.log.error({ err, applicationId }, 'Failed to clear bucket')
    }
  }
}

module.exports = Store
