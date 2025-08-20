import assert from 'node:assert'

import pino, { type Logger } from 'pino'

import type { BudgetSetInput } from './budget-set'
import type { LinkCostInput } from './link-cost'
import type { ServiceTarget, LinkTarget } from './service-link'
import type { OptimizationStep } from './optimization-step'

import { App } from './app'
import { Budget } from './budget'
import { BudgetSet } from './budget-set'
import { InsufficientBudgetError } from './error'
import { LinkCost } from './link-cost'
import {
  CreateApplication,
  DeleteApplication,
  DuplicateService,
  MoveService
} from './optimization-step'
import { ServiceLink } from './service-link'
import { Service } from './service'

export interface ServiceDefinition {
  name: string,
  type: string,
  costs: CostSet
}

export interface ApplicationMap {
  [name: string]: ServiceDefinition[]
}

export interface ServiceCostSet {
  [target: ServiceTarget]: CostSet
}

export interface LinkCostMapInput {
  [target: LinkTarget]: LinkCostInput
}

export type ServiceTargetInput = [string, string]

export interface ServiceLinkInput extends LinkCostInput {
  from?: ServiceTargetInput
  to?: ServiceTargetInput
}

export interface ClusterInput {
  applications: ApplicationMap
  links: ServiceLinkInput[]
  budgets: BudgetSetInput
  composerCosts: CostSet
}

export interface CostSet {
  [name: string]: number
}

function addCosts (a: CostSet, b: CostSet) {
  const c: CostSet = {}
  for (const [key, value] of Object.entries(a)) {
    c[key] = value + b[key]
  }
  return c
}

export class Cluster {
  applications: Map<string, App>
  budgets: BudgetSet
  composerCosts: CostSet
  steps: OptimizationStep[]
  #lastId = 0

  #logger: Logger

  constructor (budgets: BudgetSet, composerCosts: CostSet, logger: Logger) {
    this.applications = new Map()
    this.budgets = budgets
    this.composerCosts = composerCosts
    this.steps = []

    this.#logger = logger.child({})
  }

  createApp (
    name: string,
    budgets = this.budgets,
    composerCosts = this.composerCosts
  ) {
    const app = new App(name, budgets.empty(), composerCosts, this.#logger)
    this.#logger.info('created app "%s"', app.name)
    this.applications.set(name, app)
    return app
  }

  getApp (name: string): App {
    return this.applications.get(name)
  }

  toJSON () {
    return {
      apps: this.apps.map(app => app.toJSON()),
      steps: this.steps
    }
  }

  static from (options: ClusterInput, logger = pino({ level: 'silent' })) {
    logger.info(options, 'Creating cluster from input')

    // Convert to Budget type
    const budgets = Object.fromEntries(
      Object.entries(options.budgets)
        .map(([name, budget]) => [name, Budget.from(budget)] as [string, Budget])
    )

    // Create empty cluster with configured budgets
    const cluster = new Cluster(
      BudgetSet.from(budgets),
      options.composerCosts,
      logger
    )

    // Fill cluster with applications
    for (const [appName, services] of Object.entries(options.applications)) {
      const app = cluster.createApp(appName)
      for (const { name, type, costs } of services) {
        app.createService(name, type, costs)
      }
    }

    // Fill cluster with links
    for (const { from, to, ...cost } of options.links) {
      const [fromApp, fromSvc] = from
      if (!fromApp || !fromSvc) continue

      const [toApp, toSvc] = to
      if (!toApp || !toSvc) continue

      const fromService = cluster.getApp(fromApp)?.getService(fromSvc)
      const toService = cluster.getApp(toApp)?.getService(toSvc)
      if (!fromService || !toService) continue

      fromService.linkTo(toService, LinkCost.from(cost))
    }

    logger.info(cluster, 'Cluster construction complete')

    // Construct cluster from translated inputs
    return cluster
  }

  get appsByElu (): App[] {
    return this.apps
      .sort((a: App, b: App) => a.systemCost.loop - b.systemCost.loop)
      .reverse()
  }

  get servicesByLatency (): Service[] {
    return this.services
      .filter(service => service.type !== 'composer')
      .sort((a: Service, b: Service) => a.externalLinkCost - b.externalLinkCost)
      .reverse()
  }

  get mostRoomApp (): App {
    return this.appsByElu[0]
  }

  get apps (): App[] {
    return Array.from(this.applications.values())
  }

  get services (): Service[] {
    return this.apps.flatMap(app => app.services)
  }

  get averageServiceCosts (): CostSet {
    const costs = this.services
      .filter(service => service.type !== 'composer')
      .map(service => service.costs)

    const averages: CostSet = {}
    if (costs.length) {
      const totals = costs.reduce(addCosts)
      for (const [key, value] of Object.entries(totals)) {
        averages[key] = value / costs.length
      }
    }

    return averages
  }

  #makeId (): number {
    return ++this.#lastId
  }

  // TODO: Can link partitioning be more intelligent? Perhaps somehow they can
  // be grouped into logically distinct sets based on the services they connect
  // to, avoiding link latency increases due to the partitioning?
  splitLinks (services: Service[], links: ServiceLink[]): ServiceLink[][] {
    const partitions = []

    for (const service of services) {
      const linkSet = []

      for (const link of links) {
        const targets = [service, link.opposite(services[0])]
        const { count, average } = link.costs
        const newCost = new LinkCost(count / services.length, average)
        linkSet.push(new ServiceLink(targets, newCost))
      }

      partitions.push(linkSet)
    }

    return partitions
  }

  optimize (): Cluster {
    this.#logger.info('Optimizing cluster')

    // Reset optimization steps
    this.steps = []

    this.duplicateCostlyServices(this.steps)
    this.mergeSmallApps(this.steps)
    this.shrinkOversizeApps(this.steps)
    this.optimizeLinkCosts(this.steps)

    this.#logger.info('Optimization complete')

    return this
  }

  // 1. Duplicate any services above average system cost
  //
  // For any service exceeding the average system cost it will produce
  // n duplicate services where n is ceil(serviceCost / averageCost)
  //
  duplicateCostlyServices (steps: OptimizationStep[]) {
    const { averageServiceCosts } = this
    const deviation = 1.25

    for (const service of this.services) {
      // Skip composer services, those will get duplicated by app splitting
      //
      // TODO: This is actually not quite right. If the composer itself is such
      // high load that it needs duplication separate from the services then
      // it could be the case that when it gets to the app splitting step it
      // will need to split multiple times. Due to how split migration works,
      // it may result in the algorithm suggesting deleting the original app
      // entirely and splitting all load out to new apps rather than only
      // creating enough new apps to cover the budget overage. While it _does_
      // still work this way, the UX is less intuitive.
      if (service.type === 'composer') continue

      // Determine optimal service duplicate count
      const copyCount = Math.max(
        ...Object.entries(service.costs)
          .map(([key, cost]) => {
            return Math.ceil(
              // Either aim for within deviation of the average cost,
              // or the maximum pod budget, whichever needs most copies.
              Math.max(
                cost / deviation / averageServiceCosts[key],
                cost / this.budgets.get(key).max
              )
            )
          })
      )

      this.#logger.info({
        averageServiceCosts,
        serviceCosts: service.costs,
        budgets: this.budgets.toJSON()
      }, 'Duplicating high-load service "%s" %d times', service.target, copyCount)

      if (copyCount > 1) {
        // Split system costs for each duplicate service
        const newCosts = Object.fromEntries(
          Object.entries(service.costs)
            .map(([key, cost]) => [key, cost / copyCount])
        )

        // Keep a list of all copies for link rebuilding
        const copies = [service]

        // Adjust costs of original service
        service.costs = newCosts

        // Create service duplicates
        // TODO: Split links for each duplication so duplicates are factored
        // into mostRoomApp calculation.
        for (let i = 1; i < copyCount; i++) {
          const newService = this.mostRoomApp.createService(`${service.name}-dupe-${this.#makeId()}`, service.type, newCosts)
          steps.push(new DuplicateService(service, newService))
          copies.push(newService)

          this.#logger.info(
            'Duplicated high-load service "%s" as "%s"',
            service.target,
            newService.target
          )
        }

        // First partition is left to original service, remaining partitions
        // are moved to new services below.
        const linkSets = this.splitLinks(copies, service.links)

        // Terminate all existing links to this service
        for (const link of service.links) {
          service.unlinkFrom(link.opposite(service))
        }

        // Fill link sets for each duplicate service
        for (let i = 0; i < linkSets.length; i++) {
          const linkSet = linkSets[i]
          const target = copies[i]

          // Assign all links from the link set for this service
          for (const link of linkSet) {
            target.linkTo(link.opposite(target), link.costs)
          }
        }
      }
    }

    this.#logger.info('Duplicated costly services')
  }

  // 2. Merge smallest apps up to budget limits
  //
  // Take services from smallest app and move them to the largest app
  // which still has room available. If an app becomes empty, delete it.
  //
  mergeSmallApps (steps: OptimizationStep[]) {
    while (true) {
      // Get the current list of apps sorted by system cost
      const sortedApps = this.appsByElu

      // Take the smallest service to attempt merging into others
      const smallest = sortedApps.pop()
      let movedService = false

      // Try to move every service from the smallest app to the next smallest apps
      // with room available until all services have been moved elsewhere
      for (const nextSmallest of sortedApps.reverse()) {
        // For each remaining service in the smallest app, attempt to move it to
        // the currently selected app
        for (const service of smallest.services.values()) {
          if (service.type === 'composer') continue
          if (nextSmallest.budgets.hasRoom(service.costs)) {
            const priorTarget = service.target
            movedService = true

            // Already has a service by that name so needs a rename
            if (nextSmallest.hasService(service)) {
              service.name = `${service.name}-merged-${this.#makeId()}`
            }

            // Merge smallest two apps
            service.app = nextSmallest
            steps.push(new MoveService(
              priorTarget,
              service,
              smallest,
              nextSmallest
            ))
            this.#logger.info(
              'Moved "%s" from smallest app to next smallest as "%s"',
              priorTarget,
              service.target
            )
          }
        }

        // If smallest app is empty, remove it and stop trying to move its services
        if (smallest.services.length === 1 && smallest.services[0].type === 'composer') {
          this.applications.delete(smallest.name)
          steps.push(new DeleteApplication(smallest))
          this.#logger.info('Deleted empty app "%s"', smallest.name)
          break
        }
      }

      // If it was unable to move anything this iteration, break
      if (!movedService) break
    }

    this.#logger.info('Merged services from low-utilization apps')
  }

  // 3. Move least link-costly services out of any apps which exceed budgets
  //
  // This will move services from apps exceeding their budgets to whatever
  // the least-utilization app is at the time.
  //
  shrinkOversizeApps (steps: OptimizationStep[]) {
    const appQueue = this.apps
    let newApp
    while (appQueue.length) {
      const app = appQueue.shift()
      while (app.isOverBudget && app.services.length > 2) {
        // Take least link-costly service from the app
        const service = app.leastLinkCostlyService
        if (!service) {
          this.#logger.warn(
            'No least link-costly service to move from "%s"',
            app.name
          )
          break
        }
        const priorTarget = service.target

        // Find or create a new app to reassign the service to
        if (!newApp || !newApp.budgets.hasRoom(service.costs)) {
          const existing = this.mostRoomApp
          if (existing !== app && existing?.budgets.hasRoom(service.costs)) {
            newApp = existing
          } else {
            newApp = this.createApp(`${app.name}-reassigned-${this.#makeId()}`)
            assert(
              newApp.budgets.hasRoom(service.costs),
              new InsufficientBudgetError(service, newApp.budgets)
            )
            steps.push(new CreateApplication(newApp))
            appQueue.push(newApp)
          }
        }

        // Already has a service by that name so needs a rename
        if (newApp.hasService(service)) {
          service.name = `${service.name}-moved-${this.#makeId()}`
        }

        // Reassign the service to the new app
        app.removeService(service)
        service.app = newApp
        steps.push(new MoveService(priorTarget, service, app, newApp))
        this.#logger.info(
          'Moved least link-costly service "%s" to "%s"',
          priorTarget,
          service.target
        )
      }

      // TODO: If app remains over budget, we should inform the user somehow.
    }

    this.#logger.info(
      'Shrunk oversize apps by moving least link-costly services')
  }

  // 4. Trade services between apps to minimize link costs
  //
  // Find service with greatest link latency cost and attempts to trade
  // it with the service with the least link latency cost on the app
  // which the service link connects. If the swap would produce a lower
  // combined link latency then it makes the swap, otherwise it skips.
  //
  optimizeLinkCosts (steps: OptimizationStep[]) {
    for (const service of this.servicesByLatency) {
      const links = service.externalLinks
        .sort((a, b) => b.costs.cost - a.costs.cost)

      for (const lowestCostLink of links) {
        const other = lowestCostLink.opposite(service)
        if (other.type === 'composer') continue
        const app = service.app
        const otherApp = other.app
        if (app === otherApp) continue

        const selfCost = service.externalLinkCost
        const otherCost = other.linkCostWhenOpposite(svc => svc.app !== app)

        // Get budgets minus the services to swap to make sure there's room
        const selfHasRoom = app.budgets
          .reclaim(service.costs)
          .hasRoom(other.costs)
        const otherHasRoom = otherApp.budgets
          .reclaim(other.costs)
          .hasRoom(service.costs)

        if (selfCost <= otherCost && selfHasRoom && otherHasRoom) {
          // Get original service targets first, for step change history
          const priorServiceTarget = service.target
          const priorOtherTarget = other.target

          // Remove from current apps first before renaming and retargeting
          app.removeService(service)
          otherApp.removeService(other)

          // Already has a service by that name so needs a rename
          if (otherApp.hasService(service)) {
            service.name = `${service.name}-swapped-${this.#makeId()}`
          }
          if (app.hasService(other)) {
            other.name = `${other.name}-swapped-${this.#makeId()}`
          }

          // Retarget services to the opposite apps
          service.app = otherApp
          other.app = app

          steps.push(
            new MoveService(priorServiceTarget, service, app, service.app)
          )
          steps.push(
            new MoveService(priorOtherTarget, other, service.app, app)
          )
          this.#logger.info(
            'Swapped "%s" with "%s", improving link latency by %d',
            priorServiceTarget,
            priorOtherTarget,
            otherCost - selfCost
          )
        } else {
          break
        }
      }
    }

    this.#logger.info('Swapped services to minimize link latency')
  }
}
