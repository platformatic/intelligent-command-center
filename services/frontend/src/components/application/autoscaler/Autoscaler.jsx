import React, { useEffect, useState } from 'react'
import styles from './Autoscaler.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import Pods from '~/components/pods/Pods'
import { TabbedWindow } from '@platformatic/ui-components'
import ScalerEvents from './ScalerEvents'
import SignalsHistory from './SignalsHistory'
import { useRouteLoaderData, useSearchParams } from 'react-router-dom'
import ExperimentalTag from '@platformatic/ui-components/src/components/ExperimentalTag'
import DeploymentsDropdown from '../detail/deployments/DeploymentsDropdown'
import NotLatestDeploymentBanner from './NotLatestDeploymentBanner'
import { getVersionRegistryByApplicationId } from '~/api'

export default function Autoscaler () {
  const { application } = useRouteLoaderData('appRoot')
  const [keyTabSelected, setKeyTabSelected] = useState('pods')
  const [versions, setVersions] = useState(
    /** @type {Array<{ id: string, versionLabel: string, status: string }>} */ ([])
  )
  const [selectedVersionLabel, setSelectedVersionLabel] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab')

  const selectedVersion = versions.find(v => v.versionLabel === selectedVersionLabel)
  const isSelectedVersionActive = selectedVersion?.status === 'active'

  useEffect(() => {
    if (!application?.id) return
    getVersionRegistryByApplicationId(application.id)
      .then((list) => {
        setVersions(list)
        const versionLabelFromUrl = searchParams.get('versionLabel')
        const validFromUrl = versionLabelFromUrl && list.some(v => v.versionLabel === versionLabelFromUrl)
        setSelectedVersionLabel((current) => {
          const stillValid = current && list.some(v => v.versionLabel === current)
          if (stillValid) return current
          if (validFromUrl) return versionLabelFromUrl
          const activeVersion = list.find(v => v.status === 'active')
          return activeVersion?.versionLabel ?? list[0]?.versionLabel ?? ''
        })
      })
      .catch((err) => {
        console.error('getVersionRegistryByApplicationId', err)
        setVersions([])
      })
  }, [application?.id])

  // Sync selection from URL when versionLabel param changes (e.g. hotlink, back/forward)
  useEffect(() => {
    const labelFromUrl = searchParams.get('versionLabel')
    if (!labelFromUrl || versions.length === 0) return
    if (versions.some(v => v.versionLabel === labelFromUrl)) {
      setSelectedVersionLabel(labelFromUrl)
    }
  }, [searchParams, versions])

  function handleTabChange (tab) {
    // TODO: setting the tab is useful to permalink some inner section of the page.
    // But it's not working as expected.
    // It's not working because the tabbed window is not a react-router component.
    // That makes some visual glitches when the tab is changed.
    // So we need to use a different approach to handle the tab change.
    // For now, we'll just use the keyTabSelected state to handle the tab change.
    // setSearchParams({ tab })
    setKeyTabSelected(tab)
  }
  useEffect(() => {
    if (tab) {
      setKeyTabSelected(tab)
    }
  }, [])
  return (
    <div className={styles.autoscalerContainer}>
      <div className={styles.autoscalerContent}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
            <Icons.HorizontalPodAutoscalerIcon color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Autoscaler</p>
            <ExperimentalTag />
          </div>

          <div className={`${commonStyles.tinyFlexRow}`}>
            <DeploymentsDropdown
              deployments={versions.filter(v => v.status !== 'expired')}
              value={selectedVersionLabel}
              onChange={(label) => {
                setSelectedVersionLabel(label)
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev)
                  if (label) next.set('versionLabel', label)
                  else next.delete('versionLabel')
                  return next
                })
              }}
              valueByVersionLabel
              placeholder='Select version'
            />
          </div>
        </div>

        {keyTabSelected === 'pods' && !isSelectedVersionActive && selectedVersion && (
          <NotLatestDeploymentBanner version={selectedVersionLabel || selectedVersion.id} />
        )}

        <TabbedWindow
          key={selectedVersionLabel}
          tabs={[
            {
              label: 'Pods',
              key: 'pods',
              component: () => (
                <Pods
                  applicationId={application?.id}
                  versionLabel={selectedVersionLabel || undefined}
                />
              )
            }, {
              label: 'Scaling History',
              key: 'scaling_history',
              component: () =>
                <ScalerEvents
                  applicationId={application?.id}
                  limit={100}
                />
            }, {
              label: 'Signals History',
              key: 'signals_history',
              component: () =>
                <SignalsHistory
                  wattId={application?.id}
                  limit={100}
                />
            }
          ]}
          keySelected={keyTabSelected}
          callbackSelected={handleTabChange}
          tabContainerClassName={styles.autoscalerTabContainer}
          tabContentClassName={styles.autoscalerTabContent}
          textClassName={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${styles.customTab}`}
        />
      </div>
    </div>
  )
}
