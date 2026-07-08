import React from 'react'
import styles from './ConfidenceBar.module.css'

export default function ConfidenceBar ({ confidence, label }) {
  const percentage = confidence * 100 || 0
  const width = Math.round((percentage / 100) * 53)

  return (
    <div className={styles.container}>
      <svg width='100' height='16' viewBox='0 0 84 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
        {/* Background bar */}
        <rect y='6' width='55' height='4' rx='2' fill='#33373C' />

        {/* Filled portion */}
        {width > 0 && (
          <path
            d={`M0 8C0 6.89543 0.895431 6 2 6H${width}C${width + 1.1046} 6 ${width + 2} 6.89543 ${width + 2} 8C${width + 2} 9.10457 ${width + 1.1046} 10 ${width} 10H2C0.895429 10 0 9.10457 0 8Z`}
            fill='#1FD47D'
          />
        )}

        {/* Divider line */}
        <line x1='33.25' y1='0' x2='33.25' y2='16' stroke='#B2B4B6' strokeWidth='0.5' strokeDasharray='3 3' />

        {/* Percentage text */}
        <text x='62' y='12' fontSize='10' fill='#B2B4B6' fontFamily='monospace'>
          {percentage}%
        </text>
      </svg>
    </div>
  )
}
