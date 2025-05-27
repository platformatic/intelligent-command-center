import React, { useEffect, useState } from 'react'
import { BLACK_RUSSIAN, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import styles from './KubernetesResourcePercentage.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox, LoadingSpinnerV2 } from '@platformatic/ui-components'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import NoDataAvailable from '~/components/ui/NoDataAvailable'

function KubernetesResourcePercentage ({
  title = '',
  value = '-',
  unit = '',
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
      if (value !== '-') {
        setShowNoResult(false)
      } else {
        setShowNoResult(true)
      }
    }
  }, [value, valuesLoading])

  function displayValue (value = '-', unit = '') {
    if (value === '-' || value === null) {
      return value
    }
    let retValue = value.toFixed(2)
    if (unit) retValue += ` ${unit}`
    return retValue
  }

  function getStyle (legend) {
    const width = legend.value_perc + '%'
    return { width }
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
        <div className={`${commonStyles.miniFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
          {values.filter(value => (value?.value ?? 0) !== 0).map(value => (<div className={styles[value.className]} style={getStyle(value)} key={`${value.key_value}_perc`}>&nbsp;</div>))}
        </div>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} ${commonStyles.itemsCenter}`}>
          {values.map(value => (
            <div className={`${commonStyles.flexBlockNoGap}`} key={value.key_value}>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{value.label}</span>
              <div className={`${commonStyles.tinyFlexRow}`} key={value.key_value}>
                <span className={styles[value.className]}>&nbsp;</span>
                <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{displayValue(value?.value ?? '-', value.unit)}</span>
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
          <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{title}</span>
          <div className={`${commonStyles.miniFlexRow}`}>
            <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWhite}`}>{displayValue(value)}</h4>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{unit}</span>
          </div>
        </div>
        {renderComponent()}
      </div>
    </BorderedBox>
  )
}

export default KubernetesResourcePercentage
