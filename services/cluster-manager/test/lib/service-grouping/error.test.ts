import { deepStrictEqual, strictEqual } from 'node:assert'
import test from 'node:test'

import { Budget } from '../../../lib/service-grouping/budget'
import {
  BudgetMustBePositiveError,
  BudgetMaxLessThanMinError,
  ServiceExistsInAppError,
  ServiceMoveError,
  InsufficientBudgetError,
  ServiceLinkNotRelatedError
} from '../../../lib/service-grouping/error'
import { Service } from '../../../lib/service-grouping/service'
import { App } from '../../../lib/service-grouping/app'
import { ServiceLink } from '../../../lib/service-grouping/service-link'
import { BudgetSet } from '../../../lib/service-grouping/budget-set'

test('BudgetMustBePositiveError', () => {
  const budget = { min: -1 } as Budget
  const error = new BudgetMustBePositiveError('min', budget)
  strictEqual(error.name, 'BudgetMustBePositiveError')
  strictEqual(error.property, 'min')
  deepStrictEqual(error.budget, budget)
  strictEqual(error.message, 'Budget min must be positive')
})

test('BudgetMaxLessThanMinError', () => {
  const budget = { min: 1, max: 0 } as Budget
  const error = new BudgetMaxLessThanMinError(budget)
  strictEqual(error.name, 'BudgetMaxLessThanMinError')
  deepStrictEqual(error.budget, budget)
  strictEqual(error.message, 'Budget maximum must be greater than minimum')
})

test('ServiceExistsInAppError', () => {
  const service = { name: 'service' } as Service
  const app = { name: 'app' } as App
  const error = new ServiceExistsInAppError(service, app)
  strictEqual(error.name, 'ServiceExistsInAppError')
  deepStrictEqual(error.service, service)
  deepStrictEqual(error.app, app)
  strictEqual(error.message, 'Service "service" already exists in app "app"')
})

test('ServiceMoveError', () => {
  const service = { name: 'service' } as Service
  const app = { name: 'app' } as App
  const error = new ServiceMoveError(service, app)
  strictEqual(error.name, 'ServiceMoveError')
  deepStrictEqual(error.service, service)
  deepStrictEqual(error.app, app)
  strictEqual(error.message, 'Cannot move service "service" to app "app"')
})

test('InsufficientBudgetError', () => {
  const service = { name: 'service' } as Service
  const budgets = {} as BudgetSet
  const error = new InsufficientBudgetError(service, budgets)
  strictEqual(error.name, 'InsufficientBudgetError')
  deepStrictEqual(error.service, service)
  deepStrictEqual(error.budgets, budgets)
  strictEqual(error.message, 'Cannot create new app with sufficient budget for service "service"')
})

test('ServiceLinkNotRelatedError', () => {
  const service = { name: 'service' } as Service
  const link = {
    get linkTarget (): string {
      return 'app:service2>app:service3'
    }
  } as ServiceLink
  const error = new ServiceLinkNotRelatedError(service, link)
  strictEqual(error.name, 'ServiceLinkNotRelatedError')
  deepStrictEqual(error.service, service)
  strictEqual(
    error.message,
    'Cannot associate link "app:service2>app:service3" ' +
    'to unrelated service "service"'
  )
})
