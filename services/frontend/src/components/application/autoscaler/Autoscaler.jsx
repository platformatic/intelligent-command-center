import React, { useState } from 'react'
import styles from './Autoscaler.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import Pods from '~/components/pods/Pods'
import { TabbedWindow } from '@platformatic/ui-components'
import AutoscalerOverview from './AutoscalerOverview'
import AutoscalerEventsTable from './AutoscalerEventsTable'
import { useRouteLoaderData } from 'react-router-dom'

const Autoscaler = React.forwardRef(({ _ }, ref) => {
  const { application } = useRouteLoaderData('appRoot')
  const [keyTabSelected, setKeyTabSelected] = useState('overview')

  return (
    <div className={styles.autoscalerContainer} ref={ref}>
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
                  application={application}
                  onViewFullHistory={() => setKeyTabSelected('scaling_history')}
                  onViewPodsDetails={() => setKeyTabSelected('pods')}
                />
              )
            }, {
              label: 'Pods',
              key: 'pods',
              component: () => <Pods applicationId={application?.id} />
            }, {
              label: 'Scaling History',
              key: 'scaling_history',
              component: () =>
                <AutoscalerEventsTable
                  applicationId={application?.id}
                  deploymentId={application?.latestDeployment.id}
                />
            }
          ]}
          keySelected={keyTabSelected}
          callbackSelected={setKeyTabSelected}
          tabContainerClassName={styles.autoscalerTabContainer}
          tabContentClassName={styles.autoscalerTabContent}
          textClassName={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${styles.customTab}`}
        />
      </div>
    </div>
  )
})

export default Autoscaler
