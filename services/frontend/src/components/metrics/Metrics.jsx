import React, { useState } from 'react'
import { TRANSPARENT, BLACK_RUSSIAN } from '@platformatic/ui-components/src/components/constants'
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

export default function Metrics ({
  podId,
  applicationId
}) {
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
    const { chart, latency } = metrics
    const memory = []
    const cpuEL = []

    const latencyData = latency.map(parsedMetric => {
      const { date, latencies } = parsedMetric
      const time = new Date(date)
      return {
        time,
        P90: latencies.p90,
        P95: latencies.p95,
        P99: latencies.p99
      }
    })
    chart.forEach(parsedMetric => {
      const { date, cpu, elu, rss, totalHeapSize, usedHeapSize, newSpaceSize, oldSpaceSize } = parsedMetric
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
    })

    setData({
      memory,
      cpuEL,
      latency: latencyData
    })

    if (initialLoading && memory.length > 3) {
      setInitialLoading(false)
    }
  }

  useInterval(async () => {
    try {
      const data = await getApiMetricsPod(applicationId, podId)
      setShowNoResult(false)
      handleMetrics(data)
    } catch (e) {
      console.error(e)
      setError(e)
      setShowErrorComponent(true)
    }
  }, REFRESH_INTERVAL)

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
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth} ${styles.metricsContainer}`}>
        <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.boxMetricContainer}>
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

        <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.boxMetricContainer}>
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

        <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.boxMetricContainer}>
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
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {renderContent()}
      </div>
    </div>
  )
}
