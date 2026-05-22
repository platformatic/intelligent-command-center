import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import { getServiceInstanceMetrics, getServiceMetrics } from '~/api/autoscaler'
import MiniMetricChart from './MiniMetricChart'
import styles from './ServiceDetailPanel.module.css'
import { unitPluralCap } from './unitLabel'

const ELU_THRESHOLD = 0.7

function toPods (list) {
  return list.map((pod) => {
    const currentElu = pod.elu.current ?? 0
    const currentHeap = pod.heap.current ?? 0
    return {
      podId: pod.podId,
      isHealthy: !pod.overloaded,
      currentElu: Math.round(currentElu * 100),
      currentHeap: Math.round(currentHeap),
      elu: pod.elu.history,
      heap: pod.heap.history
    }
  })
}

function timestampRange (pods, metric) {
  let tMin = Infinity
  let tMax = -Infinity
  for (const pod of pods) {
    for (const { timestamp } of pod[metric]) {
      if (timestamp < tMin) tMin = timestamp
      if (timestamp > tMax) tMax = timestamp
    }
  }
  return tMin === Infinity ? null : { tMin, tMax }
}

export default function ServiceDetailPanel ({ appId, serviceId, tick }) {
  const [pods, setPods] = useState([])
  const [heapThreshold, setHeapThreshold] = useState(undefined)

  useEffect(() => {
    if (!appId || !serviceId) return
    let cancelled = false

    Promise.all([
      getServiceInstanceMetrics(appId, serviceId),
      getServiceMetrics(appId, serviceId)
    ]).then(([instanceData, svcMetrics]) => {
      if (cancelled) return
      setPods(Array.isArray(instanceData) ? toPods(instanceData) : [])
      setHeapThreshold(svcMetrics?.heap?.threshold ?? undefined)
    })

    return () => { cancelled = true }
  }, [appId, serviceId, tick])

  const eluRange = timestampRange(pods, 'elu')
  const heapRange = timestampRange(pods, 'heap')

  return (
    <div className={styles.panel}>
      <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite} ${styles.title}`}>
        {serviceId} ({pods.length} {unitPluralCap})
      </span>
      <div className={styles.podList}>
        {pods.map(pod => (
          <PodRow
            key={pod.podId}
            pod={pod}
            heapThreshold={heapThreshold}
            eluRange={eluRange}
            heapRange={heapRange}
          />
        ))}
      </div>
    </div>
  )
}

function PodRow ({ pod, heapThreshold, eluRange, heapRange }) {
  return (
    <div className={styles.podRow}>
      <div className={styles.podHeader}>
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>
          {pod.podId}
        </span>
        <span className={`${styles.statusDot} ${pod.isHealthy ? styles.statusGreen : styles.statusRed}`} />
      </div>
      <div className={styles.charts}>
        <MiniMetricChart
          label='E L U'
          value={pod.currentElu}
          unit='%'
          color='#C61BE2'
          data={pod.elu}
          threshold={ELU_THRESHOLD}
          tMin={eluRange?.tMin}
          tMax={eluRange?.tMax}
        />
        <MiniMetricChart
          label='H E A P'
          value={pod.currentHeap}
          unit='MB'
          color='#00BCD4'
          data={pod.heap}
          threshold={heapThreshold}
          tMin={heapRange?.tMin}
          tMax={heapRange?.tMax}
        />
      </div>
    </div>
  )
}
