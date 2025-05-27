import { MEDIUM, SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import React from 'react'

function MermaidNodeIngressController ({
  name = 'Ingress Controller'
}) {
  const ingressControllerStyle = {
    display: 'flex',
    flexDirection: 'row',
    columnGap: '0.5rem',
    alignItems: 'center',
    position: 'relative',
    padding: '48px 6px',
    writingMode: 'vertical-lr',
    rotate: '180deg'
  }
  const ingressControllerNameStyle = {
    color: 'white',
    fontSize: '14px',
    fontWeight: '400'
  }

  return (
    <div style={ingressControllerStyle}>
      <Icons.InternetIcon color={WHITE} size={MEDIUM} addImportantToColor />
      <span style={ingressControllerNameStyle}>{name}</span>
      <div style={{ rotate: '90deg' }}>
        <Icons.InternalLinkIcon color={WHITE} size={SMALL} addImportantToColor />
      </div>
    </div>
  )
}

export default MermaidNodeIngressController
