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

function darkenColor (hexColor, factor = 0.8) {
  const color = hexColor.replace('#', '')
  const num = parseInt(color, 16)
  const r = Math.floor((num >> 16) * factor)
  const g = Math.floor(((num >> 8) & 0x00FF) * factor)
  const b = Math.floor((num & 0x0000FF) * factor)
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

// cells: array of { entry, isFuture } | null  (one slot per day, null = day outside range)
// occurrenceIds: Set of the calendar row ids the selected suggestion covers (GET /suggestions/:id/details),
// or null when nothing is selected. They are the time_window_stats / time_window_predictions row ids —
// the server derives them from the suggestion's calendar rule, so they match these cells directly.
export default function PlannerRow ({ cells, hourIndex, hoverState, setHoverState, categoryConfig, occurrenceIds, showDualValues }) {
  const isHoverActive = hoverState !== null
  const isSelectionActive = occurrenceIds !== null

  return (
    <div className={styles.row}>
      {cells?.map((cell, i) => {
        const hoverIsHighlighted = isHoverActive &&
          hoverState.dayOfWeek === i &&
          (hoverState.hour === null || hoverState.hour === hourIndex)

        const selectionIsHighlighted = isSelectionActive && (
          (cell?.entry?.history?.id && occurrenceIds.has(cell.entry.history.id)) ||
          (cell?.entry?.predictions?.id && occurrenceIds.has(cell.entry.predictions.id))
        )

        const isHighlighted = hoverIsHighlighted || selectionIsHighlighted
        const dimClass = (isHoverActive || isSelectionActive) && !isHighlighted ? styles.cellDimmed : ''
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
        const { instances: count, scheduled, history, predictions } = entry

        const hasDualValues = history && predictions

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

        if (showDualValues && hasDualValues && !isFuture) {
          const historyColor = categoryColor(history.category)
          const predictionsColor = darkenColor(categoryColor(predictions.category))

          return (
            <div
              key={i}
              className={`${styles.cellDual} ${dimClass}`}
              onMouseEnter={enterHandler}
            >
              <div
                className={styles.cellDualTop}
                style={{ background: historyColor }}
              >
                <span className={styles.cellNum}>{history.pods}</span>
              </div>
              <div
                className={styles.cellDualBottom}
                style={{ background: predictionsColor }}
              >
                <span className={styles.cellNum}>{predictions.pods}</span>
              </div>
            </div>
          )
        }

        if (isFuture && predictions) {
          const color = categoryColor(predictions.category)
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

        const categoryForCell = history?.category || predictions?.category || 3
        return (
          <div
            key={i}
            className={`${styles.cell} ${dimClass}`}
            style={{ background: categoryColor(categoryForCell) }}
            onMouseEnter={enterHandler}
          >
            <span className={styles.cellNum}>{count}</span>
          </div>
        )
      })}
    </div>
  )
}
