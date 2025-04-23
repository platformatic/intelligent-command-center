'use strict'

// List of routes that can be authorized via K8s JWT authentication
const k8sAllowedRoutes = [
  // wattpro (zio) called routes
  ['/risk-cold-storage/sync', ['GET']],
  ['/trafficante/requests', ['POST']],
  ['/cron/watt-jobs', ['PUT']],
  ['/risk-service/v1/traces', '*'],
  ['/risk-service/dump', '*'],
  ['/risk-manager/db-schema', ['POST']],
  ['/compliance/metadata', ['POST']],
  ['/compliance/compliance', ['POST']],
  [/\/control-plane\/pods\/[a-zA-z0-9-]+\/instance/, ['POST']],
  [/\/control-plane\/pods\/[a-zA-z0-9-]+\/instance\/state/, ['POST']],
  [/\/compliance\/metadata/, ['POST']]
]

function methodIsAllowed (method, allowedMethods) {
  return allowedMethods === '*' || allowedMethods.includes(method)
}

function isUrlAllowed (req) {
  const currentUrl = req.url
  const method = req.method
  if (!currentUrl) {
    return false
  }
  const splitForQueryParams = currentUrl.split('?')
  const urlToCheck = splitForQueryParams[0]
  return k8sAllowedRoutes.filter((routeData) => {
    const path = routeData[0]
    const allowedMethods = routeData[1] ? routeData[1] : '*'
    if (path instanceof RegExp) {
      return urlToCheck.match(path) && methodIsAllowed(method, allowedMethods)
    } else {
      return urlToCheck.startsWith(path) && methodIsAllowed(method, allowedMethods)
    }
  }).length > 0
}

module.exports = isUrlAllowed
