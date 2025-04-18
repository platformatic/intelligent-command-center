import React, { useEffect, useState } from 'react'
import styles from './CachingStats.module.css'
import {
  getCacheStatsForApplication,
  getCacheStats
} from '../../api'
import CachingStatsChart from './CachingStatsChart'
import { BorderedBox } from '@platformatic/ui-components'
import { RICH_BLACK, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'

export default function CachingStats ({ application, compareWithAll }) {
  const [applicationStats, setApplicationStats] = useState([])
  const [cacheStats, setCacheStats] = useState([])
  const name = application?.name
  const applicationId = application?.id

  const POLLING_INTERVAL = 5000
  let pollingInterval

  const convertToChartData = (data) => (data.map((item) => {
    const { date, hit, miss } = item
    return { time: new Date(date), values: [Number(miss), Number(hit)] }
  }))

  useEffect(() => {
    async function updateData () {
      clearInterval(pollingInterval)
      const [applicationStats, taxonomyStats] = await Promise.all([
        getCacheStatsForApplication(applicationId),
        getCacheStats()
      ])

      setApplicationStats(convertToChartData(applicationStats))
      setCacheStats(convertToChartData(taxonomyStats))

      pollingInterval = setInterval(async () => {
        const [applicationStats, taxonomyStats] = await Promise.all([
          getCacheStatsForApplication(applicationId),
          getCacheStats()
        ])
        setApplicationStats(convertToChartData(applicationStats))
        setCacheStats(convertToChartData(taxonomyStats))
      }, POLLING_INTERVAL)
    }
    updateData()
    return () => {
      clearInterval(pollingInterval)
    }
  }, [application, compareWithAll])

  const cacheChartName = `${name} Hit &  Misses`
  const allChartName = 'All Applications Hit & Misses'

  return (
    <div className={`${styles.charts} `}>
      <BorderedBox backgroundColor={RICH_BLACK} color={TRANSPARENT}>
        <CachingStatsChart
          title={cacheChartName}
          labels={['Hits', 'Misses']}
          selectedApplication={application}
          data={applicationStats}
        />
      </BorderedBox>

      {compareWithAll && (
        <BorderedBox backgroundColor={RICH_BLACK} color={TRANSPARENT}>
          <CachingStatsChart
            title={allChartName}
            labels={['Hits', 'Misses']}
            selectedApplication={application}
            data={cacheStats}
          />
        </BorderedBox>
      )}
    </div>
  )
}
