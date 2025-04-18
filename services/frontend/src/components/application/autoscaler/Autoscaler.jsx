import React, { useEffect, useState } from 'react'
import { PAGE_APPLICATION_DETAIL_AUTOSCALER/* , FILTER_ALL */ } from '~/ui-constants'
import useICCStore from '~/useICCStore'
import ApplicationLogs from '~/components/application-logs/ApplicationLogs'
import styles from './Autoscaler.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import Pods from '~/components/pods/Pods'
import { TabbedWindow } from '@platformatic/ui-components'
import AutoscalerOverview from './AutoscalerOverview'
import AutoscalerScalingHistory from './AutoscalerScalingHistory'

const Autoscaler = React.forwardRef(({ _ }, ref) => {
  const globalState = useICCStore()
  const { applicationSelected, taxonomySelected, setNavigation, setCurrentPage } = globalState
  const [keyTabSelected, setKeyTabSelected] = useState('overview')

  useEffect(() => {
    setCurrentPage(PAGE_APPLICATION_DETAIL_AUTOSCALER)
    setNavigation({
      label: 'Horizontal Pod Autoscaler',
      handleClick: () => {
        setCurrentPage(PAGE_APPLICATION_DETAIL_AUTOSCALER)
      },
      key: PAGE_APPLICATION_DETAIL_AUTOSCALER,
      page: PAGE_APPLICATION_DETAIL_AUTOSCALER
    }, 2)
  }, [])

  function renderComponent () {
    return (
      <div className={styles.autoscalerContent}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
            <Icons.HorizontalPodAutoscalerIcon color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Horizontal Pod Autoscaler</p>
          </div>
        </div>

        <TabbedWindow
          key={keyTabSelected}
          tabs={[
            {
              label: 'Overview',
              key: 'overview',
              component: () => (
                <AutoscalerOverview
                  applicationId={applicationSelected?.id}
                  taxonomyId={taxonomySelected?.id}
                  onViewFullHistory={() => setKeyTabSelected('scaling_history')}
                  onViewPodsDetails={() => setKeyTabSelected('pods')}
                />
              )
            }, {
              label: 'Pods',
              key: 'pods',
              component: () => <Pods applicationId={applicationSelected?.id} taxonomyId={taxonomySelected?.id} />
            }, {
              label: 'Scaling History',
              key: 'scaling_history',
              component: () =>
                <AutoscalerScalingHistory applicationId={applicationSelected?.id} taxonomyId={taxonomySelected?.id} />
            }, {
              label: 'Logs',
              key: 'logs',
              component: () =>
                <ApplicationLogs applicationId={applicationSelected?.id} taxonomyId={taxonomySelected?.id} borderedBoxContainerClass={styles.autoscalerLogsBorderexBoxContainer} />
            }
          ]}
          keySelected={keyTabSelected}
          callbackSelected={setKeyTabSelected}
          tabContainerClassName={styles.autoscalerTabContainer}
          tabContentClassName={styles.autoscalerTabContent}
          textClassName={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${styles.customTab}`}
        />
      </div>
    )
  }

  return (
    <div className={styles.autoscalerContainer} ref={ref}>
      {renderComponent()}
    </div>
  )
})

export default Autoscaler
