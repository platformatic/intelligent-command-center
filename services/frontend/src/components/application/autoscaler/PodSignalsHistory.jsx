import { Button, Icons, BorderedBox } from '@platformatic/ui-components'
import React, { useState, useEffect } from 'react'
import { useLoaderData, useNavigate } from 'react-router-dom'
import styles from './PodSignalsHistory.module.css'
import { RICH_BLACK, WHITE, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import { getFormattedTime } from '../../../utilities/dates'
import commonStyles from '../../../styles/CommonStyles.module.css'
import typographyStyles from '../../../styles/Typography.module.css'
import { getScaleEventMetrics, getAlertMetrics } from '../../../api/autoscaler'
import LineChart from '../../metrics/LineChart'
import ExperimentalTag from '@platformatic/ui-components/src/components/ExperimentalTag'
import dayjs from 'dayjs'
function SignalBox ({ title, count }) {
  return (
    <div className={styles.signalBox}>
      <div className={styles.signalBoxTitle}>{title}</div>
      <div className={styles.signalBoxCount}>{count}</div>
    </div>
  )
}
export default function PodSignalsHistory () {
  const { signals } = useLoaderData()
  const [selectedSignal, setSelectedSignal] = useState(null)

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <Icons.PodSignalsIcon color={WHITE} />
        <span>Pod Signals History</span>
        <ExperimentalTag />

      </div>
      <div className={styles.header}>
        <SignalBox title='Total Signals' count={signals.length} />
        <SignalBox title='ELU Signals' count={signals.filter((signal) => signal.type === 'elu').length} />
        <SignalBox title='Heap Signals' count={signals.filter((signal) => signal.type === 'heap').length} />
      </div>
      <div className={styles.signals}>
        <SignalsList signals={signals} selectedSignal={selectedSignal} setSelectedSignal={setSelectedSignal} />

        {selectedSignal && <SignalDetail signal={selectedSignal} />}
      </div>
    </div>
  )
}

function SignalRow ({ signal }) {
  const unit = signal.type === 'elu' ? '%' : 'MB'
  const displayType = signal.type === 'elu' ? 'ELU' : 'Heap'

  return (
    <>
      <div className={styles.signalInfo}>
        <span className={styles.time}>{getFormattedTime(signal.createdAt)}</span>
        <span className={styles.type}>{displayType}</span>
        <span className={styles.infoText}>from:</span>
        <span className={styles.serviceId}>{signal.serviceId || 'unknown'}</span>
      </div>
      <div className={styles.signalValue}>
        <span className={styles.value}>{signal.value} {unit}</span>
      </div>
    </>
  )
}
function SignalsList ({ signals, selectedSignal, setSelectedSignal }) {
  function groupSignalsByDate (signals) {
    return signals.reduce((acc, signal) => {
      const djs = dayjs(signal.createdAt)
      let date = djs.format('YYYY-MM-DD')
      // if date is today, use 'Today' string
      if (djs.isSame(dayjs(), 'day')) {
        date = 'Today'
      }

      // if date is yesterday, use 'Yesterday' string
      if (djs.isSame(dayjs().subtract(1, 'day'), 'day')) {
        date = 'Yesterday'
      }

      acc[date] = acc[date] || []
      acc[date].push(signal)
      return acc
    }, {})
  }
  return (
    <div className={styles.signalsListContainer}>
      <div className={styles.title}>
        <span>Signals History</span>
      </div>
      {Object.entries(groupSignalsByDate(signals)).map(([date, signals]) => (
        <div key={date} className={styles.date}>
          <span className={styles.dateText}>{date}</span>
          {signals.map((signal) => (
            <div
              key={signal.id}
              onClick={() => {
                if (selectedSignal === null) {
                  setSelectedSignal(signal)
                } else {
                  if (selectedSignal.id === signal.id) {
                    setSelectedSignal(null)
                  } else {
                    setSelectedSignal(null)
                    setTimeout(() => {
                      setSelectedSignal(signal)
                    }, 10)
                  }
                }
              }}
              className={`${styles.signal} ${selectedSignal?.id === signal.id ? styles.selectedSignal : ''}`}
            >
              <SignalRow signal={signal} />
            </div>
          ))}
        </div>
      ))}
    </div>

  )
}

function SignalDetail ({ signal }) {
  const navigate = useNavigate()
  const { applicationId } = useLoaderData()
  const [eventMetrics, setEventMetrics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setEventMetrics(null) // Clear previous data immediately

    if (signal.scaleEventId) {
      // Fetch metrics for scale event
      getScaleEventMetrics(signal.scaleEventId)
        .then(data => {
          setEventMetrics(data)
        })
        .catch(err => {
          setError(err.message)
          setEventMetrics(null)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      // Fetch metrics directly for the alert/signal
      getAlertMetrics(signal.id)
        .then(data => {
          setEventMetrics(data)
        })
        .catch(err => {
          setError(err.message)
          setEventMetrics(null)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [signal.scaleEventId, signal.id])

  // Convert the metrics data to the format expected by LineChart
  function formatMetricsForChart (metrics) {
    if (!metrics) return { eluData: [], heapData: [] }

    const eluData = []
    const heapData = []

    // Find the common timestamps between elu, heapUsed, and heapTotal
    const eluMap = new Map(metrics.elu.map(point => [point.timestamp, point.value * 100]))
    const heapUsedMap = new Map(metrics.heapUsed.map(point => [point.timestamp, point.value / 1024 / 1024])) // Convert to MB
    const heapTotalMap = new Map(metrics.heapTotal.map(point => [point.timestamp, point.value / 1024 / 1024])) // Convert to MB

    // Get all unique timestamps and sort them
    const allTimestamps = new Set([
      ...metrics.elu.map(p => p.timestamp),
      ...metrics.heapUsed.map(p => p.timestamp),
      ...metrics.heapTotal.map(p => p.timestamp)
    ])
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

    // Create data points for each timestamp
    sortedTimestamps.forEach(timestamp => {
      const time = new Date(timestamp * 1000)

      // ELU data point
      if (eluMap.has(timestamp)) {
        eluData.push({
          time,
          values: [eluMap.get(timestamp)]
        })
      }

      // Heap data point (both used and total if available)
      if (heapUsedMap.has(timestamp) || heapTotalMap.has(timestamp)) {
        const heapUsed = heapUsedMap.get(timestamp) || 0
        const heapTotal = heapTotalMap.get(timestamp) || 0
        heapData.push({
          time,
          values: [heapUsed, heapTotal]
        })
      }
    })

    return { eluData, heapData }
  }

  const { eluData, heapData } = formatMetricsForChart(eventMetrics?.metrics)

  return (
    <div className={styles.signalDetail}>
      <div className={styles.title}>
        Signal Analysis
        <Button
          type='button'
          label='View Scale Event'
          onClick={() => {
            if (signal.scaleEventId) {
              navigate(`/watts/${applicationId}/autoscaler?tab=scaling_history&eventId=${signal.scaleEventId}`)
            }
          }}
          disabled={!signal.scaleEventId}
          color={WHITE}
          backgroundColor={RICH_BLACK}
          paddingClass={commonStyles.smallButtonPadding}
          textClass={typographyStyles.desktopButtonSmall}
        />
      </div>

      {loading && (
        <div className={styles.loadingMessage}>Loading event metrics...</div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          Error loading metrics: {error}
        </div>
      )}

      {eventMetrics && !loading && !error && (
        <div className={styles.metricsCharts}>
          <div className={styles.chartInfo}>
            <span className={styles.infoText}>
              Alert registered at {new Date(signal.createdAt).toLocaleString()} with {signal.type.toUpperCase()} value of {signal.value}{signal.type === 'elu' ? '%' : 'MB'}{signal.scaleEventId ? ' contributed to scaling event' : ''}. Showing metrics 2 minutes before and 1 minute after the alert.
            </span>
          </div>

          <div className={styles.chartsContainer}>
            {eluData.length > 0 && (
              <BorderedBox color={TRANSPARENT} backgroundColor={RICH_BLACK} classes={styles.chartBox}>
                <LineChart
                  key={`elu-${signal.scaleEventId}-${eventMetrics?.alertTime || 'loading'}`}
                  data={eluData}
                  title='ELU'
                  unit='%'
                  labels={['ELU']}
                  colorSet='cpu'
                  paused={false}
                  setPaused={() => {}}
                  lowerMaxY={100}
                />
              </BorderedBox>
            )}

            {heapData.length > 0 && (
              <BorderedBox color={TRANSPARENT} backgroundColor={RICH_BLACK} classes={styles.chartBox}>
                <LineChart
                  key={`heap-${signal.scaleEventId}-${eventMetrics?.alertTime || 'loading'}`}
                  data={heapData}
                  title='Heap'
                  unit='MB'
                  labels={['Heap Used', 'Heap Total']}
                  colorSet='mem'
                  paused={false}
                  setPaused={() => {}}
                />
              </BorderedBox>
            )}
          </div>
        </div>
      )}

      {!signal.scaleEventId && (
        <div className={styles.noEventMessage}>
          No scale event associated with this signal.
        </div>
      )}
    </div>
  )
}
