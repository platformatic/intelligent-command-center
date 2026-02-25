'use strict'

const COOKIE_NAME = '__plt_dpl'
const DEFAULT_COOKIE_MAX_AGE = 43200

const URL_REWRITE_FILTER = {
  type: 'URLRewrite',
  urlRewrite: {
    path: {
      type: 'ReplacePrefixMatch',
      replacePrefixMatch: '/'
    }
  }
}

function buildHTTPRoute ({
  appName,
  namespace,
  hostname = null,
  pathPrefix,
  gateway,
  productionVersion,
  drainingVersions = [],
  cookieMaxAge = DEFAULT_COOKIE_MAX_AGE
}) {
  const pathMatch = { path: { type: 'PathPrefix', value: pathPrefix } }
  const rules = []

  for (const version of drainingVersions) {
    // Cookie-based session pinning rule
    rules.push({
      matches: [{
        ...pathMatch,
        headers: [{
          name: 'Cookie',
          type: 'RegularExpression',
          value: `(^|;\\s*)${COOKIE_NAME}=${version.versionId}(;|$)`
        }]
      }],
      filters: [URL_REWRITE_FILTER],
      backendRefs: [{
        name: version.serviceName,
        port: version.port
      }]
    })

    // x-deployment-id header match rule
    rules.push({
      matches: [{
        ...pathMatch,
        headers: [{
          name: 'x-deployment-id',
          type: 'Exact',
          value: version.versionId
        }]
      }],
      filters: [URL_REWRITE_FILTER],
      backendRefs: [{
        name: version.serviceName,
        port: version.port
      }]
    })
  }

  // Default rule: production version with Set-Cookie
  rules.push({
    matches: [{ ...pathMatch }],
    backendRefs: [{
      name: productionVersion.serviceName,
      port: productionVersion.port
    }],
    filters: [
      URL_REWRITE_FILTER,
      {
        type: 'ResponseHeaderModifier',
        responseHeaderModifier: {
          add: [{
            name: 'Set-Cookie',
            value: `${COOKIE_NAME}=${productionVersion.versionId}; Path=${pathPrefix}; HttpOnly; Secure; SameSite=Lax; Max-Age=${cookieMaxAge}`
          }]
        }
      }
    ]
  })

  const spec = {
    parentRefs: [{
      kind: 'Gateway',
      name: gateway.name,
      namespace: gateway.namespace
    }],
    rules
  }

  if (hostname) {
    spec.hostnames = [hostname]
  }

  return {
    apiVersion: 'gateway.networking.k8s.io/v1',
    kind: 'HTTPRoute',
    metadata: {
      name: appName,
      namespace,
      labels: {
        'plt.dev/managed-by': 'icc',
        'plt.dev/application': appName
      }
    },
    spec
  }
}

module.exports = { buildHTTPRoute }
