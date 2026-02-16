'use strict'

const assert = require('node:assert')
const { test } = require('node:test')
const {
  addInstance,
  terminateInstance,
  getClusterState,
  generatePodsTimeline,
  getPodsCountAt
} = require('../../../lib/load-predictor/instances')

function createMockStore (initialData = {}) {
  const data = {}
  for (const [appId, instances] of Object.entries(initialData)) {
    data[appId] = { ...instances }
  }

  const calls = {
    getInstance: [],
    setInstance: [],
    getAllInstances: [],
    deleteInstances: [],
    setLastInstanceStartTime: []
  }

  return {
    calls,
    data,
    async getInstance (appId, instanceId) {
      calls.getInstance.push({ appId, instanceId })
      const appData = data[appId] || {}
      return appData[instanceId] || null
    },
    async setInstance (appId, imageId, podId, instanceId, startTime, endTime) {
      calls.setInstance.push({ appId, imageId, podId, instanceId, startTime, endTime })
      if (!data[appId]) data[appId] = {}
      data[appId][instanceId] = { podId, startTime, endTime, imageId }
    },
    async setLastInstanceStartTime (appId, timestamp) {
      calls.setLastInstanceStartTime.push({ appId, timestamp })
    },
    async getAllInstances (appId) {
      calls.getAllInstances.push({ appId })
      return { ...(data[appId] || {}) }
    },
    async deleteInstances (appId, ids) {
      calls.deleteInstances.push({ appId, ids })
      if (data[appId]) {
        for (const id of ids) {
          delete data[appId][id]
        }
      }
    }
  }
}

test('addInstance', async (t) => {
  await t.test('should create new instance when not exists', async () => {
    const store = createMockStore()

    const result = await addInstance(store, 'add-new', 'img-v1', 'p0', 'i0', 1000)

    assert.strictEqual(store.calls.getAllInstances.length, 1)
    assert.strictEqual(store.calls.getAllInstances[0].appId, 'add-new')
    assert.strictEqual(store.calls.setInstance.length, 1)
    assert.deepStrictEqual(store.calls.setInstance[0], {
      appId: 'add-new',
      imageId: 'img-v1',
      podId: 'p0',
      instanceId: 'i0',
      startTime: 1000,
      endTime: 0
    })
    assert.deepStrictEqual(store.data['add-new'].i0, {
      podId: 'p0',
      startTime: 1000,
      endTime: 0,
      imageId: 'img-v1'
    })
    assert.deepStrictEqual(result, { isNewInstance: true, isNewPod: true })
  })

  await t.test('should skip reopening terminated instance when reconnect=false', async () => {
    const store = createMockStore({
      'late-batch-app': {
        i0: { podId: 'p0', startTime: 1000, endTime: 5000, imageId: 'img-v1' }
      }
    })

    // reconnect=false prevents reopening (used by saveInstanceMetrics for late batches)
    const result = await addInstance(store, 'late-batch-app', 'img-v1', 'p0', 'i0', 6000, false)

    assert.strictEqual(store.calls.getAllInstances.length, 1)
    assert.strictEqual(store.calls.setInstance.length, 0) // no setInstance call
    assert.deepStrictEqual(result, { isNewInstance: false, isNewPod: false })
  })

  await t.test('should reconnect terminated instance when reconnect=true (default)', async () => {
    const store = createMockStore({
      'reconnect-app': {
        i0: { podId: 'p0', startTime: 1000, endTime: 5000, imageId: 'img-v1' }
      }
    })

    // Default reconnect=true allows reopening (used by onConnect)
    const result = await addInstance(store, 'reconnect-app', 'img-v1', 'p1', 'i0', 6000)

    assert.strictEqual(store.calls.getAllInstances.length, 1)
    assert.strictEqual(store.calls.setInstance.length, 1)
    assert.deepStrictEqual(store.calls.setInstance[0], {
      appId: 'reconnect-app',
      imageId: 'img-v1',
      podId: 'p1',
      instanceId: 'i0',
      startTime: 1000,
      endTime: 0
    })
    assert.deepStrictEqual(result, { isNewInstance: false, isNewPod: false })
  })

  await t.test('should create new instance when reconnect=false and instance does not exist', async () => {
    const store = createMockStore()

    // reconnect=false still allows creating new instances
    const result = await addInstance(store, 'new-app', 'img-v1', 'p0', 'i0', 1000, false)

    assert.strictEqual(store.calls.setInstance.length, 1)
    assert.deepStrictEqual(result, { isNewInstance: true, isNewPod: true })
  })

  await t.test('should handle multiple instances', async () => {
    const store = createMockStore()

    await addInstance(store, 'multi-inst-app', 'img-v1', 'p0', 'i0', 1000)
    await addInstance(store, 'multi-inst-app', 'img-v1', 'p1', 'i1', 2000)
    await addInstance(store, 'multi-inst-app', 'img-v1', 'p2', 'i2', 3000)

    assert.strictEqual(Object.keys(store.data['multi-inst-app']).length, 3)
    assert.deepStrictEqual(store.data['multi-inst-app'].i0, { podId: 'p0', startTime: 1000, endTime: 0, imageId: 'img-v1' })
    assert.deepStrictEqual(store.data['multi-inst-app'].i1, { podId: 'p1', startTime: 2000, endTime: 0, imageId: 'img-v1' })
    assert.deepStrictEqual(store.data['multi-inst-app'].i2, { podId: 'p2', startTime: 3000, endTime: 0, imageId: 'img-v1' })
  })

  await t.test('should isolate instances across apps', async () => {
    const store = createMockStore()

    await addInstance(store, 'app-alpha', 'img-v1', 'p0', 'i0', 1000)
    await addInstance(store, 'app-beta', 'img-v1', 'p0', 'i0', 2000)

    // Same instanceId and podId in different apps should be independent
    assert.deepStrictEqual(store.data['app-alpha'].i0, { podId: 'p0', startTime: 1000, endTime: 0, imageId: 'img-v1' })
    assert.deepStrictEqual(store.data['app-beta'].i0, { podId: 'p0', startTime: 2000, endTime: 0, imageId: 'img-v1' })
  })

  await t.test('should detect isNewPod independently per app', async () => {
    const store = createMockStore({
      'app-x': {
        i0: { podId: 'p0', startTime: 1000, endTime: 0, imageId: 'img-v1' }
      }
    })

    // Adding same podId in app-x should not be a new pod
    const result1 = await addInstance(store, 'app-x', 'img-v1', 'p0', 'i1', 2000)
    assert.strictEqual(result1.isNewPod, false)

    // Adding same podId in app-y should be a new pod (independent)
    const result2 = await addInstance(store, 'app-y', 'img-v1', 'p0', 'i2', 3000)
    assert.strictEqual(result2.isNewPod, true)
  })
})

test('terminateInstance', async (t) => {
  await t.test('should set endTime when instance exists and is open', async () => {
    const store = createMockStore({
      'term-app': {
        i0: { podId: 'p0', startTime: 1000, endTime: 0, imageId: 'img-v1' }
      }
    })

    await terminateInstance(store, 'term-app', 'i0', 5000, 10000)

    assert.strictEqual(store.calls.setInstance.length, 1)
    assert.deepStrictEqual(store.calls.setInstance[0], {
      appId: 'term-app',
      imageId: 'img-v1',
      podId: 'p0',
      instanceId: 'i0',
      startTime: 1000,
      endTime: 15000 // timestamp + deadTimeout
    })
  })

  await t.test('should not update if instance not found', async () => {
    const store = createMockStore()

    await terminateInstance(store, 'term-missing', 'i0', 5000, 10000)

    assert.strictEqual(store.calls.getInstance.length, 1)
    assert.strictEqual(store.calls.getInstance[0].appId, 'term-missing')
    assert.strictEqual(store.calls.setInstance.length, 0)
  })

  await t.test('should not update if instance already closed', async () => {
    const store = createMockStore({
      'term-closed': {
        i0: { podId: 'p0', startTime: 1000, endTime: 5000, imageId: 'img-v1' }
      }
    })

    await terminateInstance(store, 'term-closed', 'i0', 6000, 10000)

    assert.strictEqual(store.calls.getInstance.length, 1)
    assert.strictEqual(store.calls.setInstance.length, 0)
  })

  await t.test('should calculate correct endTime with different deadTimeouts', async () => {
    const store = createMockStore({
      'term-timeout': {
        i0: { podId: 'p0', startTime: 1000, endTime: 0, imageId: 'img-v1' }
      }
    })

    await terminateInstance(store, 'term-timeout', 'i0', 5000, 30000)

    assert.strictEqual(store.calls.setInstance[0].endTime, 35000)
  })

  await t.test('should terminate only the target app instance', async () => {
    const store = createMockStore({
      'app-a': {
        i0: { podId: 'p0', startTime: 1000, endTime: 0, imageId: 'img-v1' }
      },
      'app-b': {
        i0: { podId: 'p0', startTime: 2000, endTime: 0, imageId: 'img-v1' }
      }
    })

    await terminateInstance(store, 'app-a', 'i0', 5000, 10000)

    // app-a instance should be terminated
    assert.deepStrictEqual(store.data['app-a'].i0, {
      podId: 'p0',
      startTime: 1000,
      endTime: 15000,
      imageId: 'img-v1'
    })
    // app-b instance should be untouched
    assert.deepStrictEqual(store.data['app-b'].i0, {
      podId: 'p0',
      startTime: 2000,
      endTime: 0,
      imageId: 'img-v1'
    })
  })
})

test('generatePodsTimeline', async (t) => {
  await t.test('should return empty history for no pods', () => {
    const history = generatePodsTimeline({})
    assert.deepStrictEqual(history, [])
  })

  // This test catches the bug where pods with old start but recent end
  // were incorrectly handled due to independent cleanup of start vs end
  await t.test('should handle long-running pod with old start but recent end', () => {
    // Pod started 200 seconds ago but is still active (end is 0)
    // end = 0 means still alive, end > 0 means dead at that time
    const pods = { p0: { startTime: 0, endTime: 210000 } } // died at 210000

    const history = generatePodsTimeline(pods)

    // Pod should be counted from start (0)
    assert.strictEqual(history.length, 2)
    assert.deepStrictEqual(history[0], { timestamp: 0, count: 1 }) // birth at start
    assert.deepStrictEqual(history[1], { timestamp: 210000, count: 0 }) // death at end

    // Verify count at various timestamps
    assert.strictEqual(getPodsCountAt(0, history), 1)
    assert.strictEqual(getPodsCountAt(100000, history), 1) // still alive
    assert.strictEqual(getPodsCountAt(200000, history), 1) // still alive
    assert.strictEqual(getPodsCountAt(209999, history), 1) // still alive
    assert.strictEqual(getPodsCountAt(210000, history), 0) // dead
  })

  // This test verifies the exact scenario that was failing:
  // Pod 0 started 200s ago (beyond old cleanup cutoff), pods 2,3,4 started later
  // All pods are still active. Pod 0 should still be counted.
  await t.test('should count all active pods including long-running ones', () => {
    const now = 200000
    const deadTimeout = 10000
    const pods = {
      p0: { startTime: 0, endTime: now + deadTimeout }, // started 200s ago
      p2: { startTime: 130000, endTime: now + deadTimeout }, // started 70s ago
      p3: { startTime: 120000, endTime: now + deadTimeout }, // started 80s ago
      p4: { startTime: 105000, endTime: now + deadTimeout } // started 95s ago
    }

    const history = generatePodsTimeline(pods)

    // At timestamp 200000 (now), all 4 pods should be alive
    assert.strictEqual(getPodsCountAt(now, history), 4)

    // At timestamp 50000, only p0 should be alive
    assert.strictEqual(getPodsCountAt(50000, history), 1)

    // At timestamp 110000, p0 and p4 should be alive
    assert.strictEqual(getPodsCountAt(110000, history), 2)

    // At timestamp 125000, p0, p4, p3 should be alive
    assert.strictEqual(getPodsCountAt(125000, history), 3)
  })

  await t.test('should handle single pod lifecycle', () => {
    // Pod started at 1000, end = 5000 + 30000 = 35000
    const pods = { p1: { startTime: 1000, endTime: 35000 } }

    const history = generatePodsTimeline(pods)

    assert.strictEqual(history.length, 2)
    assert.deepStrictEqual(history[0], { timestamp: 1000, count: 1 })
    assert.deepStrictEqual(history[1], { timestamp: 35000, count: 0 })
  })

  await t.test('should handle multiple pods starting at different times', () => {
    // p1: start=1000, end=5000+30000=35000
    // p2: start=2000, end=5000+30000=35000
    const pods = {
      p1: { startTime: 1000, endTime: 35000 },
      p2: { startTime: 2000, endTime: 35000 }
    }

    const history = generatePodsTimeline(pods)

    assert.strictEqual(history.length, 4)
    assert.deepStrictEqual(history[0], { timestamp: 1000, count: 1 })
    assert.deepStrictEqual(history[1], { timestamp: 2000, count: 2 })
    assert.deepStrictEqual(history[2], { timestamp: 35000, count: 1 })
    assert.deepStrictEqual(history[3], { timestamp: 35000, count: 0 })
  })

  await t.test('should handle pod dying before another starts', () => {
    // p1: start=1000, end=10000+30000=40000
    // p2: start=50000, end=60000+30000=90000
    const pods = {
      p1: { startTime: 1000, endTime: 40000 },
      p2: { startTime: 50000, endTime: 90000 }
    }

    const history = generatePodsTimeline(pods)

    // p1 starts at 1000, dies at 40000
    // p2 starts at 50000, dies at 90000
    assert.strictEqual(history.length, 4)
    assert.deepStrictEqual(history[0], { timestamp: 1000, count: 1 })
    assert.deepStrictEqual(history[1], { timestamp: 40000, count: 0 })
    assert.deepStrictEqual(history[2], { timestamp: 50000, count: 1 })
    assert.deepStrictEqual(history[3], { timestamp: 90000, count: 0 })
  })

  await t.test('should handle birth before death at same timestamp', () => {
    // p1: start=1000, end=1000+30000=31000
    // p2: start=31000, end=50000+30000=80000
    const pods = {
      p1: { startTime: 1000, endTime: 31000 }, // p1 dies at 31000
      p2: { startTime: 31000, endTime: 80000 } // p2 starts when p1 dies
    }

    const history = generatePodsTimeline(pods)

    // At timestamp 31000: p2 birth (+1) should come before p1 death (-1)
    // So count goes 1 -> 2 -> 1, not 1 -> 0 -> 1
    const at31000 = history.filter(h => h.timestamp === 31000)
    assert.strictEqual(at31000.length, 2)
    assert.strictEqual(at31000[0].count, 2) // birth first
    assert.strictEqual(at31000[1].count, 1) // then death
  })

  await t.test('should handle overlapping pod lifetimes', () => {
    // p1: start=1000, end=10000+10000=20000
    // p2: start=2000, end=15000+10000=25000
    // p3: start=3000, end=20000+10000=30000
    const pods = {
      p1: { startTime: 1000, endTime: 20000 },
      p2: { startTime: 2000, endTime: 25000 },
      p3: { startTime: 3000, endTime: 30000 }
    }

    const history = generatePodsTimeline(pods)

    // p1: 1000-20000, p2: 2000-25000, p3: 3000-30000
    assert.strictEqual(history[0].timestamp, 1000)
    assert.strictEqual(history[0].count, 1)

    assert.strictEqual(history[1].timestamp, 2000)
    assert.strictEqual(history[1].count, 2)

    assert.strictEqual(history[2].timestamp, 3000)
    assert.strictEqual(history[2].count, 3)

    assert.strictEqual(history[3].timestamp, 20000)
    assert.strictEqual(history[3].count, 2)

    assert.strictEqual(history[4].timestamp, 25000)
    assert.strictEqual(history[4].count, 1)

    assert.strictEqual(history[5].timestamp, 30000)
    assert.strictEqual(history[5].count, 0)
  })

  await t.test('should handle pods that are still alive (end = 0)', () => {
    const pods = {
      p1: { startTime: 1000, endTime: 0 }, // still alive
      p2: { startTime: 2000, endTime: 0 } // still alive
    }

    const history = generatePodsTimeline(pods)

    // No death events since end = 0
    assert.strictEqual(history.length, 2)
    assert.deepStrictEqual(history[0], { timestamp: 1000, count: 1 })
    assert.deepStrictEqual(history[1], { timestamp: 2000, count: 2 })

    // Pods should be counted as alive at any timestamp after start
    assert.strictEqual(getPodsCountAt(5000, history), 2)
    assert.strictEqual(getPodsCountAt(1000000, history), 2)
  })
})

test('getPodsCountAt', async (t) => {
  await t.test('should return 0 for empty history', () => {
    const count = getPodsCountAt(5000, [])
    assert.strictEqual(count, 0)
  })

  await t.test('should return 0 for timestamp before first event', () => {
    const history = [
      { timestamp: 1000, count: 1 },
      { timestamp: 2000, count: 2 }
    ]
    const count = getPodsCountAt(500, history)
    assert.strictEqual(count, 0)
  })

  await t.test('should return count at exact timestamp', () => {
    const history = [
      { timestamp: 1000, count: 1 },
      { timestamp: 2000, count: 2 },
      { timestamp: 3000, count: 1 }
    ]

    assert.strictEqual(getPodsCountAt(1000, history), 1)
    assert.strictEqual(getPodsCountAt(2000, history), 2)
    assert.strictEqual(getPodsCountAt(3000, history), 1)
  })

  await t.test('should return count at timestamp between events', () => {
    const history = [
      { timestamp: 1000, count: 1 },
      { timestamp: 2000, count: 2 },
      { timestamp: 5000, count: 1 }
    ]

    assert.strictEqual(getPodsCountAt(1500, history), 1)
    assert.strictEqual(getPodsCountAt(3000, history), 2)
    assert.strictEqual(getPodsCountAt(4999, history), 2)
  })

  await t.test('should return last count for timestamp after all events', () => {
    const history = [
      { timestamp: 1000, count: 1 },
      { timestamp: 2000, count: 2 },
      { timestamp: 3000, count: 0 }
    ]

    assert.strictEqual(getPodsCountAt(5000, history), 0)
    assert.strictEqual(getPodsCountAt(100000, history), 0)
  })

  await t.test('should handle multiple events at same timestamp', () => {
    const history = [
      { timestamp: 1000, count: 1 },
      { timestamp: 2000, count: 2 },
      { timestamp: 2000, count: 1 } // death right after birth
    ]

    // At timestamp 2000, we should get the last count (1)
    assert.strictEqual(getPodsCountAt(2000, history), 1)
  })
})

test('getClusterState', async (t) => {
  await t.test('should return empty when no instances', async () => {
    const store = createMockStore()

    const result = await getClusterState(store, 'empty-app', 10000, 5000, 30000)

    assert.deepStrictEqual(result.instances, {})
    assert.deepStrictEqual(result.pods, {})
    assert.strictEqual(result.imageId, null)
    assert.strictEqual(result.isRedeploying, true)
  })

  await t.test('should return instances for single image', async () => {
    const store = createMockStore({
      'img-app': {
        i0: { podId: 'p0', startTime: 1000, endTime: 0, imageId: 'img-v1' },
        i1: { podId: 'p1', startTime: 2000, endTime: 0, imageId: 'img-v1' }
      }
    })

    const result = await getClusterState(store, 'img-app', 10000, 20000, 30000)

    assert.strictEqual(Object.keys(result.instances).length, 2)
    assert.strictEqual(Object.keys(result.pods).length, 2)
    assert.strictEqual(result.imageId, 'img-v1')
    assert.strictEqual(result.isRedeploying, false)
  })

  await t.test('should select oldest image during redeploy', async () => {
    const now = 5000
    const store = createMockStore({
      'img-app': {
        i0: { podId: 'p0', startTime: 1000, endTime: 0, imageId: 'img-v1' },
        i1: { podId: 'p1', startTime: 3000, endTime: 0, imageId: 'img-v2' }
      }
    })

    // img-v2 started at 3000, now is 5000, redeployTimeoutMs is 30000
    // So (5000 - 3000) = 2000 < 30000 → isRedeploying = true → use oldest
    const result = await getClusterState(store, 'img-app', now, 20000, 30000)

    assert.strictEqual(result.imageId, 'img-v1')
    assert.strictEqual(result.isRedeploying, true)
    assert.strictEqual(Object.keys(result.instances).length, 1)
    assert.ok(result.instances.i0)
  })

  await t.test('should select newest image after redeploy timeout', async () => {
    const now = 50000
    const store = createMockStore({
      'img-app': {
        i0: { podId: 'p0', startTime: 1000, endTime: 0, imageId: 'img-v1' },
        i1: { podId: 'p1', startTime: 3000, endTime: 0, imageId: 'img-v2' }
      }
    })

    // img-v2 started at 3000, now is 50000, redeployTimeoutMs is 30000
    // So (50000 - 3000) = 47000 > 30000 → isRedeploying = false → use newest
    const result = await getClusterState(store, 'img-app', now, 60000, 30000)

    assert.strictEqual(result.imageId, 'img-v2')
    assert.strictEqual(result.isRedeploying, false)
    assert.strictEqual(Object.keys(result.instances).length, 1)
    assert.ok(result.instances.i1)
  })

  await t.test('should filter expired instances', async () => {
    const now = 20000
    const windowMs = 5000

    const store = createMockStore({
      'expire-img-app': {
        i0: { podId: 'p0', startTime: 1000, endTime: 10000, imageId: 'img-v1' }, // expired
        i1: { podId: 'p1', startTime: 2000, endTime: 0, imageId: 'img-v1' } // alive
      }
    })

    const result = await getClusterState(store, 'expire-img-app', now, windowMs, 30000)

    assert.strictEqual(Object.keys(result.instances).length, 1)
    assert.ok(result.instances.i1)
    assert.deepStrictEqual(store.calls.deleteInstances[0].ids, ['i0'])
  })

  await t.test('should aggregate pods correctly', async () => {
    const store = createMockStore({
      'agg-img-app': {
        i0: { podId: 'p0', startTime: 1000, endTime: 5000, imageId: 'img-v1' },
        i1: { podId: 'p0', startTime: 6000, endTime: 0, imageId: 'img-v1' }
      }
    })

    const result = await getClusterState(store, 'agg-img-app', 10000, 20000, 30000)

    // Pod should be aggregated: min startTime, endTime = 0 (because one is alive)
    assert.deepStrictEqual(result.pods.p0, {
      startTime: 1000,
      endTime: 0
    })
  })

  await t.test('should use MIN startTime across instances for image', async () => {
    const store = createMockStore({
      'min-start-app': {
        i0: { podId: 'p0', startTime: 5000, endTime: 0, imageId: 'img-v1' },
        i1: { podId: 'p1', startTime: 2000, endTime: 0, imageId: 'img-v1' }, // earlier
        i2: { podId: 'p2', startTime: 8000, endTime: 0, imageId: 'img-v2' }
      }
    })

    // img-v1 has MIN startTime 2000, img-v2 has startTime 8000
    // now=10000, redeployTimeout=5000 → (10000-8000)=2000 < 5000 → redeploying
    // Should use oldest (img-v1)
    const result = await getClusterState(store, 'min-start-app', 10000, 20000, 5000)

    assert.strictEqual(result.imageId, 'img-v1')
    assert.strictEqual(result.isRedeploying, true)
  })

  await t.test('should expire stale instances (no metrics reported)', async () => {
    const now = 20000
    const windowMs = 5000

    const store = createMockStore({
      'stale-app': {
        i0: { podId: 'p0', startTime: 1000, endTime: 0, lastSeen: 10000, imageId: 'img-v1' }, // stale
        i1: { podId: 'p1', startTime: 2000, endTime: 0, lastSeen: 18000, imageId: 'img-v1' } // recent
      }
    })

    const result = await getClusterState(store, 'stale-app', now, windowMs, 30000)

    assert.strictEqual(Object.keys(result.instances).length, 1)
    assert.ok(result.instances.i1)
    assert.deepStrictEqual(store.calls.deleteInstances[0].ids, ['i0'])
  })

  await t.test('should handle three or more images', async () => {
    const now = 100000
    const store = createMockStore({
      'multi-img-app': {
        i0: { podId: 'p0', startTime: 1000, endTime: 0, imageId: 'img-v1' },
        i1: { podId: 'p1', startTime: 5000, endTime: 0, imageId: 'img-v2' },
        i2: { podId: 'p2', startTime: 9000, endTime: 0, imageId: 'img-v3' }
      }
    })

    // All images are old (now - newest startTime > redeployTimeout)
    // Should select newest (img-v3)
    const result = await getClusterState(store, 'multi-img-app', now, 200000, 30000)

    assert.strictEqual(result.imageId, 'img-v3')
    assert.strictEqual(result.isRedeploying, false)
    assert.strictEqual(Object.keys(result.instances).length, 1)
    assert.ok(result.instances.i2)
  })

  await t.test('should ignore images with only expired instances', async () => {
    const now = 20000
    const windowMs = 5000

    const store = createMockStore({
      'expired-img-app': {
        i0: { podId: 'p0', startTime: 1000, endTime: 10000, imageId: 'img-v1' }, // expired
        i1: { podId: 'p1', startTime: 5000, endTime: 0, imageId: 'img-v2' } // alive
      }
    })

    // img-v1 is oldest but all its instances are expired
    // Should select img-v2 as the only running image
    const result = await getClusterState(store, 'expired-img-app', now, windowMs, 30000)

    assert.strictEqual(result.imageId, 'img-v2')
    assert.strictEqual(result.isRedeploying, false)
    assert.strictEqual(Object.keys(result.instances).length, 1)
  })

  await t.test('should handle pods with terminated endTime correctly', async () => {
    const store = createMockStore({
      'term-pod-app': {
        i0: { podId: 'p0', startTime: 1000, endTime: 5000, imageId: 'img-v1' },
        i1: { podId: 'p0', startTime: 6000, endTime: 8000, imageId: 'img-v1' }
      }
    })

    const result = await getClusterState(store, 'term-pod-app', 10000, 20000, 30000)

    // Both instances terminated, pod should have max endTime
    assert.deepStrictEqual(result.pods.p0, {
      startTime: 1000,
      endTime: 8000
    })
  })

  await t.test('should handle multiple pods per image', async () => {
    const store = createMockStore({
      'multi-pod-app': {
        i0: { podId: 'p0', startTime: 1000, endTime: 0, imageId: 'img-v1' },
        i1: { podId: 'p1', startTime: 2000, endTime: 0, imageId: 'img-v1' },
        i2: { podId: 'p2', startTime: 3000, endTime: 0, imageId: 'img-v1' }
      }
    })

    const result = await getClusterState(store, 'multi-pod-app', 10000, 20000, 30000)

    assert.strictEqual(Object.keys(result.pods).length, 3)
    assert.ok(result.pods.p0)
    assert.ok(result.pods.p1)
    assert.ok(result.pods.p2)
  })
})
