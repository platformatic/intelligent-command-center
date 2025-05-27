import React from 'react'
import styles from './LineTaxonomy.module.css'

function LineTaxonomy ({
  type = ''
}) {
  const className = type ? styles[`${type}RequestAmountLine`] : ''
  return (
    <svg width={24} height='3' viewBox='0 0 24 3' fill='none' xmlns='http://www.w3.org/2000/svg' className={className}>
      <line x1={0.75} y1={1.52499} x2={23.25} y2={1.52499} stroke='white' strokeWidth={1.5} strokeLinecap='round' />
    </svg>
  )
}

export default LineTaxonomy
