/// <reference path="./clients/package-manager/package-manager.d.ts" />

import { FastifyInstance } from 'fastify'
import { PlatformaticApp, PlatformaticServiceConfig } from '@platformatic/service'

declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<PlatformaticServiceConfig>
  }
}
