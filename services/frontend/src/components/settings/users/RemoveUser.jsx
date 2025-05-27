import React, { useState } from 'react'
import { ERROR_RED, MARGIN_0, OPACITY_30, TRANSPARENT, WHITE, DULLS_BACKGROUND_COLOR } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { Button, HorizontalSeparator } from '@platformatic/ui-components'

function RemoveUser ({
  username = '',
  email = '',
  onClickCancel = () => {},
  onClickConfirm = () => {}
}) {
  const [removing, setRemoving] = useState(false)

  async function handleSubmit (event) {
    event.preventDefault()
    onClickConfirm()
    setRemoving(true)
  }

  async function onClickRemove () {
    onClickConfirm()
    setRemoving(true)
  }

  return (
    <div className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
      <p className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite} ${commonStyles.fullWidth}`}>
        <span className={`${typographyStyles.opacity70}`}>You are about to remove </span>{username || email}<span className={`${typographyStyles.opacity70}`}> from this organization.</span><br /><br />
        <span className={`${typographyStyles.opacity70}`}>You can add this users again anytime in the future from the settings page.</span>
      </p>
      <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_30} />
      <form onSubmit={handleSubmit} className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
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
            label={removing ? 'Removing user...' : 'Remove user'}
            onClick={() => onClickRemove()}
            color={WHITE}
            backgroundColor={ERROR_RED}
            hoverEffect={DULLS_BACKGROUND_COLOR}
            disabled={removing}
            bordered={false}
          />
        </div>
      </form>
    </div>
  )
}

export default RemoveUser
