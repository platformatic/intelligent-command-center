import React from 'react'
import styles from './Hexagon.module.css'

/**
 * Hexagon component that renders a hexagon with a number inside
 * @param {Object} props - Component props
 * @param {number} props.number - The number to display inside the hexagon
 * @param {string} props.color - The color of the number text
 * @param {string} [props.borderColor] - Optional border color (defaults to the same as color)
 */
function Hexagon ({ number, color, borderColor }) {
  const strokeColor = borderColor || color
  const classNames = `${styles.hexagonContainer} ${styles[`color--${color}`]}`
  return (
    <div className={classNames}>
      <svg
        width='31'
        height='33'
        viewBox='0 0 31 33'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={styles.hexagonSvg}
      >
        {/* Hexagon border */}
        <path
          d='M15.5 1L28.9234 8.75V24.25L15.5 32L2.07661 24.25V8.75L15.5 1Z'
          fill='none'
          stroke={strokeColor}
          strokeWidth='1'
        />

        {/* Number text */}
        <text
          x='15.5'
          y='18'
          textAnchor='middle'
          dominantBaseline='middle'
          fill={color}
          fontSize='12'
          fontWeight='bold'
          className={styles.hexagonText}
        >
          {number}
        </text>
      </svg>
    </div>
  )
}

export default Hexagon
