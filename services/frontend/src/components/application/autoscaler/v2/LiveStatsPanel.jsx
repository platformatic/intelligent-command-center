import React, { useEffect, useState } from 'react'
import Icons from '@platformatic/ui-components/src/components/icons'
import { MAIN_GREEN, MEDIUM, SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import Hexagon from '../Hexagon'
import typographyStyles from '~/styles/Typography.module.css'
import { getAppCount, getScalingEvents } from '~/api/autoscaler'
import ScalingEventItem from './ScalingEventItem'
import styles from './LiveStatsPanel.module.css'
import { unitPluralCap } from './unitLabel'

function StatCard ({ title, children }) {
  return (
    <div className={styles.statCard}>
      <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>
        {title}
      </span>
      <div className={styles.cardBody}>
        {children}
      </div>
    </div>
  )
}

function PodsUsageCard ({ count }) {
  if (!count) return <StatCard title={`${unitPluralCap} Usage`}><span className={styles.loading}>—</span></StatCard>

  const current = count.history.length > 0
    ? count.history[count.history.length - 1].count
    : '—'

  return (
    <StatCard title={`${unitPluralCap} Usage`}>
      <span className={`${typographyStyles.desktopHeadline3} ${typographyStyles.textWhite}`}>
        {current}
      </span>
      <div className={styles.podsMeta}>
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>
          min <strong className={typographyStyles.textWhite}>{count.minPods}</strong>
        </span>
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>
          max <strong className={typographyStyles.textWhite}>{count.maxPods}</strong>
        </span>
      </div>
    </StatCard>
  )
}

function InitStatisticsCard ({ count }) {
  if (!count) return <StatCard title='Init time'><span className={styles.loading}>—</span></StatCard>

  const seconds = Math.round(count.initTimeoutMs / 1000)

  return (
    <StatCard title='Init time'>
      <span className={`${typographyStyles.desktopHeadline3} ${typographyStyles.textWhite} ${styles.initValue}`}>
        {seconds}&quot;
      </span>
    </StatCard>
  )
}

function PodsScheduledCard ({ count }) {
  if (!count) return <StatCard title={`${unitPluralCap} Scheduled`}><span className={styles.loading}>—</span></StatCard>

  const from = count.history.length > 0 ? count.history[count.history.length - 1].count : 0
  const to = count.prediction.length > 0 ? count.prediction[count.prediction.length - 1].count : from
  const delta = to - from
  const deltaLabel = delta > 0 ? `+ ${delta}` : String(delta)

  return (
    <StatCard title={`${unitPluralCap} Scheduled`}>
      <div className={styles.mathRow}>
        <Hexagon number={from} color={WHITE} borderColor={WHITE} />
        <Icons.ArrowRightIcon size={SMALL} color={WHITE} />
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{deltaLabel}</span>
        <Icons.ArrowRightIcon size={SMALL} color={WHITE} />
        <Hexagon number={to} color='tertiary-blue' borderColor='tertiary-blue' />
      </div>
    </StatCard>
  )
}

const WINDOW_MS = 90_000

export default function LiveStatsPanel ({ appId, onViewHistory, tick }) {
  const [count, setCount] = useState(null)
  const [allEvents, setAllEvents] = useState([])

  useEffect(() => {
    if (!appId) return
    let cancelled = false

    async function fetchAll () {
      const [countData, eventsData] = await Promise.all([
        getAppCount(appId),
        getScalingEvents(appId)
      ])
      if (!cancelled) {
        if (countData) setCount(countData)
        setAllEvents(eventsData)
      }
    }

    fetchAll()
    return () => { cancelled = true }
  }, [appId, tick])

  const recentEvents = allEvents.filter(e => e.timestamp >= Date.now() - WINDOW_MS)

  return (
    <div className={styles.panel}>
      <div className={styles.statsRow}>
        <PodsUsageCard count={count} />
        <InitStatisticsCard count={count} />
        <PodsScheduledCard count={count} />
      </div>

      <div className={styles.historySection}>
        <div className={styles.historyHeader}>
          <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>
            Events
          </span>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>
            last 90s
          </span>
          <button
            type='button'
            className={styles.viewHistoryButton}
            onClick={onViewHistory}
          >
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>
              View Full History
            </span>
            <Icons.ArrowRightIcon size={SMALL} color={WHITE} />
          </button>
        </div>
        <div className={styles.historyBody}>
          {recentEvents.length === 0
            ? (
              <div className={styles.emptyState}>
                <Icons.CircleCheckMarkIcon size={MEDIUM} color={MAIN_GREEN} />
                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>
                  No events in the last 90 seconds
                </span>
              </div>
              )
            : recentEvents.map((event, i) => (
              <ScalingEventItem key={i} event={event} />
            ))}
        </div>
      </div>
    </div>
  )
}
