import React, { useEffect, useState } from 'react'
import PageSection from '../../ui/PageSection'

import { callApiGetCacheRecommendationRoutes, callApiUpdateRecommendationRoute, callApiApplyRecommendation, callApiGetInterceptorConfig } from '../../../api/cache-recommendations'
import { MODAL_POPUP_V2, RICH_BLACK, SMALL, WHITE, DULLS_BACKGROUND_COLOR, MEDIUM, MAIN_GREEN, POSITION_CENTER } from '@platformatic/ui-components/src/components/constants'
import { Button, Checkbox, CopyAndPaste, Icons, Modal, SearchBarV2 } from '@platformatic/ui-components'
import Score from './Score'
import ToggleSwitch from '@platformatic/ui-components/src/components/forms/ToggleSwitch'
import SaveableRequests from './SaveableRequests'
import { renderTTL } from './utils'
import { callApiDeployApplication, getApplicationsRaw } from '../../../api'

import styles from './Detail.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import useICCStore from '~/useICCStore'
import tooltipStyles from '~/styles/TooltipStyles.module.css'
export default function Detail ({
  recommendation,
  onDetailsClick = (route) => {},
  onOptimizationDone = (allRoutesOptimized = false) => {}
}) {
  const { showSplashScreen } = useICCStore()
  const [applications, setApplications] = useState([])
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [routes, setRoutes] = useState([])
  const [appliedApplications, setAppliedApplications] = useState([])

  const [showConfirmAutoOptimizeModal, setShowConfirmAutoOptimizeModal] = useState(false)
  const [showConfirmManualOptimizeModal, setShowConfirmManualOptimizeModal] = useState(false)
  const [manualOptimizeConfig, setManualOptimizeConfig] = useState(null)
  function getApplicationsFromRoutes () {
    return Array.from(new Set(routes.map((route) => route.applicationId)))
  }

  async function getRoutes () {
    const routes = await callApiGetCacheRecommendationRoutes(recommendation.id)
    return routes
  }
  async function setRoutesForApplication () {
    const routes = await getRoutes(selectedApplication)

    const appliedRoutes = routes.find((route) => route.applied)
    if (appliedRoutes) {
      setAppliedApplications([...appliedApplications, appliedRoutes.applicationId])
    }
    setRoutes(routes)
  }
  async function refreshData () {
    const apps = await getApplicationsRaw()
    setApplications(apps)
    if (selectedApplication) {
      setRoutesForApplication()
    }
  }
  useEffect(() => {
    setRoutesForApplication()
  }, [selectedApplication])

  useEffect(() => {
    refreshData()
  }, [])

  useEffect(() => {
    if (!showConfirmManualOptimizeModal) {
      refreshData()
    }
  }, [showConfirmManualOptimizeModal])

  useEffect(() => {
    if (!showConfirmAutoOptimizeModal) {
      refreshData()
    }
  }, [showConfirmAutoOptimizeModal])
  useEffect(() => {
    if (manualOptimizeConfig) {
      setShowConfirmManualOptimizeModal(true)
    }
  }, [manualOptimizeConfig])

  useEffect(() => {
    if (appliedApplications.length !== 0) {
      // if all appliedApplications are in the getApplicationsFromRoutes
      const appFromRoutes = getApplicationsFromRoutes()
      if (appliedApplications.every((application) => appFromRoutes.includes(application))) {
        onOptimizationDone(true)
      }
    }
  }, [appliedApplications])
  function getApplicationName (applicationId) {
    return applications.find((app) => app.id === applicationId)?.name
  }

  function getDataForApplicationCard (applicationId) {
    return {
      name: getApplicationName(applicationId),
      routes: routes.filter((route) => route.applicationId === applicationId)
    }
  }
  function renderApplicationsTitle () {
    return (
      <div className={styles.applicationsTitle}>
        Applications
        <span className={styles.applicationsCount}>({getApplicationsFromRoutes().length})</span>
      </div>
    )
  }
  function renderRoutesTitle () {
    return (
      <div className={styles.applicationsTitle}>
        Routes
        {!appliedApplications.includes(selectedApplication) && (
          <span className={styles.applicationsCount}>({routes.length} Cacheable Routes)</span>
        )}
        {appliedApplications.includes(selectedApplication) && (
          <span className={styles.appliedRoutes}><Icons.CircleCheckMarkIcon color={MAIN_GREEN} size={SMALL} /> (Optimized)</span>
        )}
      </div>
    )
  }
  async function handleManualOptimize () {
    const config = await callApiGetInterceptorConfig(recommendation.id, selectedApplication)
    setManualOptimizeConfig(config)
  }
  function handleAutoOptimize () {
    setShowConfirmAutoOptimizeModal(true)
  }
  function renderRoutesButtons () {
    if (appliedApplications.includes(selectedApplication)) {
      return null
    }
    return (
      <div className={styles.routesButtons}>
        <Button
          label='Manual Optimize'
          color={WHITE}
          backgroundColor={RICH_BLACK}
          size={SMALL}
          onClick={() => handleManualOptimize()}
        />
        <Button
          label='Auto Optimize'
          color={RICH_BLACK}
          backgroundColor={WHITE}
          size={SMALL}
          onClick={() => handleAutoOptimize()}
        />
      </div>
    )
  }
  return (
    <div className={styles.container}>
      {showConfirmAutoOptimizeModal && (
        <Modal
          layout={MODAL_POPUP_V2}
          title='Apply optimization Automatically?'
          setIsOpen={setShowConfirmAutoOptimizeModal}
          childrenClassContainer={`${styles.modalClassName} ${styles.rootV1}`}
          modalCloseClassName={styles.modalCloseClassName}
        >
          <div className={`${styles.modalText} ${typographyStyles.desktopBodySmall}`}>
            <p>You are about to automatically optimize the caching of this application.</p>
            <p>By continuing we will automatically redeploy your application with the new caching.</p>
            <p>Once clicked on Apply and Deploy this recommendation will be marked as "Done" and it won't be applicable again.</p>
          </div>

          <div className={styles.modalButtons}>
            <Button
              type='button'
              textClass={typographyStyles.desktopButtonSmall}
              paddingClass={commonStyles.mediumButtonPadding}
              label='Cancel'
              onClick={async () => {
                setShowConfirmAutoOptimizeModal(false)
              }}
              color={WHITE}
              backgroundColor={RICH_BLACK}
              hoverEffect={DULLS_BACKGROUND_COLOR}
            />
            <Button
              type='button'
              textClass={typographyStyles.desktopButtonSmall}
              paddingClass={commonStyles.smallButtonPadding}
              label='Apply and Deploy'
              bordered={false}
              onClick={async () => {
                await callApiApplyRecommendation(selectedApplication, true)
                callApiDeployApplication(selectedApplication)
                showSplashScreen({
                  title: 'Optimization completed automatically',
                  content: 'Your application is being deployed with the new caching configuration.',
                  type: 'success',
                  onDismiss: () => {
                    onOptimizationDone()
                    setShowConfirmAutoOptimizeModal(false)
                  }
                })
              }}
              color={RICH_BLACK}
              backgroundColor={WHITE}
              hoverEffect={DULLS_BACKGROUND_COLOR}
            />
          </div>
        </Modal>
      )}

      {showConfirmManualOptimizeModal && (
        <Modal
          layout={MODAL_POPUP_V2}
          size={MEDIUM}
          titleClassName={styles.manualOptimizeModalTitle}
          title={`Optimize ${getApplicationName(selectedApplication)} Cache`}
          setIsOpen={setShowConfirmManualOptimizeModal}
          childrenClassContainer={`${styles.modalClassName} ${styles.rootV1}`}
          modalCloseClassName={styles.modalCloseClassName}
        >
          <div className={`${styles.manualOptimizeModalContainer}`}>
            <div className={styles.explanation}>
              <p>Follow our instruction and apply the recommendation manually.</p>
              <p>Make sure to click on the button Optimization Completed once you have followed all the steps.</p>
            </div>
            <div className={styles.content}>
              <div className={styles.subtitle}>
                <p>Apply Manually</p>
              </div>
              <span>Follow the steps below to manually optimize your cache</span>
              <div className={styles.instructions}>
                <ol className={styles.numberedList}>
                  <li>
                    <div style={{ width: '100%' }}>
                      <div className={styles.copyPasteElement}>
                        <span>Copy the cache settings</span>
                        <CopyAndPaste
                          value={JSON.stringify(manualOptimizeConfig)}
                          tooltipLabel='Cache settings copied!'
                          color={WHITE}
                          size={MEDIUM}
                          tooltipClassName={tooltipStyles.tooltipDarkStyle}
                          position={POSITION_CENTER}
                        />

                      </div>
                      <div className={styles.modalConfigContainer}>
                        <pre className={typographyStyles.desktopOtherCliTerminalSmall}>
                          {JSON.stringify(manualOptimizeConfig, null, 2)}
                        </pre>
                      </div>
                    </div>

                  </li>
                  <li>
                    Set the <pre className={typographyStyles.desktopOtherCliTerminalSmall}>PLT_CACHE_CONFIG</pre> environment variable to the value you copied in the previous step
                  </li>
                  <li>Deploy the application</li>
                </ol>
              </div>

            </div>

            <div className={styles.modalButtons}>
              <Button
                type='button'
                textClass={typographyStyles.desktopButtonSmall}
                paddingClass={commonStyles.smallButtonPadding}
                label='I confirm that I have manually applied the Optimization'
                bordered={false}
                onClick={async () => {
                  await callApiApplyRecommendation(selectedApplication, true)
                  showSplashScreen({
                    title: 'Optimization completed manually',
                    content: 'Congratulation you have manually optimized your caching. We have marked this application as optimized.',
                    type: 'success',
                    onDismiss: () => {
                      onOptimizationDone()
                      setShowConfirmManualOptimizeModal(false)
                    }
                  })
                }}
                color={RICH_BLACK}
                backgroundColor={WHITE}
                hoverEffect={DULLS_BACKGROUND_COLOR}
              />
            </div>
          </div>

        </Modal>
      )}

      <PageSection title='Saveable Requests'>
        <SaveableRequests routes={routes} />
      </PageSection>

      <div className={styles.content}>
        <div className={styles.applicationsContainer}>
          <PageSection title={renderApplicationsTitle()}>
            <span className={styles.secondaryText}>The applications that contains routes that can be optimized</span>
            <div className={styles.applicationsList}>
              {getApplicationsFromRoutes().map((application) => {
                return (
                  <ApplicationCard
                    key={application}
                    data={getDataForApplicationCard(application)}
                    onClick={() => setSelectedApplication(application)}
                    selected={selectedApplication === application}
                    applied={appliedApplications.includes(application)}
                  />
                )
              })}
            </div>
          </PageSection>
        </div>

        <div className={styles.routes}>
          {selectedApplication && (
            <PageSection title={renderRoutesTitle()} buttons={renderRoutesButtons()}>
              {selectedApplication && (
                <RoutesTable
                  routes={routes}
                  onDetailsClick={onDetailsClick}
                  applied={appliedApplications.includes(selectedApplication)}
                />
              )}
            </PageSection>
          )}

        </div>
      </div>
    </div>
  )
}
function RoutesTable ({ routes, onDetailsClick, applied }) {
  const [selectedRoutes, setSelectedRoutes] = useState([])
  const [allRoutesSelected, setAllRoutesSelected] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [filteredRoutes, setFilteredRoutes] = useState([])

  useEffect(() => {
    setFilteredRoutes(routes.filter((route) => route.route.toLowerCase().includes(searchValue.toLowerCase())))
  }, [searchValue])

  useEffect(() => {
    if (selectedRoutes.length > 0 && selectedRoutes.length === routes.length) {
      setAllRoutesSelected(true)
    } else {
      setAllRoutesSelected(false)
    }
  }, [selectedRoutes])

  useEffect(() => {
    const selectedRoutes = routes.filter((route) => route.selected)
    if (selectedRoutes.length === routes.length) {
      setAllRoutesSelected(true)
    } else {
      setAllRoutesSelected(false)
    }
    setSelectedRoutes(selectedRoutes.map((route) => route.id))
  }, [routes])

  function handleDetailClick (route) {
    onDetailsClick(route)
  }

  function renderRouteRequests (route) {
    return (
      <div>
        Save <span className={styles.applicationCardFooterTextBold}>{route.hits}</span> of {route.hits + route.misses} requests
      </div>
    )
  }
  async function handleRouteSelection (route, selected) {
    await callApiUpdateRecommendationRoute({
      recommendationId: route.recommendationId,
      routeId: route.id,
      selected,
      ttl: route.ttl,
      cacheTag: route.cacheTag,
      varyHeaders: route.varyHeaders
    })
    if (selected) {
      setSelectedRoutes([...selectedRoutes, route.id])
    } else {
      setAllRoutesSelected(false)
      setSelectedRoutes(selectedRoutes.filter((r) => r !== route.id))
    }
  }

  async function handleAllRoutesSelection (selected) {
    routes.forEach((route) => {
      handleRouteSelection(route, selected)
    })
    if (selected) {
      setAllRoutesSelected(true)
      setSelectedRoutes(routes.map((route) => route.id))
    } else {
      setAllRoutesSelected(false)
      setSelectedRoutes([])
    }
  }
  return (
    <div>

      <div className={styles.routesTableHeader}>
        <div className={styles.searchBarContainer}>
          <SearchBarV2
            placeholder='Search Routes'
            backgroundColor={RICH_BLACK}
            color={WHITE}
            size={SMALL}
            onClear={() => {
              setSearchValue('')
            }}
            onChange={(value) => {
              setSearchValue(value)
            }}
          />
        </div>

        <div className={styles.routesTableHeaderRight}>
          {!applied && (
            <ToggleSwitch
              label='Select All Routes'
              size={SMALL}
              labelClassName={styles.toggleSwitchLabel}
              color={WHITE}
              checked={allRoutesSelected}
              onChange={() => {
                handleAllRoutesSelection(!allRoutesSelected)
              }}
            />
          )}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Route</th>
            <th>Score</th>
            <th>TTL</th>
            <th>Requests</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filteredRoutes.map((route, idx) => {
            return (
              <tr key={idx} className={styles.tableRow}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                    <span className={styles.checkboxContainer}>
                      <Checkbox
                        color={WHITE} checked={selectedRoutes.includes(route.id)}
                        onChange={async (event) => {
                          await handleRouteSelection(route, event.target.checked)
                        }}
                        disabled={applied}
                      />
                    </span>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {route.route}
                      <span className={styles.secondaryText}>{route.serviceName}</span>
                    </div>
                  </div>
                </td>
                <td><Score value={route.score * 100} recommended={70} /></td>
                <td>{renderTTL(route.ttl)}</td>
                <td>{renderRouteRequests(route)}</td>
                <td className={styles.tdActions} onClick={() => handleDetailClick(route)}>
                  View Details
                  <Icons.InternalLinkIcon color={WHITE} size={SMALL} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
function ApplicationCard ({ data, onClick, selected, applied }) {
  function renderRouteRequests () {
    const routesTotals = data.routes.reduce((acc, route) => {
      acc.hits += route.hits
      acc.misses += route.misses
      return acc
    }, { hits: 0, misses: 0 })
    return (
      <div className={styles.applicationCardFooterText}>
        Save <span className={styles.applicationCardFooterTextBold}>{routesTotals.hits}</span> of {routesTotals.hits + routesTotals.misses} requests
      </div>
    )
  }
  return (
    <div className={`${styles.applicationCard} ${selected ? styles.applicationCardSelected : ''}`} onClick={onClick}>
      <div className={styles.applicationCardHeader}>
        <div className={styles.applicationCardName}>
          {data.name}
          {applied && <Icons.CircleCheckMarkIcon color={MAIN_GREEN} size={MEDIUM} />}
        </div>
        <Icons.InternalLinkIcon color={WHITE} size={SMALL} />
      </div>

      <div className={styles.applicationCardFooter}>
        <div className={styles.applicationCardFooterText}>Cacheable routes:&nbsp;&nbsp;
          <span className={styles.applicationCardFooterTextWhite}>{data.routes.length}</span>
        </div>
        {renderRouteRequests()}
      </div>
    </div>
  )
}
