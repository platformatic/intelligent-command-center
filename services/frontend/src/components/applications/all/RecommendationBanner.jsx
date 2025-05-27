import React, { useEffect, useState } from 'react'
import styles from './RecommendationBanner.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { Button, Modal } from '@platformatic/ui-components'
import { DULLS_BACKGROUND_COLOR, MODAL_FULL_RICH_BLACK_V2, RICH_BLACK, WHITE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import DetailView from '../../recommendations/DetailView'
import { getLatestNewRecommendation } from '../../../api/recommendations'
import { getLatestNewCacheRecommendation } from '../../../api/cache-recommendations'
import { useNavigate } from 'react-router-dom'
import { PAGE_RECOMMENDATION_HISTORY } from '../../../ui-constants'

export default function RecommendationBanner ({ cache }) {
  const [showRecommendationModal, setShowRecommendationModal] = useState(false)
  const [latestNewRecommendation, setLatestNewRecommendation] = useState(null)
  const [expanded, setExpanded] = useState(true)
  const [detailView, setDetailView] = useState(null)
  const navigate = useNavigate()

  async function handleButtonClick () {
    // get recommendation detail
    if (cache) {
      navigate(PAGE_RECOMMENDATION_HISTORY)
    } else {
      setDetailView(latestNewRecommendation)
    }
  }

  useEffect(() => {
    async function getLatest () {
      if (cache) {
        const recommendation = await getLatestNewCacheRecommendation()
        setLatestNewRecommendation(recommendation)
      } else {
        const recommendation = await getLatestNewRecommendation()
        setLatestNewRecommendation(recommendation)
      }
    }
    getLatest()
  }, [])
  useEffect(() => {
    if (detailView !== null) {
      setShowRecommendationModal(true)
    }
  }, [detailView])
  function renderText () {
    if (cache) {
      return 'We have identified several steps you can take to optimise your caching.'
    }
    return 'We have identified several steps you can take to enhance your application\'s system.'
  }
  return (
    <div className={styles.wrapper}>
      <div className={styles.recommendationBox}>
        <div className={`${styles.background} ${cache ? styles.cache : ''}`}>&nbsp;</div>
        <div className={styles.content}>
          {expanded && <span className={styles.count}># {latestNewRecommendation?.count}</span>}
          <div className={styles.title}>
            <span className={typographyStyles.desktopBodyLargeSemibold}>{cache ? 'Cache Recommendation' : 'Recommendation'} Available</span>
            <span className={styles.newTag}>new</span>

          </div>
          {expanded && (
            <div className={styles.subTitle}>
              <span className={typographyStyles.desktopBodySmall}>
                {renderText()}
              </span>
            </div>
          )}
          {expanded && (
            <div className={styles.button}>
              <Button
                label='See how'
                type='button'
                color={WHITE}
                backgroundColor={RICH_BLACK}
                hoverEffect={DULLS_BACKGROUND_COLOR}
                paddingClass={`${commonStyles.smallButtonPadding}`}
                textClass={typographyStyles.desktopButtonSmall}
                bordered={false}
                platformaticIconAfter={{ iconName: 'InternalLinkIcon', color: WHITE }}
                onClick={handleButtonClick}
              />
            </div>
          )}

        </div>
        {expanded && (
          <div className={styles.icon} onClick={() => setExpanded(!expanded)}>
            <Icons.CollapseSquareIcon color={RICH_BLACK} />
          </div>
        )}
        {!expanded && (
          <div className={`${styles.icon} ${styles.end}`} onClick={() => setExpanded(!expanded)}>
            <Icons.ExpandSquareIcon color={RICH_BLACK} />
          </div>
        )}
      </div>
      {showRecommendationModal && (
        <Modal
          key='recommendationDetail'
          layout={MODAL_FULL_RICH_BLACK_V2}
          setIsOpen={setShowRecommendationModal}
          childrenClassContainer={`${styles.modalClassName} ${styles.rootV1}`}
          modalCloseClassName={styles.modalCloseClassName}
        >
          <DetailView
            recommendation={detailView}
            index={detailView.index}
          />
        </Modal>
      )}
    </div>
  )
}
