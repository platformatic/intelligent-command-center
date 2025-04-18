import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { TRANSPARENT, RICH_BLACK } from '@platformatic/ui-components/src/components/constants'
import styles from './Metrics.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox, LoadingSpinnerV2 } from '@platformatic/ui-components'
import { getApiMetricsPod } from '~/api'
import LineChart from './LineChart'
import StackedBarsChart from './StackedBarsChart'
import { useInterval } from '~/hooks/useInterval'
import ErrorComponent from '~/components/errors/ErrorComponent'
import NoDataFound from '~/components/ui/NoDataFound'

const REFRESH_INTERVAL = 5000

const Metrics = React.forwardRef(({
  podId,
  applicationId,
  taxonomyId
}, ref) => {
  const [initialLoading, setInitialLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(null)
  const [paused, setPaused] = useState(false) // This pauses the chart flowing (not the data collection)
  const [data, setData] = useState({
    memory: [],
    cpuEL: [],
    latency: []
  })
  const { memory, cpuEL, latency } = data

  const toMB = (bytes) => {
    return Math.round(bytes / 1024 / 1024)
  }

  function handleMetrics (metrics) {
    const parsedMetrics = metrics
    const memory = []
    const cpuEL = []
    const latency = []
    for (const parsedMetric of parsedMetrics) {
      const { date, cpu, elu, rss, totalHeapSize, usedHeapSize, newSpaceSize, oldSpaceSize, latencies } = parsedMetric
      const { p90: P90, p95: P95, p99: P99 } = latencies
      const time = new Date(date)
      const eluPercentage = elu * 100
      memory.push({
        time,
        values: [rss, totalHeapSize, usedHeapSize, newSpaceSize, oldSpaceSize].map(toMB)
      })
      cpuEL.push({
        time,
        values: [cpu, eluPercentage]
      })
      latency.push({ time, P90, P95, P99 })
    }

    setData({
      memory,
      cpuEL,
      latency
    })

    if (initialLoading && memory.length > 3) {
      setInitialLoading(false)
    }
  }

  if (podId && applicationId && taxonomyId) {
    useInterval(async () => {
      try {
        const res = await getApiMetricsPod(taxonomyId, applicationId, podId)
        setShowNoResult(false)
        if (res.status === 200) {
          const data = await res.json()
          handleMetrics(data)
        } else {
          console.error('error on status', res.status)
        }
      } catch (e) {
        console.error(e)
        setError(e)
        setShowErrorComponent(true)
      }
    }, REFRESH_INTERVAL)
  } else {
    setShowNoResult(true)
  }

  function getKey (metric) {
    let defaultKey = `${metric}-`
    const defaultDate = new Date().toISOString()
    switch (metric) {
      case 'memory':
        if (memory.length > 0) {
          defaultKey += memory[memory.length - 1].time ? new Date(memory[memory.length - 1].time).toISOString() : defaultDate
        }
        break
      case 'cpu':
        if (cpuEL.length > 0) {
          defaultKey += cpuEL[cpuEL.length - 1].time ? new Date(cpuEL[cpuEL.length - 1].time).toISOString() : defaultDate
        }
        break
      case 'latency':
        if (latency.length > 0) {
          defaultKey += latency[latency.length - 1].time ? new Date(latency[latency.length - 1].time).toISOString() : defaultDate
        }
        break
      default:
        defaultKey += defaultDate
        break
    }

    return defaultKey
  }

  function renderContent () {
    if (initialLoading) {
      return (
        <LoadingSpinnerV2
          loading
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: [{
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
              text: 'Start collecting metrics'
            }]
          }}
          containerClassName={styles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }

    if (showNoResult) { return <NoDataFound title='No Metrics yet' subTitle={<span>There’s no metrics collected by your apps.</span>} /> }

    if (showErrorComponent) {
      return (
        <ErrorComponent
          error={error}
          message={error?.message || ''}
          onClickDismiss={() => setShowErrorComponent(false)}
        />
      )
    }

    return (
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth} ${styles.flexGrow}`}>
        <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
          <BorderedBox color={TRANSPARENT} backgroundColor={RICH_BLACK} classes={styles.boxMetricContainer}>
            <LineChart
              key={getKey('memory')}
              data={memory}
              title='Memory'
              unit='MB'
              labels={['RSS', 'Total Heap', 'Heap Used', 'New Space', 'Old Space']}
              paused={paused}
              setPaused={setPaused}
            />
          </BorderedBox>

          <BorderedBox color={TRANSPARENT} backgroundColor={RICH_BLACK} classes={styles.boxMetricContainer}>
            <LineChart
              data={cpuEL}
              key={getKey('cpu')}
              title='CPU & ELU'
              unit='%'
              lowerMaxY={100}
              labels={['CPU', 'ELU']}
              colorSet='cpu'
              paused={paused}
              setPaused={setPaused}
            />
          </BorderedBox>

          <BorderedBox color={TRANSPARENT} backgroundColor={RICH_BLACK} classes={styles.boxMetricContainer}>
            <StackedBarsChart
              key={getKey('latency')}
              data={latency}
              title='Latency'
              unit='ms'
              paused={paused}
              setPaused={setPaused}
            />
          </BorderedBox>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container} ref={ref}>
      <div className={styles.content}>
        {renderContent()}
      </div>
    </div>
  )
})

Metrics.propTypes = {
  /**
   * podId
   */
  podId: PropTypes.string,
  /**
   * applicationId
   */
  applicationId: PropTypes.string,
  /**
   * taxonomyId
   */
  taxonomyId: PropTypes.string
}

export default Metrics
