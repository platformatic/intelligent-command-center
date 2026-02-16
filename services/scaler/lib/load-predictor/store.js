'use strict'

const Valkey = require('iovalkey')

class AlgorithmStore {
  #client

  constructor (valkeyConfig) {
    this.#client = new Valkey({
      host: valkeyConfig.host,
      port: valkeyConfig.port,
      password: valkeyConfig.password,
      tls: valkeyConfig.tls ? {} : undefined,
      keyPrefix: valkeyConfig.keyPrefix || ''
    })
  }

  // --- Aligned values ---

  async setAlignedValues (appId, serviceId, instanceId, metric, aligned, windowMs) {
    if (aligned.length === 0) return

    const valuesKey = `${appId}:${serviceId}:${instanceId}:${metric}:aligned`

    const firstAlignedTs = aligned[0].timestamp
    await this.#slidingWindowSet(valuesKey, firstAlignedTs, windowMs, aligned)
    await this.#client.pexpire(valuesKey, windowMs)
  }

  async getAlignedValues (appId, serviceId, metric, startTimestamp, instanceIds) {
    if (instanceIds.length === 0) return []

    const results = await Promise.all(
      instanceIds.map(instanceId =>
        this.#slidingWindowGet(`${appId}:${serviceId}:${instanceId}:${metric}:aligned`, startTimestamp)
      )
    )

    const byTimestamp = {}
    for (let i = 0; i < instanceIds.length; i++) {
      const instanceId = instanceIds[i]
      const entries = results[i]
      for (const { timestamp, value } of entries) {
        if (!byTimestamp[timestamp]) {
          byTimestamp[timestamp] = { instances: {}, count: 0 }
        }
        byTimestamp[timestamp].instances[instanceId] = Number(value)
        byTimestamp[timestamp].count++
      }
    }

    const timestamps = Object.keys(byTimestamp).map(Number).sort((a, b) => a - b)
    const stateByTimestamp = new Array(timestamps.length)
    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i]
      stateByTimestamp[i] = { timestamp: ts, aligned: byTimestamp[ts] }
    }
    return stateByTimestamp
  }

  // --- Instance metric samples ---

  async setLastInstanceMetricSample (appId, serviceId, instanceId, metric, sample, windowMs) {
    const key = `${appId}:${serviceId}:${instanceId}:${metric}:last-sample`
    await this.#client.set(key, `${sample.timestamp}:${sample.value}`, 'PX', windowMs)
  }

  async getLastInstanceMetricSample (appId, serviceId, instanceId, metric) {
    const key = `${appId}:${serviceId}:${instanceId}:${metric}:last-sample`
    const value = await this.#client.get(key)
    if (value === null) return null

    const colonIndex = value.indexOf(':')
    return {
      timestamp: Number(value.slice(0, colonIndex)),
      value: Number(value.slice(colonIndex + 1))
    }
  }

  // --- Processing timestamps ---

  async addBatchStart (appId, serviceId, imageId, metric, timestamp) {
    const key = `${appId}:${serviceId}:${imageId}:${metric}:pending-batches-start-timestamp`
    await this.#client.zadd(key, timestamp, String(timestamp))
  }

  async getFirstBatchStart (appId, serviceId, imageId, metric) {
    const key = `${appId}:${serviceId}:${imageId}:${metric}:pending-batches-start-timestamp`
    const members = await this.#client.zrange(key, 0, 0)

    if (members.length === 0) return null
    return Number(members[0])
  }

  async clearProcessedBatches (appId, serviceId, imageId, metric, upToTimestamp) {
    const key = `${appId}:${serviceId}:${imageId}:${metric}:pending-batches-start-timestamp`
    await this.#client.zremrangebyscore(key, '-inf', upToTimestamp)
  }

  async getLastProcessedTimestamp (appId, serviceId, imageId, metric) {
    const key = `${appId}:${serviceId}:${imageId}:${metric}:last-processed-timestamp`
    const value = await this.#client.get(key)
    if (value === null) return null
    return Number(value)
  }

  // --- States (reconstruction + redistribution + holt) ---

  async getState (appId, serviceId, imageId, metric, timestamp) {
    const key = `${appId}:${serviceId}:${imageId}:${metric}:states`
    const data = await this.#slidingWindowGet(key, timestamp, timestamp)

    if (data.length === 0) return null

    const parts = data[0].value.split(':')
    return {
      timestamp: data[0].timestamp,
      rawSum: Number(parts[0]),
      prevSum: Number(parts[1]),
      count: Number(parts[2]),
      level: Number(parts[3]),
      trend: Number(parts[4])
    }
  }

  // --- States (pipeline results for bootstrap continuity) ---

  async saveStates (appId, serviceId, imageId, metric, stateByTimestamp, startTimestamp, lastProcessedTimestamp, windowMs) {
    const statesKey = `${appId}:${serviceId}:${imageId}:${metric}:states`
    const lastProcessedKey = `${appId}:${serviceId}:${imageId}:${metric}:last-processed-timestamp`

    const entries = []
    for (let i = 0; i < stateByTimestamp.length; i++) {
      const entry = stateByTimestamp[i]
      if (!entry.reconstruction || !entry.redistribution || !entry.holt) continue

      const ts = entry.timestamp
      const rec = entry.reconstruction
      const red = entry.redistribution
      const holt = entry.holt

      const value = `${rec.rawSum}:${red.prevSum}:${red.count}:${holt.level}:${holt.trend}`
      entries.push({ timestamp: ts, value })
    }

    if (entries.length === 0) return

    await Promise.all([
      this.#slidingWindowSet(statesKey, startTimestamp, windowMs, entries),
      this.#client.psetex(lastProcessedKey, windowMs, String(lastProcessedTimestamp))
    ])
  }

  // --- Snapshot history ---

  async saveHistory (appId, serviceId, imageId, metric, stateByTimestamp, startTimestamp, windowMs, debug = false) {
    const historyKey = `${appId}:${serviceId}:${imageId}:${metric}:history`

    const entries = []
    for (let i = 0; i < stateByTimestamp.length; i++) {
      const entry = stateByTimestamp[i]
      if (!entry.reconstruction || !entry.redistribution || !entry.holt) continue

      const ts = entry.timestamp
      const rec = entry.reconstruction
      const red = entry.redistribution
      const holt = entry.holt
      const avg = holt.value / red.count

      let value = `${avg}:${rec.podsCount}`
      if (debug) {
        value += `:${red.value}:${red.count}:${holt.value}`
      }
      entries.push({ timestamp: ts, value })
    }

    if (entries.length === 0) return

    await this.#slidingWindowSet(historyKey, startTimestamp, windowMs, entries)
  }

  // --- History retrieval ---

  async getHistory (appId, serviceId, imageId, metric) {
    const key = `${appId}:${serviceId}:${imageId}:${metric}:history`
    const data = await this.#slidingWindowGet(key, 0)

    const result = new Array(data.length)
    for (let i = 0; i < data.length; i++) {
      const parts = data[i].value.split(':')
      const point = {
        timestamp: data[i].timestamp,
        avg: Number(parts[0]),
        podsCount: Number(parts[1])
      }
      if (parts.length === 5) {
        // Debug format: avg:podsCount:stableSum:stablePodsCount:smoothedSum
        point.stableSum = Number(parts[2])
        point.stablePodsCount = Number(parts[3])
        point.smoothedSum = Number(parts[4])
      }
      result[i] = point
    }
    return result
  }

  // --- Instances state ---
  // Hash: instanceId → podId:imageId:startTime:endTime:lastSeen

  #serializeInstance (podId, imageId, startTime, endTime, lastSeen) {
    return `${podId}:${imageId}:${startTime}:${endTime}:${lastSeen}`
  }

  #parseInstance (str) {
    const [podId, imageId, startTime, endTime, lastSeen] = str.split(':')
    return {
      podId,
      imageId,
      startTime: Number(startTime),
      endTime: Number(endTime),
      lastSeen: Number(lastSeen)
    }
  }

  async getInstance (appId, instanceId) {
    const key = `${appId}:instances`
    const value = await this.#client.hget(key, instanceId)
    if (!value) return null
    return this.#parseInstance(value)
  }

  async setInstance (appId, imageId, podId, instanceId, startTime, endTime, lastSeen) {
    const key = `${appId}:instances`
    const value = this.#serializeInstance(podId, imageId, startTime, endTime, lastSeen)
    await this.#client.hset(key, instanceId, value)
  }

  async getAllInstances (appId) {
    const key = `${appId}:instances`
    const data = await this.#client.hgetall(key)
    if (!data) return {}

    const instances = {}
    for (const [instanceId, value] of Object.entries(data)) {
      instances[instanceId] = this.#parseInstance(value)
    }
    return instances
  }

  async deleteInstances (appId, instanceIds) {
    if (instanceIds.length === 0) return
    const key = `${appId}:instances`
    await this.#client.hdel(key, ...instanceIds)
  }

  async setTargetPodsCount (appId, target) {
    await this.#client.set(`${appId}:current-pods-target`, String(target))
  }

  async getTargetPodsCount (appId) {
    const value = await this.#client.get(`${appId}:current-pods-target`)
    return value ? Number(value) : null
  }

  async setLastScaleUpTime (appId, timestamp) {
    await this.#client.set(`${appId}:last-scale-up-time`, String(timestamp))
  }

  async setLastScaleDownTime (appId, timestamp) {
    await this.#client.set(`${appId}:last-scale-down-time`, String(timestamp))
  }

  async addPendingScaleUp (appId, scaleUpCount, scaleAt, decisionAt) {
    const key = `${appId}:pending-scale-ups`
    const args = new Array(scaleUpCount * 2)
    for (let i = 0; i < scaleUpCount; i++) {
      args[i * 2] = scaleAt
      args[i * 2 + 1] = `${scaleAt}:${decisionAt}:${i + 1}`
    }
    await this.#client.zadd(key, ...args)
  }

  async removePendingScaleUp (appId) {
    const key = `${appId}:pending-scale-ups`
    const result = await this.#client.zpopmin(key)
    if (result.length === 0) return null
    const member = result[0]
    const firstColon = member.indexOf(':')
    const secondColon = member.indexOf(':', firstColon + 1)
    return {
      scaleAt: Number(member.slice(0, firstColon)),
      decisionAt: Number(member.slice(firstColon + 1, secondColon))
    }
  }

  async hasPendingScaleUps (appId, now, windowMs) {
    const key = `${appId}:pending-scale-ups`
    const cutoff = now - windowMs

    const results = await this.#client.pipeline()
      .zremrangebyscore(key, '-inf', `(${cutoff}`)
      .zcard(key)
      .exec()

    return results[1][1] > 0
  }

  async getPendingScaleUps (appId, now, windowMs) {
    const key = `${appId}:pending-scale-ups`
    const cutoff = now - windowMs

    const results = await this.#client.pipeline()
      .zremrangebyscore(key, '-inf', `(${cutoff}`)
      .zrangebyscore(key, '-inf', '+inf')
      .exec()

    const items = results[1][1]
    const result = new Array(items.length)

    for (let i = 0; i < items.length; i++) {
      const colonIndex = items[i].indexOf(':')
      result[i] = { scaleAt: Number(items[i].slice(0, colonIndex)) }
    }

    return result
  }

  async getLastScaleUpTime (appId) {
    const value = await this.#client.get(`${appId}:last-scale-up-time`)
    return value ? Number(value) : 0
  }

  async getLastScaleDownTime (appId) {
    const value = await this.#client.get(`${appId}:last-scale-down-time`)
    return value ? Number(value) : 0
  }

  async setLastInstanceStartTime (appId, timestamp) {
    await this.#client.set(`${appId}:last-instance-start-time`, String(timestamp))
  }

  async getLastInstanceStartTime (appId) {
    const value = await this.#client.get(`${appId}:last-instance-start-time`)
    return value ? Number(value) : 0
  }

  async getInitTimeout (appId) {
    const value = await this.#client.get(`${appId}:init-timeout`)
    return value ? Number(value) : null
  }

  async setInitTimeout (appId, ms) {
    await this.#client.set(`${appId}:init-timeout`, String(ms))
  }

  async addInitTimeoutMeasurment (appId, measurement, windowSize) {
    const key = `${appId}:init-timeout-window`
    const results = await this.#client.pipeline()
      .lpush(key, String(measurement))
      .ltrim(key, 0, windowSize - 1)
      .lrange(key, 0, -1)
      .exec()
    return results[2][1].map(Number)
  }

  // --- Metric Snapshots ---

  async saveMetricPrediction (appId, serviceId, imageId, metric, data, windowMs) {
    const key = `${appId}:${serviceId}:${imageId}:${metric}:metric-prediction`
    await this.#client.psetex(key, windowMs, JSON.stringify(data))
  }

  async getMetricPrediction (appId, serviceId, imageId, metric) {
    const key = `${appId}:${serviceId}:${imageId}:${metric}:metric-prediction`
    const data = await this.#client.get(key)
    if (data === null) return null
    return JSON.parse(data)
  }

  // --- Scaling Events ---
  // WARNING: In production, scaling events should be stored in a database.
  // This Valkey-based implementation is for development/testing only.

  async saveScalingEvent (appId, timestamp, data) {
    const id = String(timestamp)
    const indexKey = `${appId}:scaling-events`
    const dataKey = `${appId}:scaling-event:${id}`

    await this.#client.pipeline()
      .set(dataKey, JSON.stringify(data), 'PX', 600000)
      .zadd(indexKey, id, id)
      .exec()
  }

  async getScalingEvents (appId) {
    const indexKey = `${appId}:scaling-events`
    return this.#client.zrevrange(indexKey, 0, -1)
  }

  async getScalingEvent (appId, id) {
    const dataKey = `${appId}:scaling-event:${id}`
    const data = await this.#client.get(dataKey)
    if (data === null) return null
    return JSON.parse(data)
  }

  // --- Services ---

  async addService (appId, imageId, serviceId) {
    const key = `${appId}:${imageId}:services`
    await this.#client.pipeline()
      .sadd(key, serviceId)
      .pexpire(key, 1800000)
      .exec()
  }

  async getServices (appId, imageId) {
    const key = `${appId}:${imageId}:services`
    return this.#client.smembers(key)
  }

  // --- App/Service Config ---

  #appConfigsKey = 'app-configs'
  #svcConfigsKey = 'svc-configs'

  async setAppConfig (appId, config) {
    await this.#client.hset(this.#appConfigsKey, appId, JSON.stringify(config))
  }

  async getAppConfig (appId) {
    const data = await this.#client.hget(this.#appConfigsKey, appId)
    if (data === null) return null
    return JSON.parse(data)
  }

  async setServiceConfig (appId, serviceId, config) {
    const field = `${appId}:${serviceId}`
    await this.#client.hset(this.#svcConfigsKey, field, JSON.stringify(config))
  }

  async getServiceConfig (appId, serviceId) {
    const field = `${appId}:${serviceId}`
    const data = await this.#client.hget(this.#svcConfigsKey, field)
    if (data === null) return null
    return JSON.parse(data)
  }

  async deleteAllConfigs () {
    await this.#client.del(this.#appConfigsKey, this.#svcConfigsKey)
  }

  async saveServiceMetricThreshold (appId, serviceId, metricName, threshold) {
    const key = `${appId}:${serviceId}:${metricName}:threshold`
    await this.#client.set(key, String(threshold))
  }

  async getServiceMetricThreshold (appId, serviceId, metricName) {
    const key = `${appId}:${serviceId}:${metricName}:threshold`
    const data = await this.#client.get(key)
    if (data === null) return null
    return Number(data)
  }

  async close () {
    await this.#client.quit()
  }

  // --- Sliding window abstraction (private) ---

  async #slidingWindowSet (key, startTimestamp, windowMs, entries) {
    if (entries.length === 0) return

    const now = Date.now()
    const cutoff = now - windowMs

    const n = entries.length
    const args = new Array(n * 2)

    for (let i = 0; i < n; i++) {
      const entry = entries[i]
      const timestamp = entry.timestamp
      const value = entry.value

      const j = i * 2
      args[j] = timestamp
      args[j + 1] = `${timestamp}:${value}`
    }

    await this.#client.pipeline()
      .zremrangebyscore(key, '-inf', cutoff)
      .zremrangebyscore(key, startTimestamp, '+inf')
      .zadd(key, ...args)
      .exec()
  }

  async #slidingWindowGet (key, startTimestamp, endTimestamp = '+inf') {
    const members = await this.#client.zrangebyscore(
      key,
      startTimestamp,
      endTimestamp
    )

    const result = new Array(members.length)
    for (let i = 0; i < members.length; i++) {
      const colonIndex = members[i].indexOf(':')
      const timestamp = Number(members[i].slice(0, colonIndex))
      const value = members[i].slice(colonIndex + 1)
      result[i] = { timestamp, value }
    }
    return result
  }
}

module.exports = { AlgorithmStore }
