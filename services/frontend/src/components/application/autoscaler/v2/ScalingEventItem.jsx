import React from 'react'
import ScalerPill from '../ScalerPill'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './ScalingEventItem.module.css'
import { unitPluralCap } from './unitLabel'

export function timeAgo (ts) {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diff < 60) return `${diff}s ago`
  const m = Math.floor(diff / 60)
  const s = diff % 60
  return s ? `${m}m ${s}s ago` : `${m}m ago`
}

export function formatAbsolute (ts) {
  const d = new Date(ts)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `[${day}-${month}-${year} - ${hh}:${mm}:${ss}]`
}

export default function ScalingEventItem ({ event, timestampMode = 'relative', selected, onClick }) {
  const eluPct = event.metrics.elu != null ? Math.round(event.metrics.elu * 100) : null
  const serviceLabel = event.allServices ? 'All applications' : event.serviceName
  const timestamp = timestampMode === 'absolute' ? formatAbsolute(event.timestamp) : timeAgo(event.timestamp)

  return (
    <div
      className={`${styles.eventItem} ${selected ? styles.selected : ''} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
    >
      <div className={styles.eventHeader}>
        <ScalerPill direction={event.direction} />
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>
          {serviceLabel}
        </span>
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70} ${styles.eventTime}`}>
          {timestamp}
        </span>
      </div>
      <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70} ${styles.eventDescription}`}>
        {event.description}
      </p>
      <div className={styles.eventMetrics}>
        {eluPct != null && (
          <>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>
              ELU: <strong className={typographyStyles.textWhite}>{eluPct}%</strong>
            </span>
            <span className={styles.metricSep}>|</span>
          </>
        )}
        {event.metrics.heap != null && (
          <>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>
              Heap: <strong className={typographyStyles.textWhite}>{event.metrics.heap} MB</strong>
            </span>
            <span className={styles.metricSep}>|</span>
          </>
        )}
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>
          {unitPluralCap}: <strong className={typographyStyles.textWhite}>{event.metrics.pods.from} → {event.metrics.pods.to}</strong>
        </span>
      </div>
    </div>
  )
}
