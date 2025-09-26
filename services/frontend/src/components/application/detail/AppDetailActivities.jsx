import React, { useEffect, useState } from 'react'
import styles from './AppDetailActivities.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import { getApiActivities } from '~/api'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import { MEDIUM, RICH_BLACK, WHITE, BLACK_RUSSIAN, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, Button, LoadingSpinnerV2 } from '@platformatic/ui-components'
import Icons from '@platformatic/ui-components/src/components/icons'
import commonStyles from '~/styles/CommonStyles.module.css'

import Row from '~/components/application/activities/Row'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import gridStyles from '~/styles/GridStyles.module.css'
import { useNavigate } from 'react-router-dom'
import { APPLICATION_DETAILS_ALL_ACTIVITIES } from '~/paths'
function AppDetailActivities ({ gridClassName = '', application }) {
  const MAX_ACTIVITIES = 5

  const navigate = useNavigate()
  const [innerLoading, setInnerLoading] = useState(true)
  const [activities, setActivities] = useState([])
  const [showNoResult, setShowNoResult] = useState(false)

  useEffect(() => {
    async function getDetailActivities () {
      try {
        setInnerLoading(true)
        setShowNoResult(false)
        const response = await getApiActivities(application.id)
        const { activities } = response
        if (activities.length > 0) {
          setShowNoResult(false)
          setActivities(activities.slice(0, MAX_ACTIVITIES))
        } else {
          setShowNoResult(true)
        }
      } catch (error) {
        console.error(`Error on getDetailActivities ${error}`)
        setShowNoResult(true)
      } finally {
        setInnerLoading(false)
      }
    }
    getDetailActivities()
  }, [])

  function viewAllActivities () {
    navigate(APPLICATION_DETAILS_ALL_ACTIVITIES
      .replace(':applicationId', application.id)
    )
  }

  function renderHeaders () {
    return (
      <div className={styles.tableHeaders}>
        <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle4}`}>
          <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Date & Time (GMT)</span>
        </div>
        <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle4}`}>
          <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Activity</span>
        </div>
        <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle4}`}>
          <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Actor</span>
        </div>
      </div>
    )
  }

  function renderRows () {
    if (showNoResult) { return <NoDataAvailable iconName='NoActivitiesIcon' title='There are not activities yet' /> }

    return activities.map(activity => (
      <Row
        key={activity.id}
        onClickViewJSON={() => handleShowDetailActivity(activity)}
        {...activity}
      />
    )
    )
  }

  function handleShowDetailActivity (activitySelected) {
    // TODO: check if this needs implementation or not
  }

  function renderComponent () {
    if (innerLoading) {
      return (
        <LoadingSpinnerV2
          loading={innerLoading}
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: []
          }}
          containerClassName={loadingSpinnerStyles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }

    return (
      <div className={styles.table}>
        {renderHeaders()}
        {renderRows()}
      </div>
    )
  }

  return (
    <BorderedBox classes={`${gridClassName} ${styles.borderexBoxContainer}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
            <Icons.CheckListIcon
              color={WHITE}
              size={MEDIUM}
            />
            <div>
              <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Activities</p>
            </div>
          </div>
          <div className={styles.buttonContainer}>
            <Button
              type='button'
              label='View All Activities'
              onClick={() => viewAllActivities()}
              color={WHITE}
              backgroundColor={RICH_BLACK}
              paddingClass={commonStyles.smallButtonPadding}
              textClass={typographyStyles.desktopButtonSmall}
              disabled={activities.length === 0}
            />
          </div>
        </div>
        {renderComponent()}
      </div>
    </BorderedBox>
  )
}

export default AppDetailActivities
