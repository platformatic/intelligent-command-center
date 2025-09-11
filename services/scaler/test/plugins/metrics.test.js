'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const Fastify = require('fastify')
const fp = require('fastify-plugin')
const metricsPlugin = require('../../plugins/metrics')

function createMockLogger () {
  const logs = []
  return {
    info: (data, msg) => logs.push({ level: 'info', data, msg }),
    error: (data, msg) => logs.push({ level: 'error', data, msg }),
    debug: (data, msg) => logs.push({ level: 'debug', data, msg }),
    warn: (data, msg) => logs.push({ level: 'warn', data, msg }),
    getLogs: () => logs
  }
}

test('metrics plugin should load with valid Prometheus URL', async (t) => {
  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  app.env = {
    PLT_METRICS_PROMETHEUS_URL: 'http://localhost:9090',
    PLT_METRICS_TIME_RANGE: '30m'
  }

  await app.register(fp(async function (app) {
    app.decorate('store', {})
  }, { name: 'store' }))

  await app.register(metricsPlugin)

  assert.ok(app.scalerMetrics)
  assert.strictEqual(app.scalerMetrics.prometheusUrl, 'http://localhost:9090/')

  await app.close()
})

test('metrics plugin should not load when Prometheus URL is missing', async (t) => {
  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  app.env = {}

  await app.register(fp(async function (app) {
    app.decorate('store', {})
  }, { name: 'store' }))

  await app.register(metricsPlugin)

  assert.strictEqual(app.scalerMetrics, undefined)

  const logs = mockLogger.getLogs()
  const warnLog = logs.find(log => log.level === 'warn')
  assert.ok(warnLog)
  assert.ok(warnLog.data && typeof warnLog.data === 'string' ? warnLog.data.includes('Prometheus URL is not set') : warnLog.msg && warnLog.msg.includes('Prometheus URL is not set'))

  await app.close()
})

test('metrics plugin should load with only Prometheus URL set', async (t) => {
  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  app.env = {
    PLT_METRICS_PROMETHEUS_URL: 'http://prometheus:9090/prometheus/'
  }

  await app.register(fp(async function (app) {
    app.decorate('store', {})
  }, { name: 'store' }))

  await app.register(metricsPlugin)

  assert.ok(app.scalerMetrics)
  assert.strictEqual(app.scalerMetrics.prometheusUrl, 'http://prometheus:9090/prometheus/')

  await app.close()
})

test('metrics plugin should handle empty Prometheus URL', async (t) => {
  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  app.env = {
    PLT_METRICS_PROMETHEUS_URL: '',
    PLT_METRICS_TIME_RANGE: '1h'
  }

  await app.register(fp(async function (app) {
    app.decorate('store', {})
  }, { name: 'store' }))

  await app.register(metricsPlugin)

  assert.strictEqual(app.scalerMetrics, undefined)

  const logs = mockLogger.getLogs()
  const warnLog = logs.find(log => log.level === 'warn')
  assert.ok(warnLog)

  await app.close()
})

test('metrics plugin should handle null Prometheus URL', async (t) => {
  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  app.env = {
    PLT_METRICS_PROMETHEUS_URL: null
  }

  await app.register(fp(async function (app) {
    app.decorate('store', {})
  }, { name: 'store' }))

  await app.register(metricsPlugin)

  assert.strictEqual(app.scalerMetrics, undefined)

  await app.close()
})

test('metrics plugin should pass timeRange option to Metrics constructor', async (t) => {
  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  app.env = {
    PLT_METRICS_PROMETHEUS_URL: 'http://localhost:9090',
    PLT_METRICS_TIME_RANGE: '45m'
  }

  await app.register(fp(async function (app) {
    app.decorate('store', {})
  }, { name: 'store' }))

  await app.register(metricsPlugin)

  assert.ok(app.scalerMetrics)
  assert.strictEqual(app.scalerMetrics.timeRange, '45m')

  await app.close()
})

test('metrics plugin should handle undefined timeRange', async (t) => {
  const app = Fastify()
  const mockLogger = createMockLogger()
  app.log = mockLogger

  app.env = {
    PLT_METRICS_PROMETHEUS_URL: 'http://localhost:9090'
  }

  await app.register(fp(async function (app) {
    app.decorate('store', {})
  }, { name: 'store' }))

  await app.register(metricsPlugin)

  assert.ok(app.scalerMetrics)

  await app.close()
})
