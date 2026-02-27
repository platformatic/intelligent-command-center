import React, { useState, useRef, useEffect } from 'react'
import styles from './DeploymentsDropdown.module.css'
import typographyStyles from '~/styles/Typography.module.css'

const STATUS_DOT_COLORS = {
  started: '#21FA90',
  active: '#21FA90',
  draining: '#ffb020',
  stopped: '#ff6b6b',
  failed: '#ff6b6b',
  starting: '#ffb020',
  expired: '#ff6b6b'
}

function getDotColor (status) {
  return STATUS_DOT_COLORS[status] ?? STATUS_DOT_COLORS.stopped
}

function getVersionLabel (item) {
  return item?.versionLabel ?? item?.version_label ?? item?.id ?? ''
}

export default function DeploymentsDropdown ({
  deployments = [],
  value = '',
  onChange = () => {},
  placeholder = 'Select deployment',
  disabled = false,
  /** When true, value is versionLabel and onChange(label) receives versionLabel */
  valueByVersionLabel = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  useEffect(() => {
    function handleClickOutside (event) {
      const el = containerRef.current
      if (el && !el.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selectedDeployment = valueByVersionLabel
    ? deployments.find(d => getVersionLabel(d) === value)
    : deployments.find(d => d.id === value)
  const getOptionLabel = (item) => getVersionLabel(item) || item?.id || ''

  function handleSelect (deployment) {
    if (valueByVersionLabel) {
      onChange(getVersionLabel(deployment))
    } else {
      onChange(deployment?.id ?? '')
    }
    setIsOpen(false)
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type='button'
        className={`${styles.trigger} ${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup='listbox'
        aria-label={placeholder}
      >
        {selectedDeployment
          ? (
            <span className={styles.triggerContent}>
              <span
                className={styles.dot}
                style={{ backgroundColor: getDotColor(selectedDeployment.status) }}
                aria-hidden
              />
              {getOptionLabel(selectedDeployment)}
            </span>
            )
          : (
            <span className={styles.placeholder}>{placeholder}</span>
            )}
        <span className={styles.chevron} aria-hidden>▼</span>
      </button>

      {isOpen && (
        <ul
          className={styles.list}
          role='listbox'
          aria-label={placeholder}
        >
          {deployments.map((deployment) => (
            <li
              key={deployment.id}
              role='option'
              aria-selected={valueByVersionLabel ? getVersionLabel(deployment) === value : value === deployment.id}
              className={`${styles.option} ${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${value === deployment.id ? styles.optionSelected : ''}`}
              onClick={() => handleSelect(deployment)}
            >
              <span
                className={styles.dot}
                style={{ backgroundColor: getDotColor(deployment.status) }}
                aria-hidden
              />
              {getOptionLabel(deployment)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
