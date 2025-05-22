import React, { useEffect, useRef, useState } from 'react'
import styles from './Slider.module.css'
import typographyStyles from '~/styles/Typography.module.css'

import Icons from '@platformatic/ui-components/src/components/icons'
import { WARNING_YELLOW } from '@platformatic/ui-components/src/components/constants'
export default function Slider ({
  value = {},
  label,
  limits = {},
  treshold = null,
  tooltipText = '',
  onValueUpdated = (newValue) => {}
}) {
  /**
   * Still work in progress
   * checkout: https://codepen.io/thecoderashok/pen/GRXqObJ and https://w3collective.com/double-range-slider-html-css-js/
   * */
  const [currentValue, setCurrentValue] = useState('')
  const [warning, setWarning] = useState(false)
  const rangeRef = useRef(null)
  const valueRef = useRef(null)
  const tooltipRef = useRef(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: -99999, left: -99999 })
  useEffect(() => {
    setCurrentValue(value)
  }, [])

  useEffect(() => {
    checkTreshold()
    updateBackground()
  }, [currentValue])

  useEffect(() => {
    if (showTooltip) {
      if (warning) {
        // position the tooltip
        const valueLabelRect = valueRef.current.getBoundingClientRect()
        const tooltipRect = tooltipRef.current.getBoundingClientRect()
        const valueMiddlePoint = (valueLabelRect.height / 2) + valueLabelRect.top
        const newTop = valueMiddlePoint - (tooltipRect.height / 2)
        const newLeft = valueLabelRect.left - tooltipRect.width - 30
        setTooltipPosition({
          top: newTop,
          left: newLeft
        })
      }
    }
  }, [showTooltip])

  function updateBackground () {
    rangeRef.current?.style.setProperty('--background-size', `${getBackgroundSize()}%`)
  }

  function getBackgroundSize () {
    const size = (currentValue * 100) / (limits.max - limits.min)
    return size
  }
  function checkTreshold () {
    if (treshold !== null && currentValue >= treshold) {
      setWarning(true)
    } else {
      setWarning(false)
    }
  }
  function onValueChange (event) {
    const newValue = parseFloat(event.target.value)
    setCurrentValue(newValue)
    onValueUpdated(newValue)
  }
  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <div className={`${styles.label} ${typographyStyles.desktopBodySmallest}`}>{label}</div>
        <div className={styles.valueContainer}>
          {warning && (
            <div className={`${styles.warningTooltip} ${showTooltip ? '' : styles.hide}`} ref={tooltipRef} style={{ position: 'fixed', top: `${tooltipPosition.top}px`, left: `${tooltipPosition.left}px`, maxWidth: '300px' }}>
              {tooltipText}
            </div>
          )}
          <div className={`${styles.valueContainer} ${typographyStyles.desktopBodySmall}`} onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
            {warning && (
              <div>
                <span><Icons.AlertIcon color={WARNING_YELLOW} /></span>
              </div>
            )}
            <div ref={valueRef} className={`${styles.value} ${warning ? styles.valueWarning : ''}`}>
              {currentValue}
            </div>
            {/* <button onClick={() => { setShowTooltip(!showTooltip) }}>Tooltip</button> */}
          </div>

        </div>

      </div>
      <div className={`${styles.bottom} ${warning ? styles.bottomWarning : ''}`}>
        <span className={styles.minMax}>{value.min}</span>
        <input
          ref={rangeRef}
          type='range'
          min={value.min}
          max={value.max}
          value={currentValue}
          className={`${styles.slider} ${warning ? styles.warning : ''}`}
          onChange={onValueChange}
          onInput={onValueChange}
        />
        <span className={styles.minMax}>{value.max}</span>
      </div>

    </div>
  )
}
