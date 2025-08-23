// this line is needed to avoid eslint errors for <StackDetails /> children prop.
// That should be fixed in the future in react-pprof module.
/* eslint-disable react/no-children-prop */
import React, { useEffect, useState } from 'react'
import { useLoaderData } from 'react-router-dom'
import { FullFlameGraph, fetchProfile } from '@platformatic/react-pprof'
import styles from './FlamegraphDetail.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import dayjs from 'dayjs'
import ErrorComponent from '../../errors/ErrorComponent'
export default function FlamegraphDetail () {
  const { flamegraph } = useLoaderData()

  const [profile, setProfile] = useState(null)
  const [fetchError, setFetchError] = useState(null)

  function getProfileUrl () {
    return `${import.meta.env.VITE_API_BASE_URL}/scaler/flamegraphs/${flamegraph.id}/download`
  }
  async function loadProfile () {
    try {
      const url = getProfileUrl()
      const profile = await fetchProfile(url)
      return profile
    } catch (error) {
      setFetchError(error)
    }
  }
  useEffect(() => {
    // Load the pprof profile
    loadProfile().then((decodedProfile) => {
      setProfile(decodedProfile)
    })
  }, [])

  function renderFlamegraphDate () {
    return flamegraph.createdAt ? `[${dayjs(flamegraph.createdAt).format('YYYY-MM-DD HH:mm:ss')}]` : 'Unknown'
  }
  if (!profile) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Icons.FlamegraphsIcon size={MEDIUM} color={WHITE} />
          <h1 className={styles.title}>Flamegraph {renderFlamegraphDate()}</h1>
        </div>
        <div className={styles.content}>
          <div style={{ flex: 1 }}>
            <ErrorComponent
              title={`Error fetching profile from ${getProfileUrl()}`}
              error={fetchError}
              message={fetchError?.message || 'Unknown error'}
              containerClassName={styles.errorContainer}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Icons.FlamegraphsIcon size={MEDIUM} color={WHITE} />
        <h1 className={styles.title}>Flamegraph {renderFlamegraphDate()}</h1>
        <span className={styles.serviceName}>{flamegraph.serviceId}</span>
      </div>
      <div className={styles.content}>
        <div style={{ flex: 1 }}>
          <FullFlameGraph
            backgroundColor='#090E17'
            profile={profile}
          />
        </div>
      </div>
    </div>
  )
}
