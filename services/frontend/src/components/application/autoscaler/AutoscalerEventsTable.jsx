import React, { useEffect, useState } from 'react'
import styles from './AutoscalerEventsTable.module.css'
import { getScalingHistory } from '../../../api/autoscaler'
import { getFormattedTime } from '../../../utilities/dates'
import Paginator from '../../ui/Paginator'
import { REFRESH_INTERVAL_METRICS } from '~/ui-constants'
import ScalerPill from './ScalerPill'
import dayjs from 'dayjs'

const AutoscalerEventsTable = function ({ applicationId, deploymentId, rows = 10, limit = 10, onSelectEvent, selectedEventId, onEventLoaded }) {
  // const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [totalCount, setTotalCount] = useState(null)
  const [page, setPage] = useState(0)
  const [startPolling/*, setStartPolling */] = useState(false)
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
  async function loadScalerEvents () {
    const response = await getScalingHistory(applicationId, limit)
    if (response.length > 0) {
      const visibleEvents = response.slice(page * rows, (page + 1) * rows)
      // setEvents(visibleEvents)
      const groupedEvents = groupEventsByDate(visibleEvents)
      setGroupedEvents(groupedEvents)
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
    loadScalerEvents().then(() => {
      // setStartPolling(true)
    })
  }, [page])

  useEffect(() => {
    let intervalId
    if (startPolling) {
      intervalId = setInterval(async () => await loadScalerEvents(), REFRESH_INTERVAL_METRICS)
    }
    return () => {
      return clearInterval(intervalId)
    }
  }, [startPolling])

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
    const replicas = event.values[0]
    if (direction === 'up') {
      return `+${replicas} Pods`
    }
    return `-${replicas} Pods`
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
          onClickPage={(page) => setPage(page)}
          selectedPage={page}
        />
      )}
    </div>
  )
}

export default AutoscalerEventsTable
