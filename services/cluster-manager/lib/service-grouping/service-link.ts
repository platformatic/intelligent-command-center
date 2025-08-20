import type { AppName } from './app'
import type { Service, ServiceName } from './service'
import type { LinkCost } from './link-cost'

export type ServiceTarget = `${string}:${string}`

export function splitServiceTarget (target: ServiceTarget): [AppName, ServiceName] {
  return target.split(':') as [AppName, ServiceName]
}

export type LinkTarget = `${ServiceTarget}>${ServiceTarget}`

export function splitLinkTarget (target: LinkTarget): [ServiceTarget, ServiceTarget] {
  return target.split('>') as [ServiceTarget, ServiceTarget]
}

export class ServiceLink {
  services: Service[]
  costs: LinkCost

  constructor (services: Iterable<Service>, costs: LinkCost) {
    this.services = Array.from(services)
    this.costs = costs
    Object.freeze(this)
  }

  get cost (): number {
    return this.costs.cost
  }

  get linkTarget (): LinkTarget {
    const [from, to] = this.serviceTargets
    return `${from}>${to}`
  }

  get serviceTargets (): ServiceTarget[] {
    return this.services.map(s => s.target)
  }

  opposite (service: Service): Service {
    return this.services.find(svc => svc !== service)
  }

  toJSON () {
    return {
      services: this.services.map(s => s.target),
      costs: this.costs
    }
  }
}
