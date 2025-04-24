'use strict'

const { request } = require('undici')
const fp = require('fastify-plugin')
const { getICCServices } = require('../utils')
const isK8SAllowedUrl = require('../k8s-allowed-routes')
const {
  UnauthorizedRouteError,
  MissingAuthCredentialsError,
  UnknownResponseFromAuthorizeError
} = require('../errors')

const PLT_USER_MANAGER_URL = 'http://user-manager.plt.local'

async function getWhitelistedPaths () {
  const routes = [
    ['/api/login/google', '*'],
    ['/api/login/github', '*'],
    ['/api/login/demo', '*'],
    ['/api/logout', ['GET']],
    ['/api/status', ['GET']],
    ['/hello', '*'],
    ['/favicon.', '*'],
    ['/fonts', '*'],
    ['/backgrounds', '*'],
    ['/assets', '*'],
    ['/api/updates', ['POST']],
    ['/api/updates/icc', ['GET']],
    ['/api/updates/pods', ['GET']]
  ]

  // add OpenaAPI spec route for each internal service
  const svcs = await getICCServices()
  for (const svc of svcs) {
    routes.push([`/${svc}/documentation/json`, 'GET'])
  }

  if (process.env.PLT_DEV === 'true') {
    // enable routes needed by vite dev server
    routes.push(['/@react-refresh', '*'])
    routes.push(['/background', '*'])
    routes.push(['/@vite/client', '*'])
    routes.push(['/@fs', '*'])
    routes.push(['/node_modules', '*'])
    routes.push(['/src', '*'])
    routes.push(['/clients', '*'])
  }

  routes.push(['browser-source-map-support.js', ['GET']])
  return routes
}
function methodIsAllowed (method, allowedMethods) {
  return allowedMethods === '*' || allowedMethods.includes(method)
}
async function currentUrlIsWhiteListed (currentUrl, method) {
  const splitForQueryParams = currentUrl.split('?')
  const urlToCheck = splitForQueryParams[0]
  const whiteListedPaths = await getWhitelistedPaths()
  return urlToCheck === '/' || whiteListedPaths.filter((routeData) => {
    const path = routeData[0]
    const allowedMethods = routeData[1] ? routeData[1] : '*'
    if (path instanceof RegExp) {
      return urlToCheck.match(path) && methodIsAllowed(method, allowedMethods)
    } else {
      return urlToCheck.startsWith(path) && methodIsAllowed(method, allowedMethods)
    }
  }).length > 0
}

function isWebSocketRequest (req) {
  return req.headers.connection &&
    req.headers.connection.toLowerCase() === 'upgrade' &&
    req.headers.upgrade.toLowerCase() === 'websocket'
}

async function authorizeRouteWithCookie (req) {
  if (req.method === 'OPTIONS') {
    // preflight requests can proceed
    return true
  }

  // Check if the route is in the regular whitelist
  if (await currentUrlIsWhiteListed(req.url, req.method)) {
    return true
  }

  if (!isWebSocketRequest(req)) {
    if (!req.cookies || !req.cookies['auth-cookie-name']) {
      throw new MissingAuthCredentialsError()
    }
  }

  const headers = {
    'content-type': 'application/json'
  }
  if (req.headers.cookie) {
    headers.cookie = req.headers.cookie
  }

  const res = await request(`${PLT_USER_MANAGER_URL}/authorize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      method: req.method,
      path: req.url
    })
  })
  const payload = await res.body.json()
  if (res.statusCode === 200) {
    if (payload.authorized !== true) {
      throw new UnauthorizedRouteError(req.method, req.url)
    } else {
      // user is authorized
      req.user = payload.user

      // this is for all requests that could be proxied to other internal services
      req.headers['x-user'] = JSON.stringify(payload.user)
      return true
    }
  } else {
    throw new UnknownResponseFromAuthorizeError(JSON.stringify(payload))
  }
}
async function plugin (app) {
  async function authorizeRoute (req) {
  // We distinguish between API calls that are supposed to be done from
  // the browser and those that are supposed to be done from K8S pods.
  // We need to split the two cases (assuming there is no overlap).
  // Otherwise we need to manage a lot of corner cases
  // In this way, if it's a K8S call, the call MUST use K8S JWT token
  // and if it's a browser call, the call MUST use the cookie
  // TODO:: now @fastify/auth is proably useless, as we are deciding
    // which auth method to use depending on the route
    if (isK8SAllowedUrl(req)) {
      return app.k8sJWTAuth(req)
    }
    return authorizeRouteWithCookie(req)
  }

  await app.register(require('@fastify/auth'))
  app.decorateRequest('toUserHeader', function () {
    const headers = {}
    if (this.user !== null) {
      headers['x-user'] = JSON.stringify(this.user)
    }
    return headers
  })
  app.addHook('onRequest', app.auth([authorizeRoute]))
}
plugin[Symbol.for('skip-override')] = true

module.exports = fp(plugin, {
  name: 'authorization',
  dependencies: ['cookie', 'config', 'k8s-authentication']
})
