// import { describe, test, expect } from 'vitest'
import { describe, test } from 'node:test'
import assert from 'node:assert'
import {
  getPodPerformances,
  RSS_BETWEEN_80_98,
  RSS_MORE_THAN_98,
  HEAP_LESS_THAN_20,
  HEAP_BETWEEN_20_70,
  HEAP_MORE_THAN_95,
  CPU_OVERUSED,
  ELU_TOO_HIGH
} from '../src/components/pods/performances.js'
import { UNKNOWN_PERFORMANCE, GOOD_PERFORMANCE, LOW_PERFORMANCE, GREAT_PERFORMANCE } from '../src/ui-constants.js'

describe('getPodPerformances', () => {
  test('no metrics passed', async () => {
    const { score, reasons } = getPodPerformances({})
    assert.deepEqual(score, UNKNOWN_PERFORMANCE)
    assert.deepEqual(reasons, [])
  })

  test('RSS metrics only, less than 20%', async () => {
    const { score, reasons } = getPodPerformances({
      rss: 15,
      podMemoryLimit: 100
    })
    assert.deepEqual(score, GREAT_PERFORMANCE)
    assert.deepEqual(reasons, [])
  })

  test('RSS metrics only, less than 50% but more than 20%', async () => {
    const { score, reasons } = getPodPerformances({
      rss: 45,
      podMemoryLimit: 100
    })
    assert.deepEqual(score, GREAT_PERFORMANCE)
    assert.deepEqual(reasons, [])
  })

  test('RSS metrics only, less than 80% but more than 50%', async () => {
    const { score, reasons } = getPodPerformances({
      rss: 75,
      podMemoryLimit: 100
    })
    assert.deepEqual(score, GREAT_PERFORMANCE)
    assert.deepEqual(reasons, [])
  })

  test('RSS metrics only, less than 98% but more than 80%', async () => {
    const { score, reasons } = getPodPerformances({
      rss: 95,
      podMemoryLimit: 100
    })
    assert.deepEqual(score, GOOD_PERFORMANCE)
    assert.deepEqual(reasons, [
      {
        podMemoryLimit: 100,
        rss: 95,
        message: RSS_BETWEEN_80_98
      }
    ]
    )
  })

  test('RSS metrics only, more than 98%', async () => {
    const { score, reasons } = getPodPerformances({
      rss: 99,
      podMemoryLimit: 100
    })
    assert.deepEqual(score, LOW_PERFORMANCE)
    assert.deepEqual(reasons, [
      {
        podMemoryLimit: 100,
        rss: 99,
        message: RSS_MORE_THAN_98
      }
    ]
    )
  })

  test('Heap metrics only, less than 20%', async () => {
    const { score, reasons } = getPodPerformances({
      usedHeap: 15,
      totalHeap: 100
    })
    assert.deepEqual(score, LOW_PERFORMANCE)
    assert.deepEqual(reasons, [
      {
        totalHeap: 100,
        usedHeap: 15,
        message: HEAP_LESS_THAN_20
      }
    ]
    )
  })

  test('Heap metrics only, less than 70% but more than 20%', async () => {
    const { score, reasons } = getPodPerformances({
      usedHeap: 45,
      totalHeap: 100
    })
    assert.deepEqual(score, GOOD_PERFORMANCE)
    assert.deepEqual(reasons, [
      {
        totalHeap: 100,
        usedHeap: 45,
        message: HEAP_BETWEEN_20_70
      }
    ]
    )
  })

  test('Heap metrics only, less than 90% but more than 70%', async () => {
    const { score, reasons } = getPodPerformances({
      usedHeap: 80,
      totalHeap: 100
    })
    assert.deepEqual(score, GREAT_PERFORMANCE)
    assert.deepEqual(reasons, [])
  })

  test('Heap metrics only, more than 90%', async () => {
    const { score, reasons } = getPodPerformances({
      usedHeap: 95.1,
      totalHeap: 100
    })
    assert.deepEqual(score, LOW_PERFORMANCE)
    assert.deepEqual(reasons, [
      {
        totalHeap: 100,
        usedHeap: 95.1,
        message: HEAP_MORE_THAN_95
      }
    ]
    )
  })

  test('CPU / Event Loop  metrics only, CPU overused with low event loop', async () => {
    const { score, reasons } = getPodPerformances({
      cpu: 130,
      eventLoop: 90
    })
    assert.deepEqual(score, LOW_PERFORMANCE)
    assert.deepEqual(reasons, [
      {
        cpu: 130,
        eventLoop: 90,
        message: CPU_OVERUSED
      }
    ]
    )
  })

  test('CPU / Event Loop  metrics only, CPU and Event loop normal', async () => {
    const { score, reasons } = getPodPerformances({
      cpu: 15,
      eventLoop: 10
    })
    assert.deepEqual(score, GREAT_PERFORMANCE)
    assert.deepEqual(reasons, [])
  })

  test('Bad RSS metrics, Great Heap metrics => overall is BAD', async () => {
    const { score, reasons } = getPodPerformances({
      rss: 99,
      podMemoryLimit: 100,
      usedHeap: 80,
      totalHeap: 100
    })
    assert.deepEqual(score, LOW_PERFORMANCE)
    assert.deepEqual(reasons, [
      {
        podMemoryLimit: 100,
        rss: 99,
        message: RSS_MORE_THAN_98
      }
    ]
    )
  })

  test('Event Loop metrics only, Event loop normal', async () => {
    const { score, reasons } = getPodPerformances({
      eventLoop: 2
    })
    assert.deepEqual(score, GREAT_PERFORMANCE)
    assert.deepEqual(reasons, [])
  })

  test('Event Loop metrics only, Event loop too high ', async () => {
    const { score, reasons } = getPodPerformances({
      eventLoop: 96
    })
    assert.deepEqual(score, LOW_PERFORMANCE)
    assert.deepEqual(reasons, [
      {
        eventLoop: 96,
        message: ELU_TOO_HIGH
      }
    ]
    )
  })
})
