import React from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import { unitPluralCap } from './unitLabel'
import styles from './PodsScheduledBox.module.css'

function HexOutline ({ number, dashed }) {
  const strokeColor = dashed ? '#2588E4' : '#33373C'
  const strokeDasharray = dashed ? '6 3' : undefined
  const textColor = dashed ? '#2588E4' : 'white'
  const fill = dashed ? 'rgba(37,136,228,0.04)' : 'none'

  return (
    <svg width='42' height='48' viewBox='0 0 42 48' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <path
        d='M21 1L40.05 12V36L21 47L1.95 36V12L21 1Z'
        fill={fill}
        stroke={strokeColor}
        strokeWidth='1.5'
        strokeDasharray={strokeDasharray}
      />
      <text
        x='21'
        y='24'
        textAnchor='middle'
        dominantBaseline='middle'
        fill={textColor}
        fontSize='14'
        fontWeight='600'
        fontFamily='inherit'
      >
        {number}
      </text>
    </svg>
  )
}

function ArrowRight () {
  return (
    <svg width='28' height='14' viewBox='0 0 28 14' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <path d='M0 7H25M25 7L19 1M25 7L19 13' stroke='#4D5054' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}

export default function PodsScheduledBox ({ count }) {
  if (!count) {
    return (
      <div className={styles.box}>
        <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite} ${styles.title}`}>
          {unitPluralCap} Scheduled
        </span>
        <div className={styles.loadingSection}>
          <span className={styles.loadingText}>—</span>
        </div>
      </div>
    )
  }

  const from = count.history.length > 0 ? count.history[count.history.length - 1].count : 0
  const to = count.prediction.length > 0 ? count.prediction[count.prediction.length - 1].count : from
  const delta = to - from
  const deltaSign = delta > 0 ? '+' : ''

  return (
    <div className={styles.box}>
      <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite} ${styles.title}`}>
        {unitPluralCap} Scheduled
      </span>
      <div className={styles.deltaSection}>
        <span className={styles.deltaText}>{deltaSign}{delta}</span>
      </div>
      <div className={styles.hexRow}>
        <HexOutline number={from} />
        <ArrowRight />
        <HexOutline number={to} dashed />
      </div>
    </div>
  )
}
