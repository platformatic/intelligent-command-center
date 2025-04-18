import { type FastifyReply, type FastifyPluginAsync } from 'fastify'
import { type GetHeadersOptions, type StatusCode1xx, type StatusCode2xx, type StatusCode3xx, type StatusCode4xx, type StatusCode5xx } from '@platformatic/client'
import { type FormData } from 'undici'

declare namespace updates {
  export type Updates = {
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getWs(req: GetWsRequest): Promise<GetWsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postEvents(req: PostEventsRequest): Promise<PostEventsResponses>;
  }
  export interface UpdatesOptions {
    url: string
  }
  export const updates: UpdatesPlugin;
  export { updates as default };
  export interface FullResponse<T, U extends number> {
    'statusCode': U;
    'headers': Record<string, string>;
    'body': T;
  }

  export type GetWsRequest = {
    
  }

  export type GetWsResponseOK = unknown
  export type GetWsResponses =
    FullResponse<GetWsResponseOK, 200>

  export type PostEventsRequest = {
    'topic': string;
    'data': object;
  }

  export type PostEventsResponseOK = unknown
  export type PostEventsResponses =
    FullResponse<PostEventsResponseOK, 200>

}

type UpdatesPlugin = FastifyPluginAsync<NonNullable<updates.UpdatesOptions>>

declare module 'fastify' {
  interface ConfigureUpdates {
    getHeaders(req: FastifyRequest, reply: FastifyReply, options: GetHeadersOptions): Promise<Record<string,string>>;
  }
  interface FastifyInstance {
    configureUpdates(opts: ConfigureUpdates): unknown
  }

  interface FastifyRequest {
    /**
     * Platformatic
     *
     * This is a service built on top of Platformatic
     */
    'updates': updates.Updates;
  }
}

declare function updates(...params: Parameters<UpdatesPlugin>): ReturnType<UpdatesPlugin>;
export = updates;
