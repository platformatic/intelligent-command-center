import React from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { LoadingSpinnerV2 } from '@platformatic/ui-components'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import NoDataAvailable from '~/components/ui/NoDataAvailable'

function Performance ({
  icon = (<></>),
  title = '',
  subtitle = '',
  initialLoading = true,
  showNoResult = false,
  displayedValue = {}
}) {
  function displayValue (value = '-', unit) {
    if (value === '-' || value === null) {
      return value
    }
    return `${value.toFixed(0)} ${unit}`
  }

  function renderText (currentValue) {
    return (
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} ${commonStyles.itemsCenter}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`} key={`${currentValue.valueKey}-0`}>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{currentValue.label}</span>
          <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{displayValue(currentValue?.value ?? '-', currentValue.unit)}</span>
        </div>
      </div>
    )
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
        {renderText(displayedValue)}
      </div>
    )
  }

  return (
    <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth}`}>
        {icon}
        <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{title}</span>
        {subtitle && <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{subtitle}</span>}
      </div>

      <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} ${commonStyles.itemsCenter}`}>
        {renderComponent()}
      </div>
    </div>
  )
}

export default Performance
