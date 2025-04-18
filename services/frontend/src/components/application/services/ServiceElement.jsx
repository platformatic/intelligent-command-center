import React from 'react'
import PropTypes from 'prop-types'
import { WHITE, OPACITY_30, OPACITY_15, MEDIUM, WARNING_YELLOW, OPACITY_100, BLACK_RUSSIAN, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { BorderedBox, VerticalSeparator } from '@platformatic/ui-components'
import Icons from '@platformatic/ui-components/src/components/icons'
import { SERVICE_OUTDATED } from '~/ui-constants'
import styles from './ServiceElement.module.css'

function ServiceElement ({
  service = {},
  applicationEntrypoint = false,
  onClickService = () => {},
  status = '',
  dependencies = {}
}) {
  function getIcon () {
    if (status === SERVICE_OUTDATED) return <Icons.OutdatedServiceIcon color={WARNING_YELLOW} size={MEDIUM} />
    return <Icons.PlatformaticServiceIcon color={WHITE} size={MEDIUM} />
  }

  function getOutdatedDependencies () {
    return Object.keys(dependencies).reduce((partialSum, dependency) => {
      const { current, wanted } = dependencies[dependency]
      return partialSum + (current !== wanted ? 1 : 0)
    }, 0)
  }

  return (
    <BorderedBox
      classes={`${commonStyles.buttonSquarePadding} ${commonStyles.fullWidth} ${styles.serviceElementBox}`}
      backgroundColor={BLACK_RUSSIAN}
      color={TRANSPARENT}
      backgroundColorOpacity={OPACITY_100}
      internalOverHandling
      backgroundColorOver={WHITE}
      backgroundColorOpacityOver={OPACITY_15}
      borderColorOpacityOver={OPACITY_100}
      clickable
      onClick={onClickService}
    >
      <div className={`${commonStyles.miniFlexBlock} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} `}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} `}>
          {getIcon()}
          <span className={`${typographyStyles.desktopBodySemibold} ${status === SERVICE_OUTDATED ? typographyStyles.textWarningYellow : typographyStyles.textWhite} `}>{service.id}</span>
          {applicationEntrypoint && (
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>(Application Entrypoint)</span>
          )}
        </div>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${styles.secondRow}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Dependencies:</span>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{Object.keys(dependencies)?.length ?? 0}</span>
          </div>

          <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} />

          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Outdated dependencies:</span>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{getOutdatedDependencies() ?? 0}</span>
          </div>
        </div>
      </div>
    </BorderedBox>
  )
}

ServiceElement.propTypes = {
  /**
   * id
    */
  id: PropTypes.string,
  /**
   * services
    */
  service: PropTypes.object,
  /**
   * applicationEntrypoint
    */
  applicationEntrypoint: PropTypes.bool,
  /**
   * status
    */
  status: PropTypes.string,
  /**
   * onClickService
    */
  onClickService: PropTypes.func,
  /**
   * dependencies
    */
  dependencies: PropTypes.object
}

export default ServiceElement
