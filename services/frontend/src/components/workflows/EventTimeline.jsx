// Adapted from @vercel/workflow web package (https://github.com/vercel/workflow)
// Copyright 2025 Vercel Inc. Licensed under Apache License 2.0.
// Modified for Platformatic ICC integration.
// Waterfall trace viewer: renders steps as horizontal bars on a time axis,
// similar to Vercel's trace view.

import React, { useState, useMemo } from 'react'

import WorkflowStatusPill from './WorkflowStatusPill'
import { formatDuration, formatStepName } from './utils'

import styles from './EventTimeline.module.css'

// Rotating palette for spans (similar to Vercel's teal/blue/green/purple/pink)
const SPAN_PALETTE = [
  { bg: 'rgba(13, 148, 136, 0.6)', border: '#14b8a6' }, // teal
  { bg: 'rgba(37, 99, 235, 0.6)', border: '#3b82f6' }, // blue
  { bg: 'rgba(22, 163, 74, 0.6)', border: '#22c55e' }, // green
  { bg: 'rgba(124, 58, 237, 0.6)', border: '#8b5cf6' }, // purple
  { bg: 'rgba(219, 39, 119, 0.6)', border: '#ec4899' } // pink
]

const STATUS_COLORS = {
  completed: null, // uses palette
  running: '#3b82f6',
  failed: '#ef4444',
  cancelled: '#eab308',
  pending: '#6b7280',
  retrying: '#f97316'
}

const HIGHLIGHT_COLOR = { bg: '#d97706', border: '#f59e0b' } // amber for search matches

function formatTimeAxis (ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function buildTraceData (steps, events, run) {
  const runStart = new Date(run?.startedAt || run?.createdAt || 0).getTime()
  const runEnd = new Date(run?.completedAt || new Date()).getTime()
  const totalDuration = Math.max(runEnd - runStart, 1)

  // Build event map by correlationId
  const eventsByCorrelation = {}
  for (const event of events) {
    if (event.correlationId) {
      if (!eventsByCorrelation[event.correlationId]) {
        eventsByCorrelation[event.correlationId] = []
      }
      eventsByCorrelation[event.correlationId].push(event)
    }
  }

  // Build spans from deduplicated steps
  const spans = steps
    .filter(step => step.startedAt || step.completedAt)
    .sort((a, b) => new Date(a.startedAt || a.createdAt).getTime() - new Date(b.startedAt || b.createdAt).getTime())
    .map((step, index) => {
      const start = new Date(step.startedAt).getTime()
      const end = new Date(step.completedAt || new Date()).getTime()
      const leftPct = ((start - runStart) / totalDuration) * 100
      const widthPct = Math.max(0.5, ((end - start) / totalDuration) * 100)
      const durationMs = end - start
      const stepEvents = eventsByCorrelation[step.stepId] || []

      // Find sub-spans from events (e.g. sleep periods from wait_created/wait_completed)
      const subSpans = []
      const waitStarts = {}
      for (const evt of stepEvents) {
        if (evt.eventType === 'wait_created' && evt.correlationId) {
          waitStarts[evt.eventId] = new Date(evt.createdAt).getTime()
        }
        if (evt.eventType === 'wait_completed') {
          // Find matching wait_created by looking at the earliest unmatched one
          const waitKeys = Object.keys(waitStarts)
          if (waitKeys.length > 0) {
            const waitKey = waitKeys[0]
            const waitStart = waitStarts[waitKey]
            delete waitStarts[waitKey]
            const waitEnd = new Date(evt.createdAt).getTime()
            subSpans.push({
              label: 'sleep',
              start: waitStart,
              end: waitEnd,
              leftPct: ((waitStart - runStart) / totalDuration) * 100,
              widthPct: Math.max(0.3, ((waitEnd - waitStart) / totalDuration) * 100),
              durationMs: waitEnd - waitStart,
              color: '#f97316'
            })
          }
        }
      }

      // Use status color for non-completed, palette rotation for completed/running
      const statusColor = STATUS_COLORS[step.status]
      const palette = SPAN_PALETTE[index % SPAN_PALETTE.length]
      const color = statusColor || palette.bg

      return {
        step,
        index,
        start,
        end,
        leftPct,
        widthPct,
        durationMs,
        color,
        palette,
        events: stepEvents,
        subSpans
      }
    })

  // Build run-level events (not associated with steps)
  const stepIds = new Set(steps.map(s => s.stepId))
  const runEvents = events.filter(e => !e.correlationId || !stepIds.has(e.correlationId))

  // Build time axis ticks
  const tickCount = 8
  const ticks = []
  for (let i = 0; i <= tickCount; i++) {
    const ms = (totalDuration / tickCount) * i
    ticks.push({ ms, pct: (i / tickCount) * 100, label: formatTimeAxis(ms) })
  }

  return { spans, runEvents, ticks, totalDuration, runStart }
}

function SpanRow ({ span, onSelect, isSelected, dimmed, highlighted }) {
  const queueDuration = span.step.startedAt && span.step.createdAt
    ? new Date(span.step.startedAt).getTime() - new Date(span.step.createdAt).getTime()
    : 0

  const labels = []
  if (queueDuration > 50) labels.push(`Queued ${formatTimeAxis(queueDuration)}`)
  labels.push(`Executed ${formatTimeAxis(span.durationMs)}`)

  const barColor = highlighted ? HIGHLIGHT_COLOR.bg : span.color

  return (
    <div
      className={`${styles.spanRow} ${isSelected ? styles.spanRowSelected : ''} ${dimmed ? styles.spanRowDimmed : ''}`}
      onClick={() => onSelect(span)}
    >
      <div className={styles.spanLabel}>
        <span
          className={styles.spanName}
          style={{ color: barColor }}
        >
          {formatStepName(span.step.stepName)}
        </span>
        <span className={styles.spanMeta}>
          {labels.join(' · ')}
        </span>
      </div>
      <div className={styles.spanTrack}>
        {/* Main bar */}
        <div
          className={styles.spanBar}
          style={{
            left: `${span.leftPct}%`,
            width: `${Math.min(span.widthPct, 100 - span.leftPct)}%`,
            backgroundColor: barColor
          }}
        >
          <span className={styles.spanBarDuration}>
            {formatTimeAxis(span.durationMs)}
          </span>
        </div>
        {/* Sub-spans (sleeps, waits) */}
        {span.subSpans.map((sub, i) => (
          <div
            key={i}
            className={styles.subSpanBar}
            style={{
              left: `${sub.leftPct}%`,
              width: `${Math.min(sub.widthPct, 100 - sub.leftPct)}%`,
              backgroundColor: sub.color
            }}
            title={`${sub.label} ${formatTimeAxis(sub.durationMs)}`}
          >
            <span className={styles.subSpanLabel}>
              {sub.label} {formatTimeAxis(sub.durationMs)}
            </span>
          </div>
        ))}
        {/* Event dots */}
        {span.events.map(evt => {
          const evtTime = new Date(evt.createdAt).getTime()
          const evtPct = ((evtTime - span.start) / (span.end - span.start || 1)) * span.widthPct + span.leftPct
          const dotColor = evt.eventType.includes('failed')
            ? '#ef4444'
            : evt.eventType.includes('completed')
              ? '#22c55e'
              : '#6b7280'
          return (
            <div
              key={evt.eventId}
              className={styles.eventDot}
              style={{ left: `${Math.min(evtPct, 99)}%`, backgroundColor: dotColor }}
              title={evt.eventType}
            />
          )
        })}
      </div>
    </div>
  )
}

function SpanDetail ({ span }) {
  const [showEvents, setShowEvents] = useState(false)

  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <span className={styles.detailName} style={{ color: span.color }}>
          {formatStepName(span.step.stepName)}
        </span>
        <WorkflowStatusPill status={span.step.status} />
      </div>
      <div className={styles.detailGrid}>
        <span className={styles.detailLabel}>Duration</span>
        <span className={styles.detailValue}>{formatDuration(span.step.startedAt, span.step.completedAt)}</span>
        <span className={styles.detailLabel}>Attempt</span>
        <span className={styles.detailValue}>{span.step.attempt}</span>
        <span className={styles.detailLabel}>Step ID</span>
        <span className={styles.detailValueMono}>{span.step.stepId}</span>
      </div>
      {span.step.error && (
        <div className={styles.detailError}>{span.step.error}</div>
      )}
      {span.events.length > 0 && (
        <div className={styles.detailEvents}>
          <button
            className={styles.expandButton}
            onClick={() => setShowEvents(!showEvents)}
          >
            {showEvents ? '▾' : '▸'} Events ({span.events.length})
          </button>
          {showEvents && (
            <div className={styles.detailEventList}>
              {span.events.map(evt => (
                <div key={evt.eventId} className={styles.detailEvent}>
                  <span className={styles.detailEventType}>{evt.eventType}</span>
                  <span className={styles.detailEventTime}>
                    {new Date(evt.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function EventTimeline ({ events, steps, run }) {
  const [selectedSpan, setSelectedSpan] = useState(null)
  const [search, setSearch] = useState('')

  const { spans, ticks } = useMemo(
    () => buildTraceData(steps, events, run),
    [steps, events, run]
  )

  const hasSearch = search.trim().length > 0
  const searchLower = search.trim().toLowerCase()

  if (steps.length === 0 && events.length === 0) {
    return <p className={styles.emptyText}>No trace data yet.</p>
  }

  return (
    <div className={styles.container}>
      {/* Search input */}
      <div className={styles.searchBox}>
        <input
          type='text'
          className={styles.searchInput}
          placeholder='Search spans...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Mini-map / overview bar */}
      <div className={styles.overview}>
        {spans.map(span => {
          const matches = hasSearch && formatStepName(span.step.stepName).toLowerCase().includes(searchLower)
          return (
            <div
              key={span.step.stepId}
              className={styles.overviewBar}
              style={{
                left: `${span.leftPct}%`,
                width: `${Math.min(span.widthPct, 100 - span.leftPct)}%`,
                backgroundColor: matches ? HIGHLIGHT_COLOR.bg : span.color,
                opacity: hasSearch && !matches ? 0.3 : 1
              }}
            />
          )
        })}
      </div>

      {/* Time axis */}
      <div className={styles.timeAxis}>
        {ticks.map((tick, i) => (
          <div
            key={i}
            className={styles.tick}
            style={{ left: `${tick.pct}%` }}
          >
            <span className={styles.tickLabel}>{tick.label}</span>
          </div>
        ))}
      </div>

      {/* Waterfall */}
      <div className={styles.waterfall}>
        {spans.map(span => {
          const matches = hasSearch && formatStepName(span.step.stepName).toLowerCase().includes(searchLower)
          return (
            <SpanRow
              key={span.step.stepId}
              span={span}
              onSelect={setSelectedSpan}
              isSelected={selectedSpan?.step.stepId === span.step.stepId}
              dimmed={hasSearch && !matches}
              highlighted={matches}
            />
          )
        })}
      </div>

      {/* Detail panel */}
      {selectedSpan && (
        <SpanDetail span={selectedSpan} />
      )}
    </div>
  )
}
