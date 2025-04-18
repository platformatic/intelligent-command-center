import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { BLACK_RUSSIAN, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import styles from './RiskOpenPrs.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox, LoadingSpinnerV2 } from '@platformatic/ui-components'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import { LOW_RISK, MEDIUM_RISK, HIGH_RISK } from './previewUtils'
import NoDataAvailable from '~/components/ui/NoDataAvailable'

function RiskOpenPrs ({
  title = '',
  previewsLoaded = false,
  previewsOpen = []
}) {
  const [innerLoading, setInnerLoading] = useState(true)
  const [risks, setRisks] = useState([])
  const [borderexBoxClassName, setBorderexBoxClassName] = useState(styles.riskOpenPrsBorderexBoxContainerHeightLoading)

  const legends = [{
    key_value: 'low',
    label: 'Low:',
    className: 'boxPullRequestLowRisk'
  }, {
    key_value: 'medium',
    label: 'Medium:',
    className: 'boxPullRequestMediumRisk'
  }, {
    key_value: 'high',
    label: 'high:',
    className: 'boxPullRequestHighRisk'
  }]

  useEffect(() => {
    if (previewsLoaded && previewsOpen.length > 0) {
      setBorderexBoxClassName(styles.riskOpenPrsBorderexBoxContainer)
      setInnerLoading(false)
      setRisks([{
        key: 'low',
        value: previewsOpen.filter(LOW_RISK).length
      }, {
        key: 'medium',
        value: previewsOpen.filter(MEDIUM_RISK).length
      }, {
        key: 'high',
        value: previewsOpen.filter(HIGH_RISK).length
      }])
    }
    if (previewsLoaded && previewsOpen.length === 0) {
      setBorderexBoxClassName(styles.riskOpenPrsBorderexBoxContainer)
      setInnerLoading(false)
    }
  }, [previewsLoaded, previewsOpen.length])

  function getValueRisk (key) {
    return risks.find(risk => risk.key === key)?.value ?? '-'
  }

  function drawGraph () {
    return legends.map(legend => {
      const val = getValueRisk(legend.key_value)
      const perc = (val / previewsOpen.length) * 100

      return (
        <div key={`graph-${legend.key_value}`} className={styles[legend.className]} style={{ width: `${perc}%` }}>&nbsp;</div>
      )
    })
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

    if (!risks.some(risk => risk.value > 0)) {
      return <NoDataAvailable iconName='NoMetricsIcon' />
    }

    return (
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
          {drawGraph()}
        </div>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.justifyBetween} ${commonStyles.fullWidth}`}>
          {legends.map(legend => (
            <div className={`${commonStyles.tinyFlexRow}`} key={legend.key_value}>
              <span className={styles[legend.className]}>&nbsp;</span>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{legend.label}</span>
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{getValueRisk(legend.key_value)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <BorderedBox key={`${title}-${innerLoading}`} classes={borderexBoxClassName} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
        <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{title}</p>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter} ${commonStyles.itemsCenter} ${styles.minHeightComponent}`}>
          {renderComponent()}
        </div>
      </div>
    </BorderedBox>
  )
}

RiskOpenPrs.propTypes = {
  /**
   * title
    */
  title: PropTypes.string,
  /**
   * previewsLoaded
    */
  previewsLoaded: PropTypes.bool,
  /**
   * previewsOpen
    */
  previewsOpen: PropTypes.array
}

export default RiskOpenPrs
