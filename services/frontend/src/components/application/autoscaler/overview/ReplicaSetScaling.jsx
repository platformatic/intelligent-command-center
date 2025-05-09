import React, { useEffect, useState } from 'react'
import { RICH_BLACK, WHITE, OPACITY_30, MEDIUM, SMALL, TRANSPARENT, ACTIVE_AND_INACTIVE_STATUS, BLACK_RUSSIAN } from '@platformatic/ui-components/src/components/constants'
import styles from './ReplicaSetScaling.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox, Button, VerticalSeparator } from '@platformatic/ui-components'
import Icons from '@platformatic/ui-components/src/components/icons'
import Performance from './Performance'
import { getKubernetesResources, getScalingMarkers } from '~/api'
import { REFRESH_INTERVAL_METRICS, K8S_KEY_ELU, K8S_KEY_MEMORY, K8S_KEY_REQUESTS } from '~/ui-constants'
import gridStyles from '~/styles/GridStyles.module.css'

function ReplicaSetScaling ({
  gridClassName = '',
  applicationId
}) {
  const [displayedValues, setDisplayedValues] = useState([{
    value: '-',
    valuePerc: '0',
    internalKey: K8S_KEY_ELU,
    valueKey: 'eluApp',
    unit: '%',
    label: 'Using:'
  }, {
    value: '-',
    valuePerc: '0',
    internalKey: K8S_KEY_REQUESTS,
    valueKey: 'latency',
    unit: 'ms',
    label: 'Current:'
  }, {
    value: '-',
    valuePerc: '0',
    internalKey: K8S_KEY_MEMORY,
    valueKey: 'memoryAppMax',
    unit: 'MB',
    label: 'Using:'
  }])

  const [scalingMarkers, setScalingMarkers] = useState({
    [K8S_KEY_ELU]: {
      label: 'Scale at:',
      unit: '%',
      value: 100,
      className: 'boxFree',
      valuePerc: '100',
      maxValuePerc: '100'
    },
    [K8S_KEY_REQUESTS]: {
      label: 'Scale at:',
      value: 1500,
      unit: 'ms',
      className: 'boxFree',
      valuePerc: '100',
      maxValuePerc: '100'
    },
    [K8S_KEY_MEMORY]: {
      label: 'Scale at:',
      unit: 'MB',
      value: 512,
      className: 'boxFree',
      valuePerc: '100',
      maxValuePerc: '100'
    }
  })
  const [startPolling, setStartPolling] = useState(false)
  const [showNoResult, setShowNoResult] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    let intervalId
    if (startPolling) {
      intervalId = setInterval(async () => await loadMetricsReplicaSetScaling(), REFRESH_INTERVAL_METRICS)
    }
    return () => {
      return clearInterval(intervalId)
    }
  }, [startPolling])

  useEffect(() => {
    if (applicationId && displayedValues.length > 0 && initialLoading) {
      async function loadMetrics () {
        await loadMetricsReplicaSetScaling()
        setStartPolling(true)
        setInitialLoading(false)
      }
      loadMetrics()
    }
  }, [applicationId, displayedValues, initialLoading])

  useEffect(() => {
    if (!applicationId) return

    async function loadScalingMarkers () {
      const markers = await getScalingMarkers(applicationId)
      const updatedMarkers = Object.entries(markers).reduce((updates, [id, marker]) => {
        let value = marker.targetValue
        if (marker.targetType === 'bytes') value = value / 1024 / 1024

        updates[id] = {
          ...updates[id],
          value
        }
        return updates
      }, { ...scalingMarkers })
      setScalingMarkers({ ...updatedMarkers })
    }
    loadScalingMarkers()
  }, [applicationId])

  async function loadMetricsReplicaSetScaling () {
    try {
      const data = await getKubernetesResources(applicationId)
      const kubernetesResourceValues = await data.json()
      const newValues = []

      let found
      if (Object.keys(kubernetesResourceValues).length > 0) {
        displayedValues.forEach(displayedValue => {
          found = kubernetesResourceValues[displayedValue.internalKey]

          if (found) {
            const { unit, internalKey, label } = displayedValue
            const valuePerc = found[displayedValue.valueKey] || 0
            let value = found[displayedValue.valueKey] || 0
            if (internalKey === K8S_KEY_MEMORY) value = value * 1000 // Converting GB to MB
            newValues.push({
              ...displayedValue, // Overwrite the contents of the old value
              key: `${internalKey}-` + new Date().toISOString(),
              unit,
              internalKey,
              value,
              valuePerc: valuePerc > 100 ? 100 : valuePerc,
              label
            })
          } else {
            newValues.push({ ...displayedValue })
          }
        })
        setDisplayedValues([...newValues])
        setShowNoResult(false)
      } else {
        setShowNoResult(true)
      }
    } catch (error) {
      console.error(`Error on loadMetrics ${error}`)
    }
  }

  return (
    <BorderedBox classes={`${styles.borderexBoxContainer} ${gridClassName}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexResponsiveRow} ${commonStyles.fullWidth}`}>
            <div className={commonStyles.tinyFlexRow}>
              <Icons.PodPerformanceIcon
                color={WHITE}
                size={MEDIUM}
              />
              <div>
                <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Replica Set Scaling Metrics</p>
              </div>
            </div>

            <Button
              label='Based on Scaling Rules'
              type='button'
              color={WHITE}
              backgroundColor={TRANSPARENT}
              hoverEffect={ACTIVE_AND_INACTIVE_STATUS}
              paddingClass={commonStyles.smallButtonPadding}
              textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
              onClick={() => {}}
              bordered={false}
              platformaticIconAfter={{ iconName: 'ExpandIcon', color: WHITE, size: SMALL }}
            />
          </div>
        </div>

        <div className={styles.metricsContainer}>
          <BorderedBox classes={`${styles.borderexBoxPerfomanceContainer} ${gridStyles.colSpanLarge2}`} backgroundColor={RICH_BLACK} color={TRANSPARENT}>
            <div className={styles.k8sMetricContainer}>
              <Performance
                icon={<Icons.K8SIcon size={MEDIUM} color={WHITE} />}
                key='request_latency'
                title='Request Latency'
                subtitle='(Pod)'
                displayedValue={displayedValues.find(v => v.internalKey === K8S_KEY_REQUESTS)}
                markerValue={scalingMarkers[K8S_KEY_REQUESTS]}
                initialLoading={initialLoading}
                showNoResult={showNoResult}
              />
              <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />
              <Performance
                icon={<Icons.K8SIcon size={MEDIUM} color={WHITE} />}
                key='memory_usage'
                title='Memory'
                displayedValue={displayedValues.find(v => v.internalKey === K8S_KEY_MEMORY)}
                markerValue={scalingMarkers[K8S_KEY_MEMORY]}
                initialLoading={initialLoading}
                showNoResult={showNoResult}
              />
            </div>
          </BorderedBox>
          <BorderedBox classes={`${styles.borderexBoxPerfomanceContainer} ${gridStyles.colSpanLarge1}`} backgroundColor={RICH_BLACK} color={TRANSPARENT}>
            <Performance
              icon={<Icons.NodeJSIcon size={MEDIUM} color={WHITE} />}
              key='event_loop_utilization'
              title='Event loop Utilization'
              displayedValue={displayedValues.find(v => v.internalKey === K8S_KEY_ELU)}
              markerValue={scalingMarkers[K8S_KEY_ELU]}
              initialLoading={initialLoading}
              showNoResult={showNoResult}
            />
          </BorderedBox>
        </div>
      </div>
    </BorderedBox>
  )
}

export default ReplicaSetScaling
