import React, { useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './ServicesSelector.module.css'
import Forms from '@platformatic/ui-components/src/components/forms'
import { OPACITY_100, OPACITY_15, OPACITY_30, RICH_BLACK, SMALL, TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox } from '@platformatic/ui-components'
import Icons from '@platformatic/ui-components/src/components/icons'

function Service ({ id, entrypoint, isSelected, onClickService = () => {} }) {
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
      clickable
      onClick={() => onClickService()}
    >
      <div className={`${commonStyles.miniFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{id}</span>
            {entrypoint &&
              <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>(Entrypoint)</span>}
          </div>
          <Icons.InternalLinkIcon color={WHITE} size={SMALL} />
        </div>
      </div>
    </BorderedBox>
  )
}

function ServicesSelectorForPodServicesCharts ({
  services,
  handleClickService = () => {},
  showAggregatedMetrics = true,
  handleChangeShowAggregateMetrics = () => {},
  serviceSelected = {}
}) {
  return (
    <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth} ${styles.servicesContainer}`}>
      {services.length > 1 &&
        <Forms.ToggleSwitch
          label='Show Aggregated Metrics'
          labelClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
          name='showAggregatedMetrics'
          onChange={() => handleChangeShowAggregateMetrics()}
          checked={showAggregatedMetrics}
          size={SMALL}
        />}
      <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
        {services.map(service => <Service
          key={`${service.id}-$${service.selected}`}
          {...service}
          isSelected={serviceSelected.id === service.id}
          onClickService={() => handleClickService(service)}
                                 />)}
      </div>
    </div>
  )
}

export default ServicesSelectorForPodServicesCharts
