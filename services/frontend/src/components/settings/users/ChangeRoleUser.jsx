import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { MARGIN_0, OPACITY_30, TRANSPARENT, WHITE, DULLS_BACKGROUND_COLOR, RICH_BLACK } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { Button, HorizontalSeparator } from '@platformatic/ui-components'
import { ROLE_USER, ROLE_ADMIN } from '~/ui-constants'

function ChangeRoleUser ({
  username = '-',
  onClickCancel = () => {},
  onClickConfirm = () => {}
}) {
  const [changing, setChanging] = useState(false)
  const [newRole, setNewRole] = useState(null)

  async function handleSubmit (event) {
    event.preventDefault()
    onClickConfirm(newRole)
    setChanging(true)
  }

  async function onClickRemove () {
    onClickConfirm(newRole)
    setChanging(true)
  }

  return (
    <div className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
      <p className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite} ${commonStyles.fullWidth}`}>
        <span className={`${typographyStyles.opacity70}`}>You are about to change the role of </span>{username}<span className={`${typographyStyles.opacity70}`}>.</span>
        <br /><br />
        <span className={`${typographyStyles.opacity70}`}>Select the new user’s role below:</span>
      </p>
      <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth}`}>
        <Button
          type='button'
          label='User'
          alt='User'
          color={WHITE}
          backgroundColor={TRANSPARENT}
          onClick={() => setNewRole(ROLE_USER)}
          fullWidth
          hoverEffect={DULLS_BACKGROUND_COLOR}
          selected={newRole === ROLE_USER}
          textClass={typographyStyles.desktopButtonSmall}
        />
        <Button
          type='button'
          label='Admin'
          alt='Admin'
          color={WHITE}
          backgroundColor={TRANSPARENT}
          onClick={() => setNewRole(ROLE_ADMIN)}
          fullWidth
          hoverEffect={DULLS_BACKGROUND_COLOR}
          selected={newRole === ROLE_ADMIN}
          textClass={typographyStyles.desktopButtonSmall}
        />
      </div>

      <p className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>User and Admin have different powers. Select one of them to see what you can do with each roles.</p>

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
            label={changing ? 'Changing role...' : 'Change role'}
            onClick={() => onClickRemove()}
            color={RICH_BLACK}
            backgroundColor={WHITE}
            hoverEffect={DULLS_BACKGROUND_COLOR}
            disabled={newRole === null || changing}
            bordered={false}
          />
        </div>
      </form>
    </div>

  )
}

ChangeRoleUser.propTypes = {
  /**
   * username
   */
  username: PropTypes.string,
  /**
   * onClickCancel
   */
  onClickCancel: PropTypes.func,
  /**
   * onClickConfirm
   */
  onClickConfirm: PropTypes.func
}

export default ChangeRoleUser
