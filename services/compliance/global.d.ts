import type { PlatformaticApp, PlatformaticDBMixin, PlatformaticDBConfig, Entity, Entities, EntityHooks } from '@platformatic/db'
import { EntityTypes, Metadatum,Report,Rule,RuleConfig } from './types'

declare module 'fastify' {
  interface FastifyInstance {
    getSchema<T extends 'Metadatum' | 'Report' | 'Rule' | 'RuleConfig'>(schemaId: T): {
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
  metadatum: Entity<Metadatum>,
    report: Entity<Report>,
    rule: Entity<Rule>,
    ruleConfig: Entity<RuleConfig>,
}

interface AppEntityHooks {
  addEntityHooks(entityName: 'metadatum', hooks: EntityHooks<Metadatum>): any
    addEntityHooks(entityName: 'report', hooks: EntityHooks<Report>): any
    addEntityHooks(entityName: 'rule', hooks: EntityHooks<Rule>): any
    addEntityHooks(entityName: 'ruleConfig', hooks: EntityHooks<RuleConfig>): any
}

declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<PlatformaticDBConfig> &
      PlatformaticDBMixin<AppEntities> &
      AppEntityHooks
  }
}
