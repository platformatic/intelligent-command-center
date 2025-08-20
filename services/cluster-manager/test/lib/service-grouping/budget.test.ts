import { deepStrictEqual, doesNotThrow, strictEqual, throws } from 'node:assert'
import test from 'node:test'

import { Budget } from '../../../lib/service-grouping/budget'

test('new Budget', () => {
  throws(() => new Budget(-1, 0, 0), /^BudgetMustBePositiveError/, 'min must be positive')
  throws(() => new Budget(0, 1, -1), /^BudgetMustBePositiveError/, 'used must be positive')
  throws(() => new Budget(1, 0, -1), /^BudgetMaxLessThanMinError/, 'max must be greater than min')

  const budget = new Budget(0, 1, 0)
  throws(() => budget.min = -1, /read only/, 'min is read-only')
  throws(() => budget.max = -1, /read only/, 'max is read-only')
  throws(() => budget.used = -1, /read only/, 'used is read-only')

  doesNotThrow(() => new Budget(0, 1, 2), 'over-budget is allowed')
})

test('Budget#allocated + Budget#available + Budget#isOverBudget', () => {
  const budget = new Budget(5, 10, 15)
  strictEqual(budget.allocated, 15, 'allocated is used')
  strictEqual(budget.available, -5, 'available is max - used')
  strictEqual(budget.isOverBudget, true, 'over-budget is true')
})

test('Budget#from', () => {
  deepStrictEqual(
    Budget.from({ min: 5, max: 10 }),
    new Budget(5, 10, 0)
  )
})

test('Budget#toJSON', () => {
  const budget = new Budget(5, 10, 15)
  deepStrictEqual(budget.toJSON(), {
    min: 5,
    max: 10,
    used: 15,
    allocated: 15,
    available: -5
  })
})

test('Budget#isOverTotal', () => {
  const budget = new Budget(5, 10, 15)
  strictEqual(budget.isOverTotal(10), false, 'equal is not over')
  strictEqual(budget.isOverTotal(11), true, 'greater is over')
})

test('Budget#isOverAvailable', () => {
  const budget = new Budget(5, 10, 5)
  strictEqual(budget.isOverAvailable(5), false, 'equal is not over')
  strictEqual(budget.isOverAvailable(6), true, 'greater is over')
})

test('Budget#empty', () => {
  const budget = new Budget(5, 10, 15)
  deepStrictEqual(budget.empty(), new Budget(5, 10, 0), 'empty is zeroed')
  strictEqual(budget.used, 15, 'original is unmodified')
})

test('Budget#alloc', () => {
  const budget = new Budget(5, 10, 5)
  deepStrictEqual(budget.alloc(5), new Budget(5, 10, 10), 'alloc adds to used')
  strictEqual(budget.used, 5, 'original is unmodified')
})

test('Budget#reclaim', () => {
  const budget = new Budget(5, 10, 10)
  deepStrictEqual(budget.reclaim(5), new Budget(5, 10, 5), 'reclaim removes from used')
  strictEqual(budget.used, 10, 'original is unmodified')
})

test('Budget#hasRoom', () => {
  const budget = new Budget(5, 10, 5)
  strictEqual(budget.hasRoom(5), true, 'equal has room')
  strictEqual(budget.hasRoom(6), false, 'greater has no room')
})
