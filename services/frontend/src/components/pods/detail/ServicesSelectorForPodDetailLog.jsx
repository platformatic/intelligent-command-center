import React, { useState } from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './ServicesSelector.module.css'
import Forms from '@platformatic/ui-components/src/components/forms'
import { OPACITY_100, OPACITY_15, OPACITY_30, RICH_BLACK, SMALL, TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, Checkbox } from '@platformatic/ui-components'
import Icons from '@platformatic/ui-components/src/components/icons'

function Service ({ id, entrypoint, isSelected, onChangeService = () => {} }) {
  const [selected] = useState(isSelected)

  return (
    <BorderedBox
      classes={styles.boxService}
      color={TRANSPARENT}
      backgroundColor={selected ? WHITE : RICH_BLACK}
      backgroundColorOpacity={selected ? OPACITY_30 : OPACITY_100}
      internalOverHandling
      backgroundColorOpacityOver={OPACITY_15}
      backgroundColorOver={WHITE}
    >
      <div className={`${commonStyles.miniFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
            <Checkbox onChange={onChangeService} color={WHITE} checked={isSelected} size={SMALL} />
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{id}</span>
            {entrypoint &&
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>(Entrypoint)</span>}
          </div>
          <Icons.InternalLinkIcon color={WHITE} size={SMALL} addImportantToColor />
        </div>
      </div>
    </BorderedBox>
  )
}

function ServicesSelectorForPodDetailLog ({ services, handleChangeService = () => {}, selectAllServices = true, handleChangeAllServices = () => {} }) {
  return (
    <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth} ${styles.servicesContainer}`}>
      {services.length > 1 &&
        <Forms.ToggleSwitch
          label='Select all services'
          labelClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
          name='selectAllServices'
          onChange={() => handleChangeAllServices()}
          checked={selectAllServices}
          size={SMALL}
        />}
      <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
        {services.map(service => <Service key={`${service.id}-$${service.selected}`} {...service} isSelected={service.selected} onChangeService={() => handleChangeService(service)} />)}
      </div>
    </div>
  )
}

ServicesSelectorForPodDetailLog.propTypes = {
  /**
   * services
    */
  services: PropTypes.array,
  /**
   * handleChangeService
    */
  handleChangeService: PropTypes.func,
  /**
   * selectAllServices
   */
  selectAllServices: PropTypes.bool,
  /**
     * handleChangeAllServices
      */
  handleChangeAllServices: PropTypes.func

}

export default ServicesSelectorForPodDetailLog
