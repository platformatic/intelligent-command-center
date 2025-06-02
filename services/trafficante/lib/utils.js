'use strict'

function getParentRoute (route) {
  if (route === '/') return null

  const parts = route.split('/').filter(Boolean)
  const lastPart = parts[parts.length - 1]

  if (!lastPart.startsWith(':')) {
    return null
  }

  return '/' + parts.slice(0, -1).join('/')
}

module.exports = {
  getParentRoute
}
