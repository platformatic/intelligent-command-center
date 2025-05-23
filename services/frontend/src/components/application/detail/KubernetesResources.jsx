import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { WHITE, MEDIUM, BLACK_RUSSIAN, TRANSPARENT, RICH_BLACK } from '@platformatic/ui-components/src/components/constants'
import styles from './KubernetesResources.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox } from '@platformatic/ui-components'
import Icons from '@platformatic/ui-components/src/components/icons'
import KubernetesResourcePercentage from '~/components/application/detail/kubernetes_resources/KubernetesResourcePercentage'
import KubernetesResourceNumeric from '~/components/application/detail/kubernetes_resources/KubernetesResourceNumeric'
import { getKubernetesResources } from '~/api'
import { REFRESH_INTERVAL } from '~/ui-constants'

function KubernetesResources ({
  gridClassName = '',
  application
}) {
  const [values, setValues] = useState({})
  const [startPolling, setStartPolling] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    async function getK8SResources () {
      await loadKubernetesResources()
      setStartPolling(true)
      setInitialLoading(false)
    }
    getK8SResources()
  }, [])

  useEffect(() => {
    let intervalId
    if (startPolling) {
      intervalId = setInterval(async () => await loadKubernetesResources(), REFRESH_INTERVAL)
    }
    return () => {
      return clearInterval(intervalId)
    }
  }, [startPolling])

  async function loadKubernetesResources () {
    try {
      const values = await getKubernetesResources(application.id)
      setValues(values)
    } catch (error) {
      console.error({ getKubernetesResources: error })
    }
  }

  return (
    <BorderedBox classes={`${styles.borderexBoxContainer} ${gridClassName}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
            <Icons.K8SMetricsIcon
              color={WHITE}
              size={MEDIUM}
            />
            <div>
              <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Kubernetes Resources</p>
            </div>
          </div>
        </div>

        <div className={styles.resourceContainer}>
          <KubernetesResourcePercentage
            key='cpu_usage'
            title='CPU usage'
            value={values?.cpu?.cpuAppUsage ?? 0}
            valuesLoading={initialLoading}
            unit='%'
            values={[{
              key_value: 'memory_usage',
              label: 'App usage:',
              className: 'boxAppUsage',
              value: values?.cpu?.cpuAppUsage ?? 0,
              value_perc: values?.cpu?.cpuAppUsage ?? 0,
              unit: '%'
            }, {
              key_value: 'other_memory_usage',
              label: 'Other Apps usage:',
              className: 'boxOtherAppUsage',
              value: values?.cpu?.cpuAllAppsUsageButApp ?? 0,
              value_perc: values?.cpu?.cpuAllAppsUsageButApp ?? 0,
              unit: '%'
            }, {
              key_value: 'remaining_memory',
              label: 'Remaining:',
              className: 'boxFree',
              value: 100 - (values?.cpu?.cpuAllAppsUsage ?? 0),
              value_perc: 100 - (values?.cpu?.cpuAllAppsUsage ?? 0),
              unit: '%'
            }]}
            backgroundColor={RICH_BLACK}
          />
          <KubernetesResourcePercentage
            key='memory_usage'
            title='Memory Usage'
            value={values?.memory?.memoryAppUsage ?? 0}
            valuesLoading={initialLoading}
            unit='GB'
            values={[{
              key_value: 'app_usage',
              label: 'App usage:',
              className: 'boxAppUsage',
              value: values?.memory?.memoryAppUsage ?? 0,
              value_perc: (values?.memory?.memoryAppUsage ?? 0) / (values?.memory?.totalMemory ?? 1) * 100,
              unit: 'GB'
            }, {
              key_value: 'other_app_usage',
              label: 'Other Apps usage:',
              className: 'boxOtherAppUsage',
              value: values?.memory?.memoryAllAppsUsageButApp ?? 0,
              value_perc: (values?.memory?.memoryAllAppsUsageButApp ?? 0) / (values?.memory?.totalMemory ?? 1) * 100,
              unit: 'GB'
            }, {
              key_value: 'remaining',
              label: 'Remaining:',
              className: 'boxFree',
              value: (values?.memory?.totalMemory ?? 0) - (values?.memory?.memoryAllAppsUsage ?? 0),
              value_perc: (((values?.memory?.totalMemory ?? 1) - (values?.memory?.memoryAllAppsUsage ?? 0)) / (values?.memory?.totalMemory ?? 1)) * 100,
              unit: 'GB'
            }]}
            backgroundColor={RICH_BLACK}
          />
          <KubernetesResourceNumeric
            key='pods_instances'
            title='Pods'
            podsUsed={values?.pods?.current ?? '-'}
            podsAll={values?.pods?.max ?? '-'}
            valuesLoading={initialLoading}
            values={[{
              key_value: 'pods_used',
              label: 'Pods used:',
              className: 'boxPodsUsed',
              value: values?.pods?.current ?? '-'
            }, {
              key_value: 'pods_available',
              label: 'Pods available:',
              className: 'boxPodsAvailable',
              value: (values?.pods?.max ?? 0) - (values?.pods?.current ?? 0)
            }]}
            backgroundColor={RICH_BLACK}
          />
        </div>
      </div>
    </BorderedBox>
  )
}

KubernetesResources.propTypes = {
  /**
   * gridClassName
    */
  gridClassName: PropTypes.string
}

export default KubernetesResources
