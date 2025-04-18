import React, { useContext } from 'react'
import UserContext from '~/auth/UserContext'
import typographyStyles from '~/styles/Typography.module.css'

function DetailPage () {
  const userContext = useContext(UserContext)
  const { user } = userContext
  return <h1 className={`${typographyStyles.desktopHeadline1} ${typographyStyles.textWhite}`}>Hello {user.full_name}</h1>
}

export default DetailPage
