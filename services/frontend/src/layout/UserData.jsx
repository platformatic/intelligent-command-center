import React, { useContext, useEffect, useState } from 'react'
import { RICH_BLACK, WHITE, SMALL } from '@platformatic/ui-components/src/components/constants'
import { DropDown, Icons } from '@platformatic/ui-components'
import LogoutButton from '../auth/LogoutButton'
import styles from './UserData.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import UserContext from '~/auth/UserContext'
import { useNavigate } from 'react-router-dom'
import { getGithubUserInfo } from '~/api'

function UserData () {
  const userContext = useContext(UserContext)
  const { user } = userContext
  const navigate = useNavigate()
  const [gravatarUrl, setGravatarUrl] = useState('./githubUser.png')

  function getMenuItems () {
    const ret = []
    ret.push(
      <div className={styles.menuItemWithIcon} key='stackables' onClick={() => navigate('/profile')}>
        <Icons.UserIcon color={WHITE} size={SMALL} />
        <div className={`${styles.titleMenu} ${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`} title='Profile'>My Profile</div>
      </div>
    )
    ret.push(<LogoutButton key='logout' />)
    return ret
  }

  useEffect(() => {
    if (user?.email) {
      async function getAvatarUrl () {
        try {
          const data = await getGithubUserInfo(user.email)
          const data1 = await data.json()
          if ((data1.items?.length ?? 0) > 0 && data1.items[0]?.avatar_url) {
            setGravatarUrl(`${data1.items[0]?.avatar_url}&s=32`)
          }
        } catch (error) {
          console.error(`Error getting image gravatar: ${error}`)
        }
      }
      getAvatarUrl()
    }
  }, [user])

  return (
    <>
      {user
        ? (
          <div className={styles.container}>
            <div className='grow'>
              <DropDown
                pictureUrl={gravatarUrl}
                header=''
                items={getMenuItems()}
                align='right'
                backgroundColor={RICH_BLACK}
                textColor={WHITE}
                headerColor={WHITE}
                borderColor={WHITE}
                menuCustomClassName={styles.menu}
                handleClickOutside
              />
            </div>
          </div>
          )
        : null}
    </>
  )
}

export default UserData
