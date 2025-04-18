import React from 'react'
import PropTypes from 'prop-types'
import { MARGIN_0, OPACITY_30, TRANSPARENT, WHITE, DULLS_BACKGROUND_COLOR, RICH_BLACK } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { Button, HorizontalSeparator } from '@platformatic/ui-components'

function RevokeApiKey ({
  name = '-',
  onClickCancel = () => {},
  onClickConfirm = () => {}
}) {
  return (
    <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
      <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${commonStyles.fullWidth}`}>
        <span className={`${typographyStyles.opacity70}`}>You are about to revoke the API Key for your application </span>{name}<span className={`${typographyStyles.opacity70}`}>.</span>
      </p>
      <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_30} />
      <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
        <Button
          type='button'
          label='Cancel'
          onClick={() => onClickCancel()}
          color={WHITE}
          backgroundColor={TRANSPARENT}
          textClass={typographyStyles.desktopButtonSmall}
          paddingClass={commonStyles.smallButtonPadding}
        />
        <Button
          type='button'
          textClass={typographyStyles.desktopButtonSmall}
          paddingClass={commonStyles.smallButtonPadding}
          label='Revoke Key'
          onClick={() => onClickConfirm()}
          color={RICH_BLACK}
          backgroundColor={WHITE}
          hoverEffect={DULLS_BACKGROUND_COLOR}
          bordered={false}
        />
      </div>
    </div>
  )
}

RevokeApiKey.propTypes = {
  /**
   * name
   */
  name: PropTypes.string,
  /**
   * onClickCancel
   */
  onClickCancel: PropTypes.func,
  /**
   * onClickRemove
   */
  onClickConfirm: PropTypes.func
}

export default RevokeApiKey
