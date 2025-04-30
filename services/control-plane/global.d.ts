import type { PlatformaticApp, PlatformaticDBMixin, PlatformaticDBConfig, Entity, Entities, EntityHooks } from '@platformatic/db'
import { EntityTypes, Application,ApplicationState,ApplicationsConfig,Deployment,Generation,GenerationsApplicationsConfig,GenerationsDeployment,Graph,Instance,ValkeyUser } from './types'

declare module 'fastify' {
  interface FastifyInstance {
    getSchema<T extends 'Application' | 'ApplicationState' | 'ApplicationsConfig' | 'Deployment' | 'Generation' | 'GenerationsApplicationsConfig' | 'GenerationsDeployment' | 'Graph' | 'Instance' | 'ValkeyUser'>(schemaId: T): {
      '$id': string,
      title: string,
      description: string,
      type: string,
      properties: {
        [x in keyof EntityTypes[T]]: { type: string, nullable?: boolean }
      },
      required: string[]
    };
  }
}

interface AppEntities extends Entities {
  application: Entity<Application>,
    applicationState: Entity<ApplicationState>,
    applicationsConfig: Entity<ApplicationsConfig>,
    deployment: Entity<Deployment>,
    generation: Entity<Generation>,
    generationsApplicationsConfig: Entity<GenerationsApplicationsConfig>,
    generationsDeployment: Entity<GenerationsDeployment>,
    graph: Entity<Graph>,
    instance: Entity<Instance>,
    valkeyUser: Entity<ValkeyUser>,
}

interface AppEntityHooks {
  addEntityHooks(entityName: 'application', hooks: EntityHooks<Application>): any
    addEntityHooks(entityName: 'applicationState', hooks: EntityHooks<ApplicationState>): any
    addEntityHooks(entityName: 'applicationsConfig', hooks: EntityHooks<ApplicationsConfig>): any
    addEntityHooks(entityName: 'deployment', hooks: EntityHooks<Deployment>): any
    addEntityHooks(entityName: 'generation', hooks: EntityHooks<Generation>): any
    addEntityHooks(entityName: 'generationsApplicationsConfig', hooks: EntityHooks<GenerationsApplicationsConfig>): any
    addEntityHooks(entityName: 'generationsDeployment', hooks: EntityHooks<GenerationsDeployment>): any
    addEntityHooks(entityName: 'graph', hooks: EntityHooks<Graph>): any
    addEntityHooks(entityName: 'instance', hooks: EntityHooks<Instance>): any
    addEntityHooks(entityName: 'valkeyUser', hooks: EntityHooks<ValkeyUser>): any
}

declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<PlatformaticDBConfig> &
      PlatformaticDBMixin<AppEntities> &
      AppEntityHooks
  }
}
