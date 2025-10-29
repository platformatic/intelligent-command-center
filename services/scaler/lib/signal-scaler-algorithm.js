'use strict'

const { scanKeys } = require('../../../lib/redis-utils')

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
    this.SCALE_UP_SW_RATE_THRESHOLD = options.SCALE_UP_SW_RATE_THRESHOLD || 0.1
    this.SCALE_UP_VELOCITY_THRESHOLD = options.SCALE_UP_VELOCITY_THRESHOLD || 0.02
    this.SCALE_DOWN_SW_RATE_THRESHOLD = options.SCALE_DOWN_SW_RATE_THRESHOLD || 0.01
    this.SCALE_DOWN_LW_RATE_THRESHOLD = options.SCALE_DOWN_LW_RATE_THRESHOLD || 0.004

    this.minPodsDefault = options.minPodsDefault || 1
    this.maxPodsDefault = options.maxPodsDefault || 10
  }

  async storeSignalEvent (applicationId, podId, signals, timestamp = Date.now()) {
    const eventKey = `reactive:events:app:${applicationId}:pod:${podId}:${timestamp}`
    const signalCount = Object.keys(signals).length

    const maxRetention = Math.ceil(this.LW / 1000)
    const newCount = await this.store.valkey.incrby(eventKey, signalCount)

    if (newCount === signalCount) {
      // Key was newly created, set expiration
      await this.store.valkey.expire(eventKey, maxRetention)
    }

    this.log.debug({
      applicationId,
      podId,
      signalCount,
      timestamp,
      totalCount: newCount
    }, 'Stored signal event')
  }

  async getAllEventsGroupedByWindows (applicationId, now = Date.now()) {
    const pattern = `reactive:events:app:${applicationId}:pod:*`
    const allKeys = await scanKeys(this.store.valkey, pattern, 100)

    const eventsFW = []
    const eventsSW = []
    const eventsLW = []

    for (const key of allKeys) {
      const parts = key.split(':')
      const timestamp = parseInt(parts[parts.length - 1])

      if (isNaN(timestamp)) {
        this.log.warn({ key }, 'Invalid timestamp in key')
        continue
      }

      const age = now - timestamp
      const podId = parts[parts.length - 2]
      const event = { podId, timestamp }

      if (age <= this.FW) {
        eventsFW.push(event)
      }
      if (age <= this.SW) {
        eventsSW.push(event)
      }
      if (age <= this.LW) {
        eventsLW.push(event)
      }
    }

    return { eventsFW, eventsSW, eventsLW }
  }

  calculateRatePerPod (events, windowMs, podId) {
    const podEvents = events.filter(e => e.podId === podId)
    const count = podEvents.length
    const rate = count / (windowMs / 1000)
    return rate
  }

  calculateStats (events, podsCount, windowMs) {
    const podIds = [...new Set(events.map(e => e.podId))]

    if (podIds.length === 0) {
      return {
        podCount: 0,
        rates: {},
        avgRate: 0,
        maxRate: 0
      }
    }

    const rates = {}
    for (const podId of podIds) {
      rates[podId] = this.calculateRatePerPod(events, windowMs, podId)
    }

    const rateValues = Object.values(rates)
    const avgRate = rateValues.reduce((sum, r) => sum + r, 0) / podsCount
    const maxRate = Math.max(...rateValues)

    return { rates, avgRate, maxRate }
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

  async calculateScalingDecision (applicationId, currentPodCount, minPods, maxPods, applicationName = null) {
    const cooldown = await this.getCooldownInfo(applicationId)
    const now = Date.now()

    const scaleUpAllowed = (now - cooldown.lastScaleDown) >= this.SW &&
                           (now - cooldown.lastScaleUp) >= this.SW

    const scaleDownAllowed = (now - cooldown.lastScaleDown) >= this.SW &&
                             (now - cooldown.lastScaleUp) >= this.LW

    if (!scaleUpAllowed && !scaleDownAllowed) {
      return { nfinal: currentPodCount, reason: 'Scaling blocked by cooldown' }
    }

    const minPodsValue = minPods !== undefined ? minPods : this.minPodsDefault
    const maxPodsValue = maxPods !== undefined ? maxPods : this.maxPodsDefault
    const appLabel = applicationName ? `${applicationName}: ` : ''

    const { eventsFW, eventsSW, eventsLW } = await this.getAllEventsGroupedByWindows(applicationId, now)

    const statsFW = this.calculateStats(eventsFW, currentPodCount, this.FW)
    const statsSW = this.calculateStats(eventsSW, currentPodCount, this.SW)
    const statsLW = this.calculateStats(eventsLW, currentPodCount, this.LW)

    const velocity = statsFW.avgRate - statsSW.avgRate

    this.log.debug({
      applicationId,
      currentPodCount,
      fw: { count: eventsFW.length, avgRate: statsFW.avgRate, maxRate: statsFW.maxRate },
      sw: { count: eventsSW.length, avgRate: statsSW.avgRate, maxRate: statsSW.maxRate },
      lw: { count: eventsLW.length, avgRate: statsLW.avgRate, maxRate: statsLW.maxRate },
      velocity
    }, 'Calculated scaling statistics')

    if (scaleUpAllowed) {
      const hotspotScaleUp = statsFW.maxRate > this.HOT_RATE_THRESHOLD
      const breadthScaleUp = statsFW.avgRate > this.SCALE_UP_FW_RATE_THRESHOLD &&
                          statsSW.avgRate > this.SCALE_UP_SW_RATE_THRESHOLD &&
                          velocity > this.SCALE_UP_VELOCITY_THRESHOLD

      const scaleUpNeeded = hotspotScaleUp || breadthScaleUp

      if (scaleUpNeeded) {
        const scaleUpAmount = breadthScaleUp ? Math.ceil(currentPodCount / 2) : 1
        const newPodCount = Math.min(currentPodCount + scaleUpAmount, maxPodsValue)

        if (newPodCount > currentPodCount) {
          await this.setCooldown(applicationId, 'scaleup', now)

          const reason = hotspotScaleUp
            ? `Scaling up ${appLabel}Hotspot detected (max rate ${statsFW.maxRate.toFixed(3)} > ${this.HOT_RATE_THRESHOLD})`
            : `Scaling up ${appLabel}Breadth scaling (FW rate ${statsFW.avgRate.toFixed(3)}, SW rate ${statsSW.avgRate.toFixed(3)}, velocity ${velocity.toFixed(3)})`

          this.log.info({
            applicationId,
            from: currentPodCount,
            to: newPodCount,
            scaleUpAmount,
            reason
          }, 'Scaling up')

          return { nfinal: newPodCount, reason }
        }

        return {
          nfinal: currentPodCount,
          reason: 'Already at maximum pod count'
        }
      }
    }

    if (scaleDownAllowed) {
      const scaleDownNeeded = eventsFW.length === 0 &&
                           statsSW.avgRate <= this.SCALE_DOWN_SW_RATE_THRESHOLD &&
                           statsLW.avgRate <= this.SCALE_DOWN_LW_RATE_THRESHOLD

      if (scaleDownNeeded && currentPodCount > minPodsValue) {
        const newPodCount = currentPodCount - 1

        await this.setCooldown(applicationId, 'scaledown', now)

        const reason = `Scaling down ${appLabel}Low utilization (FW events: 0, SW rate ${statsSW.avgRate.toFixed(3)}, LW rate ${statsLW.avgRate.toFixed(3)})`

        this.log.info({
          applicationId,
          from: currentPodCount,
          to: newPodCount,
          reason
        }, 'Scaling down')

        return { nfinal: newPodCount, reason }
      }
    }

    return {
      nfinal: currentPodCount,
      reason: 'No scaling needed or blocked by cooldown'
    }
  }
}

module.exports = SignalScalerAlgorithm
