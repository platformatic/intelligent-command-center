import { Entity, EntityHooks, Entities as DatabaseEntities, PlatformaticDatabaseConfig, PlatformaticDatabaseMixin } from '@platformatic/db'
import { PlatformaticApplication, PlatformaticServiceConfig } from '@platformatic/service'
import { type FastifyInstance } from 'fastify'

import { type InterceptorConfig } from './interceptorConfig.ts'
import { type Recommendation } from './recommendation.ts'
import { type RecommendationsRoute } from './recommendationsRoute.ts'
import { type RouteExample } from './routeExample.ts'

export { type InterceptorConfig } from './interceptorConfig.ts'
export { type Recommendation } from './recommendation.ts'
export { type RecommendationsRoute } from './recommendationsRoute.ts'
export { type RouteExample } from './routeExample.ts'

export interface Entities extends DatabaseEntities {
  interceptorConfig: Entity<InterceptorConfig>
  recommendation: Entity<Recommendation>
  recommendationsRoute: Entity<RecommendationsRoute>
  routeExample: Entity<RouteExample>
}

export interface EntityTypes {
  interceptorConfig: InterceptorConfig
  recommendation: Recommendation
  recommendationsRoute: RecommendationsRoute
  routeExample: RouteExample
}

export interface EntitiesHooks {
  addEntityHooks(entityName: 'interceptorConfig', hooks: EntityHooks<InterceptorConfig>): any
  addEntityHooks(entityName: 'recommendation', hooks: EntityHooks<Recommendation>): any
  addEntityHooks(entityName: 'recommendationsRoute', hooks: EntityHooks<RecommendationsRoute>): any
  addEntityHooks(entityName: 'routeExample', hooks: EntityHooks<RouteExample>): any
}

export interface SchemaGetters {
  getSchema(schemaId: 'interceptorConfig'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof InterceptorConfig]: { type: string, nullable?: boolean } },
    required: string[]
  }

getSchema(schemaId: 'recommendation'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof Recommendation]: { type: string, nullable?: boolean } },
    required: string[]
  }

getSchema(schemaId: 'recommendationsRoute'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof RecommendationsRoute]: { type: string, nullable?: boolean } },
    required: string[]
  }

getSchema(schemaId: 'routeExample'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof RouteExample]: { type: string, nullable?: boolean } },
    required: string[]
  }
}

export type ServerInstance<Configuration = PlatformaticDatabaseConfig> = FastifyInstance & {
  platformatic: PlatformaticApplication<Configuration> & PlatformaticDatabaseMixin<Entities> & EntitiesHooks & SchemaGetters
}
