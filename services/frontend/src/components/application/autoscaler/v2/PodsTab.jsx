import React, { useEffect, useId, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import { getAppCount, getPodsHealth } from '~/api/autoscaler'
import PodHoneyComb from '../PodHoneycomb'
import styles from './PodsTab.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'

export default function PodsTab ({ appId }) {
  const [appCount, setAppCount] = useState(null)
  const [pods, setPods] = useState([])
  const [servicesCount, setServicesCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!appId) return
    let cancelled = false
    setLoading(true)

    async function load () {
      const [count, health] = await Promise.all([getAppCount(appId), getPodsHealth(appId)])
      if (cancelled) return
      setAppCount(count)

      if (health) {
        setServicesCount(health.servicesCount ?? 0)
        setPods(Object.entries(health.pods ?? {}).map(([podId, info]) => ({
          id: podId,
          unhealthyServicesCount: info.unhealthyServicesCount,
          dataValues: info.unhealthyServicesCount > 0
            ? { eventLoop: 90, usedHeap: 95, totalHeap: 100 }
            : { eventLoop: 10, usedHeap: 50, totalHeap: 100 }
        })))
      }

      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [appId])

  const minPods = appCount?.minPods ?? 0
  const maxPods = appCount?.maxPods ?? 0

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>Loading…</span>
      </div>
    )
  }

  return (
    <div className={styles.scroll}>
      <div className={styles.row}>
        <PodHoneyComb pods={pods} scaleConfig={{ maxPods, minPods }} />
        {pods.map(pod => (
          <PodCard
            key={pod.id}
            podId={pod.id}
            unhealthyServicesCount={pod.unhealthyServicesCount}
            totalServices={servicesCount}
          />
        ))}
      </div>
    </div>
  )
}

function PodCard ({ podId, unhealthyServicesCount, totalServices }) {
  const rawId = useId()
  const gradId = 'hg' + rawId.replace(/[^a-zA-Z0-9]/g, '')
  const isHealthy = unhealthyServicesCount === 0
  const color = isHealthy ? '#00B050' : '#E53935'

  return (
    <div className={styles.podCard}>
      <div className={styles.podIdWrapper} data-fullname={podId}>
        <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite70} ${styles.podId}`}>
          {podId}
        </span>
        <div className={styles.copyToClipBoard} onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(podId) }}>
          <Icons.CopyPasteIcon color={WHITE} size={SMALL} />
        </div>
      </div>
      <div className={styles.podHexWrap}>
        <svg viewBox='0 0 120 128' fill='none' xmlns='http://www.w3.org/2000/svg' className={styles.podHexSvg}>
          <defs>
            <linearGradient id={gradId} gradientUnits='userSpaceOnUse' x1='60' y1='4' x2='60' y2='124'>
              <stop offset='0%' stopColor={color} />
              <stop offset='100%' stopColor='#000000' />
            </linearGradient>
          </defs>
          <path
            d='M60 4 L112 34 V94 L60 124 L8 94 V34 Z'
            fill='none'
            stroke={`url(#${gradId})`}
            strokeWidth='1.5'
          />
          {isHealthy
            ? (
              <>
                <circle cx='60' cy='53' r='13' fill='none' stroke={color} strokeWidth='1.5' />
                <path d='M54 53 L59 58 L67 48' stroke={color} strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' fill='none' />
                <text x='60' y='84' textAnchor='middle' fill='white' fontSize='10' fontFamily='sans-serif'>All Applications</text>
                <text x='60' y='101' textAnchor='middle' fill='white' fontSize='10' fontFamily='sans-serif'>Healthy</text>
              </>
              )
            : (
              <>
                <text x='60' y='60' textAnchor='middle' fontFamily='sans-serif'>
                  <tspan fill={color} fontSize='30' fontWeight='700'>{unhealthyServicesCount}</tspan>
                  <tspan fill='rgba(255,255,255,0.5)' fontSize='13' dx='4'>/ {totalServices}</tspan>
                </text>
                <text x='60' y='80' textAnchor='middle' fill='white' fontSize='10' fontFamily='sans-serif'>Unhealthy</text>
                <text x='60' y='95' textAnchor='middle' fill='white' fontSize='10' fontFamily='sans-serif'>Applications</text>
              </>
              )}
        </svg>
      </div>
    </div>
  )
}
