import type { Logger } from 'pino'

import type { CostSet } from './cluster'

import { Service, ServiceName, ServiceType } from './service'
import { BudgetSet } from './budget-set'
import { ServiceExistsInAppError } from './error'

export type AppName = string

export class App {
  #services: Map<ServiceName, Service>
  #logger: Logger
  #defaultComposer: Service

  name: AppName
  composer: Service
  budgets: BudgetSet

  constructor (name: AppName, budgets: BudgetSet, composerCosts: CostSet, logger: Logger) {
    this.#services = new Map()
    this.#logger = logger.child({
      appName: name
    })

    this.name = name

    // Ensure there is always a composer
    this.#defaultComposer = new Service(this, 'composer', 'composer', composerCosts, this.#logger)
    this.budgets = budgets.alloc(composerCosts)
    this.#services.set('composer', this.#defaultComposer)
    this.composer = this.#defaultComposer
  }

  toJSON () {
    return {
      name: this.name,
      budgets: this.budgets.toJSON(),
      services: this.services.map(s => s.toJSON())
    }
  }

  createService (name: ServiceName, type: ServiceType, costs: CostSet): Service {
    const service = new Service(this, name, type, costs, this.#logger)
    this.#logger.info('created service "%s" in app "%s"', service.name, this.name)
    this.addService(service, true)
    return service
  }

  hasService (service: Service): boolean {
    return this.#services.has(service.name)
  }

  addService (service: Service, ignoreBudget = false): boolean {
    // Reclaim default composer space if not already reclaimed by another composer
    if (service.type === 'composer' && this.composer === this.#defaultComposer) {
      this.budgets = this.budgets.reclaim(this.composer.costs)
      this.#services.delete('composer')
      this.composer = service
      this.#logger.info('replaced default composer with service "%s" in app "%s"', service.name, this.name)
    }

    if (this.hasService(service)) {
      throw new ServiceExistsInAppError(service, this)
    }

    if (this.budgets.hasRoom(service.costs) || ignoreBudget) {
      this.budgets = this.budgets.alloc(service.costs)
      this.#services.set(service.name, service)
      this.#logger.info('added service "%s" to app "%s"', service.target, this.name)
      return true
    }

    return false
  }

  removeService (service: Service): boolean {
    if (this.hasService(service)) {
      this.budgets = this.budgets.reclaim(service.costs)
      this.#services.delete(service.name)
      this.#logger.info('removed service "%s" from app "%s"', service.name, this.name)
      return true
    }

    return false
  }

  getService (name: ServiceName): Service {
    return this.#services.get(name)
  }

  get services (): Service[] {
    return Array.from(this.#services.values())
  }

  get systemCost (): CostSet {
    return Object.fromEntries(
      Object.entries(this.budgets.toJSON())
        .map(([name, budget]) => [name, budget.used])
    )
  }

  getSystemCostForBudget (budgetName: string): number {
    return this.systemCost[budgetName]
  }

  get latencyCost (): number {
    return this.services
      .flatMap(service => service.externalLinkCost)
      .reduce((acc, cost) => acc + cost, 0)
  }

  get isOverBudget (): boolean {
    return this.budgets.isOverBudget
  }

  get leastLinkCostlyService (): Service {
    return this.services
      .filter(service => service.type !== 'composer')
      .sort((a, b) => a.externalLinkCost - b.externalLinkCost)[0]
  }
}
