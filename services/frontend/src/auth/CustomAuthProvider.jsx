import React from 'react'
import PropTypes from 'prop-types'
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

CustomAuthProvider.propTypes = {
  /**
   * children
   */
  children: PropTypes.node,
  /**
   * value
   */
  value: PropTypes.object
}

export default CustomAuthProvider
