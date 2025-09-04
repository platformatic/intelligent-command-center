import React, { useEffect, useState } from 'react'
import AutoscalerEventsTable from './AutoscalerEventsTable'
import styles from './ScalerEvents.module.css'
import AutoscalerHistory from './AutoscalerHistory'
import { LoadingSpinnerV2 } from '@platformatic/ui-components'
import ScalerPill from './ScalerPill'
import { getFormattedTimeAndDate } from '../../../utilities/dates'
import { SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import Hexagon from './Hexagon'
import AlertEvent from './AlertEvent'
import { useSearchParams } from 'react-router-dom'

function EventsTableContainer ({ applicationId, deploymentId, limit = 10 }) {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId')

  function handleSelectEvent (event) {
    setSelectedEvent(event)
  }

  return (
    <div className={styles.container}>
      <div className={styles.title}>Past Scaling Events</div>
      <div className={styles.eventsTableContainer}>
        <AutoscalerEventsTable
          applicationId={applicationId}
          deploymentId={deploymentId}
          limit={limit}
          onSelectEvent={handleSelectEvent}
          selectedEventId={eventId}
          onEventLoaded={setSelectedEvent}
        />
        {selectedEvent && (
          <ScalerEventDetails event={selectedEvent} />
        )}
      </div>

    </div>
  )
}
export default function ScalerEvents ({ applicationId, deploymentId, limit = 10 }) {
  return (
    <div className={styles.scalerEventsContainer}>
      <AutoscalerHistory applicationId={applicationId} />
      <EventsTableContainer applicationId={applicationId} deploymentId={deploymentId} limit={limit} />

    </div>
  )
}

function renderMathElements (event) {
  const finalValue = event.values[0]
  const delta = event.replicasDiff
  const initialValue = finalValue - delta
  const deltaLabel = delta > 0 ? `+ ${delta}` : delta
  return (
    <>
      <Hexagon number={initialValue} color={WHITE} borderColor={WHITE} />
      <Icons.ArrowRightIcon size={SMALL} color={WHITE} />
      <span className={styles.mathText}>{deltaLabel}</span>
      <Icons.ArrowRightIcon size={SMALL} color={WHITE} />
      <Hexagon number={finalValue} color='tertiary-blue' borderColor='tertiary-blue' />
    </>
  )
}
function ScalerEventDetails ({ event }) {
  const [eventDetails, setEventDetails] = useState(null)
  async function loadEventDetails () {
    // TODO: get event details from API
    // const response = await getScalingHistory(event.id)
    setEventDetails({
      ...event,
      pods: []
      // pods: [
      //   {
      //     id: 'xyz-123',
      //     heap: {
      //       value: 1024,
      //       delta: 250
      //     },
      //     elu: {
      //       value: 0.875,
      //       delta: 0.075
      //     }
      //   },
      //   {
      //     id: 'abc-456',
      //     heap: {
      //       value: 512,
      //       delta: 125
      //     },
      //     elu: {
      //       value: 0.75,
      //       delta: 0.025
      //     }
      //   }
      // ]
    })
  }

  useEffect(() => {
    loadEventDetails()
  }, [event])
  if (eventDetails === null) {
    return <LoadingSpinnerV2 />
  }

  return (
    <div className={styles.eventDetailsContainer}>
      <p className={styles.title}>Event Details</p>
      <div className={styles.eventDetailsHeader}>
        <div className={styles.eventDetailsHeaderLeft}>
          <ScalerPill direction={eventDetails.direction} />
          <span className={styles.at}> at </span>
          <span className={styles.eventDetailsHeaderTime}>{getFormattedTimeAndDate(eventDetails.time)}</span>
        </div>
        <div className={styles.eventDetailsHeaderRight}>
          <div className={styles.math}>
            {renderMathElements(eventDetails)}
          </div>
        </div>
      </div>
      <div className={styles.content}>
        {eventDetails.pods.length === 0 && (
          <div className={styles.reason}>
            <p className={styles.reasonText}>{eventDetails.reason}</p>
          </div>
        )}
        {eventDetails.pods.length > 0 && eventDetails.pods.map(pod => (
          <PodDetails key={pod.id} pod={pod} time={eventDetails.time} />
        ))}
      </div>
    </div>
  )
}

function PodDetails ({ pod, time }) {
  return (
    <div className={styles.podDetails}>
      <div className={styles.podDetailsHeader}>
        <p className={styles.podDetailsTitle}>Pod </p>
        <p className={styles.podDetailsId}>{pod.id}</p>
      </div>
      <div className={styles.metrics}>
        <AlertEvent time={time} value={pod.heap.value} delta={pod.heap.delta} label='Heap' />
        <AlertEvent time={time} value={pod.elu.value} delta={pod.elu.delta} label='ELU' />
      </div>
    </div>
  )
}

// function Metric ({ time, value, delta, label }) {
//   let unit = 'MB'
//   if (label === 'ELU') {
//     unit = '%'
//   }
//   const iconElement = label === 'Heap' ? <Icons.HeartBeatIcon size={SMALL} color={WHITE} /> : <Icons.TechIcon size={SMALL} color={WHITE} />

//   return (
//     <div className={styles.metric}>
//       <div className={styles.metricLeft}>
//         <p className={styles.metricLabel}>
//           {iconElement}
//           {label}
//         </p>
//         <p className={styles.metricTime}>{getFormattedTime(time)}</p>
//       </div>
//       <div className={styles.metricRight}>
//         <p className={styles.metricValue}>{value} {unit}</p>
//         <p className={styles.metricDelta}>+ {delta} {unit}</p>
//       </div>
//     </div>
//   )
// }
