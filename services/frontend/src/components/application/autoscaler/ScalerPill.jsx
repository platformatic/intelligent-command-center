import React from 'react'
import StatusPill from '../../common/StatusPill'
import { FLUORESCENT_CYAN, SMALL, TERTIARY_BLUE } from '@platformatic/ui-components/src/components/constants'
export default function ScalerPill ({ direction }) {
  if (direction === 'up') {
    return (
      <StatusPill
        backgroundColor={TERTIARY_BLUE}
        status='Scaled Up'
        platformaticIcon={{ iconName: 'ArrowUpIcon', size: SMALL, color: TERTIARY_BLUE }}
      />
    )
  }
  return (
    <StatusPill
      backgroundColor={FLUORESCENT_CYAN}
      status='Scaled Down'
      platformaticIcon={{ iconName: 'ArrowDownIcon', size: SMALL, color: FLUORESCENT_CYAN }}
    />
  )
}
