import React from 'react'
import styles from './DeploymentStatusPill.module.css'

export default function DeploymentStatusPill ({ status }) {
  const { bg, accent } = getColorsForStatus(status)
  return (
    <div className={styles.deploymentStatusPill} style={{ backgroundColor: bg }}>
      <span className={styles.dot} style={{ backgroundColor: accent }} aria-hidden />
      <p className={styles.label} style={{ color: accent, textTransform: 'uppercase' }}>{getLabelForStatus(status)}</p>
    </div>
  )
}

function getLabelForStatus (status) {
  switch (status) {
    case 'active':
      return 'Active'
    case 'draining':
      return 'Draining'
    case 'expired':
      return 'Expired'
    case 'started':
      return 'Latest'
    case 'stopped':
      return 'Stopped'
    default:
      return status ?? 'Unknown'
  }
}
function getColorsForStatus (status) {
  switch (status) {
    case 'active':
      return { bg: '#061C13', accent: '#21FA90' }
    case 'draining':
      return { bg: '#2a1f00', accent: '#ffb020' }
    case 'expired':
      return { bg: '#2a0f0f', accent: '#ff6b6b' }
    case 'stopped':
      return { bg: '#2a0f0f', accent: '#ff6b6b' }
    default:
      return { bg: '#061C13', accent: '#21FA90' }
  }
}
