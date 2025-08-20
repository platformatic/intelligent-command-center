import assert from 'node:assert'

import type { Logger } from 'pino'

import type { App } from './app'
import type { CostSet } from './cluster'
import type { LinkCost } from './link-cost'

import { ServiceLinkNotRelatedError, ServiceMoveError } from './error'
import { ServiceLink, ServiceTarget } from './service-link'

export type ServiceName = string
export type ServiceType = string

export class Service {
  name: ServiceName
  type: ServiceType
  costs: CostSet

  #app: App
  #links: Map<Service, ServiceLink>
  #logger: Logger

  constructor (app: App, name: ServiceName, type: ServiceType, costs: CostSet, logger: Logger) {
    this.name = name
    this.type = type
    this.costs = costs

    this.#app = app
    this.#links = new Map()
    this.#logger = logger.child({
      serviceName: name
    })
  }

  toJSON () {
    return {
      name: this.name,
      type: this.type,
      costs: this.costs,
      // Since we know which side we are we can output with from/to.
      links: this.links.map(link => {
        const { services, ...rest } = link
        return {
          from: this.target,
          to: link.opposite(this).target,
          ...rest
        }
      })
    }
  }

  addLink (link: ServiceLink) {
    assert(
      link.services.includes(this),
      new ServiceLinkNotRelatedError(this, link)
    )
    const other = link.opposite(this)
    this.#links.set(other, link)
  }

  removeLink (link: ServiceLink) {
    const other = link.opposite(this)
    this.#links.delete(other)
  }

  linkTo (other: Service, costs: LinkCost): ServiceLink {
    const exists = this.#links.has(other)
    const fullCost = exists
      ? this.#links.get(other)!.costs.add(costs)
      : costs

    const link = new ServiceLink([this, other], fullCost)
    other.addLink(link)
    this.addLink(link)

    const [from, to] = link.services.map(s => s.target)
    this.#logger.info(
      '%s service link from "%s" to "%s"',
      exists ? 'updated' : 'created',
      from,
      to
    )
    return link
  }

  unlinkFrom (other: Service) {
    const link = this.#links.get(other)
    if (link) {
      this.removeLink(link)
      other.removeLink(link)
      this.#logger.info('Removed service link from "%s" to "%s"', this.target, other.target)
    }
  }

  get target (): ServiceTarget {
    return `${this.app.name}:${this.name}`
  }

  get links (): ServiceLink[] {
    return Array.from(this.#links.values())
  }

  get externalLinks (): ServiceLink[] {
    return this.links
      .filter(link => link.opposite(this).app !== this.app)
  }

  get linkedServices (): Service[] {
    return this.links
      .map(link => link.opposite(this))
  }

  get internalLinkCost (): number {
    return this.linkCostWhenOpposite(svc => svc.app === this.app)
  }

  get externalLinkCost (): number {
    return this.linkCostWhenOpposite(svc => {
      return svc.app !== this.app
    })
  }

  linkCostWhenOpposite (cond: (service: Service) => boolean): number {
    return Array.from(this.#links.values())
      .filter(link => cond(link.opposite(this)!))
      .map(link => link.costs.cost)
      .reduce((acc, cost) => acc + cost, 0)
  }

  get app () {
    return this.#app
  }

  // Change the app this service belongs to
  set app (app: App) {
    this.#app?.removeService(this)
    assert(app.addService(this), new ServiceMoveError(this, app))
    this.#app = app
  }
}
