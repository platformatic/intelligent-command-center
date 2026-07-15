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

// Escape regex metacharacters so an interpolated value is matched literally in a
// RegularExpression. Version labels can be image tags like `1.2.3`, where an
// unescaped `.` matches any character and would over-match the cookie value
// (routing the wrong version); a stray metacharacter could also break the
// pattern. Only correctness-relevant here (Envoy/RE2 is already ReDoS-safe).
function escapeRe (value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// x-deployment-id header match rule: routes a request carrying the explicit
// preview header straight to that version's backend. Used for both draining
// (rollback preview) and staged (pre-approval preview) versions.
function previewRule (pathMatch, version) {
  return {
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
  }
}

// Cookie-based session pinning rule: routes a request whose __plt_dpl cookie
// names this version straight to its backend. Browsers send cookies on every
// request (including top-level navigations), so this is what makes a version
// testable in a plain browser -- a header rule cannot be, since a browser can't
// set a request header on a navigation. Used for both draining (rollback
// stickiness) and staged (pre-approval preview) versions.
function cookieRule (pathMatch, version, cookieName) {
  return {
    matches: [{
      ...pathMatch,
      headers: [{
        name: 'Cookie',
        type: 'RegularExpression',
        // Gateway controllers (e.g. Envoy) match header RegularExpression as a
        // FULL-string match over the whole Cookie header, so the pattern must
        // tolerate other cookies before/after ours. A substring-style pattern
        // like `(^|;\s*)name=val(;|$)` only matches when our cookie is the only
        // one present, which breaks real browsers that send multiple cookies.
        value: `(.*;\\s*)?${escapeRe(cookieName)}=${escapeRe(version.versionId)}(\\s*;.*)?`
      }]
    }],
    filters: [URL_REWRITE_FILTER],
    backendRefs: [{
      name: version.serviceName,
      port: version.port
    }]
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
  stagedVersions = [],
  cookieMaxAge = DEFAULT_COOKIE_MAX_AGE,
  cookieName = COOKIE_NAME
}) {
  if (pathPrefix == null && hostname) {
    pathPrefix = '/'
  }

  const pathMatch = { path: { type: 'PathPrefix', value: pathPrefix } }
  const rules = []

  // Staged versions get a cookie-pinning rule and a header rule, but NO default
  // rule: they never see client traffic until approved. Only a request that
  // explicitly opts in -- by carrying the __plt_dpl cookie (set by hand for a
  // browser preview) or the x-deployment-id header -- reaches a staged version.
  // The default rule only ever sets the cookie to the active version, so no
  // ordinary client ever holds a staged cookie.
  for (const version of stagedVersions) {
    rules.push(cookieRule(pathMatch, version, cookieName))
    rules.push(previewRule(pathMatch, version))
  }

  for (const version of drainingVersions) {
    rules.push(cookieRule(pathMatch, version, cookieName))
    rules.push(previewRule(pathMatch, version))
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
            value: `${cookieName}=${productionVersion.versionId}; Path=${pathPrefix}; HttpOnly; Secure; SameSite=Lax; Max-Age=${cookieMaxAge}`
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
