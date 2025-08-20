import type { App } from './app'
import { Budget } from './budget'
import type { BudgetSet } from './budget-set'
import type { Service } from './service'
import type { ServiceLink } from './service-link'

export class BudgetMustBePositiveError extends Error {
  property: keyof Budget
  budget: Budget

  constructor (property: keyof Budget, budget: Budget) {
    super(`Budget ${property} must be positive`)
    this.name = 'BudgetMustBePositiveError'

    this.property = property
    this.budget = budget
  }
}

export class BudgetMaxLessThanMinError extends Error {
  budget: Budget

  constructor (budget: Budget) {
    super('Budget maximum must be greater than minimum')
    this.name = 'BudgetMaxLessThanMinError'

    this.budget = budget
  }
}

export class ServiceExistsInAppError extends Error {
  service: Service
  app: App

  constructor (service: Service, app: App) {
    super(`Service "${service.name}" already exists in app "${app.name}"`)
    this.name = 'ServiceExistsInAppError'

    this.service = service
    this.app = app
  }
}

export class ServiceMoveError extends Error {
  service: Service
  app: App

  constructor (service: Service, app: App) {
    super(`Cannot move service "${service.name}" to app "${app.name}"`)
    this.name = 'ServiceMoveError'

    this.service = service
    this.app = app
  }
}

export class InsufficientBudgetError extends Error {
  service: Service
  budgets: BudgetSet

  constructor (service: Service, budgets: BudgetSet) {
    super('Cannot create new app with sufficient budget for service ' +
          `"${service.name}"`)
    this.name = 'InsufficientBudgetError'

    this.service = service
    this.budgets = budgets
  }
}

export class ServiceLinkNotRelatedError extends Error {
  service: Service
  link: ServiceLink

  constructor (service: Service, link: ServiceLink) {
    super(`Cannot associate link "${link.linkTarget}" to unrelated service ` +
      `"${service.name}"`)
    this.name = 'ServiceLinkNotRelatedError'

    this.service = service
    this.link = link
  }
}
