import React from 'react'
import UserContext from './UserContext'

function CustomAuthProvider ({ children = null, value = {} }) {
  return (
    <UserContext.Provider
      value={{ ...value }}
    >
      {children}
    </UserContext.Provider>
  )
}

export default CustomAuthProvider
