// Based on @vercel/workflow web package (https://github.com/vercel/workflow)
// Copyright 2025 Vercel Inc. Licensed under Apache License 2.0.
// Modified for Platformatic ICC integration.

import React from 'react'
import { WHITE } from '@platformatic/ui-components/src/components/constants'
import { PlatformaticIcon } from '@platformatic/ui-components'

import WorkflowStatusPill from './WorkflowStatusPill'
import { formatRelativeTime, formatDuration, formatWorkflowName } from './utils'

import styles from './RunsTable.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'

export default function RunsTable ({ runs, onSelectRun, page, hasMore, onPageChange }) {
  const columns = [
    { label: 'Run ID', key: 'runId' },
    { label: 'Workflow', key: 'workflowName' },
    { label: 'Version', key: 'deploymentId' },
    { label: 'Status', key: 'status' },
    { label: 'Started', key: 'startedAt' },
    { label: 'Duration', key: 'duration' }
  ]

  function renderColumn (run, column) {
    switch (column.key) {
      case 'runId':
        return <span className={styles.runId}>{run.runId}</span>
      case 'status':
        return <WorkflowStatusPill status={run.status} />
      case 'startedAt':
        return formatRelativeTime(run.startedAt || run.createdAt)
      case 'duration':
        return formatDuration(run.startedAt, run.completedAt)
      case 'workflowName':
        return formatWorkflowName(run.workflowName) || '-'
      case 'deploymentId':
        return <span className={styles.runId}>{run.deploymentId || '-'}</span>
      default:
        return run[column.key]
    }
  }

  return (
    <div className={styles.container}>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr className={styles.runRow} key={run.runId} onClick={() => onSelectRun(run)}>
              {columns.map((column) => (
                <td key={column.key}>{renderColumn(run, column)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {(page > 0 || hasMore) && (
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
          <PlatformaticIcon
            iconName='CircleArrowLeftIcon'
            color={WHITE}
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          />
          <span className={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}>
            Page {page + 1}
          </span>
          <PlatformaticIcon
            iconName='CircleArrowRightIcon'
            color={WHITE}
            disabled={!hasMore}
            onClick={() => onPageChange(page + 1)}
          />
        </div>
      )}
    </div>
  )
}
