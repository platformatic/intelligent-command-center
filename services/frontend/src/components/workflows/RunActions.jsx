// Adapted from @vercel/workflow web package (https://github.com/vercel/workflow)
// Copyright 2025 Vercel Inc. Licensed under Apache License 2.0.
// Modified for Platformatic ICC integration.

import React, { useState, useCallback, useMemo } from 'react'
import { WHITE, TRANSPARENT, ERROR_RED, ACTIVE_AND_INACTIVE_STATUS } from '@platformatic/ui-components/src/components/constants'
import { Button } from '@platformatic/ui-components'

import callApi from '~/api/common'

import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './RunActions.module.css'

function analyzeEvents (events) {
  if (!events || events.length === 0) return { hasPendingSleeps: false }

  const pendingWaits = new Set()
  for (const event of events) {
    if (event.eventType === 'wait_created' && event.correlationId) {
      pendingWaits.add(event.correlationId)
    }
    if (event.eventType === 'wait_completed' && event.correlationId) {
      pendingWaits.delete(event.correlationId)
    }
  }
  return { hasPendingSleeps: pendingWaits.size > 0 }
}

export default function RunActions ({ appId, runId, runStatus, events, onSuccess, onNavigateToRun, versionExpired }) {
  const [rerunning, setRerunning] = useState(false)
  const [wakingUp, setWakingUp] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [message, setMessage] = useState(null)

  const { hasPendingSleeps } = useMemo(() => analyzeEvents(events), [events])
  const isRunActive = runStatus === 'pending' || runStatus === 'running'

  const showMessage = useCallback((text, isError) => {
    setMessage({ text, isError })
    setTimeout(() => setMessage(null), 4000)
  }, [])

  const handleReplay = useCallback(async () => {
    if (rerunning) return
    try {
      setRerunning(true)
      const result = await callApi('', `/api/workflow/apps/${appId}/runs/${runId}/replay`, 'POST', {})
      if (result && onNavigateToRun) {
        onNavigateToRun(result)
      } else {
        onSuccess?.()
      }
    } catch (err) {
      showMessage(`Failed to replay: ${err.message}`, true)
    } finally {
      setRerunning(false)
    }
  }, [appId, runId, rerunning, onSuccess, showMessage])

  const handleWakeUp = useCallback(async () => {
    if (wakingUp) return
    try {
      setWakingUp(true)
      const result = await callApi('', `/api/workflow/apps/${appId}/runs/${runId}/wake-up`, 'POST', {})
      if (result.stoppedCount > 0) {
        showMessage(`Cancelled ${result.stoppedCount} active sleep${result.stoppedCount > 1 ? 's' : ''}`, false)
      } else {
        showMessage('No active sleeps found', false)
      }
      onSuccess?.()
    } catch (err) {
      showMessage(`Failed to cancel sleeps: ${err.message}`, true)
    } finally {
      setWakingUp(false)
    }
  }, [appId, runId, wakingUp, onSuccess, showMessage])

  const handleCancel = useCallback(async () => {
    if (cancelling || !isRunActive) return
    try {
      setCancelling(true)
      await callApi('', `/api/workflow/apps/${appId}/runs/${runId}/cancel`, 'POST', {})
      showMessage('Run cancelled', false)
      onSuccess?.()
    } catch (err) {
      showMessage(`Failed to cancel: ${err.message}`, true)
    } finally {
      setCancelling(false)
    }
  }, [appId, runId, cancelling, isRunActive, onSuccess, showMessage])

  return (
    <div className={styles.container}>
      {versionExpired && (
        <span className={styles.expiredNotice}>Version expired — actions cannot be applied</span>
      )}
      <div className={styles.actions}>
        <Button
          label={rerunning ? 'Replaying...' : 'Replay'}
          type='button'
          color={WHITE}
          backgroundColor={TRANSPARENT}
          hoverEffect={ACTIVE_AND_INACTIVE_STATUS}
          paddingClass={commonStyles.smallButtonPadding}
          textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
          onClick={handleReplay}
          disabled={rerunning || isRunActive || versionExpired}
          bordered
        />
        <Button
          label={wakingUp ? 'Cancelling sleeps...' : 'Cancel Sleeps'}
          type='button'
          color={WHITE}
          backgroundColor={TRANSPARENT}
          hoverEffect={ACTIVE_AND_INACTIVE_STATUS}
          paddingClass={commonStyles.smallButtonPadding}
          textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
          onClick={handleWakeUp}
          disabled={wakingUp || !hasPendingSleeps || versionExpired}
          bordered
        />
        <Button
          label={cancelling ? 'Cancelling...' : 'Cancel Run'}
          type='button'
          color={ERROR_RED}
          backgroundColor={TRANSPARENT}
          hoverEffect={ACTIVE_AND_INACTIVE_STATUS}
          paddingClass={commonStyles.smallButtonPadding}
          textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textErrorRed}`}
          onClick={handleCancel}
          disabled={cancelling || !isRunActive || versionExpired}
          bordered
        />
      </div>
      {message && (
        <div className={message.isError ? styles.errorMessage : styles.successMessage}>
          {message.text}
        </div>
      )}
    </div>
  )
}
