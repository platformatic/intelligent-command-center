// this line is needed to avoid eslint errors for <StackDetails /> children prop.
// That should be fixed in the future in react-pprof module.
/* eslint-disable react/no-children-prop */
import React, { useEffect, useState } from 'react'
import { useLoaderData } from 'react-router-dom'
import { FlameGraph, StackDetails } from '@platformatic/react-pprof'
import styles from './FlamegraphDetail.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import dayjs from 'dayjs'
export default function FlamegraphDetail () {
  const { flamegraph } = useLoaderData()

  const [profile, setProfile] = useState(null)
  const [selectedFrame, setSelectedFrame] = useState(null)
  const [stackTrace, setStackTrace] = useState(null)
  const [children, setChildren] = useState(null)

  useEffect(() => {
    // Load the pprof profile
    setProfile(flamegraph.flamegraph)
  }, [])

  function renderFlamegraphDate () {
    return flamegraph.createdAt ? `[${dayjs(flamegraph.createdAt).format('YYYY-MM-DD HH:mm:ss')}]` : 'Unknown'
  }
  if (!profile) {
    return <div>Loading profile...</div>
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
          <FlameGraph
            profile={profile}
            onFrameClick={(frame, stack, frameChildren) => {
              setSelectedFrame(frame)
              setStackTrace(stack)
              setChildren(frameChildren)
            }}
          />
        </div>
        {children && (
          <div style={{ width: '400px' }}>
            <StackDetails
              selectedFrame={selectedFrame}
              stackTrace={stackTrace}
              children={children}
            />
          </div>
        )}
      </div>
    </div>
  )
}
