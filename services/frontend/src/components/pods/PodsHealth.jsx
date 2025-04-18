import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { WHITE, OPACITY_30, SMALL, TRANSPARENT, BLACK_RUSSIAN, DULLS_BACKGROUND_COLOR, MEDIUM } from '@platformatic/ui-components/src/components/constants'
import styles from './PodsHealth.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import tooltipStyles from '~/styles/TooltipStyles.module.css'
import { BorderedBox, ButtonFullRounded, LoadingSpinnerV2, Tooltip, VerticalSeparator } from '@platformatic/ui-components'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import { GOOD_PERFORMANCE, GREAT_PERFORMANCE, LOW_PERFORMANCE, UNKNOWN_PERFORMANCE } from '~/ui-constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import gridStyles from '~/styles/GridStyles.module.css'

function PodsHealth ({
  title = '',
  podsLoaded = false,
  pods = []
}) {
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResults, setShowNoResult] = useState(true)
  const [groupedPodByPerformance, setGroupedPodByPerformance] = useState([])

  const legends = [{
    key_value: GREAT_PERFORMANCE,
    label: 'Great',
    className: 'svgGreatPerformance'
  }, {
    key_value: GOOD_PERFORMANCE,
    label: 'Good',
    className: 'svgGoodPerformance'
  }, {
    key_value: LOW_PERFORMANCE,
    label: 'Low',
    className: 'svgLowPerformance'
  }, {
    key_value: UNKNOWN_PERFORMANCE,
    label: 'No data',
    className: 'svgUnknownPerformance'
  }]

  useEffect(() => {
    if (podsLoaded && pods.length > 0) {
      setShowNoResult(false)
      setInnerLoading(false)
      setGroupedPodByPerformance(pods.reduce((acc, currentPod) => {
        const performance = currentPod?.performance ?? UNKNOWN_PERFORMANCE
        const found = acc.find(ele => ele.performance === performance)
        if (found) {
          found.howMany += 1
        } else {
          acc.push({
            performance,
            howMany: 1
          })
        }
        return acc
      }, []))
    }
    if (podsLoaded && pods.length === 0) {
      setShowNoResult(true)
      setInnerLoading(false)
    }
  }, [podsLoaded, pods?.length])

  function drawGraph () {
    return groupedPodByPerformance.map((pod, index, podsArray) => {
      const legend = legends.find(legend => (pod?.performance ?? UNKNOWN_PERFORMANCE) === legend.key_value)
      const totals = podsArray.reduce((partialSum, pod) => partialSum + pod.howMany, 0)
      return (
        <React.Fragment key={legend.key_value}>
          {index > 0 && <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} />}
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.flexGrow} ${commonStyles.justifyCenter}`}>
            <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.itemsCenter} ${commonStyles.justifyCenter}`}>
              <svg width='43' height='49' viewBox='0 0 43 49' fill='none' xmlns='http://www.w3.org/2000/svg' className={styles[legend.className]}>
                <path d='M1.21539 12.7887L21.5 1.07735L41.7846 12.7887V36.2113L21.5 47.9226L1.21539 36.2113V12.7887Z' fill='none' fillOpacity={0.3} stroke='none' />
              </svg>

              <div className={`${commonStyles.flexBlockNoGap} ${commonStyles.itemsCenter}`}>
                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{legend.label}</span>
                <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
                  <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWhite}`}>{pod.howMany}</h4>
                  <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>of {totals}</span>
                </div>
              </div>
            </div>
          </div>
        </React.Fragment>
      )
    })
  }

  function drawColumnGraph (filtered) {
    const podsLength = pods.length
    return groupedPodByPerformance.filter(pod => filtered.includes(pod.performance)).map(pod => {
      const legend = legends.find(legend => pod.performance === legend.key_value)
      return (
        <React.Fragment key={legend.key_value}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.flexGrow}`}>
            <svg width='22' height='24' viewBox='0 0 22 24' fill='none' xmlns='http://www.w3.org/2000/svg' className={styles[legend.className]}>
              <path d='M1.1077 6.28867L11 0.57735L20.8923 6.28867V17.7113L11 23.4227L1.1077 17.7113V6.28867Z' fill='none' fillOpacity={0.3} stroke='none' />
            </svg>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{legend.label}:</span>
            <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWhite}`}>{pod.howMany}</h4>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>of {podsLength}</span>
          </div>
        </React.Fragment>
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

    if (showNoResults) {
      return <NoDataAvailable iconName='NoMetricsIcon' />
    }

    return groupedPodByPerformance.length < 4
      ? (
        <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
            {drawGraph()}
          </div>
        </div>
        )
      : (
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
            {drawColumnGraph([GREAT_PERFORMANCE, GOOD_PERFORMANCE])}
          </div>
          <div className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
            {drawColumnGraph([LOW_PERFORMANCE, UNKNOWN_PERFORMANCE])}
          </div>
        </div>
        )
  }

  return (
    <BorderedBox classes={`${styles.borderexBoxContainer} ${gridStyles.colSpanLarge1}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween} ${commonStyles.fullWidth} ${commonStyles.positionRelative}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
            <Icons.PodhealthIcon color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>{title}</p>
          </div>
          <Tooltip
            tooltipClassName={tooltipStyles.tooltipDarkStyle}
            content={(<span>For each pod, we display the result of evaluation on <br /> RSS, TotalHEAP, Used HEAP, CPU and Event Loop metrics.</span>)}
            offset={44}
            immediateActive={false}
          >
            <ButtonFullRounded
              buttonClassName={commonStyles.backgroundTransparent}
              iconName='CircleExclamationIcon'
              iconSize={SMALL}
              iconColor={WHITE}
              hoverEffect={DULLS_BACKGROUND_COLOR}
              bordered={false}
            />
          </Tooltip>
        </div>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter} ${commonStyles.itemsCenter}`}>
          {renderComponent()}
        </div>
      </div>
    </BorderedBox>
  )
}

PodsHealth.propTypes = {
  /**
   * title
    */
  title: PropTypes.string,
  /**
   * podsLoaded
    */
  podsLoaded: PropTypes.bool,
  /**
   * pods
    */
  pods: PropTypes.array
}

export default PodsHealth
