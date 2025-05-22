import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { WHITE, MEDIUM, BLACK_RUSSIAN, TRANSPARENT, RICH_BLACK } from '@platformatic/ui-components/src/components/constants'
import styles from './NodeJSMetrics.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox } from '@platformatic/ui-components'
import Icons from '@platformatic/ui-components/src/components/icons'
import NodeJSMetric from './NodeJSMetric'
import { REFRESH_INTERVAL_METRICS } from '~/ui-constants'
import { getApiMetricsForApplication } from '../../../api'

function NodeJSMetrics ({
  gridClassName = '',
  application

}) {
  const [initialLoading, setInitialLoading] = useState(true)
  const [allData, setAllData] = useState({})
  const [timer, setTimer] = useState(REFRESH_INTERVAL_METRICS / 1000)
  const [timerInterval, setTimerInterval] = useState(null)
  const [latestRefreshDate, setLatestRefresDate] = useState(new Date())

  useEffect(() => {
    return () => {
      clearInterval(timer)
      clearInterval(timerInterval)
    }
  }, [])

  useEffect(() => {
    if (Object.keys(allData).length > 0) {
      if (Object.keys(allData).some(key => (allData[key]?.length ?? 0) > 0)) {
        startTimer()
      }
    }
  }, [Object.keys(allData).length])

  useEffect(() => {
    if (timer >= REFRESH_INTERVAL_METRICS / 1000) {
      async function loadMetrics () {
        await loadNodeJSMetrics()
        if (initialLoading) {
          setInitialLoading(false)
        }
        setLatestRefresDate(new Date())
      }
      loadMetrics()
    }
  }, [timer])

  function startTimer () {
    setTimerInterval(setInterval(() => {
      setTimer((time) => {
        if (time === 0) {
          return REFRESH_INTERVAL_METRICS / 1000
        } else return time - 1
      })
    }, 1000))
  }

  async function loadNodeJSMetrics () {
    try {
      const allData = {}
      const [mem, cpu, latency] = await Promise.all([
        getApiMetricsForApplication(application.id, 'mem'),
        getApiMetricsForApplication(application.id, 'cpu'),
        getApiMetricsForApplication(application.id, 'latency')
      ])
      if (mem.ok) {
        allData.dataMem = await mem.json()
      }
      if (cpu.ok) {
        allData.dataCpu = await cpu.json()
      }
      if (latency.ok) {
        allData.dataLatency = await latency.json()
      }
      setAllData(allData)
    } catch (error) {
      console.error(`Error on loadMetrics ${error}`)
    }
  }

  return (
    <BorderedBox classes={`${styles.borderexBoxContainer} ${gridClassName}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
            <div className={commonStyles.tinyFlexRow}>
              <Icons.NodeJSMetricsIcon
                color={WHITE}
                size={MEDIUM}
              />
              <div>
                <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>NodeJS Metrics</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.metricsContainer}>
          <NodeJSMetric
            key={`mem_${latestRefreshDate.toISOString()}`}
            title='Memory'
            unit='(GB)'
            metricURL='mem'
            dataValues={allData.dataMem}
            initialLoading={initialLoading}
            options={[{
              label: 'RSS',
              internalKey: 'rss',
              unit: 'GB'
            }, {
              label: 'Total Heap',
              internalKey: 'totalHeap',
              unit: 'GB'
            }, {
              label: 'Heap Used',
              internalKey: 'usedHeap',
              unit: 'GB'
            }]}
            backgroundColor={RICH_BLACK}
          />
          <NodeJSMetric
            key={`cpu_${latestRefreshDate.toISOString()}`}
            title='CPU & ELU Average'
            metricURL='cpu'
            dataValues={allData.dataCpu}
            initialLoading={initialLoading}
            unit='(%)'
            options={[{
              label: 'CPU',
              internalKey: 'cpu',
              unit: '%'
            }, {
              label: 'ELU',
              internalKey: 'eventLoop',
              unit: '%'
            }]}
            backgroundColor={RICH_BLACK}
          />
          <NodeJSMetric
            key={`latency_${latestRefreshDate.toISOString()}`}
            title='Entrypoint Latency'
            metricURL='latency'
            dataValues={allData.dataLatency}
            initialLoading={initialLoading}
            unit='(ms)'
            options={[{
              label: 'P90',
              internalKey: 'p90',
              unit: 'ms'
            }, {
              label: 'P95',
              internalKey: 'p95',
              unit: 'ms'
            }, {
              label: 'P99',
              internalKey: 'p99',
              unit: 'ms'
            }]}
            backgroundColor={RICH_BLACK}
          />
        </div>
      </div>
    </BorderedBox>
  )
}

NodeJSMetrics.propTypes = {
  /**
   * gridClassName
    */
  gridClassName: PropTypes.string
}

export default NodeJSMetrics
