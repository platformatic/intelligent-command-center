import React from 'react'
import styles from './PlannerRow.module.css'

// TODO: category count/colors will come from a config API — hardcoded to 5 for now.
// category 1 = least pods relative to normal … 5 = most; 3 is normal.
const CATEGORIES = [
  { category: 1, color: '#164674', label: 'Low' },
  { category: 2, color: '#1C6E8C', label: 'Below normal' },
  { category: 3, color: '#0A4B30', label: 'Normal' },
  { category: 4, color: '#735F1F', label: 'Above normal' },
  { category: 5, color: '#5C0E0E', label: 'High' }
]
export const SCHEDULED_COLOR = '#89109C'

export { CATEGORIES }

function categoryColor (category) {
  return CATEGORIES[category - 1]?.color ?? CATEGORIES[2].color
}

// cells: array of { entry, isFuture } | null  (one slot per day, null = day outside range)
export default function PlannerRow ({ cells, hourIndex, hoverState, setHoverState, categoryConfig }) {
  const isOverlayActive = hoverState !== null

  return (
    <div className={styles.row}>
      {cells.map((cell, i) => {
        const isHighlighted = isOverlayActive &&
          hoverState.dayOfWeek === i &&
          (hoverState.hour === null || hoverState.hour === hourIndex)
        const dimClass = isOverlayActive && !isHighlighted ? styles.cellDimmed : ''
        const enterHandler = () => setHoverState({ dayOfWeek: i, hour: hourIndex })

        if (!cell || !cell.entry) {
          return (
            <div
              key={i}
              className={`${styles.cellEmpty} ${dimClass}`}
              onMouseEnter={enterHandler}
            />
          )
        }

        const { entry, isFuture } = cell
        const { instances: count, category, scheduled, predicted } = entry

        if (isFuture && scheduled) {
          return (
            <div
              key={i}
              className={`${styles.cell} ${dimClass}`}
              style={{ background: SCHEDULED_COLOR }}
              onMouseEnter={enterHandler}
            >
              <span className={styles.cellNum}>{count}</span>
            </div>
          )
        }
        if (isFuture && predicted) {
          const color = categoryColor(category)
          return (
            <div
              key={i}
              className={`${styles.cell} ${dimClass}`}
              style={{
                border: `1px dashed ${color}`,
                background: `${color}4D`
              }}
              onMouseEnter={enterHandler}
            >
              <span className={styles.cellNum}>{count}</span>
            </div>
          )
        }
        return (
          <div
            key={i}
            className={`${styles.cell} ${dimClass}`}
            style={{ background: categoryColor(category) }}
            onMouseEnter={enterHandler}
          >
            <span className={styles.cellNum}>{count}</span>
          </div>
        )
      })}
    </div>
  )
}
