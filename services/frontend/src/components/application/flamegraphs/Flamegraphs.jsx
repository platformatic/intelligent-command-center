import React, { useEffect, useState, useRef } from 'react'
import { useLoaderData, useNavigate, generatePath, useRouteLoaderData } from 'react-router-dom'
import { DULLS_BACKGROUND_COLOR, MEDIUM, RICH_BLACK, SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import { Button } from '@platformatic/ui-components'
import Icons from '@platformatic/ui-components/src/components/icons'

import styles from './Flamegraphs.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { getFormattedTimeAndDate } from '~/utilities/dates'
import dayjs from 'dayjs'
import callApi from '~/api/common'
import useSubscribeToUpdates from '~/hooks/useSubscribeToUpdates'
import ExperimentalTag from '@platformatic/ui-components/src/components/ExperimentalTag'

export default function Flamegraphs () {
  const { flamegraphs, pods } = useLoaderData()
  const [currentFlamegraphs, setCurrentFlamegraphs] = useState(flamegraphs)
  const { application } = useRouteLoaderData('appRoot')
  const [collectingCpu, setCollectingCpu] = useState(false)
  const [collectingHeap, setCollectingHeap] = useState(false)
  const [rows, setRows] = useState([])
  const [scaleEventId] = useState(null) // TODO: add setScaleEventId function when needed.
  const { lastMessage } = useSubscribeToUpdates('flamegraphs')

  // Use refs to track collection state without causing re-renders
  const isCollectingRef = useRef(false)
  const collectedProfilesRef = useRef([])
  const expectedServicesRef = useRef([])
  const timeoutRef = useRef(null)
  useEffect(() => {
    if (lastMessage !== null) {
      const message = JSON.parse(lastMessage.data)
      if (message.type === 'flamegraph-created') {
        // Always update the flamegraphs list for UI
        setCurrentFlamegraphs(prev => [...prev, message.data])

        // Only track collection if we're actively collecting
        if (isCollectingRef.current) {
          collectedProfilesRef.current = [...collectedProfilesRef.current, message.data.serviceId]
          // Check if we've collected all expected profiles
          const missingServices = expectedServicesRef.current.filter(
            serviceId => !collectedProfilesRef.current.includes(serviceId)
          )

          if (missingServices.length === 0) {
            // All profiles collected, clear timeout and reset
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
              timeoutRef.current = null
            }
            resetCollectionState()
          }
        }
      }
    }
  }, [lastMessage])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (currentFlamegraphs.length > 0) {
      // TODO:  get all the scale events id for the current flamegraphs
      // setScaleEventId(currentFlamegraphs[0].alertId)
    }
  }, [currentFlamegraphs])

  function getFlamegraphsForRow (row) {
    const [date, alertId] = row.split('|')
    return currentFlamegraphs.filter((flamegraph) => {
      if (alertId) {
        return flamegraph.alertId === alertId && dayjs(flamegraph.createdAt).format('YYYY-MM-DD HH:mm:ss') === date
      }
      return dayjs(flamegraph.createdAt).format('YYYY-MM-DD HH:mm:ss') === date
    })
  }

  useEffect(() => {
    if (currentFlamegraphs.length === 0) {
      return
    }
    const tempRows = []
    currentFlamegraphs.forEach((fg) => {
      const fgDate = dayjs(fg.createdAt).format('YYYY-MM-DD HH:mm:ss')
      if (fg.alertId) {
        const id = `${fgDate}|${fg.alertId}`
        if (!tempRows.includes(id)) {
          tempRows.push(id)
        }
      } else {
        if (!tempRows.includes(fgDate)) {
          tempRows.push(fgDate)
        }
      }
    })
    // order temprows by date, newest first
    tempRows.sort().reverse()
    setRows(tempRows)
  }, [currentFlamegraphs])

  async function refreshFlamegraphs () {
    const flamegraphs = await callApi('scaler', `flamegraphs?where.applicationId.eq=${application.id}`, 'GET')
    setCurrentFlamegraphs(flamegraphs)
  }

  function resetCollectionState () {
    isCollectingRef.current = false
    collectedProfilesRef.current = []
    expectedServicesRef.current = []
  }

  async function collectProfile (command, setCollecting) {
    let collected = false
    setCollecting(true)

    // Initialize collection tracking
    const services = application.state.services
    isCollectingRef.current = true
    collectedProfilesRef.current = []
    expectedServicesRef.current = services.map(service => service.id)

    // call this api for each pod until we get a 200 response
    // we do this because it may happen that a pod is 'running' in our db
    // but it's not actually running in k8s
    for (const pod of pods) {
      try {
        const res = await callApi('', `/api/pods/${pod.podId}/command`, 'POST', {
          command
        })
        if (res.success) {
          collected = true
          break
        }
      } catch (error) {
        // do nothing
      }
    }

    setCollecting(false)

    if (!collected) {
      resetCollectionState()
      window.alert(`No ${command === 'trigger-heapprofile' ? 'heap profiles' : 'CPU profiles'} collected`)
      return
    }

    // Set timeout to check for missing services after 1000ms
    timeoutRef.current = setTimeout(() => {
      // check if all entries in expectedServices are in collectedProfiles
      const missingServices = expectedServicesRef.current.filter(
        serviceId => !collectedProfilesRef.current.includes(serviceId)
      )

      if (missingServices.length > 0) {
        console.log('cannot collect profile for these services: ', missingServices.join(', '))
        window.alert(`Could not collect profiles for applications: ${missingServices.join(', ')}. \n Hint: if ELU is low, CPU profiling is not available.`)
      }

      resetCollectionState()
      refreshFlamegraphs()
    }, 1000)
  }

  function renderRow (row) {
    const [date, alertId] = row.split('|')
    const flamegraphs = getFlamegraphsForRow(row)
    return (
      <div key={row} className={styles.flamegraphItem}>
        <FlamegraphRow
          key={row}
          date={date}
          flamegraphs={flamegraphs}
          application={application}
          alertId={alertId}
          scaleEventId={scaleEventId}
        />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
          <Icons.FlamegraphsIcon color={WHITE} size={MEDIUM} />
          <h1 className={typographyStyles.desktopBodyLargeSemibold}>Flamegraphs</h1>
          <ExperimentalTag />
        </div>

        <div className={commonStyles.tinyFlexRow}>
          <Button
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.mediumButtonPadding}
            label={collectingCpu ? 'Collecting CPU profile...' : 'Get CPU profile'}
            onClick={() => collectProfile('trigger-flamegraph', setCollectingCpu)}
            disabled={collectingCpu || collectingHeap}
            color={WHITE}
            backgroundColor={RICH_BLACK}
            hoverEffect={DULLS_BACKGROUND_COLOR}
          />
          <Button
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.mediumButtonPadding}
            label={collectingHeap ? 'Collecting heap profile...' : 'Get heap profile'}
            onClick={() => collectProfile('trigger-heapprofile', setCollectingHeap)}
            disabled={collectingCpu || collectingHeap}
            color={WHITE}
            backgroundColor={RICH_BLACK}
            hoverEffect={DULLS_BACKGROUND_COLOR}
          />
        </div>
      </div>
      <div className={styles.flamegraphsContainer}>
        {rows.map((row) => renderRow(row))}
      </div>
    </div>
  )
}

function FlamegraphRow ({ date, flamegraphs, application, alertId = null, scaleEventId = null }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  const rowIcon = alertId
    ? <Icons.GearAlertIcon color={WHITE} size={MEDIUM} />
    : <Icons.GearUserIcon color={WHITE} size={MEDIUM} />

  return (
    <div className={styles.row} onClick={() => setExpanded(!expanded)}>
      <div className={styles.rowHeader}>
        <div>
          {rowIcon}
          <div className={styles.date}>{getFormattedTimeAndDate(date)}</div>
          {scaleEventId && (
            <div className={styles.link}>View Scaling Event</div>
          )}
        </div>
        <div>
          {expanded && (
            <Icons.ArrowDownIcon color={WHITE} size={MEDIUM} />
          )}
          {!expanded && (
            <Icons.ArrowRightIcon color={WHITE} size={MEDIUM} />
          )}
        </div>
      </div>
      {expanded && (
        <div className={styles.expandedContent}>
          <div>
            {flamegraphs.map((fg) => (
              <div key={fg.id} className={styles.flamegraph}>
                <div key={fg.id} className={styles.flamegraphDetails}>
                  <div>
                    <span className={styles.label}>Application:</span>
                    <div className={styles.value}>{fg.serviceId}</div>
                  </div>
                  <div className={styles.separator}>|</div>
                  <div>
                    <span className={styles.label}>Pod ID:</span>
                    <div className={styles.value}>{fg.podId}</div>
                  </div>
                  <div className={styles.separator}>|</div>
                  <div>
                    <span className={styles.label}>Type:</span>
                    <div className={styles.value}>{fg.profileType || 'cpu'}</div>
                  </div>
                </div>
                <div
                  className={styles.flamegraphLink} onClick={(e) => {
                    e.stopPropagation()
                    const newPath = generatePath('/watts/:applicationId/flamegraphs/:flamegraphId', {
                      applicationId: application.id,
                      flamegraphId: fg.id
                    })
                    navigate(newPath)
                  }}
                >
                  View Flamegraph <Icons.InternalLinkIcon
                    color={WHITE} size={SMALL}
                                  />
                </div>
              </div>

            ))}
          </div>
        </div>
      )}
    </div>
  )
}
