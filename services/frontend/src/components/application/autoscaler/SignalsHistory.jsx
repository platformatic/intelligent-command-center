import React, { useEffect, useState } from 'react'
import Table from '../../common/Table'
import { getFormattedTimeAndDate } from '../../../utilities/dates'
import callApi from '../../../api/common'
import useICCStore from '../../../useICCStore'
import { toPercentage } from '../../../utils'
import { useNavigate } from 'react-router-dom'
import { SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import { Icons } from '@platformatic/ui-components'

import styles from './SignalsHistory.module.css'

export default function SignalsHistory ({ wattId, limit }) {
  const { config } = useICCStore()
  const [instances, setInstances] = useState([])
  const navigate = useNavigate()
  useEffect(() => {
    loadData()
    loadInstances()
  }, [])

  async function loadInstances () {
    const instances = await callApi('control-plane', `/instances?where.applicationId.eq=${wattId}`, 'GET')
    setInstances(instances)
  }
  async function loadData () {
    const query = new URLSearchParams()
    query.set('where.applicationId.eq', wattId)
    query.set('orderby.createdAt', 'desc')
    query.set('limit', limit)
    let endpoint = '/alerts'
    if (config['scaler-algorithm-version'] === 'v2') {
      endpoint = '/signals'
    }
    const data = await callApi('scaler', `${endpoint}?${query.toString()}`, 'GET')
    setData(data)
  }
  const [data, setData] = useState([])
  const columns = [
    {
      label: 'Timestamp',
      key: 'createdAt',
      render: (row, value) => <span className={styles.timestamp}>{getFormattedTimeAndDate(value)}</span>
    },
    {
      label: 'Pod Id',
      key: 'podId',
      render: (row, value) => {
        const instance = instances.find(instance => instance.podId === value)
        if (!instance) {
          console.warn(`Instance not found for podId: ${value}`)
          return
        }
        if (instance?.status === 'running') {
          return <div className={styles.podId}>{instance.podId}</div>
        } else {
          return <div className={styles.podId}>{instance.podId} <span className={styles.terminated}>(terminated)</span></div>
        }
      }
    }]
  if (config['scaler-algorithm-version'] === 'v2') {
    columns.push({
      label: 'Signal Type',
      key: 'type',
      render: (row, value) => {
        if (row.type === 'elu') {
          return (
            <div className={styles.signalType}>
              <Icons.HeartBeatIcon size={SMALL} color={WHITE} />
              ELU
            </div>
          )
        } else {
          return (
            <div className={styles.signalType}>
              <Icons.TechIcon size={SMALL} color={WHITE} />
              Heap
            </div>
          )
        }
      }
    })
    columns.push({
      label: 'Signal Value',
      key: 'value',
      render: (row, value) => {
        if (row.type === 'elu') {
          return <span className={styles.signalValue}>{toPercentage(value)} %</span>
        } else {
          return <span className={styles.signalValue}>{value} MB</span>
        }
      }
    })
  } else {
    columns.push({
      label: 'ELU',
      key: 'elu',
      render: (row, value) => `${toPercentage(value)} %`
    })
    columns.push({
      label: 'Heap',
      key: 'heapUsed',
      render: (row, value) => `${(value / 1024 / 1024).toFixed(1)} MB`
    })
  }

  columns.push({
    label: 'Scale Event',
    key: 'scaleEventId',
    render: (row, value) => {
      if (value) {
        return (
          <div
            onClick={() => {
              navigate(`/watts/${wattId}/autoscaler?tab=scaling_history&eventId=${value}`)
            }} className={styles.viewScaleEventLink}
          >View Scale Event
          </div>
        )
      } else {
        return null
      }

    // <Link to={`/application/${row.applicationId}/scale-events/${value}`} className={styles.viewScaleEventLink}>View Scale Event</Link>
    }
  })
  return (
    <div className={styles.signalsHistoryContainer}>
      <Table data={data} columns={columns} />
    </div>
  )
}
