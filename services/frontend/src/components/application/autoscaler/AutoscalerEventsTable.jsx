import React, { useEffect, useState } from 'react'
import styles from './AutoscalerEventsTable.module.css'
import { getScalingHistory } from '../../../api/autoscaler'
import { getFormattedTime } from '../../../utilities/dates'
import Paginator from '../../ui/Paginator'
import { REFRESH_INTERVAL_METRICS } from '~/ui-constants'
import ScalerPill from './ScalerPill'
import dayjs from 'dayjs'
import useRefreshData from '../../../hooks/useRefreshData'

const AutoscalerEventsTable = function ({ applicationId, rows = 10, limit = 10, onSelectEvent, selectedEventId, onEventLoaded }) {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [allEvents, setAllEvents] = useState([])
  const [totalCount, setTotalCount] = useState(null)
  const [page, setPage] = useState(0)
  const [groupedEvents, setGroupedEvents] = useState({})
  function groupEventsByDate (events) {
    return events.reduce((acc, event) => {
      const djs = dayjs(event.time)
      let date = djs.format('YYYY-MM-DD')
      // if date is today, use 'Today' string
      if (djs.isSame(dayjs(), 'day')) {
        date = 'Today'
      }

      // if date is yesterday, use 'Yesterday' string
      if (djs.isSame(dayjs().subtract(1, 'day'), 'day')) {
        date = 'Yesterday'
      }

      acc[date] = acc[date] || []
      acc[date].push(event)
      return acc
    }, {})
  }
  useRefreshData(REFRESH_INTERVAL_METRICS, loadScalerEvents)

  async function loadScalerEvents () {
    // if the the page is not the first one, or an event is selected, don't load the events
    if (page !== 0 || selectedEventId) {
      return
    }
    const response = await getScalingHistory(applicationId, limit)
    if (response.length > 0) {
      setAllEvents(response)
      setTotalCount(response.length)

      // Auto-select event if selectedEventId is provided
      if (selectedEventId && onEventLoaded) {
        const eventToSelect = response.find(event => event.id === selectedEventId)
        if (eventToSelect) {
          setSelectedEvent(eventToSelect)
          onSelectEvent(eventToSelect)
          onEventLoaded(eventToSelect)
        }
      }
    }
  }
  useEffect(() => {
    loadScalerEvents()
  }, [])
  useEffect(() => {
    const visibleEvents = allEvents.slice(page * rows, (page + 1) * rows)
    const groupedEvents = groupEventsByDate(visibleEvents)
    setGroupedEvents(groupedEvents)
  }, [page, allEvents])

  function handleSelectEvent (event) {
    if (selectedEvent?.id === event.id) {
      setSelectedEvent(null)
      onSelectEvent(null)
    } else {
      setSelectedEvent(event)
      onSelectEvent(event)
    }
  }

  function renderPill (event) {
    const direction = event.direction
    return <ScalerPill direction={direction} />
  }

  function renderDescription (event) {
    const direction = event.direction
    if (direction === 'up') {
      return `+${event.replicasDiff} Pods`
    }
    return `${event.replicasDiff} Pods`
  }

  function renderTotals (event) {
    const totalPods = event.values[0]
    return <span className={styles.totals}>(Totals: {totalPods})</span>
  }

  return (
    <div className={styles.container}>
      {Object.entries(groupedEvents).map(([date, events]) => (
        <div key={date} className={styles.date}>
          <span className={styles.dateText}>{date}</span>
          {events.map(event => (
            <div
              key={event.id}
              onClick={() => handleSelectEvent(event)}
              className={`${styles.row} ${selectedEvent?.id === event.id ? styles.selected : ''}`}
            >
              <div className={styles.leftPane}>
                <span className={styles.timestamp}>{getFormattedTime(event.time)}</span>
                {renderPill(event)}
              </div>
              <div className={styles.rightPane}>
                {renderDescription(event)}
                <span className={styles.timestamp}>{renderTotals(event)}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
      {/* {events.map(activity => (
        <div key={activity.id} onClick={() => handleSelectEvent(activity)} className={`${styles.row} ${selectedEvent?.id === activity.id ? styles.selected : ''}`}>
          <div className={styles.leftPane}>
            <span className={styles.timestamp}>{getFormattedTime(activity.time)}</span>
            {renderPill(activity)}

          </div>
          <div className={styles.rightPane}>
            {renderDescription(activity)}
            <span className={styles.timestamp}>{renderTotals(activity)}</span>
          </div>

        </div>
      ))} */}
      {totalCount > rows && (
        <Paginator
          pagesNumber={Math.ceil(totalCount / rows)}
          onClickPage={(page) => {
            setPage(page)
          }}
          selectedPage={page}
        />
      )}
    </div>
  )
}

export default AutoscalerEventsTable
