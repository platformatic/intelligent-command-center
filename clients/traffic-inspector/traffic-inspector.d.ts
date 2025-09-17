import { type FastifyReply, type FastifyPluginAsync } from 'fastify'
import { type GetHeadersOptions, type StatusCode1xx, type StatusCode2xx, type StatusCode3xx, type StatusCode4xx, type StatusCode5xx } from '@platformatic/client'
import { type FormData } from 'undici'

declare namespace trafficInspector {
  export type TrafficInspector = {
    /**
     * Get recommendations.
     *
     * Fetch recommendations from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getRecommendations(req: GetRecommendationsRequest): Promise<GetRecommendationsResponses>;
    /**
     * Update recommendations.
     *
     * Update one or more recommendations in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateRecommendations(req: UpdateRecommendationsRequest): Promise<UpdateRecommendationsResponses>;
    /**
     * Get Recommendation by id.
     *
     * Fetch Recommendation using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getRecommendationById(req: GetRecommendationByIdRequest): Promise<GetRecommendationByIdResponses>;
    /**
     * Update recommendation.
     *
     * Update recommendation in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateRecommendation(req: UpdateRecommendationRequest): Promise<UpdateRecommendationResponses>;
    /**
     * Delete recommendations.
     *
     * Delete one or more recommendations from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteRecommendations(req: DeleteRecommendationsRequest): Promise<DeleteRecommendationsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    updateRecommendationStatus(req: UpdateRecommendationStatusRequest): Promise<UpdateRecommendationStatusResponses>;
    /**
     * Get interceptorConfigs for recommendation.
     *
     * Fetch all the interceptorConfigs for recommendation from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getInterceptorConfigsForRecommendation(req: GetInterceptorConfigsForRecommendationRequest): Promise<GetInterceptorConfigsForRecommendationResponses>;
    /**
     * Get recommendationsRoutes for recommendation.
     *
     * Fetch all the recommendationsRoutes for recommendation from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getRecommendationsRoutesForRecommendation(req: GetRecommendationsRoutesForRecommendationRequest): Promise<GetRecommendationsRoutesForRecommendationResponses>;
    /**
     * Get interceptorConfigs.
     *
     * Fetch interceptorConfigs from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getInterceptorConfigs(req: GetInterceptorConfigsRequest): Promise<GetInterceptorConfigsResponses>;
    /**
     * Create interceptorConfig.
     *
     * Add new interceptorConfig to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createInterceptorConfig(req: CreateInterceptorConfigRequest): Promise<CreateInterceptorConfigResponses>;
    /**
     * Update interceptorConfigs.
     *
     * Update one or more interceptorConfigs in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateInterceptorConfigs(req: UpdateInterceptorConfigsRequest): Promise<UpdateInterceptorConfigsResponses>;
    /**
     * Get InterceptorConfig by id.
     *
     * Fetch InterceptorConfig using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getInterceptorConfigById(req: GetInterceptorConfigByIdRequest): Promise<GetInterceptorConfigByIdResponses>;
    /**
     * Update interceptorConfig.
     *
     * Update interceptorConfig in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateInterceptorConfig(req: UpdateInterceptorConfigRequest): Promise<UpdateInterceptorConfigResponses>;
    /**
     * Delete interceptorConfigs.
     *
     * Delete one or more interceptorConfigs from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteInterceptorConfigs(req: DeleteInterceptorConfigsRequest): Promise<DeleteInterceptorConfigsResponses>;
    /**
     * Get recommendation for interceptorConfig.
     *
     * Fetch the recommendation for interceptorConfig from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getRecommendationForInterceptorConfig(req: GetRecommendationForInterceptorConfigRequest): Promise<GetRecommendationForInterceptorConfigResponses>;
    /**
     * Get routeExamples.
     *
     * Fetch routeExamples from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getRouteExamples(req: GetRouteExamplesRequest): Promise<GetRouteExamplesResponses>;
    /**
     * Create routeExample.
     *
     * Add new routeExample to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createRouteExample(req: CreateRouteExampleRequest): Promise<CreateRouteExampleResponses>;
    /**
     * Update routeExamples.
     *
     * Update one or more routeExamples in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateRouteExamples(req: UpdateRouteExamplesRequest): Promise<UpdateRouteExamplesResponses>;
    /**
     * Get RouteExample by id.
     *
     * Fetch RouteExample using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getRouteExampleById(req: GetRouteExampleByIdRequest): Promise<GetRouteExampleByIdResponses>;
    /**
     * Update routeExample.
     *
     * Update routeExample in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateRouteExample(req: UpdateRouteExampleRequest): Promise<UpdateRouteExampleResponses>;
    /**
     * Delete routeExamples.
     *
     * Delete one or more routeExamples from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteRouteExamples(req: DeleteRouteExamplesRequest): Promise<DeleteRouteExamplesResponses>;
    /**
     * Get recommendationsRoutes.
     *
     * Fetch recommendationsRoutes from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getRecommendationsRoutes(req: GetRecommendationsRoutesRequest): Promise<GetRecommendationsRoutesResponses>;
    /**
     * Create recommendationsRoute.
     *
     * Add new recommendationsRoute to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createRecommendationsRoute(req: CreateRecommendationsRouteRequest): Promise<CreateRecommendationsRouteResponses>;
    /**
     * Update recommendationsRoutes.
     *
     * Update one or more recommendationsRoutes in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateRecommendationsRoutes(req: UpdateRecommendationsRoutesRequest): Promise<UpdateRecommendationsRoutesResponses>;
    /**
     * Get RecommendationsRoute by id.
     *
     * Fetch RecommendationsRoute using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getRecommendationsRouteById(req: GetRecommendationsRouteByIdRequest): Promise<GetRecommendationsRouteByIdResponses>;
    /**
     * Update recommendationsRoute.
     *
     * Update recommendationsRoute in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateRecommendationsRoute(req: UpdateRecommendationsRouteRequest): Promise<UpdateRecommendationsRouteResponses>;
    /**
     * Delete recommendationsRoutes.
     *
     * Delete one or more recommendationsRoutes from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteRecommendationsRoutes(req: DeleteRecommendationsRoutesRequest): Promise<DeleteRecommendationsRoutesResponses>;
    /**
     * Get recommendation for recommendationsRoute.
     *
     * Fetch the recommendation for recommendationsRoute from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getRecommendationForRecommendationsRoute(req: GetRecommendationForRecommendationsRouteRequest): Promise<GetRecommendationForRecommendationsRouteResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getInterceptorConfig(req: GetInterceptorConfigRequest): Promise<GetInterceptorConfigResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    saveInterceptorConfig(req: SaveInterceptorConfigRequest): Promise<SaveInterceptorConfigResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    generateRecommendation(req: GenerateRecommendationRequest): Promise<GenerateRecommendationResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    applyApplicationRecommendation(req: ApplyApplicationRecommendationRequest): Promise<ApplyApplicationRecommendationResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    changeRecommendationRoute(req: ChangeRecommendationRouteRequest): Promise<ChangeRecommendationRouteResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    saveRequestHash(req: SaveRequestHashRequest): Promise<SaveRequestHashResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    saveRequest(req: SaveRequestRequest): Promise<SaveRequestResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    saveUrlsRoutes(req: SaveUrlsRoutesRequest): Promise<SaveUrlsRoutesResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getUpdates(req: GetUpdatesRequest): Promise<GetUpdatesResponses>;
  }
  export interface TrafficInspectorOptions {
    url: string
  }
  export const trafficInspector: TrafficInspectorPlugin;
  export { trafficInspector as default };
  export interface FullResponse<T, U extends number> {
    'statusCode': U;
    'headers': Record<string, string>;
    'body': T;
  }

  export type GetRecommendationsRequest = {
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
    'fields'?: Array<'count' | 'createdAt' | 'id' | 'status' | 'version'>;
    'where.count.eq'?: number;
    'where.count.neq'?: number;
    'where.count.gt'?: number;
    'where.count.gte'?: number;
    'where.count.lt'?: number;
    'where.count.lte'?: number;
    'where.count.like'?: number;
    'where.count.ilike'?: number;
    'where.count.in'?: string;
    'where.count.nin'?: string;
    'where.count.contains'?: string;
    'where.count.contained'?: string;
    'where.count.overlaps'?: string;
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
    'where.status.eq'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'where.status.neq'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'where.status.gt'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'where.status.gte'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'where.status.lt'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'where.status.lte'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'where.status.like'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'where.status.ilike'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'where.status.in'?: string;
    'where.status.nin'?: string;
    'where.status.contains'?: string;
    'where.status.contained'?: string;
    'where.status.overlaps'?: string;
    'where.version.eq'?: number;
    'where.version.neq'?: number;
    'where.version.gt'?: number;
    'where.version.gte'?: number;
    'where.version.lt'?: number;
    'where.version.lte'?: number;
    'where.version.like'?: number;
    'where.version.ilike'?: number;
    'where.version.in'?: string;
    'where.version.nin'?: string;
    'where.version.contains'?: string;
    'where.version.contained'?: string;
    'where.version.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.count'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.status'?: 'asc' | 'desc';
    'orderby.version'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetRecommendationsResponseOK = Array<{ 'id'?: string | null; 'version'?: number | null; 'status'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped' | null; 'count'?: number | null; 'createdAt'?: string | null }>
  export type GetRecommendationsResponses =
    GetRecommendationsResponseOK

  export type UpdateRecommendationsRequest = {
    'fields'?: Array<'count' | 'createdAt' | 'id' | 'status' | 'version'>;
    'where.count.eq'?: number;
    'where.count.neq'?: number;
    'where.count.gt'?: number;
    'where.count.gte'?: number;
    'where.count.lt'?: number;
    'where.count.lte'?: number;
    'where.count.like'?: number;
    'where.count.ilike'?: number;
    'where.count.in'?: string;
    'where.count.nin'?: string;
    'where.count.contains'?: string;
    'where.count.contained'?: string;
    'where.count.overlaps'?: string;
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
    'where.status.eq'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'where.status.neq'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'where.status.gt'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'where.status.gte'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'where.status.lt'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'where.status.lte'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'where.status.like'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'where.status.ilike'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'where.status.in'?: string;
    'where.status.nin'?: string;
    'where.status.contains'?: string;
    'where.status.contained'?: string;
    'where.status.overlaps'?: string;
    'where.version.eq'?: number;
    'where.version.neq'?: number;
    'where.version.gt'?: number;
    'where.version.gte'?: number;
    'where.version.lt'?: number;
    'where.version.lte'?: number;
    'where.version.like'?: number;
    'where.version.ilike'?: number;
    'where.version.in'?: string;
    'where.version.nin'?: string;
    'where.version.contains'?: string;
    'where.version.contained'?: string;
    'where.version.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'version': number;
    'status': 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'count': number;
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateRecommendationsResponseOK = Array<{ 'id'?: string | null; 'version'?: number | null; 'status'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped' | null; 'count'?: number | null; 'createdAt'?: string | null }>
  export type UpdateRecommendationsResponses =
    UpdateRecommendationsResponseOK

  export type GetRecommendationByIdRequest = {
    'fields'?: Array<'count' | 'createdAt' | 'id' | 'status' | 'version'>;
    'id': string;
  }

  /**
   * A Recommendation
   */
  export type GetRecommendationByIdResponseOK = { 'id'?: string | null; 'version'?: number | null; 'status'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped' | null; 'count'?: number | null; 'createdAt'?: string | null }
  export type GetRecommendationByIdResponses =
    GetRecommendationByIdResponseOK

  export type UpdateRecommendationRequest = {
    'fields'?: Array<'count' | 'createdAt' | 'id' | 'status' | 'version'>;
    'id': string;
    'version': number;
    'status': 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped';
    'count': number;
    'createdAt'?: string | null;
  }

  /**
   * A Recommendation
   */
  export type UpdateRecommendationResponseOK = { 'id'?: string | null; 'version'?: number | null; 'status'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped' | null; 'count'?: number | null; 'createdAt'?: string | null }
  export type UpdateRecommendationResponses =
    UpdateRecommendationResponseOK

  export type DeleteRecommendationsRequest = {
    'fields'?: Array<'count' | 'createdAt' | 'id' | 'status' | 'version'>;
    'id': string;
  }

  /**
   * A Recommendation
   */
  export type DeleteRecommendationsResponseOK = { 'id'?: string | null; 'version'?: number | null; 'status'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped' | null; 'count'?: number | null; 'createdAt'?: string | null }
  export type DeleteRecommendationsResponses =
    DeleteRecommendationsResponseOK

  export type UpdateRecommendationStatusRequest = {
    'id': string;
    'status': string;
  }

  export type UpdateRecommendationStatusResponseOK = unknown
  export type UpdateRecommendationStatusResponses =
    FullResponse<UpdateRecommendationStatusResponseOK, 200>

  export type GetInterceptorConfigsForRecommendationRequest = {
    'fields'?: Array<'applicationId' | 'applied' | 'config' | 'createdAt' | 'id' | 'recommendationId'>;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetInterceptorConfigsForRecommendationResponseOK = Array<{ 'id'?: string | null; 'recommendationId'?: string | null; 'applicationId'?: string | null; 'config'?: object | null; 'applied'?: boolean | null; 'createdAt'?: string | null }>
  export type GetInterceptorConfigsForRecommendationResponses =
    GetInterceptorConfigsForRecommendationResponseOK

  export type GetRecommendationsRoutesForRecommendationRequest = {
    'fields'?: Array<'applicationId' | 'applied' | 'cacheTag' | 'createdAt' | 'domain' | 'hits' | 'id' | 'memory' | 'misses' | 'recommendationId' | 'recommended' | 'route' | 'score' | 'scores' | 'selected' | 'serviceName' | 'telemetryId' | 'ttl' | 'varyHeaders'>;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetRecommendationsRoutesForRecommendationResponseOK = Array<{ 'id'?: string | null; 'recommendationId'?: string | null; 'applicationId'?: string | null; 'telemetryId'?: string | null; 'serviceName'?: string | null; 'route'?: string | null; 'recommended'?: boolean | null; 'applied'?: boolean | null; 'cacheTag'?: string | null; 'ttl'?: number | null; 'score'?: number | null; 'hits'?: number | null; 'misses'?: number | null; 'memory'?: number | null; 'varyHeaders'?: object | null; 'scores'?: object | null; 'domain'?: string | null; 'selected'?: boolean | null; 'createdAt'?: string | null }>
  export type GetRecommendationsRoutesForRecommendationResponses =
    GetRecommendationsRoutesForRecommendationResponseOK

  export type GetInterceptorConfigsRequest = {
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
    'fields'?: Array<'applicationId' | 'applied' | 'config' | 'createdAt' | 'id' | 'recommendationId'>;
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
    'where.applied.eq'?: boolean;
    'where.applied.neq'?: boolean;
    'where.applied.gt'?: boolean;
    'where.applied.gte'?: boolean;
    'where.applied.lt'?: boolean;
    'where.applied.lte'?: boolean;
    'where.applied.like'?: boolean;
    'where.applied.ilike'?: boolean;
    'where.applied.in'?: string;
    'where.applied.nin'?: string;
    'where.applied.contains'?: string;
    'where.applied.contained'?: string;
    'where.applied.overlaps'?: string;
    'where.config.eq'?: string;
    'where.config.neq'?: string;
    'where.config.gt'?: string;
    'where.config.gte'?: string;
    'where.config.lt'?: string;
    'where.config.lte'?: string;
    'where.config.like'?: string;
    'where.config.ilike'?: string;
    'where.config.in'?: string;
    'where.config.nin'?: string;
    'where.config.contains'?: string;
    'where.config.contained'?: string;
    'where.config.overlaps'?: string;
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
    'where.recommendationId.eq'?: string;
    'where.recommendationId.neq'?: string;
    'where.recommendationId.gt'?: string;
    'where.recommendationId.gte'?: string;
    'where.recommendationId.lt'?: string;
    'where.recommendationId.lte'?: string;
    'where.recommendationId.like'?: string;
    'where.recommendationId.ilike'?: string;
    'where.recommendationId.in'?: string;
    'where.recommendationId.nin'?: string;
    'where.recommendationId.contains'?: string;
    'where.recommendationId.contained'?: string;
    'where.recommendationId.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.applied'?: 'asc' | 'desc';
    'orderby.config'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.recommendationId'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetInterceptorConfigsResponseOK = Array<{ 'id'?: string | null; 'recommendationId'?: string | null; 'applicationId'?: string | null; 'config'?: object | null; 'applied'?: boolean | null; 'createdAt'?: string | null }>
  export type GetInterceptorConfigsResponses =
    GetInterceptorConfigsResponseOK

  export type CreateInterceptorConfigRequest = {
    'id'?: string;
    'recommendationId': string;
    'applicationId': string;
    'config': object;
    'applied'?: boolean | null;
    'createdAt'?: string | null;
  }

  /**
   * A InterceptorConfig
   */
  export type CreateInterceptorConfigResponseOK = { 'id'?: string | null; 'recommendationId'?: string | null; 'applicationId'?: string | null; 'config'?: object | null; 'applied'?: boolean | null; 'createdAt'?: string | null }
  export type CreateInterceptorConfigResponses =
    CreateInterceptorConfigResponseOK

  export type UpdateInterceptorConfigsRequest = {
    'fields'?: Array<'applicationId' | 'applied' | 'config' | 'createdAt' | 'id' | 'recommendationId'>;
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
    'where.applied.eq'?: boolean;
    'where.applied.neq'?: boolean;
    'where.applied.gt'?: boolean;
    'where.applied.gte'?: boolean;
    'where.applied.lt'?: boolean;
    'where.applied.lte'?: boolean;
    'where.applied.like'?: boolean;
    'where.applied.ilike'?: boolean;
    'where.applied.in'?: string;
    'where.applied.nin'?: string;
    'where.applied.contains'?: string;
    'where.applied.contained'?: string;
    'where.applied.overlaps'?: string;
    'where.config.eq'?: string;
    'where.config.neq'?: string;
    'where.config.gt'?: string;
    'where.config.gte'?: string;
    'where.config.lt'?: string;
    'where.config.lte'?: string;
    'where.config.like'?: string;
    'where.config.ilike'?: string;
    'where.config.in'?: string;
    'where.config.nin'?: string;
    'where.config.contains'?: string;
    'where.config.contained'?: string;
    'where.config.overlaps'?: string;
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
    'where.recommendationId.eq'?: string;
    'where.recommendationId.neq'?: string;
    'where.recommendationId.gt'?: string;
    'where.recommendationId.gte'?: string;
    'where.recommendationId.lt'?: string;
    'where.recommendationId.lte'?: string;
    'where.recommendationId.like'?: string;
    'where.recommendationId.ilike'?: string;
    'where.recommendationId.in'?: string;
    'where.recommendationId.nin'?: string;
    'where.recommendationId.contains'?: string;
    'where.recommendationId.contained'?: string;
    'where.recommendationId.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'recommendationId': string;
    'applicationId': string;
    'config': object;
    'applied'?: boolean | null;
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateInterceptorConfigsResponseOK = Array<{ 'id'?: string | null; 'recommendationId'?: string | null; 'applicationId'?: string | null; 'config'?: object | null; 'applied'?: boolean | null; 'createdAt'?: string | null }>
  export type UpdateInterceptorConfigsResponses =
    UpdateInterceptorConfigsResponseOK

  export type GetInterceptorConfigByIdRequest = {
    'fields'?: Array<'applicationId' | 'applied' | 'config' | 'createdAt' | 'id' | 'recommendationId'>;
    'id': string;
  }

  /**
   * A InterceptorConfig
   */
  export type GetInterceptorConfigByIdResponseOK = { 'id'?: string | null; 'recommendationId'?: string | null; 'applicationId'?: string | null; 'config'?: object | null; 'applied'?: boolean | null; 'createdAt'?: string | null }
  export type GetInterceptorConfigByIdResponses =
    GetInterceptorConfigByIdResponseOK

  export type UpdateInterceptorConfigRequest = {
    'fields'?: Array<'applicationId' | 'applied' | 'config' | 'createdAt' | 'id' | 'recommendationId'>;
    'id': string;
    'recommendationId': string;
    'applicationId': string;
    'config': object;
    'applied'?: boolean | null;
    'createdAt'?: string | null;
  }

  /**
   * A InterceptorConfig
   */
  export type UpdateInterceptorConfigResponseOK = { 'id'?: string | null; 'recommendationId'?: string | null; 'applicationId'?: string | null; 'config'?: object | null; 'applied'?: boolean | null; 'createdAt'?: string | null }
  export type UpdateInterceptorConfigResponses =
    UpdateInterceptorConfigResponseOK

  export type DeleteInterceptorConfigsRequest = {
    'fields'?: Array<'applicationId' | 'applied' | 'config' | 'createdAt' | 'id' | 'recommendationId'>;
    'id': string;
  }

  /**
   * A InterceptorConfig
   */
  export type DeleteInterceptorConfigsResponseOK = { 'id'?: string | null; 'recommendationId'?: string | null; 'applicationId'?: string | null; 'config'?: object | null; 'applied'?: boolean | null; 'createdAt'?: string | null }
  export type DeleteInterceptorConfigsResponses =
    DeleteInterceptorConfigsResponseOK

  export type GetRecommendationForInterceptorConfigRequest = {
    'fields'?: Array<'count' | 'createdAt' | 'id' | 'status' | 'version'>;
    'id': string;
  }

  /**
   * A Recommendation
   */
  export type GetRecommendationForInterceptorConfigResponseOK = { 'id'?: string | null; 'version'?: number | null; 'status'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped' | null; 'count'?: number | null; 'createdAt'?: string | null }
  export type GetRecommendationForInterceptorConfigResponses =
    GetRecommendationForInterceptorConfigResponseOK

  export type GetRouteExamplesRequest = {
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
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'request' | 'response' | 'route' | 'telemetryId'>;
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
    'where.request.eq'?: string;
    'where.request.neq'?: string;
    'where.request.gt'?: string;
    'where.request.gte'?: string;
    'where.request.lt'?: string;
    'where.request.lte'?: string;
    'where.request.like'?: string;
    'where.request.ilike'?: string;
    'where.request.in'?: string;
    'where.request.nin'?: string;
    'where.request.contains'?: string;
    'where.request.contained'?: string;
    'where.request.overlaps'?: string;
    'where.response.eq'?: string;
    'where.response.neq'?: string;
    'where.response.gt'?: string;
    'where.response.gte'?: string;
    'where.response.lt'?: string;
    'where.response.lte'?: string;
    'where.response.like'?: string;
    'where.response.ilike'?: string;
    'where.response.in'?: string;
    'where.response.nin'?: string;
    'where.response.contains'?: string;
    'where.response.contained'?: string;
    'where.response.overlaps'?: string;
    'where.route.eq'?: string;
    'where.route.neq'?: string;
    'where.route.gt'?: string;
    'where.route.gte'?: string;
    'where.route.lt'?: string;
    'where.route.lte'?: string;
    'where.route.like'?: string;
    'where.route.ilike'?: string;
    'where.route.in'?: string;
    'where.route.nin'?: string;
    'where.route.contains'?: string;
    'where.route.contained'?: string;
    'where.route.overlaps'?: string;
    'where.telemetryId.eq'?: string;
    'where.telemetryId.neq'?: string;
    'where.telemetryId.gt'?: string;
    'where.telemetryId.gte'?: string;
    'where.telemetryId.lt'?: string;
    'where.telemetryId.lte'?: string;
    'where.telemetryId.like'?: string;
    'where.telemetryId.ilike'?: string;
    'where.telemetryId.in'?: string;
    'where.telemetryId.nin'?: string;
    'where.telemetryId.contains'?: string;
    'where.telemetryId.contained'?: string;
    'where.telemetryId.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.request'?: 'asc' | 'desc';
    'orderby.response'?: 'asc' | 'desc';
    'orderby.route'?: 'asc' | 'desc';
    'orderby.telemetryId'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetRouteExamplesResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'telemetryId'?: string | null; 'route'?: string | null; 'request'?: object | null; 'response'?: object | null; 'createdAt'?: string | null }>
  export type GetRouteExamplesResponses =
    GetRouteExamplesResponseOK

  export type CreateRouteExampleRequest = {
    'id'?: string;
    'applicationId': string;
    'telemetryId': string;
    'route': string;
    'request': object;
    'response': object;
    'createdAt'?: string | null;
  }

  /**
   * A RouteExample
   */
  export type CreateRouteExampleResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'telemetryId'?: string | null; 'route'?: string | null; 'request'?: object | null; 'response'?: object | null; 'createdAt'?: string | null }
  export type CreateRouteExampleResponses =
    CreateRouteExampleResponseOK

  export type UpdateRouteExamplesRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'request' | 'response' | 'route' | 'telemetryId'>;
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
    'where.request.eq'?: string;
    'where.request.neq'?: string;
    'where.request.gt'?: string;
    'where.request.gte'?: string;
    'where.request.lt'?: string;
    'where.request.lte'?: string;
    'where.request.like'?: string;
    'where.request.ilike'?: string;
    'where.request.in'?: string;
    'where.request.nin'?: string;
    'where.request.contains'?: string;
    'where.request.contained'?: string;
    'where.request.overlaps'?: string;
    'where.response.eq'?: string;
    'where.response.neq'?: string;
    'where.response.gt'?: string;
    'where.response.gte'?: string;
    'where.response.lt'?: string;
    'where.response.lte'?: string;
    'where.response.like'?: string;
    'where.response.ilike'?: string;
    'where.response.in'?: string;
    'where.response.nin'?: string;
    'where.response.contains'?: string;
    'where.response.contained'?: string;
    'where.response.overlaps'?: string;
    'where.route.eq'?: string;
    'where.route.neq'?: string;
    'where.route.gt'?: string;
    'where.route.gte'?: string;
    'where.route.lt'?: string;
    'where.route.lte'?: string;
    'where.route.like'?: string;
    'where.route.ilike'?: string;
    'where.route.in'?: string;
    'where.route.nin'?: string;
    'where.route.contains'?: string;
    'where.route.contained'?: string;
    'where.route.overlaps'?: string;
    'where.telemetryId.eq'?: string;
    'where.telemetryId.neq'?: string;
    'where.telemetryId.gt'?: string;
    'where.telemetryId.gte'?: string;
    'where.telemetryId.lt'?: string;
    'where.telemetryId.lte'?: string;
    'where.telemetryId.like'?: string;
    'where.telemetryId.ilike'?: string;
    'where.telemetryId.in'?: string;
    'where.telemetryId.nin'?: string;
    'where.telemetryId.contains'?: string;
    'where.telemetryId.contained'?: string;
    'where.telemetryId.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'applicationId': string;
    'telemetryId': string;
    'route': string;
    'request': object;
    'response': object;
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateRouteExamplesResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'telemetryId'?: string | null; 'route'?: string | null; 'request'?: object | null; 'response'?: object | null; 'createdAt'?: string | null }>
  export type UpdateRouteExamplesResponses =
    UpdateRouteExamplesResponseOK

  export type GetRouteExampleByIdRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'request' | 'response' | 'route' | 'telemetryId'>;
    'id': string;
  }

  /**
   * A RouteExample
   */
  export type GetRouteExampleByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'telemetryId'?: string | null; 'route'?: string | null; 'request'?: object | null; 'response'?: object | null; 'createdAt'?: string | null }
  export type GetRouteExampleByIdResponses =
    GetRouteExampleByIdResponseOK

  export type UpdateRouteExampleRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'request' | 'response' | 'route' | 'telemetryId'>;
    'id': string;
    'applicationId': string;
    'telemetryId': string;
    'route': string;
    'request': object;
    'response': object;
    'createdAt'?: string | null;
  }

  /**
   * A RouteExample
   */
  export type UpdateRouteExampleResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'telemetryId'?: string | null; 'route'?: string | null; 'request'?: object | null; 'response'?: object | null; 'createdAt'?: string | null }
  export type UpdateRouteExampleResponses =
    UpdateRouteExampleResponseOK

  export type DeleteRouteExamplesRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'request' | 'response' | 'route' | 'telemetryId'>;
    'id': string;
  }

  /**
   * A RouteExample
   */
  export type DeleteRouteExamplesResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'telemetryId'?: string | null; 'route'?: string | null; 'request'?: object | null; 'response'?: object | null; 'createdAt'?: string | null }
  export type DeleteRouteExamplesResponses =
    DeleteRouteExamplesResponseOK

  export type GetRecommendationsRoutesRequest = {
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
    'fields'?: Array<'applicationId' | 'applied' | 'cacheTag' | 'createdAt' | 'domain' | 'hits' | 'id' | 'memory' | 'misses' | 'recommendationId' | 'recommended' | 'route' | 'score' | 'scores' | 'selected' | 'serviceName' | 'telemetryId' | 'ttl' | 'varyHeaders'>;
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
    'where.applied.eq'?: boolean;
    'where.applied.neq'?: boolean;
    'where.applied.gt'?: boolean;
    'where.applied.gte'?: boolean;
    'where.applied.lt'?: boolean;
    'where.applied.lte'?: boolean;
    'where.applied.like'?: boolean;
    'where.applied.ilike'?: boolean;
    'where.applied.in'?: string;
    'where.applied.nin'?: string;
    'where.applied.contains'?: string;
    'where.applied.contained'?: string;
    'where.applied.overlaps'?: string;
    'where.cacheTag.eq'?: string;
    'where.cacheTag.neq'?: string;
    'where.cacheTag.gt'?: string;
    'where.cacheTag.gte'?: string;
    'where.cacheTag.lt'?: string;
    'where.cacheTag.lte'?: string;
    'where.cacheTag.like'?: string;
    'where.cacheTag.ilike'?: string;
    'where.cacheTag.in'?: string;
    'where.cacheTag.nin'?: string;
    'where.cacheTag.contains'?: string;
    'where.cacheTag.contained'?: string;
    'where.cacheTag.overlaps'?: string;
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
    'where.domain.eq'?: string;
    'where.domain.neq'?: string;
    'where.domain.gt'?: string;
    'where.domain.gte'?: string;
    'where.domain.lt'?: string;
    'where.domain.lte'?: string;
    'where.domain.like'?: string;
    'where.domain.ilike'?: string;
    'where.domain.in'?: string;
    'where.domain.nin'?: string;
    'where.domain.contains'?: string;
    'where.domain.contained'?: string;
    'where.domain.overlaps'?: string;
    'where.hits.eq'?: number;
    'where.hits.neq'?: number;
    'where.hits.gt'?: number;
    'where.hits.gte'?: number;
    'where.hits.lt'?: number;
    'where.hits.lte'?: number;
    'where.hits.like'?: number;
    'where.hits.ilike'?: number;
    'where.hits.in'?: string;
    'where.hits.nin'?: string;
    'where.hits.contains'?: string;
    'where.hits.contained'?: string;
    'where.hits.overlaps'?: string;
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
    'where.memory.eq'?: number;
    'where.memory.neq'?: number;
    'where.memory.gt'?: number;
    'where.memory.gte'?: number;
    'where.memory.lt'?: number;
    'where.memory.lte'?: number;
    'where.memory.like'?: number;
    'where.memory.ilike'?: number;
    'where.memory.in'?: string;
    'where.memory.nin'?: string;
    'where.memory.contains'?: string;
    'where.memory.contained'?: string;
    'where.memory.overlaps'?: string;
    'where.misses.eq'?: number;
    'where.misses.neq'?: number;
    'where.misses.gt'?: number;
    'where.misses.gte'?: number;
    'where.misses.lt'?: number;
    'where.misses.lte'?: number;
    'where.misses.like'?: number;
    'where.misses.ilike'?: number;
    'where.misses.in'?: string;
    'where.misses.nin'?: string;
    'where.misses.contains'?: string;
    'where.misses.contained'?: string;
    'where.misses.overlaps'?: string;
    'where.recommendationId.eq'?: string;
    'where.recommendationId.neq'?: string;
    'where.recommendationId.gt'?: string;
    'where.recommendationId.gte'?: string;
    'where.recommendationId.lt'?: string;
    'where.recommendationId.lte'?: string;
    'where.recommendationId.like'?: string;
    'where.recommendationId.ilike'?: string;
    'where.recommendationId.in'?: string;
    'where.recommendationId.nin'?: string;
    'where.recommendationId.contains'?: string;
    'where.recommendationId.contained'?: string;
    'where.recommendationId.overlaps'?: string;
    'where.recommended.eq'?: boolean;
    'where.recommended.neq'?: boolean;
    'where.recommended.gt'?: boolean;
    'where.recommended.gte'?: boolean;
    'where.recommended.lt'?: boolean;
    'where.recommended.lte'?: boolean;
    'where.recommended.like'?: boolean;
    'where.recommended.ilike'?: boolean;
    'where.recommended.in'?: string;
    'where.recommended.nin'?: string;
    'where.recommended.contains'?: string;
    'where.recommended.contained'?: string;
    'where.recommended.overlaps'?: string;
    'where.route.eq'?: string;
    'where.route.neq'?: string;
    'where.route.gt'?: string;
    'where.route.gte'?: string;
    'where.route.lt'?: string;
    'where.route.lte'?: string;
    'where.route.like'?: string;
    'where.route.ilike'?: string;
    'where.route.in'?: string;
    'where.route.nin'?: string;
    'where.route.contains'?: string;
    'where.route.contained'?: string;
    'where.route.overlaps'?: string;
    'where.score.eq'?: number;
    'where.score.neq'?: number;
    'where.score.gt'?: number;
    'where.score.gte'?: number;
    'where.score.lt'?: number;
    'where.score.lte'?: number;
    'where.score.like'?: number;
    'where.score.ilike'?: number;
    'where.score.in'?: string;
    'where.score.nin'?: string;
    'where.score.contains'?: string;
    'where.score.contained'?: string;
    'where.score.overlaps'?: string;
    'where.scores.eq'?: string;
    'where.scores.neq'?: string;
    'where.scores.gt'?: string;
    'where.scores.gte'?: string;
    'where.scores.lt'?: string;
    'where.scores.lte'?: string;
    'where.scores.like'?: string;
    'where.scores.ilike'?: string;
    'where.scores.in'?: string;
    'where.scores.nin'?: string;
    'where.scores.contains'?: string;
    'where.scores.contained'?: string;
    'where.scores.overlaps'?: string;
    'where.selected.eq'?: boolean;
    'where.selected.neq'?: boolean;
    'where.selected.gt'?: boolean;
    'where.selected.gte'?: boolean;
    'where.selected.lt'?: boolean;
    'where.selected.lte'?: boolean;
    'where.selected.like'?: boolean;
    'where.selected.ilike'?: boolean;
    'where.selected.in'?: string;
    'where.selected.nin'?: string;
    'where.selected.contains'?: string;
    'where.selected.contained'?: string;
    'where.selected.overlaps'?: string;
    'where.serviceName.eq'?: string;
    'where.serviceName.neq'?: string;
    'where.serviceName.gt'?: string;
    'where.serviceName.gte'?: string;
    'where.serviceName.lt'?: string;
    'where.serviceName.lte'?: string;
    'where.serviceName.like'?: string;
    'where.serviceName.ilike'?: string;
    'where.serviceName.in'?: string;
    'where.serviceName.nin'?: string;
    'where.serviceName.contains'?: string;
    'where.serviceName.contained'?: string;
    'where.serviceName.overlaps'?: string;
    'where.telemetryId.eq'?: string;
    'where.telemetryId.neq'?: string;
    'where.telemetryId.gt'?: string;
    'where.telemetryId.gte'?: string;
    'where.telemetryId.lt'?: string;
    'where.telemetryId.lte'?: string;
    'where.telemetryId.like'?: string;
    'where.telemetryId.ilike'?: string;
    'where.telemetryId.in'?: string;
    'where.telemetryId.nin'?: string;
    'where.telemetryId.contains'?: string;
    'where.telemetryId.contained'?: string;
    'where.telemetryId.overlaps'?: string;
    'where.ttl.eq'?: number;
    'where.ttl.neq'?: number;
    'where.ttl.gt'?: number;
    'where.ttl.gte'?: number;
    'where.ttl.lt'?: number;
    'where.ttl.lte'?: number;
    'where.ttl.like'?: number;
    'where.ttl.ilike'?: number;
    'where.ttl.in'?: string;
    'where.ttl.nin'?: string;
    'where.ttl.contains'?: string;
    'where.ttl.contained'?: string;
    'where.ttl.overlaps'?: string;
    'where.varyHeaders.eq'?: string;
    'where.varyHeaders.neq'?: string;
    'where.varyHeaders.gt'?: string;
    'where.varyHeaders.gte'?: string;
    'where.varyHeaders.lt'?: string;
    'where.varyHeaders.lte'?: string;
    'where.varyHeaders.like'?: string;
    'where.varyHeaders.ilike'?: string;
    'where.varyHeaders.in'?: string;
    'where.varyHeaders.nin'?: string;
    'where.varyHeaders.contains'?: string;
    'where.varyHeaders.contained'?: string;
    'where.varyHeaders.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.applied'?: 'asc' | 'desc';
    'orderby.cacheTag'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.domain'?: 'asc' | 'desc';
    'orderby.hits'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.memory'?: 'asc' | 'desc';
    'orderby.misses'?: 'asc' | 'desc';
    'orderby.recommendationId'?: 'asc' | 'desc';
    'orderby.recommended'?: 'asc' | 'desc';
    'orderby.route'?: 'asc' | 'desc';
    'orderby.score'?: 'asc' | 'desc';
    'orderby.scores'?: 'asc' | 'desc';
    'orderby.selected'?: 'asc' | 'desc';
    'orderby.serviceName'?: 'asc' | 'desc';
    'orderby.telemetryId'?: 'asc' | 'desc';
    'orderby.ttl'?: 'asc' | 'desc';
    'orderby.varyHeaders'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetRecommendationsRoutesResponseOK = Array<{ 'id'?: string | null; 'recommendationId'?: string | null; 'applicationId'?: string | null; 'telemetryId'?: string | null; 'serviceName'?: string | null; 'route'?: string | null; 'recommended'?: boolean | null; 'applied'?: boolean | null; 'cacheTag'?: string | null; 'ttl'?: number | null; 'score'?: number | null; 'hits'?: number | null; 'misses'?: number | null; 'memory'?: number | null; 'varyHeaders'?: object | null; 'scores'?: object | null; 'domain'?: string | null; 'selected'?: boolean | null; 'createdAt'?: string | null }>
  export type GetRecommendationsRoutesResponses =
    GetRecommendationsRoutesResponseOK

  export type CreateRecommendationsRouteRequest = {
    'id'?: string;
    'recommendationId': string;
    'applicationId': string;
    'telemetryId': string;
    'serviceName': string;
    'route': string;
    'recommended': boolean;
    'applied'?: boolean | null;
    'cacheTag'?: string | null;
    'ttl': number;
    'score': number;
    'hits': number;
    'misses': number;
    'memory': number;
    'varyHeaders'?: object | null;
    'scores': object;
    'domain': string;
    'selected'?: boolean | null;
    'createdAt'?: string | null;
  }

  /**
   * A RecommendationsRoute
   */
  export type CreateRecommendationsRouteResponseOK = { 'id'?: string | null; 'recommendationId'?: string | null; 'applicationId'?: string | null; 'telemetryId'?: string | null; 'serviceName'?: string | null; 'route'?: string | null; 'recommended'?: boolean | null; 'applied'?: boolean | null; 'cacheTag'?: string | null; 'ttl'?: number | null; 'score'?: number | null; 'hits'?: number | null; 'misses'?: number | null; 'memory'?: number | null; 'varyHeaders'?: object | null; 'scores'?: object | null; 'domain'?: string | null; 'selected'?: boolean | null; 'createdAt'?: string | null }
  export type CreateRecommendationsRouteResponses =
    CreateRecommendationsRouteResponseOK

  export type UpdateRecommendationsRoutesRequest = {
    'fields'?: Array<'applicationId' | 'applied' | 'cacheTag' | 'createdAt' | 'domain' | 'hits' | 'id' | 'memory' | 'misses' | 'recommendationId' | 'recommended' | 'route' | 'score' | 'scores' | 'selected' | 'serviceName' | 'telemetryId' | 'ttl' | 'varyHeaders'>;
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
    'where.applied.eq'?: boolean;
    'where.applied.neq'?: boolean;
    'where.applied.gt'?: boolean;
    'where.applied.gte'?: boolean;
    'where.applied.lt'?: boolean;
    'where.applied.lte'?: boolean;
    'where.applied.like'?: boolean;
    'where.applied.ilike'?: boolean;
    'where.applied.in'?: string;
    'where.applied.nin'?: string;
    'where.applied.contains'?: string;
    'where.applied.contained'?: string;
    'where.applied.overlaps'?: string;
    'where.cacheTag.eq'?: string;
    'where.cacheTag.neq'?: string;
    'where.cacheTag.gt'?: string;
    'where.cacheTag.gte'?: string;
    'where.cacheTag.lt'?: string;
    'where.cacheTag.lte'?: string;
    'where.cacheTag.like'?: string;
    'where.cacheTag.ilike'?: string;
    'where.cacheTag.in'?: string;
    'where.cacheTag.nin'?: string;
    'where.cacheTag.contains'?: string;
    'where.cacheTag.contained'?: string;
    'where.cacheTag.overlaps'?: string;
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
    'where.domain.eq'?: string;
    'where.domain.neq'?: string;
    'where.domain.gt'?: string;
    'where.domain.gte'?: string;
    'where.domain.lt'?: string;
    'where.domain.lte'?: string;
    'where.domain.like'?: string;
    'where.domain.ilike'?: string;
    'where.domain.in'?: string;
    'where.domain.nin'?: string;
    'where.domain.contains'?: string;
    'where.domain.contained'?: string;
    'where.domain.overlaps'?: string;
    'where.hits.eq'?: number;
    'where.hits.neq'?: number;
    'where.hits.gt'?: number;
    'where.hits.gte'?: number;
    'where.hits.lt'?: number;
    'where.hits.lte'?: number;
    'where.hits.like'?: number;
    'where.hits.ilike'?: number;
    'where.hits.in'?: string;
    'where.hits.nin'?: string;
    'where.hits.contains'?: string;
    'where.hits.contained'?: string;
    'where.hits.overlaps'?: string;
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
    'where.memory.eq'?: number;
    'where.memory.neq'?: number;
    'where.memory.gt'?: number;
    'where.memory.gte'?: number;
    'where.memory.lt'?: number;
    'where.memory.lte'?: number;
    'where.memory.like'?: number;
    'where.memory.ilike'?: number;
    'where.memory.in'?: string;
    'where.memory.nin'?: string;
    'where.memory.contains'?: string;
    'where.memory.contained'?: string;
    'where.memory.overlaps'?: string;
    'where.misses.eq'?: number;
    'where.misses.neq'?: number;
    'where.misses.gt'?: number;
    'where.misses.gte'?: number;
    'where.misses.lt'?: number;
    'where.misses.lte'?: number;
    'where.misses.like'?: number;
    'where.misses.ilike'?: number;
    'where.misses.in'?: string;
    'where.misses.nin'?: string;
    'where.misses.contains'?: string;
    'where.misses.contained'?: string;
    'where.misses.overlaps'?: string;
    'where.recommendationId.eq'?: string;
    'where.recommendationId.neq'?: string;
    'where.recommendationId.gt'?: string;
    'where.recommendationId.gte'?: string;
    'where.recommendationId.lt'?: string;
    'where.recommendationId.lte'?: string;
    'where.recommendationId.like'?: string;
    'where.recommendationId.ilike'?: string;
    'where.recommendationId.in'?: string;
    'where.recommendationId.nin'?: string;
    'where.recommendationId.contains'?: string;
    'where.recommendationId.contained'?: string;
    'where.recommendationId.overlaps'?: string;
    'where.recommended.eq'?: boolean;
    'where.recommended.neq'?: boolean;
    'where.recommended.gt'?: boolean;
    'where.recommended.gte'?: boolean;
    'where.recommended.lt'?: boolean;
    'where.recommended.lte'?: boolean;
    'where.recommended.like'?: boolean;
    'where.recommended.ilike'?: boolean;
    'where.recommended.in'?: string;
    'where.recommended.nin'?: string;
    'where.recommended.contains'?: string;
    'where.recommended.contained'?: string;
    'where.recommended.overlaps'?: string;
    'where.route.eq'?: string;
    'where.route.neq'?: string;
    'where.route.gt'?: string;
    'where.route.gte'?: string;
    'where.route.lt'?: string;
    'where.route.lte'?: string;
    'where.route.like'?: string;
    'where.route.ilike'?: string;
    'where.route.in'?: string;
    'where.route.nin'?: string;
    'where.route.contains'?: string;
    'where.route.contained'?: string;
    'where.route.overlaps'?: string;
    'where.score.eq'?: number;
    'where.score.neq'?: number;
    'where.score.gt'?: number;
    'where.score.gte'?: number;
    'where.score.lt'?: number;
    'where.score.lte'?: number;
    'where.score.like'?: number;
    'where.score.ilike'?: number;
    'where.score.in'?: string;
    'where.score.nin'?: string;
    'where.score.contains'?: string;
    'where.score.contained'?: string;
    'where.score.overlaps'?: string;
    'where.scores.eq'?: string;
    'where.scores.neq'?: string;
    'where.scores.gt'?: string;
    'where.scores.gte'?: string;
    'where.scores.lt'?: string;
    'where.scores.lte'?: string;
    'where.scores.like'?: string;
    'where.scores.ilike'?: string;
    'where.scores.in'?: string;
    'where.scores.nin'?: string;
    'where.scores.contains'?: string;
    'where.scores.contained'?: string;
    'where.scores.overlaps'?: string;
    'where.selected.eq'?: boolean;
    'where.selected.neq'?: boolean;
    'where.selected.gt'?: boolean;
    'where.selected.gte'?: boolean;
    'where.selected.lt'?: boolean;
    'where.selected.lte'?: boolean;
    'where.selected.like'?: boolean;
    'where.selected.ilike'?: boolean;
    'where.selected.in'?: string;
    'where.selected.nin'?: string;
    'where.selected.contains'?: string;
    'where.selected.contained'?: string;
    'where.selected.overlaps'?: string;
    'where.serviceName.eq'?: string;
    'where.serviceName.neq'?: string;
    'where.serviceName.gt'?: string;
    'where.serviceName.gte'?: string;
    'where.serviceName.lt'?: string;
    'where.serviceName.lte'?: string;
    'where.serviceName.like'?: string;
    'where.serviceName.ilike'?: string;
    'where.serviceName.in'?: string;
    'where.serviceName.nin'?: string;
    'where.serviceName.contains'?: string;
    'where.serviceName.contained'?: string;
    'where.serviceName.overlaps'?: string;
    'where.telemetryId.eq'?: string;
    'where.telemetryId.neq'?: string;
    'where.telemetryId.gt'?: string;
    'where.telemetryId.gte'?: string;
    'where.telemetryId.lt'?: string;
    'where.telemetryId.lte'?: string;
    'where.telemetryId.like'?: string;
    'where.telemetryId.ilike'?: string;
    'where.telemetryId.in'?: string;
    'where.telemetryId.nin'?: string;
    'where.telemetryId.contains'?: string;
    'where.telemetryId.contained'?: string;
    'where.telemetryId.overlaps'?: string;
    'where.ttl.eq'?: number;
    'where.ttl.neq'?: number;
    'where.ttl.gt'?: number;
    'where.ttl.gte'?: number;
    'where.ttl.lt'?: number;
    'where.ttl.lte'?: number;
    'where.ttl.like'?: number;
    'where.ttl.ilike'?: number;
    'where.ttl.in'?: string;
    'where.ttl.nin'?: string;
    'where.ttl.contains'?: string;
    'where.ttl.contained'?: string;
    'where.ttl.overlaps'?: string;
    'where.varyHeaders.eq'?: string;
    'where.varyHeaders.neq'?: string;
    'where.varyHeaders.gt'?: string;
    'where.varyHeaders.gte'?: string;
    'where.varyHeaders.lt'?: string;
    'where.varyHeaders.lte'?: string;
    'where.varyHeaders.like'?: string;
    'where.varyHeaders.ilike'?: string;
    'where.varyHeaders.in'?: string;
    'where.varyHeaders.nin'?: string;
    'where.varyHeaders.contains'?: string;
    'where.varyHeaders.contained'?: string;
    'where.varyHeaders.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'recommendationId': string;
    'applicationId': string;
    'telemetryId': string;
    'serviceName': string;
    'route': string;
    'recommended': boolean;
    'applied'?: boolean | null;
    'cacheTag'?: string | null;
    'ttl': number;
    'score': number;
    'hits': number;
    'misses': number;
    'memory': number;
    'varyHeaders'?: object | null;
    'scores': object;
    'domain': string;
    'selected'?: boolean | null;
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateRecommendationsRoutesResponseOK = Array<{ 'id'?: string | null; 'recommendationId'?: string | null; 'applicationId'?: string | null; 'telemetryId'?: string | null; 'serviceName'?: string | null; 'route'?: string | null; 'recommended'?: boolean | null; 'applied'?: boolean | null; 'cacheTag'?: string | null; 'ttl'?: number | null; 'score'?: number | null; 'hits'?: number | null; 'misses'?: number | null; 'memory'?: number | null; 'varyHeaders'?: object | null; 'scores'?: object | null; 'domain'?: string | null; 'selected'?: boolean | null; 'createdAt'?: string | null }>
  export type UpdateRecommendationsRoutesResponses =
    UpdateRecommendationsRoutesResponseOK

  export type GetRecommendationsRouteByIdRequest = {
    'fields'?: Array<'applicationId' | 'applied' | 'cacheTag' | 'createdAt' | 'domain' | 'hits' | 'id' | 'memory' | 'misses' | 'recommendationId' | 'recommended' | 'route' | 'score' | 'scores' | 'selected' | 'serviceName' | 'telemetryId' | 'ttl' | 'varyHeaders'>;
    'id': string;
  }

  /**
   * A RecommendationsRoute
   */
  export type GetRecommendationsRouteByIdResponseOK = { 'id'?: string | null; 'recommendationId'?: string | null; 'applicationId'?: string | null; 'telemetryId'?: string | null; 'serviceName'?: string | null; 'route'?: string | null; 'recommended'?: boolean | null; 'applied'?: boolean | null; 'cacheTag'?: string | null; 'ttl'?: number | null; 'score'?: number | null; 'hits'?: number | null; 'misses'?: number | null; 'memory'?: number | null; 'varyHeaders'?: object | null; 'scores'?: object | null; 'domain'?: string | null; 'selected'?: boolean | null; 'createdAt'?: string | null }
  export type GetRecommendationsRouteByIdResponses =
    GetRecommendationsRouteByIdResponseOK

  export type UpdateRecommendationsRouteRequest = {
    'fields'?: Array<'applicationId' | 'applied' | 'cacheTag' | 'createdAt' | 'domain' | 'hits' | 'id' | 'memory' | 'misses' | 'recommendationId' | 'recommended' | 'route' | 'score' | 'scores' | 'selected' | 'serviceName' | 'telemetryId' | 'ttl' | 'varyHeaders'>;
    'id': string;
    'recommendationId': string;
    'applicationId': string;
    'telemetryId': string;
    'serviceName': string;
    'route': string;
    'recommended': boolean;
    'applied'?: boolean | null;
    'cacheTag'?: string | null;
    'ttl': number;
    'score': number;
    'hits': number;
    'misses': number;
    'memory': number;
    'varyHeaders'?: object | null;
    'scores': object;
    'domain': string;
    'selected'?: boolean | null;
    'createdAt'?: string | null;
  }

  /**
   * A RecommendationsRoute
   */
  export type UpdateRecommendationsRouteResponseOK = { 'id'?: string | null; 'recommendationId'?: string | null; 'applicationId'?: string | null; 'telemetryId'?: string | null; 'serviceName'?: string | null; 'route'?: string | null; 'recommended'?: boolean | null; 'applied'?: boolean | null; 'cacheTag'?: string | null; 'ttl'?: number | null; 'score'?: number | null; 'hits'?: number | null; 'misses'?: number | null; 'memory'?: number | null; 'varyHeaders'?: object | null; 'scores'?: object | null; 'domain'?: string | null; 'selected'?: boolean | null; 'createdAt'?: string | null }
  export type UpdateRecommendationsRouteResponses =
    UpdateRecommendationsRouteResponseOK

  export type DeleteRecommendationsRoutesRequest = {
    'fields'?: Array<'applicationId' | 'applied' | 'cacheTag' | 'createdAt' | 'domain' | 'hits' | 'id' | 'memory' | 'misses' | 'recommendationId' | 'recommended' | 'route' | 'score' | 'scores' | 'selected' | 'serviceName' | 'telemetryId' | 'ttl' | 'varyHeaders'>;
    'id': string;
  }

  /**
   * A RecommendationsRoute
   */
  export type DeleteRecommendationsRoutesResponseOK = { 'id'?: string | null; 'recommendationId'?: string | null; 'applicationId'?: string | null; 'telemetryId'?: string | null; 'serviceName'?: string | null; 'route'?: string | null; 'recommended'?: boolean | null; 'applied'?: boolean | null; 'cacheTag'?: string | null; 'ttl'?: number | null; 'score'?: number | null; 'hits'?: number | null; 'misses'?: number | null; 'memory'?: number | null; 'varyHeaders'?: object | null; 'scores'?: object | null; 'domain'?: string | null; 'selected'?: boolean | null; 'createdAt'?: string | null }
  export type DeleteRecommendationsRoutesResponses =
    DeleteRecommendationsRoutesResponseOK

  export type GetRecommendationForRecommendationsRouteRequest = {
    'fields'?: Array<'count' | 'createdAt' | 'id' | 'status' | 'version'>;
    'id': string;
  }

  /**
   * A Recommendation
   */
  export type GetRecommendationForRecommendationsRouteResponseOK = { 'id'?: string | null; 'version'?: number | null; 'status'?: 'aborted' | 'calculating' | 'done' | 'expired' | 'in_progress' | 'new' | 'old' | 'skipped' | null; 'count'?: number | null; 'createdAt'?: string | null }
  export type GetRecommendationForRecommendationsRouteResponses =
    GetRecommendationForRecommendationsRouteResponseOK

  export type GetInterceptorConfigRequest = {
    'recommendationId': string;
    'applicationId': string;
  }

  export type GetInterceptorConfigResponseOK = unknown
  export type GetInterceptorConfigResponses =
    FullResponse<GetInterceptorConfigResponseOK, 200>

  export type SaveInterceptorConfigRequest = {
    'recommendationId': string;
    'applicationId': string;
  }

  export type SaveInterceptorConfigResponseOK = unknown
  export type SaveInterceptorConfigResponses =
    FullResponse<SaveInterceptorConfigResponseOK, 200>

  export type GenerateRecommendationRequest = {
    
  }

  export type GenerateRecommendationResponseOK = unknown
  export type GenerateRecommendationResponses =
    FullResponse<GenerateRecommendationResponseOK, 200>

  export type ApplyApplicationRecommendationRequest = {
    'applicationId': string;
    'saveInterceptorConfig'?: boolean;
  }

  export type ApplyApplicationRecommendationResponseOK = unknown
  export type ApplyApplicationRecommendationResponses =
    FullResponse<ApplyApplicationRecommendationResponseOK, 200>

  export type ChangeRecommendationRouteRequest = {
    'recommendationId': string;
    'selected': boolean;
    'ttl': number;
    'cacheTag': string;
    'varyHeaders': Array<string>;
  }

  export type ChangeRecommendationRouteResponseOK = unknown
  export type ChangeRecommendationRouteResponses =
    FullResponse<ChangeRecommendationRouteResponseOK, 200>

  export type SaveRequestHashRequest = {
    'x-labels': string;
    'applicationId'?: string;
    'timestamp': number;
    'request': { 'url': string };
    'response': { 'bodySize': number; 'bodyHash': string };
  }

  export type SaveRequestHashResponseOK = unknown
  export type SaveRequestHashResponses =
    FullResponse<SaveRequestHashResponseOK, 200>

  export type SaveRequestRequest = {
    'x-labels': string;
    'x-request-data': string;
    'x-response-data': string;
  }

  export type SaveRequestResponseOK = unknown
  export type SaveRequestResponses =
    FullResponse<SaveRequestResponseOK, 200>

  export type SaveUrlsRoutesRequest = {
    'routes': Array<{ 'applicationId': string; 'serviceId': string; 'url': string; 'route': string }>;
  }

  export type SaveUrlsRoutesResponseOK = unknown
  export type SaveUrlsRoutesResponses =
    FullResponse<SaveUrlsRoutesResponseOK, 200>

  export type GetUpdatesRequest = {
    
  }

  export type GetUpdatesResponseOK = unknown
  export type GetUpdatesResponses =
    FullResponse<GetUpdatesResponseOK, 200>

}

type TrafficInspectorPlugin = FastifyPluginAsync<NonNullable<trafficInspector.TrafficInspectorOptions>>

declare module 'fastify' {
  interface ConfigureTrafficInspector {
    getHeaders(req: FastifyRequest, reply: FastifyReply, options: GetHeadersOptions): Promise<Record<string,string>>;
  }
  interface FastifyInstance {
    configureTrafficInspector(opts: ConfigureTrafficInspector): unknown
  }

  interface FastifyRequest {
    /**
     * Platformatic DB
     *
     * Exposing a SQL database as REST
     */
    'trafficInspector': trafficInspector.TrafficInspector;
  }
}

declare function trafficInspector(...params: Parameters<TrafficInspectorPlugin>): ReturnType<TrafficInspectorPlugin>;
export = trafficInspector;
