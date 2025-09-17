'use strict'

const { readFile } = require('node:fs/promises')
const { join } = require('node:path')
const crypto = require('node:crypto')
const { buildServer } = require('@platformatic/service')

const createSpanId = () => {
  return crypto.randomBytes(8).toString('base64')
}

const createTraceId = () => {
  return crypto.randomBytes(16).toString('base64')
}

const createResourceSpan = (serviceName, spans) => {
  const resource = {
    attributes: [
      {
        key: 'service.name',
        value: {
          stringValue: serviceName
        }
      }
    ],
    droppedAttributesCount: 0
  }

  const scopeSpans = [{
    scope: {
      name: '@platformatic/telemetry',
      version: '0.34.0'
    },
    spans
  }]

  return {
    resource,
    scopeSpans
  }
}

const createHTTPSpan = (traceId, spanId, parentSpanId, name, kind, method, path, fullUrl, protocol = 'http', time = 10 * 10 ** 6) => {
  path = path ?? '/test'
  fullUrl = fullUrl ?? 'http://test' + path

  return {
    traceId,
    spanId,
    parentSpanId,
    name,
    kind,
    startTimeUnixNano: 0,
    endTimeUnixNano: time,
    attributes: [
      {
        key: 'http.request.method',
        value: {
          stringValue: method
        }
      },
      {
        key: 'url.path',
        value: {
          stringValue: path
        }
      },
      {
        key: 'url.full',
        value: {
          stringValue: fullUrl
        }
      },
      {
        key: 'url.scheme',
        value: {
          stringValue: protocol
        }
      },
      {
        key: 'http.route',
        value: {
          stringValue: path
        }
      }
    ]
  }
}

const createGraphQLSpan = (traceId, spanId, parentSpanId, name, kind, operationType, operationName) => {
  return {
    traceId,
    spanId,
    parentSpanId,
    name,
    kind,
    attributes: [
      {
        key: 'graphql.operation.name',
        value: {
          stringValue: operationName
        }
      },
      {
        key: 'graphql.operation.type',
        value: {
          stringValue: operationType
        }
      }
    ]
  }
}

const createGenericSpan = (traceId, spanId, parentSpanId, name, kind) => {
  return {
    traceId,
    spanId,
    parentSpanId,
    name,
    kind,
    attributes: [
      {
        key: 'xxxxxx',
        value: {
          stringValue: "dont't care"
        }
      }
    ]
  }
}

const createSpanData = (traceId, spanId, parentSpanId, kind, operation) => {
  const spanData = {
    traceId,
    spanId,
    parentSpanId,
    kind,
    operation
  }
  return spanData
}

function setUpEnvironment (env = {}) {
  const defaultEnv = {
    PLT_CLIENTS_ROLE: 'clients',
    PLT_TOKEN_SVC_HOST: '',
    PLT_CORE_ROLE: 'plt-local-core',
    PLT_ICC_VALKEY_CONNECTION_STRING: 'redis://localhost:6343'
  }

  Object.assign(process.env, defaultEnv, env)
}

async function serviceConfig (overrides) {
  const config = JSON.parse(await readFile(join(__dirname, '..', 'platformatic.json'), 'utf8'))
  config.server = {
    ...config.server || { logger: { level: 'silent' } },
    port: 0,
    hostname: '127.0.0.1'
  }
  config.server.logger = { level: 'silent' }

  return config
}

const bootstrap = async function bootstrap (t, serverOverrides = {}, env = {}) {
  setUpEnvironment(env)
  const options = await serviceConfig(serverOverrides)
  const server = await buildServer(options)
  t.after(async () => {
    await server.store.flushAll()
    await server.close()
  })

  server.addHook('onRequest', function (req, reply, done) {
    req.trafficInspector = {
      saveUrlsRoutes: async () => ({ ok: true })
    }
    done()
  })

  await server.start()
  return server
}

const createDBSpan = (traceId, spanId, parentSpanId, name, kind, dbSystem, dbName, dbStatement, host, port, dbUser) => {
  return {
    traceId,
    spanId,
    parentSpanId,
    name,
    kind,
    attributes: [
      {
        key: 'db.system',
        value: {
          stringValue: dbSystem
        }
      },
      {
        key: 'db.name',
        value: {
          stringValue: dbName
        }
      },
      {
        key: 'db.statement',
        value: {
          stringValue: dbStatement
        }
      },
      {
        key: 'net.peer.name',
        value: {
          stringValue: host
        }
      },
      {
        key: 'net.peer.port',
        value: {
          intValue: port
        }
      },
      {
        key: 'db.user',
        value: {
          stringValue: dbUser
        }
      }

    ]
  }
}

module.exports = {
  bootstrap,
  createResourceSpan,
  createSpanId,
  createTraceId,
  createSpanData,
  createHTTPSpan,
  createGraphQLSpan,
  createDBSpan,
  createGenericSpan,
  setUpEnvironment
}
