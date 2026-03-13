// Adapted from @vercel/workflow web package (https://github.com/vercel/workflow)
// Copyright 2025 Vercel Inc. Licensed under Apache License 2.0.
// Modified for Platformatic ICC integration.

import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { SMALL, WHITE, TRANSPARENT, ACTIVE_AND_INACTIVE_STATUS } from '@platformatic/ui-components/src/components/constants'
import { Button } from '@platformatic/ui-components'

import WorkflowStatusPill from './WorkflowStatusPill'
import RunActions from './RunActions'
import HooksTable from './HooksTable'
import EventTimeline from './EventTimeline'
import { formatDuration, formatStepName, formatWorkflowName } from './utils'
import callApi from '~/api/common'
import { useInterval } from '~/hooks/useInterval'

import styles from './RunDetail.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'

const WorkflowGraph = lazy(() => import('./WorkflowGraph'))

const POLL_INTERVAL = 5000

const EVENT_TYPE_COLORS = {
  step_created: '#6b7280',
  step_started: '#3b82f6',
  step_completed: '#22c55e',
  step_failed: '#ef4444',
  step_retrying: '#f97316',
  run_created: '#6b7280',
  run_started: '#3b82f6',
  run_completed: '#22c55e',
  run_failed: '#ef4444',
  run_cancelled: '#eab308',
  hook_created: '#8b5cf6',
  hook_received: '#14b8a6',
  hook_disposed: '#6b7280',
  wait_created: '#f97316',
  wait_completed: '#22c55e'
}

function formatEventType (type) {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function formatEventTime (dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleTimeString(undefined, { hour12: false, fractionalSecondDigits: 3 })
}

function EventDataTree ({ data, depth = 0 }) {
  if (data === null || data === undefined) return <span className={styles.eventDataNull}>null</span>
  if (typeof data === 'string') return <span className={styles.eventDataString}>"{data}"</span>
  if (typeof data === 'number' || typeof data === 'boolean') {
    return <span className={styles.eventDataPrimitive}>{String(data)}</span>
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className={styles.eventDataNull}>[]</span>
    return (
      <div style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
        {data.map((item, i) => (
          <div key={i} className={styles.eventDataRow}>
            <span className={styles.eventDataKey}>[{i}]</span>
            <EventDataTree data={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    )
  }
  if (typeof data === 'object') {
    const keys = Object.keys(data)
    if (keys.length === 0) return <span className={styles.eventDataNull}>{'{}'}</span>
    return (
      <div style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
        {keys.map(key => (
          <div key={key} className={styles.eventDataRow}>
            <span className={styles.eventDataKey}>{key}: </span>
            <EventDataTree data={data[key]} depth={depth + 1} />
          </div>
        ))}
      </div>
    )
  }
  return <span>{String(data)}</span>
}

function EventsTable ({ events }) {
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState(new Set())

  const searchLower = search.trim().toLowerCase()
  const filtered = searchLower
    ? events.filter(e =>
      e.eventType.toLowerCase().includes(searchLower) ||
      (e.correlationId || '').toLowerCase().includes(searchLower) ||
      (e.eventId || '').toLowerCase().includes(searchLower)
    )
    : events

  function toggleExpand (eventId) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  if (events.length === 0) {
    return <p className={styles.emptyText}>No events recorded yet.</p>
  }

  return (
    <div className={styles.eventsTableWrap}>
      <input
        type='text'
        className={styles.eventsSearch}
        placeholder='Search by event ID or correlation ID...'
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <table className={styles.eventsTable}>
        <thead>
          <tr>
            <th className={styles.eventsThSmall} />
            <th className={styles.eventsTh}>Time</th>
            <th className={styles.eventsTh}>Event Type</th>
            <th className={styles.eventsTh}>Correlation ID</th>
            <th className={styles.eventsTh}>Event ID</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(event => {
            const isExpanded = expandedIds.has(event.eventId)
            const color = EVENT_TYPE_COLORS[event.eventType] || '#6b7280'
            return (
              <React.Fragment key={event.eventId}>
                <tr
                  className={styles.eventsTr}
                  onClick={() => toggleExpand(event.eventId)}
                >
                  <td className={styles.eventsTdExpand}>
                    <span className={styles.eventsExpandIcon}>{isExpanded ? '\u25BE' : '\u25B8'}</span>
                  </td>
                  <td className={styles.eventsTd}>{formatEventTime(event.createdAt)}</td>
                  <td className={styles.eventsTd}>
                    <span style={{ color }}>{'\u25CF'}</span>{' '}
                    {formatEventType(event.eventType)}
                  </td>
                  <td className={`${styles.eventsTd} ${styles.eventsTdMono}`}>{event.correlationId || '-'}</td>
                  <td className={`${styles.eventsTd} ${styles.eventsTdMono}`}>{event.eventId}</td>
                </tr>
                {isExpanded && event.eventData && (
                  <tr>
                    <td colSpan='5' className={styles.eventDataCell}>
                      <EventDataTree data={event.eventData} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function formatTimestamp (dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (isToday) return `today at ${time}`
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${time}`
}

export default function RunDetail ({ run, appId, applicationId, onBack, onNavigateToRun }) {
  const [currentRun, setCurrentRun] = useState(run)
  const [steps, setSteps] = useState([])
  const [events, setEvents] = useState([])
  const [activeTab, setActiveTab] = useState('steps')
  const [versionExpired, setVersionExpired] = useState(false)

  useEffect(() => {
    setCurrentRun(run)
    setSteps([])
    setEvents([])
    setVersionExpired(false)
  }, [run.runId])

  useEffect(() => {
    if (!currentRun.deploymentId || !applicationId) return
    async function checkVersion () {
      try {
        const data = await callApi('control-plane', `/applications/${applicationId}/versions`, 'GET')
        const versions = data.versions || []
        const match = versions.find(v => v.versionLabel === currentRun.deploymentId)
        setVersionExpired(!match || match.status === 'expired')
      } catch {
        // If the check fails, don't block the UI
      }
    }
    checkVersion()
  }, [applicationId, currentRun.deploymentId])

  const isTerminal = ['completed', 'failed', 'cancelled'].includes(currentRun.status)

  const loadRunDetail = useCallback(async () => {
    try {
      const data = await callApi('', `/api/workflow/apps/${appId}/runs/${run.runId}`, 'GET')
      if (data) setCurrentRun(data)
    } catch (err) {
      console.error('Error loading run detail:', err)
    }
  }, [appId, run.runId])

  const loadSteps = useCallback(async () => {
    try {
      const data = await callApi('', `/api/workflow/apps/${appId}/runs/${run.runId}/steps`, 'GET')
      setSteps(data.data || [])
    } catch (err) {
      console.error('Error loading steps:', err)
    }
  }, [appId, run.runId])

  const loadEvents = useCallback(async () => {
    try {
      const data = await callApi('', `/api/workflow/apps/${appId}/runs/${run.runId}/events?sortOrder=asc&limit=200`, 'GET')
      setEvents(data.data || [])
    } catch (err) {
      console.error('Error loading events:', err)
    }
  }, [appId, run.runId])

  const refreshAll = useCallback(() => {
    loadRunDetail()
    loadSteps()
    loadEvents()
  }, [loadRunDetail, loadSteps, loadEvents])

  useEffect(() => {
    loadSteps()
    loadEvents()
  }, [run.runId])

  useInterval(() => {
    refreshAll()
  }, isTerminal ? null : POLL_INTERVAL)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button
          label='Back to runs'
          type='button'
          color={WHITE}
          backgroundColor={TRANSPARENT}
          hoverEffect={ACTIVE_AND_INACTIVE_STATUS}
          paddingClass={commonStyles.smallButtonPadding}
          textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
          onClick={onBack}
          bordered={false}
          platformaticIcon={{ iconName: 'ArrowLeftIcon', color: WHITE, size: SMALL }}
        />
      </div>

      <div className={styles.runHeader}>
        <div className={styles.runHeaderTitleRow}>
          <h2 className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>
            {formatWorkflowName(currentRun.workflowName) || 'Unnamed workflow'}
          </h2>
          <RunActions
            appId={appId}
            runId={run.runId}
            runStatus={currentRun.status}
            events={events}
            onSuccess={refreshAll}
            onNavigateToRun={onNavigateToRun}
            versionExpired={versionExpired}
          />
        </div>
        <div className={styles.runMetaGrid}>
          <div className={styles.runMetaItem}>
            <span className={styles.runMetaLabel}>Status</span>
            <WorkflowStatusPill status={currentRun.status} />
          </div>
          <div className={styles.runMetaItem}>
            <span className={styles.runMetaLabel}>Duration</span>
            <span className={styles.runMetaValue}>{formatDuration(currentRun.startedAt, currentRun.completedAt)}</span>
          </div>
          <div className={styles.runMetaItem}>
            <span className={styles.runMetaLabel}>Version</span>
            <span className={styles.runMetaValueMono}>{currentRun.deploymentId || '-'}</span>
          </div>
          <div className={styles.runMetaItem}>
            <span className={styles.runMetaLabel}>Run ID</span>
            <span className={styles.runMetaValueMono}>{currentRun.runId}</span>
          </div>
          <div className={styles.runMetaItem}>
            <span className={styles.runMetaLabel}>Queued</span>
            <span className={styles.runMetaValue}>{formatTimestamp(currentRun.createdAt)}</span>
          </div>
          <div className={styles.runMetaItem}>
            <span className={styles.runMetaLabel}>Started</span>
            <span className={styles.runMetaValue}>{formatTimestamp(currentRun.startedAt)}</span>
          </div>
          <div className={styles.runMetaItem}>
            <span className={styles.runMetaLabel}>Completed</span>
            <span className={styles.runMetaValue}>{formatTimestamp(currentRun.completedAt)}</span>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'steps' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('steps')}
        >
          Steps ({steps.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'timeline' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'graph' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('graph')}
        >
          Graph
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'hooks' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('hooks')}
        >
          Hooks
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'events' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Events ({events.length})
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'steps' && (
          <div className={styles.stepsList}>
            {steps.length === 0
              ? <p className={styles.emptyText}>No steps recorded yet.</p>
              : steps.map((step) => (
                <div key={step.stepId} className={styles.stepCard}>
                  <div className={styles.stepHeader}>
                    <span className={styles.stepName}>{formatStepName(step.stepName)}</span>
                    <WorkflowStatusPill status={step.status} />
                  </div>
                  <div className={styles.stepMeta}>
                    <span>Attempt {step.attempt}</span>
                    <span>{formatDuration(step.startedAt, step.completedAt)}</span>
                  </div>
                  {step.error && (
                    <div className={styles.stepError}>{step.error}</div>
                  )}
                </div>
              ))}
          </div>
        )}
        {activeTab === 'timeline' && (
          <EventTimeline events={events} steps={steps} run={currentRun} />
        )}
        {activeTab === 'graph' && (
          <Suspense fallback={<p className={styles.emptyText}>Loading graph...</p>}>
            <WorkflowGraph steps={steps} events={events} run={currentRun} />
          </Suspense>
        )}
        {activeTab === 'hooks' && (
          <HooksTable appId={appId} runId={run.runId} />
        )}
        {activeTab === 'events' && (
          <EventsTable events={events} />
        )}
      </div>
    </div>
  )
}
