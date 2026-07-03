import React, { useEffect, useMemo, useState } from 'react'
import { PlatformaticIcon, TabbedWindow } from '@platformatic/ui-components'
import { MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import ExperimentalTag from '@platformatic/ui-components/src/components/ExperimentalTag'
import { useRouteLoaderData } from 'react-router-dom'
import { getAutoscalerV2Config, getAppServices } from '~/api/autoscaler'
import AutoscalerSettingsPanel from './AutoscalerSettingsPanel'
import PodCountChart from './PodCountChart'
import EluChart from './EluChart'
import LiveStatsPanel from './LiveStatsPanel'
import HistoryTab from './HistoryTab'
import ServicesTab from './ServicesTab'
import PodsTab from './PodsTab'
import PlannerTab from './PlannerTab'
import styles from './AutoscalerV2.module.css'
import { unitPluralCap } from './unitLabel'

const TABS = [
  { key: 'live', label: 'Live' },
  { key: 'pods', label: unitPluralCap },
  { key: 'applications', label: 'Applications' },
  { key: 'history', label: 'History' },
  { key: 'planner', label: 'Planner' }
]

const POLL_INTERVAL = 5000

function LiveTabContent ({ appId, onViewHistory }) {
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!appId) return
    getAppServices(appId).then(svcs => {
      setServices(svcs)
      if (svcs.length > 0) setSelectedService(prev => prev ?? svcs[0]?.id)
    })
  }, [appId])

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), POLL_INTERVAL)
    return () => clearInterval(id)
  }, [])

  const serviceIds = useMemo(() => services.map(s => s.id), [services])

  return (
    <div className={styles.tabContent}>
      <div className={styles.liveTabLayout}>
        <div className={styles.liveCharts}>
          {selectedService
            ? (
              <>
                <div className={styles.growChart}>
                  <PodCountChart appId={appId} serviceId={selectedService} tick={tick} />
                </div>
                <EluChart appId={appId} services={serviceIds} tick={tick} />
              </>
              )
            : (
              <div className={styles.noService}>
                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>
                  No applications available
                </span>
              </div>
              )}
        </div>
        <div className={styles.liveSidePanel}>
          <LiveStatsPanel appId={appId} onViewHistory={onViewHistory} tick={tick} />
        </div>
      </div>
    </div>
  )
}

export default function AutoscalerV2 () {
  const { application } = useRouteLoaderData('appRoot')
  const [selectedTab, setSelectedTab] = useState('planner')
  const [showSettingsPane, setShowSettingsPane] = useState(false)
  const [settingsSections, setSettingsSections] = useState([])
  const [collapsedSections, setCollapsedSections] = useState({})
  const [services, setServices] = useState([])

  useEffect(() => {
    if (!application?.id) return
    getAppServices(application.id).then(svcs => setServices(svcs))
  }, [application?.id])

  useEffect(() => {
    if (!showSettingsPane || !application?.id) return

    async function loadSettings () {
      try {
        const response = await getAutoscalerV2Config(application.id)
        const sections = Array.isArray(response?.sections) ? response.sections : []
        setSettingsSections(sections)
        setCollapsedSections((prev) => {
          const next = { ...prev }
          for (const section of sections) {
            if (section.title.startsWith('LoadPredictor') && next[section.id] === undefined) {
              next[section.id] = false
            }
          }
          return next
        })
      } catch (error) {
        console.error('[AutoscalerV2] Failed to load settings', error)
        setSettingsSections([])
      }
    }

    loadSettings()
  }, [showSettingsPane, application?.id])

  function toggleSection (sectionId) {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  function formatValue (entry) {
    if (entry?.value === null || entry?.value === undefined) {
      return '-'
    }
    if (String(entry.key).endsWith('_MS')) {
      return (
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>
          <span>{entry.value} </span>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>ms</span>
        </span>
      )
    }
    return String(entry.value)
  }

  const tabs = TABS.map(tab => ({
    key: tab.key,
    label: tab.label,
    component: () => {
      if (tab.key === 'live') return <LiveTabContent appId={application?.id} onViewHistory={() => setSelectedTab('history')} />
      if (tab.key === 'pods') {
        return (
          <div className={styles.tabContent}>
            <PodsTab appId={application?.id} />
          </div>
        )
      }
      if (tab.key === 'history') {
        return (
          <div className={styles.tabContent}>
            <HistoryTab appId={application?.id} services={services.map(s => s.id)} />
          </div>
        )
      }
      if (tab.key === 'applications') {
        return (
          <div className={styles.tabContent}>
            <ServicesTab appId={application?.id} />
          </div>
        )
      }
      if (tab.key === 'planner') {
        return (
          <div className={styles.tabContent}>
            <PlannerTab appId={application?.id} />
          </div>
        )
      }
      return (
        <div className={styles.tabContent}>
          <h1 className={`${typographyStyles.desktopHeadingH4} ${typographyStyles.textWhite}`}>{tab.label}</h1>
        </div>
      )
    }
  }))

  return (
    <div className={styles.autoscalerContainer}>
      <div className={styles.autoscalerContent}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
            <PlatformaticIcon iconName='HorizontalPodAutoscalerIcon' color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Autoscaler</p>
            <ExperimentalTag />
          </div>

          <button
            type='button'
            className={styles.settingsButton}
            onClick={() => setShowSettingsPane(true)}
            aria-label='Open autoscaler settings'
          >
            <PlatformaticIcon iconName='GearIcon' color={WHITE} size={MEDIUM} />
          </button>
        </div>

        <TabbedWindow
          key={selectedTab}
          tabs={tabs}
          keySelected={selectedTab}
          callbackSelected={setSelectedTab}
          tabContainerClassName={styles.autoscalerTabContainer}
          tabContentClassName={styles.autoscalerTabContent}
          textClassName={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${styles.customTab}`}
        />
      </div>

      {showSettingsPane && (
        <AutoscalerSettingsPanel
          settingsSections={settingsSections}
          collapsedSections={collapsedSections}
          onToggleSection={toggleSection}
          onClose={() => setShowSettingsPane(false)}
          formatValue={formatValue}
        />
      )}
    </div>
  )
}
