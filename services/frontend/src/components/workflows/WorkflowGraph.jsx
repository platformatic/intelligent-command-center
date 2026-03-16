// Adapted from @vercel/workflow web package (https://github.com/vercel/workflow)
// Copyright 2025 Vercel Inc. Licensed under Apache License 2.0.
// Modified for Platformatic ICC integration.
// Flow graph viewer: renders workflow steps as a directed graph using @xyflow/react.

import React, { useMemo, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  MarkerType,
  useNodesState,
  useEdgesState
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import WorkflowStatusPill from './WorkflowStatusPill'
import { formatStepName, formatDuration } from './utils'

import styles from './WorkflowGraph.module.css'

const VERTICAL_SPACING = 140
const HORIZONTAL_SPACING = 320
const START_X = 400

const STATUS_COLORS = {
  completed: { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e' },
  running: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6' },
  failed: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444' },
  retrying: { bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316' },
  cancelled: { bg: 'rgba(234, 179, 8, 0.15)', border: '#eab308' },
  pending: { bg: 'rgba(107, 114, 128, 0.1)', border: '#6b7280' }
}

const LEGEND_ITEMS = [
  { label: 'Completed', border: '#22c55e', bg: 'rgba(34, 197, 94, 0.5)' },
  { label: 'Failed', border: '#ef4444', bg: 'rgba(239, 68, 68, 0.5)' },
  { label: 'Running', border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.5)' },
  { label: 'Cancelled', border: '#eab308', bg: 'rgba(234, 179, 8, 0.5)' },
  { label: 'Pending', border: '#6b7280', bg: 'rgba(107, 114, 128, 0.3)', dimmed: true }
]

function StepNode ({ data }) {
  const colors = STATUS_COLORS[data.status] || STATUS_COLORS.pending

  return (
    <div
      className={styles.stepNode}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        borderWidth: data.status === 'running' ? 2 : 1
      }}
    >
      <Handle type='target' position={Position.Top} className={styles.handle} />
      <div className={styles.nodeContent}>
        <div className={styles.nodeHeader}>
          <span className={styles.nodeLabel}>{data.label}</span>
          <WorkflowStatusPill status={data.status} />
        </div>
        {data.duration && (
          <span className={styles.nodeDuration}>{data.duration}</span>
        )}
        {data.attempt > 1 && (
          <span className={styles.nodeAttempt}>attempt {data.attempt}</span>
        )}
      </div>
      <Handle type='source' position={Position.Bottom} className={styles.handle} />
    </div>
  )
}

function StartEndNode ({ data }) {
  return (
    <div className={styles.startEndNode}>
      {data.type !== 'start' && <Handle type='target' position={Position.Top} className={styles.handle} />}
      <span className={styles.startEndLabel}>{data.label}</span>
      {data.type !== 'end' && <Handle type='source' position={Position.Bottom} className={styles.handle} />}
    </div>
  )
}

function SelfLoopEdge ({ id, sourceX, sourceY, targetX, targetY, label, markerEnd }) {
  const loopOffset = 50
  const verticalGap = targetY - sourceY
  const path = `M ${sourceX} ${sourceY} C ${sourceX - loopOffset} ${sourceY}, ${sourceX - loopOffset} ${targetY}, ${targetX} ${targetY}`
  const labelX = sourceX - loopOffset + 5
  const labelY = sourceY + verticalGap / 2 - 12

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: '#a855f7', strokeWidth: 2 }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-100%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all'
            }}
            className='nodrag nopan'
          >
            <span className={styles.loopLabel}>{label}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

const nodeTypes = {
  stepNode: StepNode,
  startEndNode: StartEndNode
}

const edgeTypes = {
  selfLoop: SelfLoopEdge
}

function formatStepDuration (startedAt, completedAt) {
  if (!startedAt) return null
  return formatDuration(startedAt, completedAt)
}

function buildGraph (steps, events, runStatus) {
  if (!steps || steps.length === 0) return { nodes: [], edges: [] }

  // If steps have template order/parallelGroup metadata, use that for grouping
  // instead of timestamp overlap (which doesn't work for placeholder steps)
  const hasTemplateOrder = steps.some(s => s._order !== undefined)

  let parallelGroups

  if (hasTemplateOrder) {
    // Group by _order, steps with the same _order are parallel
    const orderMap = new Map()
    const sorted = [...steps].sort((a, b) => (a._order ?? 999) - (b._order ?? 999))
    for (const step of sorted) {
      const order = step._order ?? 999
      if (!orderMap.has(order)) orderMap.set(order, [])
      orderMap.get(order).push(step)
    }
    parallelGroups = [...orderMap.values()]
  } else {
    // Fall back to timestamp-based parallel detection
    const sorted = [...steps].sort((a, b) => {
      const aTime = new Date(a.startedAt || a.createdAt || 0).getTime()
      const bTime = new Date(b.startedAt || b.createdAt || 0).getTime()
      return aTime - bTime
    })

    parallelGroups = []
    let currentGroup = [sorted[0]]
    let groupEndTime = new Date(sorted[0].completedAt || sorted[0].startedAt || sorted[0].createdAt || 0).getTime()

    for (let i = 1; i < sorted.length; i++) {
      const currStart = new Date(sorted[i].startedAt || sorted[i].createdAt || 0).getTime()
      const currEnd = new Date(sorted[i].completedAt || sorted[i].startedAt || sorted[i].createdAt || 0).getTime()

      if (currStart < groupEndTime) {
        currentGroup.push(sorted[i])
        if (currEnd > groupEndTime) groupEndTime = currEnd
      } else {
        parallelGroups.push(currentGroup)
        currentGroup = [sorted[i]]
        groupEndTime = currEnd
      }
    }
    parallelGroups.push(currentGroup)
  }

  const nodes = []
  const edges = []

  // Start node
  nodes.push({
    id: 'start',
    type: 'startEndNode',
    position: { x: START_X, y: 0 },
    data: { label: 'Start', type: 'start' }
  })

  let currentY = VERTICAL_SPACING
  let prevNodeIds = ['start']

  for (const group of parallelGroups) {
    const isParallel = group.length > 1
    const totalWidth = (group.length - 1) * HORIZONTAL_SPACING
    const startX = START_X - totalWidth / 2
    const groupNodeIds = []

    for (let i = 0; i < group.length; i++) {
      const step = group[i]
      const nodeId = `step_${step.stepId}`
      const x = isParallel ? startX + i * HORIZONTAL_SPACING : START_X

      nodes.push({
        id: nodeId,
        type: 'stepNode',
        position: { x, y: currentY },
        data: {
          label: formatStepName(step.stepName),
          status: step.status,
          duration: formatStepDuration(step.startedAt, step.completedAt),
          attempt: step.attempt
        }
      })

      // Connect from previous level
      for (const prevId of prevNodeIds) {
        edges.push({
          id: `${prevId}-${nodeId}`,
          source: prevId,
          target: nodeId,
          type: isParallel ? 'smoothstep' : 'bezier',
          style: {
            stroke: '#6b7280',
            strokeWidth: isParallel ? 1.5 : 1,
            strokeDasharray: isParallel ? '4,4' : undefined
          },
          markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: '#6b7280' }
        })
      }

      groupNodeIds.push(nodeId)
    }

    prevNodeIds = groupNodeIds
    currentY += VERTICAL_SPACING
  }

  // Only show End node when the run has reached a terminal state
  const isTerminal = ['completed', 'failed', 'cancelled'].includes(runStatus)
  if (isTerminal) {
    nodes.push({
      id: 'end',
      type: 'startEndNode',
      position: { x: START_X, y: currentY },
      data: { label: 'End', type: 'end' }
    })

    for (const prevId of prevNodeIds) {
      edges.push({
        id: `${prevId}-end`,
        source: prevId,
        target: 'end',
        type: 'bezier',
        style: { stroke: '#6b7280', strokeWidth: 1 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: '#6b7280' }
      })
    }
  }

  return { nodes, edges }
}

export default function WorkflowGraph ({ steps, events, run }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(steps, events, run?.status),
    [steps, events, run?.status]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildGraph(steps, events, run?.status)
    setNodes(newNodes)
    setEdges(newEdges)
  }, [steps, events, run?.status, setNodes, setEdges])

  if (!steps || steps.length === 0) {
    return <p className={styles.emptyText}>No steps to visualize.</p>
  }

  return (
    <div className={styles.container}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color='rgba(255,255,255,0.05)' gap={20} />
        <Controls className={styles.controls} />
      </ReactFlow>
      <div className={styles.legend}>
        <div className={styles.legendTitle}>Status</div>
        {LEGEND_ITEMS.map(item => (
          <div key={item.label} className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ borderColor: item.border, backgroundColor: item.bg }}
            />
            <span className={item.dimmed ? styles.legendLabelDimmed : styles.legendLabel}>{item.label}</span>
          </div>
        ))}
      </div>
      {run && (
        <div className={styles.execPanel}>
          <div className={styles.execTitle}>Execution</div>
          <div className={styles.execRow}>
            <span className={styles.execLabel}>Status:</span>
            <WorkflowStatusPill status={run.status} />
          </div>
          <div className={styles.execRow}>
            <span className={styles.execLabel}>Progress:</span>
            <span className={styles.execValue}>
              {steps.filter(s => ['completed', 'failed', 'cancelled'].includes(s.status)).length} / {steps.length}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
