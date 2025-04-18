import PropTypes from 'prop-types'
import React from 'react'
import styles from './ServicesBoxList.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import { BorderedBox, HorizontalSeparator } from '@platformatic/ui-components'
import { ERROR_RED, MARGIN_0, MEDIUM, OPACITY_30, RICH_BLACK, WARNING_YELLOW, WHITE } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'

function ServicesBoxList ({
  hightlightedServices,
  hightlightColor,
  services,
  sentence,
  outdated
}) {
  function displayServicesBoxes () {
    const hightlight = Array.from(Array(hightlightedServices).keys()).map((_) => ({ hightlight: true }))
    const available = Array.from(Array(services - hightlightedServices).keys()).map((_) => ({ hightlight: false }))
    const classNameHighlighted = `${styles.boxServicesOutdated} ${hightlightColor === WARNING_YELLOW ? styles.boxServicesWarningYellow : styles.boxServicesErrorRed} `

    return hightlight.concat(available).map((element, index) => (
      <div className={`${element.hightlight ? classNameHighlighted : styles.boxServicesAvailable} ${commonStyles.flexGrow}`} key={index}>&nbsp;</div>
    ))
  }

  return (
    <BorderedBox classes={`${styles.borderexBoxContainer} ${commonStyles.smallFlexBlock}`} backgroundColor={RICH_BLACK} color={WHITE} borderColorOpacity={OPACITY_30}>
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
        {outdated ? <Icons.OutdatedServiceIcon color={WARNING_YELLOW} size={MEDIUM} /> : <Icons.NotCompliantServiceIcon color={ERROR_RED} size={MEDIUM} />}
        <h4 className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWhite}`}>{sentence}</h4>
      </div>

      <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_30} />

      <div className={styles.infoContainer}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyCenter}`}>
          <h1 className={`${typographyStyles.desktopHeadline1} ${typographyStyles.textWhite}`}>{hightlightedServices}</h1>
          <span className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>of {services}</span>
        </div>
        <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>View services</p>
      </div>

      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${styles.flexWrap}`}>
        {displayServicesBoxes()}
      </div>
    </BorderedBox>
  )
}

ServicesBoxList.propTypes = {
  /**
     * hightlightedServices
      */
  hightlightedServices: PropTypes.number,
  /**
    /**
     * services
      */
  services: PropTypes.number,
  /**
     * sentence
      */
  sentence: PropTypes.string,
  /**
     * outdated
      */
  outdated: PropTypes.bool
}

export default ServicesBoxList
