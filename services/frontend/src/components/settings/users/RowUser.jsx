import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './RowUser.module.css'
import { SMALL, WHITE, ERROR_RED, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import { getGithubUserInfo } from '~/api'
import gridStyles from '~/styles/GridStyles.module.css'
import { Button } from '@platformatic/ui-components'
import { ROLE_SUPER_ADMIN, ROLE_ADMIN, ROLE_USER } from '~/ui-constants'

function RowUser ({
  addYou = false,
  username = '',
  email = '',
  role = '',
  joined = false,
  onClickChangeRole = () => {},
  onClickRemove = () => {}
}) {
  const [gravatarUrl, setGravatarUrl] = useState('./githubUser.png')

  useEffect(() => {
    if (email) {
      async function getAvatarUrl () {
        try {
          const data = await getGithubUserInfo(email)
          const data1 = await data.json()
          if ((data1.items?.length ?? 0) > 0 && data1.items[0]?.avatar_url) {
            setGravatarUrl(`${data1.items[0]?.avatar_url}&s=24`)
          }
        } catch (error) {
          console.error(`Error getting image gravatar: ${error}`)
        }
      }
      getAvatarUrl()
    }
  }, [email])

  function displayRole () {
    let ret = ''
    switch (role) {
      case ROLE_SUPER_ADMIN:
        ret = 'Super Admin'
        break
      case ROLE_ADMIN:
        ret = 'Admin'
        break
      case ROLE_USER:
        ret = 'User'
        break
      default:
        ret = '-'
        break
    }
    return ret
  }

  return (
    <div className={styles.userRow}>
      <div className={`${styles.tableSmallDescription} ${gridStyles.colSpanMiddle3}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Username</span>
        </div>
        <div className={`${styles.tableCell}`}>
          <div className={`${styles.customSmallFlexRow} ${styles.username}`}>
            {joined || role === ROLE_SUPER_ADMIN
              ? (
                <>
                  <div className={commonStyles.githubUser} style={{ backgroundImage: `url(${gravatarUrl}` }} />
                  <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>{username || '-'}</span>
                  {addYou && <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>(You)</span>}
                </>
                )
              : '-'}
          </div>
        </div>
      </div>

      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle3}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Email</span>
        </div>
        <div className={styles.tableCell}>
          <div className={styles.customSmallFlexRow}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{email}</span>
          </div>
        </div>
      </div>
      <div className={`${styles.tableSmallDescription} ${gridStyles.colSpanMiddle3}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Role</span>
        </div>
        <div className={`${styles.tableCell}`}>
          <div className={`${styles.customSmallFlexRow}`}>
            {joined || role === ROLE_SUPER_ADMIN
              ? (
                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{displayRole()}</span>
                )
              : (
                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>Pending</span>
                )}
          </div>
        </div>
      </div>
      <div className={`${styles.tableSmall} ${gridStyles.colSpanMiddle3}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.ellipsis}`}>Actions</span>
        </div>
        <div className={styles.tableCell}>
          {role !== ROLE_SUPER_ADMIN && (
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} `}>
              {!joined
                ? (
                  <Button
                    type='button'
                    label='Remove'
                    onClick={onClickRemove}
                    color={ERROR_RED}
                    backgroundColor={TRANSPARENT}
                    textClass={typographyStyles.desktopButtonSmall}
                    paddingClass={commonStyles.smallButtonPadding}
                    platformaticIcon={{ iconName: 'UserRemoveIcon', size: SMALL, color: ERROR_RED }}
                    fullWidth
                  />
                  )
                : (
                  <>
                    <Button
                      type='button'
                      label='Change Role'
                      onClick={onClickChangeRole}
                      color={WHITE}
                      backgroundColor={TRANSPARENT}
                      textClass={typographyStyles.desktopButtonSmall}
                      paddingClass={commonStyles.smallButtonPadding}
                      platformaticIcon={{ iconName: 'UserRoleIcon', size: SMALL, color: WHITE }}
                      fullWidth
                    />
                    <Button
                      type='button'
                      label='Remove'
                      onClick={onClickRemove}
                      color={ERROR_RED}
                      backgroundColor={TRANSPARENT}
                      textClass={typographyStyles.desktopButtonSmall}
                      paddingClass={commonStyles.smallButtonPadding}
                      platformaticIcon={{ iconName: 'UserRemoveIcon', size: SMALL, color: ERROR_RED }}
                      fullWidth
                    />
                  </>
                  )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

RowUser.propTypes = {
  /**
   * addYou
    */
  addYou: PropTypes.bool,
  /**
   * username
    */
  username: PropTypes.string,
  /**
   * email
    */
  email: PropTypes.string,
  /**
   * role
    */
  role: PropTypes.string,
  /**
   * joined
    */
  joined: PropTypes.bool,
  /**
   * onClickChangeRole
    */
  onClickChangeRole: PropTypes.func,
  /**
   * onClickRemove
    */
  onClickRemove: PropTypes.func
}

export default RowUser
