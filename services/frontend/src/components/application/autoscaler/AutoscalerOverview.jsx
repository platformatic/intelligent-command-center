import React, { useState } from 'react'
import styles from './AutoscalerOverview.module.css'
import ReplicaSetScaling from './overview/ReplicaSetScaling'
import ScalingHistory from './overview/ScalingHistory'
import Requests from './overview/Requests'
import ReplicaSetOverview from './overview/ReplicaSetOverview'
import ErrorComponent from '~/components/errors/ErrorComponent'

const AutoscalerOverview = React.forwardRef(({
  application,
  onViewFullHistory = () => {},
  onViewPodsDetails = () => {}
}, ref) => {
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(false)

  function onInternalError (error) {
    setError(error)
    setShowErrorComponent(true)
  }

  if (showErrorComponent) {
    return <ErrorComponent error={error} message={error.message} onClickDismiss={() => setShowErrorComponent(false)} />
  }
  return (
    <div className={styles.autoscalerOverviewContainer} ref={ref}>
      <div className={styles.containerElement}>
        <div className={styles.autoscalerOverviewContent}>
          <div className={styles.boxRequestsAndSetOverview}>
            <Requests
              gridClassName={styles.boxRequests}
              application={application}
            />
            <ReplicaSetOverview
              gridClassName={styles.boxReplicaSetOverview}
              application={application}
              onViewPodsDetails={onViewPodsDetails}
            />
          </div>
          <ReplicaSetScaling
            gridClassName={styles.boxReplicaSetScaling}
            onErrorOccurred={onInternalError}
            applicationId={application.id}
          />
          <ScalingHistory
            onViewFullHistory={onViewFullHistory}
          />
        </div>
      </div>
    </div>
  )
})

export default AutoscalerOverview
