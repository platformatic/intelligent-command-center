import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './TableUsers.module.css'
import { Button, LoadingSpinnerV2 } from '@platformatic/ui-components'
import RowUser from './RowUser'
import NoDataFound from '~/components/ui/NoDataFound'
import gridStyles from '~/styles/GridStyles.module.css'
import { DULLS_BACKGROUND_COLOR, RICH_BLACK, WHITE } from '@platformatic/ui-components/src/components/constants'
import useICCStore from '~/useICCStore'

function TableUsers ({
  usersLoaded = false,
  users = [],
  onClickAddUser = () => {},
  onClickChangeRole = () => {},
  onClickRemove = () => {}
}) {
  const globalState = useICCStore()
  const { user: loggedUser } = globalState
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  const [containerClassName, setContainerClassName] = useState(`${styles.container} ${styles.noDataFoundContainer}`)

  useEffect(() => {
    if (usersLoaded) {
      if (users.length === 0) {
        setContainerClassName(`${styles.container} ${styles.noDataFoundContainer}`)
        setShowNoResult(true)
      } else {
        setContainerClassName(`${styles.container}`)
        setShowNoResult(false)
      }
      setInnerLoading(false)
    }
  }, [usersLoaded, users.length])

  function renderComponent () {
    if (innerLoading) {
      return (
        <LoadingSpinnerV2
          loading={innerLoading}
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: [{
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
              text: 'Loading users...'
            }, {
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`,
              text: 'This process will just take a few seconds.'
            }]
          }}
          containerClassName={styles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }

    if (showNoResult) {
      return (
        <NoDataFound title='No Users found' subTitle={<span>There are no users yet.<br />Click on the button below to add your first user to your service.</span>}>
          <Button
            label='Add new User'
            onClick={() => onClickAddUser()}
            color={RICH_BLACK}
            backgroundColor={WHITE}
            hoverEffect={DULLS_BACKGROUND_COLOR}
            paddingClass={commonStyles.smallButtonPadding}
            textClass={typographyStyles.desktopButtonSmall}
            platformaticIcon={{ iconName: 'UserIcon', color: RICH_BLACK }}
            bordered={false}
          />
        </NoDataFound>
      )
    }

    return (
      <div className={styles.content}>
        <div className={styles.tableUsers}>
          <div className={styles.tableHeaders}>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle3}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Username</span>
              </div>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle3}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Email</span>
              </div>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle3}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Role</span>
              </div>
            </div>
            <div className={`${styles.tableHeader} ${gridStyles.colSpanMiddle3}`}>
              <div className={styles.thWithIcon}>
                <span className={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>&nbsp;</span>
              </div>
            </div>
          </div>

          {users.map(user => (
            <RowUser
              addYou={user.email === loggedUser.email}
              key={user.id}
              {...user}
              onClickChangeRole={() => onClickChangeRole(user)}
              onClickRemove={() => onClickRemove(user)}
            />
          ))}

        </div>
      </div>
    )
  }

  return (
    <div className={containerClassName}>
      {renderComponent()}
    </div>
  )
}

TableUsers.propTypes = {
  /**
   * usersLoaded
    */
  usersLoaded: PropTypes.bool,
  /**
   * users
    */
  users: PropTypes.array,
  /**
   * onClickAddUser
    */
  onClickAddUser: PropTypes.func,
  /**
   * onClickChangeRole
    */
  onClickChangeRole: PropTypes.func,
  /**
   * onClickRemove
    */
  onClickRemove: PropTypes.func
}

export default TableUsers
