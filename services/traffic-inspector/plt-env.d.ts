import { PlatformaticApplication, PlatformaticDatabaseConfig, PlatformaticDatabaseMixin } from "@platformatic/db";
import { Entities, EntitiesHooks, SchemaGetters } from "./types/index.js";

declare module "fastify" {
  interface FastifyInstance {
    platformatic: PlatformaticApplication<PlatformaticDatabaseConfig> & PlatformaticDatabaseMixin<Entities> & EntitiesHooks & SchemaGetters;
  }
}
