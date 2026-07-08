import React, { useMemo } from 'react'
import { CATEGORIES, SCHEDULED_COLOR } from './PlannerRow'
import styles from './PlannerLegend.module.css'

function generateThresholdLabels (thresholds) {
  if (!thresholds || thresholds.length === 0) return []

  const sorted = [...thresholds].sort((a, b) => a - b)
  const labels = []

  labels.push(`<${sorted[0]}`)

  for (let i = 0; i < sorted.length - 1; i++) {
    labels.push(`${sorted[i]}-${sorted[i + 1]}`)
  }

  labels.push(`>${sorted[sorted.length - 1]}`)

  return labels
}

export default function PlannerLegend ({ categoryConfig }) {
  const thresholdLabels = useMemo(() => {
    if (!categoryConfig?.config?.categoryThresholds?.values) {
      return CATEGORIES.map(c => c.label)
    }
    return generateThresholdLabels(categoryConfig.config.categoryThresholds.values)
  }, [categoryConfig])

  const displayCategories = useMemo(() => {
    return CATEGORIES.map((cat, idx) => ({
      ...cat,
      label: thresholdLabels[idx] || cat.label
    }))
  }, [thresholdLabels])

  return (
    <div className={styles.legend}>
      <span className={styles.legendTitle}>Load Level:</span>
      {displayCategories.map(cat => (
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
