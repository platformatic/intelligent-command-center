import { FastifyInstance } from 'fastify'
import { PlatformaticPgHooksConfig, PlatformaticApp } from '@platformatic/pg-hooks'
  
declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<PlatformaticPgHooksConfig>
  }
}
