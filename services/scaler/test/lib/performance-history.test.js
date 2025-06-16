'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { randomUUID } = require('node:crypto')
const { buildServer } = require('../helper')
const PerformanceHistory = require('../../lib/performance-history')

function createMockLog () {
  const logs = []
  return {
    debug: (data, msg) => logs.push({ level: 'debug', data, msg }),
    info: (data, msg) => logs.push({ level: 'info', data, msg }),
    warn: (data, msg) => logs.push({ level: 'warn', data, msg }),
    error: (data, msg) => logs.push({ level: 'error', data, msg }),
    getLogs: () => logs
  }
}

test('should save a new performance history event', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)

  const applicationId = randomUUID()
  const event = {
    timestamp: Date.now(),
    podsAdded: 2,
    preEluMean: 0.85,
    preHeapMean: 0.80,
    preEluTrend: 0.05,
    preHeapTrend: 0.03,
    deltaElu: -0.15,
    deltaHeap: -0.10,
    sigmaElu: 0.02,
    sigmaHeap: 0.01,
    successScore: 0.82
  }

  await performanceHistory.saveEvent(applicationId, event)

  const records = await server.platformatic.entities.performanceHistory.find({
    where: { applicationId: { eq: applicationId } }
  })

  assert.strictEqual(records.length, 1)
  assert.strictEqual(records[0].applicationId, applicationId)
  assert.strictEqual(records[0].podsAdded, 2)
  assert.strictEqual(records[0].preEluMean, 0.85)
  assert.strictEqual(records[0].preHeapMean, 0.80)
  assert.strictEqual(records[0].deltaElu, -0.15)
  assert.strictEqual(records[0].deltaHeap, -0.10)
  assert.strictEqual(records[0].successScore, 0.82)
})

test('should update existing performance history event', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)

  const applicationId = randomUUID()
  const timestamp = Date.now()
  const event = {
    timestamp,
    podsAdded: 2,
    preEluMean: 0.85,
    preHeapMean: 0.80,
    preEluTrend: 0.05,
    preHeapTrend: 0.03,
    deltaElu: 0,
    deltaHeap: 0,
    sigmaElu: 0,
    sigmaHeap: 0
  }

  await performanceHistory.saveEvent(applicationId, event)

  const updatedEvent = {
    ...event,
    deltaElu: -0.15,
    deltaHeap: -0.10,
    sigmaElu: 0.02,
    sigmaHeap: 0.01
  }

  await performanceHistory.saveEvent(applicationId, updatedEvent)

  const records = await server.platformatic.entities.performanceHistory.find({
    where: { applicationId: { eq: applicationId } }
  })

  assert.strictEqual(records.length, 1)
  assert.strictEqual(records[0].deltaElu, -0.15)
  assert.strictEqual(records[0].deltaHeap, -0.10)
  assert.strictEqual(records[0].sigmaElu, 0.02)
  assert.strictEqual(records[0].sigmaHeap, 0.01)
  assert.ok(records[0].updatedAt)
})

test('should default successScore to 0 when not provided', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)

  const applicationId = randomUUID()
  const event = {
    timestamp: Date.now(),
    podsAdded: 1,
    preEluMean: 0.75,
    preHeapMean: 0.70,
    preEluTrend: 0.02,
    preHeapTrend: 0.01,
    deltaElu: -0.05,
    deltaHeap: -0.03,
    sigmaElu: 0.01,
    sigmaHeap: 0.005
  }

  await performanceHistory.saveEvent(applicationId, event)

  const records = await server.platformatic.entities.performanceHistory.find({
    where: { applicationId: { eq: applicationId } }
  })

  assert.strictEqual(records.length, 1)
  assert.strictEqual(records[0].podsAdded, 1)
  assert.strictEqual(records[0].successScore, 0)
})

test('should log debug messages when saving and updating', async (t) => {
  const log = createMockLog()
  const server = await buildServer(t)

  const mockApp = {
    platformatic: server.platformatic,
    log
  }

  const performanceHistory = new PerformanceHistory(mockApp)

  const applicationId = randomUUID()
  const timestamp = Date.now()
  const event = {
    timestamp,
    podsAdded: 3,
    preEluMean: 0.90,
    preHeapMean: 0.85,
    preEluTrend: 0.08,
    preHeapTrend: 0.05,
    deltaElu: -0.20,
    deltaHeap: -0.15,
    sigmaElu: 0.03,
    sigmaHeap: 0.02
  }

  await performanceHistory.saveEvent(applicationId, event)

  const updatedEvent = { ...event, deltaElu: -0.25 }
  await performanceHistory.saveEvent(applicationId, updatedEvent)

  const logs = log.getLogs()

  const debugLogs = logs.filter(l => l.level === 'debug')
  assert.ok(debugLogs.length >= 2)

  const saveLog = debugLogs.find(l => l.msg.includes('Saved new performance history'))
  const updateLog = debugLogs.find(l => l.msg.includes('Updated existing performance history'))

  assert.ok(saveLog, 'Should log when saving new record')
  assert.ok(updateLog, 'Should log when updating existing record')
  assert.strictEqual(saveLog.data.applicationId, applicationId)
  assert.strictEqual(updateLog.data.applicationId, applicationId)
})

test('should get performance history with no filters', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)

  const applicationId = randomUUID()
  const now = Date.now()

  const events = [
    {
      timestamp: now - 3600000,
      podsAdded: 2,
      preEluMean: 0.80,
      preHeapMean: 0.75,
      preEluTrend: 0.04,
      preHeapTrend: 0.02,
      deltaElu: -0.10,
      deltaHeap: -0.08,
      sigmaElu: 0.015,
      sigmaHeap: 0.010
    },
    {
      timestamp: now - 7200000, // 2 hours ago
      podsAdded: 1,
      preEluMean: 0.70,
      preHeapMean: 0.65,
      preEluTrend: 0.02,
      preHeapTrend: 0.01,
      deltaElu: -0.05,
      deltaHeap: -0.03,
      sigmaElu: 0.010,
      sigmaHeap: 0.005
    }
  ]

  for (const event of events) {
    await performanceHistory.saveEvent(applicationId, event)
  }

  const records = await performanceHistory.getPerformanceHistory()

  assert.ok(records.length >= 2)
  assert.ok(records[0].eventTimestamp >= records[1].eventTimestamp)
})

test('should get performance history filtered by applicationId', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)

  const app1 = randomUUID()
  const app2 = randomUUID()
  const now = Date.now()

  await performanceHistory.saveEvent(app1, {
    timestamp: now,
    podsAdded: 2,
    preEluMean: 0.80,
    preHeapMean: 0.75,
    preEluTrend: 0.04,
    preHeapTrend: 0.02,
    deltaElu: -0.10,
    deltaHeap: -0.08,
    sigmaElu: 0.015,
    sigmaHeap: 0.010
  })

  await performanceHistory.saveEvent(app2, {
    timestamp: now - 1000,
    podsAdded: 1,
    preEluMean: 0.70,
    preHeapMean: 0.65,
    preEluTrend: 0.02,
    preHeapTrend: 0.01,
    deltaElu: -0.05,
    deltaHeap: -0.03,
    sigmaElu: 0.010,
    sigmaHeap: 0.005
  })

  const records = await performanceHistory.getPerformanceHistory({ applicationId: app1 })

  assert.strictEqual(records.length, 1)
  assert.strictEqual(records[0].applicationId, app1)
  assert.strictEqual(records[0].podsAdded, 2)
})

test('should get performance history filtered by date range', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)

  const applicationId = randomUUID()
  const now = new Date()
  const twoHoursAgo = new Date(now.getTime() - 7200000)
  const oneHourAgo = new Date(now.getTime() - 3600000)
  const thirtyMinutesAgo = new Date(now.getTime() - 1800000)

  const events = [
    { timestamp: twoHoursAgo.getTime(), podsAdded: 1 },
    { timestamp: oneHourAgo.getTime(), podsAdded: 2 },
    { timestamp: thirtyMinutesAgo.getTime(), podsAdded: 3 }
  ]

  for (const event of events) {
    await performanceHistory.saveEvent(applicationId, {
      ...event,
      preEluMean: 0.80,
      preHeapMean: 0.75,
      preEluTrend: 0.04,
      preHeapTrend: 0.02,
      deltaElu: -0.10,
      deltaHeap: -0.08,
      sigmaElu: 0.015,
      sigmaHeap: 0.010
    })
  }

  const recentRecords = await performanceHistory.getPerformanceHistory({
    applicationId,
    startDate: new Date(now.getTime() - 3900000)
  })

  assert.strictEqual(recentRecords.length, 2)
  assert.ok(recentRecords.some(r => r.podsAdded === 2))
  assert.ok(recentRecords.some(r => r.podsAdded === 3))

  const olderRecords = await performanceHistory.getPerformanceHistory({
    applicationId,
    endDate: new Date(now.getTime() - 5400000)
  })

  assert.strictEqual(olderRecords.length, 1)
  assert.strictEqual(olderRecords[0].podsAdded, 1)
})

test('should respect limit parameter', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)

  const applicationId = randomUUID()
  const now = Date.now()

  for (let i = 0; i < 5; i++) {
    await performanceHistory.saveEvent(applicationId, {
      timestamp: now - (i * 1000),
      podsAdded: i + 1,
      preEluMean: 0.80,
      preHeapMean: 0.75,
      preEluTrend: 0.04,
      preHeapTrend: 0.02,
      deltaElu: -0.10,
      deltaHeap: -0.08,
      sigmaElu: 0.015,
      sigmaHeap: 0.010
    })
  }

  const limitedRecords = await performanceHistory.getPerformanceHistory({
    applicationId,
    limit: 3
  })

  assert.strictEqual(limitedRecords.length, 3)
})

test('should handle database errors gracefully when saving', async () => {
  const mockApp = {
    platformatic: {
      entities: {
        performanceHistory: {
          find: async () => { throw new Error('Database connection failed') },
          save: async () => { throw new Error('Database save failed') }
        }
      }
    },
    log: createMockLog()
  }

  const performanceHistory = new PerformanceHistory(mockApp)

  const applicationId = randomUUID()
  const event = {
    timestamp: Date.now(),
    podsAdded: 1,
    preEluMean: 0.75,
    preHeapMean: 0.70,
    preEluTrend: 0.02,
    preHeapTrend: 0.01,
    deltaElu: -0.05,
    deltaHeap: -0.03,
    sigmaElu: 0.01,
    sigmaHeap: 0.005
  }

  await assert.rejects(async () => {
    await performanceHistory.saveEvent(applicationId, event)
  }, /Database connection failed/)
})

test('should handle database errors gracefully when querying', async () => {
  // Create a mock app that will cause database errors
  const mockApp = {
    platformatic: {
      entities: {
        performanceHistory: {
          find: async () => { throw new Error('Database query failed') }
        }
      }
    },
    log: createMockLog()
  }

  const performanceHistory = new PerformanceHistory(mockApp)

  // Should throw the database error
  await assert.rejects(async () => {
    await performanceHistory.getPerformanceHistory({ applicationId: randomUUID() })
  }, /Database query failed/)
})

test('should get performance history with successScore from database', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)

  const applicationId = randomUUID()
  const now = Date.now()

  const events = [
    {
      timestamp: now - 3600000,
      podsAdded: 2,
      preEluMean: 0.85,
      preHeapMean: 0.80,
      preEluTrend: 0.05,
      preHeapTrend: 0.03,
      deltaElu: -0.15,
      deltaHeap: -0.10,
      sigmaElu: 0.02,
      sigmaHeap: 0.01,
      successScore: 0.75
    },
    {
      timestamp: now - 7200000,
      podsAdded: 1,
      preEluMean: 0.70,
      preHeapMean: 0.65,
      preEluTrend: 0.02,
      preHeapTrend: 0.01,
      deltaElu: -0.05,
      deltaHeap: -0.03,
      sigmaElu: 0.01,
      sigmaHeap: 0.005,
      successScore: 0.65
    }
  ]

  for (const event of events) {
    await performanceHistory.saveEvent(applicationId, event)
  }

  const records = await performanceHistory.getPerformanceHistory({
    applicationId,
    limit: 50
  })

  assert.strictEqual(records.length, 2)

  const firstEvent = records[0]
  assert.strictEqual(firstEvent.podsAdded, 2)
  assert.strictEqual(firstEvent.preEluMean, 0.85)
  assert.strictEqual(firstEvent.preHeapMean, 0.80)
  assert.strictEqual(firstEvent.deltaElu, -0.15)
  assert.strictEqual(firstEvent.deltaHeap, -0.10)
  assert.strictEqual(firstEvent.successScore, 0.75)
  assert.ok(firstEvent.eventTimestamp instanceof Date)

  const secondEvent = records[1]
  assert.strictEqual(secondEvent.podsAdded, 1)
  assert.strictEqual(secondEvent.preEluMean, 0.70)
  assert.strictEqual(secondEvent.successScore, 0.65)
})

test('should return database records with proper date objects', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)

  const applicationId = randomUUID()
  const now = Date.now()

  for (let i = 0; i < 5; i++) {
    await performanceHistory.saveEvent(applicationId, {
      timestamp: now - (i * 1000),
      podsAdded: i + 1,
      preEluMean: 0.80,
      preHeapMean: 0.75,
      preEluTrend: 0.04,
      preHeapTrend: 0.02,
      deltaElu: -0.10,
      deltaHeap: -0.08,
      sigmaElu: 0.015,
      sigmaHeap: 0.010
    })
  }

  const records = await performanceHistory.getPerformanceHistory({
    applicationId,
    limit: 3
  })

  assert.strictEqual(records.length, 3)
  assert.ok(records.every(record => record.eventTimestamp instanceof Date))
})

test('should save events with correct source values', async (t) => {
  const server = await buildServer(t)
  const performanceHistory = new PerformanceHistory(server)
  const applicationId = randomUUID()

  const baseEvent = {
    timestamp: Date.now(),
    podsAdded: 2,
    preEluMean: 0.85,
    preHeapMean: 0.80,
    preEluTrend: 0.05,
    preHeapTrend: 0.03,
    deltaElu: -0.15,
    deltaHeap: -0.10,
    sigmaElu: 0.02,
    sigmaHeap: 0.01
  }

  await performanceHistory.saveEvent(applicationId, baseEvent, 'signal')
  await performanceHistory.saveEvent(applicationId, { ...baseEvent, timestamp: baseEvent.timestamp + 1000 }, 'prediction')
  await performanceHistory.saveEvent(applicationId, { ...baseEvent, timestamp: baseEvent.timestamp + 2000 })

  const records = await server.platformatic.entities.performanceHistory.find({
    where: { applicationId: { eq: applicationId } },
    orderBy: [{ field: 'eventTimestamp', direction: 'ASC' }]
  })

  assert.strictEqual(records.length, 3)
  assert.strictEqual(records[0].source, 'signal')
  assert.strictEqual(records[1].source, 'prediction')
  assert.strictEqual(records[2].source, 'signal')
})
