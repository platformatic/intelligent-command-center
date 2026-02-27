import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './TableActivities.module.css'
import { LoadingSpinnerV2 } from '@platformatic/ui-components'
import Row from './Row'
import NoDataFound from '~/components/ui/NoDataFound'

function TableActivities ({
  activitiesLoaded = false,
  activities = [],
  showWattName = false,
  onErrorOccurred = () => {}
}) {
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)

  useEffect(() => {
    if (activitiesLoaded) {
      setShowNoResult(activities.length === 0)
      setInnerLoading(false)
    }
  }, [activitiesLoaded, activities.length])

  if (innerLoading) {
    return (
      <div className={styles.container}>
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
      </div>
    )
  }

  if (showNoResult) {
    return (
      <div className={styles.container}>
        <NoDataFound
          title='No Activities yet'
          subTitle={<span>There's no history of activities between your apps.<br />If you don't currently have any watts in the Command Center, you can add one now.</span>}
        />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr>
            {showWattName && (
              <th className={styles.th}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Watt Name</span>
              </th>
            )}
            <th className={styles.th}>
              <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Date & Time (GMT)</span>
            </th>
            <th className={styles.th}>
              <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Activity</span>
            </th>
            <th className={styles.th}>
              <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Description</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {activities.map(activity => (
            <Row key={activity.id} {...activity} showWattName={showWattName} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TableActivities
