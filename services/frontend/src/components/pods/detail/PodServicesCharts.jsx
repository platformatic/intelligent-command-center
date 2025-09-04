import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './PodServicesCharts.module.css'
import { BLACK_RUSSIAN, ERROR_RED, MAIN_GREEN, MEDIUM, TRANSPARENT, WARNING_YELLOW, WHITE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import { useLoaderData, useRouteLoaderData } from 'react-router-dom'
import ServicesSelectorForPodServicesCharts from './ServicesSelectorForPodServicesCharts'
import { BorderedBox } from '@platformatic/ui-components'
import PodServicesMetrics from '~/components/metrics/PodServicesMetrics'
import { getPodPerformances } from '~/components/pods/performances'
import { UNKNOWN_PERFORMANCE, GREAT_PERFORMANCE, GOOD_PERFORMANCE } from '~/ui-constants'

export default function PodServicesCharts () {
  const [showAggregatedMetrics, setShowAggregatedMetrics] = useState(false)
  const [services, setServices] = useState([])
  const [serviceSelected, setServiceSelected] = useState({})
  const [colorPod, setColorPod] = useState(WHITE)
  const { application } = useRouteLoaderData('autoscalerPodDetailRoot')
  const { pod } = useLoaderData()

  useEffect(() => {
    if (pod.dataValues) {
      const { score } = getPodPerformances(pod.dataValues)
      let color = WHITE
      switch (score) {
        case UNKNOWN_PERFORMANCE:
          break
        case GREAT_PERFORMANCE:
          color = MAIN_GREEN
          break
        case GOOD_PERFORMANCE:
          color = WARNING_YELLOW
          break
        default:
          color = ERROR_RED
          break
      }
      setColorPod(color)
    }
  }, [])

  useEffect(() => {
    if (services.length === 0) {
      const orderedServices = getOrderedServices(application?.state?.services || [])
      setServices(orderedServices)
      setServiceSelected(orderedServices.length > 0 ? orderedServices[0] : {})
    }
  }, [services])

  function getOrderedServices (services) {
    return services
      .filter(service => service.entrypoint)
      .concat(services
        .filter(service => !service.entrypoint)
      )
  }
  return (
    <div className={styles.podServicesContainer}>
      <div className={styles.podServicesContent}>
        <div className={`${commonStyles.miniFlexBlock} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
            <Icons.AppIcon
              color={colorPod}
              size={MEDIUM}
            />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite} `}>Pod Detail</p>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{pod.id}</span>
          </div>
        </div>

        <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.borderedBoxContainerPodServices}>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.itemsStart}`}>
            <ServicesSelectorForPodServicesCharts
              key={serviceSelected.id}
              services={services}
              serviceSelected={serviceSelected}
              handleClickService={(service) => setServiceSelected(service)}
              showAggregatedMetrics={showAggregatedMetrics}
              handleChangeShowAggregateMetrics={() => setShowAggregatedMetrics(!showAggregatedMetrics)}
            />
            <PodServicesMetrics
              applicationId={application.id}
              podId={pod.id}
              serviceId={serviceSelected.id}
              showAggregatedMetrics={showAggregatedMetrics}
            />
          </div>
        </BorderedBox>
      </div>
    </div>
  )
}
