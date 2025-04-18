import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import styles from './AutoscalerScalingHistory.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import TableAutoscalerActivities from './TableAutoscalerActivities'
import { getScalingEventHistory } from '~/api'
import ErrorComponent from '~/components/errors/ErrorComponent'
import { TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import { Button } from '@platformatic/ui-components'

const AutoscalerScalingHistory = React.forwardRef(({ applicationId, taxonomyId }, ref) => {
  const LIMIT = 12
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(null)
  const [activitiesLoaded, setActivitiesLoaded] = useState(false)
  const [reloadActivities, setReloadActivities] = useState(true)
  const [pages, setPages] = useState([])
  const [activitiesPage, setActivitiesPage] = useState(0)
  const [filteredActivities, setFilteredActivities] = useState([])

  useEffect(() => {
    if ((applicationId && taxonomyId && activitiesPage >= 0) || reloadActivities) {
      async function loadApplications () {
        try {
          const response = await getScalingEventHistory(taxonomyId, applicationId)
          const { events: activities, totalCount } = response

          setFilteredActivities([...activities])
          setActivitiesLoaded(true)
          setReloadActivities(false)
          const arrayPages = Array.from(new Array(Math.ceil(totalCount / LIMIT)).keys())
          setPages([...arrayPages])
        } catch (error) {
          console.error(`Error on getDetailActivities ${error}`)
          setError(error)
          setShowErrorComponent(true)
        }
      }
      loadApplications()
    }
  }, [applicationId, taxonomyId, activitiesPage, reloadActivities])

  if (showErrorComponent) {
    return (
      <ErrorComponent
        error={error}
        onClickDismiss={() => {
          setShowErrorComponent(false)
          setReloadActivities(true)
        }}
      />
    )
  }

  return (
    <div className={styles.containerAutoscalerHistory} ref={ref}>
      <div className={styles.contentAutoscalerHistory}>
        <TableAutoscalerActivities
          activitiesLoaded={activitiesLoaded}
          activities={filteredActivities}
          onErrorOccurred={() => setShowErrorComponent(true)}
        />
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
          {pages.map(page =>
            <Button
              key={page}
              paddingClass={commonStyles.buttonPadding}
              label={`${page + 1}`}
              onClick={() => setActivitiesPage(page)}
              color={WHITE}
              selected={page === activitiesPage}
              backgroundColor={TRANSPARENT}
              bordered={false}
            />
          )}
        </div>

      </div>
    </div>
  )
})

AutoscalerScalingHistory.propTypes = {
  /**
   * applicationId
   */
  applicationId: PropTypes.string,
  /**
   * taxonomyId
   */
  taxonomyId: PropTypes.string
}

export default AutoscalerScalingHistory
