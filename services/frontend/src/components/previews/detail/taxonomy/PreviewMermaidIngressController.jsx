import { MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import React from 'react'

function PreviewMermaidIngressController () {
  const ingressControllerStyle = {
    display: 'flex',
    flexDirection: 'row',
    columnGap: '0.5rem',
    alignItems: 'center',
    position: 'relative',
    padding: '4px',
    writingMode: 'vertical-rl',
    rotate: '180deg'
  }
  return (
    <div style={ingressControllerStyle}>
      <Icons.InternetIcon color={WHITE} size={MEDIUM} addImportantToColor />
    </div>
  )
}

export default PreviewMermaidIngressController
