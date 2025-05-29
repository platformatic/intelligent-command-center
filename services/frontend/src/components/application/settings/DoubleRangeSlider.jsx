import React, { useState, useEffect, useCallback } from 'react'
import styles from './DoubleRangeSlider.module.css'
const DoubleRangeSlider = ({
  min = 0,
  max = 100,
  value = { min: 25, max: 75 },
  onChange,
  step = 1,
  disabled = false,
  label = ''
}) => {
  const [minValue, setMinValue] = useState(value.min)
  const [maxValue, setMaxValue] = useState(value.max)

  useEffect(() => {
    setMinValue(value.min)
    setMaxValue(value.max)
  }, [value.min, value.max])

  const handleMinChange = useCallback((key, value) => {
    const newMin = Math.min(Number(value), maxValue - step)
    setMinValue(newMin)
    onChange?.(key, value)
  }, [maxValue, onChange, step])

  const handleMaxChange = useCallback((key, value) => {
    const newMax = Math.max(Number(value), minValue + step)
    setMaxValue(newMax)
    onChange?.(key, value)
  }, [minValue, onChange, step])

  const minPercent = ((minValue - min) / (max - min)) * 100
  const maxPercent = ((maxValue - min) / (max - min)) * 100

  return (
    <div className={styles.doubleRangeSlider}>

      <div className={styles.labelContainer}>{label}</div>
      <div className={styles.rangeContainer}>
        <div className={styles.sliderValues}>
          <span className={styles.label}>Min:</span>
          <span className={styles.value}>{minValue}</span>
        </div>
        <div className={styles.sliderContainer}>
          <div className={styles.sliderTrack}>
            <div
              className={styles.sliderRange}
              style={{
                left: `${minPercent}%`,
                width: `${maxPercent - minPercent}%`
              }}
            />
          </div>
          <input
            type='range'
            min={min}
            max={max}
            value={minValue}
            onChange={(e) => handleMinChange('min', e.target.value)}
            step={step}
            disabled={disabled}
            className={styles.sliderInput}
          />
          <input
            type='range'
            min={min}
            max={max}
            value={maxValue}
            onChange={(e) => handleMaxChange('max', e.target.value)}
            step={step}
            disabled={disabled}
            className={styles.sliderInput}
          />
        </div>
        <div className={styles.sliderValues}>
          <span className={styles.label}>Max:</span>
          <span className={styles.value}>{maxValue}</span>
        </div>
      </div>

    </div>
  )
}

export default DoubleRangeSlider
