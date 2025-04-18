import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './PodDetailLogs.module.css'
import { BLACK_RUSSIAN, ERROR_RED, MAIN_GREEN, MEDIUM, TRANSPARENT, WARNING_YELLOW, WHITE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import PodLogs from '~/components/application-logs/PodLogs'
import { useParams } from 'react-router-dom'
import useICCStore from '~/useICCStore'
import ServicesSelectorForPodDetailLog from './ServicesSelectorForPodDetailLog'
import { BorderedBox } from '@platformatic/ui-components'
import { getPodPerformances } from '~/components/pods/performances'
import { UNKNOWN_PERFORMANCE, GREAT_PERFORMANCE, GOOD_PERFORMANCE } from '~/ui-constants'

const PodDetailLogs = React.forwardRef(({ _ }, ref) => {
  const globalState = useICCStore()
  const {
    applicationSelected,
    podSelected
  } = globalState
  const { taxonomyId, appId, podId } = useParams()
  const [selectAllServices, setSelectAllServices] = useState(true)
  const [services, setServices] = useState([])
  const [colorPod, setColorPod] = useState(WHITE)

  useEffect(() => {
    if ((podSelected?.id ?? null) === podId) {
      const { score } = getPodPerformances(podSelected.dataValues)
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
  }, [podSelected])

  useEffect(() => {
    if ((applicationSelected !== null && services.length === 0)) {
      setServices(getOrderedServices(applicationSelected?.state?.services || []))
    }
  }, [applicationSelected, services])

  function getOrderedServices (services) {
    return services.filter(service => service.entrypoint).concat(services.filter(service => !service.entrypoint)).map(service => ({ ...service, selected: true }))
  }

  function handleChangeService (serviceUpdated) {
    const newServices = services.map(service => {
      if (serviceUpdated.id === service.id) {
        return { ...service, selected: !service.selected }
      } else {
        return { ...service }
      }
    })
    // if all selected but not find a service that is selected, turn off the toggle
    if (selectAllServices && newServices.find(service => !service.selected) !== undefined) {
      setSelectAllServices(false)
    }
    // if no service is selected but not all service select correspont to length of all service
    if (!selectAllServices && newServices.filter(service => service.selected).length === newServices.length) {
      setSelectAllServices(true)
    }
    setServices(newServices)
  }

  function handleChangeAllService () {
    setSelectAllServices(!selectAllServices)
    setServices(services.map(service => ({ ...service, selected: !selectAllServices })))
  }

  return (
    <div className={styles.detailPodContainer} ref={ref}>
      <div className={styles.detailPodContent}>
        <div className={`${commonStyles.miniFlexBlock} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
            <Icons.AppIcon
              color={colorPod}
              size={MEDIUM}
            />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite} `}>Pod Detail</p>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{podId}</span>
          </div>
        </div>

        <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.borderedBoxContainerPodLogs}>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.itemsStart}`}>
            <ServicesSelectorForPodDetailLog
              services={services}
              handleChangeService={handleChangeService}
              selectAllServices={selectAllServices}
              handleChangeAllServices={() => handleChangeAllService()}
            />
            <PodLogs
              taxonomyId={taxonomyId}
              applicationId={appId}
              podId={podId}
              filteredServices={services.filter(service => service.selected).map(service => service.id)}
            />
          </div>
        </BorderedBox>
      </div>
    </div>
  )
})

export default PodDetailLogs
