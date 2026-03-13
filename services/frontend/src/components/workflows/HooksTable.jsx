// Adapted from @vercel/workflow web package (https://github.com/vercel/workflow)
// Copyright 2025 Vercel Inc. Licensed under Apache License 2.0.
// Modified for Platformatic ICC integration.

import React, { useEffect, useState, useCallback } from 'react'
import { SMALL, WHITE, TRANSPARENT, ACTIVE_AND_INACTIVE_STATUS } from '@platformatic/ui-components/src/components/constants'
import { Button } from '@platformatic/ui-components'

import { formatRelativeTime } from './utils'
import callApi from '~/api/common'

import styles from './HooksTable.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'

export default function HooksTable ({ appId, runId, onHookClick }) {
  const [hooks, setHooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [invocationCounts, setInvocationCounts] = useState({})

  const loadHooks = useCallback(async () => {
    if (!appId) return
    try {
      const query = new URLSearchParams({ sortOrder: 'desc' })
      if (runId) query.set('runId', runId)
      const data = await callApi('', `/api/workflow/apps/${appId}/hooks?${query.toString()}`, 'GET')
      setHooks(data.data || [])
    } catch (err) {
      console.error('Error loading hooks:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [appId, runId])

  useEffect(() => {
    loadHooks()
  }, [loadHooks])

  // Fetch invocation counts from events
  useEffect(() => {
    if (!hooks.length || !runId || !appId) return

    async function fetchInvocations () {
      try {
        const data = await callApi('', `/api/workflow/apps/${appId}/runs/${runId}/events?sortOrder=asc&limit=1000`, 'GET')
        const events = data.data || []
        const counts = {}
        for (const event of events) {
          if (event.eventType === 'hook_received' && event.correlationId) {
            counts[event.correlationId] = (counts[event.correlationId] || 0) + 1
          }
        }
        setInvocationCounts(counts)
      } catch {
        // Invocation counts are non-critical
      }
    }

    fetchInvocations()
  }, [hooks, appId, runId])

  if (loading) {
    return <p className={styles.emptyText}>Loading hooks...</p>
  }

  if (error) {
    return <p className={styles.errorText}>Error loading hooks: {error}</p>
  }

  if (hooks.length === 0) {
    return <p className={styles.emptyText}>No hooks found for this run.</p>
  }

  return (
    <div className={styles.container}>
      <table>
        <thead>
          <tr>
            <th>Hook ID</th>
            <th>Token</th>
            <th>Created</th>
            <th>Invocations</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {hooks.map((hook) => (
            <tr className={styles.hookRow} key={hook.hookId}>
              <td><span className={styles.monoText}>{hook.hookId}</span></td>
              <td>
                <span className={styles.tokenMask}>••••••••••••</span>
              </td>
              <td>{hook.createdAt ? formatRelativeTime(hook.createdAt) : '-'}</td>
              <td>
                <span className={styles.invocationCount}>
                  {invocationCounts[hook.hookId] || 0}
                </span>
              </td>
              <td>
                {onHookClick && (
                  <Button
                    label='View'
                    type='button'
                    color={WHITE}
                    backgroundColor={TRANSPARENT}
                    hoverEffect={ACTIVE_AND_INACTIVE_STATUS}
                    paddingClass={commonStyles.smallButtonPadding}
                    textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
                    onClick={() => onHookClick(hook.hookId, hook.runId)}
                    bordered={false}
                    platformaticIconAfter={{ iconName: 'InternalLinkIcon', color: WHITE, size: SMALL }}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
