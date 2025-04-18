import React, { useState } from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './PanelPreviewApplicationAndServiceChanges.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { OPACITY_100, OPACITY_30, RICH_BLACK, SMALL, WHITE, BLACK_RUSSIAN, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, Tag } from '@platformatic/ui-components'
import NoDataAvailable from '~/components/ui/NoDataAvailable'

function BoxService ({
  id,
  applicationName
}) {
  const [hover, setHover] = useState(false)

  return (
    <div onMouseLeave={() => setHover(false)} onMouseEnter={() => setHover(true)} className={commonStyles.fullWidth}>
      <BorderedBox
        color={TRANSPARENT}
        backgroundColor={hover ? WHITE : RICH_BLACK}
        classes={`${styles.borderexBoxServiceContainer} ${commonStyles.fullWidth} ${commonStyles.cursorPointer}`}
        backgroundColorOpacity={hover ? OPACITY_30 : OPACITY_100}
      >
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexRow}`}>
            <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>{id}</span>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{applicationName}</span>
          </div>
        </div>
      </BorderedBox>

    </div>
  )
}

function PanelPreviewApplicationAndServiceChanges ({ allChanges = [] }) {
  function renderChange (change) {
    if (change.services.length === 0) {
      return (
        <BorderedBox color={TRANSPARENT} backgroundColor={RICH_BLACK} classes={`${styles.borderexBoxContainer} ${commonStyles.fullWidth}`}>
          <NoDataAvailable iconName='PlatformaticServiceIcon' />
        </BorderedBox>
      )
    }
    return (
      <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
        {change.services.map((service, index) => <BoxService key={`${index}-${service.id}`} {...service} />)}
      </div>
    )
  }

  return (
    <div className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
        <Icons.AppEditIcon
          color={WHITE}
          size={SMALL}
        />
        <div>
          <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Application and Service changes</p>
        </div>
      </div>
      {allChanges.map(change => (
        <BorderedBox key={change.key} classes={styles.borderexBoxContainerChange} backgroundColor={BLACK_RUSSIAN} color={TRANSPARENT}>
          <div key={change.key} className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
            <Tag
              text={change.label.toUpperCase()}
              textClassName={change.labelClassName}
              backgroundColor={change.tagBackgroundColor}
              bordered={false}
              opaque={OPACITY_30}
              fullRounded
              platformaticIcon={{ iconName: change.tagIconName, color: change.tagIconColor, size: SMALL }}
              paddingClass={styles.paddingTagChange}
            />
            {renderChange(change)}
          </div>
        </BorderedBox>
      ))}
    </div>
  )
}

PanelPreviewApplicationAndServiceChanges.propTypes = {
  /**
   * allChanges
    */
  allChanges: PropTypes.array
}

export default PanelPreviewApplicationAndServiceChanges
