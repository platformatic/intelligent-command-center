import { type FastifyReply, type FastifyPluginAsync } from 'fastify'
import { type GetHeadersOptions, type StatusCode1xx, type StatusCode2xx, type StatusCode3xx, type StatusCode4xx, type StatusCode5xx } from '@platformatic/client'
import { type FormData } from 'undici'

declare namespace scaler {
  export type Scaler = {
    /**
     * Get applicationScaleConfigs.
     *
     * Fetch applicationScaleConfigs from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationScaleConfigs(req: GetApplicationScaleConfigsRequest): Promise<GetApplicationScaleConfigsResponses>;
    /**
     * Create applicationScaleConfig.
     *
     * Add new applicationScaleConfig to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createApplicationScaleConfig(req: CreateApplicationScaleConfigRequest): Promise<CreateApplicationScaleConfigResponses>;
    /**
     * Update applicationScaleConfigs.
     *
     * Update one or more applicationScaleConfigs in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateApplicationScaleConfigs(req: UpdateApplicationScaleConfigsRequest): Promise<UpdateApplicationScaleConfigsResponses>;
    /**
     * Get ApplicationScaleConfig by id.
     *
     * Fetch ApplicationScaleConfig using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationScaleConfigById(req: GetApplicationScaleConfigByIdRequest): Promise<GetApplicationScaleConfigByIdResponses>;
    /**
     * Update applicationScaleConfig.
     *
     * Update applicationScaleConfig in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateApplicationScaleConfig(req: UpdateApplicationScaleConfigRequest): Promise<UpdateApplicationScaleConfigResponses>;
    /**
     * Delete applicationScaleConfigs.
     *
     * Delete one or more applicationScaleConfigs from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteApplicationScaleConfigs(req: DeleteApplicationScaleConfigsRequest): Promise<DeleteApplicationScaleConfigsResponses>;
    /**
     * Get controllers.
     *
     * Fetch controllers from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getControllers(req: GetControllersRequest): Promise<GetControllersResponses>;
    /**
     * Update controllers.
     *
     * Update one or more controllers in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateControllers(req: UpdateControllersRequest): Promise<UpdateControllersResponses>;
    /**
     * Get Controller by id.
     *
     * Fetch Controller using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getControllerById(req: GetControllerByIdRequest): Promise<GetControllerByIdResponses>;
    /**
     * Update controller.
     *
     * Update controller in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateController(req: UpdateControllerRequest): Promise<UpdateControllerResponses>;
    /**
     * Delete controllers.
     *
     * Delete one or more controllers from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteControllers(req: DeleteControllersRequest): Promise<DeleteControllersResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postAlerts(req: PostAlertsRequest): Promise<PostAlertsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    savePodController(req: SavePodControllerRequest): Promise<SavePodControllerResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationsApplicationIdScaleConfigs(req: GetApplicationsApplicationIdScaleConfigsRequest): Promise<GetApplicationsApplicationIdScaleConfigsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postApplicationsApplicationIdScaleConfigs(req: PostApplicationsApplicationIdScaleConfigsRequest): Promise<PostApplicationsApplicationIdScaleConfigsResponses>;
  }
  export interface ScalerOptions {
    url: string
  }
  export const scaler: ScalerPlugin;
  export { scaler as default };
  export interface FullResponse<T, U extends number> {
    'statusCode': U;
    'headers': Record<string, string>;
    'body': T;
  }

  export type GetApplicationScaleConfigsRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    /**
     * Include cursor headers in response. Cursor keys built from orderBy clause
     */
    'cursor'?: boolean;
    /**
     * Cursor for forward pagination. List objects after this cursor position
     */
    'startAfter'?: string;
    /**
     * Cursor for backward pagination. List objects before this cursor position
     */
    'endBefore'?: string;
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'maxPods' | 'minPods'>;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.maxPods.eq'?: number;
    'where.maxPods.neq'?: number;
    'where.maxPods.gt'?: number;
    'where.maxPods.gte'?: number;
    'where.maxPods.lt'?: number;
    'where.maxPods.lte'?: number;
    'where.maxPods.like'?: number;
    'where.maxPods.ilike'?: number;
    'where.maxPods.in'?: string;
    'where.maxPods.nin'?: string;
    'where.maxPods.contains'?: string;
    'where.maxPods.contained'?: string;
    'where.maxPods.overlaps'?: string;
    'where.minPods.eq'?: number;
    'where.minPods.neq'?: number;
    'where.minPods.gt'?: number;
    'where.minPods.gte'?: number;
    'where.minPods.lt'?: number;
    'where.minPods.lte'?: number;
    'where.minPods.like'?: number;
    'where.minPods.ilike'?: number;
    'where.minPods.in'?: string;
    'where.minPods.nin'?: string;
    'where.minPods.contains'?: string;
    'where.minPods.contained'?: string;
    'where.minPods.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.maxPods'?: 'asc' | 'desc';
    'orderby.minPods'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetApplicationScaleConfigsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'minPods'?: number | null; 'maxPods'?: number | null; 'createdAt'?: string | null }>
  export type GetApplicationScaleConfigsResponses =
    GetApplicationScaleConfigsResponseOK

  export type CreateApplicationScaleConfigRequest = {
    'id'?: string;
    'applicationId': string;
    'minPods': number;
    'maxPods': number;
    'createdAt'?: string | null;
  }

  /**
   * A ApplicationScaleConfig
   */
  export type CreateApplicationScaleConfigResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'minPods'?: number | null; 'maxPods'?: number | null; 'createdAt'?: string | null }
  export type CreateApplicationScaleConfigResponses =
    CreateApplicationScaleConfigResponseOK

  export type UpdateApplicationScaleConfigsRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'maxPods' | 'minPods'>;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.maxPods.eq'?: number;
    'where.maxPods.neq'?: number;
    'where.maxPods.gt'?: number;
    'where.maxPods.gte'?: number;
    'where.maxPods.lt'?: number;
    'where.maxPods.lte'?: number;
    'where.maxPods.like'?: number;
    'where.maxPods.ilike'?: number;
    'where.maxPods.in'?: string;
    'where.maxPods.nin'?: string;
    'where.maxPods.contains'?: string;
    'where.maxPods.contained'?: string;
    'where.maxPods.overlaps'?: string;
    'where.minPods.eq'?: number;
    'where.minPods.neq'?: number;
    'where.minPods.gt'?: number;
    'where.minPods.gte'?: number;
    'where.minPods.lt'?: number;
    'where.minPods.lte'?: number;
    'where.minPods.like'?: number;
    'where.minPods.ilike'?: number;
    'where.minPods.in'?: string;
    'where.minPods.nin'?: string;
    'where.minPods.contains'?: string;
    'where.minPods.contained'?: string;
    'where.minPods.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'applicationId': string;
    'minPods': number;
    'maxPods': number;
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateApplicationScaleConfigsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'minPods'?: number | null; 'maxPods'?: number | null; 'createdAt'?: string | null }>
  export type UpdateApplicationScaleConfigsResponses =
    UpdateApplicationScaleConfigsResponseOK

  export type GetApplicationScaleConfigByIdRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'maxPods' | 'minPods'>;
    'id': string;
  }

  /**
   * A ApplicationScaleConfig
   */
  export type GetApplicationScaleConfigByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'minPods'?: number | null; 'maxPods'?: number | null; 'createdAt'?: string | null }
  export type GetApplicationScaleConfigByIdResponses =
    GetApplicationScaleConfigByIdResponseOK

  export type UpdateApplicationScaleConfigRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'maxPods' | 'minPods'>;
    'id': string;
    'applicationId': string;
    'minPods': number;
    'maxPods': number;
    'createdAt'?: string | null;
  }

  /**
   * A ApplicationScaleConfig
   */
  export type UpdateApplicationScaleConfigResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'minPods'?: number | null; 'maxPods'?: number | null; 'createdAt'?: string | null }
  export type UpdateApplicationScaleConfigResponses =
    UpdateApplicationScaleConfigResponseOK

  export type DeleteApplicationScaleConfigsRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'maxPods' | 'minPods'>;
    'id': string;
  }

  /**
   * A ApplicationScaleConfig
   */
  export type DeleteApplicationScaleConfigsResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'minPods'?: number | null; 'maxPods'?: number | null; 'createdAt'?: string | null }
  export type DeleteApplicationScaleConfigsResponses =
    DeleteApplicationScaleConfigsResponseOK

  export type GetControllersRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    /**
     * Include cursor headers in response. Cursor keys built from orderBy clause
     */
    'cursor'?: boolean;
    /**
     * Cursor for forward pagination. List objects after this cursor position
     */
    'startAfter'?: string;
    /**
     * Cursor for backward pagination. List objects before this cursor position
     */
    'endBefore'?: string;
    'fields'?: Array<'apiVersion' | 'applicationId' | 'controllerId' | 'createdAt' | 'deploymentId' | 'id' | 'kind' | 'namespace' | 'replicas'>;
    'where.apiVersion.eq'?: string;
    'where.apiVersion.neq'?: string;
    'where.apiVersion.gt'?: string;
    'where.apiVersion.gte'?: string;
    'where.apiVersion.lt'?: string;
    'where.apiVersion.lte'?: string;
    'where.apiVersion.like'?: string;
    'where.apiVersion.ilike'?: string;
    'where.apiVersion.in'?: string;
    'where.apiVersion.nin'?: string;
    'where.apiVersion.contains'?: string;
    'where.apiVersion.contained'?: string;
    'where.apiVersion.overlaps'?: string;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.controllerId.eq'?: string;
    'where.controllerId.neq'?: string;
    'where.controllerId.gt'?: string;
    'where.controllerId.gte'?: string;
    'where.controllerId.lt'?: string;
    'where.controllerId.lte'?: string;
    'where.controllerId.like'?: string;
    'where.controllerId.ilike'?: string;
    'where.controllerId.in'?: string;
    'where.controllerId.nin'?: string;
    'where.controllerId.contains'?: string;
    'where.controllerId.contained'?: string;
    'where.controllerId.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.deploymentId.eq'?: string;
    'where.deploymentId.neq'?: string;
    'where.deploymentId.gt'?: string;
    'where.deploymentId.gte'?: string;
    'where.deploymentId.lt'?: string;
    'where.deploymentId.lte'?: string;
    'where.deploymentId.like'?: string;
    'where.deploymentId.ilike'?: string;
    'where.deploymentId.in'?: string;
    'where.deploymentId.nin'?: string;
    'where.deploymentId.contains'?: string;
    'where.deploymentId.contained'?: string;
    'where.deploymentId.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.kind.eq'?: string;
    'where.kind.neq'?: string;
    'where.kind.gt'?: string;
    'where.kind.gte'?: string;
    'where.kind.lt'?: string;
    'where.kind.lte'?: string;
    'where.kind.like'?: string;
    'where.kind.ilike'?: string;
    'where.kind.in'?: string;
    'where.kind.nin'?: string;
    'where.kind.contains'?: string;
    'where.kind.contained'?: string;
    'where.kind.overlaps'?: string;
    'where.namespace.eq'?: string;
    'where.namespace.neq'?: string;
    'where.namespace.gt'?: string;
    'where.namespace.gte'?: string;
    'where.namespace.lt'?: string;
    'where.namespace.lte'?: string;
    'where.namespace.like'?: string;
    'where.namespace.ilike'?: string;
    'where.namespace.in'?: string;
    'where.namespace.nin'?: string;
    'where.namespace.contains'?: string;
    'where.namespace.contained'?: string;
    'where.namespace.overlaps'?: string;
    'where.replicas.eq'?: number;
    'where.replicas.neq'?: number;
    'where.replicas.gt'?: number;
    'where.replicas.gte'?: number;
    'where.replicas.lt'?: number;
    'where.replicas.lte'?: number;
    'where.replicas.like'?: number;
    'where.replicas.ilike'?: number;
    'where.replicas.in'?: string;
    'where.replicas.nin'?: string;
    'where.replicas.contains'?: string;
    'where.replicas.contained'?: string;
    'where.replicas.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.apiVersion'?: 'asc' | 'desc';
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.controllerId'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.deploymentId'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.kind'?: 'asc' | 'desc';
    'orderby.namespace'?: 'asc' | 'desc';
    'orderby.replicas'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetControllersResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'namespace'?: string | null; 'controllerId'?: string | null; 'kind'?: string | null; 'apiVersion'?: string | null; 'replicas'?: number | null; 'createdAt'?: string | null }>
  export type GetControllersResponses =
    GetControllersResponseOK

  export type UpdateControllersRequest = {
    'fields'?: Array<'apiVersion' | 'applicationId' | 'controllerId' | 'createdAt' | 'deploymentId' | 'id' | 'kind' | 'namespace' | 'replicas'>;
    'where.apiVersion.eq'?: string;
    'where.apiVersion.neq'?: string;
    'where.apiVersion.gt'?: string;
    'where.apiVersion.gte'?: string;
    'where.apiVersion.lt'?: string;
    'where.apiVersion.lte'?: string;
    'where.apiVersion.like'?: string;
    'where.apiVersion.ilike'?: string;
    'where.apiVersion.in'?: string;
    'where.apiVersion.nin'?: string;
    'where.apiVersion.contains'?: string;
    'where.apiVersion.contained'?: string;
    'where.apiVersion.overlaps'?: string;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.controllerId.eq'?: string;
    'where.controllerId.neq'?: string;
    'where.controllerId.gt'?: string;
    'where.controllerId.gte'?: string;
    'where.controllerId.lt'?: string;
    'where.controllerId.lte'?: string;
    'where.controllerId.like'?: string;
    'where.controllerId.ilike'?: string;
    'where.controllerId.in'?: string;
    'where.controllerId.nin'?: string;
    'where.controllerId.contains'?: string;
    'where.controllerId.contained'?: string;
    'where.controllerId.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.deploymentId.eq'?: string;
    'where.deploymentId.neq'?: string;
    'where.deploymentId.gt'?: string;
    'where.deploymentId.gte'?: string;
    'where.deploymentId.lt'?: string;
    'where.deploymentId.lte'?: string;
    'where.deploymentId.like'?: string;
    'where.deploymentId.ilike'?: string;
    'where.deploymentId.in'?: string;
    'where.deploymentId.nin'?: string;
    'where.deploymentId.contains'?: string;
    'where.deploymentId.contained'?: string;
    'where.deploymentId.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.kind.eq'?: string;
    'where.kind.neq'?: string;
    'where.kind.gt'?: string;
    'where.kind.gte'?: string;
    'where.kind.lt'?: string;
    'where.kind.lte'?: string;
    'where.kind.like'?: string;
    'where.kind.ilike'?: string;
    'where.kind.in'?: string;
    'where.kind.nin'?: string;
    'where.kind.contains'?: string;
    'where.kind.contained'?: string;
    'where.kind.overlaps'?: string;
    'where.namespace.eq'?: string;
    'where.namespace.neq'?: string;
    'where.namespace.gt'?: string;
    'where.namespace.gte'?: string;
    'where.namespace.lt'?: string;
    'where.namespace.lte'?: string;
    'where.namespace.like'?: string;
    'where.namespace.ilike'?: string;
    'where.namespace.in'?: string;
    'where.namespace.nin'?: string;
    'where.namespace.contains'?: string;
    'where.namespace.contained'?: string;
    'where.namespace.overlaps'?: string;
    'where.replicas.eq'?: number;
    'where.replicas.neq'?: number;
    'where.replicas.gt'?: number;
    'where.replicas.gte'?: number;
    'where.replicas.lt'?: number;
    'where.replicas.lte'?: number;
    'where.replicas.like'?: number;
    'where.replicas.ilike'?: number;
    'where.replicas.in'?: string;
    'where.replicas.nin'?: string;
    'where.replicas.contains'?: string;
    'where.replicas.contained'?: string;
    'where.replicas.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'applicationId': string;
    'deploymentId': string;
    'namespace': string;
    'controllerId': string;
    'kind': string;
    'apiVersion': string;
    'replicas': number;
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateControllersResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'namespace'?: string | null; 'controllerId'?: string | null; 'kind'?: string | null; 'apiVersion'?: string | null; 'replicas'?: number | null; 'createdAt'?: string | null }>
  export type UpdateControllersResponses =
    UpdateControllersResponseOK

  export type GetControllerByIdRequest = {
    'fields'?: Array<'apiVersion' | 'applicationId' | 'controllerId' | 'createdAt' | 'deploymentId' | 'id' | 'kind' | 'namespace' | 'replicas'>;
    'id': string;
  }

  /**
   * A Controller
   */
  export type GetControllerByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'namespace'?: string | null; 'controllerId'?: string | null; 'kind'?: string | null; 'apiVersion'?: string | null; 'replicas'?: number | null; 'createdAt'?: string | null }
  export type GetControllerByIdResponses =
    GetControllerByIdResponseOK

  export type UpdateControllerRequest = {
    'fields'?: Array<'apiVersion' | 'applicationId' | 'controllerId' | 'createdAt' | 'deploymentId' | 'id' | 'kind' | 'namespace' | 'replicas'>;
    'id': string;
    'applicationId': string;
    'deploymentId': string;
    'namespace': string;
    'controllerId': string;
    'kind': string;
    'apiVersion': string;
    'replicas': number;
    'createdAt'?: string | null;
  }

  /**
   * A Controller
   */
  export type UpdateControllerResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'namespace'?: string | null; 'controllerId'?: string | null; 'kind'?: string | null; 'apiVersion'?: string | null; 'replicas'?: number | null; 'createdAt'?: string | null }
  export type UpdateControllerResponses =
    UpdateControllerResponseOK

  export type DeleteControllersRequest = {
    'fields'?: Array<'apiVersion' | 'applicationId' | 'controllerId' | 'createdAt' | 'deploymentId' | 'id' | 'kind' | 'namespace' | 'replicas'>;
    'id': string;
  }

  /**
   * A Controller
   */
  export type DeleteControllersResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'namespace'?: string | null; 'controllerId'?: string | null; 'kind'?: string | null; 'apiVersion'?: string | null; 'replicas'?: number | null; 'createdAt'?: string | null }
  export type DeleteControllersResponses =
    DeleteControllersResponseOK

  export type PostAlertsRequest = {
    'id': string;
    'service': string;
    'currentHealth': { 'elu'?: number; 'heapUsed'?: number; 'heapTotal'?: number };
    'unhealthy': boolean;
    'healthConfig': { 'enabled'?: boolean; 'interval'?: number; 'gracePeriod'?: number; 'maxUnhealthyChecks'?: number; 'maxELU'?: number; 'maxHeapUsed'?: number; 'maxHeapTotal'?: number };
  }

  export type PostAlertsResponseOK = unknown
  export type PostAlertsResponses =
    FullResponse<PostAlertsResponseOK, 200>

  export type SavePodControllerRequest = {
    'applicationId': string;
    'deploymentId': string;
    'namespace': string;
    'podId': string;
  }

  export type SavePodControllerResponseOK = unknown
  export type SavePodControllerResponses =
    FullResponse<SavePodControllerResponseOK, 200>

  export type GetApplicationsApplicationIdScaleConfigsRequest = {
    'applicationId': string;
  }

  export type GetApplicationsApplicationIdScaleConfigsResponseOK = unknown
  export type GetApplicationsApplicationIdScaleConfigsResponses =
    FullResponse<GetApplicationsApplicationIdScaleConfigsResponseOK, 200>

  export type PostApplicationsApplicationIdScaleConfigsRequest = {
    'applicationId': string;
    'minPods': number;
    'maxPods': number;
  }

  export type PostApplicationsApplicationIdScaleConfigsResponseOK = unknown
  export type PostApplicationsApplicationIdScaleConfigsResponses =
    FullResponse<PostApplicationsApplicationIdScaleConfigsResponseOK, 200>

}

type ScalerPlugin = FastifyPluginAsync<NonNullable<scaler.ScalerOptions>>

declare module 'fastify' {
  interface ConfigureScaler {
    getHeaders(req: FastifyRequest, reply: FastifyReply, options: GetHeadersOptions): Promise<Record<string,string>>;
  }
  interface FastifyInstance {
    configureScaler(opts: ConfigureScaler): unknown
  }

  interface FastifyRequest {
    /**
     * Platformatic DB
     *
     * Exposing a SQL database as REST
     */
    'scaler': scaler.Scaler;
  }
}

declare function scaler(...params: Parameters<ScalerPlugin>): ReturnType<ScalerPlugin>;
export = scaler;
