import React, { useEffect, useState } from 'react'
import { useNavigate, useRouteLoaderData } from 'react-router-dom'

import { SMALL, ACTIVE_AND_INACTIVE_STATUS, TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import { Button, Tooltip } from '@platformatic/ui-components'
import Icons from '@platformatic/ui-components/src/components/icons'

import StatusPill from './StatusPill'
import CallbackUrl from './CallbackUrl'
import Paginator from '../ui/Paginator'
import cronstrue from 'cronstrue'
import { getFormattedTimeAndDate } from '../../utilities/dates'

import styles from './JobsTable.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import tooltipStyles from '~/styles/TooltipStyles.module.css'

export default function JobsTable ({ jobs }) {
  const VISIBLE_ROWS = 8
  const [pagesCount, setPagesCount] = useState(0)
  const [visibleJobs, setVisibleJobs] = useState([])
  const [currentPage, setCurrentPage] = useState(0)
  const { application } = useRouteLoaderData('appRoot')
  useEffect(() => {
    setPagesCount(Math.ceil(jobs.length / VISIBLE_ROWS))
    setVisibleJobs(jobs.slice(0, VISIBLE_ROWS))
  }, [jobs])

  useEffect(() => {
    const start = currentPage * VISIBLE_ROWS
    const end = start + VISIBLE_ROWS
    const visible = jobs.slice(start, end)
    setVisibleJobs(visible)
  }, [currentPage])
  const handlePaginationClick = (page) => {
    setCurrentPage(page)
  }
  const navigate = useNavigate()
  const columns = [
    {
      label: 'Job',
      key: 'name'
    },
    {
      label: 'Status',
      key: 'status'
    },
    {
      label: 'Crontab',
      key: 'schedule'
    },
    {
      label: 'Target Endpoint',
      key: 'callbackUrl'
    },
    {
      label: 'Last Run',
      key: 'lastRunAt'
    },
    {
      label: 'Next Run',
      key: 'nextRunAt'
    }
  ]

  function renderColumn (job, column) {
    switch (column.key) {
      case 'callbackUrl':
        return <CallbackUrl method={job.method} url={job.callbackUrl} />
      case 'status': {
        if (job.paused) {
          return <StatusPill status='paused' />
        }
        if (job.status) {
          return <StatusPill status={job.status} />
        }
        return '-'
      }
      case 'lastRunAt':
        return getFormattedTimeAndDate(job.lastRunAt)
      case 'nextRunAt':
        return getFormattedTimeAndDate(job.nextRunAt)
      case 'schedule':
        if (!job.schedule) {
          return '-'
        }
        return (
          <Tooltip
            tooltipClassName={tooltipStyles.tooltipDarkStyle}
            content={<span>{cronstrue.toString(job.schedule)}</span>}
            delay={0}
            offset={20}
            immediateActive={false}
          >
            <span>{job.schedule}</span>
          </Tooltip>
        )
      case 'name':
        return (
          <div className={styles.jobNameContainer}>
            <span>{job.name}</span>
            {job.jobType === 'WATT' && (
              <Tooltip
                offset={24}
                immediateActive={false}
                tooltipClassName={tooltipStyles.tooltipDarkStyle}
                content={(<span>Job Created by the Watt</span>)}
              >
                <Icons.ScheduledJobsAppIcon
                  color={WHITE}
                  size={SMALL}
                />
              </Tooltip>
            )}
          </div>
        )
      default:
        return job[column.key]
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
            <th />
          </tr>
        </thead>
        <tbody>
          {visibleJobs.map((job) => (
            <tr className={styles.jobRow} key={job.id}>
              {columns.map((column) => (
                <td key={column.key}>{renderColumn(job, column)}</td>
              ))}
              <td>
                <Button
                  label='View Details'
                  type='button'
                  color={WHITE}
                  backgroundColor={TRANSPARENT}
                  hoverEffect={ACTIVE_AND_INACTIVE_STATUS}
                  paddingClass={commonStyles.smallButtonPadding}
                  textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
                  onClick={() => {
                    const newPath = `/watts/${application.id}/scheduled-jobs/${job.id}`
                    navigate(newPath)
                  }}
                  bordered={false}
                  platformaticIconAfter={{ iconName: 'InternalLinkIcon', color: WHITE, size: SMALL }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pagesCount > 1 && (
        <Paginator
          pagesNumber={pagesCount}
          onClickPage={(page) => handlePaginationClick(page)}
          selectedPage={0}
        />
      )}
    </div>

  )
}
