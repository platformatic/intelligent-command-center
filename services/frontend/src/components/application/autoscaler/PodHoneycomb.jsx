import * as React from 'react'
import Honeycomb from './honeycomb/Honeycomb'
import Hexagon from './honeycomb/Hexagon'
import styles from './PodHoneycomb.module.css'
import { calculateHexagonPerformance } from '../../../utils/podPerformance'

// const colors = {
//   good: '#00FF00',
//   normal: '#FFA500',
//   bad: '#FF0000'
// }

export default function PodHoneyComb ({
  pods,
  scaleConfig
}) {
  const backgrounds = {
    good: 'linear-gradient(180deg,rgba(254, 185, 40, 1) 0%, rgba(102, 74, 16, 1) 100%)', // Yellow/gold
    great: 'linear-gradient(180deg,rgba(33, 250, 144, 1) 0%, rgba(9, 71, 41, 1) 100%)', // Green
    low: 'linear-gradient(180deg,rgba(250, 33, 33, 1) 0%, rgba(66, 9, 9, 1) 100%)' // Red
  }

  // Create array for all possible pod slots (up to maxPods)
  const allPodSlots = Array.from({ length: scaleConfig.maxPods }, (_, index) => {
    if (index < pods.length) {
      // This slot has an active pod
      return { type: 'active', pod: pods[index] }
    } else {
      // This slot is empty
      return { type: 'empty' }
    }
  })
  return (
    <div className={styles.container}>
      <div className={styles.title}>
        Pod Usage
      </div>
      <div className={styles.honeycomb}>
        <Honeycomb
          columns={5}
          size={30}
          items={allPodSlots}
          renderItem={(item, index) => {
            if (item.type === 'active') {
              const score = calculateHexagonPerformance(item.pod.dataValues)
              return (
                <Hexagon
                  style={{
                    background: backgrounds[score]
                  }}
                >
                  <Hexagon
                    className='inner'
                    style={{
                      width: '95%',
                      height: '95%',
                      left: '1px',
                      top: '1px',
                      backgroundColor: '#090E17'
                    }}
                  />
                </Hexagon>
              )
            } else {
              // Empty slot - show hexagon outline
              return (
                <Hexagon
                  style={{
                    background: 'rgba(200, 200, 200, 0.15)',
                    border: 'none'
                  }}
                >
                  <Hexagon
                    className='inner'
                    style={{
                      width: '90%',
                      height: '90%',
                      left: '3px',
                      top: '3px',
                      backgroundColor: '#090E17'
                    }}
                  />
                </Hexagon>
              )
            }
          }}
        />
      </div>
      <div className={styles.footer}>
        <div className={styles.firstRow}>
          <span className={styles.currentPods}>{pods.length}</span>
          <span className={styles.helperText}>of {scaleConfig.maxPods} allocated</span>
        </div>
        <div className={styles.secondRow}>
          <span className={styles.label}>min:</span>
          <span className={styles.value}>{scaleConfig.minPods}</span>
          <span className={styles.separator}>|</span>
          <span className={styles.label}>max:</span>
          <span className={styles.value}>{scaleConfig.maxPods}</span>
        </div>
      </div>
    </div>

  )
}
