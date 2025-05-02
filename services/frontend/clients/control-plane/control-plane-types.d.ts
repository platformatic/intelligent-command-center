export interface FullResponse<T, U extends number> {
  'statusCode': U;
  'headers': object;
  'body': T;
}

export type GetGenerationsRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'createdAt' | 'id' | 'version'>;
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
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.version'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetGenerationsResponseOK = Array<{ 'id'?: string | null; 'version'?: number | null; 'createdAt'?: string | null }>
export type GetGenerationsResponses =
  FullResponse<GetGenerationsResponseOK, 200>

export type CreateGenerationRequest = {
  'id'?: string;
  'version': number;
  'createdAt'?: string | null;
}

/**
 * A Generation
 */
export type CreateGenerationResponseOK = { 'id'?: string | null; 'version'?: number | null; 'createdAt'?: string | null }
export type CreateGenerationResponses =
  FullResponse<CreateGenerationResponseOK, 200>

export type UpdateGenerationsRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'version'>;
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
  'createdAt'?: string | null;
}

/**
 * Default Response
 */
export type UpdateGenerationsResponseOK = Array<{ 'id'?: string | null; 'version'?: number | null; 'createdAt'?: string | null }>
export type UpdateGenerationsResponses =
  FullResponse<UpdateGenerationsResponseOK, 200>

export type GetGenerationByIdRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'version'>;
  'id': string;
}

/**
 * A Generation
 */
export type GetGenerationByIdResponseOK = { 'id'?: string | null; 'version'?: number | null; 'createdAt'?: string | null }
export type GetGenerationByIdResponses =
  FullResponse<GetGenerationByIdResponseOK, 200>

export type UpdateGenerationRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'version'>;
  'id': string;
  'version': number;
  'createdAt'?: string | null;
}

/**
 * A Generation
 */
export type UpdateGenerationResponseOK = { 'id'?: string | null; 'version'?: number | null; 'createdAt'?: string | null }
export type UpdateGenerationResponses =
  FullResponse<UpdateGenerationResponseOK, 200>

export type DeleteGenerationsRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'version'>;
  'id': string;
}

/**
 * A Generation
 */
export type DeleteGenerationsResponseOK = { 'id'?: string | null; 'version'?: number | null; 'createdAt'?: string | null }
export type DeleteGenerationsResponses =
  FullResponse<DeleteGenerationsResponseOK, 200>

export type GetGraphsForGenerationRequest = {
  'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetGraphsForGenerationResponseOK = Array<{ 'id'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }>
export type GetGraphsForGenerationResponses =
  FullResponse<GetGraphsForGenerationResponseOK, 200>

export type GetGenerationsDeploymentsForGenerationRequest = {
  'fields'?: Array<'deploymentId' | 'generationId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetGenerationsDeploymentsForGenerationResponseOK = Array<{ 'generationId'?: string | null; 'deploymentId'?: string | null }>
export type GetGenerationsDeploymentsForGenerationResponses =
  FullResponse<GetGenerationsDeploymentsForGenerationResponseOK, 200>

export type GetGenerationsApplicationsConfigsForGenerationRequest = {
  'fields'?: Array<'configId' | 'generationId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetGenerationsApplicationsConfigsForGenerationResponseOK = Array<{ 'generationId'?: string | null; 'configId'?: string | null }>
export type GetGenerationsApplicationsConfigsForGenerationResponses =
  FullResponse<GetGenerationsApplicationsConfigsForGenerationResponseOK, 200>

export type GetGraphsRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id'>;
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
  'where.generationId.eq'?: string;
  'where.generationId.neq'?: string;
  'where.generationId.gt'?: string;
  'where.generationId.gte'?: string;
  'where.generationId.lt'?: string;
  'where.generationId.lte'?: string;
  'where.generationId.like'?: string;
  'where.generationId.ilike'?: string;
  'where.generationId.in'?: string;
  'where.generationId.nin'?: string;
  'where.generationId.contains'?: string;
  'where.generationId.contained'?: string;
  'where.generationId.overlaps'?: string;
  'where.graph.eq'?: string;
  'where.graph.neq'?: string;
  'where.graph.gt'?: string;
  'where.graph.gte'?: string;
  'where.graph.lt'?: string;
  'where.graph.lte'?: string;
  'where.graph.like'?: string;
  'where.graph.ilike'?: string;
  'where.graph.in'?: string;
  'where.graph.nin'?: string;
  'where.graph.contains'?: string;
  'where.graph.contained'?: string;
  'where.graph.overlaps'?: string;
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
  'where.or'?: Array<string>;
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.generationId'?: 'asc' | 'desc';
  'orderby.graph'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetGraphsResponseOK = Array<{ 'id'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }>
export type GetGraphsResponses =
  FullResponse<GetGraphsResponseOK, 200>

export type CreateGraphRequest = {
  'id'?: string;
  'generationId': string;
  'graph': object;
  'createdAt'?: string | null;
}

/**
 * A Graph
 */
export type CreateGraphResponseOK = { 'id'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }
export type CreateGraphResponses =
  FullResponse<CreateGraphResponseOK, 200>

export type UpdateGraphsRequest = {
  'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id'>;
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
  'where.generationId.eq'?: string;
  'where.generationId.neq'?: string;
  'where.generationId.gt'?: string;
  'where.generationId.gte'?: string;
  'where.generationId.lt'?: string;
  'where.generationId.lte'?: string;
  'where.generationId.like'?: string;
  'where.generationId.ilike'?: string;
  'where.generationId.in'?: string;
  'where.generationId.nin'?: string;
  'where.generationId.contains'?: string;
  'where.generationId.contained'?: string;
  'where.generationId.overlaps'?: string;
  'where.graph.eq'?: string;
  'where.graph.neq'?: string;
  'where.graph.gt'?: string;
  'where.graph.gte'?: string;
  'where.graph.lt'?: string;
  'where.graph.lte'?: string;
  'where.graph.like'?: string;
  'where.graph.ilike'?: string;
  'where.graph.in'?: string;
  'where.graph.nin'?: string;
  'where.graph.contains'?: string;
  'where.graph.contained'?: string;
  'where.graph.overlaps'?: string;
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
  'where.or'?: Array<string>;
  'id'?: string;
  'generationId': string;
  'graph': object;
  'createdAt'?: string | null;
}

/**
 * Default Response
 */
export type UpdateGraphsResponseOK = Array<{ 'id'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }>
export type UpdateGraphsResponses =
  FullResponse<UpdateGraphsResponseOK, 200>

export type GetGraphByIdRequest = {
  'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id'>;
  'id': string;
}

/**
 * A Graph
 */
export type GetGraphByIdResponseOK = { 'id'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }
export type GetGraphByIdResponses =
  FullResponse<GetGraphByIdResponseOK, 200>

export type UpdateGraphRequest = {
  'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id'>;
  'id': string;
  'generationId': string;
  'graph': object;
  'createdAt'?: string | null;
}

/**
 * A Graph
 */
export type UpdateGraphResponseOK = { 'id'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }
export type UpdateGraphResponses =
  FullResponse<UpdateGraphResponseOK, 200>

export type DeleteGraphsRequest = {
  'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id'>;
  'id': string;
}

/**
 * A Graph
 */
export type DeleteGraphsResponseOK = { 'id'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }
export type DeleteGraphsResponses =
  FullResponse<DeleteGraphsResponseOK, 200>

export type GetGenerationForGraphRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'version'>;
  'id': string;
}

/**
 * A Generation
 */
export type GetGenerationForGraphResponseOK = { 'id'?: string | null; 'version'?: number | null; 'createdAt'?: string | null }
export type GetGenerationForGraphResponses =
  FullResponse<GetGenerationForGraphResponseOK, 200>

export type GetApplicationsRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'createdAt' | 'id' | 'name'>;
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
  'where.name.eq'?: string;
  'where.name.neq'?: string;
  'where.name.gt'?: string;
  'where.name.gte'?: string;
  'where.name.lt'?: string;
  'where.name.lte'?: string;
  'where.name.like'?: string;
  'where.name.ilike'?: string;
  'where.name.in'?: string;
  'where.name.nin'?: string;
  'where.name.contains'?: string;
  'where.name.contained'?: string;
  'where.name.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.name'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetApplicationsResponseOK = Array<{ 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }>
export type GetApplicationsResponses =
  FullResponse<GetApplicationsResponseOK, 200>

export type CreateApplicationRequest = {
  'id'?: string;
  'name': string;
  'createdAt'?: string | null;
}

/**
 * A Application
 */
export type CreateApplicationResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
export type CreateApplicationResponses =
  FullResponse<CreateApplicationResponseOK, 200>

export type UpdateApplicationsRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name'>;
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
  'where.name.eq'?: string;
  'where.name.neq'?: string;
  'where.name.gt'?: string;
  'where.name.gte'?: string;
  'where.name.lt'?: string;
  'where.name.lte'?: string;
  'where.name.like'?: string;
  'where.name.ilike'?: string;
  'where.name.in'?: string;
  'where.name.nin'?: string;
  'where.name.contains'?: string;
  'where.name.contained'?: string;
  'where.name.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'name': string;
  'createdAt'?: string | null;
}

/**
 * Default Response
 */
export type UpdateApplicationsResponseOK = Array<{ 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }>
export type UpdateApplicationsResponses =
  FullResponse<UpdateApplicationsResponseOK, 200>

export type GetApplicationByIdRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name'>;
  'id': string;
}

/**
 * A Application
 */
export type GetApplicationByIdResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
export type GetApplicationByIdResponses =
  FullResponse<GetApplicationByIdResponseOK, 200>

export type UpdateApplicationRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name'>;
  'id': string;
  'name': string;
  'createdAt'?: string | null;
}

/**
 * A Application
 */
export type UpdateApplicationResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
export type UpdateApplicationResponses =
  FullResponse<UpdateApplicationResponseOK, 200>

export type DeleteApplicationsRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name'>;
  'id': string;
}

/**
 * A Application
 */
export type DeleteApplicationsResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
export type DeleteApplicationsResponses =
  FullResponse<DeleteApplicationsResponseOK, 200>

export type GetApplicationsConfigsForApplicationRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'resources' | 'version'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetApplicationsConfigsForApplicationResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'version'?: number | null; 'resources'?: object | null; 'createdAt'?: string | null }>
export type GetApplicationsConfigsForApplicationResponses =
  FullResponse<GetApplicationsConfigsForApplicationResponseOK, 200>

export type GetApplicationStatesForApplicationRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'pltVersion' | 'state'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetApplicationStatesForApplicationResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'pltVersion'?: string | null; 'state'?: object | null; 'createdAt'?: string | null }>
export type GetApplicationStatesForApplicationResponses =
  FullResponse<GetApplicationStatesForApplicationResponseOK, 200>

export type GetDeploymentsForApplicationRequest = {
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'status'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetDeploymentsForApplicationResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null; 'imageId'?: string | null; 'createdAt'?: string | null }>
export type GetDeploymentsForApplicationResponses =
  FullResponse<GetDeploymentsForApplicationResponseOK, 200>

export type GetInstancesForApplicationRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'deploymentId' | 'id' | 'podId' | 'status'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetInstancesForApplicationResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'podId'?: string | null; 'status'?: 'running' | 'starting' | 'stopped' | null; 'createdAt'?: string | null }>
export type GetInstancesForApplicationResponses =
  FullResponse<GetInstancesForApplicationResponseOK, 200>

export type GetValkeyUsersForApplicationRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'encryptedPassword' | 'id' | 'keyPrefix' | 'username'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetValkeyUsersForApplicationResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'username'?: string | null; 'encryptedPassword'?: string | null; 'keyPrefix'?: string | null; 'createdAt'?: string | null }>
export type GetValkeyUsersForApplicationResponses =
  FullResponse<GetValkeyUsersForApplicationResponseOK, 200>

export type GetApplicationsConfigsRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'resources' | 'version'>;
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
  'where.resources.eq'?: string;
  'where.resources.neq'?: string;
  'where.resources.gt'?: string;
  'where.resources.gte'?: string;
  'where.resources.lt'?: string;
  'where.resources.lte'?: string;
  'where.resources.like'?: string;
  'where.resources.ilike'?: string;
  'where.resources.in'?: string;
  'where.resources.nin'?: string;
  'where.resources.contains'?: string;
  'where.resources.contained'?: string;
  'where.resources.overlaps'?: string;
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
  'orderby.applicationId'?: 'asc' | 'desc';
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.resources'?: 'asc' | 'desc';
  'orderby.version'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetApplicationsConfigsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'version'?: number | null; 'resources'?: object | null; 'createdAt'?: string | null }>
export type GetApplicationsConfigsResponses =
  FullResponse<GetApplicationsConfigsResponseOK, 200>

export type CreateApplicationsConfigRequest = {
  'id'?: string;
  'applicationId': string;
  'version': number;
  'resources': object;
  'createdAt'?: string | null;
}

/**
 * A ApplicationsConfig
 */
export type CreateApplicationsConfigResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'version'?: number | null; 'resources'?: object | null; 'createdAt'?: string | null }
export type CreateApplicationsConfigResponses =
  FullResponse<CreateApplicationsConfigResponseOK, 200>

export type UpdateApplicationsConfigsRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'resources' | 'version'>;
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
  'where.resources.eq'?: string;
  'where.resources.neq'?: string;
  'where.resources.gt'?: string;
  'where.resources.gte'?: string;
  'where.resources.lt'?: string;
  'where.resources.lte'?: string;
  'where.resources.like'?: string;
  'where.resources.ilike'?: string;
  'where.resources.in'?: string;
  'where.resources.nin'?: string;
  'where.resources.contains'?: string;
  'where.resources.contained'?: string;
  'where.resources.overlaps'?: string;
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
  'applicationId': string;
  'version': number;
  'resources': object;
  'createdAt'?: string | null;
}

/**
 * Default Response
 */
export type UpdateApplicationsConfigsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'version'?: number | null; 'resources'?: object | null; 'createdAt'?: string | null }>
export type UpdateApplicationsConfigsResponses =
  FullResponse<UpdateApplicationsConfigsResponseOK, 200>

export type GetApplicationsConfigByIdRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'resources' | 'version'>;
  'id': string;
}

/**
 * A ApplicationsConfig
 */
export type GetApplicationsConfigByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'version'?: number | null; 'resources'?: object | null; 'createdAt'?: string | null }
export type GetApplicationsConfigByIdResponses =
  FullResponse<GetApplicationsConfigByIdResponseOK, 200>

export type UpdateApplicationsConfigRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'resources' | 'version'>;
  'id': string;
  'applicationId': string;
  'version': number;
  'resources': object;
  'createdAt'?: string | null;
}

/**
 * A ApplicationsConfig
 */
export type UpdateApplicationsConfigResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'version'?: number | null; 'resources'?: object | null; 'createdAt'?: string | null }
export type UpdateApplicationsConfigResponses =
  FullResponse<UpdateApplicationsConfigResponseOK, 200>

export type DeleteApplicationsConfigsRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'resources' | 'version'>;
  'id': string;
}

/**
 * A ApplicationsConfig
 */
export type DeleteApplicationsConfigsResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'version'?: number | null; 'resources'?: object | null; 'createdAt'?: string | null }
export type DeleteApplicationsConfigsResponses =
  FullResponse<DeleteApplicationsConfigsResponseOK, 200>

export type GetGenerationsApplicationsConfigsForApplicationsConfigRequest = {
  'fields'?: Array<'configId' | 'generationId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetGenerationsApplicationsConfigsForApplicationsConfigResponseOK = Array<{ 'generationId'?: string | null; 'configId'?: string | null }>
export type GetGenerationsApplicationsConfigsForApplicationsConfigResponses =
  FullResponse<GetGenerationsApplicationsConfigsForApplicationsConfigResponseOK, 200>

export type GetApplicationForApplicationsConfigRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name'>;
  'id': string;
}

/**
 * A Application
 */
export type GetApplicationForApplicationsConfigResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
export type GetApplicationForApplicationsConfigResponses =
  FullResponse<GetApplicationForApplicationsConfigResponseOK, 200>

export type GetApplicationStatesRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'pltVersion' | 'state'>;
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
  'where.pltVersion.eq'?: string;
  'where.pltVersion.neq'?: string;
  'where.pltVersion.gt'?: string;
  'where.pltVersion.gte'?: string;
  'where.pltVersion.lt'?: string;
  'where.pltVersion.lte'?: string;
  'where.pltVersion.like'?: string;
  'where.pltVersion.ilike'?: string;
  'where.pltVersion.in'?: string;
  'where.pltVersion.nin'?: string;
  'where.pltVersion.contains'?: string;
  'where.pltVersion.contained'?: string;
  'where.pltVersion.overlaps'?: string;
  'where.state.eq'?: string;
  'where.state.neq'?: string;
  'where.state.gt'?: string;
  'where.state.gte'?: string;
  'where.state.lt'?: string;
  'where.state.lte'?: string;
  'where.state.like'?: string;
  'where.state.ilike'?: string;
  'where.state.in'?: string;
  'where.state.nin'?: string;
  'where.state.contains'?: string;
  'where.state.contained'?: string;
  'where.state.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.applicationId'?: 'asc' | 'desc';
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.pltVersion'?: 'asc' | 'desc';
  'orderby.state'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetApplicationStatesResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'pltVersion'?: string | null; 'state'?: object | null; 'createdAt'?: string | null }>
export type GetApplicationStatesResponses =
  FullResponse<GetApplicationStatesResponseOK, 200>

export type CreateApplicationStateRequest = {
  'id'?: string;
  'applicationId': string;
  'pltVersion': string;
  'state': object;
  'createdAt'?: string | null;
}

/**
 * A ApplicationState
 */
export type CreateApplicationStateResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'pltVersion'?: string | null; 'state'?: object | null; 'createdAt'?: string | null }
export type CreateApplicationStateResponses =
  FullResponse<CreateApplicationStateResponseOK, 200>

export type UpdateApplicationStatesRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'pltVersion' | 'state'>;
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
  'where.pltVersion.eq'?: string;
  'where.pltVersion.neq'?: string;
  'where.pltVersion.gt'?: string;
  'where.pltVersion.gte'?: string;
  'where.pltVersion.lt'?: string;
  'where.pltVersion.lte'?: string;
  'where.pltVersion.like'?: string;
  'where.pltVersion.ilike'?: string;
  'where.pltVersion.in'?: string;
  'where.pltVersion.nin'?: string;
  'where.pltVersion.contains'?: string;
  'where.pltVersion.contained'?: string;
  'where.pltVersion.overlaps'?: string;
  'where.state.eq'?: string;
  'where.state.neq'?: string;
  'where.state.gt'?: string;
  'where.state.gte'?: string;
  'where.state.lt'?: string;
  'where.state.lte'?: string;
  'where.state.like'?: string;
  'where.state.ilike'?: string;
  'where.state.in'?: string;
  'where.state.nin'?: string;
  'where.state.contains'?: string;
  'where.state.contained'?: string;
  'where.state.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'applicationId': string;
  'pltVersion': string;
  'state': object;
  'createdAt'?: string | null;
}

/**
 * Default Response
 */
export type UpdateApplicationStatesResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'pltVersion'?: string | null; 'state'?: object | null; 'createdAt'?: string | null }>
export type UpdateApplicationStatesResponses =
  FullResponse<UpdateApplicationStatesResponseOK, 200>

export type GetApplicationStateByIdRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'pltVersion' | 'state'>;
  'id': string;
}

/**
 * A ApplicationState
 */
export type GetApplicationStateByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'pltVersion'?: string | null; 'state'?: object | null; 'createdAt'?: string | null }
export type GetApplicationStateByIdResponses =
  FullResponse<GetApplicationStateByIdResponseOK, 200>

export type UpdateApplicationStateRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'pltVersion' | 'state'>;
  'id': string;
  'applicationId': string;
  'pltVersion': string;
  'state': object;
  'createdAt'?: string | null;
}

/**
 * A ApplicationState
 */
export type UpdateApplicationStateResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'pltVersion'?: string | null; 'state'?: object | null; 'createdAt'?: string | null }
export type UpdateApplicationStateResponses =
  FullResponse<UpdateApplicationStateResponseOK, 200>

export type DeleteApplicationStatesRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'pltVersion' | 'state'>;
  'id': string;
}

/**
 * A ApplicationState
 */
export type DeleteApplicationStatesResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'pltVersion'?: string | null; 'state'?: object | null; 'createdAt'?: string | null }
export type DeleteApplicationStatesResponses =
  FullResponse<DeleteApplicationStatesResponseOK, 200>

export type GetDeploymentsForApplicationStateRequest = {
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'status'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetDeploymentsForApplicationStateResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null; 'imageId'?: string | null; 'createdAt'?: string | null }>
export type GetDeploymentsForApplicationStateResponses =
  FullResponse<GetDeploymentsForApplicationStateResponseOK, 200>

export type GetApplicationForApplicationStateRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name'>;
  'id': string;
}

/**
 * A Application
 */
export type GetApplicationForApplicationStateResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
export type GetApplicationForApplicationStateResponses =
  FullResponse<GetApplicationForApplicationStateResponseOK, 200>

export type GetDeploymentsRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'status'>;
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
  'where.applicationStateId.eq'?: string;
  'where.applicationStateId.neq'?: string;
  'where.applicationStateId.gt'?: string;
  'where.applicationStateId.gte'?: string;
  'where.applicationStateId.lt'?: string;
  'where.applicationStateId.lte'?: string;
  'where.applicationStateId.like'?: string;
  'where.applicationStateId.ilike'?: string;
  'where.applicationStateId.in'?: string;
  'where.applicationStateId.nin'?: string;
  'where.applicationStateId.contains'?: string;
  'where.applicationStateId.contained'?: string;
  'where.applicationStateId.overlaps'?: string;
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
  'where.imageId.eq'?: string;
  'where.imageId.neq'?: string;
  'where.imageId.gt'?: string;
  'where.imageId.gte'?: string;
  'where.imageId.lt'?: string;
  'where.imageId.lte'?: string;
  'where.imageId.like'?: string;
  'where.imageId.ilike'?: string;
  'where.imageId.in'?: string;
  'where.imageId.nin'?: string;
  'where.imageId.contains'?: string;
  'where.imageId.contained'?: string;
  'where.imageId.overlaps'?: string;
  'where.status.eq'?: 'failed' | 'started' | 'starting';
  'where.status.neq'?: 'failed' | 'started' | 'starting';
  'where.status.gt'?: 'failed' | 'started' | 'starting';
  'where.status.gte'?: 'failed' | 'started' | 'starting';
  'where.status.lt'?: 'failed' | 'started' | 'starting';
  'where.status.lte'?: 'failed' | 'started' | 'starting';
  'where.status.like'?: 'failed' | 'started' | 'starting';
  'where.status.ilike'?: 'failed' | 'started' | 'starting';
  'where.status.in'?: string;
  'where.status.nin'?: string;
  'where.status.contains'?: string;
  'where.status.contained'?: string;
  'where.status.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.applicationId'?: 'asc' | 'desc';
  'orderby.applicationStateId'?: 'asc' | 'desc';
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.imageId'?: 'asc' | 'desc';
  'orderby.status'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetDeploymentsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null; 'imageId'?: string | null; 'createdAt'?: string | null }>
export type GetDeploymentsResponses =
  FullResponse<GetDeploymentsResponseOK, 200>

export type CreateDeploymentRequest = {
  'id'?: string;
  'applicationId': string;
  'applicationStateId'?: string | null;
  'status': 'failed' | 'started' | 'starting';
  'imageId': string;
  'createdAt'?: string | null;
}

/**
 * A Deployment
 */
export type CreateDeploymentResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null; 'imageId'?: string | null; 'createdAt'?: string | null }
export type CreateDeploymentResponses =
  FullResponse<CreateDeploymentResponseOK, 200>

export type UpdateDeploymentsRequest = {
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'status'>;
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
  'where.applicationStateId.eq'?: string;
  'where.applicationStateId.neq'?: string;
  'where.applicationStateId.gt'?: string;
  'where.applicationStateId.gte'?: string;
  'where.applicationStateId.lt'?: string;
  'where.applicationStateId.lte'?: string;
  'where.applicationStateId.like'?: string;
  'where.applicationStateId.ilike'?: string;
  'where.applicationStateId.in'?: string;
  'where.applicationStateId.nin'?: string;
  'where.applicationStateId.contains'?: string;
  'where.applicationStateId.contained'?: string;
  'where.applicationStateId.overlaps'?: string;
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
  'where.imageId.eq'?: string;
  'where.imageId.neq'?: string;
  'where.imageId.gt'?: string;
  'where.imageId.gte'?: string;
  'where.imageId.lt'?: string;
  'where.imageId.lte'?: string;
  'where.imageId.like'?: string;
  'where.imageId.ilike'?: string;
  'where.imageId.in'?: string;
  'where.imageId.nin'?: string;
  'where.imageId.contains'?: string;
  'where.imageId.contained'?: string;
  'where.imageId.overlaps'?: string;
  'where.status.eq'?: 'failed' | 'started' | 'starting';
  'where.status.neq'?: 'failed' | 'started' | 'starting';
  'where.status.gt'?: 'failed' | 'started' | 'starting';
  'where.status.gte'?: 'failed' | 'started' | 'starting';
  'where.status.lt'?: 'failed' | 'started' | 'starting';
  'where.status.lte'?: 'failed' | 'started' | 'starting';
  'where.status.like'?: 'failed' | 'started' | 'starting';
  'where.status.ilike'?: 'failed' | 'started' | 'starting';
  'where.status.in'?: string;
  'where.status.nin'?: string;
  'where.status.contains'?: string;
  'where.status.contained'?: string;
  'where.status.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'applicationId': string;
  'applicationStateId'?: string | null;
  'status': 'failed' | 'started' | 'starting';
  'imageId': string;
  'createdAt'?: string | null;
}

/**
 * Default Response
 */
export type UpdateDeploymentsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null; 'imageId'?: string | null; 'createdAt'?: string | null }>
export type UpdateDeploymentsResponses =
  FullResponse<UpdateDeploymentsResponseOK, 200>

export type GetDeploymentByIdRequest = {
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'status'>;
  'id': string;
}

/**
 * A Deployment
 */
export type GetDeploymentByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null; 'imageId'?: string | null; 'createdAt'?: string | null }
export type GetDeploymentByIdResponses =
  FullResponse<GetDeploymentByIdResponseOK, 200>

export type UpdateDeploymentRequest = {
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'status'>;
  'id': string;
  'applicationId': string;
  'applicationStateId'?: string | null;
  'status': 'failed' | 'started' | 'starting';
  'imageId': string;
  'createdAt'?: string | null;
}

/**
 * A Deployment
 */
export type UpdateDeploymentResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null; 'imageId'?: string | null; 'createdAt'?: string | null }
export type UpdateDeploymentResponses =
  FullResponse<UpdateDeploymentResponseOK, 200>

export type DeleteDeploymentsRequest = {
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'status'>;
  'id': string;
}

/**
 * A Deployment
 */
export type DeleteDeploymentsResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null; 'imageId'?: string | null; 'createdAt'?: string | null }
export type DeleteDeploymentsResponses =
  FullResponse<DeleteDeploymentsResponseOK, 200>

export type GetInstancesForDeploymentRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'deploymentId' | 'id' | 'podId' | 'status'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetInstancesForDeploymentResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'podId'?: string | null; 'status'?: 'running' | 'starting' | 'stopped' | null; 'createdAt'?: string | null }>
export type GetInstancesForDeploymentResponses =
  FullResponse<GetInstancesForDeploymentResponseOK, 200>

export type GetGenerationsDeploymentsForDeploymentRequest = {
  'fields'?: Array<'deploymentId' | 'generationId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetGenerationsDeploymentsForDeploymentResponseOK = Array<{ 'generationId'?: string | null; 'deploymentId'?: string | null }>
export type GetGenerationsDeploymentsForDeploymentResponses =
  FullResponse<GetGenerationsDeploymentsForDeploymentResponseOK, 200>

export type GetApplicationForDeploymentRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name'>;
  'id': string;
}

/**
 * A Application
 */
export type GetApplicationForDeploymentResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
export type GetApplicationForDeploymentResponses =
  FullResponse<GetApplicationForDeploymentResponseOK, 200>

export type GetApplicationStateForDeploymentRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'pltVersion' | 'state'>;
  'id': string;
}

/**
 * A ApplicationState
 */
export type GetApplicationStateForDeploymentResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'pltVersion'?: string | null; 'state'?: object | null; 'createdAt'?: string | null }
export type GetApplicationStateForDeploymentResponses =
  FullResponse<GetApplicationStateForDeploymentResponseOK, 200>

export type GetInstancesRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'applicationId' | 'createdAt' | 'deploymentId' | 'id' | 'podId' | 'status'>;
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
  'where.podId.eq'?: string;
  'where.podId.neq'?: string;
  'where.podId.gt'?: string;
  'where.podId.gte'?: string;
  'where.podId.lt'?: string;
  'where.podId.lte'?: string;
  'where.podId.like'?: string;
  'where.podId.ilike'?: string;
  'where.podId.in'?: string;
  'where.podId.nin'?: string;
  'where.podId.contains'?: string;
  'where.podId.contained'?: string;
  'where.podId.overlaps'?: string;
  'where.status.eq'?: 'running' | 'starting' | 'stopped';
  'where.status.neq'?: 'running' | 'starting' | 'stopped';
  'where.status.gt'?: 'running' | 'starting' | 'stopped';
  'where.status.gte'?: 'running' | 'starting' | 'stopped';
  'where.status.lt'?: 'running' | 'starting' | 'stopped';
  'where.status.lte'?: 'running' | 'starting' | 'stopped';
  'where.status.like'?: 'running' | 'starting' | 'stopped';
  'where.status.ilike'?: 'running' | 'starting' | 'stopped';
  'where.status.in'?: string;
  'where.status.nin'?: string;
  'where.status.contains'?: string;
  'where.status.contained'?: string;
  'where.status.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.applicationId'?: 'asc' | 'desc';
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.deploymentId'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.podId'?: 'asc' | 'desc';
  'orderby.status'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetInstancesResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'podId'?: string | null; 'status'?: 'running' | 'starting' | 'stopped' | null; 'createdAt'?: string | null }>
export type GetInstancesResponses =
  FullResponse<GetInstancesResponseOK, 200>

export type CreateInstanceRequest = {
  'id'?: string;
  'applicationId': string;
  'deploymentId'?: string | null;
  'podId': string;
  'status': 'running' | 'starting' | 'stopped';
  'createdAt'?: string | null;
}

/**
 * A Instance
 */
export type CreateInstanceResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'podId'?: string | null; 'status'?: 'running' | 'starting' | 'stopped' | null; 'createdAt'?: string | null }
export type CreateInstanceResponses =
  FullResponse<CreateInstanceResponseOK, 200>

export type UpdateInstancesRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'deploymentId' | 'id' | 'podId' | 'status'>;
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
  'where.podId.eq'?: string;
  'where.podId.neq'?: string;
  'where.podId.gt'?: string;
  'where.podId.gte'?: string;
  'where.podId.lt'?: string;
  'where.podId.lte'?: string;
  'where.podId.like'?: string;
  'where.podId.ilike'?: string;
  'where.podId.in'?: string;
  'where.podId.nin'?: string;
  'where.podId.contains'?: string;
  'where.podId.contained'?: string;
  'where.podId.overlaps'?: string;
  'where.status.eq'?: 'running' | 'starting' | 'stopped';
  'where.status.neq'?: 'running' | 'starting' | 'stopped';
  'where.status.gt'?: 'running' | 'starting' | 'stopped';
  'where.status.gte'?: 'running' | 'starting' | 'stopped';
  'where.status.lt'?: 'running' | 'starting' | 'stopped';
  'where.status.lte'?: 'running' | 'starting' | 'stopped';
  'where.status.like'?: 'running' | 'starting' | 'stopped';
  'where.status.ilike'?: 'running' | 'starting' | 'stopped';
  'where.status.in'?: string;
  'where.status.nin'?: string;
  'where.status.contains'?: string;
  'where.status.contained'?: string;
  'where.status.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'applicationId': string;
  'deploymentId'?: string | null;
  'podId': string;
  'status': 'running' | 'starting' | 'stopped';
  'createdAt'?: string | null;
}

/**
 * Default Response
 */
export type UpdateInstancesResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'podId'?: string | null; 'status'?: 'running' | 'starting' | 'stopped' | null; 'createdAt'?: string | null }>
export type UpdateInstancesResponses =
  FullResponse<UpdateInstancesResponseOK, 200>

export type GetInstanceByIdRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'deploymentId' | 'id' | 'podId' | 'status'>;
  'id': string;
}

/**
 * A Instance
 */
export type GetInstanceByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'podId'?: string | null; 'status'?: 'running' | 'starting' | 'stopped' | null; 'createdAt'?: string | null }
export type GetInstanceByIdResponses =
  FullResponse<GetInstanceByIdResponseOK, 200>

export type UpdateInstanceRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'deploymentId' | 'id' | 'podId' | 'status'>;
  'id': string;
  'applicationId': string;
  'deploymentId'?: string | null;
  'podId': string;
  'status': 'running' | 'starting' | 'stopped';
  'createdAt'?: string | null;
}

/**
 * A Instance
 */
export type UpdateInstanceResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'podId'?: string | null; 'status'?: 'running' | 'starting' | 'stopped' | null; 'createdAt'?: string | null }
export type UpdateInstanceResponses =
  FullResponse<UpdateInstanceResponseOK, 200>

export type DeleteInstancesRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'deploymentId' | 'id' | 'podId' | 'status'>;
  'id': string;
}

/**
 * A Instance
 */
export type DeleteInstancesResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'podId'?: string | null; 'status'?: 'running' | 'starting' | 'stopped' | null; 'createdAt'?: string | null }
export type DeleteInstancesResponses =
  FullResponse<DeleteInstancesResponseOK, 200>

export type GetApplicationForInstanceRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name'>;
  'id': string;
}

/**
 * A Application
 */
export type GetApplicationForInstanceResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
export type GetApplicationForInstanceResponses =
  FullResponse<GetApplicationForInstanceResponseOK, 200>

export type GetDeploymentForInstanceRequest = {
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'status'>;
  'id': string;
}

/**
 * A Deployment
 */
export type GetDeploymentForInstanceResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null; 'imageId'?: string | null; 'createdAt'?: string | null }
export type GetDeploymentForInstanceResponses =
  FullResponse<GetDeploymentForInstanceResponseOK, 200>

export type GetValkeyUsersRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'applicationId' | 'createdAt' | 'encryptedPassword' | 'id' | 'keyPrefix' | 'username'>;
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
  'where.encryptedPassword.eq'?: string;
  'where.encryptedPassword.neq'?: string;
  'where.encryptedPassword.gt'?: string;
  'where.encryptedPassword.gte'?: string;
  'where.encryptedPassword.lt'?: string;
  'where.encryptedPassword.lte'?: string;
  'where.encryptedPassword.like'?: string;
  'where.encryptedPassword.ilike'?: string;
  'where.encryptedPassword.in'?: string;
  'where.encryptedPassword.nin'?: string;
  'where.encryptedPassword.contains'?: string;
  'where.encryptedPassword.contained'?: string;
  'where.encryptedPassword.overlaps'?: string;
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
  'where.keyPrefix.eq'?: string;
  'where.keyPrefix.neq'?: string;
  'where.keyPrefix.gt'?: string;
  'where.keyPrefix.gte'?: string;
  'where.keyPrefix.lt'?: string;
  'where.keyPrefix.lte'?: string;
  'where.keyPrefix.like'?: string;
  'where.keyPrefix.ilike'?: string;
  'where.keyPrefix.in'?: string;
  'where.keyPrefix.nin'?: string;
  'where.keyPrefix.contains'?: string;
  'where.keyPrefix.contained'?: string;
  'where.keyPrefix.overlaps'?: string;
  'where.username.eq'?: string;
  'where.username.neq'?: string;
  'where.username.gt'?: string;
  'where.username.gte'?: string;
  'where.username.lt'?: string;
  'where.username.lte'?: string;
  'where.username.like'?: string;
  'where.username.ilike'?: string;
  'where.username.in'?: string;
  'where.username.nin'?: string;
  'where.username.contains'?: string;
  'where.username.contained'?: string;
  'where.username.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.applicationId'?: 'asc' | 'desc';
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.encryptedPassword'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.keyPrefix'?: 'asc' | 'desc';
  'orderby.username'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetValkeyUsersResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'username'?: string | null; 'encryptedPassword'?: string | null; 'keyPrefix'?: string | null; 'createdAt'?: string | null }>
export type GetValkeyUsersResponses =
  FullResponse<GetValkeyUsersResponseOK, 200>

export type CreateValkeyUserRequest = {
  'id'?: string;
  'applicationId': string;
  'username': string;
  'encryptedPassword': string;
  'keyPrefix': string;
  'createdAt'?: string | null;
}

/**
 * A ValkeyUser
 */
export type CreateValkeyUserResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'username'?: string | null; 'encryptedPassword'?: string | null; 'keyPrefix'?: string | null; 'createdAt'?: string | null }
export type CreateValkeyUserResponses =
  FullResponse<CreateValkeyUserResponseOK, 200>

export type UpdateValkeyUsersRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'encryptedPassword' | 'id' | 'keyPrefix' | 'username'>;
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
  'where.encryptedPassword.eq'?: string;
  'where.encryptedPassword.neq'?: string;
  'where.encryptedPassword.gt'?: string;
  'where.encryptedPassword.gte'?: string;
  'where.encryptedPassword.lt'?: string;
  'where.encryptedPassword.lte'?: string;
  'where.encryptedPassword.like'?: string;
  'where.encryptedPassword.ilike'?: string;
  'where.encryptedPassword.in'?: string;
  'where.encryptedPassword.nin'?: string;
  'where.encryptedPassword.contains'?: string;
  'where.encryptedPassword.contained'?: string;
  'where.encryptedPassword.overlaps'?: string;
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
  'where.keyPrefix.eq'?: string;
  'where.keyPrefix.neq'?: string;
  'where.keyPrefix.gt'?: string;
  'where.keyPrefix.gte'?: string;
  'where.keyPrefix.lt'?: string;
  'where.keyPrefix.lte'?: string;
  'where.keyPrefix.like'?: string;
  'where.keyPrefix.ilike'?: string;
  'where.keyPrefix.in'?: string;
  'where.keyPrefix.nin'?: string;
  'where.keyPrefix.contains'?: string;
  'where.keyPrefix.contained'?: string;
  'where.keyPrefix.overlaps'?: string;
  'where.username.eq'?: string;
  'where.username.neq'?: string;
  'where.username.gt'?: string;
  'where.username.gte'?: string;
  'where.username.lt'?: string;
  'where.username.lte'?: string;
  'where.username.like'?: string;
  'where.username.ilike'?: string;
  'where.username.in'?: string;
  'where.username.nin'?: string;
  'where.username.contains'?: string;
  'where.username.contained'?: string;
  'where.username.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'applicationId': string;
  'username': string;
  'encryptedPassword': string;
  'keyPrefix': string;
  'createdAt'?: string | null;
}

/**
 * Default Response
 */
export type UpdateValkeyUsersResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'username'?: string | null; 'encryptedPassword'?: string | null; 'keyPrefix'?: string | null; 'createdAt'?: string | null }>
export type UpdateValkeyUsersResponses =
  FullResponse<UpdateValkeyUsersResponseOK, 200>

export type GetValkeyUserByIdRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'encryptedPassword' | 'id' | 'keyPrefix' | 'username'>;
  'id': string;
}

/**
 * A ValkeyUser
 */
export type GetValkeyUserByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'username'?: string | null; 'encryptedPassword'?: string | null; 'keyPrefix'?: string | null; 'createdAt'?: string | null }
export type GetValkeyUserByIdResponses =
  FullResponse<GetValkeyUserByIdResponseOK, 200>

export type UpdateValkeyUserRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'encryptedPassword' | 'id' | 'keyPrefix' | 'username'>;
  'id': string;
  'applicationId': string;
  'username': string;
  'encryptedPassword': string;
  'keyPrefix': string;
  'createdAt'?: string | null;
}

/**
 * A ValkeyUser
 */
export type UpdateValkeyUserResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'username'?: string | null; 'encryptedPassword'?: string | null; 'keyPrefix'?: string | null; 'createdAt'?: string | null }
export type UpdateValkeyUserResponses =
  FullResponse<UpdateValkeyUserResponseOK, 200>

export type DeleteValkeyUsersRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'encryptedPassword' | 'id' | 'keyPrefix' | 'username'>;
  'id': string;
}

/**
 * A ValkeyUser
 */
export type DeleteValkeyUsersResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'username'?: string | null; 'encryptedPassword'?: string | null; 'keyPrefix'?: string | null; 'createdAt'?: string | null }
export type DeleteValkeyUsersResponses =
  FullResponse<DeleteValkeyUsersResponseOK, 200>

export type GetApplicationForValkeyUserRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name'>;
  'id': string;
}

/**
 * A Application
 */
export type GetApplicationForValkeyUserResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
export type GetApplicationForValkeyUserResponses =
  FullResponse<GetApplicationForValkeyUserResponseOK, 200>

export type GetGenerationsDeploymentsRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'deploymentId' | 'generationId'>;
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
  'where.generationId.eq'?: string;
  'where.generationId.neq'?: string;
  'where.generationId.gt'?: string;
  'where.generationId.gte'?: string;
  'where.generationId.lt'?: string;
  'where.generationId.lte'?: string;
  'where.generationId.like'?: string;
  'where.generationId.ilike'?: string;
  'where.generationId.in'?: string;
  'where.generationId.nin'?: string;
  'where.generationId.contains'?: string;
  'where.generationId.contained'?: string;
  'where.generationId.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.deploymentId'?: 'asc' | 'desc';
  'orderby.generationId'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetGenerationsDeploymentsResponseOK = Array<{ 'generationId'?: string | null; 'deploymentId'?: string | null }>
export type GetGenerationsDeploymentsResponses =
  FullResponse<GetGenerationsDeploymentsResponseOK, 200>

export type CreateGenerationsDeploymentRequest = {
  'generationId': string;
  'deploymentId': string;
}

/**
 * A GenerationsDeployment
 */
export type CreateGenerationsDeploymentResponseOK = { 'generationId'?: string | null; 'deploymentId'?: string | null }
export type CreateGenerationsDeploymentResponses =
  FullResponse<CreateGenerationsDeploymentResponseOK, 200>

export type UpdateGenerationsDeploymentsRequest = {
  'fields'?: Array<'deploymentId' | 'generationId'>;
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
  'where.generationId.eq'?: string;
  'where.generationId.neq'?: string;
  'where.generationId.gt'?: string;
  'where.generationId.gte'?: string;
  'where.generationId.lt'?: string;
  'where.generationId.lte'?: string;
  'where.generationId.like'?: string;
  'where.generationId.ilike'?: string;
  'where.generationId.in'?: string;
  'where.generationId.nin'?: string;
  'where.generationId.contains'?: string;
  'where.generationId.contained'?: string;
  'where.generationId.overlaps'?: string;
  'where.or'?: Array<string>;
  'generationId': string;
  'deploymentId': string;
}

/**
 * Default Response
 */
export type UpdateGenerationsDeploymentsResponseOK = Array<{ 'generationId'?: string | null; 'deploymentId'?: string | null }>
export type UpdateGenerationsDeploymentsResponses =
  FullResponse<UpdateGenerationsDeploymentsResponseOK, 200>

export type GetGenerationsDeploymentByGenerationIdAndDeploymentIdRequest = {
  'fields'?: Array<'deploymentId' | 'generationId'>;
  'generationId': string;
  'deploymentId': string;
}

/**
 * A GenerationsDeployment
 */
export type GetGenerationsDeploymentByGenerationIdAndDeploymentIdResponseOK = { 'generationId'?: string | null; 'deploymentId'?: string | null }
export type GetGenerationsDeploymentByGenerationIdAndDeploymentIdResponses =
  FullResponse<GetGenerationsDeploymentByGenerationIdAndDeploymentIdResponseOK, 200>

export type PostGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdRequest = {
  'fields'?: Array<'deploymentId' | 'generationId'>;
  'generationId': string;
  'deploymentId': string;
}

/**
 * A GenerationsDeployment
 */
export type PostGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponseOK = { 'generationId'?: string | null; 'deploymentId'?: string | null }
export type PostGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponses =
  FullResponse<PostGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponseOK, 200>

export type PutGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdRequest = {
  'fields'?: Array<'deploymentId' | 'generationId'>;
  'generationId': string;
  'deploymentId': string;
}

/**
 * A GenerationsDeployment
 */
export type PutGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponseOK = { 'generationId'?: string | null; 'deploymentId'?: string | null }
export type PutGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponses =
  FullResponse<PutGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponseOK, 200>

export type DeleteGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdRequest = {
  'fields'?: Array<'deploymentId' | 'generationId'>;
  'generationId': string;
  'deploymentId': string;
}

/**
 * A GenerationsDeployment
 */
export type DeleteGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponseOK = { 'generationId'?: string | null; 'deploymentId'?: string | null }
export type DeleteGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponses =
  FullResponse<DeleteGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponseOK, 200>

export type GetGenerationsApplicationsConfigsRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'configId' | 'generationId'>;
  'where.configId.eq'?: string;
  'where.configId.neq'?: string;
  'where.configId.gt'?: string;
  'where.configId.gte'?: string;
  'where.configId.lt'?: string;
  'where.configId.lte'?: string;
  'where.configId.like'?: string;
  'where.configId.ilike'?: string;
  'where.configId.in'?: string;
  'where.configId.nin'?: string;
  'where.configId.contains'?: string;
  'where.configId.contained'?: string;
  'where.configId.overlaps'?: string;
  'where.generationId.eq'?: string;
  'where.generationId.neq'?: string;
  'where.generationId.gt'?: string;
  'where.generationId.gte'?: string;
  'where.generationId.lt'?: string;
  'where.generationId.lte'?: string;
  'where.generationId.like'?: string;
  'where.generationId.ilike'?: string;
  'where.generationId.in'?: string;
  'where.generationId.nin'?: string;
  'where.generationId.contains'?: string;
  'where.generationId.contained'?: string;
  'where.generationId.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.configId'?: 'asc' | 'desc';
  'orderby.generationId'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetGenerationsApplicationsConfigsResponseOK = Array<{ 'generationId'?: string | null; 'configId'?: string | null }>
export type GetGenerationsApplicationsConfigsResponses =
  FullResponse<GetGenerationsApplicationsConfigsResponseOK, 200>

export type CreateGenerationsApplicationsConfigRequest = {
  'generationId': string;
  'configId': string;
}

/**
 * A GenerationsApplicationsConfig
 */
export type CreateGenerationsApplicationsConfigResponseOK = { 'generationId'?: string | null; 'configId'?: string | null }
export type CreateGenerationsApplicationsConfigResponses =
  FullResponse<CreateGenerationsApplicationsConfigResponseOK, 200>

export type UpdateGenerationsApplicationsConfigsRequest = {
  'fields'?: Array<'configId' | 'generationId'>;
  'where.configId.eq'?: string;
  'where.configId.neq'?: string;
  'where.configId.gt'?: string;
  'where.configId.gte'?: string;
  'where.configId.lt'?: string;
  'where.configId.lte'?: string;
  'where.configId.like'?: string;
  'where.configId.ilike'?: string;
  'where.configId.in'?: string;
  'where.configId.nin'?: string;
  'where.configId.contains'?: string;
  'where.configId.contained'?: string;
  'where.configId.overlaps'?: string;
  'where.generationId.eq'?: string;
  'where.generationId.neq'?: string;
  'where.generationId.gt'?: string;
  'where.generationId.gte'?: string;
  'where.generationId.lt'?: string;
  'where.generationId.lte'?: string;
  'where.generationId.like'?: string;
  'where.generationId.ilike'?: string;
  'where.generationId.in'?: string;
  'where.generationId.nin'?: string;
  'where.generationId.contains'?: string;
  'where.generationId.contained'?: string;
  'where.generationId.overlaps'?: string;
  'where.or'?: Array<string>;
  'generationId': string;
  'configId': string;
}

/**
 * Default Response
 */
export type UpdateGenerationsApplicationsConfigsResponseOK = Array<{ 'generationId'?: string | null; 'configId'?: string | null }>
export type UpdateGenerationsApplicationsConfigsResponses =
  FullResponse<UpdateGenerationsApplicationsConfigsResponseOK, 200>

export type GetGenerationsApplicationsConfigByGenerationIdAndConfigIdRequest = {
  'fields'?: Array<'configId' | 'generationId'>;
  'generationId': string;
  'configId': string;
}

/**
 * A GenerationsApplicationsConfig
 */
export type GetGenerationsApplicationsConfigByGenerationIdAndConfigIdResponseOK = { 'generationId'?: string | null; 'configId'?: string | null }
export type GetGenerationsApplicationsConfigByGenerationIdAndConfigIdResponses =
  FullResponse<GetGenerationsApplicationsConfigByGenerationIdAndConfigIdResponseOK, 200>

export type PostGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdRequest = {
  'fields'?: Array<'configId' | 'generationId'>;
  'generationId': string;
  'configId': string;
}

/**
 * A GenerationsApplicationsConfig
 */
export type PostGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponseOK = { 'generationId'?: string | null; 'configId'?: string | null }
export type PostGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponses =
  FullResponse<PostGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponseOK, 200>

export type PutGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdRequest = {
  'fields'?: Array<'configId' | 'generationId'>;
  'generationId': string;
  'configId': string;
}

/**
 * A GenerationsApplicationsConfig
 */
export type PutGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponseOK = { 'generationId'?: string | null; 'configId'?: string | null }
export type PutGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponses =
  FullResponse<PutGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponseOK, 200>

export type DeleteGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdRequest = {
  'fields'?: Array<'configId' | 'generationId'>;
  'generationId': string;
  'configId': string;
}

/**
 * A GenerationsApplicationsConfig
 */
export type DeleteGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponseOK = { 'generationId'?: string | null; 'configId'?: string | null }
export type DeleteGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponses =
  FullResponse<DeleteGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponseOK, 200>

export type GetGenerationGraphRequest = {
  'generationId'?: string;
}

/**
 * Default Response
 */
export type GetGenerationGraphResponseOK = { 'applications': Array<{ 'id': string; 'name': string; 'services': Array<object> }>; 'links': Array<{ 'source': { 'applicationId': string | null; 'serviceId': string | null; 'telemetryId': string }; 'target': { 'applicationId': string | null; 'serviceId': string | null; 'telemetryId': string }; 'requestsAmount': string; 'responseTime': string }> }
export type GetGenerationGraphResponses =
  FullResponse<GetGenerationGraphResponseOK, 200>

export type InitApplicationInstanceRequest = {
  'podId': string;
  'applicationName': string;
}

/**
 * Default Response
 */
export type InitApplicationInstanceResponseOK = { 'applicationId': string; 'config': { 'version': number; 'resources'?: { 'threads'?: number; 'heap'?: number; 'services'?: Array<{ 'name'?: string; 'heap'?: number; 'threads'?: number }> } }; 'httpCache': { 'clientOpts'?: { 'host': string; 'port': number; 'username': string; 'password': string; 'keyPrefix': string } }; 'iccServices': Record<string, { 'url': string }> }
export type InitApplicationInstanceResponses =
  FullResponse<InitApplicationInstanceResponseOK, 200>

export type SaveApplicationInstanceStatusRequest = {
  'id': string;
  'status': string;
}

export type SaveApplicationInstanceStatusResponseOK = unknown
export type SaveApplicationInstanceStatusResponses =
  FullResponse<SaveApplicationInstanceStatusResponseOK, 200>

export type SaveApplicationInstanceStateRequest = {
  'id': string;
  'metadata': { 'platformaticVersion': string };
  'services': Array<object>;
}

/**
 * Default Response
 */
export type SaveApplicationInstanceStateResponseOK = object
export type SaveApplicationInstanceStateResponses =
  FullResponse<SaveApplicationInstanceStateResponseOK, 200>

export type GetApplicationResourcesRequest = {
  'id': string;
}

/**
 * Default Response
 */
export type GetApplicationResourcesResponseOK = { 'threads': number; 'heap': number; 'services': Array<{ 'name'?: string; 'heap'?: number; 'threads'?: number }> }
export type GetApplicationResourcesResponses =
  FullResponse<GetApplicationResourcesResponseOK, 200>

export type SetApplicationResourcesRequest = {
  'id': string;
  'threads': number;
  'heap': number;
  'services': Array<{ 'name'?: string; 'heap'?: number; 'threads'?: number }>;
}

/**
 * Default Response
 */
export type SetApplicationResourcesResponseOK = object
export type SetApplicationResourcesResponses =
  FullResponse<SetApplicationResourcesResponseOK, 200>



export interface ControlPlane {
  setBaseUrl(newUrl: string): void;
  setDefaultHeaders(headers: object): void;
  setDefaultFetchParams(fetchParams: RequestInit): void;
  /**
   * Get generations.
   *
   * Fetch generations from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGenerations(req: GetGenerationsRequest): Promise<GetGenerationsResponses>;
  /**
   * Create generation.
   *
   * Add new generation to the database.
   * @param req - request parameters object
   * @returns the API response
   */
  createGeneration(req: CreateGenerationRequest): Promise<CreateGenerationResponses>;
  /**
   * Update generations.
   *
   * Update one or more generations in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateGenerations(req: UpdateGenerationsRequest): Promise<UpdateGenerationsResponses>;
  /**
   * Get Generation by id.
   *
   * Fetch Generation using its id from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGenerationById(req: GetGenerationByIdRequest): Promise<GetGenerationByIdResponses>;
  /**
   * Update generation.
   *
   * Update generation in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateGeneration(req: UpdateGenerationRequest): Promise<UpdateGenerationResponses>;
  /**
   * Delete generations.
   *
   * Delete one or more generations from the Database.
   * @param req - request parameters object
   * @returns the API response
   */
  deleteGenerations(req: DeleteGenerationsRequest): Promise<DeleteGenerationsResponses>;
  /**
   * Get graphs for generation.
   *
   * Fetch all the graphs for generation from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGraphsForGeneration(req: GetGraphsForGenerationRequest): Promise<GetGraphsForGenerationResponses>;
  /**
   * Get generationsDeployments for generation.
   *
   * Fetch all the generationsDeployments for generation from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGenerationsDeploymentsForGeneration(req: GetGenerationsDeploymentsForGenerationRequest): Promise<GetGenerationsDeploymentsForGenerationResponses>;
  /**
   * Get generationsApplicationsConfigs for generation.
   *
   * Fetch all the generationsApplicationsConfigs for generation from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGenerationsApplicationsConfigsForGeneration(req: GetGenerationsApplicationsConfigsForGenerationRequest): Promise<GetGenerationsApplicationsConfigsForGenerationResponses>;
  /**
   * Get graphs.
   *
   * Fetch graphs from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGraphs(req: GetGraphsRequest): Promise<GetGraphsResponses>;
  /**
   * Create graph.
   *
   * Add new graph to the database.
   * @param req - request parameters object
   * @returns the API response
   */
  createGraph(req: CreateGraphRequest): Promise<CreateGraphResponses>;
  /**
   * Update graphs.
   *
   * Update one or more graphs in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateGraphs(req: UpdateGraphsRequest): Promise<UpdateGraphsResponses>;
  /**
   * Get Graph by id.
   *
   * Fetch Graph using its id from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGraphById(req: GetGraphByIdRequest): Promise<GetGraphByIdResponses>;
  /**
   * Update graph.
   *
   * Update graph in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateGraph(req: UpdateGraphRequest): Promise<UpdateGraphResponses>;
  /**
   * Delete graphs.
   *
   * Delete one or more graphs from the Database.
   * @param req - request parameters object
   * @returns the API response
   */
  deleteGraphs(req: DeleteGraphsRequest): Promise<DeleteGraphsResponses>;
  /**
   * Get generation for graph.
   *
   * Fetch the generation for graph from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGenerationForGraph(req: GetGenerationForGraphRequest): Promise<GetGenerationForGraphResponses>;
  /**
   * Get applications.
   *
   * Fetch applications from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplications(req: GetApplicationsRequest): Promise<GetApplicationsResponses>;
  /**
   * Create application.
   *
   * Add new application to the database.
   * @param req - request parameters object
   * @returns the API response
   */
  createApplication(req: CreateApplicationRequest): Promise<CreateApplicationResponses>;
  /**
   * Update applications.
   *
   * Update one or more applications in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateApplications(req: UpdateApplicationsRequest): Promise<UpdateApplicationsResponses>;
  /**
   * Get Application by id.
   *
   * Fetch Application using its id from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationById(req: GetApplicationByIdRequest): Promise<GetApplicationByIdResponses>;
  /**
   * Update application.
   *
   * Update application in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateApplication(req: UpdateApplicationRequest): Promise<UpdateApplicationResponses>;
  /**
   * Delete applications.
   *
   * Delete one or more applications from the Database.
   * @param req - request parameters object
   * @returns the API response
   */
  deleteApplications(req: DeleteApplicationsRequest): Promise<DeleteApplicationsResponses>;
  /**
   * Get applicationsConfigs for application.
   *
   * Fetch all the applicationsConfigs for application from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationsConfigsForApplication(req: GetApplicationsConfigsForApplicationRequest): Promise<GetApplicationsConfigsForApplicationResponses>;
  /**
   * Get applicationStates for application.
   *
   * Fetch all the applicationStates for application from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationStatesForApplication(req: GetApplicationStatesForApplicationRequest): Promise<GetApplicationStatesForApplicationResponses>;
  /**
   * Get deployments for application.
   *
   * Fetch all the deployments for application from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getDeploymentsForApplication(req: GetDeploymentsForApplicationRequest): Promise<GetDeploymentsForApplicationResponses>;
  /**
   * Get instances for application.
   *
   * Fetch all the instances for application from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getInstancesForApplication(req: GetInstancesForApplicationRequest): Promise<GetInstancesForApplicationResponses>;
  /**
   * Get valkeyUsers for application.
   *
   * Fetch all the valkeyUsers for application from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getValkeyUsersForApplication(req: GetValkeyUsersForApplicationRequest): Promise<GetValkeyUsersForApplicationResponses>;
  /**
   * Get applicationsConfigs.
   *
   * Fetch applicationsConfigs from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationsConfigs(req: GetApplicationsConfigsRequest): Promise<GetApplicationsConfigsResponses>;
  /**
   * Create applicationsConfig.
   *
   * Add new applicationsConfig to the database.
   * @param req - request parameters object
   * @returns the API response
   */
  createApplicationsConfig(req: CreateApplicationsConfigRequest): Promise<CreateApplicationsConfigResponses>;
  /**
   * Update applicationsConfigs.
   *
   * Update one or more applicationsConfigs in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateApplicationsConfigs(req: UpdateApplicationsConfigsRequest): Promise<UpdateApplicationsConfigsResponses>;
  /**
   * Get ApplicationsConfig by id.
   *
   * Fetch ApplicationsConfig using its id from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationsConfigById(req: GetApplicationsConfigByIdRequest): Promise<GetApplicationsConfigByIdResponses>;
  /**
   * Update applicationsConfig.
   *
   * Update applicationsConfig in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateApplicationsConfig(req: UpdateApplicationsConfigRequest): Promise<UpdateApplicationsConfigResponses>;
  /**
   * Delete applicationsConfigs.
   *
   * Delete one or more applicationsConfigs from the Database.
   * @param req - request parameters object
   * @returns the API response
   */
  deleteApplicationsConfigs(req: DeleteApplicationsConfigsRequest): Promise<DeleteApplicationsConfigsResponses>;
  /**
   * Get generationsApplicationsConfigs for applicationsConfig.
   *
   * Fetch all the generationsApplicationsConfigs for applicationsConfig from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGenerationsApplicationsConfigsForApplicationsConfig(req: GetGenerationsApplicationsConfigsForApplicationsConfigRequest): Promise<GetGenerationsApplicationsConfigsForApplicationsConfigResponses>;
  /**
   * Get application for applicationsConfig.
   *
   * Fetch the application for applicationsConfig from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationForApplicationsConfig(req: GetApplicationForApplicationsConfigRequest): Promise<GetApplicationForApplicationsConfigResponses>;
  /**
   * Get applicationStates.
   *
   * Fetch applicationStates from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationStates(req: GetApplicationStatesRequest): Promise<GetApplicationStatesResponses>;
  /**
   * Create applicationState.
   *
   * Add new applicationState to the database.
   * @param req - request parameters object
   * @returns the API response
   */
  createApplicationState(req: CreateApplicationStateRequest): Promise<CreateApplicationStateResponses>;
  /**
   * Update applicationStates.
   *
   * Update one or more applicationStates in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateApplicationStates(req: UpdateApplicationStatesRequest): Promise<UpdateApplicationStatesResponses>;
  /**
   * Get ApplicationState by id.
   *
   * Fetch ApplicationState using its id from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationStateById(req: GetApplicationStateByIdRequest): Promise<GetApplicationStateByIdResponses>;
  /**
   * Update applicationState.
   *
   * Update applicationState in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateApplicationState(req: UpdateApplicationStateRequest): Promise<UpdateApplicationStateResponses>;
  /**
   * Delete applicationStates.
   *
   * Delete one or more applicationStates from the Database.
   * @param req - request parameters object
   * @returns the API response
   */
  deleteApplicationStates(req: DeleteApplicationStatesRequest): Promise<DeleteApplicationStatesResponses>;
  /**
   * Get deployments for applicationState.
   *
   * Fetch all the deployments for applicationState from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getDeploymentsForApplicationState(req: GetDeploymentsForApplicationStateRequest): Promise<GetDeploymentsForApplicationStateResponses>;
  /**
   * Get application for applicationState.
   *
   * Fetch the application for applicationState from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationForApplicationState(req: GetApplicationForApplicationStateRequest): Promise<GetApplicationForApplicationStateResponses>;
  /**
   * Get deployments.
   *
   * Fetch deployments from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getDeployments(req: GetDeploymentsRequest): Promise<GetDeploymentsResponses>;
  /**
   * Create deployment.
   *
   * Add new deployment to the database.
   * @param req - request parameters object
   * @returns the API response
   */
  createDeployment(req: CreateDeploymentRequest): Promise<CreateDeploymentResponses>;
  /**
   * Update deployments.
   *
   * Update one or more deployments in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateDeployments(req: UpdateDeploymentsRequest): Promise<UpdateDeploymentsResponses>;
  /**
   * Get Deployment by id.
   *
   * Fetch Deployment using its id from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getDeploymentById(req: GetDeploymentByIdRequest): Promise<GetDeploymentByIdResponses>;
  /**
   * Update deployment.
   *
   * Update deployment in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateDeployment(req: UpdateDeploymentRequest): Promise<UpdateDeploymentResponses>;
  /**
   * Delete deployments.
   *
   * Delete one or more deployments from the Database.
   * @param req - request parameters object
   * @returns the API response
   */
  deleteDeployments(req: DeleteDeploymentsRequest): Promise<DeleteDeploymentsResponses>;
  /**
   * Get instances for deployment.
   *
   * Fetch all the instances for deployment from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getInstancesForDeployment(req: GetInstancesForDeploymentRequest): Promise<GetInstancesForDeploymentResponses>;
  /**
   * Get generationsDeployments for deployment.
   *
   * Fetch all the generationsDeployments for deployment from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGenerationsDeploymentsForDeployment(req: GetGenerationsDeploymentsForDeploymentRequest): Promise<GetGenerationsDeploymentsForDeploymentResponses>;
  /**
   * Get application for deployment.
   *
   * Fetch the application for deployment from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationForDeployment(req: GetApplicationForDeploymentRequest): Promise<GetApplicationForDeploymentResponses>;
  /**
   * Get applicationState for deployment.
   *
   * Fetch the applicationState for deployment from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationStateForDeployment(req: GetApplicationStateForDeploymentRequest): Promise<GetApplicationStateForDeploymentResponses>;
  /**
   * Get instances.
   *
   * Fetch instances from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getInstances(req: GetInstancesRequest): Promise<GetInstancesResponses>;
  /**
   * Create instance.
   *
   * Add new instance to the database.
   * @param req - request parameters object
   * @returns the API response
   */
  createInstance(req: CreateInstanceRequest): Promise<CreateInstanceResponses>;
  /**
   * Update instances.
   *
   * Update one or more instances in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateInstances(req: UpdateInstancesRequest): Promise<UpdateInstancesResponses>;
  /**
   * Get Instance by id.
   *
   * Fetch Instance using its id from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getInstanceById(req: GetInstanceByIdRequest): Promise<GetInstanceByIdResponses>;
  /**
   * Update instance.
   *
   * Update instance in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateInstance(req: UpdateInstanceRequest): Promise<UpdateInstanceResponses>;
  /**
   * Delete instances.
   *
   * Delete one or more instances from the Database.
   * @param req - request parameters object
   * @returns the API response
   */
  deleteInstances(req: DeleteInstancesRequest): Promise<DeleteInstancesResponses>;
  /**
   * Get application for instance.
   *
   * Fetch the application for instance from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationForInstance(req: GetApplicationForInstanceRequest): Promise<GetApplicationForInstanceResponses>;
  /**
   * Get deployment for instance.
   *
   * Fetch the deployment for instance from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getDeploymentForInstance(req: GetDeploymentForInstanceRequest): Promise<GetDeploymentForInstanceResponses>;
  /**
   * Get valkeyUsers.
   *
   * Fetch valkeyUsers from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getValkeyUsers(req: GetValkeyUsersRequest): Promise<GetValkeyUsersResponses>;
  /**
   * Create valkeyUser.
   *
   * Add new valkeyUser to the database.
   * @param req - request parameters object
   * @returns the API response
   */
  createValkeyUser(req: CreateValkeyUserRequest): Promise<CreateValkeyUserResponses>;
  /**
   * Update valkeyUsers.
   *
   * Update one or more valkeyUsers in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateValkeyUsers(req: UpdateValkeyUsersRequest): Promise<UpdateValkeyUsersResponses>;
  /**
   * Get ValkeyUser by id.
   *
   * Fetch ValkeyUser using its id from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getValkeyUserById(req: GetValkeyUserByIdRequest): Promise<GetValkeyUserByIdResponses>;
  /**
   * Update valkeyUser.
   *
   * Update valkeyUser in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateValkeyUser(req: UpdateValkeyUserRequest): Promise<UpdateValkeyUserResponses>;
  /**
   * Delete valkeyUsers.
   *
   * Delete one or more valkeyUsers from the Database.
   * @param req - request parameters object
   * @returns the API response
   */
  deleteValkeyUsers(req: DeleteValkeyUsersRequest): Promise<DeleteValkeyUsersResponses>;
  /**
   * Get application for valkeyUser.
   *
   * Fetch the application for valkeyUser from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationForValkeyUser(req: GetApplicationForValkeyUserRequest): Promise<GetApplicationForValkeyUserResponses>;
  /**
   * Get generationsDeployments.
   *
   * Fetch generationsDeployments from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGenerationsDeployments(req: GetGenerationsDeploymentsRequest): Promise<GetGenerationsDeploymentsResponses>;
  /**
   * Create generationsDeployment.
   *
   * Add new generationsDeployment to the database.
   * @param req - request parameters object
   * @returns the API response
   */
  createGenerationsDeployment(req: CreateGenerationsDeploymentRequest): Promise<CreateGenerationsDeploymentResponses>;
  /**
   * Update generationsDeployments.
   *
   * Update one or more generationsDeployments in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateGenerationsDeployments(req: UpdateGenerationsDeploymentsRequest): Promise<UpdateGenerationsDeploymentsResponses>;
  /**
   * Get GenerationsDeployment by GenerationIdAndDeploymentId.
   *
   * Fetch GenerationsDeployment by GenerationIdAndDeploymentId from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGenerationsDeploymentByGenerationIdAndDeploymentId(req: GetGenerationsDeploymentByGenerationIdAndDeploymentIdRequest): Promise<GetGenerationsDeploymentByGenerationIdAndDeploymentIdResponses>;
  /**
   * Update GenerationsDeployment by GenerationIdAndDeploymentId.
   *
   * Update GenerationsDeployment by GenerationIdAndDeploymentId in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  postGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentId(req: PostGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdRequest): Promise<PostGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponses>;
  /**
   * Update GenerationsDeployment by GenerationIdAndDeploymentId.
   *
   * Update GenerationsDeployment by GenerationIdAndDeploymentId in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  putGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentId(req: PutGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdRequest): Promise<PutGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponses>;
  /**
   * Delete GenerationsDeployment by GenerationIdAndDeploymentId.
   *
   * Delete GenerationsDeployment by GenerationIdAndDeploymentId from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  deleteGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentId(req: DeleteGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdRequest): Promise<DeleteGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponses>;
  /**
   * Get generationsApplicationsConfigs.
   *
   * Fetch generationsApplicationsConfigs from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGenerationsApplicationsConfigs(req: GetGenerationsApplicationsConfigsRequest): Promise<GetGenerationsApplicationsConfigsResponses>;
  /**
   * Create generationsApplicationsConfig.
   *
   * Add new generationsApplicationsConfig to the database.
   * @param req - request parameters object
   * @returns the API response
   */
  createGenerationsApplicationsConfig(req: CreateGenerationsApplicationsConfigRequest): Promise<CreateGenerationsApplicationsConfigResponses>;
  /**
   * Update generationsApplicationsConfigs.
   *
   * Update one or more generationsApplicationsConfigs in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateGenerationsApplicationsConfigs(req: UpdateGenerationsApplicationsConfigsRequest): Promise<UpdateGenerationsApplicationsConfigsResponses>;
  /**
   * Get GenerationsApplicationsConfig by GenerationIdAndConfigId.
   *
   * Fetch GenerationsApplicationsConfig by GenerationIdAndConfigId from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGenerationsApplicationsConfigByGenerationIdAndConfigId(req: GetGenerationsApplicationsConfigByGenerationIdAndConfigIdRequest): Promise<GetGenerationsApplicationsConfigByGenerationIdAndConfigIdResponses>;
  /**
   * Update GenerationsApplicationsConfig by GenerationIdAndConfigId.
   *
   * Update GenerationsApplicationsConfig by GenerationIdAndConfigId in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  postGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigId(req: PostGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdRequest): Promise<PostGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponses>;
  /**
   * Update GenerationsApplicationsConfig by GenerationIdAndConfigId.
   *
   * Update GenerationsApplicationsConfig by GenerationIdAndConfigId in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  putGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigId(req: PutGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdRequest): Promise<PutGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponses>;
  /**
   * Delete GenerationsApplicationsConfig by GenerationIdAndConfigId.
   *
   * Delete GenerationsApplicationsConfig by GenerationIdAndConfigId from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  deleteGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigId(req: DeleteGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdRequest): Promise<DeleteGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getGenerationGraph(req: GetGenerationGraphRequest): Promise<GetGenerationGraphResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  initApplicationInstance(req: InitApplicationInstanceRequest): Promise<InitApplicationInstanceResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  saveApplicationInstanceStatus(req: SaveApplicationInstanceStatusRequest): Promise<SaveApplicationInstanceStatusResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  saveApplicationInstanceState(req: SaveApplicationInstanceStateRequest): Promise<SaveApplicationInstanceStateResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationResources(req: GetApplicationResourcesRequest): Promise<GetApplicationResourcesResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  setApplicationResources(req: SetApplicationResourcesRequest): Promise<SetApplicationResourcesResponses>;
}
type PlatformaticFrontendClient = Omit<ControlPlane, 'setBaseUrl'>
type BuildOptions = {
  headers?: object
}
export default function build(url: string, options?: BuildOptions): PlatformaticFrontendClient
