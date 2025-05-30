import { type FastifyReply, type FastifyPluginAsync } from 'fastify'
import { type GetHeadersOptions, type StatusCode1xx, type StatusCode2xx, type StatusCode3xx, type StatusCode4xx, type StatusCode5xx } from '@platformatic/client'
import { type FormData } from 'undici'

declare namespace riskService {
  export type RiskService = {
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getDump(req: GetDumpRequest): Promise<GetDumpResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getHttpCacheIdTraces(req: GetHttpCacheIdTracesRequest): Promise<GetHttpCacheIdTracesResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getLatencies(req: GetLatenciesRequest): Promise<GetLatenciesResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postV1Traces(req: PostV1TracesRequest): Promise<PostV1TracesResponses>;
  }
  export interface RiskServiceOptions {
    url: string
  }
  export const riskService: RiskServicePlugin;
  export { riskService as default };
  export interface FullResponse<T, U extends number> {
    'statusCode': U;
    'headers': Record<string, string>;
    'body': T;
  }

  export type GetDumpRequest = {
    
  }

  export type GetDumpResponseOK = unknown
  export type GetDumpResponses =
    FullResponse<GetDumpResponseOK, 200>

  export type GetHttpCacheIdTracesRequest = {
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetHttpCacheIdTracesResponseOK = { 'services': Array<string>; 'requests': Array<{ 'sourceTelemetryId': string; 'targetTelemetryId': string; 'method': string; 'path': string; 'httpCacheId': string | null }> }
  export type GetHttpCacheIdTracesResponses =
    GetHttpCacheIdTracesResponseOK

  export type GetLatenciesRequest = {
    
  }

  export type GetLatenciesResponseOK = unknown
  export type GetLatenciesResponses =
    FullResponse<GetLatenciesResponseOK, 200>

  export type PostV1TracesRequest = {
    
  }

  export type PostV1TracesResponseOK = unknown
  export type PostV1TracesResponses =
    FullResponse<PostV1TracesResponseOK, 200>

}

type RiskServicePlugin = FastifyPluginAsync<NonNullable<riskService.RiskServiceOptions>>

declare module 'fastify' {
  interface ConfigureRiskService {
    getHeaders(req: FastifyRequest, reply: FastifyReply, options: GetHeadersOptions): Promise<Record<string,string>>;
  }
  interface FastifyInstance {
    configureRiskService(opts: ConfigureRiskService): unknown
  }

  interface FastifyRequest {
    /**
     * Platformatic
     *
     * This is a service built on top of Platformatic
     */
    'riskService': riskService.RiskService;
  }
}

declare function riskService(...params: Parameters<RiskServicePlugin>): ReturnType<RiskServicePlugin>;
export = riskService;
