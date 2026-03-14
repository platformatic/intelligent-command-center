// Based on @vercel/workflow web package (https://github.com/vercel/workflow)
// Copyright 2025 Vercel Inc. Licensed under Apache License 2.0.
// Modified for Platformatic ICC integration.

import React, { useEffect, useState, useCallback, useRef } from 'react'

import { MEDIUM, RICH_BLACK, WHITE } from '@platformatic/ui-components/src/components/constants'
import { Forms, Icons, SearchBarV2 } from '@platformatic/ui-components'

import RunsTable from './RunsTable'
import RunDetail from './RunDetail'
import NoDataFound from '~/components/ui/NoDataFound'
import callApi from '~/api/common'
import { useInterval } from '~/hooks/useInterval'
import { formatWorkflowName } from './utils'

import styles from './Workflows.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'

const STATUS_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Running', value: 'running' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Pending', value: 'pending' }
]

const PAGE_SIZE = 10
const POLL_INTERVAL = 5000

export default function Workflows ({ appId: appIdProp, applicationId }) {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRun, setSelectedRun] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState({ label: 'All statuses', value: 'all' })
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const cursorHistory = useRef([null])

  const appId = appIdProp || null

  const loadRuns = useCallback(async (pageCursor = null, isPolling = false) => {
    if (!appId) return
    if (!isPolling) setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams({ limit: String(PAGE_SIZE) })
      if (statusFilter.value !== 'all') {
        query.set('status', statusFilter.value)
      }
      if (pageCursor) {
        query.set('cursor', pageCursor)
      }
      const data = await callApi('', `/api/workflow/apps/${appId}/runs?${query.toString()}`, 'GET')
      setRuns(data.data || [])
      setCursor(data.cursor || null)
      setHasMore(data.hasMore || false)
    } catch (err) {
      console.error('Error loading workflow runs:', err)
      if (!isPolling) setError(err.message)
    } finally {
      if (!isPolling) setLoading(false)
    }
  }, [appId, statusFilter])

  useEffect(() => {
    if (appId) {
      setPage(0)
      cursorHistory.current = [null]
      loadRuns()
    } else {
      setLoading(false)
    }
  }, [loadRuns])

  useInterval(() => {
    if (appId && !selectedRun) {
      loadRuns(cursorHistory.current[page], true)
    }
  }, POLL_INTERVAL)

  function goToPage (newPage) {
    if (newPage > page && hasMore) {
      if (!cursorHistory.current[newPage]) {
        cursorHistory.current[newPage] = cursor
      }
      setPage(newPage)
      loadRuns(cursor)
    } else if (newPage < page && newPage >= 0) {
      setPage(newPage)
      loadRuns(cursorHistory.current[newPage])
    }
  }

  const filteredRuns = search
    ? runs.filter((run) =>
      formatWorkflowName(run.workflowName).toLowerCase().includes(search.toLowerCase()) ||
        run.runId.toLowerCase().includes(search.toLowerCase())
    )
    : runs

  if (selectedRun) {
    return (
      <div className={styles.container}>
        <RunDetail
          run={selectedRun}
          appId={appId}
          applicationId={applicationId}
          onBack={() => { setSelectedRun(null); loadRuns(cursorHistory.current[page], true) }}
          onNavigateToRun={(newRun) => setSelectedRun(newRun)}
        />
      </div>
    )
  }

  function renderContent () {
    if (loading) {
      return <p className={styles.loadingText}>Loading workflow runs...</p>
    }

    if (error) {
      return <NoDataFound fullCentered title='Error loading workflows' subTitle={error} />
    }

    if (!appId) {
      return <NoDataFound fullCentered title='Workflows' subTitle='Select a Watt application to view its workflow runs.' />
    }

    if (filteredRuns.length === 0 && page === 0) {
      return <NoDataFound fullCentered title='No workflow runs found' subTitle='No workflow runs match the current filters.' />
    }

    return (
      <RunsTable
        runs={filteredRuns}
        onSelectRun={setSelectedRun}
        page={page}
        hasMore={hasMore}
        onPageChange={goToPage}
      />
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
          <div className={commonStyles.tinyFlexRow}>
            <Icons.WorkflowIcon color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Workflows</p>
          </div>
        </div>
      </div>

      {appId && (
        <div className={styles.searchAndFilter}>
          <div className={styles.search}>
            <SearchBarV2
              onChange={(value) => setSearch(value)}
              placeholder='Search by workflow name or run ID'
              onClear={() => setSearch('')}
              color={WHITE}
              inputTextClassName={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
              paddingClass={styles.searchBarPaddingClass}
              disabled={runs.length === 0}
            />
          </div>
          <div className={styles.filter}>
            <Forms.Select
              defaultContainerClassName={styles.selectEvents}
              backgroundColor={RICH_BLACK}
              borderColor={WHITE}
              defaultOptionsClassName={`${typographyStyles.desktopButtonSmall} ${styles.maxHeightOptions}`}
              options={STATUS_OPTIONS}
              onSelect={(event) => {
                const selected = STATUS_OPTIONS.find((o) => o.value === event.detail.value)
                setStatusFilter(selected)
              }}
              optionsBorderedBottom={false}
              mainColor={WHITE}
              borderListColor={WHITE}
              value={statusFilter.label}
              inputTextClassName={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite} ${styles.heightSelectClass}`}
              paddingClass={styles.selectPaddingClass}
              handleClickOutside
            />
          </div>
        </div>
      )}

      <div className={styles.runs}>
        {renderContent()}
      </div>
    </div>
  )
}
