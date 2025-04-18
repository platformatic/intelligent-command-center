import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { TRANSPARENT, BLACK_RUSSIAN } from '@platformatic/ui-components/src/components/constants'
import styles from './PreviewsMetric.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox, LoadingSpinnerV2 } from '@platformatic/ui-components'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import { UP, DOWN, STALE } from '~/ui-constants'
import NoDataAvailable from '~/components/ui/NoDataAvailable'

function PreviewsMetric ({
  title = '',
  value = '-',
  unit = '-',
  difference = '-',
  titleDifference = '',
  direction = STALE,
  valuesLoaded = false
}) {
  const [innerLoading, setInnerLoading] = useState(true)

  useEffect(() => {
    if (valuesLoaded) {
      setInnerLoading(false)
    }
  }, [valuesLoaded])

  function getClass () {
    if (innerLoading) { return styles.previewMetricBorderedBoxHeigthLoading }
    return styles.previewMetricBorderedBoxContainer
  }

  function renderComponent () {
    if (innerLoading) {
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

    if (value === '-') {
      return <NoDataAvailable iconName='NoMetricsIcon' />
    }

    return (
      <>
        <div className={`${commonStyles.miniFlexBlock} ${commonStyles.itemsCenter}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
            {direction === UP &&
              (
                <svg width='7' height='6' viewBox='0 0 7 6' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <path d='M3.73303 6.0012L0.222581 6.00041L3.73303 0.621613L6.98926 5.98877L3.73303 6.0012Z' fill='none' className={styles.upArrow} />
                </svg>
              )}
            {direction === DOWN &&
              (
                <svg width='7' height='6' viewBox='0 0 7 6' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <path d='M3.43396 -0.0012025L6.94441 -0.000412856L3.43396 5.37839L0.177734 0.0112302L3.43396 -0.0012025Z' fill='none' className={styles.downArrow} />
                </svg>
              )}
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>{value}</p>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{unit}</span>
          </div>
          {difference !== '-' && (
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
              <span className={`${typographyStyles.desktopBodySmallest} ${direction === STALE ? typographyStyles.textWhite : (direction === UP ? typographyStyles.textErrorRed : typographyStyles.textMainGreen)} ${typographyStyles.opacity70}`}>{difference}</span>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{titleDifference}</span>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <BorderedBox key={`${title}-${innerLoading}`} classes={getClass()} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
        <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{title}</p>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter} ${commonStyles.itemsCenter} ${styles.minHeightComponent}`}>
          {renderComponent()}
        </div>
      </div>
    </BorderedBox>
  )
}

PreviewsMetric.propTypes = {
  /**
   * title
    */
  title: PropTypes.string,
  /**
   * value
    */
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  /**
   * unit
    */
  unit: PropTypes.string,
  /**
   * difference
    */
  difference: PropTypes.string,
  /**
   * titleDifference
    */
  titleDifference: PropTypes.string,
  /**
   * direction
    */
  direction: PropTypes.string,
  /**
   * valuesLoaded
    */
  valuesLoaded: PropTypes.bool
}

export default PreviewsMetric
