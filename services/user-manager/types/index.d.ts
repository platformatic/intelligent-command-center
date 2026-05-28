import { Entity, EntityHooks, Entities as DatabaseEntities, PlatformaticDatabaseConfig, PlatformaticDatabaseMixin } from '@platformatic/db'
import { PlatformaticApplication, PlatformaticServiceConfig } from '@platformatic/service'
import { type FastifyInstance } from 'fastify'

import { type User } from './user.ts'

export { type User } from './user.ts'

export interface Entities extends DatabaseEntities {
  user: Entity<User>
}

export interface EntityTypes {
  user: User
}

export interface EntitiesHooks {
  addEntityHooks(entityName: 'user', hooks: EntityHooks<User>): any
}

export interface SchemaGetters {
  getSchema(schemaId: 'user'): {
    '$id': string,
    title: string,
    description: string,
    type: string,
    properties: { [x in keyof User]: { type: string, nullable?: boolean } },
    required: string[]
  }
}

export type ServerInstance<Configuration = PlatformaticDatabaseConfig> = FastifyInstance & {
  platformatic: PlatformaticApplication<Configuration> & PlatformaticDatabaseMixin<Entities> & EntitiesHooks & SchemaGetters
}
