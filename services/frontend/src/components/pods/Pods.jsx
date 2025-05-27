import React, { useState, useEffect } from 'react'
import styles from './Pods.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import PodsHealth from './PodsHealth'
import TablePods from './TablePods'
import ErrorComponent from '~/components/errors/ErrorComponent'
import {
  getApiPods,
  getApplicationsRaw,
  getApiMetricsForApplication
} from '~/api'
import { getScalingHistory } from '~/api/autoscaler'
import useICCStore from '~/useICCStore'
import { getPodPerformances } from './performances'
import { REFRESH_INTERVAL, UNKNOWN_PERFORMANCE } from '~/ui-constants'
import AutoscalerHistory from '~/components/application/autoscaler/AutoscalerHistory'

const Pods = React.forwardRef(({
  applicationId,
  enableApplicationFilter = false,
  fromPreview = false
}, ref) => {
  const globalState = useICCStore()
  const { pods, setPods, podsLoaded, setPodsLoaded } = globalState
  const [optionsApplications, setOptionsApplications] = useState([])
  const [defaultFilterByApplication, setDefaultFilterByApplication] = useState({})
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [allData, setAllData] = useState({})
  const [error, setError] = useState(null)
  const [timer, setTimer] = useState(REFRESH_INTERVAL / 1000)
  const [timerInterval, setTimerInterval] = useState(null)
  const [latestRefreshDate, setLatestRefresDate] = useState(new Date())
  const [initialLoading, setInitialLoading] = useState(true)
  const [chartEvents, setChartEvents] = useState([])

  // USED FOR TESTING PURPOSE OF MULTI PODS
  // const [startPollingTest, setStartPollingTest] = useState(false)

  useEffect(() => {
    if (applicationId && enableApplicationFilter && optionsApplications.length === 0) {
      async function loadApplications () {
        try {
          const applications = await getApplicationsRaw()
          const found = applications.find(app => app.id === applicationId)
          setOptionsApplications(
            applications.map(application => ({
              value: application.id,
              label: application.name
            }))
          )
          setDefaultFilterByApplication({
            value: found?.id,
            label: found?.name
          })
        } catch (error) {
          console.error(`error ${error}`)
          setShowErrorComponent(true)
        }
      }
      loadApplications()
    }
  }, [applicationId, enableApplicationFilter, optionsApplications])

  useEffect(() => {
    return () => {
      clearInterval(timer)
      clearInterval(timerInterval)
    }
  }, [])

  useEffect(() => {
    if (Object.keys(allData).length > 0 && pods.length > 0) {
      if (Object.keys(allData).some(key => (allData[key]?.length ?? 0) > 0)) {
        startTimer()
      }
    }
  }, [Object.keys(allData).length, pods.length])

  useEffect(() => {
    if (applicationId && timer >= REFRESH_INTERVAL / 1000) {
      async function loadMetrics () {
        await loadPodsInstances()
        setPodsLoaded(true)
        setInitialLoading(false)
        setLatestRefresDate(new Date())
      }
      loadMetrics()
    }
  }, [applicationId, timer])

  function startTimer () {
    setTimerInterval(setInterval(() => {
      setTimer((time) => {
        if (time === 0) {
          return REFRESH_INTERVAL / 1000
        } else return time - 1
      })
    }, 1000))
  }

  async function loadPodsInstances () {
    try {
      const pods = await getApiPods(applicationId)
      const performancesPod = pods.map(pod => {
        const { score, reasons = [] } = getPodPerformances(pod.dataValues)
        return {
          ...pod,
          performance: pod.status !== 'running' ? UNKNOWN_PERFORMANCE : score,
          reasons: pod.status !== 'running' ? [`Pod is ${pod.status}`] : reasons
        }
      })

      const allData = {}
      const [mem, cpu] = await Promise.all([
        getApiMetricsForApplication(applicationId, 'mem'),
        getApiMetricsForApplication(applicationId, 'cpu')
      ])
      if (mem.ok) {
        allData.dataMem = await mem.json()
      }
      if (cpu.ok) {
        allData.dataCpu = await cpu.json()
      }
      setAllData(allData)
      setPods(performancesPod)

      const history = await getScalingHistory(applicationId)
      if (history.length > 0) {
        setChartEvents(history.map((event, idx) => {
          const lastEntry = history[Math.min(idx + 1, history.length - 1)]
          return {
            time: new Date(event.time),
            values: [lastEntry.values[0], event.values[0]]
          }
        }).toReversed())
      }
    } catch (error) {
      setError(error)
      setShowErrorComponent(true)
    }
  }

  function handleChangeFilterByApplication (application) {
    setDefaultFilterByApplication(application)
  }

  if (showErrorComponent) {
    return <ErrorComponent error={error} message={error.message} onClickDismiss={() => setShowErrorComponent(false)} />
  }

  return (
    <div className={styles.podsContainer} ref={ref}>
      <div className={`${styles.podsContent} ${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={styles.metricsContainer}>
          <PodsHealth
            key={`pods_${latestRefreshDate.toISOString()}`}
            title='Pods Health'
            podsLoaded={podsLoaded}
            pods={pods}
          />
          <AutoscalerHistory
            initialLoading={initialLoading}
            data={chartEvents}
            maxNumberOfPods={15}
          />
        </div>

        <TablePods
          podsLoaded={podsLoaded}
          pods={pods}
          key={`table-pods-${latestRefreshDate.toISOString()}`}
          optionsApplications={optionsApplications}
          enableApplicationFilter={enableApplicationFilter}
          fromPreview={fromPreview}
          defaultFilterByApplication={defaultFilterByApplication}
          onChangeFilterByApplication={handleChangeFilterByApplication}
          applicationId={applicationId}
        />
      </div>
    </div>
  )
})

export default Pods
