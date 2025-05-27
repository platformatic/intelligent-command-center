import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './TableActivities.module.css'
import { LoadingSpinnerV2 } from '@platformatic/ui-components'
import Row from './Row'
import NoDataFound from '~/components/ui/NoDataFound'
import gridStyles from '~/styles/GridStyles.module.css'

function TableActivities ({
  activitiesLoaded = false,
  activities = [],
  onErrorOccurred = () => {}
}) {
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)

  useEffect(() => {
    if (activitiesLoaded) {
      if (activities.length === 0) {
        setShowNoResult(true)
      } else {
        setShowNoResult(false)
      }
      setInnerLoading(false)
    }
  }, [activitiesLoaded, activities.length])

  function renderComponent () {
    if (innerLoading) {
      return (
        <LoadingSpinnerV2
          loading={innerLoading}
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: [{
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
              text: 'Loading your activities...'
            }, {
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`,
              text: 'This process will just take a few seconds.'
            }]
          }}
          containerClassName={styles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }

    if (showNoResult) { return <NoDataFound title='No Activities yet' subTitle={<span>There's no history of activities between your apps.<br />If you don't currently have any applications in the Command Center, you can add one now.</span>} /> }

    return (
      <div className={styles.content}>
        <div className={styles.tableActivities}>
          <div className={styles.tableHeaders}>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle4}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Date & Time (GMT)</span>
              </div>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle4}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Activity</span>
              </div>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle4}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Actor</span>
              </div>
            </div>
          </div>

          {activities.map(activity => (
            <Row key={activity.id} {...activity} />
          ))}

        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.container}`}>
      {renderComponent()}
    </div>
  )
}

export default TableActivities
