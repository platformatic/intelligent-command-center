import { describe, test } from 'node:test'
import assert from 'node:assert'
import { groupTimeWindowStats } from '../src/components/application/autoscaler/v2/plannerUtils.js'

describe('groupTimeWindowStats', () => {
  test('history cell shows actualPods (not the unclamped pods), colored by category', () => {
    const stats = [
      // a history row: desired 12, but only 4 pods actually ran
      { id: 'h1', slotStart: '2026-01-01T05:00:00.000Z', pods: 12, actualPods: 4, category: 2 }
    ]
    const [day] = groupTimeWindowStats(stats)
    assert.equal(day.date, '01-01-2026')
    const cell = day.instances[0]
    assert.equal(cell.history.pods, 4, 'history shows the actual run count')
    assert.equal(cell.history.category, 2)
    assert.equal(cell.instances, 4, 'the displayed number is the actual count')
  })

  test('prediction rows are unaffected (predictedPods)', () => {
    const stats = [
      { id: 'p1', slotStart: '2026-01-01T06:00:00.000Z', predictedPods: 9, category: 4 }
    ]
    const [day] = groupTimeWindowStats(stats)
    assert.equal(day.instances[0].predictions.pods, 9)
  })
})
