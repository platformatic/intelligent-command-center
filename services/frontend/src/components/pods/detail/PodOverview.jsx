import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './PodOverview.module.css'
import { BLACK_RUSSIAN, ERROR_RED, MAIN_GREEN, MEDIUM, TRANSPARENT, WARNING_YELLOW, WHITE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import Metrics from '~/components/metrics/Metrics'
import { useParams, useRouteLoaderData } from 'react-router-dom'
import { BorderedBox } from '@platformatic/ui-components'
import { REFRESH_INTERVAL, UNKNOWN_PERFORMANCE, GREAT_PERFORMANCE, GOOD_PERFORMANCE } from '~/ui-constants'
import { getApiPod } from '~/api'
import { getPodSignals } from '~/api/autoscaler'
import { getPodPerformances } from '~/components/pods/performances'

import ArcMetric from '~/components/application/autoscaler/ArcMetrics'
import AlertEvent from '../../application/autoscaler/AlertEvent'

export default function PodOverview () {
  const { podId } = useParams()
  const { pod } = useRouteLoaderData('autoscalerPodDetail/overview')
  const [startPolling, setStartPolling] = useState(false)
  const [colorPod, setColorPod] = useState(WHITE)
  const [signals, setSignals] = useState({})
  const [displayedValues, setDisplayedValues] = useState([{
    value: '-',
    valuePerc: '0',
    internalKey: 'memory',
    valueKey: 'rss',
    unit: 'GB',
    label: 'Used:',
    decimalUnit: 2,
    allocated: {
      label: 'Allocated:',
      unit: 'GB',
      value: '-',
      className: 'boxFree',
      valueKey: 'podMemoryLimit',
      valuePerc: '100',
      maxValuePerc: '100',
      decimalUnit: 2
    }
  }, {
    value: '-',
    valuePerc: '0',
    internalKey: 'cpu',
    valueKey: 'cpu',
    unit: '%',
    label: 'Used:',
    decimalUnit: 2,
    allocated: {
      decimalUnit: 0,
      label: 'Allocated:',
      unit: 'CPU',
      value: '-',
      className: 'boxFree',
      valueKey: 'podCores',
      valuePerc: '100',
      maxValuePerc: '100'
    }
  }])
  const { application } = useRouteLoaderData('autoscalerPodDetailRoot')

  async function getLatestSignals () {
    try {
      // Get recent signals for this pod
      const signalsResponse = await getPodSignals(application.id, podId)
      const allSignals = signalsResponse.signals || []

      console.log('Pod Overview - All signals:', allSignals)

      if (!allSignals || allSignals.length === 0) {
        console.log('Pod Overview - No signals found')
        setSignals({ noSignals: true })
        return
      }

      // Find recent signals within the last 60 seconds
      const sixtySecondsAgo = new Date(Date.now() - 60 * 1000)
      console.log('Pod Overview - Looking for signals after:', sixtySecondsAgo)

      const recentSignals = allSignals.filter(signal =>
        new Date(signal.createdAt || signal.created_at) > sixtySecondsAgo
      )

      console.log('Pod Overview - Recent signals found:', recentSignals)

      if (!recentSignals || recentSignals.length === 0) {
        console.log('Pod Overview - No recent signals in last 60 seconds')
        setSignals({ noRecentSignals: true })
        return
      }

      // Find the most recent ELU and heap signals separately
      const recentELUSignal = recentSignals.find(signal => signal.type === 'elu')
      const recentHeapSignal = recentSignals.find(signal => signal.type === 'heap')

      console.log('Pod Overview - ELU signal:', recentELUSignal)
      console.log('Pod Overview - Heap signal:', recentHeapSignal)

      // If we don't have both types of signals, show no recent signals
      if (!recentELUSignal && !recentHeapSignal) {
        console.log('Pod Overview - No recent ELU or Heap signals found')
        setSignals({ noRecentSignals: true })
        return
      }

      const signals = {
        id: podId,
        time: (recentELUSignal?.createdAt || recentHeapSignal?.createdAt),
        heap: recentHeapSignal
          ? {
              value: recentHeapSignal.value || 0,
              delta: recentHeapSignal.delta || 0,
              serviceId: recentHeapSignal.serviceId
            }
          : null,
        elu: recentELUSignal
          ? {
              value: recentELUSignal.value || 0,
              delta: recentELUSignal.delta || 0,
              serviceId: recentELUSignal.serviceId
            }
          : null
      }
      setSignals(signals)
    } catch (error) {
      console.error('Error fetching latest signals:', error)
      setSignals({ error: true })
    }
  }

  useEffect(() => {
    getLatestSignals()
  }, [])

  useEffect(() => {
    if (pod.dataValues) {
      const { score } = getPodPerformances(pod.dataValues)
      let color = WHITE
      switch (score) {
        case UNKNOWN_PERFORMANCE:
          break
        case GREAT_PERFORMANCE:
          color = MAIN_GREEN
          break
        case GOOD_PERFORMANCE:
          color = WARNING_YELLOW
          break
        default:
          color = ERROR_RED
          break
      }
      setColorPod(color)
    }
  }, [displayedValues])

  useEffect(() => {
    let intervalId
    if (startPolling) {
      intervalId = setInterval(async () => await loadResourceAllocation(), REFRESH_INTERVAL)
    }
    return () => {
      return clearInterval(intervalId)
    }
  }, [startPolling])

  useEffect(() => {
    async function loadMetrics () {
      await loadResourceAllocation()
      setStartPolling(true)
    }
    loadMetrics()
  }, [])

  async function loadResourceAllocation () {
    try {
      const data = await getApiPod(application.id, podId)
      const newValues = []
      let found
      if (Object.keys(data).length > 0) {
        displayedValues.forEach(displayedValue => {
          found = data[displayedValue.valueKey]

          if (found !== undefined || found !== null) {
            const { unit, internalKey, label, allocated } = displayedValue
            let valuePerc = found || 0
            const valueMax = allocated.valueKey === 'podCores' ? data[allocated.valueKey] * 100 : data[allocated.valueKey]
            valuePerc = (valuePerc / valueMax) * 100
            allocated.valuePerc = valuePerc > 100 ? 0 : allocated.maxValuePerc - valuePerc
            allocated.value = data[allocated.valueKey]
            newValues.push({
              ...displayedValue, // Overwrite the contents of the old value
              key: `${internalKey}-` + new Date().toISOString(),
              unit,
              internalKey,
              value: found || 0,
              valuePerc: valuePerc > 100 ? 100 : valuePerc,
              label,
              allocated
            })
          } else {
            newValues.push({ ...displayedValue })
          }
        })
        setDisplayedValues([...newValues])
        // setShowNoResult(false)
      } else {
        // setShowNoResult(true)
      }
    } catch (error) {
      console.error(`Error on loadMetrics ${error}`)
    }
  }

  function getArcMetricValue (valueKey) {
    const data = displayedValues.find(v => v.internalKey === valueKey)
    const unit = valueKey === 'memory' ? 'GB' : '%'
    let max = parseFloat(data.allocated.value)

    // Handle NaN or invalid values
    if (isNaN(max) || max === null || max === undefined) {
      max = valueKey === 'memory' ? 'No limit' : '100'
    } else {
      max = max.toFixed(2)
    }

    if (valueKey === 'cpu') {
      max = '100'
    }
    if (data) {
      return {
        unit,
        value: parseFloat(data.value).toFixed(2),
        max,
        title: data.label,
        helper: <><span>{max} {valueKey === 'memory' && max === 'No limit' ? '' : unit}</span><br /><span>Allocated</span></>
      }
    }
    return null
  }

  function renderSignals () {
    if (signals.noSignals) {
      return <p>No signals found</p>
    }
    if (signals.noRecentSignals) {
      return <p>No signals in the last 60 seconds</p>
    }
    if (signals.error) {
      return <p>Error loading signals</p>
    }
    if (!signals.heap && !signals.elu) {
      return <p>Loading signals...</p>
    }
    return (
      <div className={styles.signalsContainer}>
        {signals.heap && (
          <div className={styles.signal}>
            <AlertEvent time={signals.time} value={signals.heap.value} delta={signals.heap.delta} label={`Heap (${signals.heap.serviceId || 'unknown'})`} />
          </div>
        )}
        {signals.elu && (
          <div className={styles.signal}>
            <AlertEvent time={signals.time} value={signals.elu.value} delta={signals.elu.delta} label={`ELU (${signals.elu.serviceId || 'unknown'})`} />
          </div>
        )}
      </div>
    )
  }
  function renderArcMetric (valueKey) {
    const data = getArcMetricValue(valueKey)
    const title = valueKey === 'memory' ? 'Pod Memory Allocation & Usage' : 'Pod CPU Allocation & Usage'
    if (data) {
      return <ArcMetric {...data} title={title} />
    }
    return null
  }
  return (
    <div className={styles.podOverviewContainer}>
      <div className={styles.podOverviewContent}>
        <div className={`${commonStyles.miniFlexBlock} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
            <Icons.AppIcon
              color={colorPod}
              size={MEDIUM}
            />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite} `}>Pod Detail</p>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{podId}</span>
          </div>
        </div>
        <div className={styles.detailContent}>
          <div className={styles.leftColumn}>
            <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.borderedBoxContainerPodOverview}>
              <div className={styles.boxHeader}>
                <span className={styles.title}>Signals</span>
                <span className={styles.helper}>(Last 60 seconds)</span>
              </div>
              <div className={styles.signalsContainer}>
                {renderSignals()}
              </div>
            </BorderedBox>
            <BorderedBox classes={`${styles.borderexBoxPerfomanceContainer}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
              {renderArcMetric('memory')}
            </BorderedBox>
            <BorderedBox classes={`${styles.borderexBoxPerfomanceContainer}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
              {renderArcMetric('cpu')}
            </BorderedBox>
          </div>
          <div className={styles.rightColumn}>
            <Metrics applicationId={application.id} podId={podId} />
            {/* <div className={styles.podOverviewContentScrollable}>
              <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.borderedBoxContainerPodOverview}>
                <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
                  <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
                    <div className={`${commonStyles.tinyFlexResponsiveRow} ${commonStyles.fullWidth}`} />
                  </div>

                </div>
              </BorderedBox>
            </div> */}
          </div>
        </div>

      </div>
    </div>
  )
}
