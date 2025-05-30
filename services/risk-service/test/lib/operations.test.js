'use strict'

const test = require('node:test')
const assert = require('node:assert')
const {
  serializeOperation,
  deserializeOperation,
  createOperation,
  getOperationMetadata
} = require('../../lib/operations')

const { isHTTP } = require('../../lib/span-attributes')

test('serialize and deserialize operations', async (t) => {
  const operation = {
    telemetryName: 'A',
    operation: {
      protocol: 'http',
      method: 'get',
      path: '/test'
    }
  }
  const serializedOperation = serializeOperation(operation)
  assert.equal(serializedOperation, 'A|http://GET/test')
  const deserializedOperation = deserializeOperation(serializedOperation)

  // We uppercase the method
  const expectedOperation = { telemetryName: 'A', operation: { protocol: 'http', method: 'GET', path: '/test' } }
  assert.deepStrictEqual(deserializedOperation, expectedOperation)
})

test('serialize and deserialize operations without protocol', async (t) => {
  const operation = {
    telemetryName: 'A',
    operation: {
      method: 'GET',
      path: '/test'
    }
  }
  const serializedOperation = serializeOperation(operation)
  assert.equal(serializedOperation, 'A|GET/test')
  const deserializedOperation = deserializeOperation(serializedOperation)
  assert.deepStrictEqual(deserializedOperation, operation)
})

test('serialize and deserialize operations', async (t) => {
  const operation = {
    telemetryName: 'A',
    operation: {
      protocol: 'http',
      method: 'GET',
      path: '/test/example/123'
    }
  }
  const serializedOperation = serializeOperation(operation)
  assert.equal(serializedOperation, 'A|http://GET/test/example/123')
  const deserializedOperation = deserializeOperation(serializedOperation)

  // We uppercase the method
  const expectedOperation = { telemetryName: 'A', operation: { protocol: 'http', method: 'GET', path: '/test/example/123' } }
  assert.deepStrictEqual(deserializedOperation, expectedOperation)
})

test('serialize and deserialize operations', async (t) => {
  const operation = {
    telemetryName: 'A',
    operation: {
      method: 'GET',
      path: '/test/example/123'
    }
  }
  const serializedOperation = serializeOperation(operation)
  assert.equal(serializedOperation, 'A|GET/test/example/123')
  const deserializedOperation = deserializeOperation(serializedOperation)

  // We uppercase the method
  const expectedOperation = { telemetryName: 'A', operation: { method: 'GET', path: '/test/example/123' } }
  assert.deepStrictEqual(deserializedOperation, expectedOperation)
})

test('serialize and deserialize operations with graphql', async (t) => {
  const operation = {
    telemetryName: 'A',
    operation: {
      protocol: 'graphql',
      method: 'QUERY',
      path: '/getMovies'
    }
  }
  const serializedOperation = serializeOperation(operation)
  assert.equal(serializedOperation, 'A|graphql://QUERY/getMovies')
  const deserializedOperation = deserializeOperation(serializedOperation)

  // We uppercase the method
  const expectedOperation = { telemetryName: 'A', operation: { protocol: 'graphql', method: 'QUERY', path: '/getMovies' } }
  assert.deepStrictEqual(deserializedOperation, expectedOperation)
})

test('create a HTTP operation', async (t) => {
  const operation = {
    telemetryName: 'A',
    operation: {
      method: 'GET',
      path: '/test/example/123'
    }
  }
  const serializedOperation = serializeOperation(operation)
  assert.equal(serializedOperation, 'A|GET/test/example/123')
  const deserializedOperation = deserializeOperation(serializedOperation)

  // We uppercase the method
  const expectedOperation = { telemetryName: 'A', operation: { method: 'GET', path: '/test/example/123' } }
  assert.deepStrictEqual(deserializedOperation, expectedOperation)
})

test('create a HTTP operation name from span', async (t) => {
  const serviceName = 'SERVICE_NAME_A'
  const attributes = {
    'http.request.method': 'GET',
    'url.path': '/test',
    'url.scheme': 'http'
  }
  const operation = createOperation(serviceName, attributes)
  assert.deepStrictEqual(operation, 'SERVICE_NAME_A|http://GET/test')
})

test('create a HTTP operation name from span using http.route/method/scheme', async (t) => {
  const serviceName = 'SERVICE_NAME_A'
  const attributes = {
    'http.method': 'GET',
    'http.route': '/test',
    'http.scheme': 'http'
  }
  const operation = createOperation(serviceName, attributes)
  assert.deepStrictEqual(operation, 'SERVICE_NAME_A|http://GET/test')
})

test('create a HTTP operation name from span using http.target/method/scheme', async (t) => {
  const serviceName = 'SERVICE_NAME_A'
  const attributes = {
    'http.method': 'GET',
    'http.target': '/test',
    'http.scheme': 'http'
  }
  const operation = createOperation(serviceName, attributes)
  assert.deepStrictEqual(operation, 'SERVICE_NAME_A|http://GET/test')
})

test('create a GraphQL operation name from span', async (t) => {
  const serviceName = 'SERVICE_NAME_A'
  const attributes = {
    'graphql.operation.name': 'getMovies',
    'graphql.operation.type': 'query'
  }
  const operation = createOperation(serviceName, attributes)
  assert.deepStrictEqual(operation, 'SERVICE_NAME_A|graphql://QUERY/getMovies')
})

test('create a DB operation name from span', async (t) => {
  const serviceName = 'SERVICE_NAME_A'
  const attributes = {
    'db.system': 'postgresql',
    'db.name': 'test-api',
    'db.connection_string': 'postgresql://127.0.0.1:15555/test-api',
    'net.peer.name': '127.0.0.1',
    'net.peer.port': 15555,
    'db.user': 'postgres',
    'db.statement': 'SELECT * FROM users'
  }
  const operation = createOperation(serviceName, attributes)
  assert.deepStrictEqual(operation, 'SERVICE_NAME_A|postgresql://test-api')
})

test('get operation metadata', async (t) => {
  {
    const attributes = {
      'graphql.operation.name': 'getMovies',
      'graphql.operation.type': 'query'
    }
    const metadata = getOperationMetadata(attributes)
    assert.deepStrictEqual(metadata, { isGraphQL: true, isGraphQLHTTPPost: false })
  }

  {
    const attributes = {
      'url.path': '/graphql',
      'http.request.method': 'POST',
      'url.scheme': 'https'
    }
    const metadata = getOperationMetadata(attributes)
    assert.deepStrictEqual(metadata, { isGraphQL: false, isGraphQLHTTPPost: true })
  }

  {
    const attributes = {
      'url.path': '/movies',
      'http.request.method': 'GET',
      'url.scheme': 'https'
    }
    const metadata = getOperationMetadata(attributes)
    assert.deepStrictEqual(metadata, { isGraphQL: false, isGraphQLHTTPPost: false })
  }
})

test('check if it\'s a HTTP span', async (t) => {
  const attributes = {
    'http.request.method': 'GET',
    'url.path': '/test',
    'url.scheme': 'http'
  }
  assert.ok(isHTTP(attributes))
})

test('check if it\'s HTTP from span using http.route/method/scheme', async (t) => {
  const attributes = {
    'http.method': 'GET',
    'http.route': '/test',
    'http.scheme': 'http'
  }
  assert.ok(isHTTP(attributes))
})

test('check that it\'s not an HTTP', async (t) => {
  const attributes = {
    'db.statement': 'SELECT * FROM users'
  }
  assert.ok(!isHTTP(attributes))
})

test('check if it\'s a CLIENT HTTP span', async (t) => {
  const attributes = {
    'http.url': 'http://people-service:8081/api/people/2',
    'http.method': 'GET',
    'http.target': '/api/people/2'
  }
  assert.ok(isHTTP(attributes))
})
