import type { PlatformaticApp, PlatformaticDBMixin, PlatformaticDBConfig, Entity, Entities, EntityHooks } from '@platformatic/db'
import { EntityTypes, Application,ApplicationState,ApplicationsConfig,Deployment,DetectedPod,Generation,GenerationsApplicationsConfig,GenerationsDeployment,Graph } from './types'

declare module 'fastify' {
  interface FastifyInstance {
    getSchema<T extends 'Application' | 'ApplicationState' | 'ApplicationsConfig' | 'Deployment' | 'DetectedPod' | 'Generation' | 'GenerationsApplicationsConfig' | 'GenerationsDeployment' | 'Graph'>(schemaId: T): {
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
    detectedPod: Entity<DetectedPod>,
    generation: Entity<Generation>,
    generationsApplicationsConfig: Entity<GenerationsApplicationsConfig>,
    generationsDeployment: Entity<GenerationsDeployment>,
    graph: Entity<Graph>,
}

interface AppEntityHooks {
  addEntityHooks(entityName: 'application', hooks: EntityHooks<Application>): any
    addEntityHooks(entityName: 'applicationState', hooks: EntityHooks<ApplicationState>): any
    addEntityHooks(entityName: 'applicationsConfig', hooks: EntityHooks<ApplicationsConfig>): any
    addEntityHooks(entityName: 'deployment', hooks: EntityHooks<Deployment>): any
    addEntityHooks(entityName: 'detectedPod', hooks: EntityHooks<DetectedPod>): any
    addEntityHooks(entityName: 'generation', hooks: EntityHooks<Generation>): any
    addEntityHooks(entityName: 'generationsApplicationsConfig', hooks: EntityHooks<GenerationsApplicationsConfig>): any
    addEntityHooks(entityName: 'generationsDeployment', hooks: EntityHooks<GenerationsDeployment>): any
    addEntityHooks(entityName: 'graph', hooks: EntityHooks<Graph>): any
}

declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<PlatformaticDBConfig> &
      PlatformaticDBMixin<AppEntities> &
      AppEntityHooks
  }
}
