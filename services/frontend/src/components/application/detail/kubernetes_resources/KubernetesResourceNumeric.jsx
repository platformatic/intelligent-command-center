import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { BLACK_RUSSIAN, RICH_BLACK, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import styles from './KubernetesResourceNumeric.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox, LoadingSpinnerV2 } from '@platformatic/ui-components'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import NoDataAvailable from '~/components/ui/NoDataAvailable'

function KubernetesResourceNumeric ({
  title = '',
  podsUsed = '-',
  podsAll = '-',
  values = [],
  valuesLoading = true,
  backgroundColor = BLACK_RUSSIAN
}) {
  const [showNoResult, setShowNoResult] = useState(false)
  const [innerLoading, setInnerLoading] = useState(true)

  useEffect(() => {
    if (valuesLoading) {
      setInnerLoading(true)
    } else {
      setInnerLoading(false)
      if (podsAll >= 0) {
        setShowNoResult(false)
      } else {
        setShowNoResult(true)
      }
    }
  }, [podsAll, valuesLoading])

  function displayPods () {
    if (podsUsed !== '-') {
      podsAll = Math.max(podsUsed, podsAll)

      const used = Array.from(Array(podsUsed).keys()).map((_) => ({ used: true }))
      const podsAvailable = podsAll - podsUsed
      const available = Array.from(Array(podsAvailable).keys()).map((_) => ({ used: false }))
      return used.concat(available).map((element, index) => (
        <div className={`${element.used ? styles.boxPodsUsed : styles.boxPodsAvailable} ${commonStyles.flexGrow}`} key={index}>&nbsp;</div>
      ))
    }
    return <></>
  }

  function renderComponent () {
    if (innerLoading) {
      return (
        <LoadingSpinnerV2
          loading={innerLoading}
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: []
          }}
          containerClassName={loadingSpinnerStyles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }

    if (showNoResult) { return <NoDataAvailable iconName='K8SMetricsIcon' /> }

    return (
      <>
        <div className={`${commonStyles.miniFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${styles.flexWrap}`}>
          {displayPods()}
        </div>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
          {values.map(value => (
            <div className={`${commonStyles.flexBlockNoGap}`} key={value.key_value}>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{value.label}</span>
              <div className={`${commonStyles.tinyFlexRow}`}>
                <span className={styles[value.className]}>&nbsp;</span>
                <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{value.value}</span>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  return (
    <BorderedBox classes={styles.borderexBoxContainer} backgroundColor={backgroundColor} color={TRANSPARENT}>
      <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
          <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{title}</p>
          <div className={`${commonStyles.miniFlexRow}`}>
            <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWhite}`}>{podsUsed}</h4>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>/{podsAll}</span>
          </div>
        </div>
        {renderComponent()}
      </div>
    </BorderedBox>
  )
}

KubernetesResourceNumeric.propTypes = {
  /**
   * title
    */
  title: PropTypes.string,
  /**
   * podsUsed
    */
  podsUsed: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  /**
   * podsAll
    */
  podsAll: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  /**
   * values
    */
  values: PropTypes.array,
  /**
   * valuesLoading
    */
  valuesLoading: PropTypes.bool,
  /**
   * backgroundColor
    */
  backgroundColor: PropTypes.oneOf([BLACK_RUSSIAN, RICH_BLACK])
}

export default KubernetesResourceNumeric
