import React, { useEffect, useState } from 'react'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './AutoscalerHistory.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import { BorderedBox, Icons, LoadingSpinnerV2 } from '@platformatic/ui-components'
import { BLACK_RUSSIAN, MEDIUM, TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import gridStyles from '~/styles/GridStyles.module.css'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import AutoscalerHistoryChart from '~/components/application/autoscaler/AutoscalerHistoryChart'

const AutoscalerHistory = ({
  data,
  maxNumberOfPods = 10,
  initialLoading = true
}) => {
  const [showNoResults, setShowNoResult] = useState(true)

  useEffect(() => {
    if (!initialLoading && data.length > 0) {
      setShowNoResult(false)
    }
  }, [initialLoading, data])

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
        />
      )
    }

    if (showNoResults) {
      return <NoDataAvailable iconName='NoMetricsIcon' />
    }

    return <AutoscalerHistoryChart data={data} maxNumberOfPods={maxNumberOfPods} />
  }
  return (
    <BorderedBox classes={`${styles.borderexBoxContainer} ${gridStyles.colSpanLarge2}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
      <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
          <div className={commonStyles.tinyFlexRow}>
            <Icons.PodMetricsIcon
              color={WHITE}
              size={MEDIUM}
            />
            <div>
              <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Scaling History</p>
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

export default AutoscalerHistory
