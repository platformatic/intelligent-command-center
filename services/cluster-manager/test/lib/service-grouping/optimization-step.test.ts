import { strictEqual } from 'node:assert'
import test from 'node:test'

import {
  OptimizationStepType,
  CreateApplication,
  DeleteApplication,
  MoveService,
  DuplicateService
} from '../../../lib/service-grouping/optimization-step'

import { App } from '../../../lib/service-grouping/app'
import { ServiceTarget } from '../../../lib/service-grouping/service-link'
import { Service } from '../../../lib/service-grouping/service'

test('CreateApplication', () => {
  const app = { name: 'app' } as App
  const step = new CreateApplication(app)
  strictEqual(step.type, OptimizationStepType.CreateApplication)
  strictEqual(step.applicationName, 'app')
  strictEqual(step.message, 'Create a new application "app"')
})

test('DeleteApplication', () => {
  const app = { name: 'app' } as App
  const step = new DeleteApplication(app)
  strictEqual(step.type, OptimizationStepType.DeleteApplication)
  strictEqual(step.applicationName, 'app')
  strictEqual(step.message, 'Delete application "app"')
})

test('MoveService', () => {
  const priorTarget = 'source:service' as ServiceTarget
  const service = { get target (): string { return 'target:service' }, name: 'service' } as Service
  const sourceApp = { name: 'source' } as App
  const targetApp = { name: 'target' } as App
  const step = new MoveService(priorTarget, service, sourceApp, targetApp)
  strictEqual(step.type, OptimizationStepType.MoveService)
  strictEqual(step.sourceServiceId, service.name)
  strictEqual(step.targetServiceId, service.name)
  strictEqual(step.sourceApplicationName, 'source')
  strictEqual(step.targetApplicationName, 'target')
  strictEqual(
    step.message,
    'Move service "service" from application "source" to "target"'
  )
})

test('DuplicateService', () => {
  const original = {
    app: {
      name: 'source'
    },
    get target (): string {
      return 'source:original'
    }
  } as Service
  const duplicate = {
    app: {
      name: 'target'
    },
    get target (): string {
      return 'target:duplicate'
    }
  } as Service
  const step = new DuplicateService(original, duplicate)
  strictEqual(step.type, OptimizationStepType.DuplicateService)
  strictEqual(step.sourceServiceId, original.name)
  strictEqual(step.targetServiceId, duplicate.name)
  strictEqual(step.sourceApplicationName, 'source')
  strictEqual(step.targetApplicationName, 'target')
  strictEqual(
    step.message,
    'Duplicate service "source:original" to "target:duplicate"'
  )
})
