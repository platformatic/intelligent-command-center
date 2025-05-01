import React from 'react'
import styles from './AllApplications.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import GridApplications from './GridApplications'
import { WHITE, MEDIUM } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'

// import RecommendationBanner from './RecommendationBanner'

const AllApplications = React.forwardRef(({ _ }, ref) => {
  // function hasNewRecommendations () {
  //   return updates['cluster-manager']?.filter((u) => {
  //     return u.type === 'new-recommendation'
  //   }).length > 0
  // }
  // function hasNewCacheRecommendations () {
  //   return updates.trafficante?.filter((u) => {
  //     return u.type === 'new-recommendation'
  //   }).length > 0
  // }

  function renderRecommendationBanner () {
    // if (hasNewCacheRecommendations()) {
    //   return <RecommendationBanner cache />
    // }
    // if (hasNewRecommendations()) {
    //   return <RecommendationBanner cache={false} />
    // }
  }
  return (
    <>
      <div className={styles.container} ref={ref}>
        <div className={styles.content}>
          <div className={`${commonStyles.tinyFlexBlock}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
              <Icons.AllAppsIcon color={WHITE} size={MEDIUM} />
              <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Applications</p>
            </div>
          </div>
          {renderRecommendationBanner()}
          <GridApplications />
        </div>
      </div>
    </>
  )
})

export default AllApplications
