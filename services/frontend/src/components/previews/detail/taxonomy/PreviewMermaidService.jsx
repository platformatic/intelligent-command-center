import PropTypes from 'prop-types'
import { ERROR_RED, MAIN_GREEN, MEDIUM, RICH_BLACK, TERTIARY_BLUE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import React from 'react'
import { STATUS_UNCHANGED, STATUS_REMOVED, STATUS_EDITED, STATUS_ADDED } from '~/ui-constants'

function PreviewMermaidService ({
  id = '',
  entrypoint = false,
  status = STATUS_UNCHANGED
}) {
  function getStyleColor () {
    let color = 'white'
    switch (status) {
      case STATUS_REMOVED:
        color = 'red'
        break
      case STATUS_EDITED:
        color = 'blue'
        break
      case STATUS_ADDED:
        color = 'green'
        break
      default:
        break
    }
    return color
  }

  function getIconColor () {
    let color = RICH_BLACK
    switch (status) {
      case STATUS_REMOVED:
        color = ERROR_RED
        break
      case STATUS_EDITED:
        color = MAIN_GREEN
        break
      case STATUS_ADDED:
        color = TERTIARY_BLUE
        break
      default:
        break
    }
    return color
  }

  const serviceContainerStyle = {
    display: 'flex',
    flexDirection: 'row',
    columnGap: '1rem',
    alignItems: 'center'
  }
  const serviceNameStyle = {
    fontSize: '16px',
    fontWeight: '400'
  }
  const entryPointIconContainer = {
    background: getStyleColor(),
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    left: '-2px'
  }

  return (
    <div style={serviceContainerStyle}>
      {entrypoint && <div style={entryPointIconContainer}><Icons.EntrypointIcon color={getIconColor()} size={MEDIUM} addImportantToColor /></div>}
      <span style={serviceNameStyle}>{id}</span>
    </div>
  )
}

PreviewMermaidService.propTypes = {
  /**
   * id
   */
  id: PropTypes.string,
  /**
   * entrypoint
   */
  entrypoint: PropTypes.bool,
  /**
   * status
   */
  status: PropTypes.string
}

export default PreviewMermaidService
