import { strictEqual } from 'node:assert'
import test from 'node:test'

import { LinkCost } from '../../../lib/service-grouping/link-cost'

test('new LinkCost', () => {
  const a = new LinkCost(1, 2)
  strictEqual(a.count, 1)
  strictEqual(a.average, 2)
})

test('LinkCost#from', () => {
  const b = LinkCost.from({
    count: 3,
    average: 4
  })
  strictEqual(b.count, 3)
  strictEqual(b.average, 4)
})

test('LinkCost#cost', () => {
  const c = new LinkCost(5, 6)
  strictEqual(c.cost, 30)
})

test('LinkCost#add', () => {
  const d = new LinkCost(7, 8)
  const e = new LinkCost(9, 10)
  const f = d.add(e)
  strictEqual(f.count, 16)
  strictEqual(f.average, 9.125)
})
