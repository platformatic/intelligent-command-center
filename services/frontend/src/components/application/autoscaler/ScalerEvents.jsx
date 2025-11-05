import React, { useEffect, useState } from 'react'
import AutoscalerEventsTable from './AutoscalerEventsTable'
import callApi from '~/api/common'

import AutoscalerHistory from './AutoscalerHistory'
import { LoadingSpinnerV2, Tooltip } from '@platformatic/ui-components'
import ScalerPill from './ScalerPill'
import { getFormattedTimeAndDate } from '../../../utilities/dates'
import { SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import Hexagon from './Hexagon'

import { useSearchParams } from 'react-router-dom'

import styles from './ScalerEvents.module.css'
import tooltipStyles from '~/styles/TooltipStyles.module.css'
import { toPercentage } from '../../../utils'
import useICCStore from '../../../useICCStore'

function EventsTableContainer ({ applicationId, deploymentId, limit = 10 }) {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId')

  const { config } = useICCStore()
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
          <ScalerEventDetails event={selectedEvent} scalerAlgorithmVersion={config['scaler-algorithm-version']} />
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
function ScalerEventDetails ({ event, scalerAlgorithmVersion }) {
  const [eventDetails, setEventDetails] = useState(null)
  const [signalsByPod, setSignalsByPod] = useState({})
  async function loadEventDetails () {
    let eventSignals = []
    const endpoint = scalerAlgorithmVersion === 'v2' ? '/signals' : '/alerts'
    eventSignals = await callApi('scaler', `${endpoint}?where.scaleEventId.eq=${event.id}`, 'GET')
    const signalsByPod = eventSignals.reduce((acc, signal) => {
      if (!acc[signal.podId]) {
        acc[signal.podId] = []
      }
      acc[signal.podId].push(signal)
      return acc
    }, {})
    setSignalsByPod(signalsByPod)
    setEventDetails({
      ...event,
      signals: eventSignals
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
        {eventDetails.signals.length === 0 && (
          <div className={styles.reason}>
            <p className={styles.reasonText}>{eventDetails.reason}</p>
          </div>
        )}
        {Object.keys(signalsByPod).map((podId) => (
          <SignalsFromPod
            key={podId}
            signals={signalsByPod[podId]}
            podId={podId}
            time={eventDetails.time}
            scalerAlgorithmVersion={scalerAlgorithmVersion}
          />
        ))}
        {/* {eventDetails.signals.length > 0 && eventDetails.signals.map(signal => (
          // <SignalDetails key={signal.id} signals={signalsByPod[signal.podId]} podId={signal.podId} time={eventDetails.time} />

          <SignalsFromPod key={signal.id} signals={signalsByPod[signal.podId]} podId={signal.podId} time={eventDetails.time} />
        ))} */}
      </div>
    </div>
  )
}

function SignalsFromPod ({ podId, signals, scalerAlgorithmVersion }) {
  function renderType (type) {
    return type.toUpperCase()
  }

  function renderValue (value, type) {
    if (type === 'elu') {
      return `${toPercentage(value)}%`
    } else {
      return value
    }
  }
  function renderSignal (sig) {
    if (scalerAlgorithmVersion === 'v2') {
      return (
        <div key={sig.id} className={styles.signalDetailsContainer}>
          <Tooltip
            tooltipClassName={tooltipStyles.limitedWidthTooltip}
            content={(<span>{sig.description}</span>)}
            offset={0}
            direction='top'
            immediateActive={false}
          >
            <div className={styles.signalDetails}>
              <div className={styles.signalDetailsHeader}>
                <div className={styles.signalDetailsHeaderLeft}>
                  <p className={styles.signalDetailsTitle}>{renderType(sig.type)}</p>
                  <p className={styles.signalDetailsServiceId}>({sig.serviceId})</p>
                </div>
                <div className={styles.signalDetailsValue}>
                  {renderValue(sig.value, sig.type)}
                </div>

              </div>
              <p className={styles.signalDetailsServiceId}>{getFormattedTimeAndDate(sig.createdAt)}</p>
            </div>
          </Tooltip>
        </div>
      )
    } else {
      return (
        <div key={sig.id} className={styles.signalDetailsContainer}>

          <div>
            <span>
              <Icons.HeartBeatIcon size={SMALL} color={WHITE} />
              ELU
            </span>
            <span>{toPercentage(sig.elu)} %</span>
          </div>
          <div>
            <span>
              <Icons.TechIcon size={SMALL} color={WHITE} />
              Heap
            </span>
            <span>{(sig.heapUsed / 1024 / 1024).toFixed(1)} MB</span>
          </div>

          <div className={styles.signalDetailsServiceId}>
            Application {sig.serviceId} generated this signal at {getFormattedTimeAndDate(sig.createdAt)}
          </div>
        </div>
      )
    }
  }
  function renderSignals () {
    return (
      <div className={styles.signalDetailsList}>
        <span className={styles.signalDetailsListTitle}>Signals List</span>
        {signals.map((sig) => {
          return renderSignal(sig)
        })}
      </div>

    )
  }

  return (
    <div className={styles.podDetails}>
      <div className={styles.podDetailsHeader}>
        <p className={styles.podDetailsTitle}>Pod </p>
        <p className={styles.podDetailsId}>{podId}</p>
      </div>
      <div className={styles.metrics}>
        {renderSignals()}
      </div>
    </div>
  )
}
