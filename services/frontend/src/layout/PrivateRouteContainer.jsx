import React, { useContext } from 'react'
import LoginPage from '~/pages/LoginPage'
import UserContext from '~/auth/UserContext'
import Header from '~/layout/Header'

function PrivateRouteContainer ({ children }) {
  const userContext = useContext(UserContext)
  const { isAuthenticated } = userContext
  if (!isAuthenticated || userContext === null) {
    return <LoginPage />
  }
  return (
    <div style={{ width: '100vw', height: 'calc(100vh - 3rem)' }}>
      <Header />
      {children}
    </div>
  )
}

export default PrivateRouteContainer
