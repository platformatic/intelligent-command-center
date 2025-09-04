import React from 'react'
import { Icons } from '@platformatic/ui-components'
import { SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import { getFormattedTime } from '../../../utilities/dates'
import styles from './AlertEvent.module.css'

export default function AlertEvent ({ time, value, delta, label }) {
  let unit = 'MB'
  if (label.startsWith('ELU')) {
    unit = '%'
  }
  const iconElement = label === 'Heap' ? <Icons.HeartBeatIcon size={SMALL} color={WHITE} /> : <Icons.TechIcon size={SMALL} color={WHITE} />

  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <p className={styles.label}>
          {iconElement}
          {label}
        </p>
        <p className={styles.time}>{getFormattedTime(time)}</p>
      </div>
      <div className={styles.right}>
        <p className={styles.value}>{value} {unit}</p>
      </div>
    </div>
  )
}
