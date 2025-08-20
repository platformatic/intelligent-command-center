import assert, { deepStrictEqual, strictEqual } from 'node:assert'
import test from 'node:test'

import { BudgetSet } from '../../../lib/service-grouping/budget-set.js'
import { Budget } from '../../../lib/service-grouping/budget.js'

test('new BudgetSet', () => {
  const inputs = [
    [
      ['a', Budget.from({ min: 1, max: 3 })],
      ['b', Budget.from({ min: 2, max: 4 })]
    ],
    new Map([
      ['a', Budget.from({ min: 1, max: 3 })],
      ['b', Budget.from({ min: 2, max: 4 })]
    ]),
    Object.entries({
      a: Budget.from({ min: 1, max: 3 }),
      b: Budget.from({ min: 2, max: 4 })
    })
  ]

  for (const input of inputs) {
    const budgetSet = new BudgetSet(input as Iterable<readonly [string, Budget]>)
    assert(budgetSet.budgets.has('a'))
    assert(budgetSet.budgets.has('b'))
  }
})

test('BudgetSet.from', () => {
  const budgetSet = BudgetSet.from({
    a: { min: 1, max: 3 },
    b: { min: 2, max: 4 }
  })
  assert(budgetSet.budgets.has('a'))
  assert(budgetSet.budgets.has('b'))
})

test('BudgetSet#budgetEntries', () => {
  const budgetSet = BudgetSet.from({
    a: { min: 1, max: 3 },
    b: { min: 2, max: 4 }
  })
  const entries = budgetSet.budgetEntries
  strictEqual(entries.length, 2)
  strictEqual(entries[0][0], 'a')
  assert(entries[0][1] instanceof Budget)
  strictEqual(entries[1][0], 'b')
  assert(entries[1][1] instanceof Budget)
})

test('BudgetSet#isOverBudget', () => {
  const budgetSet = BudgetSet.from({
    a: { min: 1, max: 3 },
    b: { min: 2, max: 4 }
  })
  strictEqual(budgetSet.isOverBudget, false)
  strictEqual(budgetSet.alloc({ a: 4, b: 0 }).isOverBudget, true)
})

test('BudgetSet#toJSON', () => {
  const budgetSet = BudgetSet.from({
    a: { min: 1, max: 3 },
    b: { min: 2, max: 4 }
  })
  deepStrictEqual(budgetSet.toJSON(), {
    a: {
      allocated: 1,
      available: 3,
      min: 1,
      max: 3,
      used: 0
    },
    b: {
      allocated: 2,
      available: 4,
      min: 2,
      max: 4,
      used: 0
    }
  })
})

test('BudgetSet#get', () => {
  const budgetSet = BudgetSet.from({
    a: { min: 1, max: 3 },
    b: { min: 2, max: 4 }
  })
  assert(budgetSet.get('a') instanceof Budget)
  assert(budgetSet.get('b') instanceof Budget)
})

test('BudgetSet#isOverTotal', () => {
  const budgetSet = BudgetSet.from({
    a: { min: 1, max: 3 },
    b: { min: 2, max: 4 }
  })
  strictEqual(budgetSet.isOverTotal({ a: 4, b: 0 }), true)
})

test('BudgetSet#hasRoom', () => {
  const budgetSet = BudgetSet.from({
    a: { min: 1, max: 3 },
    b: { min: 2, max: 4 }
  })
  strictEqual(budgetSet.hasRoom({ a: 0, b: 4 }), true)
})

test('BudgetSet#alloc', () => {
  const budgetSet = BudgetSet.from({
    a: { min: 1, max: 3 },
    b: { min: 2, max: 4 }
  })
  const newBudgetSet = budgetSet.alloc({ a: 2, b: 3 })
  strictEqual(newBudgetSet.get('a').allocated, 2)
  strictEqual(newBudgetSet.get('b').allocated, 3)
  strictEqual(newBudgetSet.get('a').used, 2)
  strictEqual(newBudgetSet.get('b').used, 3)
})

test('BudgetSet#reclaim', () => {
  const budgetSet = BudgetSet.from({
    a: { min: 1, max: 3 },
    b: { min: 2, max: 4 }
  })
  const newBudgetSet = budgetSet.alloc({ a: 2, b: 3 }).reclaim({ a: 1, b: 2 })
  strictEqual(newBudgetSet.get('a').allocated, 1)
  strictEqual(newBudgetSet.get('b').allocated, 2)
  strictEqual(newBudgetSet.get('a').used, 1)
  strictEqual(newBudgetSet.get('b').used, 1)
})

test('BudgetSet#empty', () => {
  const budgetSet = BudgetSet.from({
    a: { min: 1, max: 3 },
    b: { min: 2, max: 4 }
  })
  const newBudgetSet = budgetSet.alloc({ a: 2, b: 3 }).empty()
  strictEqual(newBudgetSet.get('a').allocated, 1)
  strictEqual(newBudgetSet.get('b').allocated, 2)
  strictEqual(newBudgetSet.get('a').used, 0)
  strictEqual(newBudgetSet.get('b').used, 0)
})
