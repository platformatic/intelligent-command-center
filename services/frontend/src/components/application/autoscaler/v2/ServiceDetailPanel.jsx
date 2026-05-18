import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import { getServiceInstanceMetrics, getServiceMetrics } from '~/api/autoscaler'
import MiniMetricChart from './MiniMetricChart'
import styles from './ServiceDetailPanel.module.css'
import { unitPluralCap } from './unitLabel'

const ELU_THRESHOLD = 0.7

function dictToPods (dict) {
  return Object.entries(dict).map(([podId, metrics]) => {
    const lastElu = metrics.elu.at(-1)?.value ?? 0
    const lastHeap = metrics.heap.at(-1)?.value ?? 0
    return {
      podId,
      isHealthy: lastElu < 0.9,
      currentElu: Math.round(lastElu * 100),
      currentHeap: Math.round(lastHeap),
      elu: metrics.elu,
      heap: metrics.heap
    }
  })
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
      setPods(instanceData && typeof instanceData === 'object' && !Array.isArray(instanceData) ? dictToPods(instanceData) : [])
      setHeapThreshold(svcMetrics?.heap?.threshold ?? undefined)
    })

    return () => { cancelled = true }
  }, [appId, serviceId, tick])

  return (
    <div className={styles.panel}>
      <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite} ${styles.title}`}>
        {serviceId} ({pods.length} {unitPluralCap})
      </span>
      <div className={styles.podList}>
        {pods.map(pod => (
          <PodRow key={pod.podId} pod={pod} heapThreshold={heapThreshold} />
        ))}
      </div>
    </div>
  )
}

function PodRow ({ pod, heapThreshold }) {
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
        />
        <MiniMetricChart
          label='H E A P'
          value={pod.currentHeap}
          unit='MB'
          color='#00BCD4'
          data={pod.heap}
          threshold={heapThreshold}
        />
      </div>
    </div>
  )
}
