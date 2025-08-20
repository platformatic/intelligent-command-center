import type { App } from './app'
import type { Service } from './service'
import { splitServiceTarget, type ServiceTarget } from './service-link'

export enum OptimizationStepType {
  CreateApplication = 'create-application',
  DeleteApplication = 'delete-application',
  MoveService = 'move-service',
  DuplicateService = 'duplicate-service',
  ChangeUrl = 'change-service'
}

export interface OptimizationStep {
  type: OptimizationStepType
  message: string
}

export class CreateApplication implements OptimizationStep {
  type: OptimizationStepType
  applicationName: string
  message: string

  constructor (app: App) {
    this.type = OptimizationStepType.CreateApplication
    this.applicationName = app.name
    this.message = `Create a new application "${this.applicationName}"`
    Object.freeze(this)
  }
}

export class DeleteApplication implements OptimizationStep {
  type: OptimizationStepType
  applicationName: string
  message: string

  constructor (app: App) {
    this.type = OptimizationStepType.DeleteApplication
    this.applicationName = app.name
    this.message = `Delete application "${this.applicationName}"`
  }
}

export class MoveService implements OptimizationStep {
  type: OptimizationStepType
  sourceServiceId: string
  targetServiceId: string
  sourceApplicationName: string
  targetApplicationName: string
  message: string

  constructor (
    priorTarget: ServiceTarget,
    service: Service,
    sourceApp: App,
    targetApp: App
  ) {
    this.type = OptimizationStepType.MoveService
    this.sourceServiceId = splitServiceTarget(priorTarget)[1]
    this.targetServiceId = service.name
    this.sourceApplicationName = sourceApp.name
    this.targetApplicationName = targetApp.name
    this.message = `Move service "${service.name}" from application ` +
      `"${sourceApp.name}" to "${targetApp.name}"`
  }
}

export class DuplicateService implements OptimizationStep {
  type: OptimizationStepType
  sourceServiceId: string
  targetServiceId: string
  sourceApplicationName: string
  targetApplicationName: string
  message: string

  constructor (original: Service, duplicate: Service) {
    this.type = OptimizationStepType.DuplicateService
    this.sourceServiceId = original.name
    this.targetServiceId = duplicate.name
    this.sourceApplicationName = original.app.name
    this.targetApplicationName = duplicate.app.name
    this.message = `Duplicate service "${original.target}" to "${duplicate.target}"`
  }
}
