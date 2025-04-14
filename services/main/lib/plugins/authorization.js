'use strict'

const { request } = require('undici')
const fp = require('fastify-plugin')
const { getICCServices } = require('../utils')
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
    ['/risk-service/v1/traces', '*'],
    ['/risk-service/dump', '*'],
    ['/risk-manager/dbschemas', ['POST']], // deprecated
    ['/risk-manager/db-schema', ['POST']],
    ['/compliance/metadata', ['POST']],
    ['/compliance/compliance', ['POST']],
    ['/risk-cold-storage/sync', ['GET']],
    ['/api/updates', ['GET']],
    ['/trafficante/requests', ['POST']],
    ['/cron/watt-jobs', ['PUT']],

    // zio routes
    [/\/control-plane\/applications\/[a-zA-z0-9-]+\/state/, ['POST']],
    [/\/control-plane\/applications\/[a-zA-z0-9-]+\/status/, ['POST']],
    [/\/control-plane\/applications\/[a-zA-z0-9-]+$/, ['GET']]
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
async function authorizeRoute (req, reply) {
  if (req.method === 'OPTIONS') {
    // preflight requests can proceed
    return true
  }
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
  app.decorateRequest('user', null)
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
  dependencies: ['cookie', 'config']
})
