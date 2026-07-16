import React, { useEffect, useMemo, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import { getPlannerHistory, getPlannerPredictions, getApplicationPatternConfigs, getSuggestionDetails, getScheduledSlots } from '~/api/autoscaler'
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
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const [occurrenceIds, setOccurrenceIds] = useState(null)
  const [showDualValues, setShowDualValues] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

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
      getPlannerPredictions(appId, twoWeeksAgo.toISOString(), rangeEnd.toISOString()),
      getApplicationPatternConfigs(appId),
      // The resolved floor per slot from the accepted suggestions — future slots it covers are drawn
      // as SCHEDULED rather than as a forecast. Refetched on accept/cancel via `reloadKey`.
      getScheduledSlots(appId)
    ]).then(([history, predictions, config, scheduled]) => {
      setData(groupTimeWindowStats([...history, ...predictions], scheduled))
      setCategoryConfig(config)
    })
  }, [appId, rangeEnd, reloadKey])

  // The calendar rows a suggestion covers. The server DERIVES these ids from the suggestion's calendar
  // rule, so they arrive without it having to store them — and they stay correct after accepting.
  useEffect(() => {
    if (!appId || !selectedSuggestion) {
      setOccurrenceIds(null)
      return
    }
    let stale = false
    getSuggestionDetails(appId, selectedSuggestion.id).then(details => {
      if (!stale) setOccurrenceIds(new Set(details?.occurrences ?? []))
    })
    return () => { stale = true }
  }, [appId, selectedSuggestion])

  // Escape clears the selection too — the same affordance as clicking away from the card.
  useEffect(() => {
    if (!selectedSuggestion) return
    const onKeyDown = (e) => { if (e.key === 'Escape') setSelectedSuggestion(null) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedSuggestion])

  const dataByDate = useMemo(
    () => Object.fromEntries(data.map(d => [d.date, d])),
    [data]
  )

  const weeks = useMemo(() => buildWeeks(rangeStart, rangeEnd), [rangeStart, rangeEnd])

  return (
    // Clicking anywhere that is not a suggestion card clears the selection — the calendar, the header,
    // the sidebar chrome, the background. Cards stop their own clicks from reaching this.
    <div className={styles.container} onClick={() => setSelectedSuggestion(null)}>
      {/* ── Left side: Header and Calendar ── */}
      <div className={styles.leftContent}>
        {/* ── Top bar ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>
              Planner
            </span>
            <PlannerLegend categoryConfig={categoryConfig} showDualValues={showDualValues} onToggleDualValues={setShowDualValues} />
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
                  occurrenceIds={occurrenceIds}
                  showDualValues={showDualValues}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right side: Sidebar ── */}
      {sidebarOpen && (
        <PlannerSidebar
          appId={appId}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          selectedSuggestion={selectedSuggestion}
          onSelectSuggestion={setSelectedSuggestion}
          onChange={() => setReloadKey(k => k + 1)}
        />
      )}
    </div>
  )
}
