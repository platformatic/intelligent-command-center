import React from 'react'
import PropTypes from 'prop-types'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import { Icons } from '@platformatic/ui-components'
import useICCStore from '~/useICCStore'
import { MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import {
  KEY_PROFILE
} from '~/ui-constants'

function AccountMenu ({ onClickAccount = () => {} }) {
  const globalState = useICCStore()
  const { sectionSelected } = globalState

  let className = `${commonStyles.smallFlexRow} ${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${commonStyles.cursorPointer}`
  if (KEY_PROFILE !== sectionSelected) className += ` ${typographyStyles.opacity70}`

  return (
    <div className={className} onClick={() => onClickAccount(KEY_PROFILE)}>
      <Icons.UserIcon color={WHITE} size={MEDIUM} />
      <span className={typographyStyles.desktopBodySmall}>Profile overview</span>
    </div>
  )
}

AccountMenu.propTypes = {
  /**
   * onClickAccount
    */
  onClickAccount: PropTypes.func
}

export default AccountMenu
