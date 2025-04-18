import React from 'react'
import SuccessRate from './SuccessRate'
import styles from './MetricsHeader.module.css'

function MetricBox ({ children, title, grow = false }) {
  return (
    <div className={`${styles.metricBox} ${grow ? styles.flexGrow : ''}`}>
      <div className={styles.title}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Metric ({ value, text, unit = null }) {
  return (
    <div className={styles.metric}>
      <div className={styles.value}>
        <span>{value}</span>
        {unit && <div className={styles.unit}>{unit}</div>}
      </div>

      <div className={styles.text}>{text}</div>
    </div>
  )
}
export default function MetricsHeader ({ metrics }) {
  if (!metrics) {
    return null
  }
  return (
    <div className={styles.metricsHeader}>
      <MetricBox title='Messages Sent'>
        <Metric value={metrics.sentMessages} text='Total' />
      </MetricBox>

      <MetricBox title='Success / Failure Rate' grow>
        <SuccessRate successes={metrics.successes} failures={metrics.failures} />
      </MetricBox>

      <MetricBox title='Retries'>
        <Metric value={metrics.totalRetries} text='Total' />
      </MetricBox>
      <MetricBox title='Average Execution Time'>
        <Metric value={metrics.averageExecutionTime?.toFixed(3)} text='Average' unit='ms' />
      </MetricBox>

    </div>
  )
}
