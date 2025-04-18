import React, { useEffect, useState } from 'react'
import styles from './DetailView.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { MEDIUM, RICH_BLACK, SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import StatusPill from './StatusPill'
import Step from './Step'
import Graph from './Graph'
import ActionSelector from './ActionSelector'
import { callApiUpdateRecommendation } from '../../api/recommendations'
import NoDataFound from '~/components/ui/NoDataFound'
import SplashScreen from './SplashScreen'
import Detail from './cache/Detail'
import RouteDetail from './cache/RouteDetail'
import CacheHistory from './cache/CacheHistory'

import {
  CACHE_RECOMMENDATION_DETAIL_PAGE,
  CACHE_RECOMMENDATION_ROUTE_PAGE,
  CACHE_RECOMMENDATION_ROUTE_HISTORY_PAGE,
  CACHE_RECOMMENDATION_ROUTE_CACHE_TAG_PAGE,
  SYSTEM_RECOMMENDATION_DETAIL_PAGE
} from './pages'
import PageSection from '../ui/PageSection'
import { callApiUpdateRecommendationRoute, callApiUpdateRecommendationStatus } from '../../api/cache-recommendations'
import { normalizeHistory } from './cache/utils'
import CacheTagEditor from './cache/CacheTagEditor'
import { Button } from '@platformatic/ui-components'
import useICCStore from '../../useICCStore'

export default function DetailView ({
  recommendation = null,
  onRecommendationUpdate = (newStatus) => {}
}) {
  const [currentStatus, setCurrentStatus] = useState(recommendation?.status)
  const [showSplashScreen, setShowSplashScreen] = useState(false)
  const [splashScreenType, setSplashScreenType] = useState('')

  const [cacheTag, setCacheTag] = useState('')

  const [modalCurrentPage, setModalCurrentPage] = useState(CACHE_RECOMMENDATION_DETAIL_PAGE)
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [history, setHistory] = useState([])
  const { showSplashScreen: showGlobalSplashScreen } = useICCStore()

  function onHighlightedService (step) {}
  function onHighlightedApp (step) {}
  function onHoverClear () {}

  useEffect(() => {
    if (recommendation.type === 'system') {
      setModalCurrentPage(SYSTEM_RECOMMENDATION_DETAIL_PAGE)
    }
    if (recommendation.type === 'cache') {
      setModalCurrentPage(CACHE_RECOMMENDATION_DETAIL_PAGE)
    }
  }, [recommendation])

  useEffect(() => {
    if (selectedRoute) {
      setHistory(normalizeHistory(selectedRoute.scores.scoresHistory))
    }
  }, [selectedRoute])
  async function onStatusUpdate (recommendation, newStatus) {
    if (recommendation.type === 'system') {
      await callApiUpdateRecommendation(recommendation.id, newStatus)
    } else {
      await callApiUpdateRecommendationStatus(recommendation, newStatus)
    }
    setCurrentStatus(newStatus)
  }

  async function onAbort (recommendation, currentStatus) {
    if (currentStatus === 'in_progress') {
      await onStatusUpdate(recommendation, 'aborted')
      setSplashScreenType('aborted')
      setShowSplashScreen(true)
    }
  }
  async function onConfirm (recommendation, currentStatus) {
    if (currentStatus === 'in_progress') {
      await onStatusUpdate(recommendation, 'done')
      setSplashScreenType('completed')
      setShowSplashScreen(true)
    }
  }
  async function handleChangeStatus (newStatus) {
    onStatusUpdate(recommendation, newStatus)
  }
  function renderContent () {
    if (recommendation.type === 'cache') {
      if (modalCurrentPage === CACHE_RECOMMENDATION_DETAIL_PAGE) {
        return (
          <Detail
            recommendation={recommendation}
            onDetailsClick={(route) => {
              setModalCurrentPage(CACHE_RECOMMENDATION_ROUTE_PAGE)
              setSelectedRoute(route)
            }}
            onOptimizationDone={async (allRoutesOptimized = false) => {
              if (recommendation.status === 'done') {
                return
              }
              await onStatusUpdate(recommendation, 'in_progress')
              onRecommendationUpdate('in_progress')
              if (allRoutesOptimized) {
                await onStatusUpdate(recommendation, 'done')
                onRecommendationUpdate('done')
              }
            }}
          />
        )
      }
      if (modalCurrentPage === CACHE_RECOMMENDATION_ROUTE_PAGE) {
        return (
          <RouteDetail
            routeId={selectedRoute.id}
            onPageChange={(page) => {
              setModalCurrentPage(page)
            }}
          />
        )
      }
      if (modalCurrentPage === CACHE_RECOMMENDATION_ROUTE_CACHE_TAG_PAGE) {
        return (
          <div className={styles.subPageContainer}>
            <div className={styles.subPageTitle}>
              <div className={styles.subPageTitleLeft}>
                <Icons.RouteEditIcon size={MEDIUM} color={WHITE} />
                {selectedRoute.name}
                <span>Cache Tags</span>
              </div>
              <div>
                <Button
                  label='Apply Changes'
                  size={SMALL}
                  onClick={async () => {
                    const payload = {
                      recommendationId: recommendation.id,
                      routeId: selectedRoute.id,
                      cacheTag,
                      ttl: selectedRoute.ttl,
                      varyHeaders: selectedRoute.varyHeaders
                    }
                    await callApiUpdateRecommendationRoute(payload)
                    showGlobalSplashScreen({
                      title: 'Cache Tag Applied',
                      content: 'You successfully edited this Cache Tag',
                      type: 'success',
                      onDismiss: () => {

                      }
                    })
                  }}
                  color={RICH_BLACK}
                  backgroundColor={WHITE}
                />
              </div>
            </div>
            <div className={styles.subPageSecondaryText}>
              Edit cache tags for route <span className={styles.routeName}>{selectedRoute.route}</span>
            </div>
            <CacheTagEditor route={selectedRoute} onTagUpdate={setCacheTag} />
          </div>

        )
      }
      if (modalCurrentPage === CACHE_RECOMMENDATION_ROUTE_HISTORY_PAGE) {
        return (
          <div className={styles.subPageContainer}>
            <div className={styles.subPageTitle}>
              <div className={styles.subPageTitleLeft}>
                <Icons.RoutingIcon size={MEDIUM} color={WHITE} />
                {selectedRoute.route}
              </div>

            </div>
            <PageSection title='Route History'>
              <CacheHistory history={history} />
            </PageSection>

          </div>

        )
      }
    }
    if (recommendation.data.steps.length === 0) {
      return (
        <div className={styles.noData}>
          <NoDataFound
            title='No data for this optimization'
          />
        </div>

      )
    }
    return (
      <>
        <div className={styles.optimizationSteps}>
          <div className={styles.sectionHeader}>
            <span className={typographyStyles.desktopBodySemibold}>Optimization steps</span>
            <span className={`${styles.count} ${typographyStyles.desktopBodySmallest}`}>({recommendation.data.steps.length})</span>
          </div>
          <div className={styles.steps}>
            {recommendation.data.steps.map((step, idx) => {
              return (
                <Step
                  key={idx}
                  step={step}
                  onServiceHover={onHighlightedService}
                  onHoverClear={onHoverClear}
                  onAppHover={onHighlightedApp}
                />
              )
            })}
          </div>
        </div>

        <div className={styles.graph}>
          <div className={`${styles.sectionHeader} ${typographyStyles.desktopBodySemibold}`}>Target System Taxonomy</div>
          <Graph
            data={recommendation.data}
          />
        </div>
      </>

    )
  }

  function renderHeader () {
    const title = `${recommendation.type} Recommendation #${recommendation.count}`
    if (recommendation.type === 'system' || modalCurrentPage === CACHE_RECOMMENDATION_DETAIL_PAGE) {
      return (
        <div className={`${styles.title} ${typographyStyles.desktopHeadline4}`}>
          {recommendation.type === 'system' && (
            <Icons.AppOptimizedIcon color={WHITE} size={MEDIUM} />
          )}
          {recommendation.type === 'cache' && (
            <Icons.CacheRecommendationIcon color={WHITE} size={MEDIUM} />
          )}
          {title}
          <StatusPill status={currentStatus} />
          <ActionSelector
            status={currentStatus}
            changeStatus={handleChangeStatus}
            onAbort={(status) => onAbort(recommendation, status)}
            onConfirm={(status) => onConfirm(recommendation, status)}
          />
        </div>
      )
    }
    if (recommendation.type === 'cache') {
      const bc = [
        <span key='title' className={styles.root} onClick={() => setModalCurrentPage(CACHE_RECOMMENDATION_DETAIL_PAGE)}>{title}</span>,
        <Icons.ArrowRightIcon key='arrow-1' color={WHITE} size={SMALL} />
      ]
      switch (modalCurrentPage) {
        case CACHE_RECOMMENDATION_ROUTE_PAGE:
          bc.push(<span key='route' className={styles.current}>{selectedRoute.route}</span>)
          // Render a breadcrumb with the route name
          break
        case CACHE_RECOMMENDATION_ROUTE_CACHE_TAG_PAGE:
          bc.push(<span key='route' onClick={() => setModalCurrentPage(CACHE_RECOMMENDATION_ROUTE_PAGE)}>{selectedRoute.route}</span>)
          bc.push(<Icons.ArrowRightIcon key='arrow-2' color={WHITE} size={SMALL} />)
          bc.push(<span key='cacheTag' className={styles.current}>Cache Tag</span>)
          break
        case CACHE_RECOMMENDATION_ROUTE_HISTORY_PAGE:
          bc.push(<span key='route' onClick={() => setModalCurrentPage(CACHE_RECOMMENDATION_ROUTE_PAGE)}>{selectedRoute.route}</span>)
          bc.push(<Icons.ArrowRightIcon key='arrow-2' color={WHITE} size={SMALL} />)
          bc.push(<span key='routeHistory' className={styles.current}>Route History</span>)
          break
      }

      return (
        <div className={styles.breadcrumb}>
          {bc}
        </div>
      )
    }
  }
  return (

    <div className={styles.container}>
      {showSplashScreen && (
        <SplashScreen type={splashScreenType} timeout={1500} />
      )}
      {renderHeader()}
      <div className={styles.content}>
        {renderContent()}
      </div>
    </div>
  )
}
