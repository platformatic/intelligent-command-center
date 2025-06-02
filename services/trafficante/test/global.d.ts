import type { PlatformaticApp, PlatformaticDBMixin, PlatformaticDBConfig, Entity, Entities, EntityHooks } from '@platformatic/db'
import { EntityTypes, InterceptorConfig,Recommendation,RecommendationsRoute,RouteExample } from './types'

declare module 'fastify' {
  interface FastifyInstance {
    getSchema<T extends 'InterceptorConfig' | 'Recommendation' | 'RecommendationsRoute' | 'RouteExample'>(schemaId: T): {
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
  interceptorConfig: Entity<InterceptorConfig>,
    recommendation: Entity<Recommendation>,
    recommendationsRoute: Entity<RecommendationsRoute>,
    routeExample: Entity<RouteExample>,
}

interface AppEntityHooks {
  addEntityHooks(entityName: 'interceptorConfig', hooks: EntityHooks<InterceptorConfig>): any
    addEntityHooks(entityName: 'recommendation', hooks: EntityHooks<Recommendation>): any
    addEntityHooks(entityName: 'recommendationsRoute', hooks: EntityHooks<RecommendationsRoute>): any
    addEntityHooks(entityName: 'routeExample', hooks: EntityHooks<RouteExample>): any
}

declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<PlatformaticDBConfig> &
      PlatformaticDBMixin<AppEntities> &
      AppEntityHooks
  }
}
