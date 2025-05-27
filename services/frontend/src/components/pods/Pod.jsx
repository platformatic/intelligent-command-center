import React, { useEffect, useRef, useState } from 'react'
import styles from './Pod.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import { PlatformaticIcon } from '@platformatic/ui-components'
import { ERROR_RED, MINI, WARNING_YELLOW, WHITE, SMALL } from '@platformatic/ui-components/src/components/constants'
import {
  UP,
  DOWN,
  LOW_PERFORMANCE,
  GOOD_PERFORMANCE,
  STALE,
  UNKNOWN_PERFORMANCE
  // AUTOSCALER_POD_DETAIL_OVERVIEW_PATH,
  // PREVIEW_POD_DETAIL_OVERVIEW_PATH
} from '~/ui-constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import useICCStore from '~/useICCStore'
import { generatePath, useNavigate } from 'react-router-dom'
import { AUTOSCALER_POD_DETAIL_PATH } from '../../paths'

// import { useNavigate, useParams } from 'react-router-dom'
const DISPLAY_WIDE = 'DISPLAY_WIDE'
const DISPLAY_SMALL = 'DISPLAY_SMALL'
const DISPLAY_HIDDEN = 'HIDDEN'

function Pod ({
  id,
  fillingType = false,
  dataValues = {},
  performance = UNKNOWN_PERFORMANCE,
  applicationId,
  taxonomyId,
  fromPreview = false
}) {
  const navigate = useNavigate()
  const globalState = useICCStore()
  const { currentWindowWidth /* setCurrentPage */ } = globalState
  const [valueDisplayed, setValueDisplayed] = useState({})
  const [indexValueSelected, setValueIndexSelected] = useState(null)
  const [aspect, setAspect] = useState(DISPLAY_WIDE)
  const [elements, setElements] = useState([])
  const [dataValuesLoaded, setDataValuesLoaded] = useState(false)
  const podRef = useRef(null)
  // const taxonomyIdUsed = useParams().taxonomyId || taxonomyId
  // const applicationIdUsed = useParams().appId || applicationId
  // const navigate = useNavigate()

  useEffect(() => {
    setValueDisplayed(elements[indexValueSelected])
  }, [indexValueSelected])

  useEffect(() => {
    if (podRef?.current && currentWindowWidth > 0) {
      if (podRef.current.getBoundingClientRect().width < 124 || podRef.current.getBoundingClientRect().height < 124) {
        setAspect(DISPLAY_HIDDEN)
      } else {
        if (podRef.current.getBoundingClientRect().width > 156 || podRef.current.getBoundingClientRect().height > 156) {
          setAspect(DISPLAY_WIDE)
        } else {
          setAspect(DISPLAY_SMALL)
        }
      }
    }
  }, [podRef?.current, currentWindowWidth])

  useEffect(() => {
    if (elements.length === 0) {
      setElements([{
        key: `${id}-rss-` + new Date().toISOString(),
        label: 'RSS',
        internalKey: 'rss',
        direction: STALE,
        value: '-',
        unit: 'GB'
      }, {
        key: `${id}-totalHeap-` + new Date().toISOString(),
        label: 'Total Heap',
        internalKey: 'totalHeap',
        direction: STALE,
        value: '-',
        unit: 'GB'
      }, {
        key: `${id}-usedHeap-` + new Date().toISOString(),
        label: 'Heap Used',
        internalKey: 'usedHeap',
        direction: STALE,
        value: '-',
        unit: 'GB'
      }, {
        key: `${id}-cpu-` + new Date().toISOString(),
        label: 'CPU Usage',
        internalKey: 'cpu',
        direction: STALE,
        value: '-',
        unit: '%'
      }, {
        key: `${id}-eventLoop-` + new Date().toISOString(),
        label: 'ELU',
        internalKey: 'eventLoop',
        direction: STALE,
        value: '-',
        unit: '%'
      }])
      setValueIndexSelected(0)
    }
  }, [elements])

  useEffect(() => {
    if (id && Object.keys(dataValues).length > 0 && elements.length > 0 && !dataValuesLoaded) {
      const newValues = []

      Object.keys(dataValues).forEach(key => {
        const el = elements.find(value => value.internalKey === key)
        if (el) {
          const { label, unit, value, internalKey } = el

          newValues.push({
            key: `${id}-${internalKey}-` + new Date().toISOString(),
            label,
            unit,
            internalKey,
            value: dataValues[`${key}`] === null ? '-' : dataValues[`${key}`],
            direction: value !== '-' ? (dataValues[`${key}`] > value ? UP : DOWN) : STALE
          })
        }
      })
      setElements([...newValues])
      setValueDisplayed({ ...newValues[0] })
      setDataValuesLoaded(true)
    }
  }, [id, Object.keys(dataValues), elements, dataValuesLoaded])

  function displayValue (value = '-') {
    if (value === '-' || value === null) {
      return value
    }
    return `${value.toFixed(2)}`
  }

  function getTypographyStyleColor () {
    if (performance === UNKNOWN_PERFORMANCE) {
      return typographyStyles.textWhite
    }
    if (performance === LOW_PERFORMANCE) {
      return typographyStyles.textErrorRed
    }
    if (performance === GOOD_PERFORMANCE) {
      return typographyStyles.textWarningYellow
    }
    return typographyStyles.textMainGreen
  }

  function nextValue (event) {
    event.stopPropagation()
    let nextValue = indexValueSelected + 1
    if (nextValue > 4) {
      nextValue = 0
    }
    setValueIndexSelected(nextValue)
  }
  function prevValue (event) {
    event.stopPropagation()
    let nextValue = indexValueSelected - 1
    if (nextValue < 0) {
      nextValue = 4
    }
    setValueIndexSelected(nextValue)
  }

  function handleClickSvg (event) {
    // event.stopPropagation()
    navigate(generatePath(AUTOSCALER_POD_DETAIL_PATH, { applicationId, podId: id }))
    // THIS IS NOT WORKING: TODO: FIX IT
    // if (fromPreview) {
    //   navigate(PREVIEW_POD_DETAIL_OVERVIEW_PATH.replace(':taxonomyId', taxonomyIdUsed).replace(':appId', applicationIdUsed).replace(':podId', id))
    //   setCurrentPage(PREVIEW_POD_DETAIL_OVERVIEW_PATH)
    // } else {
    //   navigate(AUTOSCALER_POD_DETAIL_OVERVIEW_PATH.replace(':taxonomyId', taxonomyIdUsed).replace(':appId', applicationIdUsed).replace(':podId', id))
    //   setCurrentPage(AUTOSCALER_POD_DETAIL_OVERVIEW_PATH)
    // }
  }

  function getSvgStyle () {
    if (performance === UNKNOWN_PERFORMANCE) {
      return styles.svgUnknownPerformance
    }
    if (performance === LOW_PERFORMANCE) {
      return styles.svgLowPerformance
    }
    if (performance === GOOD_PERFORMANCE) {
      return styles.svgGoodPerformance
    }
    return styles.svgGreatPerformance
  }

  function renderComponent () {
    if (fillingType) {
      return (
        <svg width='100%' height='100%' viewBox='0 0 228 262' fill='none' xmlns='http://www.w3.org/2000/svg' className={styles.svgFillingType}>
          <path d='M113.805 2.39062L225.353 66.793V195.598L113.805 260L2.25657 195.598V66.793L113.805 2.39062Z' stroke='none' strokeOpacity={0.3} />
        </svg>
      )
    }
    return (
      <>
        <svg width='100%' height='100%' viewBox='0 0 228 262' fill='none' xmlns='http://www.w3.org/2000/svg' className={`${getSvgStyle()} ${commonStyles.cursorPointer}`}>
          <path d='M113.805 2.39062L225.353 66.793V195.598L113.805 260L2.25657 195.598V66.793L113.805 2.39062Z' fill='none' stroke='none' />
        </svg>
        {DISPLAY_HIDDEN !== aspect && valueDisplayed &&
          <div className={`${styles.showNavigationContainer} ${DISPLAY_WIDE === aspect ? styles.showNavigationContainerWide : ''}`}>
            <div className={commonStyles.positionRelative}>
              {performance === GOOD_PERFORMANCE && <div className={styles.alertIconPositioning}><Icons.AlertIcon size={SMALL} color={WARNING_YELLOW} /></div>}
              {performance === LOW_PERFORMANCE && <div className={styles.alertIconPositioning}><Icons.AlertIcon size={SMALL} color={ERROR_RED} /></div>}

              <p className={`${typographyStyles.desktopBodyDesktopMiniMobile} ${typographyStyles.textWhite} ${typographyStyles.textCenter} ${commonStyles.userSelectNone}`}>{valueDisplayed.label}</p>
            </div>

            <div className={`${styles.navigatorContent} ${DISPLAY_WIDE === aspect ? styles.navigatorContentWide : ''}`}>
              <div className={`${styles.arrowLeft} ${DISPLAY_WIDE === aspect ? styles.arrowLeftWide : ''}`}>
                <PlatformaticIcon
                  iconName='CircleArrowLeftIcon'
                  color={WHITE}
                  size={SMALL}
                  onClick={prevValue}
                  internalOverHandling
                />
              </div>
              <div className={`${styles.dataContainer} ${DISPLAY_WIDE === aspect ? styles.dataContainerWide : ''}`}>
                <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
                  {valueDisplayed.direction === UP &&
                    (
                      <svg width='7' height='6' viewBox='0 0 7 6' fill='none' xmlns='http://www.w3.org/2000/svg'>
                        <path d='M3.73303 6.0012L0.222581 6.00041L3.73303 0.621613L6.98926 5.98877L3.73303 6.0012Z' fill='none' className={styles.upArrow} />
                      </svg>
                    )}
                  {valueDisplayed.direction === DOWN &&
                    (
                      <svg width='7' height='6' viewBox='0 0 7 6' fill='none' xmlns='http://www.w3.org/2000/svg'>
                        <path d='M3.43396 -0.0012025L6.94441 -0.000412856L3.43396 5.37839L0.177734 0.0112302L3.43396 -0.0012025Z' fill='none' className={styles.downArrow} />
                      </svg>
                    )}
                  <h4 className={`${typographyStyles.desktopHeadline4} ${getTypographyStyleColor()} ${commonStyles.userSelectNone}`}>{displayValue(valueDisplayed.value)}</h4>
                  <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${commonStyles.userSelectNone}`}>{valueDisplayed.unit}</span>
                </div>
              </div>
              <div className={`${styles.arrowRight} ${DISPLAY_WIDE === aspect ? styles.arrowRightWide : ''}`}>
                <PlatformaticIcon
                  iconName='CircleArrowRightIcon'
                  color={WHITE}
                  size={SMALL}
                  onClick={nextValue}
                  internalOverHandling
                />
              </div>
              <div className={`${styles.arrowsContainer} ${DISPLAY_WIDE === aspect ? styles.arrowsContainerWide : ''}`}>
                <PlatformaticIcon
                  iconName='CircleArrowLeftIcon'
                  color={WHITE}
                  onClick={prevValue}
                  internalOverHandling
                />
                <PlatformaticIcon
                  iconName='CircleArrowRightIcon'
                  color={WHITE}
                  onClick={nextValue}
                  internalOverHandling
                />
              </div>
            </div>

            <div className={`${commonStyles.miniFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyCenter} ${styles.dotsNavigation} ${DISPLAY_WIDE === aspect ? styles.dotsNavigationWide : ''}`}>
              {elements.map((element, index) => (
                <Icons.CircleFullIcon
                  key={`${id}-${element.key}-${index}`}
                  size={MINI}
                  color={WHITE}
                  disabled={index !== indexValueSelected}
                />)
              )}
            </div>
          </div>}
      </>
    )
  }
  return (
    <div className={styles.podContainer} ref={podRef}>
      <div className={`${styles.podContent} ${commonStyles.positionRelative} ${commonStyles.cursorPointer}`} onClick={handleClickSvg}>
        {renderComponent()}
      </div>
    </div>
  )
}

export default Pod
