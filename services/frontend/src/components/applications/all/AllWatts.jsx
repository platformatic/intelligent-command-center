import React, { useState } from 'react'
import styles from './AllWatts.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import WattsGrid from './WattsGrid'
import CreateWattModal from './CreateWattModal'
import { WHITE, MEDIUM, RICH_BLACK, SMALL } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import { Button } from '@platformatic/ui-components'

// import RecommendationBanner from './RecommendationBanner'

const AllWatts = React.forwardRef(({ _ }, ref) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  // Bumped after a create so the grid remounts and reloads immediately, without
  // waiting on the application-created websocket event.
  const [reloadKey, setReloadKey] = useState(0)

  // function hasNewRecommendations () {
  //   return updates['cluster-manager']?.filter((u) => {
  //     return u.type === 'new-recommendation'
  //   }).length > 0
  // }
  // function hasNewCacheRecommendations () {
  //   return updates.trafficInspector?.filter((u) => {
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
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
                <Icons.AllAppsIcon color={WHITE} size={MEDIUM} />
                <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Watts</p>
              </div>
              <Button
                label='Create a new Watt'
                onClick={() => setIsModalOpen(true)}
                color={RICH_BLACK}
                backgroundColor={WHITE}
                platformaticIcon={{ iconName: 'CircleAddIcon', color: RICH_BLACK, size: SMALL }}
                textClass={typographyStyles.desktopButtonSmall}
                paddingClass={commonStyles.smallButtonPadding}
              />
            </div>
          </div>
          {renderRecommendationBanner()}

          <WattsGrid key={reloadKey} />
        </div>
      </div>
      {isModalOpen && (
        <CreateWattModal
          setIsOpen={setIsModalOpen}
          onCreated={() => setReloadKey((key) => key + 1)}
        />
      )}
    </>
  )
})

export default AllWatts
