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
  taxonomyId,
  onViewFullHistory = () => {},
  onViewPodsDetails = () => {}
}, ref) => {
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(false)

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
              taxonomyId={taxonomyId}
            />
            <ReplicaSetOverview
              gridClassName={styles.boxReplicaSetOverview}
              applicationId={applicationId}
              taxonomyId={taxonomyId}
              onViewPodsDetails={onViewPodsDetails}
            />
          </div>
          <ReplicaSetScaling
            gridClassName={styles.boxReplicaSetScaling}
            onErrorOccurred={(error) => {
              setError(error)
              setShowErrorComponent(true)
            }}
            applicationId={applicationId}
            taxonomyId={taxonomyId}
          />
          <ScalingHistory
            onErrorOccurred={(error) => {
              setError(error)
              setShowErrorComponent(true)
            }}
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
