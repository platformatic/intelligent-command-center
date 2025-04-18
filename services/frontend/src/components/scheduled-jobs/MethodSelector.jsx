import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import styles from './MethodSelector.module.css'
const MethodSelector = ({ selectedValue, onChange }) => {
  const [selectedMethod, setSelectedMethod] = useState(selectedValue)

  useEffect(() => {
    setSelectedMethod(selectedValue)
  }, [])

  function handleChange (method) {
    setSelectedMethod(method)
    onChange(method)
  }
  const methods = ['GET', 'POST', 'PUT']
  return (
    <div className={styles.container}>

      {methods.map((method, idx) => (
        <div
          key={idx}
          className={`${styles.option} ${selectedMethod === method ? styles.selected : ''}`}
          onClick={() => handleChange(method)}
        >
          {method.toUpperCase()}
        </div>
      ))}
    </div>
  )
}

MethodSelector.propTypes = {
  selectedValue: PropTypes.any,
  onChange: PropTypes.func.isRequired
}

export default MethodSelector
