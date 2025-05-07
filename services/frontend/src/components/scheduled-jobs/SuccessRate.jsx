import React from 'react'
import styles from './SuccessRate.module.css'
import NoDataAvailable from '../ui/NoDataAvailable'

function ProgressBar ({ value, label }) {
  return (
    <div className={`${styles.progressBar} ${styles[label]}`} style={{ width: `${value}%` }}>
      <div className={styles.progressBarFill} />
    </div>
  )
}
function getSuccessAndFailureRateLabels (successes, failures) {
  if (successes === 0 && failures === 0) {
    return { successRate: '-', failureRate: '-' }
  }
  const successRate = ((successes / (successes + failures)) * 100)
  const failureRate = (100 - successRate)
  if (isNaN(successRate) || isNaN(failureRate)) {
    return { successRate: '-', failureRate: '-' }
  }
  return { successRate: `${successRate.toFixed(2)}%`, failureRate: `${failureRate.toFixed()}%` }
}
export default function SuccessRate ({ successes, failures }) {
  if (successes === 0 && failures === 0) {
    return <NoDataAvailable />
  }
  if (successes === undefined || failures === undefined) {
    return <NoDataAvailable />
  }
  if (successes < 0) {
    successes = 0
  }
  const successRate = ((successes / (successes + failures)) * 100).toFixed()
  const labels = getSuccessAndFailureRateLabels(successes, failures)
  return (
    <div className={styles.container}>
      <div className={styles.topLine}>
        <div className={`${styles.value} ${styles.success}`}>
          <span className={styles.valueText}>{labels.successRate}</span>
          <span className={styles.helperText}>Success Rate</span>
        </div>
        <div className={`${styles.value} ${styles.failures}`}>
          <span className={styles.valueText}>{labels.failureRate}</span>
          <span className={styles.helperText}>Failure Rate</span>
        </div>
      </div>
      <div className={styles.bottomLine}>
        {successRate > 0 && <ProgressBar value={successRate} label='success' />}
        {successRate < 100 && <ProgressBar value={100 - successRate} label='failures' />}
      </div>
    </div>
  )
}
