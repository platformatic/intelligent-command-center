'use strict'

const { randomUUID } = require('node:crypto')

class SignalScalerAlgorithm {
  constructor (app, options = {}) {
    this.app = app
    this.store = app.store
    this.log = app.log

    this.FW = options.FW || 15000
    this.SW = options.SW || 60000
    this.LW = options.LW || 300000

    this.HOT_RATE_THRESHOLD = options.HOT_RATE_THRESHOLD || 0.5
    this.SCALE_UP_FW_RATE_THRESHOLD = options.SCALE_UP_FW_RATE_THRESHOLD || 0.2
    this.SCALE_UP_SW_RATE_THRESHOLD = options.SCALE_UP_SW_RATE_THRESHOLD || 0.15
    this.SCALE_DOWN_SW_RATE_THRESHOLD = options.SCALE_DOWN_SW_RATE_THRESHOLD || 0.05
    this.SCALE_DOWN_LW_RATE_THRESHOLD = options.SCALE_DOWN_LW_RATE_THRESHOLD || 0.03

    this.minPodsDefault = options.minPodsDefault || 1
    this.maxPodsDefault = options.maxPodsDefault || 10
  }

  async storeSignals (applicationId, podId, signals) {
    const promises = []
    for (const signal of signals) {
      const promise = this.storeSignal(applicationId, podId, signal)
      promises.push(promise)
    }
    await Promise.all(promises)
  }

  async storeSignal (applicationId, podId, signal) {
    const signalId = randomUUID()
    const signalKey = this.#serializeSignalKey({ applicationId, podId, signalId })

    const maxRetention = Math.ceil(this.LW / 1000)

    await this.store.valkey.hset(signalKey, 'type', signal.type)
    await this.store.valkey.hset(signalKey, 'value', signal.value)
    await this.store.valkey.hset(signalKey, 'level', signal.level ?? 'normal')
    await this.store.valkey.hset(signalKey, 'timestamp', signal.timestamp)
    await this.store.valkey.expire(signalKey, maxRetention)

    this.log.debug({ applicationId, podId, signal }, 'Stored signal')
  }

  async getAppPodsSignals (applicationId) {
    const podsSignals = {}

    const pattern = `reactive:signals:app:${applicationId}:pod:*`
    await this.#scanByPattern(pattern, async (keys) => {
      const promises = new Array(keys.length)
      for (let i = 0; i < keys.length; i++) {
        promises[i] = this.store.valkey.hgetall(keys[i])
      }
      const signals = await Promise.all(promises)

      for (let i = 0; i < keys.length; i++) {
        const { id, podId } = this.#parseSignalKey(keys[i])

        const signal = signals[i]
        if (signal) {
          podsSignals[podId] ??= []
          podsSignals[podId].push({ id, podId, ...signal })
        }
      }
    })

    return podsSignals
  }

  calculateStats (podsSignals, podsCount, now = Date.now()) {
    const nowSec = Math.floor(now / 1000) * 1000

    const timeWindows = {
      FW: this.FW,
      SW: this.SW,
      LW: this.LW
    }

    const stats = {}

    for (const timeWindow in timeWindows) {
      stats[timeWindow] = {
        eventRates: {},
        avgEventRate: 0,
        maxEventRate: 0,
        maxEventRatePodId: null,
        events: new Set(),
        eventsCount: 0,
        signals: [],
        signalsByPod: {},
        signalsByLevel: {
          normal: [],
          critical: []
        }
      }
    }

    for (const podId in podsSignals) {
      const podSignals = podsSignals[podId]

      const podEventsByWindow = {}
      for (const timeWindow in timeWindows) {
        podEventsByWindow[timeWindow] = new Set()
      }

      for (const signal of podSignals) {
        const timestamp = parseInt(signal.timestamp)
        if (isNaN(timestamp)) {
          this.log.warn({ signal }, 'Invalid timestamp in signal')
          continue
        }

        const timestampInSeconds = Math.floor(timestamp / 1000) * 1000
        const age = nowSec - timestampInSeconds

        for (const timeWindow in timeWindows) {
          if (age < timeWindows[timeWindow]) {
            stats[timeWindow].events.add(timestampInSeconds)
            podEventsByWindow[timeWindow].add(timestampInSeconds)
            stats[timeWindow].signals.push(signal)

            stats[timeWindow].signalsByPod[podId] ??= []
            stats[timeWindow].signalsByPod[podId].push(signal)

            const signalLevel = signal.level ?? 'normal'
            stats[timeWindow].signalsByLevel[signalLevel] ??= []
            stats[timeWindow].signalsByLevel[signalLevel].push(signal)
          }
        }
      }

      for (const timeWindow in timeWindows) {
        const timeWindowSeconds = timeWindows[timeWindow] / 1000

        const podEvents = podEventsByWindow[timeWindow]
        const podEventsCount = podEvents.size
        const podEventsRate = podEventsCount / timeWindowSeconds

        stats[timeWindow].eventRates[podId] = podEventsRate
        stats[timeWindow].avgEventRate += podEventsRate

        if (podEventsRate > stats[timeWindow].maxEventRate) {
          stats[timeWindow].maxEventRate = podEventsRate
          stats[timeWindow].maxEventRatePodId = podId
        }
      }
    }

    for (const timeWindow in timeWindows) {
      stats[timeWindow].avgEventRate /= podsCount
      stats[timeWindow].eventsCount = stats[timeWindow].events.size
      delete stats[timeWindow].events
    }

    return {
      statsFW: stats.FW,
      statsSW: stats.SW,
      statsLW: stats.LW
    }
  }

  async getCooldownInfo (applicationId) {
    const lastScaleUpKey = `reactive:cooldown:scaleup:${applicationId}`
    const lastScaleDownKey = `reactive:cooldown:scaledown:${applicationId}`

    const lastScaleUpStr = await this.store.valkey.get(lastScaleUpKey)
    const lastScaleDownStr = await this.store.valkey.get(lastScaleDownKey)

    return {
      lastScaleUp: lastScaleUpStr ? parseInt(lastScaleUpStr) : 0,
      lastScaleDown: lastScaleDownStr ? parseInt(lastScaleDownStr) : 0
    }
  }

  async setCooldown (applicationId, action, timestamp) {
    const key = `reactive:cooldown:${action}:${applicationId}`
    const retention = Math.ceil(this.SW / 1000) + 10
    await this.store.valkey.set(key, timestamp.toString(), 'EX', retention)
  }

  async calculateScalingDecision (applicationId, currentPodCount, minPods, maxPods) {
    const cooldown = await this.getCooldownInfo(applicationId)
    const now = Date.now()

    const scaleUpAllowed = (now - cooldown.lastScaleDown) >= this.SW &&
                           (now - cooldown.lastScaleUp) >= this.SW

    const scaleDownAllowed = (now - cooldown.lastScaleDown) >= this.SW &&
                             (now - cooldown.lastScaleUp) >= this.SW

    if (!scaleUpAllowed && !scaleDownAllowed) {
      return {
        nfinal: currentPodCount,
        reason: 'Scaling blocked by cooldown',
        signals: []
      }
    }

    const minPodsValue = minPods !== undefined ? minPods : this.minPodsDefault
    const maxPodsValue = maxPods !== undefined ? maxPods : this.maxPodsDefault

    const appPodsSignals = await this.getAppPodsSignals(applicationId)
    const { statsFW, statsSW, statsLW } = this.calculateStats(appPodsSignals, currentPodCount)

    this.log.debug({
      applicationId,
      currentPodCount,
      fw: statsFW,
      sw: statsSW,
      lw: statsLW
    }, 'Calculated scaling statistics')

    if (scaleUpAllowed) {
      const criticalSignals = statsFW.signalsByLevel.critical.length > 0
      const hotspotScaleUp = statsFW.maxEventRate > this.HOT_RATE_THRESHOLD
      const breadthScaleUp = statsFW.avgEventRate > this.SCALE_UP_FW_RATE_THRESHOLD &&
                             statsSW.avgEventRate > this.SCALE_UP_SW_RATE_THRESHOLD

      const scaleUpNeeded = hotspotScaleUp || breadthScaleUp || criticalSignals

      if (scaleUpNeeded) {
        let scaleUpAmount = breadthScaleUp ? Math.ceil(currentPodCount / 2) : 1
        let reason = null
        let triggeredSignals = null

        if (breadthScaleUp) {
          scaleUpAmount = Math.ceil(currentPodCount / 2)
          triggeredSignals = statsFW.signals
          reason = `Received ${triggeredSignals.length} signals from multiple pods for ${this.FW / 1000} seconds`
        } else if (criticalSignals) {
          scaleUpAmount = 1
          triggeredSignals = statsFW.signalsByLevel.critical
          reason = `Received ${triggeredSignals.length} critical signals`
        } else if (hotspotScaleUp) {
          const hotspotPodId = statsFW.maxEventRatePodId
          scaleUpAmount = 1
          triggeredSignals = statsFW.signalsByPod[hotspotPodId]
          reason = `Pod "${hotspotPodId}" sent ${triggeredSignals.length} signals for ${this.FW / 1000} seconds`
        }

        const newPodCount = Math.min(currentPodCount + scaleUpAmount, maxPodsValue)

        if (newPodCount > currentPodCount) {
          await this.setCooldown(applicationId, 'scaleup', now)

          this.log.info({
            applicationId,
            from: currentPodCount,
            to: newPodCount,
            scaleUpAmount,
            reason
          }, 'Scaling up')

          return { nfinal: newPodCount, reason, signals: triggeredSignals }
        }

        return {
          nfinal: currentPodCount,
          reason: 'Already at maximum pod count',
          signals: []
        }
      }
    }

    if (scaleDownAllowed) {
      const scaleDownNeeded = statsFW.eventsCount === 0 &&
                              statsSW.avgEventRate <= this.SCALE_DOWN_SW_RATE_THRESHOLD &&
                              statsLW.avgEventRate <= this.SCALE_DOWN_LW_RATE_THRESHOLD &&
                              statsFW.signalsByLevel.critical.length === 0 &&
                              statsSW.signalsByLevel.critical.length === 0

      if (scaleDownNeeded && currentPodCount > minPodsValue) {
        const newPodCount = currentPodCount - 1

        await this.setCooldown(applicationId, 'scaledown', now)

        const reason = 'Application signals rates are low (' +
          `${statsFW.signals.length} signals for ${this.FW / 1000} seconds, ` +
          `${statsSW.signals.length} signals for ${this.SW / 1000} seconds, ` +
          `${statsLW.signals.length} signals for ${this.LW / 1000} seconds)`

        this.log.info({
          applicationId,
          from: currentPodCount,
          to: newPodCount,
          reason
        }, 'Scaling down')

        return { nfinal: newPodCount, reason, signals: [] }
      }
    }

    return {
      nfinal: currentPodCount,
      reason: 'No scaling needed or blocked by cooldown',
      signals: []
    }
  }

  #scanByPattern (pattern, callback) {
    const stream = this.store.valkey.scanStream({ match: pattern })
    const promises = []

    return new Promise((resolve, reject) => {
      stream.on('data', (keys) => promises.push(callback(keys)))
      stream.on('end', () => Promise.all(promises).then(() => resolve(), reject))
      stream.on('error', reject)
    })
  }

  #serializeSignalKey ({ applicationId, podId, signalId }) {
    return `reactive:signals:app:${applicationId}:pod:${podId}:signal:${signalId}`
  }

  #parseSignalKey (key) {
    const parts = key.split(':')
    const id = parts.at(-1)
    const podId = parts.at(-3)
    const applicationId = parts.at(-5)
    return { id, applicationId, podId }
  }
}

module.exports = SignalScalerAlgorithm
