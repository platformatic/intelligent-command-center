import React, { useEffect, useMemo, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import { getPlannerHistory, getPlannerPredictions, getApplicationPatternConfigs } from '~/api/autoscaler'
import PlannerLegend from './PlannerLegend'
import PlannerColumn from './PlannerColumn'
import PlannerSidebar from './PlannerSidebar'
import { HOURS, addDays, isoWeekStart, buildWeeks, groupTimeWindowStats } from './plannerUtils'
import styles from './PlannerTab.module.css'

export default function PlannerTab ({ appId }) {
  const [data, setData] = useState([])
  const [hoverState, setHoverState] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [categoryConfig, setCategoryConfig] = useState(null)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // last week Mon → 2 weeks from now Sun (4 complete ISO weeks, always 28 days)
  const rangeStart = useMemo(() => addDays(isoWeekStart(today), -7), [today])
  const rangeEnd = useMemo(() => addDays(isoWeekStart(today), 20), [today])

  useEffect(() => {
    if (!appId) return
    const now = new Date()
    const twoWeeksAgo = addDays(now, -14)

    Promise.all([
      getPlannerHistory(appId, twoWeeksAgo.toISOString(), now.toISOString()),
      getPlannerPredictions(appId, now.toISOString(), rangeEnd.toISOString()),
      getApplicationPatternConfigs(appId)
    ]).then(([history, predictions, config]) => {
      setData(groupTimeWindowStats([...history, ...predictions]))
      setCategoryConfig(config)
    })
  }, [appId, rangeEnd])

  const dataByDate = useMemo(
    () => Object.fromEntries(data.map(d => [d.date, d])),
    [data]
  )

  const weeks = useMemo(() => buildWeeks(rangeStart, rangeEnd), [rangeStart, rangeEnd])

  return (
    <div className={styles.container}>
      {/* ── Left side: Header and Calendar ── */}
      <div className={styles.leftContent}>
        {/* ── Top bar ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>
              Planner
            </span>
            <PlannerLegend categoryConfig={categoryConfig} />
          </div>
          <div className={styles.headerRight}>
            <button
              type='button'
              className={styles.btnOutlined}
              onClick={() => setSidebarOpen(true)}
            >
              <svg width='14' height='14' viewBox='0 0 14 14' fill='none' className={styles.btnIcon}>
                <circle cx='7' cy='7' r='5.5' stroke='currentColor' strokeWidth='1.2' />
                <path d='M7 4.5v3l1.5 1.5' stroke='currentColor' strokeWidth='1.2' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
              <span className={typographyStyles.desktopBodySmall}>Suggestions & Scheduled Events</span>
            </button>
            <button
              type='button'
              className={styles.btnFilled}
              onClick={() => window.alert('Schedule Events')}
            >
              <span className={typographyStyles.desktopBodySmall}>Schedule Events</span>
            </button>
          </div>
        </div>

        {/* ── Calendar ──
            --col-header-h is a CSS variable consumed by PlannerColumn.module.css
            to keep the column header height and the hour-label spacer in sync. */}
        <div className={styles.content}>
          <div className={styles.grid}>
            <div className={styles.hourLabels}>
              <div className={styles.hourLabelSpacer} />
              {HOURS.map(h => (
                <div key={h} className={styles.hourLabel}>
                  <span className={`${styles.hourLabelText} ${typographyStyles.textWhite70}`}>{h}</span>
                </div>
              ))}
            </div>

            <div className={styles.columns} onMouseLeave={() => setHoverState(null)}>
              {weeks.map((days, wi) => (
                <PlannerColumn
                  key={wi}
                  days={days}
                  dataByDate={dataByDate}
                  today={today}
                  hoverState={hoverState}
                  setHoverState={setHoverState}
                  categoryConfig={categoryConfig}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right side: Sidebar ── */}
      {sidebarOpen && (
        <PlannerSidebar appId={appId} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
