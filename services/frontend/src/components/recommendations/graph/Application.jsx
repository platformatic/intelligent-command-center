import React from 'react'
import styles from './Application.module.css'
import Service from './Service'
export default function Application ({
  services,
  name,
  isNew = false
}) {
  function renderServices () {
    let entryPoint
    const others = []
    services.forEach((s) => {
      if (s.isEntryPoint) {
        entryPoint = <Service key={s.name} name={s.name} isEntrypoint={s.isEntryPoint} hasChanges={s.hasChanges} />
      } else {
        others.push(
          <Service key={s.name} name={s.name} isEntrypoint={s.isEntryPoint} hasChanges={s.hasChanges} />
        )
      }
    })

    return [
      entryPoint,
      ...others
    ]
  }
  return (
    <div className={`${styles.application} ${isNew ? styles.new : ''}`}>
      <div className={styles.name}>{name}</div>
      <div className={styles.services}>
        {renderServices()}
      </div>

    </div>
  )
}
