import assert, { deepStrictEqual, strictEqual, throws } from 'node:assert'
import test from 'node:test'
import pino from 'pino'

import { App } from '../../../lib/service-grouping/app'
import { BudgetSet } from '../../../lib/service-grouping/budget-set'
import { Service } from '../../../lib/service-grouping/service'
import { LinkCost } from '../../../lib/service-grouping/link-cost'

const logger = pino({ level: 'silent' })

test('new App', () => {
  const budgets = BudgetSet.from({
    cpu: { min: 0, max: 10 },
    heap: { min: 128, max: 1024 },
    loop: { min: 0, max: 10 }
  })
  const composerCosts = { cpu: 1, heap: 1, loop: 1 }
  const app = new App('test', budgets, composerCosts, logger)
  strictEqual(app.name, 'test')
  assert(app.composer instanceof Service)
  deepStrictEqual(app.budgets, budgets.alloc(composerCosts))
})

test('App#toJSON', () => {
  const budgets = BudgetSet.from({
    cpu: { min: 0, max: 10 },
    heap: { min: 128, max: 1024 },
    loop: { min: 0, max: 10 }
  })
  const composerCosts = { cpu: 1, heap: 1, loop: 1 }
  const app = new App('test', budgets, composerCosts, logger)
  deepStrictEqual(app.toJSON(), {
    name: 'test',
    budgets: budgets.alloc(composerCosts).toJSON(),
    services: [app.composer.toJSON()]
  })
})

test('App#createService', () => {
  const budgets = BudgetSet.from({
    cpu: { min: 0, max: 10 },
    heap: { min: 128, max: 1024 },
    loop: { min: 0, max: 10 }
  })

  const composerCosts = { cpu: 1, heap: 1, loop: 1 }
  const app = new App('test', budgets, composerCosts, logger)

  const serviceCosts = { cpu: 2, heap: 2, loop: 2 }
  const service = app.createService('test', 'service', serviceCosts)

  assert(service instanceof Service)
  strictEqual(service.name, 'test')
  strictEqual(service.type, 'service')
  deepStrictEqual(service.costs, serviceCosts)
  assert(app.hasService(service))
})

test('App#addService', () => {
  const budgets = BudgetSet.from({
    cpu: { min: 0, max: 10 },
    heap: { min: 128, max: 1024 },
    loop: { min: 0, max: 10 }
  })

  const composerCosts = { cpu: 1, heap: 1, loop: 1 }
  const app = new App('test', budgets, composerCosts, logger)

  const serviceCosts = { cpu: 2, heap: 2, loop: 2 }
  const service = new Service(app, 'test', 'service', serviceCosts, logger)

  // Adds service if not already present
  assert(app.addService(service), 'adds not yet present service')
  assert(app.hasService(service), 'service is present')

  // Validates budgets are updated when adding a service
  deepStrictEqual(
    app.budgets,
    budgets.alloc(composerCosts).alloc(serviceCosts),
    'budgets updated'
  )

  // Throws if service already exists
  throws(
    () => app.addService(service),
    /ServiceExistsInAppError/,
    'throws if service already exists'
  )

  // Updates composer costs when adding a service named "composer"
  const composer = new Service(app, 'my-composer', 'composer', serviceCosts, logger)
  assert(app.addService(composer), 'allows adding composer service')
  deepStrictEqual(app.composer.costs, serviceCosts, 'composer costs updated')

  // Validate behaviour of exceeding budgets
  const tooBig = new Service(app, 'tooBig', 'service', {
    cpu: 10,
    heap: 1024,
    loop: 10
  }, logger)

  // Does not add service if it exceeds budget
  assert(!app.addService(tooBig), 'does not add service if it exceeds budget')
  assert(!app.hasService(tooBig), 'service is not present')

  // Adds service if it exceeds budget but budget is ignored
  assert(app.addService(tooBig, true), 'adds service if budget ignored')
  assert(app.hasService(tooBig), 'service is present')
})

test('App#hasService', () => {
  const budgets = BudgetSet.from({
    cpu: { min: 0, max: 10 },
    heap: { min: 128, max: 1024 },
    loop: { min: 0, max: 10 }
  })

  const composerCosts = { cpu: 1, heap: 1, loop: 1 }
  const app = new App('test', budgets, composerCosts, logger)

  const serviceCosts = { cpu: 2, heap: 2, loop: 2 }
  const service = new Service(app, 'test', 'service', serviceCosts, logger)

  assert(!app.hasService(service), 'service is not present')
  app.addService(service)
  assert(app.hasService(service), 'service is present')
})

test('App#removeService', () => {
  const budgets = BudgetSet.from({
    cpu: { min: 0, max: 10 },
    heap: { min: 128, max: 1024 },
    loop: { min: 0, max: 10 }
  })

  const composerCosts = { cpu: 1, heap: 1, loop: 1 }
  const app = new App('test', budgets, composerCosts, logger)

  const serviceCosts = { cpu: 2, heap: 2, loop: 2 }
  const service = new Service(app, 'test', 'service', serviceCosts, logger)

  app.addService(service)
  assert(app.hasService(service), 'service is present')
  assert(app.removeService(service), 'removes service')
  assert(!app.hasService(service), 'service is not present')

  // Budget should be reclaimed when removing a service
  deepStrictEqual(
    app.budgets,
    budgets.alloc(composerCosts),
    'budget reclaimed'
  )

  // Does not remove service if not present
  assert(!app.removeService(service), 'does not remove service if not present')
  deepStrictEqual(
    app.budgets,
    budgets.alloc(composerCosts),
    'budget unchanged'
  )
})

test('App#getService', () => {
  const budgets = BudgetSet.from({
    cpu: { min: 0, max: 10 },
    heap: { min: 128, max: 1024 },
    loop: { min: 0, max: 10 }
  })

  const composerCosts = { cpu: 1, heap: 1, loop: 1 }
  const app = new App('test', budgets, composerCosts, logger)

  const serviceCosts = { cpu: 2, heap: 2, loop: 2 }
  const service = app.createService('test', 'service', serviceCosts)

  assert(app.getService('test') === service, 'returns service by name')
})

test('App#services', () => {
  const budgets = BudgetSet.from({
    cpu: { min: 0, max: 10 },
    heap: { min: 128, max: 1024 },
    loop: { min: 0, max: 10 }
  })

  const composerCosts = { cpu: 1, heap: 1, loop: 1 }
  const app = new App('test', budgets, composerCosts, logger)

  const serviceCosts = { cpu: 2, heap: 2, loop: 2 }
  const service = app.createService('test', 'service', serviceCosts)

  strictEqual(app.services.length, 2, 'should have two services including the composer')
  assert(app.services.includes(app.composer), 'should include composer')
  assert(app.services.includes(service), 'should include created service')
})

test('App#systemCost', () => {
  const budgets = BudgetSet.from({
    cpu: { min: 0, max: 10 },
    heap: { min: 128, max: 1024 },
    loop: { min: 0, max: 10 }
  })

  const composerCosts = { cpu: 1, heap: 1, loop: 1 }
  const app = new App('test', budgets, composerCosts, logger)

  const serviceCosts = { cpu: 2, heap: 2, loop: 2 }
  app.createService('test', 'service', serviceCosts)

  deepStrictEqual(app.systemCost, {
    cpu: 3,
    heap: 3,
    loop: 3
  }, 'should keep track of system cost')
})

test('App#getSystemCostForBudget', () => {
  const budgets = BudgetSet.from({
    cpu: { min: 0, max: 10 },
    heap: { min: 128, max: 1024 },
    loop: { min: 0, max: 10 }
  })

  const composerCosts = { cpu: 1, heap: 1, loop: 1 }
  const app = new App('test', budgets, composerCosts, logger)

  const serviceCosts = { cpu: 2, heap: 3, loop: 4 }
  app.createService('test', 'service', serviceCosts)

  strictEqual(app.getSystemCostForBudget('cpu'), 3, 'should cpu cost')
  strictEqual(app.getSystemCostForBudget('heap'), 4, 'should heap cost')
  strictEqual(app.getSystemCostForBudget('loop'), 5, 'should loop cost')
})

test('App#latencyCost', () => {
  const budgets = BudgetSet.from({
    cpu: { min: 0, max: 10 },
    heap: { min: 128, max: 1024 },
    loop: { min: 0, max: 10 }
  })

  const composerCosts = { cpu: 1, heap: 1, loop: 1 }
  const app1 = new App('app1', budgets, composerCosts, logger)
  const app2 = new App('app2', budgets, composerCosts, logger)

  const serviceCosts = { cpu: 2, heap: 3, loop: 4 }
  const svc1 = app1.createService('svc1', 'service', serviceCosts)
  const svc2 = app2.createService('svc2', 'service', serviceCosts)

  const linkCost = LinkCost.from({ count: 123, average: 456 })
  svc1.linkTo(svc2, linkCost)

  strictEqual(app1.latencyCost, 123 * 456, 'should return latency cost')
})

test('App#isOverBudget', () => {
  const budgets = BudgetSet.from({
    cpu: { min: 0, max: 2 },
    heap: { min: 0, max: 2 },
    loop: { min: 0, max: 2 }
  })

  const composerCosts = { cpu: 1, heap: 1, loop: 1 }
  const app = new App('test', budgets, composerCosts, logger)

  assert(!app.isOverBudget, 'should not be over budget')

  const costSets = [
    { cpu: 2, heap: 1, loop: 1 },
    { cpu: 1, heap: 2, loop: 1 },
    { cpu: 1, heap: 1, loop: 2 }
  ]

  for (const serviceCosts of costSets) {
    const service = app.createService('test', 'service', serviceCosts)
    assert(app.isOverBudget, 'should be over budget')
    app.removeService(service)
  }
})

test('App#leastLinkCostlyService', () => {
  const budgets = BudgetSet.from({
    cpu: { min: 0, max: 2 },
    heap: { min: 0, max: 2 },
    loop: { min: 0, max: 2 }
  })

  const composerCosts = { cpu: 1, heap: 1, loop: 1 }
  const app1 = new App('app1', budgets, composerCosts, logger)
  const app2 = new App('app2', budgets, composerCosts, logger)

  const serviceCosts = { cpu: 2, heap: 3, loop: 4 }
  const svc1 = app1.createService('svc1', 'service', serviceCosts)
  const svc2 = app1.createService('svc2', 'service', serviceCosts)
  const svc3 = app2.createService('svc3', 'service', serviceCosts)

  const linkCost1 = LinkCost.from({ count: 123, average: 456 })
  svc1.linkTo(svc3, linkCost1)

  const linkCost2 = LinkCost.from({ count: 789, average: 1011 })
  svc2.linkTo(svc3, linkCost2)

  deepStrictEqual(
    app1.leastLinkCostlyService,
    svc1,
    'should return least link costly service'
  )
})
