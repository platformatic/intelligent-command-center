import React, { useEffect, useMemo, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import { getScalingEvents } from '~/api/autoscaler'
import Paginator from '~/components/ui/Paginator'
import ScalingEventItem from './ScalingEventItem'
import ScalingEventDetail from './ScalingEventDetail'
import styles from './HistoryTab.module.css'

const PAGE_SIZE = 10

const TIMEFRAMES = [
  { label: 'All time', ms: 0 },
  { label: 'Last hour', ms: 3_600_000 },
  { label: 'Last 6 hours', ms: 6 * 3_600_000 },
  { label: 'Last 12 hours', ms: 12 * 3_600_000 },
  { label: 'Last 24 hours', ms: 24 * 3_600_000 }
]

const DIRECTION_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'up', label: 'Scale Up' },
  { key: 'down', label: 'Scale Down' }
]

export default function HistoryTab ({ appId, services }) {
  const [allEvents, setAllEvents] = useState([])
  const [selectedService, setSelectedService] = useState('all')
  const [directionFilter, setDirectionFilter] = useState('all')
  const [timeframeMs, setTimeframeMs] = useState(TIMEFRAMES[0].ms)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (!appId) return
    getScalingEvents(appId).then(setAllEvents)
  }, [appId])

  const filtered = useMemo(() => {
    const cutoff = timeframeMs > 0 ? Date.now() - timeframeMs : null
    return allEvents
      .filter(e => {
        if (cutoff !== null && e.timestamp < cutoff) return false
        if (directionFilter !== 'all' && e.direction !== directionFilter) return false
        if (selectedService !== 'all') {
          if (e.allServices) return false
          if (e.serviceName !== selectedService) return false
        }
        return true
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [allEvents, selectedService, directionFilter, timeframeMs])

  // Reset to page 0 when filters change
  useEffect(() => { setPage(0) }, [selectedService, directionFilter, timeframeMs])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleSelectEvent (event) {
    setSelectedEvent(prev => prev === event ? null : event)
  }

  return (
    <div className={styles.container}>
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite70} ${styles.filterLabel}`}>Application</span>
          <select
            className={styles.dropdown}
            value={selectedService}
            onChange={e => setSelectedService(e.target.value)}
          >
            <option value='all'>All applications</option>
            {(services || []).map(svc => (
              <option key={svc} value={svc}>{svc}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite70} ${styles.filterLabel}`}>Event</span>
          <div className={styles.directionFilter}>
            {DIRECTION_FILTERS.map(f => (
              <button
                key={f.key}
                type='button'
                className={`${styles.filterBtn} ${directionFilter === f.key ? styles.filterBtnActive : ''}`}
                onClick={() => setDirectionFilter(f.key)}
              >
                <span className={typographyStyles.desktopBodySmall}>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite70} ${styles.filterLabel}`}>Time Frame</span>
          <select
            className={styles.dropdown}
            value={timeframeMs}
            onChange={e => setTimeframeMs(Number(e.target.value))}
          >
            {TIMEFRAMES.map(tf => (
              <option key={tf.ms} value={tf.ms}>{tf.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.columns}>
        <div className={styles.eventList}>
          {filtered.length === 0
            ? (
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70} ${styles.empty}`}>
                No events in this period
              </span>
              )
            : (
              <>
                <div className={styles.eventItems}>
                  {paginated.map((event) => (
                    <ScalingEventItem
                      key={event.id}
                      event={event}
                      timestampMode='absolute'
                      selected={selectedEvent === event}
                      onClick={() => handleSelectEvent(event)}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className={styles.paginatorRow}>
                    <Paginator
                      pagesNumber={totalPages}
                      selectedPage={page}
                      onClickPage={setPage}
                    />
                  </div>
                )}
              </>
              )}
        </div>

        <div className={styles.detailPanel}>
          {selectedEvent
            ? <ScalingEventDetail event={selectedEvent} appId={appId} />
            : (
              <div className={styles.detailEmpty}>
                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>
                  Select an event to see details
                </span>
              </div>
              )}
        </div>
      </div>
    </div>
  )
}
