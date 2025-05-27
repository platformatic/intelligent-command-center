import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './PanelTaxonomyApplication.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { BLACK_RUSSIAN, DIRECTION_LEFT, DULLS_BACKGROUND_COLOR, MEDIUM, RICH_BLACK, SMALL, TRANSPARENT, WARNING_YELLOW, WHITE } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, ButtonFullRounded, Tooltip } from '@platformatic/ui-components'
import KubernetesResourcePercentage from '~/components/application/detail/kubernetes_resources/KubernetesResourcePercentage'
import KubernetesResourceNumeric from '~/components/application/detail/kubernetes_resources/KubernetesResourceNumeric'
import tooltipStyles from '~/styles/TooltipStyles.module.css'
import {
  getKubernetesResources,
  getApiApplicationScaleConfig,
  getApiCompliancy
} from '~/api'

function PanelTaxonomyApplication ({ id, name, services, mainTaxonomyId, islatestGeneration = true }) {
  const TOOLTIP_OFFSET = 16
  const [values, setValues] = useState({})
  const [valuesLoading, setValuesLoading] = useState(true)
  const [reportServices, setReportServices] = useState({})

  useEffect(() => {
    if (id && mainTaxonomyId && islatestGeneration) {
      async function getResources () {
        try {
          setValuesLoading(true)
          const values = await getKubernetesResources(id)

          const scaleConfig = await getApiApplicationScaleConfig(id)
          const maximumInstanceCount = scaleConfig.maxPods

          const report = await getApiCompliancy(mainTaxonomyId, id)
          let services = {}
          if (report.length > 0) {
            const ruleSet = report[0].ruleSet
            const index = Object.keys(report[0].ruleSet).find(rule => report[0].ruleSet[rule].name === 'outdated-npm-deps')
            services = ruleSet[index]?.details?.services ?? {}
          }
          setReportServices({ ...services })

          values.pods.podsAll = maximumInstanceCount > values.pods.podsAll ? maximumInstanceCount : values.pods.podsAll

          /* const values = {
            cpu: {
              cpuAppUsage: null,
              cpuAllAppsUsage: 4.668559104061728,
              cpuAllAppsUsageButApp: 4.668559104061728
            },
            memory: {
              memoryAppUsage: null,
              memoryAllAppsUsage: 0.2337799072265625,
              memoryAllAppsUsageButApp: 0.2337799072265625,
              totalMemory: 7.559383392333984
            },
            pods: {
              pods: 1,
              podsAll: 1
            },
            requests: {
              latency: 120
            }
          } */
          setValues(values)
        } catch (error) {
          console.error(`Error on getResources ${error}`)
        } finally {
          setValuesLoading(false)
        }
      }
      getResources()
    }
  }, [id, mainTaxonomyId, islatestGeneration])

  function renderService (service, index) {
    let outdated = false
    if (Object.keys(reportServices[service.id] || {}).length > 0) {
      outdated = !(Object.keys(reportServices[service.id]).map(k => reportServices[service.id][k]).find(obj => obj.outdated) === undefined)
    }
    return (
      <BorderedBox key={`${service.id}-${index}`} color={TRANSPARENT} backgroundColor={RICH_BLACK} classes={`${commonStyles.smallFlexRow} ${styles.boxServicesContainer} ${commonStyles.itemsCenter} ${commonStyles.positionRelative}`}>
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{service.id}</span>
        {service.entrypoint && (
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>(Application Entrypoint)</span>
        )}
        {outdated && (
          <Tooltip
            tooltipClassName={tooltipStyles.tooltipDarkStyle}
            content={(<span>Service outdated</span>)}
            offset={TOOLTIP_OFFSET}
            immediateActive={false}
          >
            <Icons.OutdatedServiceIcon color={WARNING_YELLOW} size={MEDIUM} />
          </Tooltip>
        )}
      </BorderedBox>
    )
  }

  return (
    <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
        <Icons.AppIcon
          color={WHITE}
          size={MEDIUM}
        />
        <div>
          <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>{name} </p>
        </div>
      </div>

      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth} ${styles.contentScrollable}`}>

        {islatestGeneration && (
          <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
            <KubernetesResourcePercentage
              key='cpu_usage'
              title='CPU usage'
              value={values?.cpu?.cpuAppUsage ?? 0}
              valuesLoading={valuesLoading}
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
            />
            <KubernetesResourcePercentage
              key='memory_usage'
              title='Memory Usage'
              value={values?.memory?.memoryAppUsage ?? 0}
              valuesLoading={valuesLoading}
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
            />
            <KubernetesResourceNumeric
              key='pods_instances'
              title='Pods'
              podsUsed={values?.pods?.pods ?? '-'}
              podsAll={values?.pods?.podsAll ?? '-'}
              valuesLoading={valuesLoading}
              values={[{
                key_value: 'pods_used',
                label: 'Pods used:',
                className: 'boxPodsUsed',
                value: values?.pods?.pods ?? '-'
              }, {
                key_value: 'pods_available',
                label: 'Pods available:',
                className: 'boxPodsAvailable',
                value: (values?.pods?.podsAll ?? 0) - (values?.pods?.pods ?? 0)
              }]}
            />
          </div>
        )}

        <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.boxServicesContainer}>
          <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween} ${commonStyles.fullWidth} ${commonStyles.positionRelative}`}>
              <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Services</span>
              <Tooltip
                tooltipClassName={tooltipStyles.tooltipDarkStyle}
                content={(<span>The list of services contained<br /> in the selected application</span>)}
                offset={-160}
                direction={DIRECTION_LEFT}
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
            {services.map((service, index) => renderService(service, index))}
          </div>
        </BorderedBox>

      </div>
    </div>
  )
}

export default PanelTaxonomyApplication
