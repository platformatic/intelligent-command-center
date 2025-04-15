'use strict'

function userLoginEvent (userId, username) {
  return {
    userId,
    username,
    objectId: userId,
    objectType: 'user',
    event: 'USER_LOGIN',
    description: 'logged in'
  }
}
module.exports = userLoginEvent
