import React, { useEffect, useState } from 'react'
import { WHITE, MEDIUM, BLACK_RUSSIAN, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import styles from './Requests.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox, LoadingSpinnerV2 } from '@platformatic/ui-components'
import { getRequestsPerSecond } from '~/api'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import { REFRESH_INTERVAL } from '~/ui-constants'
import Icons from '@platformatic/ui-components/src/components/icons'

function Requests ({
  gridClassName = '',
  applicationId
}) {
  const UP = 'up'
  const DOWN = 'down'
  const STALE = 'stale'
  const [initialLoading, setInitialLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(true)
  const [displayedValue, setDisplayedValue] = useState({ value: '-', direction: STALE })
  const [startPolling, setStartPolling] = useState(false)
  const [borderexBoxClassName, setBorderexBoxClassName] = useState(`${styles.borderexBoxContainer} ${gridClassName}`)

  useEffect(() => {
    let intervalId
    if (startPolling) {
      intervalId = setInterval(async () => await loadRequestsCount(), REFRESH_INTERVAL)
    }
    return () => {
      return clearInterval(intervalId)
    }
  }, [startPolling])

  useEffect(() => {
    if (applicationId && Object.keys(displayedValue).length > 0 && initialLoading) {
      async function loadRequests () {
        await loadRequestsCount()
        setStartPolling(true)
        setInitialLoading(false)
        setBorderexBoxClassName(`${styles.borderexBoxContainer} ${gridClassName}`)
      }
      loadRequests()
    }
  }, [applicationId, Object.keys(displayedValue), initialLoading])

  async function loadRequestsCount () {
    try {
      setBorderexBoxClassName(`${styles.borderexBoxContainer} ${styles.borderedBoxHeigthLoading} ${gridClassName}`)
      const data = await getRequestsPerSecond(applicationId)
      if (data.ok) {
        const { rps = '-' } = await data.json()
        setDisplayedValue({
          value: rps || '-',
          direction: displayedValue.value !== '-' ? (displayedValue.value > rps ? UP : DOWN) : STALE
        })
        setShowNoResult(true)
      } else {
        setShowNoResult(true)
        console.error('Error on ', data)
      }
    } catch (error) {
      console.error(`Error on loadMetrics ${error}`)
      setBorderexBoxClassName(`${styles.borderexBoxContainer} ${gridClassName}`)
    }
  }

  function displayValue (value = '-') {
    if (value === '-' || value === null) {
      return value
    }
    return `${value.toFixed(2)}`
  }

  function renderComponent () {
    if (initialLoading) {
      return (
        <LoadingSpinnerV2
          loading
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: []
          }}
          containerClassName={loadingSpinnerStyles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }
    if (showNoResult) { return <NoDataAvailable iconName='NodeJSMetricsIcon' /> }

    return (
      <div className={`${commonStyles.miniFlexBlock} ${commonStyles.itemsCenter}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
          <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWhite}`}>{displayValue(displayedValue.value)}</h4>
          {displayedValue.direction === UP &&
              (
                <svg width='7' height='6' viewBox='0 0 7 6' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <path d='M3.73303 6.0012L0.222581 6.00041L3.73303 0.621613L6.98926 5.98877L3.73303 6.0012Z' fill='none' className={styles.upArrow} />
                </svg>
              )}
          {displayedValue.direction === DOWN &&
              (
                <svg width='7' height='6' viewBox='0 0 7 6' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <path d='M3.43396 -0.0012025L6.94441 -0.000412856L3.43396 5.37839L0.177734 0.0112302L3.43396 -0.0012025Z' fill='none' className={styles.downArrow} />
                </svg>
              )}

        </div>
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>per second</span>
      </div>
    )
  }

  return (
    <BorderedBox classes={borderexBoxClassName} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.tinyFlexResponsiveRow} ${commonStyles.fullWidth}`}>
          <div className={commonStyles.tinyFlexRow}>
            <Icons.RequestsIcon
              color={WHITE}
              size={MEDIUM}
            />
            <div>
              <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Requests</p>
            </div>
          </div>
        </div>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter} ${commonStyles.itemsCenter}`}>
          {renderComponent()}
        </div>
      </div>
    </BorderedBox>
  )
}

export default Requests
