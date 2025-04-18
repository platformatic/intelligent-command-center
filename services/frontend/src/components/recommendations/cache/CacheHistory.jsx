import React, { useState } from 'react'
import styles from './CacheHistory.module.css'
import HistoryChart from './HistoryChart'
import Icons from '@platformatic/ui-components/src/components/icons'
import { ERROR_RED, MAIN_GREEN, SMALL } from '@platformatic/ui-components/src/components/constants'

export default function CacheHistory ({ history, layout = 'vertical' }) {
  const [mouseX, setMouseX] = useState(0)

  const labels = {
    frequency: 'Frequency',
    stability: 'Stability',
    score: 'Score',
    requestCount: 'Requests'
  }

  const lineColors = {
    frequency: '#C61BE2',
    stability: '#33FFEA',
    score: '#6825E4',
    requestCount: '#2588E4'
  }
  function getHistoricData (label) {
    if (label !== 'requestCount') {
      return history.map((item) => item[label] * 100)
    }
    return history.map((item) => item[label])
  }

  function getYValues (label) {
    if (label === 'score') {
      return [{
        value: 0,
        label: '0%',
        dashed: false
      }, {
        value: 70,
        label: '70%',
        dashed: true
      }, {
        value: 100,
        label: '100%',
        dashed: false
      }]
    }
    if (label === 'requestCount') {
      const max = Math.max(...history.map((item) => item[label]))
      const output = [{
        value: 0,
        label: '0',
        dashed: false
      },
      {
        value: max / 2,
        label: (max / 2).toString(),
        dashed: false
      }, {
        value: max,
        label: max.toString(),
        dashed: false
      }]
      return output
    }
  }

  function getAverageValue (label) {
    const data = getHistoricData(label)
    const average = data.reduce((acc, curr) => acc + curr, 0) / data.length
    if (average % 1 === 0) {
      return average
    }
    return average.toFixed(2)
  }
  function getAverageUnit (label) {
    if (label === 'requestCount') {
      return ''
    }
    return '%'
  }
  function getAverageTrend (label) {
    const data = getHistoricData(label)
    const average = getAverageValue(label)
    const trend = data[data.length - 1] - average
    // if trend has not decimal, return 0
    if (trend % 1 === 0) {
      return trend
    }
    return trend.toFixed(2)
  }

  function renderAverageTrend (label) {
    const trend = getAverageTrend(label)
    if (trend > 0) {
      return (
        <div className={styles.trendUp}>
          <span>+</span>
          <span>{trend.toString()}</span>
          <span>{getAverageUnit(label)}</span>
        </div>
      )
    }
    return (
      <div className={styles.trendDown}>
        <span>{trend.toString()}</span>
        <span>{getAverageUnit(label)}</span>
      </div>
    )
  }
  function renderAverageTrendIcon (label) {
    const trend = getAverageTrend(label)
    if (trend > 0) {
      return <Icons.ArrowUpIcon color={MAIN_GREEN} size={SMALL} />
    }
    return <Icons.ArrowDownIcon color={ERROR_RED} size={SMALL} />
  }

  function AverageContainer ({ metric, label = false }) {
    return (
      <div className={styles.averageContainer}>
        {label && (
          <div className={styles.averageTitle}>
            <span>{label} Average</span>
          </div>
        )}
        <div className={styles.averageValues}>
          <div className={styles.averageValue}>
            {getAverageValue(metric)}
            {getAverageUnit(metric)}
            {renderAverageTrendIcon(metric)}
          </div>

          <div className={styles.secondaryAverageContainer}>
            {renderAverageTrend(metric)}
            after last data

          </div>
        </div>

      </div>
    )
  }

  if (layout === 'horizontal') {
    return (
      <div className={styles.smallContainer}>
        {Object.keys(labels).map((label) => (
          <div className={styles.smallChartContainer} key={label}>
            <div className={styles.title}>
              <span>{labels[label]}</span>
            </div>
            <div className={styles.chart}>
              <AverageContainer metric={label} />
              <HistoryChart
                data={getHistoricData(label)}
                size={layout === 'horizontal' ? 'small' : 'large'}
                mouseX={mouseX}
                onMouseMove={setMouseX}
                onMouseLeave={() => setMouseX(0)}
                yValues={getYValues(label)}
                lineColor={lineColors[label]}
                percent={label !== 'requestCount'}
                getDataAtIndex={(index) => history[index]}
              />
            </div>

          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.chartContainer}>
      {Object.keys(labels).map((label) => (
        <div key={label} style={{ width: '100%' }} className={`${styles.chart} ${layout === 'horizontal' ? styles.horizontal : ''}`}>
          <HistoryChart
            data={getHistoricData(label)}
            size={layout === 'horizontal' ? 'small' : 'large'}
            mouseX={mouseX}
            onMouseMove={setMouseX}
            onMouseLeave={() => setMouseX(0)}
            yValues={getYValues(label)}
            lineColor={lineColors[label]}
            label={labels[label]}
            percent={label !== 'requestCount'}
            getDataAtIndex={(index) => history[index]}
          />
          <AverageContainer metric={label} label={labels[label]} />
        </div>
      ))}
    </div>

  )
}
