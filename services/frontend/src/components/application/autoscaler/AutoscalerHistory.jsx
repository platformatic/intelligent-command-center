import React, { useEffect, useState } from 'react'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './AutoscalerHistory.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import { BorderedBox, /* Icons, */ LoadingSpinnerV2 } from '@platformatic/ui-components'
import { BLACK_RUSSIAN, /* MEDIUM, */ TRANSPARENT /* WHITE */ } from '@platformatic/ui-components/src/components/constants'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import gridStyles from '~/styles/GridStyles.module.css'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import AutoscalerHistoryChart from '~/components/application/autoscaler/AutoscalerHistoryChart'
import { getScalingHistory } from '../../../api/autoscaler'

const AutoscalerHistory = ({
  applicationId
}) => {
  const [loading, setLoading] = useState(true)
  const [showNoResults, setShowNoResult] = useState(true)
  const [data, setData] = useState([])

  const maxNumberOfPods = 10
  useEffect(() => {
    if (data.length > 0) {
      setShowNoResult(false)
    }
  }, [data])

  async function loadData () {
    setLoading(true)
    try {
      const history = await getScalingHistory(applicationId)
      if (history.length > 0) {
        setData(history.map((event, idx) => {
          const lastEntry = history[Math.min(idx + 1, history.length - 1)]
          return {
            time: new Date(event.time),
            values: [lastEntry.values[0], event.values[0]]
          }
        }).toReversed())
      } else {
        setData([])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function renderComponent () {
    if (loading) {
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
          <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Scaling History</p>
        </div>
        <div className={styles.chartContainer}>
          {renderComponent()}
        </div>
      </div>
    </BorderedBox>
  )
}

export default AutoscalerHistory
