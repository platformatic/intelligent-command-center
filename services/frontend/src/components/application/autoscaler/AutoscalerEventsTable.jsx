import React, { useEffect, useState } from 'react'
import styles from './AutoscalerEventsTable.module.css'
import { FLUORESCENT_CYAN, TERTIARY_BLUE } from '@platformatic/ui-components/src/components/constants'
import { getScalingHistory } from '../../../api/autoscaler'
import { getFormattedTimeAndDate } from '../../../utilities/dates'
import StatusPill from '../../common/StatusPill'
import Paginator from '../../ui/Paginator'
import { REFRESH_INTERVAL_METRICS } from '~/ui-constants'

const AutoscalerEventsTable = function ({ applicationId, deploymentId, rows = 10, limit = 10 }) {
  const [events, setEvents] = useState([])
  const [totalCount, setTotalCount] = useState(null)
  const [page, setPage] = useState(0)
  const [startPolling, setStartPolling] = useState(false)

  async function loadActivities () {
    const response = await getScalingHistory(applicationId, limit)
    if (response.length > 0) {
      setEvents(response.slice(page * rows, (page + 1) * rows))
      setTotalCount(response.length)
    }
  }

  useEffect(() => {
    loadActivities().then(() => {
      setStartPolling(true)
    })
  }, [page])

  useEffect(() => {
    let intervalId
    if (startPolling) {
      intervalId = setInterval(async () => await loadActivities(), REFRESH_INTERVAL_METRICS)
    }
    return () => {
      return clearInterval(intervalId)
    }
  }, [startPolling])

  function renderCell (row, column) {
    let content

    const direction = row.direction
    const replicas = row.values[0]

    switch (column.key) {
      case 'time':
        content = getFormattedTimeAndDate(row[column.key])
        break
      case 'activity':
        // get random direction, up or down
        if (direction === 'up') {
          content = <StatusPill backgroundColor={TERTIARY_BLUE} status='New pod' />
        } else {
          content = <StatusPill backgroundColor={FLUORESCENT_CYAN} status='Pod Removed' />
        }
        break
      case 'description':
        if (direction === 'up') {
          content = `Scaled up to ${replicas} replicas`
        } else {
          content = `Scaled down to ${replicas} replicas`
        }
        break
    }
    return <td key={column.key}>{content}</td>
  }

  const columns = [
    {
      label: 'Date & Time (GMT)',
      key: 'time'
    },
    {
      label: 'Activity',
      key: 'activity'
    },
    {
      label: 'Description',
      key: 'description'
    }
  ]
  return (
    <div className={styles.container}>
      <table>
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map(activity => (
            <tr key={activity.id}>
              {columns.map(column => (
                renderCell(activity, column)
              ))}
              <td>
                {/* <Button
                  label='View Details'
                  type='button'
                  color={WHITE}
                  backgroundColor={TRANSPARENT}
                  hoverEffect={ACTIVE_AND_INACTIVE_STATUS}
                  paddingClass={commonStyles.smallButtonPadding}
                  textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
                  onClick={() => {
                    alert('ok')
                  }}
                  bordered={false}
                  platformaticIconAfter={{ iconName: 'InternalLinkIcon', color: WHITE, size: SMALL }}
                /> */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalCount > rows && (
        <Paginator
          pagesNumber={Math.ceil(totalCount / rows)}
          onClickPage={(page) => setPage(page)}
          selectedPage={page}
        />
      )}
    </div>
  )
}

export default AutoscalerEventsTable
