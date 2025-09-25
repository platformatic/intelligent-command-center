import React, { useState, useEffect } from 'react'
import styles from './Pods.module.css'
import ErrorComponent from '~/components/errors/ErrorComponent'
import {
  getApiPods,
  getApplicationsRaw,
  getApiMetricsForApplication
} from '~/api'
import { getPodPerformances } from './performances'
import { REFRESH_INTERVAL, UNKNOWN_PERFORMANCE } from '~/ui-constants'
import PodSummary from '../application/autoscaler/PodSummary'
import PodHoneycomb from '../application/autoscaler/PodHoneycomb'
import { useLoaderData } from 'react-router-dom'

export default function Pods ({
  applicationId
}) {
  const [pods, setPods] = useState([])
  const [optionsApplications, setOptionsApplications] = useState([])
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [allData, setAllData] = useState({})
  const [error, setError] = useState(null)
  const [timer, setTimer] = useState(REFRESH_INTERVAL / 1000)
  const [timerInterval, setTimerInterval] = useState(null)
  const { scaleConfigs } = useLoaderData()

  function getLatestScaleConfig () {
    return scaleConfigs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
  }

  useEffect(() => {
    if (applicationId && optionsApplications.length === 0) {
      async function loadApplications () {
        try {
          const applications = await getApplicationsRaw()
          // const found = applications.find(app => app.id === applicationId)
          setOptionsApplications(
            applications.map(application => ({
              value: application.id,
              label: application.name
            }))
          )
        } catch (error) {
          console.error(`error ${error}`)
          setShowErrorComponent(true)
        }
      }
      loadApplications()
    }
  }, [applicationId, optionsApplications])

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
    } catch (error) {
      setError(error)
      setShowErrorComponent(true)
    }
  }

  if (showErrorComponent) {
    return <ErrorComponent error={error} message={error.message} onClickDismiss={() => setShowErrorComponent(false)} />
  }

  return (
    <div className={styles.podsContainer}>
      <div className={styles.podSummaryContainer}>

        <PodHoneycomb pods={pods} scaleConfig={getLatestScaleConfig()} />
        {pods.map((pod, idx) => (
          <PodSummary key={`${pod.id}-${idx}`} pod={pod} />
        ))}
      </div>
    </div>
  )
}
