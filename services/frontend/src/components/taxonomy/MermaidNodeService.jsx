import { ERROR_RED, MEDIUM, RICH_BLACK, SMALL, WARNING_YELLOW } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import React from 'react'
import { isSafari } from '~/utilityBrowser'
function MermaidNodeService ({
  id = '',
  type = '',
  outdated = false,
  entrypoint = false,
  compliant = true
}) {
  const serviceContainerStyle = {
    display: 'flex',
    flexDirection: 'row',
    columnGap: '1rem',
    alignItems: 'center'
  }
  const serviceNameContainer = {
    display: 'flex',
    flexDirection: 'row',
    columnGap: '1rem',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%'
  }
  const textStyle = {
    display: 'flex',
    flexDirection: 'column',
    rowGap: '0rem',
    alignItems: 'start'
  }
  const serviceNameStyle = {
    color: 'white',
    fontSize: '14px',
    fontWeight: '400'
  }
  const templateStyle = {
    color: 'white',
    fontSize: '12px',
    fontWeight: 400
  }

  if (!isSafari) {
    templateStyle.opacity = 0.7
  }

  const entryPointIconContainer = {
    background: 'white',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    left: '-2px'
  }

  return (
    <div style={serviceContainerStyle}>
      {entrypoint && <div style={entryPointIconContainer}><Icons.EntrypointIcon color={RICH_BLACK} size={MEDIUM} addImportantToColor /></div>}
      <div style={textStyle}>
        <div style={serviceNameContainer}>
          <span style={serviceNameStyle}>{id}</span>
          {outdated && <Icons.OutdatedServiceIcon color={WARNING_YELLOW} size={SMALL} addImportantToColor />}
          {!compliant && <Icons.NotCompliantServiceIcon color={ERROR_RED} size={SMALL} addImportantToColor />}
        </div>
        <p style={templateStyle}>{type}</p>
      </div>
    </div>
  )
}

export default MermaidNodeService
