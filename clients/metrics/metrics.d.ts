import { type FastifyReply, type FastifyPluginAsync } from 'fastify'
import { type GetHeadersOptions, type StatusCode1xx, type StatusCode2xx, type StatusCode3xx, type StatusCode4xx, type StatusCode5xx } from '@platformatic/client'
import { type FormData } from 'undici'

declare namespace metrics {
  export type Metrics = {
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getAppsAppIdMem(req: GetAppsAppIdMemRequest): Promise<GetAppsAppIdMemResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getAppsAppIdCpu(req: GetAppsAppIdCpuRequest): Promise<GetAppsAppIdCpuResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getAppsAppIdLatency(req: GetAppsAppIdLatencyRequest): Promise<GetAppsAppIdLatencyResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getAppsAppIdPodsPodIdMem(req: GetAppsAppIdPodsPodIdMemRequest): Promise<GetAppsAppIdPodsPodIdMemResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getAppsAppIdPodsPodIdCpu(req: GetAppsAppIdPodsPodIdCpuRequest): Promise<GetAppsAppIdPodsPodIdCpuResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getAppsAppIdPodsPodId(req: GetAppsAppIdPodsPodIdRequest): Promise<GetAppsAppIdPodsPodIdResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getAppsAppIdPodsPodIdServicesServiceId(req: GetAppsAppIdPodsPodIdServicesServiceIdRequest): Promise<GetAppsAppIdPodsPodIdServicesServiceIdResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postServicesMetrics(req: PostServicesMetricsRequest): Promise<PostServicesMetricsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getCacheAppsAppId(req: GetCacheAppsAppIdRequest): Promise<GetCacheAppsAppIdResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getCache(req: GetCacheRequest): Promise<GetCacheResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getAppsAppIdJobs(req: GetAppsAppIdJobsRequest): Promise<GetAppsAppIdJobsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getJobsJobId(req: GetJobsJobIdRequest): Promise<GetJobsJobIdResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getKubernetesAppsAppId(req: GetKubernetesAppsAppIdRequest): Promise<GetKubernetesAppsAppIdResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getKubernetesAppsAppIdRps(req: GetKubernetesAppsAppIdRpsRequest): Promise<GetKubernetesAppsAppIdRpsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getKubernetesInfra(req: GetKubernetesInfraRequest): Promise<GetKubernetesInfraResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postServices(req: PostServicesRequest): Promise<PostServicesResponses>;
  }
  export interface MetricsOptions {
    url: string
  }
  export const metrics: MetricsPlugin;
  export { metrics as default };
  export interface FullResponse<T, U extends number> {
    'statusCode': U;
    'headers': Record<string, string>;
    'body': T;
  }

  export type GetAppsAppIdMemRequest = {
    'appId': string;
  }

  export type GetAppsAppIdMemResponseOK = unknown
  export type GetAppsAppIdMemResponses =
    FullResponse<GetAppsAppIdMemResponseOK, 200>

  export type GetAppsAppIdCpuRequest = {
    'appId': string;
  }

  export type GetAppsAppIdCpuResponseOK = unknown
  export type GetAppsAppIdCpuResponses =
    FullResponse<GetAppsAppIdCpuResponseOK, 200>

  export type GetAppsAppIdLatencyRequest = {
    'appId': string;
  }

  export type GetAppsAppIdLatencyResponseOK = unknown
  export type GetAppsAppIdLatencyResponses =
    FullResponse<GetAppsAppIdLatencyResponseOK, 200>

  export type GetAppsAppIdPodsPodIdMemRequest = {
    'appId': string;
    'podId': string;
  }

  export type GetAppsAppIdPodsPodIdMemResponseOK = unknown
  export type GetAppsAppIdPodsPodIdMemResponses =
    FullResponse<GetAppsAppIdPodsPodIdMemResponseOK, 200>

  export type GetAppsAppIdPodsPodIdCpuRequest = {
    'appId': string;
    'podId': string;
  }

  export type GetAppsAppIdPodsPodIdCpuResponseOK = unknown
  export type GetAppsAppIdPodsPodIdCpuResponses =
    FullResponse<GetAppsAppIdPodsPodIdCpuResponseOK, 200>

  export type GetAppsAppIdPodsPodIdRequest = {
    'appId': string;
    'podId': string;
  }

  export type GetAppsAppIdPodsPodIdResponseOK = unknown
  export type GetAppsAppIdPodsPodIdResponses =
    FullResponse<GetAppsAppIdPodsPodIdResponseOK, 200>

  export type GetAppsAppIdPodsPodIdServicesServiceIdRequest = {
    'appId': string;
    'podId': string;
    'serviceId': string;
  }

  export type GetAppsAppIdPodsPodIdServicesServiceIdResponseOK = unknown
  export type GetAppsAppIdPodsPodIdServicesServiceIdResponses =
    FullResponse<GetAppsAppIdPodsPodIdServicesServiceIdResponseOK, 200>

  export type PostServicesMetricsRequest = {
    'start'?: string | Date;
    'end'?: string | Date;
    'applications': Array<{ 'applicationId'?: string; 'services'?: Array<{ 'serviceId': string }> }>;
  }

  /**
   * Default Response
   */
  export type PostServicesMetricsResponseOK = { 'applications'?: Array<{ 'appId'?: string; 'services'?: Array<{ 'serviceId'?: string; 'cpu'?: number; 'heap'?: number; 'loop'?: number }> }> }
  export type PostServicesMetricsResponses =
    PostServicesMetricsResponseOK

  export type GetCacheAppsAppIdRequest = {
    'appId': string;
  }

  export type GetCacheAppsAppIdResponseOK = unknown
  export type GetCacheAppsAppIdResponses =
    FullResponse<GetCacheAppsAppIdResponseOK, 200>

  export type GetCacheRequest = {
    
  }

  export type GetCacheResponseOK = unknown
  export type GetCacheResponses =
    FullResponse<GetCacheResponseOK, 200>

  export type GetAppsAppIdJobsRequest = {
    'appId': string;
  }

  /**
   * Default Response
   */
  export type GetAppsAppIdJobsResponseOK = { 'averageExecutionTime'?: number; 'successes'?: number; 'failures'?: number; 'sentMessages'?: number; 'totalRetries'?: number }
  export type GetAppsAppIdJobsResponses =
    GetAppsAppIdJobsResponseOK

  export type GetJobsJobIdRequest = {
    'jobId': string;
  }

  /**
   * Default Response
   */
  export type GetJobsJobIdResponseOK = { 'averageExecutionTime'?: number; 'successes'?: number; 'failures'?: number; 'sentMessages'?: number; 'totalRetries'?: number }
  export type GetJobsJobIdResponses =
    GetJobsJobIdResponseOK

  export type GetKubernetesAppsAppIdRequest = {
    'appId': string;
  }

  export type GetKubernetesAppsAppIdResponseOK = unknown
  export type GetKubernetesAppsAppIdResponses =
    FullResponse<GetKubernetesAppsAppIdResponseOK, 200>

  export type GetKubernetesAppsAppIdRpsRequest = {
    'appId': string;
  }

  export type GetKubernetesAppsAppIdRpsResponseOK = unknown
  export type GetKubernetesAppsAppIdRpsResponses =
    FullResponse<GetKubernetesAppsAppIdRpsResponseOK, 200>

  export type GetKubernetesInfraRequest = {
    
  }

  export type GetKubernetesInfraResponseOK = unknown
  export type GetKubernetesInfraResponses =
    FullResponse<GetKubernetesInfraResponseOK, 200>

  export type PostServicesRequest = {
    'applications': Array<{ 'id'?: string; 'name'?: string }>;
    'start'?: string | Date;
    'end'?: string | Date;
  }

  /**
   * Default Response
   */
  export type PostServicesResponseOK = { 'averageCallsCount'?: number; 'overall50pLatency'?: number; 'overall95pLatency'?: number; 'servicesLinks'?: Record<string, unknown> }
  export type PostServicesResponses =
    PostServicesResponseOK

}

type MetricsPlugin = FastifyPluginAsync<NonNullable<metrics.MetricsOptions>>

declare module 'fastify' {
  interface ConfigureMetrics {
    getHeaders(req: FastifyRequest, reply: FastifyReply, options: GetHeadersOptions): Promise<Record<string,string>>;
  }
  interface FastifyInstance {
    configureMetrics(opts: ConfigureMetrics): unknown
  }

  interface FastifyRequest {
    /**
     * Platformatic
     *
     * This is a service built on top of Platformatic
     */
    'metrics': metrics.Metrics;
  }
}

declare function metrics(...params: Parameters<MetricsPlugin>): ReturnType<MetricsPlugin>;
export = metrics;
