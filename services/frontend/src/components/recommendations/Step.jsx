import React from 'react'
import styles from './Step.module.css'
import Arrow from '../ui/Arrow'
function CreateApplication ({
  name,
  onAppHover = () => {},
  onHoverClear = () => {}
}) {
  return (
    <div className={styles.action}>
      Create
      <span
        className={styles.greenDashedBordered}
        onMouseOver={() => { onAppHover() }}
        onMouseOut={onHoverClear}
      >{name}
      </span>
    </div>
  )
}

function ChangeService ({
  action,
  name,
  onServiceHover = () => {},
  onHoverClear = () => {}

}) {
  return (
    <div className={styles.action}>
      {action}
      <span
        className={styles.blueBordered}
        onMouseOver={() => { onServiceHover() }}
        onMouseOut={onHoverClear}
      >{name}
      </span>
    </div>
  )
}

function FromTo ({ from, to }) {
  return (
    <div className={styles.fromTo}>
      <div>From</div>
      <span className={styles.applicationName}>{from}</span>
      <Arrow color='white' />
      <div>to</div>
      <span className={styles.applicationName}>{to}</span>
    </div>
  )
}
export default function Step ({
  step = null,
  onAppHover = () => {},
  onServiceHover = () => {},
  onHoverClear = () => {}
}) {
  function renderFromTo () {
    switch (step.type) {
      case 'move-service':
      case 'duplicate-service':
        return (
          <FromTo
            from={step.sourceApplicationName}
            to={step.targetApplicationName}
          />
        )
    }
  }
  function renderTitle () {
    switch (step.type) {
      case 'create-application':
        return (
          <CreateApplication
            name={step.applicationName}
            onAppHover={() => {
              onAppHover(step)
            }}
            onHoverClear={onHoverClear}
          />
        )
      case 'move-service':
        return (
          <ChangeService
            name={step.sourceServiceId}
            action='move'
            onServiceHover={() => {
              onServiceHover(step)
            }}
            onHoverClear={onHoverClear}

          />
        )

      case 'duplicate-service':
        return (
          <ChangeService
            name={step.sourceServiceId}
            action='duplicate'
            onServiceHover={() => {
              onServiceHover(step)
            }}
            onHoverClear={onHoverClear}
          />
        )
    }
  }
  return (
    <div className={styles.container}>
      <div className={styles.title}>
        {renderTitle()}
      </div>
      <div className={styles.detail}>
        {renderFromTo()}
      </div>
    </div>
  )
}
