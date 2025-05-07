import React, { useState } from 'react'
import PropTypes from 'prop-types'
import styles from './AutoscalerOverview.module.css'
import ReplicaSetScaling from './overview/ReplicaSetScaling'
import ScalingHistory from './overview/ScalingHistory'
import Requests from './overview/Requests'
import ReplicaSetOverview from './overview/ReplicaSetOverview'
import ErrorComponent from '~/components/errors/ErrorComponent'

const AutoscalerOverview = React.forwardRef(({
  applicationId,
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
              applicationId={applicationId}
            />
            <ReplicaSetOverview
              gridClassName={styles.boxReplicaSetOverview}
              applicationId={applicationId}
              onViewPodsDetails={onViewPodsDetails}
            />
          </div>
          <ReplicaSetScaling
            gridClassName={styles.boxReplicaSetScaling}
            onErrorOccurred={onInternalError}
            applicationId={applicationId}
          />
          <ScalingHistory
            onErrorOccurred={onInternalError}
            onViewFullHistory={onViewFullHistory}
          />
        </div>
      </div>
    </div>
  )
})

AutoscalerOverview.propTypes = {
  /**
   * applicationId
   */
  applicationId: PropTypes.string,
  /**
   * taxonomyId
   */
  taxonomyId: PropTypes.string,
  /**
   * onViewFullHistory
    */
  onViewFullHistory: PropTypes.func,
  /**
   * onViewPodsDetails
    */
  onViewPodsDetails: PropTypes.func
}

export default AutoscalerOverview
