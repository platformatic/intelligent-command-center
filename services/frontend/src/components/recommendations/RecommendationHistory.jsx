import { Forms, Icons, LoadingSpinnerV2, Modal, Button } from '@platformatic/ui-components'
import React, { useEffect, useState } from 'react'

import styles from './RecommendationHistory.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import { MEDIUM, WHITE, SMALL, MODAL_FULL_RICH_BLACK_V2, RICH_BLACK, MODAL_POPUP_V2, DULLS_BACKGROUND_COLOR, MAIN_GREEN } from '@platformatic/ui-components/src/components/constants'
import { getFormattedTimeAndDate } from '../../utilities/dates'
import useICCStore from '../../useICCStore'
import Paginator from '../ui/Paginator'
import StatusPill from './StatusPill'
import DetailView from './DetailView'
import NoDataFound from '~/components/ui/NoDataFound'
// import { callApiGetRecommendations } from '../../api/recommendations'
import { callApiGetCacheRecommendations, callApiUpdateRecommendationStatus, callApiTriggerTrafficante } from '../../api/cache-recommendations'

/** @typedef Recommendation
 * @property {string} createdAt
 * @property {string} status
 * @property {number} steps
 *
**/
const VISIBLE_ROWS = 16
export default function RecommendationsHistory () {
  const typeFilterOptions = [
    { label: 'All recommendations', value: 'all' },
    { label: 'System Recommendations', value: 'system' },
    { label: 'Cache Recommendations', value: 'cache' }
  ]
  const globalState = useICCStore()
  const { showSplashScreen } = globalState
  const [innerLoading, setInnerLoading] = useState(true)
  const [pagesCount, setPagesCount] = useState(0)
  const [showRecommendationModal, setShowRecommendationModal] = useState(false)
  const [detailView, setDetailView] = useState(null)
  const [showConfirmExitFromNewCacheRecommendationModal, setShowConfirmExitFromNewCacheRecommendationModal] = useState(false)
  /** @type {[Recommendation[], React.Dispatch<Recommendation[]>]} */
  const [visibleRows, setVisibleRows] = useState([])
  /** @type {[Recommendation[], React.Dispatch<Recommendation[]>]} */
  const [recommendations, setRecommendations] = useState([])
  const [typeFilter, setTypeFilter] = useState(typeFilterOptions[0])

  function handlePaginationClick (page) {
    const start = VISIBLE_ROWS * page
    const end = start + VISIBLE_ROWS
    const visible = recommendations.slice(start, end)
    setVisibleRows(visible)
  }
  function handleSelectTypeFilter (event) {
    const selectedFilter = typeFilterOptions.find((option) => option.value === event.detail.value)
    setTypeFilter(selectedFilter)
  }
  function handleDetailClick (recommendation) {
    setDetailView(recommendation)
    setShowRecommendationModal(true)
  }

  function applyFilters () {
    if (typeFilter.value === 'all') {
      setVisibleRows(recommendations)
    } else {
      setVisibleRows(recommendations.filter((r) => r.type === typeFilter.value))
    }
  }
  useEffect(() => {
    // apply filters to recommendations
    applyFilters()
  }, [recommendations])

  useEffect(() => {
    applyFilters()
  }, [typeFilter])
  useEffect(() => {
    if (showRecommendationModal === false && detailView !== null) {
      // the detail modal was closed
      setDetailView(null)
    }
  }, [showRecommendationModal])

  useEffect(() => {
    if (detailView === null) {
      getRecommendationsHistory()
    }
  }, [detailView])

  async function getCacheRecommendations () {
    const cacheRecommendations = await callApiGetCacheRecommendations()
    return cacheRecommendations.map((r) => {
      return { ...r, type: 'cache' }
    })
  }

  // async function getSystemRecommendations () {
  //   const systemRecommendations = await callApiGetRecommendations()
  //   return systemRecommendations.map((r) => {
  //     return { ...r, type: 'system' }
  //   })
  // }

  async function getRecommendationsHistory () {
    setInnerLoading(false)
    // TODO: uncomment when system recommendations are implemented
    // const systemRecommendations = await getSystemRecommendations()
    const cacheRecommendations = await getCacheRecommendations()

    // const allRecommendations = [...systemRecommendations, ...cacheRecommendations]
    const allRecommendations = [...cacheRecommendations]

    // sort by createdAt descending
    allRecommendations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    setRecommendations(allRecommendations)
    setPagesCount(Math.ceil(allRecommendations.length / VISIBLE_ROWS))
    setVisibleRows(allRecommendations.slice(0, VISIBLE_ROWS))
  }

  if (innerLoading) {
    return (
      <LoadingSpinnerV2
        loading
        applySentences={{
          containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
          sentences: [{
            style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
            text: 'Loading ...'
          }]
        }}
        containerClassName={loadingSpinnerStyles.loadingSpinner}
        spinnerProps={{ size: 40, thickness: 3 }}
      />
    )
  }
  function renderNumberOfChanges (recommendation) {
    if (recommendation.type === 'system') {
      return recommendation.steps?.length || '-'
    }
    return recommendation.count
  }

  function renderTitle (recommendation) {
    let icon
    let type
    if (recommendation.type === 'system') {
      icon = <Icons.AppOptimizedIcon color={WHITE} size={SMALL} />
      type = 'System'
    } else {
      icon = <Icons.AppOptimizedIcon color={WHITE} size={SMALL} />
      type = 'Cache'
    }
    return (
      <div className={styles.recommendationTitle}>
        {icon}
        {type} #{recommendation.type === 'cache' ? recommendation.version : recommendation.count}
      </div>
    )
  }
  function renderRows () {
    const output = visibleRows.map((r, index) => {
      return (
        <tr key={index} className={`${styles.tableRow} ${r.status === 'new' ? styles.isNew : ''}`}>
          {/* <td className={styles.tdIndex} align='center'><div>{r.count}</div></td> */}
          <td>{renderTitle(r)}</td>
          <td><div className={styles.tdDate}>{getFormattedTimeAndDate(r.createdAt)}</div></td>
          <td>{renderNumberOfChanges(r)}</td>
          <td>
            <StatusPill status={r.status} />
          </td>
          {/* Lint rules of multi-line ternaries are mutually exclusive... */}
          {r.status === 'calculating' && <td />}
          {r.status !== 'calculating' && (
            <td className={styles.tdActions} onClick={() => handleDetailClick(r)}>
              View Recommendation
              <Icons.InternalLinkIcon color={WHITE} size={SMALL} />
            </td>
          )}
        </tr>
      )
    })
    return output
  }

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
          <Icons.AppOptimizedIcon color={WHITE} size={MEDIUM} />
          <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Recommendations History</p>
        </div>

        <div className={styles.filter}>
          <Button
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.mediumButtonPadding}
            label='DEMO: Optimize Cache'
            onClick={async () => {
              setInnerLoading(true)
              const result = await callApiTriggerTrafficante()
              setInnerLoading(false)
              if (result) {
                getRecommendationsHistory()
                showSplashScreen({
                  title: 'Recommendation triggered',
                  content: 'You successfully triggered the recommendation',
                  type: 'success',
                  onDismiss: () => {
                    getRecommendationsHistory()
                  }
                })
              } else {
                showSplashScreen({
                  title: 'No new recommendations',
                  content: 'No new recommendations were generated. Try to make some requests to the application.',
                  type: 'error',
                  onDismiss: () => {

                  }
                })
              }
            }}
            color={RICH_BLACK}
            backgroundColor={MAIN_GREEN}
            hoverEffect={DULLS_BACKGROUND_COLOR}
          />
          <Forms.Select
            backgroundColor={RICH_BLACK}
            borderColor={WHITE}
            defaultOptionsClassName={`${typographyStyles.desktopButtonSmall} ${styles.maxHeightOptions}`}
            options={typeFilterOptions}
            onSelect={handleSelectTypeFilter}
            optionsBorderedBottom={false}
            mainColor={WHITE}
            borderListColor={WHITE}
            value={typeFilter.label}
            inputTextClassName={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite} ${styles.heightSelectClass}`}
            paddingClass={styles.selectPaddingClass}
            handleClickOutside
          />
        </div>
      </div>
      {visibleRows.length === 0 && (
        <NoDataFound fullCentered title='No recommendations found' />
      )}
      {visibleRows.length > 0 && (
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th align='left'>Type</th>
                <th align='left'>Date</th>
                <th align='left'>Number of changes</th>
                <th align='left'>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {renderRows()}
            </tbody>

          </table>
        </div>
      )}
      {pagesCount > 1 && (
        <Paginator
          pagesNumber={pagesCount}
          onClickPage={(page) => handlePaginationClick(page)}
          selectedPage={0}
        />
      )}
      {showRecommendationModal && (
        <Modal
          key='recommendationDetail'
          layout={MODAL_FULL_RICH_BLACK_V2}
          setIsOpen={(value) => {
            if (detailView?.type === 'cache' && detailView?.status === 'new') {
              setShowConfirmExitFromNewCacheRecommendationModal(true)
            } else {
              setShowRecommendationModal(value)
            }
          }}
          childrenClassContainer={`${styles.modalClassName} ${styles.rootV1}`}
          modalCloseClassName={styles.modalCloseClassName}
        >
          <DetailView
            recommendation={detailView}
            onRecommendationUpdate={(newStatus) => {
              setDetailView({
                ...detailView,
                status: newStatus
              })
            }}
          />

        </Modal>
      )}

      {showConfirmExitFromNewCacheRecommendationModal && (
        <Modal
          key='recommendationActionConfirm'
          layout={MODAL_POPUP_V2}
          title='What would you like to do?'
          setIsOpen={setShowConfirmExitFromNewCacheRecommendationModal}
          childrenClassContainer={`${styles.modalClassName} ${styles.rootV1}`}
          modalCloseClassName={styles.modalCloseClassName}
        >
          <div className={`${styles.modalText} ${typographyStyles.desktopBodySmall}`}>
            <p>You haven't made a decision about this recommendation yet. You can choose to decide now or later.</p>
            <p>Please note that if a new recommendation becomes available, it will automatically replace the current one.</p>
          </div>

          <div className={styles.modalButtons}>
            <Button
              type='button'
              textClass={typographyStyles.desktopButtonSmall}
              paddingClass={commonStyles.mediumButtonPadding}
              label='Skip this recommendation'
              onClick={async () => {
                await callApiUpdateRecommendationStatus(detailView, 'skipped')
                setShowConfirmExitFromNewCacheRecommendationModal(false)
                setShowRecommendationModal(false)
              }}
              color={WHITE}
              backgroundColor={RICH_BLACK}
              hoverEffect={DULLS_BACKGROUND_COLOR}
            />
            <Button
              type='button'
              textClass={typographyStyles.desktopButtonSmall}
              paddingClass={commonStyles.mediumButtonPadding}
              label='I will work on it'
              bordered={false}
              onClick={async () => {
                await callApiUpdateRecommendationStatus(detailView, 'in_progress')
                setShowConfirmExitFromNewCacheRecommendationModal(false)
                setShowRecommendationModal(false)
              }}
              color={RICH_BLACK}
              backgroundColor={WHITE}
              hoverEffect={DULLS_BACKGROUND_COLOR}
            />
          </div>
          <div
            className={styles.modalFooter} onClick={() => {
              setShowConfirmExitFromNewCacheRecommendationModal(false)
              setShowRecommendationModal(false)
            }}
          >
            Decide later
          </div>
        </Modal>
      )}

    </div>
  )
}
