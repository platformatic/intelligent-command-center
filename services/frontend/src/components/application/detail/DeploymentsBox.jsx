import React, { useCallback, useEffect, useState } from 'react'
import { WHITE, TRANSPARENT, MEDIUM, BLACK_RUSSIAN, ERROR_RED } from '@platformatic/ui-components/src/components/constants'
import styles from './DeploymentsBox.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import NoDataAvailable from '~/components/ui/NoDataAvailable'
import { BorderedBox, Button, LoadingSpinnerV2 } from '@platformatic/ui-components'
import { getFormattedTimeAndDate } from '~/utilities/dates'
import Icons from '@platformatic/ui-components/src/components/icons'
import { getVersionRegistryByApplicationId, expireApplicationVersion } from '~/api'
import { NavLink } from 'react-router-dom'
import DeploymentStatusPill from './deployments/DeploymentStatusPill'
import { truncateLabel } from '~/utilities/truncate'
import useSubscribeToUpdates from '~/hooks/useSubscribeToUpdates'

function DeploymentsBox ({
  gridClassName = '',
  application,
  selectedVersion,
  onVersionSelect
}) {
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  const [disabledDeploymentHistory, setDisabledDeploymentHistory] = useState(true)
  const [versions, setVersions] = useState(
    /** @type {Array<{ id?: string, status: string, versionLabel?: string, createdAt?: string | null, namespace?: string }>} */ ([])
  )

  const { lastMessage } = useSubscribeToUpdates('deployments')

  useEffect(() => {
    if (lastMessage !== null) {
      const message = JSON.parse(lastMessage.data)
      if (message.type === 'version-status-changed' &&
          message.data?.applicationId === application.id) {
        loadVersions()
      }
    }
  }, [lastMessage])

  const loadVersions = useCallback(async () => {
    setInnerLoading(true)
    setShowNoResult(false)
    try {
      const versionList = await getVersionRegistryByApplicationId(application.id)
      setVersions(versionList)
      setDisabledDeploymentHistory(versionList.length === 0)
      if (!selectedVersion && versionList.length > 0) {
        const active = versionList.find(v => v.status === 'active')
        onVersionSelect?.(active ?? versionList[0])
      }
    } catch (error) {
      console.error(`Error on getVersionRegistryByApplicationId ${error}`)
      setShowNoResult(true)
    } finally {
      setInnerLoading(false)
    }
  }, [application.id])

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  function renderContent () {
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

    if (showNoResult) { return <NoDataAvailable iconName='NoDeploymentsIcon' title='There are no deployments yet' /> }
    return versions.map((version) => (
      <DeploymentItem
        key={version.id}
        version={version}
        applicationId={application.id}
        onExpired={() => loadVersions()}
        isSelected={selectedVersion?.id === version.id}
        onSelect={() => onVersionSelect?.(version)}
      />
    ))
  }

  return (
    <BorderedBox classes={`${styles.borderexBoxContainer} ${gridClassName}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth} ${styles.addFullHeight}`}>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} ${styles.flexWrap}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
            <Icons.RocketIcon
              color={WHITE}
              size={MEDIUM}
            />
            <div className={styles.applicationName}>
              <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>Deployments</p>
            </div>
          </div>
          <div className={styles.buttonContainer}>
            <NavLink to={`/watts/${application.id}/deployment-history`}>
              <Button
                type='button'
                label='View Deployment History'
                color={WHITE}
                backgroundColor={TRANSPARENT}
                paddingClass={commonStyles.smallButtonPadding}
                textClass={typographyStyles.desktopButtonSmall}
                disabled={disabledDeploymentHistory}
              />
            </NavLink>

          </div>
        </div>
        <div className={styles.scrollableContent}>
          {renderContent()}
        </div>
      </div>
    </BorderedBox>
  )
}

const selectedClassByStatus = {
  active: styles.selectedActive,
  draining: styles.selectedDraining
}

function DeploymentItem ({ version, applicationId, onExpired, isSelected, onSelect }) {
  const [expiring, setExpiring] = useState(false)
  const isExpired = version.status === 'expired'
  const statusClass = isSelected
    ? (selectedClassByStatus[version.status] ?? styles.selectedActive)
    : ''
  const versionLabel = version.versionLabel ?? version.version_label ?? version.id ?? ''
  const autoscalerUrl = `/watts/${applicationId}/autoscaler${versionLabel ? `?versionLabel=${encodeURIComponent(versionLabel)}` : ''}`

  async function handleExpire () {
    const label = version.versionLabel
    if (!label) return
    setExpiring(true)
    try {
      await expireApplicationVersion(applicationId, label)
      onExpired?.()
    } catch (err) {
      console.error('expireApplicationVersion', err)
    } finally {
      setExpiring(false)
    }
  }

  function renderRightSide () {
    if (version.status === 'active') {
      return <div className={styles.currentlyViewing}>Currently Viewing</div>
    }
    if (version.status === 'draining') {
      return (
        <div className={styles.actionsRow}>
          <Button
            type='button'
            label='Expire'
            color={WHITE}
            backgroundColor={ERROR_RED}
            paddingClass={commonStyles.smallButtonPadding}
            textClass={typographyStyles.desktopButtonSmall}
            disabled={expiring}
            onClick={handleExpire}
          />
          <NavLink to={autoscalerUrl} className={styles.viewDetailsButton}>
            View Details <Icons.ArrowLongRightIcon color={WHITE} size={MEDIUM} />
          </NavLink>
        </div>
      )
    }
  }
  return (
    <div className={`${styles.deploymentItem} ${statusClass} ${isExpired ? styles.expiredItem : ''}`} onClick={isExpired ? undefined : onSelect} role={isExpired ? undefined : 'button'} tabIndex={isExpired ? -1 : 0} onKeyDown={isExpired ? undefined : (e) => { if (e.key === 'Enter') onSelect?.() }}>
      <div className={styles.deploymentItemHeader}>
        <DeploymentStatusPill status={version.status} />
        {renderRightSide()}
      </div>

      <div className={styles.deploymentDetailsRow}>
        <DeploymentDetail label='Version' value={truncateLabel(version.versionLabel) ?? '-'} title={version.versionLabel} />
        <DeploymentDetail label='Deployed on' value={getFormattedTimeAndDate(version?.createdAt ?? '-')} />
        <DeploymentDetail label='Service Name' value={version.serviceName ?? '-'} />
      </div>
    </div>
  )
}

function DeploymentDetail ({ label, value, title = undefined }) {
  return (
    <div className={styles.detailColumn}>
      <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{label}:</span>
      <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`} title={title}>{value}</span>
    </div>
  )
}
export default DeploymentsBox
