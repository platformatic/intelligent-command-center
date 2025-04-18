import React, { useEffect, useState } from 'react'
import { WHITE, RICH_BLACK, DULLS_BACKGROUND_COLOR, TRANSPARENT, MODAL_POPUP_V2, MEDIUM, BLACK_RUSSIAN, SMALL } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './Users.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { BorderedBox, Button, Modal } from '@platformatic/ui-components'
import ErrorComponent from '~/components/errors/ErrorComponent'
import SuccessComponent from '~/components/success/SuccessComponent'
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

function Users () {
  const [error, setError] = useState(null)
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [reloadUsers, setReloadUsers] = useState(true)
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [showOnlyJoinedUsers, setShowOnlyJoinedUsers] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showModalInviteUser, setShowModalInviteUser] = useState(false)
  const [showModalRemoveUser, setShowModalRemoveUser] = useState(false)
  const [showModalChangeRole, setShowModalChangeRole] = useState(false)
  const [showSuccessComponent, setShowSuccessComponent] = useState(false)
  const [showSuccessComponentProps, setShowSuccessComponentProps] = useState({})

  useEffect(() => {
    if (!usersLoaded && reloadUsers) {
      setUsersLoaded(false)
      async function loadUsers () {
        try {
          const users = await getApiUsers()
          setUsersLoaded(true)
          setReloadUsers(false)
          setUsers([...users])
          setFilteredUsers([...users])
        } catch (error) {
          console.error(`Error on loadUsers ${error}`)
          setError(error)
          setShowErrorComponent(true)
        }
      }
      loadUsers()
    }
  }, [usersLoaded, reloadUsers])

  useEffect(() => {
    if (showOnlyJoinedUsers) {
      setFilteredUsers([...users.filter(user => user.joined)])
    } else {
      setFilteredUsers([...users])
    }
  }, [showOnlyJoinedUsers])

  function renderContent () {
    if (showErrorComponent) {
      return <ErrorComponent error={error} onClickDismiss={() => setShowErrorComponent(false)} />
    }

    return (
      <TableUsers
        usersLoaded={usersLoaded}
        users={filteredUsers}
        onClickAddUser={handleOnClickAddUser}
        onClickChangeRole={handleOnClickChangeRole}
        onClickRemove={handleOnClickRemove}
      />
    )
  }

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
      setShowSuccessComponentProps({ title: `User${emails.length > 1 ? 's' : ''} added`, subtitle: `You added new member${emails.length > 1 ? 's' : ''} to the organization successfully` })
      handleCloseModalInviteUser()
      setShowSuccessComponent(true)
      setTimeout(() => {
        setShowSuccessComponent(false)
        setUsers([])
        setFilteredUsers([])
        setUsersLoaded(false)
        setReloadUsers(true)
      }, 3000)
    } catch (error) {
      console.error(`Error on callApiInviteUser ${error}`)
      handleCloseModalInviteUser()
      setError(error)
      setShowErrorComponent(true)
      setShowSuccessComponent(false)
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
      await callApiChangeRoleUser(selectedUser.id, newRole)
      setShowSuccessComponentProps({ title: 'New role assigned', subtitle: 'You assigned a new role successfully.' })
      handleCloseModalChangeRole()
      setShowSuccessComponent(true)
      setTimeout(() => {
        setShowSuccessComponent(false)
        setUsers([])
        setFilteredUsers([])
        setUsersLoaded(false)
        setReloadUsers(true)
      }, 3000)
    } catch (error) {
      console.error(`Error on callApiChangeRoleUser ${error}`)
      handleCloseModalChangeRole()
      setError(error)
      setShowErrorComponent(true)
      setShowSuccessComponent(false)
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
      await callApiRemoveUser(selectedUser.id)
      setShowSuccessComponentProps({ title: 'User removed', subtitle: 'You removed the user from the organization successfully.' })
      handleCloseModalRemoveUser()
      setShowSuccessComponent(true)
      setTimeout(() => {
        setShowSuccessComponent(false)
        setUsers([])
        setFilteredUsers([])
        setUsersLoaded(false)
        setReloadUsers(true)
      }, 3000)
    } catch (error) {
      console.error(`Error on callApiRemoveUser ${error}`)
      handleCloseModalRemoveUser()
      setError(error)
      setShowErrorComponent(true)
      setShowSuccessComponent(false)
    }
  }

  return (
    <>
      <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.compliancyUsersBox}>
        <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
              <Icons.TeamsIcon color={WHITE} size={MEDIUM} />
              <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Users</p>
              {users.length > 0 && <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>({users.length} user{users.length > 1 ? 's' : ''})</span>}
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
            </div>
          </div>

          {renderContent()}
        </div>
      </BorderedBox>
      {showSuccessComponent && (
        <SuccessComponent {...showSuccessComponentProps} />
      )}
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
