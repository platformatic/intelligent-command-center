import React, { useEffect, useState } from 'react'
import styles from './AllApplications.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import GridApplications from './GridApplications'
import {
  getApiMainTaxonomy
} from '~/api'
import ErrorComponent from '~/components/errors/ErrorComponent'
import useICCStore from '~/useICCStore'
import { Modal } from '@platformatic/ui-components'
import { WHITE, MODAL_FULL_RICH_BLACK_V2, MEDIUM } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import AddApplication from '~/components/application/AddApplication'
import RecommendationBanner from './RecommendationBanner'

const AllApplications = React.forwardRef(({ _ }, ref) => {
  const globalState = useICCStore()
  const {
    taxonomySelected,
    updates
  } = globalState
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(null)
  const [showModalAddApplication, setShowModalAddApplication] = useState(false)
  const [successFullApplicationAdded, setSuccessFullApplicationAdded] = useState(false)

  function hasNewRecommendations () {
    return updates['cluster-manager']?.filter((u) => {
      return u.type === 'new-recommendation'
    }).length > 0
  }
  function hasNewCacheRecommendations () {
    return updates.trafficante?.filter((u) => {
      return u.type === 'new-recommendation'
    }).length > 0
  }

  // TODO: use websocket to refresh applications
  // let pollingInterval = null

  // async function loadApplications () {
  //   const applications = await getApplicationsWithMetadata()
  //   setLocalApplications([...applications])

  //   const mainTaxonomy = await getApiMainTaxonomy()
  //   const lastGeneration = await getLastStartedGeneration(mainTaxonomy.id)
  //   setEnableSidebarFirstLevel(lastGeneration?.mainIteration !== 0)
  //   setLatestRefresDate(new Date())
  // }
  // useEffect(() => {
  //   pollingInterval = setInterval(() => {
  //     loadApplications()
  //   }, REFRESH_INTERVAL_APPLICATIONS)
  //   return () => {
  //     console.log('unmounting')
  //     clearInterval(pollingInterval)
  //   }
  // }, [])

  function handleAddApplicationError (error) {
    handleCloseModalAddApplication()
    setError(error)
    setShowErrorComponent(true)
  }

  function handleCloseAddApplication () {
    handleCloseModalAddApplication()
    setSuccessFullApplicationAdded(false)
  }

  function handleAddApplication () {
    setShowModalAddApplication(true)
  }

  function handleCloseModalAddApplication () {
    setShowModalAddApplication(false)
  }

  function renderRecommendationBanner () {
    if (hasNewCacheRecommendations()) {
      return <RecommendationBanner cache />
    }
    if (hasNewRecommendations()) {
      return <RecommendationBanner cache={false} />
    }
  }
  return showErrorComponent
    ? <ErrorComponent error={error} onClickDismiss={() => setShowErrorComponent(false)} />
    : (
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
            <GridApplications
              onAddApplication={handleAddApplication}
            />
          </div>
        </div>
        {showModalAddApplication && (
          <Modal
            key='addApplication'
            layout={MODAL_FULL_RICH_BLACK_V2}
            setIsOpen={() => successFullApplicationAdded ? handleCloseAddApplication() : handleCloseModalAddApplication()}
            childrenClassContainer={`${styles.modalClassName} ${styles.rootV1}`}
            modalCloseClassName={styles.modalCloseClassName}
            permanent
          >
            <AddApplication
              onSuccessFullApplicationAdded={() => setSuccessFullApplicationAdded(true)}
              onClickCloseApplication={() => handleCloseAddApplication()}
              onError={(errorReturned) => handleAddApplicationError(errorReturned)}
            />
          </Modal>
        )}
      </>
      )
})

export default AllApplications
