import React from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './NoDataAvailable.module.css'
import { Icons } from '@platformatic/ui-components'
import { MEDIUM, SIZES, WHITE } from '@platformatic/ui-components/src/components/constants'

function NoDataAvailable ({
  title = 'No Data Available',
  iconName = '',
  containerClassName = styles.noDataContainer,
  titleClassName = `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`,
  iconColor = WHITE,
  iconSize = MEDIUM
}) {
  function getIcon () {
    if (iconName) {
      return React.createElement(Icons[`${iconName}`], {
        color: iconColor,
        size: iconSize
      })
    }
    return <></>
  }

  return (
    <div className={containerClassName}>
      {getIcon()}
      <p className={`${commonStyles.fullWidth} ${typographyStyles.textCenter} ${titleClassName}`}>{title}</p>
    </div>
  )
}

NoDataAvailable.propTypes = {
  /**
   * title
  */
  title: PropTypes.string,
  /**
   * containerClassName
  */
  containerClassName: PropTypes.string,
  /**
   * titleClassName
  */
  titleClassName: PropTypes.string,
  /**
   * iconName
  */
  iconName: PropTypes.string,
  /**
   * iconColor
  */
  iconColor: PropTypes.string,
  /**
   * iconColor
  */
  iconSize: PropTypes.oneOf(SIZES)
}

export default NoDataAvailable
