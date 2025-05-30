'use strict'

const {
  HTTP,
  DB
} = require('./span-attributes')

// The operation has the form:
//    telemetryName: A,
//    operation: {
//      protocol: 'http',
//      method:'GET'
//      path: 'test'
//    }
// The result is a string of the form:
//    A|http://GET/test
const serializeOperation = (operation) => {
  const { telemetryName, operation: { protocol, method, path } } = operation
  const meth = method.toUpperCase()
  return protocol
    ? `${telemetryName}|${protocol}://${meth}${path}`
    : `${telemetryName}|${meth}${path}`
}

const deserializeOperation = (serializedOperation) => {
  const [telemetryName, rest] = serializedOperation.split('|')
  if (rest.includes('://')) {
    const [protocol, rest2] = rest.split('://')
    const firstSlash = rest2.indexOf('/')
    const method = rest2.slice(0, firstSlash)
    const path = rest2.slice(firstSlash)
    return {
      telemetryName,
      operation: {
        method,
        path,
        protocol
      }
    }
  } else {
    const firstSlash = rest.indexOf('/')
    const method = rest.slice(0, firstSlash)
    const path = rest.slice(firstSlash)
    return {
      telemetryName,
      operation: {
        method,
        path
      }
    }
  }
}

const createHTTPOperation = (serviceName, attributes) => {
  const method = attributes[HTTP.HTTP_REQUEST_METHOD] || attributes[HTTP.HTTP_METHOD]
  const path = attributes[HTTP.URL_PATH] || attributes[HTTP.HTTP_ROUTE] || attributes[HTTP.HTTP_TARGET] || '/'
  const protocol = attributes[HTTP.URL_SCHEME] || attributes[HTTP.HTTP_SCHEME] || 'http'
  return `${serviceName}|${protocol}://${method}${path}`
}

const createGraphQLOperation = (serviceName, attributes) => {
  const operationName = attributes[HTTP.GRAPHQL_OPERATION_NAME]
  const operationType = attributes[HTTP.GRAPHQL_OPERATION_TYPE]

  // We use this protocol to identify internal GraphQL spans
  const protocol = 'graphql'
  const type = operationType?.toUpperCase()
  return `${serviceName}|${protocol}://${type}/${operationName}`
}

const createDBOperation = (serviceName, attributes) => {
  const dbSystem = attributes[DB.DB_SYSTEM] || 'unknown'
  const dbName = attributes[DB.DB_NAME] || 'unknown'
  return `${serviceName}|${dbSystem}://${dbName}`
}

const createOperation = (serviceName, attributes) => {
  if (attributes[HTTP.GRAPHQL_OPERATION_TYPE]) {
    return createGraphQLOperation(serviceName, attributes)
  } else if (attributes[DB.DB_SYSTEM]) {
    return createDBOperation(serviceName, attributes)
  } else {
    // Defaults to HTTP
    return createHTTPOperation(serviceName, attributes)
  }
}

const getOperationMetadata = (attributes) => {
  return {
    isGraphQL: attributes[HTTP.GRAPHQL_OPERATION_TYPE] !== undefined,
    isGraphQLHTTPPost: (attributes[HTTP.HTTP_REQUEST_METHOD] === 'POST' && attributes[HTTP.URL_PATH] === '/graphql')
  }
}

module.exports = {
  serializeOperation,
  deserializeOperation,
  createOperation,
  getOperationMetadata
}
