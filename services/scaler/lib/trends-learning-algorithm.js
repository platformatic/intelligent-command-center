'use strict'

const PerformanceHistory = require('./performance-history')

/**
 * Trends Learning Algorithm implementation.
 *
 * This algorithm analyzes historical scaling events to predict future scaling needs
 * using time-slot analysis, 3-day half-life decay, and sequence modeling.
 * It generates predictions with embedded reasons for transparency.
 */
class TrendsLearningAlgorithm {
  #lambda
  #maxHistoryEvents
  #timeSlotWindow
  #predictionWindow
  #confidenceThreshold
  #sequenceWindow
  #performanceHistory
  #log

  constructor (app, options = {}) {
    this.#log = app.log

    // Constants from mathematical specification
    this.#lambda = options.lambda || Math.log(2) / 259200 // 3-day half-life decay (2.674 × 10^-6)
    this.#maxHistoryEvents = options.maxHistoryEvents || 1000 // K_max from spec
    this.#timeSlotWindow = options.timeSlotWindow || 1800 // 30 minutes (T_slot)
    this.#predictionWindow = options.predictionWindow || 30 // ±30 seconds (W_pred)
    this.#confidenceThreshold = options.confidenceThreshold || 0.8 // π_thresh
    this.#sequenceWindow = options.sequenceWindow || 600 // 10 minutes for scale-down sequences

    this.#performanceHistory = new PerformanceHistory(app)
  }

  /**
   * Load performance history from database
   * Implements Step 1: Historical Data Extraction
   */
  async #loadPerfHistory (applicationId) {
    try {
      // Load performance history from database
      const records = await this.#performanceHistory.getPerformanceHistory({
        applicationId,
        limit: this.#maxHistoryEvents
      })

      // Convert database records to trends format
      const history = records.map(record => ({
        timestamp: record.eventTimestamp.getTime(),
        podsAdded: record.podsAdded,
        preEluMean: record.preEluMean,
        preHeapMean: record.preHeapMean,
        preEluTrend: record.preEluTrend,
        preHeapTrend: record.preHeapTrend,
        deltaElu: record.deltaElu,
        deltaHeap: record.deltaHeap,
        sigmaElu: record.sigmaElu,
        sigmaHeap: record.sigmaHeap,
        successScore: record.successScore || 0
      }))

      return history
    } catch (err) {
      this.#log.error({ err, applicationId }, 'Failed to load performance history for trends from database')
      return []
    }
  }

  /**
   * Calculate decay weight based on time difference
   * Implements the 3-day half-life decay: w_k = e^(-λ(t_now - t_k))
   */
  #calculateDecayWeight (currentTime, eventTime) {
    const timeDiff = currentTime - eventTime
    return Math.exp(-this.#lambda * timeDiff)
  }

  /**
   * Step 2: Time-Slot Analysis
   * Analyzes historical events within time slots to compute probabilities and pod counts
   *
   * @param {Array} history - Performance history events
   * @param {number} currentTime - Current timestamp in milliseconds
   * @returns {Object} Time slot analysis results
   */
  #analyzeTimeSlots (history, currentTime) {
    const currentTimeSeconds = Math.floor(currentTime / 1000)
    const slots = {}

    // Generate all possible time slots in a day
    const slotsPerDay = Math.floor(86400 / this.#timeSlotWindow)

    for (let i = 0; i < slotsPerDay; i++) {
      const slotTime = i * this.#timeSlotWindow

      // Analyze events for this time slot
      const slotEvents = history.filter(event => {
        const eventTimeOfDay = Math.floor(event.timestamp / 1000) % 86400
        const slotStart = slotTime - this.#timeSlotWindow / 2
        const slotEnd = slotTime + this.#timeSlotWindow / 2

        // Handle wraparound at midnight
        if (slotStart < 0) {
          return eventTimeOfDay >= (86400 + slotStart) || eventTimeOfDay < slotEnd
        } else if (slotEnd > 86400) {
          return eventTimeOfDay >= slotStart || eventTimeOfDay < (slotEnd - 86400)
        } else {
          return eventTimeOfDay >= slotStart && eventTimeOfDay < slotEnd
        }
      })

      // Process scale-up and scale-down events separately
      for (const action of ['up', 'down']) {
        const actionEvents = slotEvents.filter(e =>
          (action === 'up' && e.podsAdded > 0) ||
          (action === 'down' && e.podsAdded < 0)
        )

        if (actionEvents.length === 0) continue

        // Calculate weighted sums
        let weightedSuccessSum = 0
        let weightSum = 0
        let weightedPodsSum = 0
        let weightedEluSum = 0
        let weightedHeapSum = 0
        let recentCount = 0

        for (const event of actionEvents) {
          const weight = this.#calculateDecayWeight(currentTimeSeconds, event.timestamp / 1000)
          const successScore = event.successScore || 1.0 // Default to 1.0 for signal-based events

          const weightedScore = weight * successScore
          weightSum += weight
          weightedSuccessSum += weightedScore
          weightedPodsSum += Math.abs(event.podsAdded) * weightedScore
          weightedEluSum += event.preEluMean * weight
          weightedHeapSum += event.preHeapMean * weight

          // Count recent events (within 3 days)
          if (currentTimeSeconds - event.timestamp / 1000 <= 259200) {
            recentCount++
          }
        }

        // Calculate confidence and average values
        const confidence = weightedSuccessSum / (weightSum + 1)
        const avgPods = weightedPodsSum / (weightedSuccessSum + 1)
        const avgSuccess = weightedSuccessSum / (weightSum + 0.001)
        const avgElu = weightedEluSum / (weightSum + 0.001)
        const avgHeap = weightedHeapSum / (weightSum + 0.001)

        // Store results with embedded reasons
        const key = `${slotTime}_${action}`
        slots[key] = {
          timeOfDay: slotTime,
          action,
          confidence,
          pods: Math.ceil(avgPods),
          reasons: {
            event_count: actionEvents.length,
            recent_count: recentCount,
            avg_success: avgSuccess,
            avg_elu: avgElu,
            avg_heap: avgHeap
          }
        }
      }
    }

    return slots
  }

  /**
   * Step 3: Sequence Modeling
   * Models scale-down sequences that follow scale-up events
   *
   * @param {Array} history - Performance history events
   * @param {number} slotTime - Time of day for the slot
   * @param {number} currentTime - Current timestamp in milliseconds
   * @returns {Array} Sequence predictions
   */
  #modelSequences (history, slotTime, currentTime) {
    const currentTimeSeconds = Math.floor(currentTime / 1000)
    const sequences = []

    // Find scale-up events in this time slot
    const scaleUpEvents = history.filter(event => {
      if (event.podsAdded <= 0) return false

      const eventTimeOfDay = Math.floor(event.timestamp / 1000) % 86400
      const slotStart = slotTime - this.#timeSlotWindow / 2
      const slotEnd = slotTime + this.#timeSlotWindow / 2

      // Handle wraparound at midnight
      if (slotStart < 0) {
        return eventTimeOfDay >= (86400 + slotStart) || eventTimeOfDay < slotEnd
      } else if (slotEnd > 86400) {
        return eventTimeOfDay >= slotStart || eventTimeOfDay < (slotEnd - 86400)
      } else {
        return eventTimeOfDay >= slotStart && eventTimeOfDay < slotEnd
      }
    })

    // For each scale-up event, find subsequent scale-down events
    const sequenceMap = new Map() // Key: sequence index, Value: array of sequence data

    for (const upEvent of scaleUpEvents) {
      const downEvents = history.filter(event => {
        return event.podsAdded < 0 &&
               event.timestamp > upEvent.timestamp &&
               event.timestamp - upEvent.timestamp <= this.#sequenceWindow * 1000
      }).sort((a, b) => a.timestamp - b.timestamp)

      // Process each scale-down in the sequence
      downEvents.forEach((downEvent, index) => {
        if (!sequenceMap.has(index)) {
          sequenceMap.set(index, [])
        }

        const weight = this.#calculateDecayWeight(currentTimeSeconds, downEvent.timestamp / 1000)
        const successScore = downEvent.successScore || 1.0

        sequenceMap.get(index).push({
          offset: (downEvent.timestamp - upEvent.timestamp) / 1000, // Convert to seconds
          pods: Math.abs(downEvent.podsAdded),
          weight: weight * successScore
        })
      })
    }

    // Calculate average offset and pods for each sequence position
    for (const [index, sequenceData] of sequenceMap.entries()) {
      if (sequenceData.length === 0) continue

      const totalWeight = sequenceData.reduce((sum, s) => sum + s.weight, 0)
      const avgOffset = sequenceData.reduce((sum, s) => sum + s.offset * s.weight, 0) / totalWeight
      const avgPods = sequenceData.reduce((sum, s) => sum + s.pods * s.weight, 0) / totalWeight

      sequences.push({
        sequenceIndex: index,
        offset: Math.round(avgOffset),
        pods: Math.ceil(avgPods),
        reasons: {
          seq_count: sequenceData.length,
          avg_offset: avgOffset,
          avg_pods: avgPods
        }
      })
    }

    return sequences.sort((a, b) => a.offset - b.offset)
  }

  /**
   * Step 5: Prediction Generation
   * Generates the final prediction schedule
   *
   * @param {Object} timeSlotAnalysis - Results from time slot analysis
   * @param {Array} history - Performance history
   * @param {number} currentTime - Current timestamp in milliseconds
   * @returns {Array} Prediction schedule
   */
  #generatePredictionSchedule (timeSlotAnalysis, history, currentTime) {
    const predictions = []
    const currentTimeSeconds = Math.floor(currentTime / 1000)
    const currentDayStart = Math.floor(currentTimeSeconds / 86400) * 86400
    const nextDayStart = currentDayStart + 86400

    // Process each time slot
    for (const [key, slotData] of Object.entries(timeSlotAnalysis)) {
      const [slotTime, action] = key.split('_')
      const timeOfDay = parseInt(slotTime)

      // Only generate predictions for high-confidence scale-up events
      if (action === 'up' && slotData.confidence > this.#confidenceThreshold) {
        // Calculate absolute time for next occurrence
        let absoluteTime = nextDayStart + timeOfDay

        // If the time slot is later today and hasn't passed yet, predict for today
        if (currentTimeSeconds % 86400 < timeOfDay) {
          absoluteTime = currentDayStart + timeOfDay
        }

        // Add scale-up prediction
        predictions.push({
          timeOfDay,
          absoluteTime: absoluteTime * 1000, // Convert back to milliseconds
          action: 'up',
          pods: slotData.pods,
          confidence: slotData.confidence,
          reasons: slotData.reasons
        })

        // Model scale-down sequences
        const sequences = this.#modelSequences(history, timeOfDay, currentTime)

        for (const seq of sequences) {
          predictions.push({
            timeOfDay: timeOfDay + seq.offset,
            absoluteTime: (absoluteTime + seq.offset) * 1000, // Convert back to milliseconds
            action: 'down',
            pods: seq.pods,
            confidence: slotData.confidence, // Inherit confidence from parent scale-up
            reasons: seq.reasons
          })
        }
      }
    }

    // Sort predictions by absolute time
    predictions.sort((a, b) => a.absoluteTime - b.absoluteTime)

    return predictions
  }

  /**
   * Main entry point: Run the trends learning algorithm
   *
   * @param {string} applicationId - Application to generate predictions for
   * @returns {Object} Results including prediction schedule and analysis
   */
  async runAnalysis (applicationId) {
    const startTime = Date.now()

    try {
      // Step 1: Historical Data Extraction
      const history = await this.#loadPerfHistory(applicationId)

      if (history.length === 0) {
        this.#log.info({ applicationId }, 'No historical data available for trends learning')
        return {
          success: true,
          predictions: [],
          analysisTime: Date.now() - startTime
        }
      }

      this.#log.info({
        applicationId,
        historySize: history.length
      }, 'Starting trends learning analysis')

      // Step 2: Time-Slot Analysis
      const timeSlotAnalysis = this.#analyzeTimeSlots(history, startTime)

      // Step 5: Prediction Generation (Steps 3-4 are integrated)
      const predictions = this.#generatePredictionSchedule(timeSlotAnalysis, history, startTime)

      this.#log.info({
        applicationId,
        predictionsGenerated: predictions.length,
        analysisTime: Date.now() - startTime
      }, 'Trends learning analysis completed')

      return {
        success: true,
        predictions,
        analysisTime: Date.now() - startTime
      }
    } catch (err) {
      this.#log.error({ err, applicationId }, 'Error in trends learning analysis')
      return {
        success: false,
        error: err.message,
        predictions: [],
        analysisTime: Date.now() - startTime
      }
    }
  }

  /**
   * Get predictions for current time window
   * Used by reactive scaler to integrate predictions
   *
   * @param {string} applicationId - Application ID
   * @param {number} currentTime - Current timestamp in milliseconds
   * @returns {Object} Current prediction or null
   */
  async getCurrentPrediction (applicationId, currentTime) {
    try {
      // Generate predictions on-demand
      const analysisResult = await this.runAnalysis(applicationId)

      if (!analysisResult.success || !analysisResult.predictions || analysisResult.predictions.length === 0) {
        return null
      }

      // Find prediction within the prediction window
      const prediction = analysisResult.predictions.find(p => {
        const timeDiff = Math.abs(currentTime - p.absoluteTime)
        return timeDiff <= this.#predictionWindow * 1000 && p.confidence > this.#confidenceThreshold
      })

      return prediction || null
    } catch (err) {
      this.#log.error({ err, applicationId }, 'Error getting current prediction')
      return null
    }
  }
}

module.exports = TrendsLearningAlgorithm
