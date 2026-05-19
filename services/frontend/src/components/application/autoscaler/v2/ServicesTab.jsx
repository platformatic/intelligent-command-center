import React, { useEffect, useMemo, useState } from 'react'
import { SearchBarV2 } from '@platformatic/ui-components'
import typographyStyles from '~/styles/Typography.module.css'
import { getAppServices } from '~/api/autoscaler'
import ServiceDetailPanel from './ServiceDetailPanel'
import ServiceCharts from './ServiceCharts'
import styles from './ServicesTab.module.css'

const REFRESH_INTERVAL_MS = 5000

export default function ServicesTab ({ appId }) {
  const [services, setServices] = useState([])
  const [search, setSearch] = useState('')
  const [selectedService, setSelectedService] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!appId) return
    let cancelled = false

    // Initial load — auto-select first service
    getAppServices(appId).then(svcs => {
      if (cancelled) return
      setServices(svcs)
      setSelectedService(svcs[0] ?? null)
    })

    // Polling — refresh list and charts without resetting selection
    const id = setInterval(async () => {
      try {
        const svcs = await getAppServices(appId)
        if (cancelled) return
        setServices(svcs)
        setSelectedService(prev =>
          prev !== null ? (svcs.find(s => s.id === prev.id) ?? prev) : prev
        )
        setTick(t => t + 1)
      } catch { /* ignore */ }
    }, REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [appId])

  const filtered = useMemo(() => {
    if (!search) return services
    return services.filter(svc => svc.id.toLowerCase().includes(search.toLowerCase()))
  }, [services, search])

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite} ${styles.sidebarTitle}`}>
          Applications ({services.length})
        </span>

        <SearchBarV2
          placeholder='Search application...'
          onChange={setSearch}
          onClear={() => setSearch('')}
          paddingClass={styles.searchPadding}
          inputTextClassName={styles.searchInput}
        />

        <div className={styles.serviceList}>
          {filtered.length === 0
            ? (
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70} ${styles.empty}`}>
                No applications found
              </span>
              )
            : filtered.map(svc => (
              <button
                key={svc.id}
                type='button'
                className={`${styles.serviceItem} ${selectedService?.id === svc.id ? styles.serviceItemSelected : ''}`}
                onClick={() => setSelectedService(svc)}
              >
                <div className={styles.serviceItemHeader}>
                  <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.serviceItemName}`}>
                    {svc.id}
                  </span>
                  {(svc.elu?.overloaded || svc.heap?.overloaded) && (
                    <span className={styles.overloadDot} />
                  )}
                </div>
                <ServiceItemMetrics svc={svc} />
              </button>
            ))}
        </div>
      </div>

      <div className={styles.middle}>
        {selectedService && <ServiceCharts appId={appId} serviceId={selectedService.id} tick={tick} />}
      </div>

      <div className={styles.rightPanel}>
        {selectedService
          ? <ServiceDetailPanel appId={appId} serviceId={selectedService.id} tick={tick} />
          : <div className={styles.emptyContent} />}
      </div>
    </div>
  )
}

function ServiceItemMetrics ({ svc }) {
  const eluOverloaded = svc.elu?.overloaded
  const heapOverloaded = svc.heap?.overloaded

  if (!svc.elu && !svc.heap) return null

  if (eluOverloaded || heapOverloaded) {
    return (
      <div className={styles.serviceMetaOverloaded}>
        {eluOverloaded && (
          <span className={styles.predictedLine}>
            ELU predicted to &rarr; <span className={styles.predictedValue}>{Math.round(svc.elu.predicted * 100)}%</span>
          </span>
        )}
        {heapOverloaded && (
          <span className={styles.predictedLine}>
            HEAP predicted to &rarr; <span className={styles.predictedValue}>{Math.round(svc.heap.predicted)} MB</span>
          </span>
        )}
      </div>
    )
  }

  return (
    <span className={styles.metricText}>
      ELU: {Math.round((svc.elu?.current ?? 0) * 100)}% &nbsp;|&nbsp; HEAP: {Math.round(svc.heap?.current ?? 0)} MB
    </span>
  )
}
