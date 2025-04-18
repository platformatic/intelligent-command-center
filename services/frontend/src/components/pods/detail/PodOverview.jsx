import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './PodOverview.module.css'
import { BLACK_RUSSIAN, ERROR_RED, MAIN_GREEN, MEDIUM, TRANSPARENT, WARNING_YELLOW, WHITE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import Metrics from '~/components/metrics/Metrics'
import { useParams } from 'react-router-dom'
import useICCStore from '~/useICCStore'
import { BorderedBox } from '@platformatic/ui-components'
import ResourceAllocation from './ResourceAllocation.jsx'
import { REFRESH_INTERVAL, K8S_KEY_CPU, K8S_KEY_MEMORY, UNKNOWN_PERFORMANCE, GREAT_PERFORMANCE, GOOD_PERFORMANCE } from '~/ui-constants'
import { getApiPod } from '~/api'
import { getPodPerformances } from '~/components/pods/performances'
import PodPerformanceIssues from './PodPerformanceIssues.jsx'

const PodOverview = React.forwardRef(({ _ }, ref) => {
  const globalState = useICCStore()
  const {
    applicationSelected,
    podSelected
  } = globalState
  const { taxonomyId, appId, podId } = useParams()
  const [startPolling, setStartPolling] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  const [colorPod, setColorPod] = useState(WHITE)
  const [reasons, setReasons] = useState([])
  const [displayedValues, setDisplayedValues] = useState([{
    value: '-',
    valuePerc: '0',
    internalKey: K8S_KEY_MEMORY,
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
    internalKey: K8S_KEY_CPU,
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

  useEffect(() => {
    if ((podSelected?.id ?? null) === podId) {
      const { score, reasons = [] } = getPodPerformances(podSelected.dataValues)
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
      setReasons(reasons)
    }
  }, [podSelected])

  useEffect(() => {
    if ((applicationSelected !== null)) {
      console.log(applicationSelected)
    }
  }, [applicationSelected])

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
    if (appId && taxonomyId && podId && displayedValues.length > 0 && initialLoading) {
      async function loadMetrics () {
        await loadResourceAllocation()
        setStartPolling(true)
        setInitialLoading(false)
      }
      loadMetrics()
    }
  }, [appId, taxonomyId, podId, displayedValues, initialLoading])

  async function loadResourceAllocation () {
    try {
      const data = await getApiPod(taxonomyId, appId, podId)
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
        setShowNoResult(false)
      } else {
        setShowNoResult(true)
      }
    } catch (error) {
      console.error(`Error on loadMetrics ${error}`)
    }
  }

  return (
    <div className={styles.podOverviewContainer} ref={ref}>
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

        <div className={styles.podOverviewContentScrollable}>
          <div className={`${commonStyles.smallFlexResponsiveRow} ${commonStyles.fullWidth}`}>
            <PodPerformanceIssues reasons={reasons} />
            <div className={`${commonStyles.smallFlexBlock} ${commonStyles.flexGrow}`}>
              <BorderedBox classes={`${styles.borderexBoxPerfomanceContainer}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
                <ResourceAllocation
                  key='pom_memory_allocation_usage'
                  title='Pod Memory Allocation & Usage'
                  displayedValue={displayedValues.find(v => v.internalKey === K8S_KEY_MEMORY)}
                  initialLoading={initialLoading}
                  showNoResult={showNoResult}
                />
              </BorderedBox>
              <BorderedBox classes={`${styles.borderexBoxPerfomanceContainer}`} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
                <ResourceAllocation
                  key='pom_cpu_allocation_usage'
                  title='Pod CPU Allocation & Usage'
                  displayedValue={displayedValues.find(v => v.internalKey === K8S_KEY_CPU)}
                  initialLoading={initialLoading}
                  showNoResult={showNoResult}
                />
              </BorderedBox>
            </div>
          </div>

          <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.borderedBoxContainerPodOverview}>
            <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
              <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
                <div className={`${commonStyles.tinyFlexResponsiveRow} ${commonStyles.fullWidth}`}>
                  <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
                    <Icons.PodMetricsIcon
                      color={WHITE}
                      size={MEDIUM}
                    />
                    <span className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Node Metrics in Pod</span>
                    <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>({applicationSelected?.state?.services?.length ?? 0} service{(applicationSelected?.state?.services?.length ?? 0) > 0 ? 's' : ''})</span>
                  </div>

                </div>
              </div>
              <Metrics taxonomyId={taxonomyId} applicationId={appId} podId={podId} />
            </div>
          </BorderedBox>
        </div>
      </div>
    </div>
  )
})

export default PodOverview
