import { deepStrictEqual, strictEqual } from 'node:assert'
import test from 'node:test'

import type { ServiceTarget, LinkTarget } from '../../../lib/service-grouping/service-link'
import {
  splitServiceTarget,
  splitLinkTarget,
  ServiceLink
} from '../../../lib/service-grouping/service-link'
import { Service } from '../../../lib/service-grouping/service'
import { LinkCost } from '../../../lib/service-grouping/link-cost'

test('splitServiceTarget', () => {
  const target: ServiceTarget = 'app:service'
  const [appName, serviceName] = splitServiceTarget(target)
  strictEqual(appName, 'app')
  strictEqual(serviceName, 'service')
})

test('splitLinkTarget', () => {
  const target: LinkTarget = 'app1:service1>app2:service2'
  const [from, to] = splitLinkTarget(target)
  strictEqual(from, 'app1:service1')
  strictEqual(to, 'app2:service2')
})

function fakeService (name: string): Service {
  return {
    get target (): string {
      return name
    }
  } as Service
}

test('new ServiceLink', () => {
  const services = [
    fakeService('app1:service1'),
    fakeService('app2:service2')
  ]
  const costs = { cost: 10 } as LinkCost
  const link = new ServiceLink(services, costs)
  deepStrictEqual(link.services, services)
  strictEqual(link.cost, 10)
})

test('ServiceLink#linkTarget', () => {
  const services = [
    fakeService('app1:service1'),
    fakeService('app2:service2')
  ]
  const costs = { cost: 10 } as LinkCost
  const link = new ServiceLink(services, costs)
  strictEqual(link.linkTarget, 'app1:service1>app2:service2')
})

test('ServiceLink#serviceTargets', () => {
  const services = [
    fakeService('app1:service1'),
    fakeService('app2:service2')
  ]
  const costs = { cost: 10 } as LinkCost
  const link = new ServiceLink(services, costs)
  deepStrictEqual(link.serviceTargets, [
    'app1:service1',
    'app2:service2'
  ])
})

test('ServiceLink#opposite', () => {
  const services = [
    fakeService('app1:service1'),
    fakeService('app2:service2')
  ]
  const costs = { cost: 10 } as LinkCost
  const link = new ServiceLink(services, costs)
  strictEqual(link.opposite(services[0]), services[1])
})

test('ServiceLink#toJSON', () => {
  const services = [
    fakeService('app1:service1'),
    fakeService('app2:service2')
  ]
  const costs = { cost: 10 } as LinkCost
  const link = new ServiceLink(services, costs)
  deepStrictEqual(link.toJSON(), {
    services: ['app1:service1', 'app2:service2'],
    costs
  })
})
