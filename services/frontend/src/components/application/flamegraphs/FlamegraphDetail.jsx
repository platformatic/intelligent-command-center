// this line is needed to avoid eslint errors for <StackDetails /> children prop.
// That should be fixed in the future in react-pprof module.
/* eslint-disable react/no-children-prop */
import React from 'react'
import { useLoaderData } from 'react-router-dom'
import { FullFlameGraph } from 'react-pprof'
import styles from './FlamegraphDetail.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import {
  MEDIUM,
  WHITE
} from '@platformatic/ui-components/src/components/constants'
import dayjs from 'dayjs'
export default function FlamegraphDetail () {
  const { flamegraph, profile } = useLoaderData()
  function renderFlamegraphDate () {
    return flamegraph.createdAt
      ? `[${dayjs(flamegraph.createdAt).format('YYYY-MM-DD HH:mm:ss')}]`
      : 'Unknown'
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
          <FullFlameGraph backgroundColor='#090E17' profile={profile} />
        </div>
      </div>
    </div>
  )
}
