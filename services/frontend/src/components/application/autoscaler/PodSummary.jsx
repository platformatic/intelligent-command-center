import React, { useEffect, useState } from 'react'
import {
  LOW_PERFORMANCE,
  GOOD_PERFORMANCE,
  UNKNOWN_PERFORMANCE
} from '~/ui-constants'
import callApi from '~/api/common'
import Icons from '@platformatic/ui-components/src/components/icons'
import styles from './PodSummary.module.css'
import { MAIN_GREEN, MEDIUM } from '@platformatic/ui-components/src/components/constants'
import { generatePath, useRouteLoaderData, useNavigate } from 'react-router-dom'
import { AUTOSCALER_POD_DETAIL_PATH } from '../../../paths'
import { ELU_THRESHOLD, HEAP_THRESHOLD, calculateHexagonPerformance } from '../../../utils/podPerformance'

export default function PodSummary ({ pod }) {
  const [signals, setSignals] = useState([])
  const { application } = useRouteLoaderData('appRoot')
  const navigate = useNavigate()

  async function getSignals () {
    // Get alerts from last 60 minutes
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const query = `where.podId.eq=${pod.id}&where.createdAt.gte=${oneHourAgo}`
    const response = await callApi('scaler', `alerts?${query}`, 'GET')
    setSignals(response)
  }
  useEffect(() => {
    getSignals()
  }, [])
  function getSvgStyle () {
    // Use shared performance calculation
    const performance = calculateHexagonPerformance(pod.dataValues)

    // Map shared performance result to UI constants
    const mappedPerformance = performance === 'good' ? GOOD_PERFORMANCE : LOW_PERFORMANCE

    if (mappedPerformance === UNKNOWN_PERFORMANCE) {
      return styles.svgUnknownPerformance
    }
    if (mappedPerformance === LOW_PERFORMANCE) {
      return styles.svgLowPerformance
    }
    if (mappedPerformance === GOOD_PERFORMANCE) {
      return styles.svgGoodPerformance
    }
    return styles.svgGreatPerformance
  }
  function renderSignals () {
    if (signals.length > 0) {
      return (
        <div className={styles.signalsCount}>
          <span className={styles.signalsCountValue}>{signals.length}</span>
          <span className={styles.signalsCountUnit}>Signals</span>
          <span className={styles.signalsCountTimeWindow}>(last 60')</span>
        </div>
      )
    } else {
      return (
        <div className={styles.signalsCount}>
          <Icons.CircleCheckMarkIcon color={MAIN_GREEN} size={MEDIUM} />
          <span className={styles.signalsCountValue}>No signals in the last 60'</span>
        </div>
      )
    }
  }
  return (
    <div
      className={styles.container} onClick={() => {
        navigate(generatePath(AUTOSCALER_POD_DETAIL_PATH, { applicationId: application.id, podId: pod.id }))
      }}
    >
      <div className={styles.svgContainer}>
        <svg width='100%' height='100%' viewBox='0 0 228 262' fill='none' xmlns='http://www.w3.org/2000/svg' className={`${getSvgStyle()} ${styles.svg}`}>
          <path d='M113.805 2.39062L225.353 66.793V195.598L113.805 260L2.25657 195.598V66.793L113.805 2.39062Z' fill='none' stroke='none' />
        </svg>
        <div className={styles.podContent}>
          {renderSignals()}
        </div>
      </div>
      <Metric label='ELU' value={pod.dataValues.eventLoop} signals={signals} unit='%' threshold={ELU_THRESHOLD} />
      <hr />
      <Metric label='Heap' value={pod.dataValues.usedHeap} totalHeap={pod.dataValues.totalHeap} signals={signals} unit='MB' threshold={HEAP_THRESHOLD} thresholdUnit='%' />
    </div>
  )
}

function Metric ({ label, value, totalHeap, signals = [], unit, threshold, thresholdUnit }) {
  function normalizeValue (value, label) {
    // Handle null/undefined values
    if (value == null) {
      return '0.0'
    }

    if (label === 'ELU') {
      // Check if ELU is already in percentage (>1) or decimal (0-1)
      if (value > 1) {
        // Already in percentage form
        return value.toFixed(1)
      } else {
        // In decimal form, convert to percentage
        return (value * 100).toFixed(1)
      }
    }
    if (label === 'Heap') {
      // The API returns heap values in GB, we need to convert to MB
      // If we have totalHeap, use it to calculate actual usage
      if (totalHeap) {
        // totalHeap is in GB, convert to MB
        return (value * 1000).toFixed(1)
      } else {
        // Fallback: assume value is in GB and convert to MB
        return (value * 1000).toFixed(1)
      }
    }
    return value.toFixed(1)
  }
  let deltaClass = ''
  let delta = 0
  let showComparison = false
  let isOverThreshold = false

  // Calculate delta against threshold and check if over threshold
  if (label === 'ELU') {
    const currentELU = value
    delta = currentELU - threshold
    isOverThreshold = currentELU > threshold
    showComparison = isOverThreshold
  } else if (label === 'Heap') {
    // Calculate heap usage as percentage for comparison with threshold
    if (totalHeap > 0) {
      const heapPercent = (value / totalHeap) * 100
      delta = heapPercent - threshold
      isOverThreshold = heapPercent > threshold
      showComparison = isOverThreshold
    }
  }

  delta = Math.round(delta * 10) / 10 // Round to 1 decimal place
  if (delta > 0) {
    deltaClass = styles.deltaPositive
  } else if (delta < 0) {
    deltaClass = styles.deltaNegative
  }

  return (
    <div className={styles.metric}>
      <div className={styles.firstRow}>
        <div className={styles.label}>{label}</div>
        <div className={styles.valueContainer}>
          <span className={styles.value}>{normalizeValue(value, label)}</span>
          <span className={styles.unit}>{unit}</span>
        </div>

      </div>

      <div className={`${styles.secondRow} ${deltaClass}`}>
        {showComparison && (
          <>
            {delta !== 0 && (
              <>
                <span className={styles.delta}>{delta > 0 ? `+${delta}` : delta} {thresholdUnit || unit}</span>
                <span className={styles.excess}>{delta > 0 ? 'excess' : ''}</span>
              </>
            )}
          </>
        )}
      </div>

      {showComparison && (
        <div className={styles.thresholdRow}>
          <span className={styles.thresholdLabel}>Threshold: {threshold} {thresholdUnit || unit}</span>
        </div>
      )}
    </div>
  )
}
