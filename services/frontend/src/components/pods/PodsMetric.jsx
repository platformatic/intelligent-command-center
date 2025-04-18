import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { RICH_BLACK, WHITE, OPACITY_30 } from '@platformatic/ui-components/src/components/constants'
import styles from './PodsMetric.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox, LoadingSpinnerV2, VerticalSeparator } from '@platformatic/ui-components'
import { getApiMetricsForTaxonomyAndApplication } from '~/api'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import { REFRESH_INTERVAL } from '~/ui-constants'

function PodsMetric ({
  title = '',
  subTitle = '',
  metricURL = '',
  options = [{ label: '', internalKey: '', unit: '' }],
  applicationId,
  taxonomyId
}) {
  const UP = 'up'
  const DOWN = 'down'
  const STALE = 'stale'
  const [initialLoading, setInitialLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(true)
  const [displayedValues, setDisplayedValues] = useState([])
  const [startPolling, setStartPolling] = useState(false)

  useEffect(() => {
    if (options.length > 0 && displayedValues.length === 0) {
      setDisplayedValues(options.map(option => ({ ...option, value: '-', direction: STALE, key: option.internalKey })))
    }
  }, [options, displayedValues])

  useEffect(() => {
    if (taxonomyId && applicationId && displayedValues.length > 0 && initialLoading) {
      async function loadMetrics () {
        await loadPodsMetrics()
        setInitialLoading(false)
        setStartPolling(true)
      }
      loadMetrics()
    }
  }, [taxonomyId, applicationId, displayedValues, initialLoading])

  useEffect(() => {
    let intervalId
    if (startPolling) {
      intervalId = setInterval(async () => await loadPodsMetrics(), REFRESH_INTERVAL)
    }
    return () => {
      return clearInterval(intervalId)
    }
  }, [startPolling])

  async function loadPodsMetrics () {
    try {
      const data = await getApiMetricsForTaxonomyAndApplication(taxonomyId, applicationId, metricURL)
      if (data.ok) {
        const dataValues = await data.json()
        const newValues = []

        if (Object.keys(dataValues).length > 0) {
          Object.keys(dataValues).forEach(key => {
            const { label, unit, value, internalKey } = displayedValues.find(value => value.internalKey === key)

            newValues.push({
              key: `${internalKey}-` + new Date().toISOString(),
              label,
              unit,
              internalKey,
              value: dataValues[`${key}`],
              direction: value !== '-' ? (dataValues[`${key}`] > value ? UP : DOWN) : STALE
            })
          })

          setDisplayedValues([...newValues])
          setShowNoResult(false)
        } else {
          setShowNoResult(true)
        }
      } else {
        console.error('Error on ', data)
        setShowNoResult(true)
      }
    } catch (error) {
      console.error(`Error on getApiMetricsForTaxonomyAndApplication ${error}`)
      setInitialLoading(false)
      setShowNoResult(true)
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

    if (showNoResult) { return <NoDataAvailable iconName='NoMetricsIcon' /> }

    return displayedValues.map((valueDisplayed, index) => (
      <React.Fragment key={valueDisplayed.key}>
        <div className={`${commonStyles.miniFlexBlock} ${commonStyles.itemsCenter} ${commonStyles.flexGrow}`}>
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
            <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{displayValue(valueDisplayed.value)}</p>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{valueDisplayed.unit}</span>
          </div>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{valueDisplayed.label}</span>
        </div>
        {index < displayedValues.length - 1 && <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />}
      </React.Fragment>
    )
    )
  }

  return (
    <BorderedBox classes={styles.borderexBoxContainer} backgroundColor={RICH_BLACK} color={WHITE} borderColorOpacity={OPACITY_30}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
          <span className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>{title}</span>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{subTitle}</span>
        </div>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} ${commonStyles.itemsCenter}`}>
          {renderComponent()}
        </div>
      </div>
    </BorderedBox>
  )
}

PodsMetric.propTypes = {
  /**
   * title
    */
  title: PropTypes.string,
  /**
   * subTitle
    */
  subTitle: PropTypes.string,
  /**
   * metricURL
    */
  metricURL: PropTypes.string,
  /**
   * options
    */
  options: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    key: PropTypes.string,
    unit: PropTypes.string
  })),
  /**
   * applicationId
    */
  applicationId: PropTypes.string,
  /**
   * taxonomyId
    */
  taxonomyId: PropTypes.string

}

export default PodsMetric
