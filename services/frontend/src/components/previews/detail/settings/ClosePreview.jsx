import React from 'react'
import PropTypes from 'prop-types'
import { MARGIN_0, OPACITY_30, TRANSPARENT, WHITE, DULLS_BACKGROUND_COLOR, ERROR_RED } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { Button, HorizontalSeparator } from '@platformatic/ui-components'

function ClosePreview ({
  onClickCancel = () => {},
  onClickConfirm = () => {}
}) {
  return (
    <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
      <p className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite} ${commonStyles.fullWidth}`}>
        <span className={`${typographyStyles.opacity70}`}>You are about to close the Preview permanently.<br /><br />Are you sure you want to proceed?</span>
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
          label='Close Preview'
          onClick={() => onClickConfirm()}
          color={WHITE}
          backgroundColor={ERROR_RED}
          hoverEffect={DULLS_BACKGROUND_COLOR}
          bordered={false}
        />
      </div>
    </div>
  )
}

ClosePreview.propTypes = {
  /**
   * onClickCancel
   */
  onClickCancel: PropTypes.func,
  /**
   * onClickRemove
   */
  onClickConfirm: PropTypes.func
}

export default ClosePreview
