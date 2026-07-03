import React from 'react'
import { CATEGORIES, SCHEDULED_COLOR } from './PlannerRow'
import styles from './PlannerLegend.module.css'

export default function PlannerLegend () {
  return (
    <div className={styles.legend}>
      <span className={styles.legendTitle}>Load Level:</span>
      {CATEGORIES.map(cat => (
        <div key={cat.label} className={styles.legendCell} style={{ background: cat.color }}>
          <span className={styles.legendCellText}>{cat.label}</span>
        </div>
      ))}
      <div className={styles.legendDivider} />
      <div className={styles.legendItem}>
        <span className={styles.legendTitle}>Scheduled:</span>
        <div className={styles.legendSwatch} style={{ background: SCHEDULED_COLOR }} />
      </div>
      <div className={styles.legendItem}>
        <span className={styles.legendTitle}>Predicted:</span>
        <div className={`${styles.legendSwatch} ${styles.legendSwatchOutline}`} />
      </div>
    </div>
  )
}
