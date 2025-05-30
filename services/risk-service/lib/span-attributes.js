'use strict'

// These are the standard attributes that we use to identify operations
const HTTP_REQUEST_METHOD = 'http.request.method'
const URL_PATH = 'url.path'
const URL_SCHEME = 'url.scheme'
const GRAPHQL_OPERATION_NAME = 'graphql.operation.name'
const GRAPHQL_OPERATION_TYPE = 'graphql.operation.type'

// These are the attributes used by java agent (currently)
const HTTP_ROUTE = 'http.route'
const HTTP_TARGET = 'http.target'
const HTTP_METHOD = 'http.method'
const HTTP_SCHEME = 'http.scheme'
const HTTP_URL = 'http.url'

// DB Span attributes
const DB_SYSTEM = 'db.system'
const DB_NAME = 'db.name'
const DB_STATEMENT = 'db.statement'
const NET_PEER_NAME = 'net.peer.name'
const NET_PEER_PORT = 'net.peer.port'
const DB_USER = 'db.user'

const isHTTP = (attributes) => {
  if ((attributes[HTTP_URL] && attributes[HTTP_METHOD]) || attributes[HTTP_REQUEST_METHOD]) {
    return true
  }

  const method = attributes[HTTP_REQUEST_METHOD] || attributes[HTTP_METHOD]
  const path = attributes[URL_PATH] || attributes[HTTP_ROUTE] || attributes[HTTP_TARGET]
  const protocol = attributes[URL_SCHEME] || attributes[HTTP_SCHEME]
  return method !== undefined && path !== undefined && protocol !== undefined
}

const isDB = (attributes) => {
  return attributes[DB_SYSTEM] !== undefined
}

module.exports = {
  isHTTP,
  isDB,
  HTTP: {
    HTTP_REQUEST_METHOD,
    GRAPHQL_OPERATION_NAME,
    GRAPHQL_OPERATION_TYPE,
    URL_PATH,
    URL_SCHEME,
    HTTP_ROUTE,
    HTTP_TARGET,
    HTTP_METHOD,
    HTTP_SCHEME,
    HTTP_URL
  },

  DB: {
    DB_SYSTEM,
    DB_NAME,
    DB_STATEMENT,
    NET_PEER_NAME,
    NET_PEER_PORT,
    DB_USER
  }
}
