import React, { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { RICH_BLACK, WHITE, TRANSPARENT, MARGIN_0, OPACITY_15 } from '@platformatic/ui-components/src/components/constants'
import styles from './PodLogs.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import { BorderedBox, Button, HorizontalSeparator } from '@platformatic/ui-components'
import ErrorComponent from '~/components/errors/ErrorComponent'
import Log from './Log'
import {
  PRETTY,
  RAW,
  DIRECTION_UP,
  DIRECTION_DOWN,
  DIRECTION_STILL,
  DIRECTION_TAIL,
  STATUS_PAUSED_LOGS,
  STATUS_RESUMED_LOGS
} from '~/ui-constants'
import LogFilterSelector from './LogFilterSelector'
import useOnScreen from '~/hooks/useOnScreen'

const PodLogs = React.forwardRef(({
  podId,
  applicationId,
  taxonomyId,
  filteredServices
}, ref) => {
  const [displayLog, setDisplayLog] = useState(PRETTY)
  const [filterLogsByLevel, setFilterLogsByLevel] = useState('')
  const [scrollDirection, setScrollDirection] = useState(DIRECTION_TAIL)
  const [applicationLogs, setPodLogs] = useState([])
  const [filteredLogs, setFilteredLogs] = useState([])
  const [filtersInitialized, setFiltersInitialized] = useState(false)
  const logContentRef = useRef()
  const [lastScrollTop, setLastScrollTop] = useState(0)
  const [displayGoToBottom, setDisplayGoToBottom] = useState(false)
  const [showPreviousLogs] = useState(false)
  const [statusPausedLogs, setStatusPausedLogs] = useState('')
  const [filteredLogsLengthAtPause, setFilteredLogsLengthAtPause] = useState(0)
  const bottomRef = useRef()
  const isBottomOnScreen = useOnScreen(bottomRef)
  let connectionStatus
  let lastMessageReceived = null
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(false)

  if (podId) {
    const origin = (new URL(window.location.href)).origin
    const wsProtocol = origin.split('//')[0] === 'https:' ? 'wss' : 'ws'
    const wsBaseUrl = `${wsProtocol}://${origin.split('//')[1]}`

    const socketUrl = `${wsBaseUrl}/log-proxy/logs/live`
    const { lastMessage, readyState } = useWebSocket(socketUrl, {
      queryParams: {
        applicationId,
        taxonomyId,
        instanceId: podId
      },
      onOpen () {
        console.log('opened websocket', socketUrl)
        // setInnerLoading(false)
      },
      onError (error) {
        console.error(`Error opening websocket ${error}`)
        console.error(error)
        setError(error)
        setShowErrorComponent(true)
      }
    })

    lastMessageReceived = lastMessage

    // eslint-disable-next-line no-unused-vars
    connectionStatus = {
      [ReadyState.CONNECTING]: 'Connecting',
      [ReadyState.OPEN]: 'Open',
      [ReadyState.CLOSING]: 'Closing',
      [ReadyState.CLOSED]: 'Closed',
      [ReadyState.UNINSTANTIATED]: 'Uninstantiated'
    }[readyState]
  } else {
    lastMessageReceived = null
  }

  useEffect(() => {
    if (lastMessageReceived?.data) {
      async function loadLogs () {
        try {
          const chunksLogs = lastMessageReceived.data
          if ((chunksLogs?.length ?? 0) > 0) {
            const newLogs = []
            for (const log of chunksLogs.split(/\r?\n/)) {
              newLogs.push(log)
            }
            setPodLogs([...applicationLogs, ...newLogs])
          }
        } catch (error) {
          console.error(`Error: ${error}`)
        }
      }
      loadLogs()
    }
  }, [lastMessageReceived])

  useEffect(() => {
    if (logContentRef.current && scrollDirection === DIRECTION_TAIL && filteredLogs.length > 0) {
      logContentRef.current.scrollTo({
        top: logContentRef.current.scrollHeight,
        left: 0,
        behavior: 'smooth'
      })
      if (statusPausedLogs === STATUS_PAUSED_LOGS) {
        setStatusPausedLogs(STATUS_RESUMED_LOGS)
      }
    }
    if (scrollDirection !== DIRECTION_TAIL) {
      setFilteredLogsLengthAtPause(filteredLogs.length)
    }
  }, [logContentRef, scrollDirection, filteredLogs])

  useEffect(() => {
    if (statusPausedLogs) {
      switch (statusPausedLogs) {
        case STATUS_PAUSED_LOGS:
          // callApiPauseLogs()
          console.log('pause TODO')
          break

        case STATUS_RESUMED_LOGS:
          console.log('resume TODO')
          // callApiResumeLogs()
          break

        default:
          break
      }
    }
  }, [statusPausedLogs])

  useEffect(() => {
    if (isBottomOnScreen && scrollDirection === DIRECTION_DOWN) {
      resumeScrolling()
    }
  }, [isBottomOnScreen, scrollDirection])

  useEffect(() => {
    if (applicationLogs.length > 0) {
      if (!filtersInitialized) {
        setFilterLogsByLevel(30)
        setFiltersInitialized(true)
        return
      }
      if (filterLogsByLevel || filteredServices.length >= 0) {
        let founds = [...applicationLogs]
        if (filterLogsByLevel) {
          founds = founds.filter(log => JSON.parse(log).level >= filterLogsByLevel)
        }
        if (filteredServices.length >= 0) {
          founds = founds.filter(log => filteredServices.includes(JSON.parse(log).name))
        }
        setFilteredLogs(founds)
      } else {
        setFilteredLogs([...applicationLogs])
      }
    }
  }, [
    applicationLogs,
    filtersInitialized,
    filterLogsByLevel,
    filteredServices
  ])

  useEffect(() => {
    if (scrollDirection !== DIRECTION_TAIL && filteredLogsLengthAtPause > 0 && filteredLogsLengthAtPause < filteredLogs.length) {
      setDisplayGoToBottom(true)
    }
  }, [scrollDirection, filteredLogs.length, filteredLogsLengthAtPause])

  function resumeScrolling () {
    setScrollDirection(DIRECTION_TAIL)
    setDisplayGoToBottom(false)
    setFilteredLogsLengthAtPause(0)
  }

  async function loadPreviousLogs () {
  }

  /* function onlyUnique (value, index, array) {
    return array.indexOf(value) === index
  } */

  function saveLogs () {
    let fileData = ''
    applicationLogs.forEach(log => {
      fileData += `${log}
`
    })

    const blob = new Blob([fileData], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `${podId}-${new Date().toISOString()}.logs`
    link.href = url
    link.target = '_blank'
    link.click()
  }

  function handlingClickArrow () {
    setScrollDirection(DIRECTION_STILL)
    setFilteredLogsLengthAtPause(filteredLogs.length)
  }

  function renderLogs () {
    if (displayLog === PRETTY) {
      return filteredLogs.map((log, index) => <Log key={`${index}-${filterLogsByLevel}`} log={log} display={displayLog} onClickArrow={() => handlingClickArrow()} />)
    }

    return (
      <span className={`${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}>
        {filteredLogs}
      </span>
    )
  }

  function handleScroll (event) {
    // setStatusPausedLogs(STATUS_PAUSED_LOGS)
    const st = event.currentTarget.scrollTop // Credits: "https://github.com/qeremy/so/blob/master/so.dom.js#L426"
    if (st > lastScrollTop) {
      // downscroll code
      if (scrollDirection !== DIRECTION_TAIL) {
        setScrollDirection(DIRECTION_DOWN)
      }
    } else if (st < lastScrollTop) {
      // upscroll code
      setScrollDirection(DIRECTION_UP)
    }
    setLastScrollTop(st <= 0 ? 0 : st)
  }

  if (showErrorComponent) {
    return <ErrorComponent error={error} onClickDismiss={() => setShowErrorComponent(false)} />
  }

  return (
    <div className={styles.container} ref={ref}>
      <div className={styles.content}>
        <div className={`${commonStyles.largeFlexBlock} ${commonStyles.fullWidth} ${styles.flexGrow}`}>
          <BorderedBox classes={styles.borderexBoxPodContainer} backgroundColor={RICH_BLACK} color={TRANSPARENT}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween} ${styles.lateralPadding} ${styles.top}`}>
              <span className={styles.select}>&nbsp;</span>
              <LogFilterSelector defaultLevelSelected={30} onChangeLevelSelected={(level) => setFilterLogsByLevel(level)} />
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.justifyEnd} ${styles.buttonContainer}`}>
                <Button
                  type='button'
                  paddingClass={commonStyles.smallButtonPadding}
                  label='Pretty'
                  onClick={() => setDisplayLog(PRETTY)}
                  color={WHITE}
                  backgroundColor={RICH_BLACK}
                  selected={displayLog === PRETTY}
                  textClass={typographyStyles.desktopButtonSmall}
                />
                <Button
                  type='button'
                  paddingClass={commonStyles.smallButtonPadding}
                  label='Raw'
                  onClick={() => setDisplayLog(RAW)}
                  color={WHITE}
                  backgroundColor={TRANSPARENT}
                  selected={displayLog === RAW}
                  textClass={typographyStyles.desktopButtonSmall}
                />
              </div>
            </div>
            <HorizontalSeparator marginBottom={MARGIN_0} color={WHITE} opacity={OPACITY_15} />
            <div className={`${styles.logsContainer} ${styles.lateralPadding}`} ref={logContentRef} onScroll={handleScroll}>
              {showPreviousLogs && (
                <div className={styles.previousLogContainer}>
                  <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.textCenter} ${commonStyles.fullWidth} `}><span className={`${commonStyles.cursorPointer} ${typographyStyles.textTertiaryBlue}`} onClick={() => loadPreviousLogs()}>Click Here</span> to load previous logs</p>
                </div>
              )}

              {filteredLogs?.length > 0 && (
                <>
                  <hr className={styles.logDividerTop} />
                  {renderLogs()}
                </>
              )}
              <div ref={bottomRef} className={styles.logDividerBottom} />
            </div>
            <HorizontalSeparator marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_15} />
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween} ${styles.lateralPadding} ${styles.bottom}`}>
              <div>&nbsp;</div>

              {displayGoToBottom
                ? (
                  <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>There are new logs. <span className={`${commonStyles.cursorPointer} ${typographyStyles.textTertiaryBlue}`} onClick={() => resumeScrolling()}>Go to the bottom</span> to resume</p>
                  )
                : (
                  <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textRichBlack}`}>There are new logs. Go to the bottom to resume</p>
                  )}
              <Button
                type='button'
                paddingClass={commonStyles.smallButtonPadding}
                label='Save Logs'
                onClick={() => saveLogs()}
                color={WHITE}
                backgroundColor={TRANSPARENT}
                textClass={typographyStyles.desktopButtonSmall}
              />
            </div>

          </BorderedBox>
        </div>
      </div>
    </div>
  )
})

PodLogs.propTypes = {
  /**
   * podId
    */
  podId: PropTypes.string,
  /**
   * applicationId
    */
  applicationId: PropTypes.string,
  /**
   * taxonomyId
    */
  taxonomyId: PropTypes.string
}
export default PodLogs
