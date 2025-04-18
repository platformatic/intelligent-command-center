import React from 'react'
import { Icons } from '@platformatic/ui-components'
import { WHITE, SMALL } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './LogoutButton.module.css'
import { logoutUser } from '~/api'
import useICCStore from '~/useICCStore'
import { HOME_PATH } from '~/ui-constants'
import { useNavigate } from 'react-router-dom'

const LogoutButton = () => {
  const globalState = useICCStore()
  const { setUser, setIsAuthenticated } = globalState
  const navigate = useNavigate()

  async function clickLogout () {
    try {
      await logoutUser()
      setUser({})
      setIsAuthenticated(false)
      navigate(HOME_PATH)
    } catch (error) {
      console.error(`Error on logout: ${error}`)
    }
  }

  return (
    <div className={`${styles.menuItemWithIcon} ${typographyStyles.textWhite}`} onClick={() => clickLogout()}>
      <Icons.LogOutIcon color={WHITE} size={SMALL} />
      <div className={`${styles.titleMenu} ${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`} title='Log out'>Log Out</div>
    </div>
  )
}

export default LogoutButton
