import React from 'react'
import styles from './ArcMetric.module.css'

/**
 * ArcMetric component
 * @param {Object} props
 * @param {number} props.value - The current value to display in the arc
 * @param {number} props.max - The maximum value for the arc (for progress calculation)
 * @param {string} props.unit - The unit of measure (e.g., 'MB')
 * @param {string} props.title - The title to display at the top
 * @param {React.ReactNode} props.helper - The helper text (can be ReactNode)
 */
export default function ArcMetric ({ value, max, unit, title, helper }) {
  // Arc settings
  const radius = 120
  const progress = Math.max(0, Math.min(1, value / max))

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <span className={styles.title}>{title}</span>
        <span className={styles.infoIcon}>ⓘ</span>
      </div>
      <div className={styles.arcRow}>
        <SemiCircleProgress
          percentage={progress * 100}
          strokeWidth={10}
          diameter={radius * 2}
          orientation='up'
          direction='right'
          showPercentValue
          value={value}
          unit={unit}
        />
        <div className={styles.helperBox}>{helper}</div>
      </div>
    </div>
  )
}

export function SemiCircleProgress ({
  stroke = '#fff',
  strokeWidth = 10,
  background = '#33373C',
  diameter = 200,
  orientation = 'up',
  direction = 'right',
  showPercentValue = false,
  percentage,
  value,
  unit
}) {
  const coordinateForCircle = diameter / 2
  const radius = (diameter - 2 * strokeWidth) / 2
  const circumference = Math.PI * radius

  let percentageValue
  if (percentage > 100) {
    percentageValue = 100
  } else if (percentage < 0) {
    percentageValue = 0
  } else {
    percentageValue = percentage
  }
  const semiCirclePercentage = percentageValue * (circumference / 100)

  let rotation
  if (orientation === 'down') {
    if (direction === 'left') {
      rotation = 'rotate(180deg) rotateY(180deg)'
    } else {
      rotation = 'rotate(180deg)'
    }
  } else {
    if (direction === 'right') {
      rotation = 'rotateY(180deg)'
    }
  }

  return (
    <div className='semicircle-container' style={{ position: 'relative' }}>
      <svg
        width={diameter}
        height={diameter / 2}
        style={{ transform: rotation, overflow: 'hidden' }}
      >
        <circle
          cx={coordinateForCircle}
          cy={coordinateForCircle}
          r={radius}
          fill='none'
          stroke={background}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          style={{
            strokeDashoffset: circumference
          }}
        />
        <circle
          cx={coordinateForCircle}
          cy={coordinateForCircle}
          r={radius}
          fill='none'
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          style={{
            strokeDashoffset: semiCirclePercentage,
            transition:
              'stroke-dashoffset .3s ease 0s, stroke-dasharray .3s ease 0s, stroke .3s'
          }}
        />
      </svg>
      {showPercentValue && (
        <div className={styles.semicircleDataContainer}>
          <span>{value}</span>
          <span className='text-white/70 text-[1.2rem] font-normal'>{unit}</span>
        </div>

      )}
    </div>
  )
}

// function percentageValidation (isRequired) {
//   return function (props, propName, componentName) {
//     const prop = props[propName]
//     if (prop == null) {
//       if (isRequired) {
//         throw new Error('Percentage is a required prop.')
//       }
//     } else {
//       if (typeof prop !== 'number') {
//         return new Error(
//           'Invalid percentage. Must be a number between 0 and 100.'
//         )
//       }
//       if (props[propName] < 0 || props[propName] > 100) {
//         return new Error(
//           'Invalid percentage. Must be a number between 0 and 100.'
//         )
//       }
//     }
//   }
// }
