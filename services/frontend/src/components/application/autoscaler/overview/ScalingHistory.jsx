import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import styles from './ScalingHistory.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import { getScalingEventHistory } from '~/api'
import useICCStore from '~/useICCStore'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import { MEDIUM, RICH_BLACK, WHITE, BLACK_RUSSIAN, TRANSPARENT, OPACITY_30 } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, Button, LoadingSpinnerV2, VerticalSeparator } from '@platformatic/ui-components'
import Icons from '@platformatic/ui-components/src/components/icons'
import commonStyles from '~/styles/CommonStyles.module.css'
import RowAutoscalerActivity from '~/components/application/autoscaler/RowAutoscalerActivity'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import gridStyles from '~/styles/GridStyles.module.css'
import ErrorComponent from '~/components/errors/ErrorComponent'
import HistoricalScalerTrendChart from './HistoricalScalerTrendChart'
import { REFRESH_INTERVAL_METRICS } from '~/ui-constants'
import { useRouteLoaderData } from 'react-router-dom'

function ScalingHistory ({ onViewFullHistory = () => {} }) {
  const MAX_ACTIVITIES = 5
  const globalState = useICCStore()
  const {
    setActivitySelected
  } = globalState

  const { application } = useRouteLoaderData('appRoot')
  const [activities, setActivities] = useState([])
  const [chartEvents, setChartEvents] = useState([])
  const [showNoResult, setShowNoResult] = useState(false)
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(null)
  const labelsHistoricalTrend = [{ label: 'Actual', key: 'actual' }, { label: 'Projected', key: 'projected' }]
  const [startPolling, setStartPolling] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

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
    try {
      const response = await getScalingEventHistory(application.id)
      console.log('response', response)
      const { events, chartEvents } = response
      if (events.length > 0) {
        setShowNoResult(false)
        setActivities(events.slice(0, MAX_ACTIVITIES))
        const chartEventsToShow = chartEvents.map(event => ({
          time: new Date(event.datetime),
          values: [event.actual, event.projected]
        })).toReversed()
        setChartEvents(chartEventsToShow)
      } else {
        setShowNoResult(true)
      }
    } catch (error) {
      console.error(`Error on getScalingHistoryActivities ${error}`)
      setError(error)
      setShowErrorComponent(true)
    }
  }

  function renderHeaders () {
    return (
      <div className={styles.tableHeaders}>
        <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle2}`}>
          <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Date & Time (GMT)</span>
        </div>
        <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle4}`}>
          <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Activity</span>
        </div>
        <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle6}`}>
          <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Description</span>
        </div>
      </div>
    )
  }

  function renderRows () {
    if (showNoResult) { return <NoDataAvailable iconName='NoActivitiesIcon' title='There are not activities yet' /> }

    return activities.map((activity, index) => <RowAutoscalerActivity key={`${index}-${activity.datetime}`} {...activity} onClickViewJSON={() => handleShowDetailActivity(activity)} />)
  }

  function handleShowDetailActivity (activitySelected) {
    setActivitySelected(activitySelected)
  }

  function generateLegend () {
    return (
      <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth}`}>
        {
        labelsHistoricalTrend.map((label, i) => {
          return (
            <React.Fragment key={`label-${i}`}>
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
                <div className={`${styles.label} ${typographyStyles.desktopBodySmallest} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}> {label.label} </div>
                <div className={`${styles.legendLine} ${styles[`line-color-${i}`]}`} />
              </div>
              {labelsHistoricalTrend.length - 1 && i < (labelsHistoricalTrend.length - 1) ? <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} /> : ''}
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

    if (showErrorComponent) {
      return (
        <ErrorComponent
          error={error}
          onClickDismiss={() => {
            setShowErrorComponent(false)
          }}
        />
      )
    }

    if (showNoResult) { return <NoDataAvailable iconName='NoMetricsIcon' title='There are no events to show' /> }

    return (
      <HistoricalScalerTrendChart
        data={chartEvents}
        labels={labelsHistoricalTrend.map(label => label.label)}
      />
    )
  }

  function renderScalingComponent () {
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

    if (showErrorComponent) {
      return (
        <ErrorComponent
          error={error}
          onClickDismiss={() => {
            setShowErrorComponent(false)
          }}
        />
      )
    }

    return (
      <div className={styles.table}>
        {renderHeaders()}
        {renderRows()}
      </div>
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
          {renderScalingComponent()}
        </div>
      </BorderedBox>
    </>
  )
}

ScalingHistory.propTypes = {
  /**
   * gridClassName
    */
  gridClassName: PropTypes.string,
  /**
   * onViewFullHistory
    */
  onViewFullHistory: PropTypes.func
}

export default ScalingHistory
