import React from 'react'
import styles from './Score.module.css'

export default function Score ({ value, thresholds, recommended }) {
  if (value > 100) {
    value = 100
  }
  const defaultThresholds = {
    low: 70,
    medium: 80,
    high: 90
  }
  const currentThresholds = {
    ...defaultThresholds,
    ...thresholds
  }
  const recomendedStyles = {
    left: `${recommended - 9}px`,
    position: 'absolute',
    height: '25px',
    border: '1px dashed rgba(255, 255, 255, 0.5)',
    borderOpacity: '0.5'
  }
  const score = currentThresholds.low > value ? 'low' : currentThresholds.medium > value ? 'medium' : 'high'
  return (
    <div className={styles.score}>
      <div className={styles.barContainer}>
        {recommended && <div style={recomendedStyles} />}
        <div className={`${styles.bar} ${styles[score]}`} style={{ width: `${value}%` }} />
      </div>
      <div className={styles.label}>{value}%</div>
    </div>
  )
}
