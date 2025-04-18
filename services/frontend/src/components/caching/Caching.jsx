import React, { useEffect, useState } from 'react'
import { WHITE, RICH_BLACK, BLACK_RUSSIAN, MEDIUM, SMALL, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import styles from './Caching.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import useICCStore from '~/useICCStore'
import { PAGE_CACHING } from '~/ui-constants'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import { Forms, Icons, LoadingSpinnerV2, BorderedBox } from '@platformatic/ui-components'
import {
  callApiGetApplicationHttpCacheDetail, callApiInvalidateApplicationHttpCache, getApplicationsWithMetadata,
  callApiGetCacheDependents, callApiGetCacheTraces
} from '../../api'
import CachedEntries from './CachedEntries'
import CachedEntryPanel from './CachedEntryPanel'
import CachingStats from './CachingStats'
import ErrorComponent from '~/components/errors/ErrorComponent'

const Caching = React.forwardRef(({ _ }, ref) => {
  const [applications, setApplications] = useState([])
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [applicationsOptions, setApplicationsOptions] = useState([])
  const [innerLoading, setInnerLoading] = useState(true)
  const globalState = useICCStore()
  const { setNavigation, setCurrentPage } = globalState
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [showCachedEntryPanel, setShowCachedEntryPanel] = useState(false)
  const [compareWithAll, setCompareWithAll] = useState(false)
  const [showChart, setShowChart] = useState(true)
  const [showInvalidCacheWarning, setShowInvalidCacheWarning] = useState(false)

  async function handleInvalidate (entry) {
    const res = await callApiInvalidateApplicationHttpCache(selectedApplication.id, [entry])
    if (res === true) {
      setShowCachedEntryPanel(false)
    }
  }
  async function onCacheEntrySelected (entry, selected) {
    try {
      if (selected === true) {
        // get Entry body
        const body = await callApiGetApplicationHttpCacheDetail(selectedApplication.id, entry.id, entry.kind)
        entry.body = body
        entry.isSelected = true
        if (entry.kind === 'HTTP_CACHE') {
          const dependents = await callApiGetCacheDependents(selectedApplication.id, entry.id)
          const traces = await callApiGetCacheTraces(entry.id)
          entry.dependents = dependents
          entry.traces = traces
          entry.applications = applications
        }
        setSelectedEntry(entry)
      }
    } catch (e) {
      if (e?.statusCode === 404) {
        setShowInvalidCacheWarning(true)
        return
      }
      throw e
    }
    setShowCachedEntryPanel(selected)
  }

  useEffect(() => {
    setInnerLoading(false)
  }, [selectedApplication])
  useEffect(() => {
    async function getApps () {
      const apps = await getApplicationsWithMetadata()
      await setApplications(apps)
      if (apps.length > 0) {
        setInnerLoading(false)
        setApplicationsOptions(
          apps.map(application => ({
            value: application.id,
            label: application.name
          }))
        )
        setSelectedApplication(apps[0])
      }

      setNavigation({
        label: 'Caching',
        handleClick: () => {
          setCurrentPage(PAGE_CACHING)
        },
        key: PAGE_CACHING,
        page: PAGE_CACHING
      }, 0)
    }

    getApps()
  }, [])
  if (showInvalidCacheWarning) {
    return (
      <ErrorComponent
        title='This cache is invalid'
        message='The cache selected is not valid.'
        onClickDismiss={() => setShowInvalidCacheWarning(false)}
      />
    )
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
  return (
    <div className={styles.cachingContainer} ref={ref}>
      <div className={styles.title}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
          <Icons.CachingIcon color={WHITE} size={MEDIUM} />
          <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Caching</p>
        </div>
      </div>
      <div className={styles.cachingPage}>

        <BorderedBox backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
          <div className={styles.header}>
            <div className={styles.appSelector}>
              <Forms.Select
                defaultContainerClassName={styles.select}
                backgroundColor={RICH_BLACK}
                borderColor={WHITE}
                defaultOptionsClassName={`${typographyStyles.desktopButtonSmall} ${styles.optionsClass}`}
                options={applicationsOptions}
                onSelect={async (evt) => {
                  const app = applications.find((app) => app.id === evt.detail.value)
                  await setSelectedApplication(null)
                  await setSelectedApplication(app)
                }}
                optionsBorderedBottom={false}
                mainColor={WHITE}
                borderListColor={WHITE}
                value={selectedApplication?.name}
                inputTextClassName={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite} ${styles.heightSelectClass}`}
                paddingClass={styles.selectPaddingClass}
                handleClickOutside
                placeholder='Select Application...'
              />
            </div>

            <div className={styles.cachingStatsControls}>
              <div>
                <Forms.ToggleSwitch
                  label='Compare with All Applications Metrics'
                  labelClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
                  name='selectAllServices'
                  onChange={() => setCompareWithAll(!compareWithAll)}
                  checked={compareWithAll}
                  size={SMALL}
                />
              </div>
              <div
                className={styles.cachingStatsCollapse} onClick={() => {
                  setShowChart(!showChart)
                }}
              >
                {showChart
                  ? <Icons.CollapseIcon
                      color={WHITE} size={SMALL}
                    />
                  : <Icons.EnlargeIcon
                      color={WHITE} size={SMALL}
                    />}
              </div>
            </div>

          </div>
          {selectedApplication && showChart && (
            <div className={styles.cachingStats}>
              <CachingStats application={selectedApplication} compareWithAll={compareWithAll} />
            </div>)}
        </BorderedBox>

        <BorderedBox backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
          <div className={styles.cachingContent}>
            {!selectedApplication && (
              <div className={styles.noApplicationSelected}>
                Please select an application from the dropdown menu.
              </div>
            )}
            {selectedApplication && !showCachedEntryPanel && (
              <CachedEntries
                application={selectedApplication}
                onCacheEntrySelected={onCacheEntrySelected}
                hideChart={() => setShowChart(false)}
              />
            )}
            {showCachedEntryPanel && (
              <div className={styles.panel}>
                <CachedEntryPanel
                  entry={selectedEntry}
                  onClose={() => setShowCachedEntryPanel(false)}
                  onInvalidate={handleInvalidate}
                />
              </div>
            )}
          </div>

        </BorderedBox>
      </div>
    </div>
  )
})

export default Caching
