import React, { useEffect, useState, useMemo } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './TableUsers.module.css'
import { Button, LoadingSpinnerV2 } from '@platformatic/ui-components'
import NoDataFound from '~/components/ui/NoDataFound'
import { DULLS_BACKGROUND_COLOR, ERROR_RED, RICH_BLACK, SMALL, TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import useICCStore from '~/useICCStore'
import { isRegularUser } from '../../../utils'

function TableUsers ({
  users,
  onClickAddUser = () => {},
  onClickChangeRole = (user) => {},
  onClickRemove = (user) => {}
}) {
  const globalState = useICCStore()
  const { user: loggedUser } = globalState
  const [innerLoading, setInnerLoading] = useState(true)
  const [showNoResult, setShowNoResult] = useState(false)
  const [containerClassName, setContainerClassName] = useState(`${styles.container} ${styles.noDataFoundContainer}`)
  const columns = useMemo(() => [
    {
      label: 'Username',
      key: 'username'
    },
    {
      label: 'Email',
      key: 'email'
    },
    {
      label: 'Role',
      key: 'role'
    }
  ], [])

  function renderColumn (user, column) {
    let textColor = typographyStyles.textWhite
    if (!user.joined) {
      textColor = typographyStyles.opacity70
    }
    let username = user.username
    let text = user.role

    switch (column.key) {
      case 'username':
        if (!user.joined) {
          username = '-'
        }
        return <span className={`${typographyStyles.desktopBodySmall} ${textColor}`}>{username}</span>
      case 'email':
        return <span className={`${typographyStyles.desktopBodySmall} ${textColor}`}>{user.email}</span>
      case 'role':
        if (!user.joined) {
          text = 'Pending'
        }
        return <span className={`${typographyStyles.desktopBodySmall} ${textColor}`}>{text}</span>
    }
  }
  useEffect(() => {
    if (users.length === 0) {
      setContainerClassName(`${styles.container} ${styles.noDataFoundContainer}`)
      setShowNoResult(true)
    } else {
      setContainerClassName(`${styles.container}`)
      setShowNoResult(false)
    }
    setInnerLoading(false)
  }, [users])

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

    function renderButtons (user) {
      // Do not render action button if the user is a normal user
      // or if the user is the only user in the organization
      if (!loggedUser || (isRegularUser(loggedUser) || users.length === 1)) {
        return null
      }
      return (
        <td className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} `}>
          <Button
            type='button'
            label='Change Role'
            onClick={() => onClickChangeRole(user)}
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
            onClick={() => onClickRemove(user)}
            color={ERROR_RED}
            backgroundColor={TRANSPARENT}
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.smallButtonPadding}
            platformaticIcon={{ iconName: 'UserRemoveIcon', size: SMALL, color: ERROR_RED }}
            fullWidth
          />
        </td>
      )
    }

    return (
      <div className={styles.container}>
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className={styles.jobRow} key={user.id}>
                {columns.map((column) => (
                  <td key={column.key}>{renderColumn(user, column)}</td>
                ))}
                {renderButtons(user)}

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className={containerClassName}>
      {renderComponent()}
    </div>
  )
}

export default TableUsers
