import React, { useEffect, useState } from 'react'
import { WHITE, RICH_BLACK, DULLS_BACKGROUND_COLOR, TRANSPARENT, MODAL_POPUP_V2, MEDIUM, BLACK_RUSSIAN, SMALL } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './Users.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { BorderedBox, Button, Modal } from '@platformatic/ui-components'
import TableUsers from './TableUsers'
import {
  getApiUsers,
  callApiRemoveUser,
  callApiChangeRoleUser,
  callApiInviteUser
} from '~/api'
import Forms from '@platformatic/ui-components/src/components/forms'
import RemoveUser from './RemoveUser'
import ChangeRoleUser from './ChangeRoleUser'
import InviteUser from './InviteUser'
import useICCStore from '~/useICCStore'
import { isSuperAdmin } from '../../../utils'

function Users () {
  const globalState = useICCStore()
  const { showSplashScreen, user: loggedUser } = globalState
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [showOnlyJoinedUsers, setShowOnlyJoinedUsers] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showModalInviteUser, setShowModalInviteUser] = useState(false)
  const [showModalRemoveUser, setShowModalRemoveUser] = useState(false)
  const [showModalChangeRole, setShowModalChangeRole] = useState(false)

  async function loadUsers () {
    try {
      const users = await getApiUsers()
      setUsers([...users])
      setFilteredUsers([...users])
    } catch (error) {
      console.error(`Error on loadUsers ${error}`)
      showSplashScreen({
        title: 'Error',
        message: `Failed to load users: ${error.message}`,
        type: 'error'
      })
    }
  }
  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (showOnlyJoinedUsers) {
      setFilteredUsers([...users.filter(user => user.joined)])
    } else {
      setFilteredUsers([...users])
    }
  }, [showOnlyJoinedUsers])

  // Invite User
  function handleOnClickAddUser () {
    setShowModalInviteUser(true)
  }

  function handleCloseModalInviteUser () {
    setShowModalInviteUser(false)
  }

  async function handleModalConfirmInviteUser (emails) {
    try {
      await callApiInviteUser(emails)
      showSplashScreen({
        title: `User${emails.length > 1 ? 's' : ''} added`,
        message: `You added new member${emails.length > 1 ? 's' : ''} to the organization successfully`,
        type: 'success',
        onDismiss () {
          loadUsers()
        }
      })
    } catch (error) {
      console.error(`Error on callApiInviteUser ${error}`)
      showSplashScreen({
        title: 'Error',
        message: `Failed to add user: ${error.message}`,
        type: 'error'
      })
    } finally {
      handleCloseModalInviteUser()
    }
  }

  // CHANGE ROLE
  function handleOnClickChangeRole (user) {
    setSelectedUser(user)
    setShowModalChangeRole(true)
  }

  function handleCloseModalChangeRole () {
    setSelectedUser(null)
    setShowModalChangeRole(false)
  }

  async function handleModalConfirmChangeRole (newRole) {
    try {
      const res = await callApiChangeRoleUser(selectedUser.id, newRole)
      if (!res.ok) {
        const body = await res.json()
        showSplashScreen({
          title: 'Error',
          message: `Failed to update role: ${body.message}`,
          type: 'error'
        })
      } else {
        showSplashScreen({
          title: 'New role assigned',
          message: 'You assigned a new role successfully.',
          type: 'success',
          onDismiss () {
            loadUsers()
          }
        })
      }
      handleCloseModalChangeRole()
    } catch (error) {
      console.error(`Error on callApiChangeRoleUser ${error}`)
      showSplashScreen({
        title: 'Error',
        message: `Failed to update role: ${error.message}`,
        type: 'error'
      })
    } finally {
      handleCloseModalChangeRole()
    }
  }

  // REMOVE USER
  function handleOnClickRemove (user) {
    setSelectedUser(user)
    setShowModalRemoveUser(true)
  }

  function handleCloseModalRemoveUser () {
    setSelectedUser(null)
    setShowModalRemoveUser(false)
  }

  async function handleModalConfirmRemoveUser () {
    try {
      const res = await callApiRemoveUser(selectedUser.id)
      if (res.ok) {
        showSplashScreen({
          title: 'User removed',
          message: 'You removed the user from the organization successfully.',
          type: 'success',
          onDismiss () {
            loadUsers()
          }
        })
      } else {
        const body = await res.json()
        showSplashScreen({
          title: 'Error',
          message: `Failed to remove user: ${body.message}`,
          type: 'error',
          onDismiss () {
            loadUsers()
          }
        })
      }
    } catch (error) {
      console.error(`Error on callApiRemoveUser ${error}`)
      showSplashScreen({
        title: 'Error',
        message: `Failed to remove user: ${error.message}`,
        type: 'error'
      })
    } finally {
      handleCloseModalRemoveUser()
    }
  }
  return (
    <>
      <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <Icons.TeamsIcon color={WHITE} size={MEDIUM} />
              <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Users</p>

              {users.length > 0 && <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>({users.length} user{users.length > 1 ? 's' : ''})</span>}
            </div>

          </div>

          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyEnd}`}>
            <div>
              <Forms.ToggleSwitch
                label='Hide pending users'
                labelClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
                name='showOnlyJoinedUsers'
                onChange={() => setShowOnlyJoinedUsers(!showOnlyJoinedUsers)}
                checked={showOnlyJoinedUsers}
                size={SMALL}
              />
            </div>
            {isSuperAdmin(loggedUser) && (
              <Button
                label='Add new User'
                onClick={() => handleOnClickAddUser()}
                color={RICH_BLACK}
                backgroundColor={WHITE}
                hoverEffect={DULLS_BACKGROUND_COLOR}
                paddingClass={commonStyles.smallButtonPadding}
                textClass={typographyStyles.desktopButtonSmall}
                platformaticIcon={{ iconName: 'AddUserIcon', color: RICH_BLACK }}
                bordered={false}
              />
            )}
          </div>
        </div>

        <TableUsers
          users={filteredUsers}
          onClickAddUser={handleOnClickAddUser}
          onClickChangeRole={handleOnClickChangeRole}
          onClickRemove={handleOnClickRemove}
        />
      </BorderedBox>
      {showModalRemoveUser && (
        <Modal
          key='ModalRemoveUser'
          setIsOpen={() => handleCloseModalRemoveUser()}
          title='Remove user'
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
          layout={MODAL_POPUP_V2}
          permanent
        >
          <RemoveUser
            username={selectedUser.username}
            email={selectedUser.email}
            onClickCancel={() => handleCloseModalRemoveUser()}
            onClickConfirm={() => handleModalConfirmRemoveUser()}
          />
        </Modal>
      )}
      {showModalChangeRole && (
        <Modal
          key='ModalChangeRole'
          setIsOpen={() => handleCloseModalChangeRole()}
          title={'Change member\'s role'}
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
          layout={MODAL_POPUP_V2}
          permanent
        >
          <ChangeRoleUser
            username={selectedUser.username}
            onClickCancel={() => handleCloseModalChangeRole()}
            onClickConfirm={(newRole) => handleModalConfirmChangeRole(newRole)}
          />
        </Modal>
      )}
      {showModalInviteUser && (
        <Modal
          key='ModalInviteUser'
          setIsOpen={() => handleCloseModalInviteUser()}
          title='Add users'
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
          layout={MODAL_POPUP_V2}
          permanent
        >
          <InviteUser
            onClickCancel={() => handleCloseModalInviteUser()}
            onClickConfirm={(emails) => handleModalConfirmInviteUser(emails)}
          />
        </Modal>
      )}
    </>
  )
}

export default Users
