import React from 'react'
import styles from './Arrow.module.css'

function Arrow ({
  color = 'blue'
}) {
  const colorsStyle = {
    yellow: styles.color0,
    blue: styles.color1
  }
  color = colorsStyle[color] || styles.color1
  return (
    <svg
      width='26' height='8' viewBox='0 0 26 8' fill='none' xmlns='http://www.w3.org/2000/svg'
      className={`${color}`}
    >
      <path d='M1 3.5C0.723858 3.5 0.5 3.72386 0.5 4C0.5 4.27614 0.723858 4.5 1 4.5V3.5ZM25.3536 4.35355C25.5488 4.15829 25.5488 3.84171 25.3536 3.64645L22.1716 0.464466C21.9763 0.269204 21.6597 0.269204 21.4645 0.464466C21.2692 0.659728 21.2692 0.976311 21.4645 1.17157L24.2929 4L21.4645 6.82843C21.2692 7.02369 21.2692 7.34027 21.4645 7.53553C21.6597 7.7308 21.9763 7.7308 22.1716 7.53553L25.3536 4.35355ZM1 4.5H25V3.5H1V4.5Z' fill='#FEB928' />
    </svg>

  )
}

export default Arrow
