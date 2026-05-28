import { Entity, EntityHooks, Entities as DatabaseEntities, PlatformaticDatabaseConfig, PlatformaticDatabaseMixin } from '@platformatic/db'
import { PlatformaticApplication, PlatformaticServiceConfig } from '@platformatic/service'
import { type FastifyInstance } from 'fastify'

import { type Application } from './application.ts'
import { type ApplicationsConfig } from './applicationsConfig.ts'
import { type ApplicationState } from './applicationState.ts'
import { type Deployment } from './deployment.ts'
import { type Generation } from './generation.ts'
import { type GenerationsApplicationsConfig } from './generationsApplicationsConfig.ts'
import { type GenerationsDeployment } from './generationsDeployment.ts'
import { type Graph } from './graph.ts'
import { type Instance } from './instance.ts'
import { type SkewProtectionPolicy } from './skewProtectionPolicy.ts'
import { type ValkeyUser } from './valkeyUser.ts'
import { type VersionRegistry } from './versionRegistry.ts'

export { type Application } from './application.ts'
export { type ApplicationsConfig } from './applicationsConfig.ts'
export { type ApplicationState } from './applicationState.ts'
export { type Deployment } from './deployment.ts'
export { type Generation } from './generation.ts'
export { type GenerationsApplicationsConfig } from './generationsApplicationsConfig.ts'
export { type GenerationsDeployment } from './generationsDeployment.ts'
export { type Graph } from './graph.ts'
export { type Instance } from './instance.ts'
export { type SkewProtectionPolicy } from './skewProtectionPolicy.ts'
export { type ValkeyUser } from './valkeyUser.ts'
export { type VersionRegistry } from './versionRegistry.ts'

export interface Entities extends DatabaseEntities {
  application: Entity<Application>
  applicationsConfig: Entity<ApplicationsConfig>
  applicationState: Entity<ApplicationState>
  deployment: Entity<Deployment>
  generation: Entity<Generation>
  generationsApplicationsConfig: Entity<GenerationsApplicationsConfig>
  generationsDeployment: Entity<GenerationsDeployment>
  graph: Entity<Graph>
  instance: Entity<Instance>
  skewProtectionPolicy: Entity<SkewProtectionPolicy>
  valkeyUser: Entity<ValkeyUser>
  versionRegistry: Entity<VersionRegistry>
}

export interface EntityTypes {
  application: Application
  applicationsConfig: ApplicationsConfig
  applicationState: ApplicationState
  deployment: Deployment
  generation: Generation
  generationsApplicationsConfig: GenerationsApplicationsConfig
  generationsDeployment: GenerationsDeployment
  graph: Graph
  instance: Instance
  skewProtectionPolicy: SkewProtectionPolicy
  valkeyUser: ValkeyUser
  versionRegistry: VersionRegistry
}

export interface EntitiesHooks {
  addEntityHooks(entityName: 'application', hooks: EntityHooks<Application>): any
  addEntityHooks(entityName: 'applicationsConfig', hooks: EntityHooks<ApplicationsConfig>): any
  addEntityHooks(entityName: 'applicationState', hooks: EntityHooks<ApplicationState>): any
  addEntityHooks(entityName: 'deployment', hooks: EntityHooks<Deployment>): any
  addEntityHooks(entityName: 'generation', hooks: EntityHooks<Generation>): any
  addEntityHooks(entityName: 'generationsApplicationsConfig', hooks: EntityHooks<GenerationsApplicationsConfig>): any
  addEntityHooks(entityName: 'generationsDeployment', hooks: EntityHooks<GenerationsDeployment>): any
  addEntityHooks(entityName: 'graph', hooks: EntityHooks<Graph>): any
  addEntityHooks(entityName: 'instance', hooks: EntityHooks<Instance>): any
  addEntityHooks(entityName: 'skewProtectionPolicy', hooks: EntityHooks<SkewProtectionPolicy>): any
  addEntityHooks(entityName: 'valkeyUser', hooks: EntityHooks<ValkeyUser>): any
  addEntityHooks(entityName: 'versionRegistry', hooks: EntityHooks<VersionRegistry>): any
}

export interface SchemaGetters {
  getSchema(schemaId: 'application'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof Application]: { type: string, nullable?: boolean } },
    required: string[]
  }

getSchema(schemaId: 'applicationsConfig'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof ApplicationsConfig]: { type: string, nullable?: boolean } },
    required: string[]
  }

getSchema(schemaId: 'applicationState'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof ApplicationState]: { type: string, nullable?: boolean } },
    required: string[]
  }

getSchema(schemaId: 'deployment'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof Deployment]: { type: string, nullable?: boolean } },
    required: string[]
  }

getSchema(schemaId: 'generation'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof Generation]: { type: string, nullable?: boolean } },
    required: string[]
  }

getSchema(schemaId: 'generationsApplicationsConfig'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof GenerationsApplicationsConfig]: { type: string, nullable?: boolean } },
    required: string[]
  }

getSchema(schemaId: 'generationsDeployment'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof GenerationsDeployment]: { type: string, nullable?: boolean } },
    required: string[]
  }

getSchema(schemaId: 'graph'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof Graph]: { type: string, nullable?: boolean } },
    required: string[]
  }

getSchema(schemaId: 'instance'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof Instance]: { type: string, nullable?: boolean } },
    required: string[]
  }

getSchema(schemaId: 'skewProtectionPolicy'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof SkewProtectionPolicy]: { type: string, nullable?: boolean } },
    required: string[]
  }

getSchema(schemaId: 'valkeyUser'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof ValkeyUser]: { type: string, nullable?: boolean } },
    required: string[]
  }

getSchema(schemaId: 'versionRegistry'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof VersionRegistry]: { type: string, nullable?: boolean } },
    required: string[]
  }
}

export type ServerInstance<Configuration = PlatformaticDatabaseConfig> = FastifyInstance & {
  platformatic: PlatformaticApplication<Configuration> & PlatformaticDatabaseMixin<Entities> & EntitiesHooks & SchemaGetters
}
