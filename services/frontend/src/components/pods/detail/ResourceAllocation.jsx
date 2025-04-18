import React from 'react'
import PropTypes from 'prop-types'
import styles from './ResourceAllocation.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { LoadingSpinnerV2 } from '@platformatic/ui-components'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import NoDataAvailable from '~/components/ui/NoDataAvailable'

function ResourceAllocation ({
  title = '',
  initialLoading = true,
  showNoResult = false,
  displayedValue = {}
}) {
  function displayValue (value = '-', unit, decimalUnit = 0) {
    if (value === '-' || value === null) {
      return value
    }
    return `${value.toFixed(decimalUnit)} ${unit}`
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

    if (showNoResult) { return <NoDataAvailable iconName='PodPerformanceIcon' /> }

    return (
      <div className={`${commonStyles.flexBlockNoGap} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} ${commonStyles.itemsCenter}`}>
          {[displayedValue, displayedValue.allocated].map((elem, index) => (
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`} key={`${elem.valueKey}-${index}`}>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{elem.label}</span>
              <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{displayValue(elem?.value ?? '-', elem.unit, elem.decimalUnit)}</span>
            </div>
          ))}
        </div>
        <div className={`${commonStyles.miniFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
          {[displayedValue, displayedValue.allocated].filter(elem => (elem?.value ?? 0) !== 0).map(elem => {
            let className = null
            if (elem.className !== 'boxFree') {
              let boxPerformanceContent = styles.boxPerformanceContentGreen
              if (displayedValue.valuePerc > 50) {
                boxPerformanceContent = styles.boxPerformanceContentYellow
              }
              if (displayedValue.valuePerc > 80) {
                boxPerformanceContent = styles.boxPerformanceContentRed
              }
              className = `${styles.boxPerformanceContent} ${boxPerformanceContent}`
            } else {
              className = styles.boxFree
            }

            return (<div className={className} style={{ width: `${elem.valuePerc}%` }} key={`${elem.valueKey}_perc`}>&nbsp;</div>)
          }
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth}`}>
        <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{title}</span>
      </div>

      <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} ${commonStyles.itemsCenter}`}>
        {renderComponent()}
      </div>
    </div>
  )
}

ResourceAllocation.propTypes = {
  /**
   * title
    */
  title: PropTypes.string,
  /**
   * initialLoading
    */
  initialLoading: PropTypes.bool,
  /**
   * showNoResult
    */
  showNoResult: PropTypes.bool,
  /**
   * displayedValue
    */
  displayedValue: PropTypes.object
}

export default ResourceAllocation
