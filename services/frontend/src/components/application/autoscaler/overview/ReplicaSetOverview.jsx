import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { WHITE, OPACITY_30, SMALL, MEDIUM, ACTIVE_AND_INACTIVE_STATUS, TRANSPARENT, BLACK_RUSSIAN } from '@platformatic/ui-components/src/components/constants'
import styles from './ReplicaSetOverview.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox, Button, LoadingSpinnerV2, VerticalSeparator } from '@platformatic/ui-components'
import { getApiMetricsReplicaSetOverview } from '~/api'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import { REFRESH_INTERVAL } from '~/ui-constants'
import Icons from '@platformatic/ui-components/src/components/icons'

function ReplicaSetOverview ({
  gridClassName = '',
  applicationId,
  taxonomyId,
  onViewPodsDetails = () => {}
}) {
  const [initialLoading, setInitialLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(true)
  const [displayedValues, setDisplayedValues] = useState({
    pods: '-',
    minPods: '-',
    maxPods: '-',
    countScaleUp: '-',
    countScaleDown: '-'
  })
  const [startPolling, setStartPolling] = useState(false)
  const [borderexBoxClassName, setBorderexBoxClassName] = useState(`${styles.borderexBoxContainer} ${gridClassName}`)

  useEffect(() => {
    let intervalId
    if (startPolling) {
      intervalId = setInterval(async () => await loadMetricsReplicaSetOverview(), REFRESH_INTERVAL)
    }
    return () => {
      return clearInterval(intervalId)
    }
  }, [startPolling])

  useEffect(() => {
    if (applicationId && taxonomyId && Object.keys(displayedValues).length > 0 && initialLoading) {
      async function loadMetrics () {
        await loadMetricsReplicaSetOverview()
        setStartPolling(true)
        setInitialLoading(false)
        setBorderexBoxClassName(`${styles.borderexBoxContainer} ${gridClassName}`)
      }
      loadMetrics()
    }
  }, [applicationId, taxonomyId, Object.keys(displayedValues), initialLoading])

  async function loadMetricsReplicaSetOverview () {
    try {
      setBorderexBoxClassName(`${styles.borderexBoxContainer} ${styles.borderedBoxHeigthLoading} ${gridClassName}`)
      const dataValues = await getApiMetricsReplicaSetOverview(taxonomyId, applicationId)

      if (Object.keys(dataValues).length > 0) {
        setDisplayedValues({ ...dataValues })
        setShowNoResult(false)
      } else {
        setShowNoResult(true)
      }
    } catch (error) {
      console.error(`Error on loadMetricsReplicaSetOverview ${error}`)
      setBorderexBoxClassName(`${styles.borderexBoxContainer} ${gridClassName}`)
    }
  }

  function displayValue (value = '-') {
    if (value === '-' || value === null) {
      return value
    }
    return `${value.toFixed(0)}`
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
      <>
        <div className={`${commonStyles.flexBlockNoGap} ${commonStyles.itemsCenter} ${commonStyles.flexGrow}`}>
          <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWhite}`}>{displayedValues?.pods ?? '-'}</h4>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Number of Pods</span>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.itemsCenter}`}>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}><span className={typographyStyles.opacity70}>min: </span>{displayedValues?.minPods ?? '-'}</span>
            <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparatorSmall} />
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}><span className={typographyStyles.opacity70}>max: </span>{displayedValues?.maxPods ?? '-'}</span>
          </div>
        </div>

        <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />

        <div className={`${commonStyles.flexBlockNoGap} ${commonStyles.itemsCenter} ${commonStyles.flexGrow}`}>
          <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWhite}`}>{displayValue(displayedValues.countScaleUp)}</h4>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}># of time the app scaled up</span>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}><span className={typographyStyles.opacity70}>Last scaled up: </span>-</span>
        </div>

        <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />

        <div className={`${commonStyles.flexBlockNoGap} ${commonStyles.itemsCenter} ${commonStyles.flexGrow}`}>
          <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWhite}`}>{displayValue(displayedValues.countScaleDown)}</h4>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}># of time the app scaled down</span>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}><span className={typographyStyles.opacity70}>Last scaled down: </span>-</span>
        </div>
      </>
    )
  }

  return (
    <BorderedBox classes={borderexBoxClassName} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.tinyFlexResponsiveRow} ${commonStyles.fullWidth}`}>
          <div className={commonStyles.tinyFlexRow}>
            <Icons.ScalerDetailsIcon
              color={WHITE}
              size={MEDIUM}
            />
            <div>
              <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Replica Set Overview</p>
            </div>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
              <Button
                label='View Pods details'
                type='button'
                color={WHITE}
                backgroundColor={TRANSPARENT}
                hoverEffect={ACTIVE_AND_INACTIVE_STATUS}
                paddingClass={commonStyles.smallButtonPadding}
                textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
                onClick={onViewPodsDetails}
                bordered={false}
                platformaticIconAfter={{ iconName: 'ExpandIcon', color: WHITE, size: SMALL }}
              />
            </div>
          </div>
        </div>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} ${commonStyles.itemsCenter} ${styles.containerResults}`}>
          {renderComponent()}
        </div>
      </div>
    </BorderedBox>
  )
}

ReplicaSetOverview.propTypes = {
  /**
   * gridClassName
    */
  gridClassName: PropTypes.string,
  /**
   * applicationId
    */
  applicationId: PropTypes.string,
  /**
   * taxonomyId
    */
  taxonomyId: PropTypes.string,
  /**
   * onViewPodsDetails
    */
  onViewPodsDetails: PropTypes.func
}

export default ReplicaSetOverview
