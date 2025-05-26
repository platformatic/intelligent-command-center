import React, { useEffect, useState } from 'react'
import styles from './ScalingHistory.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import { getScalingHistory } from '~/api/autoscaler'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import { MEDIUM, RICH_BLACK, WHITE, BLACK_RUSSIAN, TRANSPARENT, OPACITY_30 } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, Button, LoadingSpinnerV2, VerticalSeparator } from '@platformatic/ui-components'
import Icons from '@platformatic/ui-components/src/components/icons'
import commonStyles from '~/styles/CommonStyles.module.css'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import HistoricalScalerTrendChart from './HistoricalScalerTrendChart'
import { REFRESH_INTERVAL_METRICS } from '~/ui-constants'
import { useRouteLoaderData } from 'react-router-dom'
import AutoscalerEventsTable from '../AutoscalerEventsTable'

function ScalingHistory ({ onViewFullHistory = () => {} }) {
  const MAX_ACTIVITIES = 5
  const { application } = useRouteLoaderData('appRoot')
  const [chartEvents, setChartEvents] = useState([])
  const [showNoResult, setShowNoResult] = useState(false)
  const [startPolling, setStartPolling] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const labels = [{ label: 'Replicas', key: 'replicas' }]

  useEffect(() => {
    let intervalId
    if (startPolling) {
      intervalId = setInterval(async () => await loadScalingHistoryActivities(), REFRESH_INTERVAL_METRICS)
    }
    return () => {
      return clearInterval(intervalId)
    }
  }, [startPolling])

  useEffect(() => {
    if (application && initialLoading) {
      async function loadMetrics () {
        await loadScalingHistoryActivities()
        setStartPolling(true)
        setInitialLoading(false)
      }
      loadMetrics()
    }
  }, [application, initialLoading])

  async function loadScalingHistoryActivities () {
    const response = await getScalingHistory(application.id)
    if (response.length > 0) {
      setShowNoResult(false)
      setChartEvents(response)
    } else {
      setShowNoResult(true)
    }
  }

  function generateLegend () {
    return (
      <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth}`}>
        {
        labels.map((label, i) => {
          return (
            <React.Fragment key={`label-${i}`}>
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
                <div className={`${styles.label} ${typographyStyles.desktopBodySmallest} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}> {label.label} </div>
                <div className={`${styles.legendLine} ${styles[`line-color-${i}`]}`} />
              </div>
              {labels.length - 1 && i < (labels.length - 1) ? <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} /> : ''}
            </React.Fragment>
          )
        })
      }
      </div>
    )
  }

  function renderHistoricalTrendComponent () {
    if (initialLoading) {
      return (
        <LoadingSpinnerV2
          loading={initialLoading}
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: []
          }}
          containerClassName={loadingSpinnerStyles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }

    if (showNoResult) {
      return <NoDataAvailable iconName='NoMetricsIcon' title='There are no events to show' />
    }

    return (
      <HistoricalScalerTrendChart
        data={chartEvents}
        labels={labels.map(label => label.label)}
      />
    )
  }

  return (
    <>
      <BorderedBox classes={`${styles.boxHistorycalScalerTrend} ${styles.borderexBoxContainer}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
        <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
            <div className={`${commonStyles.tinyFlexRow}`}>
              <div className={commonStyles.tinyFlexRow}>
                <Icons.PodMetricsIcon
                  color={WHITE}
                  size={MEDIUM}
                />
                <div>
                  <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Historic & Scaler Trend</p>
                </div>
              </div>
            </div>

            {!showNoResult && (
              <div className={`${commonStyles.tinyFlexRow}`}>
                {generateLegend()}
              </div>
            )}
          </div>

          <div className={styles.metricsContainer}>
            {renderHistoricalTrendComponent()}
          </div>
        </div>
      </BorderedBox>
      <BorderedBox classes={`${styles.boxScalingHistory} ${styles.borderexBoxContainer}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
        <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
              <Icons.ScalerHistoryIcon
                color={WHITE}
                size={MEDIUM}
              />
              <div>
                <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Scaling History</p>
              </div>
            </div>
            <div className={styles.buttonContainer}>
              <Button
                type='button'
                label='View Full History'
                onClick={onViewFullHistory}
                color={WHITE}
                backgroundColor={RICH_BLACK}
                paddingClass={commonStyles.smallButtonPadding}
                textClass={typographyStyles.desktopButtonSmall}
              />
            </div>
          </div>
          <AutoscalerEventsTable
            applicationId={application.id}
            deploymentId={application.latestDeployment.id}
            rows={MAX_ACTIVITIES}
          />
        </div>
      </BorderedBox>
    </>
  )
}

export default ScalingHistory
