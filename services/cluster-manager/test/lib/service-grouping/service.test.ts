import { deepStrictEqual, strictEqual, ok } from 'node:assert'
import test from 'node:test'
import pino from 'pino'

import type { Logger, Bindings } from 'pino'

import { Service } from '../../../lib/service-grouping/service'
import { App } from '../../../lib/service-grouping/app'
import { BudgetSet } from '../../../lib/service-grouping/budget-set'
import { LinkCost } from '../../../lib/service-grouping/link-cost'
import { ServiceLink } from '../../../lib/service-grouping/service-link'

const budgets = BudgetSet.from({
  cpu: { min: 0, max: 10 },
  heap: { min: 128, max: 1024 },
  loop: { min: 0, max: 10 }
})
const composerCosts = { cpu: 1, heap: 1, loop: 1 }
const logger = pino({ level: 'silent' })

test('new Service', () => {
  const app = new App('app', budgets, composerCosts, logger)
  const costs = { cpu: 1, heap: 2, loop: 3 }
  let createChildLogger = false
  const service = new Service(app, 'name', 'service', costs, {
    child (bindings: Bindings) {
      createChildLogger = true
      return logger.child(bindings)
    }
  } as Logger)
  strictEqual(service.name, 'name')
  strictEqual(service.type, 'service')
  deepStrictEqual(service.costs, costs)
  ok(createChildLogger)
})

test('Service#toJSON', () => {
  const app = new App('app', budgets, composerCosts, logger)
  const costs = { cpu: 1, heap: 2, loop: 3 }
  const service = new Service(app, 'name', 'service', costs, logger)
  const other = new Service(app, 'other', 'service', costs, logger)
  service.linkTo(other, new LinkCost(123, 456))

  deepStrictEqual(service.toJSON(), {
    name: 'name',
    type: 'service',
    costs,
    links: [
      {
        from: `${app.name}:${service.name}`,
        to: `${app.name}:${other.name}`,
        costs: new LinkCost(123, 456)
      }
    ]
  })
})

test('Service#addLink', () => {
  const app = new App('app', budgets, composerCosts, logger)
  const costs = { cpu: 1, heap: 2, loop: 3 }
  const service = new Service(app, 'name', 'service', costs, logger)
  const other = new Service(app, 'other', 'service', costs, logger)
  const link = new ServiceLink([service, other], new LinkCost(123, 456))

  service.addLink(link)
  ok(service.links.includes(link))
})

test('Service#removeLink', () => {
  const app = new App('app', budgets, composerCosts, logger)
  const costs = { cpu: 1, heap: 2, loop: 3 }
  const service = new Service(app, 'name', 'service', costs, logger)
  const other = new Service(app, 'other', 'service', costs, logger)
  const link = new ServiceLink([service, other], new LinkCost(123, 456))

  service.addLink(link)
  service.removeLink(link)
  ok(!service.links.includes(link))
})

test('Service#linkTo', () => {
  const app = new App('app', budgets, composerCosts, logger)
  const costs = { cpu: 1, heap: 2, loop: 3 }
  const service = new Service(app, 'name', 'service', costs, logger)
  const other = new Service(app, 'other', 'service', costs, logger)
  const linkCosts = new LinkCost(123, 456)
  const link = service.linkTo(other, linkCosts)

  deepStrictEqual(link.costs, linkCosts)
  ok(service.links.includes(link))
  ok(other.links.includes(link))
})

test('Service#unlinkFrom', () => {
  const app = new App('app', budgets, composerCosts, logger)
  const costs = { cpu: 1, heap: 2, loop: 3 }
  const service = new Service(app, 'name', 'service', costs, logger)
  const other = new Service(app, 'other', 'service', costs, logger)
  const link = new ServiceLink([service, other], new LinkCost(123, 456))

  service.linkTo(other, new LinkCost(123, 456))
  service.unlinkFrom(other)

  ok(!service.links.includes(link))
  ok(!other.links.includes(link))
})

test('Service#target', () => {
  const app = new App('app', budgets, composerCosts, logger)
  const costs = { cpu: 1, heap: 2, loop: 3 }
  const service = new Service(app, 'name', 'service', costs, logger)
  strictEqual(service.target, `${app.name}:${service.name}`)
})

test('Service#links', () => {
  const app = new App('app', budgets, composerCosts, logger)
  const costs = { cpu: 1, heap: 2, loop: 3 }
  const service = new Service(app, 'name', 'service', costs, logger)
  const other = new Service(app, 'other', 'service', costs, logger)
  const link = new ServiceLink([service, other], new LinkCost(123, 456))

  service.linkTo(other, new LinkCost(123, 456))
  deepStrictEqual(service.links, [link])
})

test('Service#externalLinks', () => {
  const app1 = new App('app', budgets, composerCosts, logger)
  const app2 = new App('other-app', budgets, composerCosts, logger)
  const costs = { cpu: 1, heap: 2, loop: 3 }
  const linkCost = new LinkCost(123, 456)
  const service = new Service(app1, 'name', 'service', costs, logger)
  const other1 = new Service(app1, 'other1', 'service', costs, logger)
  const other2 = new Service(app2, 'other2', 'service', costs, logger)
  const link1 = new ServiceLink([service, other1], linkCost)
  const link2 = new ServiceLink([service, other2], linkCost)

  service.addLink(link1)
  service.addLink(link2)
  ok(!service.externalLinks.includes(link1))
  ok(service.externalLinks.includes(link2))
})

test('Service#linkedServices', () => {
  const app = new App('app', budgets, composerCosts, logger)
  const costs = { cpu: 1, heap: 2, loop: 3 }
  const service = new Service(app, 'name', 'service', costs, logger)
  const other = new Service(app, 'other', 'service', costs, logger)
  service.linkTo(other, new LinkCost(123, 456))

  deepStrictEqual(service.linkedServices, [other])
})

test('Service#internalLinkCost', () => {
  const app1 = new App('app', budgets, composerCosts, logger)
  const app2 = new App('other-app', budgets, composerCosts, logger)
  const costs = { cpu: 1, heap: 2, loop: 3 }
  const linkCost1 = new LinkCost(123, 456)
  const linkCost2 = new LinkCost(789, 101)
  const service = new Service(app1, 'name', 'service', costs, logger)
  const other1 = new Service(app1, 'other1', 'service', costs, logger)
  const other2 = new Service(app2, 'other2', 'service', costs, logger)
  const link1 = new ServiceLink([service, other1], linkCost1)
  const link2 = new ServiceLink([service, other2], linkCost2)

  service.addLink(link1)
  service.addLink(link2)
  deepStrictEqual(service.internalLinkCost, linkCost1.cost)
})

test('Service#externalLinkCost', () => {
  const app1 = new App('app', budgets, composerCosts, logger)
  const app2 = new App('other-app', budgets, composerCosts, logger)
  const costs = { cpu: 1, heap: 2, loop: 3 }
  const linkCost1 = new LinkCost(123, 456)
  const linkCost2 = new LinkCost(789, 101)
  const service = new Service(app1, 'name', 'service', costs, logger)
  const other1 = new Service(app1, 'other1', 'service', costs, logger)
  const other2 = new Service(app2, 'other2', 'service', costs, logger)
  const link1 = new ServiceLink([service, other1], linkCost1)
  const link2 = new ServiceLink([service, other2], linkCost2)

  service.addLink(link1)
  service.addLink(link2)
  deepStrictEqual(service.externalLinkCost, linkCost2.cost)
})

test('Service#linkCostWhenOpposite', () => {
  const app1 = new App('app', budgets, composerCosts, logger)
  const app2 = new App('other-app', budgets, composerCosts, logger)
  const costs = { cpu: 1, heap: 2, loop: 3 }
  const linkCost1 = new LinkCost(123, 456)
  const linkCost2 = new LinkCost(789, 101)
  const service = new Service(app1, 'name', 'service', costs, logger)
  const other1 = new Service(app1, 'other1', 'service', costs, logger)
  const other2 = new Service(app2, 'other2', 'service', costs, logger)
  const link1 = new ServiceLink([service, other1], linkCost1)
  const link2 = new ServiceLink([service, other2], linkCost2)

  service.addLink(link1)
  service.addLink(link2)
  deepStrictEqual(service.linkCostWhenOpposite(svc => svc.app === app1), linkCost1.cost)
  deepStrictEqual(service.linkCostWhenOpposite(svc => svc.app !== app1), linkCost2.cost)
})

test('Service#app', () => {
  const app1 = new App('app', budgets, composerCosts, logger)
  const app2 = new App('other-app', budgets, composerCosts, logger)
  const service = new Service(app1, 'name', 'service', { cpu: 1, heap: 2, loop: 3 }, logger)
  app1.addService(service, true)

  strictEqual(service.app, app1)
  ok(app1.services.includes(service))
  ok(!app2.services.includes(service))

  service.app = app2
  strictEqual(service.app, app2)
  ok(!app1.services.includes(service))
  ok(app2.services.includes(service))
})
