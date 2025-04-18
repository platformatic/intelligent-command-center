export interface FullResponse<T, U extends number> {
  'statusCode': U;
  'headers': object;
  'body': T;
}

export type GetTaxonomiesRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'closedAt' | 'createdAt' | 'id' | 'main' | 'name' | 'stage' | 'status'>;
  'where.closedAt.eq'?: string;
  'where.closedAt.neq'?: string;
  'where.closedAt.gt'?: string;
  'where.closedAt.gte'?: string;
  'where.closedAt.lt'?: string;
  'where.closedAt.lte'?: string;
  'where.closedAt.like'?: string;
  'where.closedAt.ilike'?: string;
  'where.closedAt.in'?: string;
  'where.closedAt.nin'?: string;
  'where.closedAt.contains'?: string;
  'where.closedAt.contained'?: string;
  'where.closedAt.overlaps'?: string;
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
  'where.main.eq'?: boolean;
  'where.main.neq'?: boolean;
  'where.main.gt'?: boolean;
  'where.main.gte'?: boolean;
  'where.main.lt'?: boolean;
  'where.main.lte'?: boolean;
  'where.main.like'?: boolean;
  'where.main.ilike'?: boolean;
  'where.main.in'?: string;
  'where.main.nin'?: string;
  'where.main.contains'?: string;
  'where.main.contained'?: string;
  'where.main.overlaps'?: string;
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
  'where.stage.eq'?: 'closed' | 'merged' | 'opened';
  'where.stage.neq'?: 'closed' | 'merged' | 'opened';
  'where.stage.gt'?: 'closed' | 'merged' | 'opened';
  'where.stage.gte'?: 'closed' | 'merged' | 'opened';
  'where.stage.lt'?: 'closed' | 'merged' | 'opened';
  'where.stage.lte'?: 'closed' | 'merged' | 'opened';
  'where.stage.like'?: 'closed' | 'merged' | 'opened';
  'where.stage.ilike'?: 'closed' | 'merged' | 'opened';
  'where.stage.in'?: string;
  'where.stage.nin'?: string;
  'where.stage.contains'?: string;
  'where.stage.contained'?: string;
  'where.stage.overlaps'?: string;
  'where.status.eq'?: 'started' | 'stopped';
  'where.status.neq'?: 'started' | 'stopped';
  'where.status.gt'?: 'started' | 'stopped';
  'where.status.gte'?: 'started' | 'stopped';
  'where.status.lt'?: 'started' | 'stopped';
  'where.status.lte'?: 'started' | 'stopped';
  'where.status.like'?: 'started' | 'stopped';
  'where.status.ilike'?: 'started' | 'stopped';
  'where.status.in'?: string;
  'where.status.nin'?: string;
  'where.status.contains'?: string;
  'where.status.contained'?: string;
  'where.status.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.closedAt'?: 'asc' | 'desc';
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.main'?: 'asc' | 'desc';
  'orderby.name'?: 'asc' | 'desc';
  'orderby.stage'?: 'asc' | 'desc';
  'orderby.status'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetTaxonomiesResponseOK = Array<{ 'id'?: string | null; 'name'?: string | null; 'main'?: boolean | null; 'status'?: 'started' | 'stopped' | null; 'stage'?: 'closed' | 'merged' | 'opened' | null; 'closedAt'?: string | null; 'createdAt'?: string | null }>
export type GetTaxonomiesResponses =
  FullResponse<GetTaxonomiesResponseOK, 200>

export type CreateTaxonomyRequest = {
  'id'?: string;
  'name': string;
  'main': boolean;
  'status': 'started' | 'stopped';
  'stage': 'closed' | 'merged' | 'opened';
  'closedAt'?: string | null;
  'createdAt'?: string | null;
}

/**
 * A Taxonomy
 */
export type CreateTaxonomyResponseOK = { 'id'?: string | null; 'name'?: string | null; 'main'?: boolean | null; 'status'?: 'started' | 'stopped' | null; 'stage'?: 'closed' | 'merged' | 'opened' | null; 'closedAt'?: string | null; 'createdAt'?: string | null }
export type CreateTaxonomyResponses =
  FullResponse<CreateTaxonomyResponseOK, 200>

export type UpdateTaxonomiesRequest = {
  'fields'?: Array<'closedAt' | 'createdAt' | 'id' | 'main' | 'name' | 'stage' | 'status'>;
  'where.closedAt.eq'?: string;
  'where.closedAt.neq'?: string;
  'where.closedAt.gt'?: string;
  'where.closedAt.gte'?: string;
  'where.closedAt.lt'?: string;
  'where.closedAt.lte'?: string;
  'where.closedAt.like'?: string;
  'where.closedAt.ilike'?: string;
  'where.closedAt.in'?: string;
  'where.closedAt.nin'?: string;
  'where.closedAt.contains'?: string;
  'where.closedAt.contained'?: string;
  'where.closedAt.overlaps'?: string;
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
  'where.main.eq'?: boolean;
  'where.main.neq'?: boolean;
  'where.main.gt'?: boolean;
  'where.main.gte'?: boolean;
  'where.main.lt'?: boolean;
  'where.main.lte'?: boolean;
  'where.main.like'?: boolean;
  'where.main.ilike'?: boolean;
  'where.main.in'?: string;
  'where.main.nin'?: string;
  'where.main.contains'?: string;
  'where.main.contained'?: string;
  'where.main.overlaps'?: string;
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
  'where.stage.eq'?: 'closed' | 'merged' | 'opened';
  'where.stage.neq'?: 'closed' | 'merged' | 'opened';
  'where.stage.gt'?: 'closed' | 'merged' | 'opened';
  'where.stage.gte'?: 'closed' | 'merged' | 'opened';
  'where.stage.lt'?: 'closed' | 'merged' | 'opened';
  'where.stage.lte'?: 'closed' | 'merged' | 'opened';
  'where.stage.like'?: 'closed' | 'merged' | 'opened';
  'where.stage.ilike'?: 'closed' | 'merged' | 'opened';
  'where.stage.in'?: string;
  'where.stage.nin'?: string;
  'where.stage.contains'?: string;
  'where.stage.contained'?: string;
  'where.stage.overlaps'?: string;
  'where.status.eq'?: 'started' | 'stopped';
  'where.status.neq'?: 'started' | 'stopped';
  'where.status.gt'?: 'started' | 'stopped';
  'where.status.gte'?: 'started' | 'stopped';
  'where.status.lt'?: 'started' | 'stopped';
  'where.status.lte'?: 'started' | 'stopped';
  'where.status.like'?: 'started' | 'stopped';
  'where.status.ilike'?: 'started' | 'stopped';
  'where.status.in'?: string;
  'where.status.nin'?: string;
  'where.status.contains'?: string;
  'where.status.contained'?: string;
  'where.status.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'name': string;
  'main': boolean;
  'status': 'started' | 'stopped';
  'stage': 'closed' | 'merged' | 'opened';
  'closedAt'?: string | null;
  'createdAt'?: string | null;
}

/**
 * Default Response
 */
export type UpdateTaxonomiesResponseOK = Array<{ 'id'?: string | null; 'name'?: string | null; 'main'?: boolean | null; 'status'?: 'started' | 'stopped' | null; 'stage'?: 'closed' | 'merged' | 'opened' | null; 'closedAt'?: string | null; 'createdAt'?: string | null }>
export type UpdateTaxonomiesResponses =
  FullResponse<UpdateTaxonomiesResponseOK, 200>

export type GetTaxonomyByIdRequest = {
  'fields'?: Array<'closedAt' | 'createdAt' | 'id' | 'main' | 'name' | 'stage' | 'status'>;
  'id': string;
}

/**
 * A Taxonomy
 */
export type GetTaxonomyByIdResponseOK = { 'id'?: string | null; 'name'?: string | null; 'main'?: boolean | null; 'status'?: 'started' | 'stopped' | null; 'stage'?: 'closed' | 'merged' | 'opened' | null; 'closedAt'?: string | null; 'createdAt'?: string | null }
export type GetTaxonomyByIdResponses =
  FullResponse<GetTaxonomyByIdResponseOK, 200>

export type UpdateTaxonomyRequest = {
  'fields'?: Array<'closedAt' | 'createdAt' | 'id' | 'main' | 'name' | 'stage' | 'status'>;
  'id': string;
  'name': string;
  'main': boolean;
  'status': 'started' | 'stopped';
  'stage': 'closed' | 'merged' | 'opened';
  'closedAt'?: string | null;
  'createdAt'?: string | null;
}

/**
 * A Taxonomy
 */
export type UpdateTaxonomyResponseOK = { 'id'?: string | null; 'name'?: string | null; 'main'?: boolean | null; 'status'?: 'started' | 'stopped' | null; 'stage'?: 'closed' | 'merged' | 'opened' | null; 'closedAt'?: string | null; 'createdAt'?: string | null }
export type UpdateTaxonomyResponses =
  FullResponse<UpdateTaxonomyResponseOK, 200>

export type DeleteTaxonomiesRequest = {
  'fields'?: Array<'closedAt' | 'createdAt' | 'id' | 'main' | 'name' | 'stage' | 'status'>;
  'id': string;
}

/**
 * A Taxonomy
 */
export type DeleteTaxonomiesResponseOK = { 'id'?: string | null; 'name'?: string | null; 'main'?: boolean | null; 'status'?: 'started' | 'stopped' | null; 'stage'?: 'closed' | 'merged' | 'opened' | null; 'closedAt'?: string | null; 'createdAt'?: string | null }
export type DeleteTaxonomiesResponses =
  FullResponse<DeleteTaxonomiesResponseOK, 200>

export type GetTaxonomiesApplicationsChangesForTaxonomyRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'taxonomyId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetTaxonomiesApplicationsChangesForTaxonomyResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'createdAt'?: string | null }>
export type GetTaxonomiesApplicationsChangesForTaxonomyResponses =
  FullResponse<GetTaxonomiesApplicationsChangesForTaxonomyResponseOK, 200>

export type GetEnvironmentsForTaxonomyRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'secretsKey' | 'secretsStorageProvider' | 'taxonomyId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetEnvironmentsForTaxonomyResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'secretsStorageProvider'?: 'plaintext' | 'vault' | null; 'secretsKey'?: string | null; 'createdAt'?: string | null }>
export type GetEnvironmentsForTaxonomyResponses =
  FullResponse<GetEnvironmentsForTaxonomyResponseOK, 200>

export type GetEntrypointsForTaxonomyRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'path' | 'taxonomyId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetEntrypointsForTaxonomyResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'path'?: string | null; 'createdAt'?: string | null }>
export type GetEntrypointsForTaxonomyResponses =
  FullResponse<GetEntrypointsForTaxonomyResponseOK, 200>

export type GetDeploymentsForTaxonomyRequest = {
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'bundleId' | 'createdAt' | 'deploymentSettingsId' | 'generationId' | 'id' | 'machineId' | 'status' | 'taxonomyId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetDeploymentsForTaxonomyResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'bundleId'?: string | null; 'machineId'?: string | null; 'createdAt'?: string | null; 'deploymentSettingsId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null }>
export type GetDeploymentsForTaxonomyResponses =
  FullResponse<GetDeploymentsForTaxonomyResponseOK, 200>

export type GetGraphsForTaxonomyRequest = {
  'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id' | 'taxonomyId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetGraphsForTaxonomyResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }>
export type GetGraphsForTaxonomyResponses =
  FullResponse<GetGraphsForTaxonomyResponseOK, 200>

export type GetGenerationsForTaxonomyRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'mainIteration' | 'status' | 'taxonomyId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetGenerationsForTaxonomyResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'mainIteration'?: number | null; 'createdAt'?: string | null; 'status'?: 'empty' | 'failed' | 'started' | 'starting' | null }>
export type GetGenerationsForTaxonomyResponses =
  FullResponse<GetGenerationsForTaxonomyResponseOK, 200>

export type GetTaxonomiesApplicationsChangesRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'taxonomyId'>;
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
  'where.taxonomyId.eq'?: string;
  'where.taxonomyId.neq'?: string;
  'where.taxonomyId.gt'?: string;
  'where.taxonomyId.gte'?: string;
  'where.taxonomyId.lt'?: string;
  'where.taxonomyId.lte'?: string;
  'where.taxonomyId.like'?: string;
  'where.taxonomyId.ilike'?: string;
  'where.taxonomyId.in'?: string;
  'where.taxonomyId.nin'?: string;
  'where.taxonomyId.contains'?: string;
  'where.taxonomyId.contained'?: string;
  'where.taxonomyId.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.applicationId'?: 'asc' | 'desc';
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.taxonomyId'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetTaxonomiesApplicationsChangesResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'createdAt'?: string | null }>
export type GetTaxonomiesApplicationsChangesResponses =
  FullResponse<GetTaxonomiesApplicationsChangesResponseOK, 200>

export type CreateTaxonomiesApplicationsChangeRequest = {
  'id'?: string;
  'taxonomyId': string;
  'applicationId': string;
  'createdAt'?: string | null;
}

/**
 * A TaxonomiesApplicationsChange
 */
export type CreateTaxonomiesApplicationsChangeResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'createdAt'?: string | null }
export type CreateTaxonomiesApplicationsChangeResponses =
  FullResponse<CreateTaxonomiesApplicationsChangeResponseOK, 200>

export type UpdateTaxonomiesApplicationsChangesRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'taxonomyId'>;
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
  'where.taxonomyId.eq'?: string;
  'where.taxonomyId.neq'?: string;
  'where.taxonomyId.gt'?: string;
  'where.taxonomyId.gte'?: string;
  'where.taxonomyId.lt'?: string;
  'where.taxonomyId.lte'?: string;
  'where.taxonomyId.like'?: string;
  'where.taxonomyId.ilike'?: string;
  'where.taxonomyId.in'?: string;
  'where.taxonomyId.nin'?: string;
  'where.taxonomyId.contains'?: string;
  'where.taxonomyId.contained'?: string;
  'where.taxonomyId.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'taxonomyId': string;
  'applicationId': string;
  'createdAt'?: string | null;
}

/**
 * Default Response
 */
export type UpdateTaxonomiesApplicationsChangesResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'createdAt'?: string | null }>
export type UpdateTaxonomiesApplicationsChangesResponses =
  FullResponse<UpdateTaxonomiesApplicationsChangesResponseOK, 200>

export type GetTaxonomiesApplicationsChangeByIdRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'taxonomyId'>;
  'id': string;
}

/**
 * A TaxonomiesApplicationsChange
 */
export type GetTaxonomiesApplicationsChangeByIdResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'createdAt'?: string | null }
export type GetTaxonomiesApplicationsChangeByIdResponses =
  FullResponse<GetTaxonomiesApplicationsChangeByIdResponseOK, 200>

export type UpdateTaxonomiesApplicationsChangeRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'taxonomyId'>;
  'id': string;
  'taxonomyId': string;
  'applicationId': string;
  'createdAt'?: string | null;
}

/**
 * A TaxonomiesApplicationsChange
 */
export type UpdateTaxonomiesApplicationsChangeResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'createdAt'?: string | null }
export type UpdateTaxonomiesApplicationsChangeResponses =
  FullResponse<UpdateTaxonomiesApplicationsChangeResponseOK, 200>

export type DeleteTaxonomiesApplicationsChangesRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'taxonomyId'>;
  'id': string;
}

/**
 * A TaxonomiesApplicationsChange
 */
export type DeleteTaxonomiesApplicationsChangesResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'createdAt'?: string | null }
export type DeleteTaxonomiesApplicationsChangesResponses =
  FullResponse<DeleteTaxonomiesApplicationsChangesResponseOK, 200>

export type GetTaxonomyForTaxonomiesApplicationsChangeRequest = {
  'fields'?: Array<'closedAt' | 'createdAt' | 'id' | 'main' | 'name' | 'stage' | 'status'>;
  'id': string;
}

/**
 * A Taxonomy
 */
export type GetTaxonomyForTaxonomiesApplicationsChangeResponseOK = { 'id'?: string | null; 'name'?: string | null; 'main'?: boolean | null; 'status'?: 'started' | 'stopped' | null; 'stage'?: 'closed' | 'merged' | 'opened' | null; 'closedAt'?: string | null; 'createdAt'?: string | null }
export type GetTaxonomyForTaxonomiesApplicationsChangeResponses =
  FullResponse<GetTaxonomyForTaxonomiesApplicationsChangeResponseOK, 200>

export type GetApplicationForTaxonomiesApplicationsChangeRequest = {
  'fields'?: Array<'createdAt' | 'deleted' | 'deletedAt' | 'deletedBy' | 'id' | 'name'>;
  'id': string;
}

/**
 * A Application
 */
export type GetApplicationForTaxonomiesApplicationsChangeResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null; 'deleted'?: boolean | null; 'deletedAt'?: string | null; 'deletedBy'?: string | null }
export type GetApplicationForTaxonomiesApplicationsChangeResponses =
  FullResponse<GetApplicationForTaxonomiesApplicationsChangeResponseOK, 200>

export type GetEnvironmentsRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'secretsKey' | 'secretsStorageProvider' | 'taxonomyId'>;
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
  'where.secretsKey.eq'?: string;
  'where.secretsKey.neq'?: string;
  'where.secretsKey.gt'?: string;
  'where.secretsKey.gte'?: string;
  'where.secretsKey.lt'?: string;
  'where.secretsKey.lte'?: string;
  'where.secretsKey.like'?: string;
  'where.secretsKey.ilike'?: string;
  'where.secretsKey.in'?: string;
  'where.secretsKey.nin'?: string;
  'where.secretsKey.contains'?: string;
  'where.secretsKey.contained'?: string;
  'where.secretsKey.overlaps'?: string;
  'where.secretsStorageProvider.eq'?: 'plaintext' | 'vault';
  'where.secretsStorageProvider.neq'?: 'plaintext' | 'vault';
  'where.secretsStorageProvider.gt'?: 'plaintext' | 'vault';
  'where.secretsStorageProvider.gte'?: 'plaintext' | 'vault';
  'where.secretsStorageProvider.lt'?: 'plaintext' | 'vault';
  'where.secretsStorageProvider.lte'?: 'plaintext' | 'vault';
  'where.secretsStorageProvider.like'?: 'plaintext' | 'vault';
  'where.secretsStorageProvider.ilike'?: 'plaintext' | 'vault';
  'where.secretsStorageProvider.in'?: string;
  'where.secretsStorageProvider.nin'?: string;
  'where.secretsStorageProvider.contains'?: string;
  'where.secretsStorageProvider.contained'?: string;
  'where.secretsStorageProvider.overlaps'?: string;
  'where.taxonomyId.eq'?: string;
  'where.taxonomyId.neq'?: string;
  'where.taxonomyId.gt'?: string;
  'where.taxonomyId.gte'?: string;
  'where.taxonomyId.lt'?: string;
  'where.taxonomyId.lte'?: string;
  'where.taxonomyId.like'?: string;
  'where.taxonomyId.ilike'?: string;
  'where.taxonomyId.in'?: string;
  'where.taxonomyId.nin'?: string;
  'where.taxonomyId.contains'?: string;
  'where.taxonomyId.contained'?: string;
  'where.taxonomyId.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.applicationId'?: 'asc' | 'desc';
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.secretsKey'?: 'asc' | 'desc';
  'orderby.secretsStorageProvider'?: 'asc' | 'desc';
  'orderby.taxonomyId'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetEnvironmentsResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'secretsStorageProvider'?: 'plaintext' | 'vault' | null; 'secretsKey'?: string | null; 'createdAt'?: string | null }>
export type GetEnvironmentsResponses =
  FullResponse<GetEnvironmentsResponseOK, 200>

export type CreateEnvironmentRequest = {
  'id'?: string;
  'taxonomyId': string;
  'applicationId'?: string | null;
  'secretsStorageProvider': 'plaintext' | 'vault';
  'secretsKey'?: string | null;
  'createdAt'?: string | null;
}

/**
 * A Environment
 */
export type CreateEnvironmentResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'secretsStorageProvider'?: 'plaintext' | 'vault' | null; 'secretsKey'?: string | null; 'createdAt'?: string | null }
export type CreateEnvironmentResponses =
  FullResponse<CreateEnvironmentResponseOK, 200>

export type UpdateEnvironmentsRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'secretsKey' | 'secretsStorageProvider' | 'taxonomyId'>;
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
  'where.secretsKey.eq'?: string;
  'where.secretsKey.neq'?: string;
  'where.secretsKey.gt'?: string;
  'where.secretsKey.gte'?: string;
  'where.secretsKey.lt'?: string;
  'where.secretsKey.lte'?: string;
  'where.secretsKey.like'?: string;
  'where.secretsKey.ilike'?: string;
  'where.secretsKey.in'?: string;
  'where.secretsKey.nin'?: string;
  'where.secretsKey.contains'?: string;
  'where.secretsKey.contained'?: string;
  'where.secretsKey.overlaps'?: string;
  'where.secretsStorageProvider.eq'?: 'plaintext' | 'vault';
  'where.secretsStorageProvider.neq'?: 'plaintext' | 'vault';
  'where.secretsStorageProvider.gt'?: 'plaintext' | 'vault';
  'where.secretsStorageProvider.gte'?: 'plaintext' | 'vault';
  'where.secretsStorageProvider.lt'?: 'plaintext' | 'vault';
  'where.secretsStorageProvider.lte'?: 'plaintext' | 'vault';
  'where.secretsStorageProvider.like'?: 'plaintext' | 'vault';
  'where.secretsStorageProvider.ilike'?: 'plaintext' | 'vault';
  'where.secretsStorageProvider.in'?: string;
  'where.secretsStorageProvider.nin'?: string;
  'where.secretsStorageProvider.contains'?: string;
  'where.secretsStorageProvider.contained'?: string;
  'where.secretsStorageProvider.overlaps'?: string;
  'where.taxonomyId.eq'?: string;
  'where.taxonomyId.neq'?: string;
  'where.taxonomyId.gt'?: string;
  'where.taxonomyId.gte'?: string;
  'where.taxonomyId.lt'?: string;
  'where.taxonomyId.lte'?: string;
  'where.taxonomyId.like'?: string;
  'where.taxonomyId.ilike'?: string;
  'where.taxonomyId.in'?: string;
  'where.taxonomyId.nin'?: string;
  'where.taxonomyId.contains'?: string;
  'where.taxonomyId.contained'?: string;
  'where.taxonomyId.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'taxonomyId': string;
  'applicationId'?: string | null;
  'secretsStorageProvider': 'plaintext' | 'vault';
  'secretsKey'?: string | null;
  'createdAt'?: string | null;
}

/**
 * Default Response
 */
export type UpdateEnvironmentsResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'secretsStorageProvider'?: 'plaintext' | 'vault' | null; 'secretsKey'?: string | null; 'createdAt'?: string | null }>
export type UpdateEnvironmentsResponses =
  FullResponse<UpdateEnvironmentsResponseOK, 200>

export type GetEnvironmentByIdRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'secretsKey' | 'secretsStorageProvider' | 'taxonomyId'>;
  'id': string;
}

/**
 * A Environment
 */
export type GetEnvironmentByIdResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'secretsStorageProvider'?: 'plaintext' | 'vault' | null; 'secretsKey'?: string | null; 'createdAt'?: string | null }
export type GetEnvironmentByIdResponses =
  FullResponse<GetEnvironmentByIdResponseOK, 200>

export type UpdateEnvironmentRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'secretsKey' | 'secretsStorageProvider' | 'taxonomyId'>;
  'id': string;
  'taxonomyId': string;
  'applicationId'?: string | null;
  'secretsStorageProvider': 'plaintext' | 'vault';
  'secretsKey'?: string | null;
  'createdAt'?: string | null;
}

/**
 * A Environment
 */
export type UpdateEnvironmentResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'secretsStorageProvider'?: 'plaintext' | 'vault' | null; 'secretsKey'?: string | null; 'createdAt'?: string | null }
export type UpdateEnvironmentResponses =
  FullResponse<UpdateEnvironmentResponseOK, 200>

export type DeleteEnvironmentsRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'secretsKey' | 'secretsStorageProvider' | 'taxonomyId'>;
  'id': string;
}

/**
 * A Environment
 */
export type DeleteEnvironmentsResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'secretsStorageProvider'?: 'plaintext' | 'vault' | null; 'secretsKey'?: string | null; 'createdAt'?: string | null }
export type DeleteEnvironmentsResponses =
  FullResponse<DeleteEnvironmentsResponseOK, 200>

export type GetTaxonomyForEnvironmentRequest = {
  'fields'?: Array<'closedAt' | 'createdAt' | 'id' | 'main' | 'name' | 'stage' | 'status'>;
  'id': string;
}

/**
 * A Taxonomy
 */
export type GetTaxonomyForEnvironmentResponseOK = { 'id'?: string | null; 'name'?: string | null; 'main'?: boolean | null; 'status'?: 'started' | 'stopped' | null; 'stage'?: 'closed' | 'merged' | 'opened' | null; 'closedAt'?: string | null; 'createdAt'?: string | null }
export type GetTaxonomyForEnvironmentResponses =
  FullResponse<GetTaxonomyForEnvironmentResponseOK, 200>

export type GetApplicationForEnvironmentRequest = {
  'fields'?: Array<'createdAt' | 'deleted' | 'deletedAt' | 'deletedBy' | 'id' | 'name'>;
  'id': string;
}

/**
 * A Application
 */
export type GetApplicationForEnvironmentResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null; 'deleted'?: boolean | null; 'deletedAt'?: string | null; 'deletedBy'?: string | null }
export type GetApplicationForEnvironmentResponses =
  FullResponse<GetApplicationForEnvironmentResponseOK, 200>

export type GetEntrypointsRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'path' | 'taxonomyId'>;
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
  'where.path.eq'?: string;
  'where.path.neq'?: string;
  'where.path.gt'?: string;
  'where.path.gte'?: string;
  'where.path.lt'?: string;
  'where.path.lte'?: string;
  'where.path.like'?: string;
  'where.path.ilike'?: string;
  'where.path.in'?: string;
  'where.path.nin'?: string;
  'where.path.contains'?: string;
  'where.path.contained'?: string;
  'where.path.overlaps'?: string;
  'where.taxonomyId.eq'?: string;
  'where.taxonomyId.neq'?: string;
  'where.taxonomyId.gt'?: string;
  'where.taxonomyId.gte'?: string;
  'where.taxonomyId.lt'?: string;
  'where.taxonomyId.lte'?: string;
  'where.taxonomyId.like'?: string;
  'where.taxonomyId.ilike'?: string;
  'where.taxonomyId.in'?: string;
  'where.taxonomyId.nin'?: string;
  'where.taxonomyId.contains'?: string;
  'where.taxonomyId.contained'?: string;
  'where.taxonomyId.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.applicationId'?: 'asc' | 'desc';
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.path'?: 'asc' | 'desc';
  'orderby.taxonomyId'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetEntrypointsResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'path'?: string | null; 'createdAt'?: string | null }>
export type GetEntrypointsResponses =
  FullResponse<GetEntrypointsResponseOK, 200>

export type CreateEntrypointRequest = {
  'id'?: string;
  'taxonomyId': string;
  'applicationId': string;
  'path': string;
  'createdAt'?: string | null;
}

/**
 * A Entrypoint
 */
export type CreateEntrypointResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'path'?: string | null; 'createdAt'?: string | null }
export type CreateEntrypointResponses =
  FullResponse<CreateEntrypointResponseOK, 200>

export type UpdateEntrypointsRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'path' | 'taxonomyId'>;
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
  'where.path.eq'?: string;
  'where.path.neq'?: string;
  'where.path.gt'?: string;
  'where.path.gte'?: string;
  'where.path.lt'?: string;
  'where.path.lte'?: string;
  'where.path.like'?: string;
  'where.path.ilike'?: string;
  'where.path.in'?: string;
  'where.path.nin'?: string;
  'where.path.contains'?: string;
  'where.path.contained'?: string;
  'where.path.overlaps'?: string;
  'where.taxonomyId.eq'?: string;
  'where.taxonomyId.neq'?: string;
  'where.taxonomyId.gt'?: string;
  'where.taxonomyId.gte'?: string;
  'where.taxonomyId.lt'?: string;
  'where.taxonomyId.lte'?: string;
  'where.taxonomyId.like'?: string;
  'where.taxonomyId.ilike'?: string;
  'where.taxonomyId.in'?: string;
  'where.taxonomyId.nin'?: string;
  'where.taxonomyId.contains'?: string;
  'where.taxonomyId.contained'?: string;
  'where.taxonomyId.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'taxonomyId': string;
  'applicationId': string;
  'path': string;
  'createdAt'?: string | null;
}

/**
 * Default Response
 */
export type UpdateEntrypointsResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'path'?: string | null; 'createdAt'?: string | null }>
export type UpdateEntrypointsResponses =
  FullResponse<UpdateEntrypointsResponseOK, 200>

export type GetEntrypointByIdRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'path' | 'taxonomyId'>;
  'id': string;
}

/**
 * A Entrypoint
 */
export type GetEntrypointByIdResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'path'?: string | null; 'createdAt'?: string | null }
export type GetEntrypointByIdResponses =
  FullResponse<GetEntrypointByIdResponseOK, 200>

export type UpdateEntrypointRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'path' | 'taxonomyId'>;
  'id': string;
  'taxonomyId': string;
  'applicationId': string;
  'path': string;
  'createdAt'?: string | null;
}

/**
 * A Entrypoint
 */
export type UpdateEntrypointResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'path'?: string | null; 'createdAt'?: string | null }
export type UpdateEntrypointResponses =
  FullResponse<UpdateEntrypointResponseOK, 200>

export type DeleteEntrypointsRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'path' | 'taxonomyId'>;
  'id': string;
}

/**
 * A Entrypoint
 */
export type DeleteEntrypointsResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'path'?: string | null; 'createdAt'?: string | null }
export type DeleteEntrypointsResponses =
  FullResponse<DeleteEntrypointsResponseOK, 200>

export type GetTaxonomyForEntrypointRequest = {
  'fields'?: Array<'closedAt' | 'createdAt' | 'id' | 'main' | 'name' | 'stage' | 'status'>;
  'id': string;
}

/**
 * A Taxonomy
 */
export type GetTaxonomyForEntrypointResponseOK = { 'id'?: string | null; 'name'?: string | null; 'main'?: boolean | null; 'status'?: 'started' | 'stopped' | null; 'stage'?: 'closed' | 'merged' | 'opened' | null; 'closedAt'?: string | null; 'createdAt'?: string | null }
export type GetTaxonomyForEntrypointResponses =
  FullResponse<GetTaxonomyForEntrypointResponseOK, 200>

export type GetApplicationForEntrypointRequest = {
  'fields'?: Array<'createdAt' | 'deleted' | 'deletedAt' | 'deletedBy' | 'id' | 'name'>;
  'id': string;
}

/**
 * A Application
 */
export type GetApplicationForEntrypointResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null; 'deleted'?: boolean | null; 'deletedAt'?: string | null; 'deletedBy'?: string | null }
export type GetApplicationForEntrypointResponses =
  FullResponse<GetApplicationForEntrypointResponseOK, 200>

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
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'bundleId' | 'createdAt' | 'deploymentSettingsId' | 'generationId' | 'id' | 'machineId' | 'status' | 'taxonomyId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetDeploymentsForApplicationStateResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'bundleId'?: string | null; 'machineId'?: string | null; 'createdAt'?: string | null; 'deploymentSettingsId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null }>
export type GetDeploymentsForApplicationStateResponses =
  FullResponse<GetDeploymentsForApplicationStateResponseOK, 200>

export type GetApplicationForApplicationStateRequest = {
  'fields'?: Array<'createdAt' | 'deleted' | 'deletedAt' | 'deletedBy' | 'id' | 'name'>;
  'id': string;
}

/**
 * A Application
 */
export type GetApplicationForApplicationStateResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null; 'deleted'?: boolean | null; 'deletedAt'?: string | null; 'deletedBy'?: string | null }
export type GetApplicationForApplicationStateResponses =
  FullResponse<GetApplicationForApplicationStateResponseOK, 200>

export type GetDeploymentsRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'bundleId' | 'createdAt' | 'deploymentSettingsId' | 'generationId' | 'id' | 'machineId' | 'status' | 'taxonomyId'>;
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
  'where.bundleId.eq'?: string;
  'where.bundleId.neq'?: string;
  'where.bundleId.gt'?: string;
  'where.bundleId.gte'?: string;
  'where.bundleId.lt'?: string;
  'where.bundleId.lte'?: string;
  'where.bundleId.like'?: string;
  'where.bundleId.ilike'?: string;
  'where.bundleId.in'?: string;
  'where.bundleId.nin'?: string;
  'where.bundleId.contains'?: string;
  'where.bundleId.contained'?: string;
  'where.bundleId.overlaps'?: string;
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
  'where.deploymentSettingsId.eq'?: string;
  'where.deploymentSettingsId.neq'?: string;
  'where.deploymentSettingsId.gt'?: string;
  'where.deploymentSettingsId.gte'?: string;
  'where.deploymentSettingsId.lt'?: string;
  'where.deploymentSettingsId.lte'?: string;
  'where.deploymentSettingsId.like'?: string;
  'where.deploymentSettingsId.ilike'?: string;
  'where.deploymentSettingsId.in'?: string;
  'where.deploymentSettingsId.nin'?: string;
  'where.deploymentSettingsId.contains'?: string;
  'where.deploymentSettingsId.contained'?: string;
  'where.deploymentSettingsId.overlaps'?: string;
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
  'where.machineId.eq'?: string;
  'where.machineId.neq'?: string;
  'where.machineId.gt'?: string;
  'where.machineId.gte'?: string;
  'where.machineId.lt'?: string;
  'where.machineId.lte'?: string;
  'where.machineId.like'?: string;
  'where.machineId.ilike'?: string;
  'where.machineId.in'?: string;
  'where.machineId.nin'?: string;
  'where.machineId.contains'?: string;
  'where.machineId.contained'?: string;
  'where.machineId.overlaps'?: string;
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
  'where.taxonomyId.eq'?: string;
  'where.taxonomyId.neq'?: string;
  'where.taxonomyId.gt'?: string;
  'where.taxonomyId.gte'?: string;
  'where.taxonomyId.lt'?: string;
  'where.taxonomyId.lte'?: string;
  'where.taxonomyId.like'?: string;
  'where.taxonomyId.ilike'?: string;
  'where.taxonomyId.in'?: string;
  'where.taxonomyId.nin'?: string;
  'where.taxonomyId.contains'?: string;
  'where.taxonomyId.contained'?: string;
  'where.taxonomyId.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.applicationId'?: 'asc' | 'desc';
  'orderby.applicationStateId'?: 'asc' | 'desc';
  'orderby.bundleId'?: 'asc' | 'desc';
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.deploymentSettingsId'?: 'asc' | 'desc';
  'orderby.generationId'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.machineId'?: 'asc' | 'desc';
  'orderby.status'?: 'asc' | 'desc';
  'orderby.taxonomyId'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetDeploymentsResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'bundleId'?: string | null; 'machineId'?: string | null; 'createdAt'?: string | null; 'deploymentSettingsId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null }>
export type GetDeploymentsResponses =
  FullResponse<GetDeploymentsResponseOK, 200>

export type CreateDeploymentRequest = {
  'id'?: string;
  'taxonomyId': string;
  'generationId': string;
  'applicationId': string;
  'applicationStateId'?: string | null;
  'bundleId': string;
  'machineId': string;
  'createdAt'?: string | null;
  'deploymentSettingsId': string;
  'status': 'failed' | 'started' | 'starting';
}

/**
 * A Deployment
 */
export type CreateDeploymentResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'bundleId'?: string | null; 'machineId'?: string | null; 'createdAt'?: string | null; 'deploymentSettingsId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null }
export type CreateDeploymentResponses =
  FullResponse<CreateDeploymentResponseOK, 200>

export type UpdateDeploymentsRequest = {
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'bundleId' | 'createdAt' | 'deploymentSettingsId' | 'generationId' | 'id' | 'machineId' | 'status' | 'taxonomyId'>;
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
  'where.bundleId.eq'?: string;
  'where.bundleId.neq'?: string;
  'where.bundleId.gt'?: string;
  'where.bundleId.gte'?: string;
  'where.bundleId.lt'?: string;
  'where.bundleId.lte'?: string;
  'where.bundleId.like'?: string;
  'where.bundleId.ilike'?: string;
  'where.bundleId.in'?: string;
  'where.bundleId.nin'?: string;
  'where.bundleId.contains'?: string;
  'where.bundleId.contained'?: string;
  'where.bundleId.overlaps'?: string;
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
  'where.deploymentSettingsId.eq'?: string;
  'where.deploymentSettingsId.neq'?: string;
  'where.deploymentSettingsId.gt'?: string;
  'where.deploymentSettingsId.gte'?: string;
  'where.deploymentSettingsId.lt'?: string;
  'where.deploymentSettingsId.lte'?: string;
  'where.deploymentSettingsId.like'?: string;
  'where.deploymentSettingsId.ilike'?: string;
  'where.deploymentSettingsId.in'?: string;
  'where.deploymentSettingsId.nin'?: string;
  'where.deploymentSettingsId.contains'?: string;
  'where.deploymentSettingsId.contained'?: string;
  'where.deploymentSettingsId.overlaps'?: string;
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
  'where.machineId.eq'?: string;
  'where.machineId.neq'?: string;
  'where.machineId.gt'?: string;
  'where.machineId.gte'?: string;
  'where.machineId.lt'?: string;
  'where.machineId.lte'?: string;
  'where.machineId.like'?: string;
  'where.machineId.ilike'?: string;
  'where.machineId.in'?: string;
  'where.machineId.nin'?: string;
  'where.machineId.contains'?: string;
  'where.machineId.contained'?: string;
  'where.machineId.overlaps'?: string;
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
  'where.taxonomyId.eq'?: string;
  'where.taxonomyId.neq'?: string;
  'where.taxonomyId.gt'?: string;
  'where.taxonomyId.gte'?: string;
  'where.taxonomyId.lt'?: string;
  'where.taxonomyId.lte'?: string;
  'where.taxonomyId.like'?: string;
  'where.taxonomyId.ilike'?: string;
  'where.taxonomyId.in'?: string;
  'where.taxonomyId.nin'?: string;
  'where.taxonomyId.contains'?: string;
  'where.taxonomyId.contained'?: string;
  'where.taxonomyId.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'taxonomyId': string;
  'generationId': string;
  'applicationId': string;
  'applicationStateId'?: string | null;
  'bundleId': string;
  'machineId': string;
  'createdAt'?: string | null;
  'deploymentSettingsId': string;
  'status': 'failed' | 'started' | 'starting';
}

/**
 * Default Response
 */
export type UpdateDeploymentsResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'bundleId'?: string | null; 'machineId'?: string | null; 'createdAt'?: string | null; 'deploymentSettingsId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null }>
export type UpdateDeploymentsResponses =
  FullResponse<UpdateDeploymentsResponseOK, 200>

export type GetDeploymentByIdRequest = {
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'bundleId' | 'createdAt' | 'deploymentSettingsId' | 'generationId' | 'id' | 'machineId' | 'status' | 'taxonomyId'>;
  'id': string;
}

/**
 * A Deployment
 */
export type GetDeploymentByIdResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'bundleId'?: string | null; 'machineId'?: string | null; 'createdAt'?: string | null; 'deploymentSettingsId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null }
export type GetDeploymentByIdResponses =
  FullResponse<GetDeploymentByIdResponseOK, 200>

export type UpdateDeploymentRequest = {
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'bundleId' | 'createdAt' | 'deploymentSettingsId' | 'generationId' | 'id' | 'machineId' | 'status' | 'taxonomyId'>;
  'id': string;
  'taxonomyId': string;
  'generationId': string;
  'applicationId': string;
  'applicationStateId'?: string | null;
  'bundleId': string;
  'machineId': string;
  'createdAt'?: string | null;
  'deploymentSettingsId': string;
  'status': 'failed' | 'started' | 'starting';
}

/**
 * A Deployment
 */
export type UpdateDeploymentResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'bundleId'?: string | null; 'machineId'?: string | null; 'createdAt'?: string | null; 'deploymentSettingsId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null }
export type UpdateDeploymentResponses =
  FullResponse<UpdateDeploymentResponseOK, 200>

export type DeleteDeploymentsRequest = {
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'bundleId' | 'createdAt' | 'deploymentSettingsId' | 'generationId' | 'id' | 'machineId' | 'status' | 'taxonomyId'>;
  'id': string;
}

/**
 * A Deployment
 */
export type DeleteDeploymentsResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'bundleId'?: string | null; 'machineId'?: string | null; 'createdAt'?: string | null; 'deploymentSettingsId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null }
export type DeleteDeploymentsResponses =
  FullResponse<DeleteDeploymentsResponseOK, 200>

export type GetTaxonomyForDeploymentRequest = {
  'fields'?: Array<'closedAt' | 'createdAt' | 'id' | 'main' | 'name' | 'stage' | 'status'>;
  'id': string;
}

/**
 * A Taxonomy
 */
export type GetTaxonomyForDeploymentResponseOK = { 'id'?: string | null; 'name'?: string | null; 'main'?: boolean | null; 'status'?: 'started' | 'stopped' | null; 'stage'?: 'closed' | 'merged' | 'opened' | null; 'closedAt'?: string | null; 'createdAt'?: string | null }
export type GetTaxonomyForDeploymentResponses =
  FullResponse<GetTaxonomyForDeploymentResponseOK, 200>

export type GetGenerationForDeploymentRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'mainIteration' | 'status' | 'taxonomyId'>;
  'id': string;
}

/**
 * A Generation
 */
export type GetGenerationForDeploymentResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'mainIteration'?: number | null; 'createdAt'?: string | null; 'status'?: 'empty' | 'failed' | 'started' | 'starting' | null }
export type GetGenerationForDeploymentResponses =
  FullResponse<GetGenerationForDeploymentResponseOK, 200>

export type GetApplicationForDeploymentRequest = {
  'fields'?: Array<'createdAt' | 'deleted' | 'deletedAt' | 'deletedBy' | 'id' | 'name'>;
  'id': string;
}

/**
 * A Application
 */
export type GetApplicationForDeploymentResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null; 'deleted'?: boolean | null; 'deletedAt'?: string | null; 'deletedBy'?: string | null }
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

export type GetDeploymentSettingForDeploymentRequest = {
  'fields'?: Array<'applicationId' | 'cores' | 'createdAt' | 'heap' | 'id' | 'memory' | 'services' | 'threads'>;
  'id': string;
}

/**
 * A DeploymentSetting
 */
export type GetDeploymentSettingForDeploymentResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'threads'?: number | null; 'cores'?: number | null; 'memory'?: number | null; 'heap'?: number | null; 'services'?: object | null; 'createdAt'?: string | null }
export type GetDeploymentSettingForDeploymentResponses =
  FullResponse<GetDeploymentSettingForDeploymentResponseOK, 200>

export type GetGraphsRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id' | 'taxonomyId'>;
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
  'where.taxonomyId.eq'?: string;
  'where.taxonomyId.neq'?: string;
  'where.taxonomyId.gt'?: string;
  'where.taxonomyId.gte'?: string;
  'where.taxonomyId.lt'?: string;
  'where.taxonomyId.lte'?: string;
  'where.taxonomyId.like'?: string;
  'where.taxonomyId.ilike'?: string;
  'where.taxonomyId.in'?: string;
  'where.taxonomyId.nin'?: string;
  'where.taxonomyId.contains'?: string;
  'where.taxonomyId.contained'?: string;
  'where.taxonomyId.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.generationId'?: 'asc' | 'desc';
  'orderby.graph'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.taxonomyId'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetGraphsResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }>
export type GetGraphsResponses =
  FullResponse<GetGraphsResponseOK, 200>

export type CreateGraphRequest = {
  'id'?: string;
  'taxonomyId': string;
  'generationId': string;
  'graph': object;
  'createdAt'?: string | null;
}

/**
 * A Graph
 */
export type CreateGraphResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }
export type CreateGraphResponses =
  FullResponse<CreateGraphResponseOK, 200>

export type UpdateGraphsRequest = {
  'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id' | 'taxonomyId'>;
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
  'where.taxonomyId.eq'?: string;
  'where.taxonomyId.neq'?: string;
  'where.taxonomyId.gt'?: string;
  'where.taxonomyId.gte'?: string;
  'where.taxonomyId.lt'?: string;
  'where.taxonomyId.lte'?: string;
  'where.taxonomyId.like'?: string;
  'where.taxonomyId.ilike'?: string;
  'where.taxonomyId.in'?: string;
  'where.taxonomyId.nin'?: string;
  'where.taxonomyId.contains'?: string;
  'where.taxonomyId.contained'?: string;
  'where.taxonomyId.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'taxonomyId': string;
  'generationId': string;
  'graph': object;
  'createdAt'?: string | null;
}

/**
 * Default Response
 */
export type UpdateGraphsResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }>
export type UpdateGraphsResponses =
  FullResponse<UpdateGraphsResponseOK, 200>

export type GetGraphByIdRequest = {
  'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id' | 'taxonomyId'>;
  'id': string;
}

/**
 * A Graph
 */
export type GetGraphByIdResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }
export type GetGraphByIdResponses =
  FullResponse<GetGraphByIdResponseOK, 200>

export type UpdateGraphRequest = {
  'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id' | 'taxonomyId'>;
  'id': string;
  'taxonomyId': string;
  'generationId': string;
  'graph': object;
  'createdAt'?: string | null;
}

/**
 * A Graph
 */
export type UpdateGraphResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }
export type UpdateGraphResponses =
  FullResponse<UpdateGraphResponseOK, 200>

export type DeleteGraphsRequest = {
  'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id' | 'taxonomyId'>;
  'id': string;
}

/**
 * A Graph
 */
export type DeleteGraphsResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }
export type DeleteGraphsResponses =
  FullResponse<DeleteGraphsResponseOK, 200>

export type GetTaxonomyForGraphRequest = {
  'fields'?: Array<'closedAt' | 'createdAt' | 'id' | 'main' | 'name' | 'stage' | 'status'>;
  'id': string;
}

/**
 * A Taxonomy
 */
export type GetTaxonomyForGraphResponseOK = { 'id'?: string | null; 'name'?: string | null; 'main'?: boolean | null; 'status'?: 'started' | 'stopped' | null; 'stage'?: 'closed' | 'merged' | 'opened' | null; 'closedAt'?: string | null; 'createdAt'?: string | null }
export type GetTaxonomyForGraphResponses =
  FullResponse<GetTaxonomyForGraphResponseOK, 200>

export type GetGenerationForGraphRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'mainIteration' | 'status' | 'taxonomyId'>;
  'id': string;
}

/**
 * A Generation
 */
export type GetGenerationForGraphResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'mainIteration'?: number | null; 'createdAt'?: string | null; 'status'?: 'empty' | 'failed' | 'started' | 'starting' | null }
export type GetGenerationForGraphResponses =
  FullResponse<GetGenerationForGraphResponseOK, 200>

export type GetGenerationsRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'createdAt' | 'id' | 'mainIteration' | 'status' | 'taxonomyId'>;
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
  'where.mainIteration.eq'?: number;
  'where.mainIteration.neq'?: number;
  'where.mainIteration.gt'?: number;
  'where.mainIteration.gte'?: number;
  'where.mainIteration.lt'?: number;
  'where.mainIteration.lte'?: number;
  'where.mainIteration.like'?: number;
  'where.mainIteration.ilike'?: number;
  'where.mainIteration.in'?: string;
  'where.mainIteration.nin'?: string;
  'where.mainIteration.contains'?: string;
  'where.mainIteration.contained'?: string;
  'where.mainIteration.overlaps'?: string;
  'where.status.eq'?: 'empty' | 'failed' | 'started' | 'starting';
  'where.status.neq'?: 'empty' | 'failed' | 'started' | 'starting';
  'where.status.gt'?: 'empty' | 'failed' | 'started' | 'starting';
  'where.status.gte'?: 'empty' | 'failed' | 'started' | 'starting';
  'where.status.lt'?: 'empty' | 'failed' | 'started' | 'starting';
  'where.status.lte'?: 'empty' | 'failed' | 'started' | 'starting';
  'where.status.like'?: 'empty' | 'failed' | 'started' | 'starting';
  'where.status.ilike'?: 'empty' | 'failed' | 'started' | 'starting';
  'where.status.in'?: string;
  'where.status.nin'?: string;
  'where.status.contains'?: string;
  'where.status.contained'?: string;
  'where.status.overlaps'?: string;
  'where.taxonomyId.eq'?: string;
  'where.taxonomyId.neq'?: string;
  'where.taxonomyId.gt'?: string;
  'where.taxonomyId.gte'?: string;
  'where.taxonomyId.lt'?: string;
  'where.taxonomyId.lte'?: string;
  'where.taxonomyId.like'?: string;
  'where.taxonomyId.ilike'?: string;
  'where.taxonomyId.in'?: string;
  'where.taxonomyId.nin'?: string;
  'where.taxonomyId.contains'?: string;
  'where.taxonomyId.contained'?: string;
  'where.taxonomyId.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.mainIteration'?: 'asc' | 'desc';
  'orderby.status'?: 'asc' | 'desc';
  'orderby.taxonomyId'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetGenerationsResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'mainIteration'?: number | null; 'createdAt'?: string | null; 'status'?: 'empty' | 'failed' | 'started' | 'starting' | null }>
export type GetGenerationsResponses =
  FullResponse<GetGenerationsResponseOK, 200>

export type CreateGenerationRequest = {
  'id'?: string;
  'taxonomyId': string;
  'mainIteration': number;
  'createdAt'?: string | null;
  'status': 'empty' | 'failed' | 'started' | 'starting';
}

/**
 * A Generation
 */
export type CreateGenerationResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'mainIteration'?: number | null; 'createdAt'?: string | null; 'status'?: 'empty' | 'failed' | 'started' | 'starting' | null }
export type CreateGenerationResponses =
  FullResponse<CreateGenerationResponseOK, 200>

export type UpdateGenerationsRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'mainIteration' | 'status' | 'taxonomyId'>;
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
  'where.mainIteration.eq'?: number;
  'where.mainIteration.neq'?: number;
  'where.mainIteration.gt'?: number;
  'where.mainIteration.gte'?: number;
  'where.mainIteration.lt'?: number;
  'where.mainIteration.lte'?: number;
  'where.mainIteration.like'?: number;
  'where.mainIteration.ilike'?: number;
  'where.mainIteration.in'?: string;
  'where.mainIteration.nin'?: string;
  'where.mainIteration.contains'?: string;
  'where.mainIteration.contained'?: string;
  'where.mainIteration.overlaps'?: string;
  'where.status.eq'?: 'empty' | 'failed' | 'started' | 'starting';
  'where.status.neq'?: 'empty' | 'failed' | 'started' | 'starting';
  'where.status.gt'?: 'empty' | 'failed' | 'started' | 'starting';
  'where.status.gte'?: 'empty' | 'failed' | 'started' | 'starting';
  'where.status.lt'?: 'empty' | 'failed' | 'started' | 'starting';
  'where.status.lte'?: 'empty' | 'failed' | 'started' | 'starting';
  'where.status.like'?: 'empty' | 'failed' | 'started' | 'starting';
  'where.status.ilike'?: 'empty' | 'failed' | 'started' | 'starting';
  'where.status.in'?: string;
  'where.status.nin'?: string;
  'where.status.contains'?: string;
  'where.status.contained'?: string;
  'where.status.overlaps'?: string;
  'where.taxonomyId.eq'?: string;
  'where.taxonomyId.neq'?: string;
  'where.taxonomyId.gt'?: string;
  'where.taxonomyId.gte'?: string;
  'where.taxonomyId.lt'?: string;
  'where.taxonomyId.lte'?: string;
  'where.taxonomyId.like'?: string;
  'where.taxonomyId.ilike'?: string;
  'where.taxonomyId.in'?: string;
  'where.taxonomyId.nin'?: string;
  'where.taxonomyId.contains'?: string;
  'where.taxonomyId.contained'?: string;
  'where.taxonomyId.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'taxonomyId': string;
  'mainIteration': number;
  'createdAt'?: string | null;
  'status': 'empty' | 'failed' | 'started' | 'starting';
}

/**
 * Default Response
 */
export type UpdateGenerationsResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'mainIteration'?: number | null; 'createdAt'?: string | null; 'status'?: 'empty' | 'failed' | 'started' | 'starting' | null }>
export type UpdateGenerationsResponses =
  FullResponse<UpdateGenerationsResponseOK, 200>

export type GetGenerationByIdRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'mainIteration' | 'status' | 'taxonomyId'>;
  'id': string;
}

/**
 * A Generation
 */
export type GetGenerationByIdResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'mainIteration'?: number | null; 'createdAt'?: string | null; 'status'?: 'empty' | 'failed' | 'started' | 'starting' | null }
export type GetGenerationByIdResponses =
  FullResponse<GetGenerationByIdResponseOK, 200>

export type UpdateGenerationRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'mainIteration' | 'status' | 'taxonomyId'>;
  'id': string;
  'taxonomyId': string;
  'mainIteration': number;
  'createdAt'?: string | null;
  'status': 'empty' | 'failed' | 'started' | 'starting';
}

/**
 * A Generation
 */
export type UpdateGenerationResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'mainIteration'?: number | null; 'createdAt'?: string | null; 'status'?: 'empty' | 'failed' | 'started' | 'starting' | null }
export type UpdateGenerationResponses =
  FullResponse<UpdateGenerationResponseOK, 200>

export type DeleteGenerationsRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'mainIteration' | 'status' | 'taxonomyId'>;
  'id': string;
}

/**
 * A Generation
 */
export type DeleteGenerationsResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'mainIteration'?: number | null; 'createdAt'?: string | null; 'status'?: 'empty' | 'failed' | 'started' | 'starting' | null }
export type DeleteGenerationsResponses =
  FullResponse<DeleteGenerationsResponseOK, 200>

export type GetDeploymentsForGenerationRequest = {
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'bundleId' | 'createdAt' | 'deploymentSettingsId' | 'generationId' | 'id' | 'machineId' | 'status' | 'taxonomyId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetDeploymentsForGenerationResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'bundleId'?: string | null; 'machineId'?: string | null; 'createdAt'?: string | null; 'deploymentSettingsId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null }>
export type GetDeploymentsForGenerationResponses =
  FullResponse<GetDeploymentsForGenerationResponseOK, 200>

export type GetGraphsForGenerationRequest = {
  'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id' | 'taxonomyId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetGraphsForGenerationResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }>
export type GetGraphsForGenerationResponses =
  FullResponse<GetGraphsForGenerationResponseOK, 200>

export type GetTaxonomyForGenerationRequest = {
  'fields'?: Array<'closedAt' | 'createdAt' | 'id' | 'main' | 'name' | 'stage' | 'status'>;
  'id': string;
}

/**
 * A Taxonomy
 */
export type GetTaxonomyForGenerationResponseOK = { 'id'?: string | null; 'name'?: string | null; 'main'?: boolean | null; 'status'?: 'started' | 'stopped' | null; 'stage'?: 'closed' | 'merged' | 'opened' | null; 'closedAt'?: string | null; 'createdAt'?: string | null }
export type GetTaxonomyForGenerationResponses =
  FullResponse<GetTaxonomyForGenerationResponseOK, 200>

export type GetDeploymentSettingsRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'applicationId' | 'cores' | 'createdAt' | 'heap' | 'id' | 'memory' | 'services' | 'threads'>;
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
  'where.cores.eq'?: number;
  'where.cores.neq'?: number;
  'where.cores.gt'?: number;
  'where.cores.gte'?: number;
  'where.cores.lt'?: number;
  'where.cores.lte'?: number;
  'where.cores.like'?: number;
  'where.cores.ilike'?: number;
  'where.cores.in'?: string;
  'where.cores.nin'?: string;
  'where.cores.contains'?: string;
  'where.cores.contained'?: string;
  'where.cores.overlaps'?: string;
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
  'where.heap.eq'?: number;
  'where.heap.neq'?: number;
  'where.heap.gt'?: number;
  'where.heap.gte'?: number;
  'where.heap.lt'?: number;
  'where.heap.lte'?: number;
  'where.heap.like'?: number;
  'where.heap.ilike'?: number;
  'where.heap.in'?: string;
  'where.heap.nin'?: string;
  'where.heap.contains'?: string;
  'where.heap.contained'?: string;
  'where.heap.overlaps'?: string;
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
  'where.services.eq'?: string;
  'where.services.neq'?: string;
  'where.services.gt'?: string;
  'where.services.gte'?: string;
  'where.services.lt'?: string;
  'where.services.lte'?: string;
  'where.services.like'?: string;
  'where.services.ilike'?: string;
  'where.services.in'?: string;
  'where.services.nin'?: string;
  'where.services.contains'?: string;
  'where.services.contained'?: string;
  'where.services.overlaps'?: string;
  'where.threads.eq'?: number;
  'where.threads.neq'?: number;
  'where.threads.gt'?: number;
  'where.threads.gte'?: number;
  'where.threads.lt'?: number;
  'where.threads.lte'?: number;
  'where.threads.like'?: number;
  'where.threads.ilike'?: number;
  'where.threads.in'?: string;
  'where.threads.nin'?: string;
  'where.threads.contains'?: string;
  'where.threads.contained'?: string;
  'where.threads.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.applicationId'?: 'asc' | 'desc';
  'orderby.cores'?: 'asc' | 'desc';
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.heap'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.memory'?: 'asc' | 'desc';
  'orderby.services'?: 'asc' | 'desc';
  'orderby.threads'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetDeploymentSettingsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'threads'?: number | null; 'cores'?: number | null; 'memory'?: number | null; 'heap'?: number | null; 'services'?: object | null; 'createdAt'?: string | null }>
export type GetDeploymentSettingsResponses =
  FullResponse<GetDeploymentSettingsResponseOK, 200>

export type CreateDeploymentSettingRequest = {
  'id'?: string;
  'applicationId': string;
  'threads': number;
  'cores': number;
  'memory': number;
  'heap': number;
  'services'?: object | null;
  'createdAt'?: string | null;
}

/**
 * A DeploymentSetting
 */
export type CreateDeploymentSettingResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'threads'?: number | null; 'cores'?: number | null; 'memory'?: number | null; 'heap'?: number | null; 'services'?: object | null; 'createdAt'?: string | null }
export type CreateDeploymentSettingResponses =
  FullResponse<CreateDeploymentSettingResponseOK, 200>

export type UpdateDeploymentSettingsRequest = {
  'fields'?: Array<'applicationId' | 'cores' | 'createdAt' | 'heap' | 'id' | 'memory' | 'services' | 'threads'>;
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
  'where.cores.eq'?: number;
  'where.cores.neq'?: number;
  'where.cores.gt'?: number;
  'where.cores.gte'?: number;
  'where.cores.lt'?: number;
  'where.cores.lte'?: number;
  'where.cores.like'?: number;
  'where.cores.ilike'?: number;
  'where.cores.in'?: string;
  'where.cores.nin'?: string;
  'where.cores.contains'?: string;
  'where.cores.contained'?: string;
  'where.cores.overlaps'?: string;
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
  'where.heap.eq'?: number;
  'where.heap.neq'?: number;
  'where.heap.gt'?: number;
  'where.heap.gte'?: number;
  'where.heap.lt'?: number;
  'where.heap.lte'?: number;
  'where.heap.like'?: number;
  'where.heap.ilike'?: number;
  'where.heap.in'?: string;
  'where.heap.nin'?: string;
  'where.heap.contains'?: string;
  'where.heap.contained'?: string;
  'where.heap.overlaps'?: string;
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
  'where.services.eq'?: string;
  'where.services.neq'?: string;
  'where.services.gt'?: string;
  'where.services.gte'?: string;
  'where.services.lt'?: string;
  'where.services.lte'?: string;
  'where.services.like'?: string;
  'where.services.ilike'?: string;
  'where.services.in'?: string;
  'where.services.nin'?: string;
  'where.services.contains'?: string;
  'where.services.contained'?: string;
  'where.services.overlaps'?: string;
  'where.threads.eq'?: number;
  'where.threads.neq'?: number;
  'where.threads.gt'?: number;
  'where.threads.gte'?: number;
  'where.threads.lt'?: number;
  'where.threads.lte'?: number;
  'where.threads.like'?: number;
  'where.threads.ilike'?: number;
  'where.threads.in'?: string;
  'where.threads.nin'?: string;
  'where.threads.contains'?: string;
  'where.threads.contained'?: string;
  'where.threads.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'applicationId': string;
  'threads': number;
  'cores': number;
  'memory': number;
  'heap': number;
  'services'?: object | null;
  'createdAt'?: string | null;
}

/**
 * Default Response
 */
export type UpdateDeploymentSettingsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'threads'?: number | null; 'cores'?: number | null; 'memory'?: number | null; 'heap'?: number | null; 'services'?: object | null; 'createdAt'?: string | null }>
export type UpdateDeploymentSettingsResponses =
  FullResponse<UpdateDeploymentSettingsResponseOK, 200>

export type GetDeploymentSettingByIdRequest = {
  'fields'?: Array<'applicationId' | 'cores' | 'createdAt' | 'heap' | 'id' | 'memory' | 'services' | 'threads'>;
  'id': string;
}

/**
 * A DeploymentSetting
 */
export type GetDeploymentSettingByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'threads'?: number | null; 'cores'?: number | null; 'memory'?: number | null; 'heap'?: number | null; 'services'?: object | null; 'createdAt'?: string | null }
export type GetDeploymentSettingByIdResponses =
  FullResponse<GetDeploymentSettingByIdResponseOK, 200>

export type UpdateDeploymentSettingRequest = {
  'fields'?: Array<'applicationId' | 'cores' | 'createdAt' | 'heap' | 'id' | 'memory' | 'services' | 'threads'>;
  'id': string;
  'applicationId': string;
  'threads': number;
  'cores': number;
  'memory': number;
  'heap': number;
  'services'?: object | null;
  'createdAt'?: string | null;
}

/**
 * A DeploymentSetting
 */
export type UpdateDeploymentSettingResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'threads'?: number | null; 'cores'?: number | null; 'memory'?: number | null; 'heap'?: number | null; 'services'?: object | null; 'createdAt'?: string | null }
export type UpdateDeploymentSettingResponses =
  FullResponse<UpdateDeploymentSettingResponseOK, 200>

export type DeleteDeploymentSettingsRequest = {
  'fields'?: Array<'applicationId' | 'cores' | 'createdAt' | 'heap' | 'id' | 'memory' | 'services' | 'threads'>;
  'id': string;
}

/**
 * A DeploymentSetting
 */
export type DeleteDeploymentSettingsResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'threads'?: number | null; 'cores'?: number | null; 'memory'?: number | null; 'heap'?: number | null; 'services'?: object | null; 'createdAt'?: string | null }
export type DeleteDeploymentSettingsResponses =
  FullResponse<DeleteDeploymentSettingsResponseOK, 200>

export type GetDeploymentsForDeploymentSettingRequest = {
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'bundleId' | 'createdAt' | 'deploymentSettingsId' | 'generationId' | 'id' | 'machineId' | 'status' | 'taxonomyId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetDeploymentsForDeploymentSettingResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'bundleId'?: string | null; 'machineId'?: string | null; 'createdAt'?: string | null; 'deploymentSettingsId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null }>
export type GetDeploymentsForDeploymentSettingResponses =
  FullResponse<GetDeploymentsForDeploymentSettingResponseOK, 200>

export type GetApplicationForDeploymentSettingRequest = {
  'fields'?: Array<'createdAt' | 'deleted' | 'deletedAt' | 'deletedBy' | 'id' | 'name'>;
  'id': string;
}

/**
 * A Application
 */
export type GetApplicationForDeploymentSettingResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null; 'deleted'?: boolean | null; 'deletedAt'?: string | null; 'deletedBy'?: string | null }
export type GetApplicationForDeploymentSettingResponses =
  FullResponse<GetApplicationForDeploymentSettingResponseOK, 200>

export type GetApplicationsRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'createdAt' | 'deleted' | 'deletedAt' | 'deletedBy' | 'id' | 'name'>;
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
  'where.deleted.eq'?: boolean;
  'where.deleted.neq'?: boolean;
  'where.deleted.gt'?: boolean;
  'where.deleted.gte'?: boolean;
  'where.deleted.lt'?: boolean;
  'where.deleted.lte'?: boolean;
  'where.deleted.like'?: boolean;
  'where.deleted.ilike'?: boolean;
  'where.deleted.in'?: string;
  'where.deleted.nin'?: string;
  'where.deleted.contains'?: string;
  'where.deleted.contained'?: string;
  'where.deleted.overlaps'?: string;
  'where.deletedAt.eq'?: string;
  'where.deletedAt.neq'?: string;
  'where.deletedAt.gt'?: string;
  'where.deletedAt.gte'?: string;
  'where.deletedAt.lt'?: string;
  'where.deletedAt.lte'?: string;
  'where.deletedAt.like'?: string;
  'where.deletedAt.ilike'?: string;
  'where.deletedAt.in'?: string;
  'where.deletedAt.nin'?: string;
  'where.deletedAt.contains'?: string;
  'where.deletedAt.contained'?: string;
  'where.deletedAt.overlaps'?: string;
  'where.deletedBy.eq'?: string;
  'where.deletedBy.neq'?: string;
  'where.deletedBy.gt'?: string;
  'where.deletedBy.gte'?: string;
  'where.deletedBy.lt'?: string;
  'where.deletedBy.lte'?: string;
  'where.deletedBy.like'?: string;
  'where.deletedBy.ilike'?: string;
  'where.deletedBy.in'?: string;
  'where.deletedBy.nin'?: string;
  'where.deletedBy.contains'?: string;
  'where.deletedBy.contained'?: string;
  'where.deletedBy.overlaps'?: string;
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
  'orderby.deleted'?: 'asc' | 'desc';
  'orderby.deletedAt'?: 'asc' | 'desc';
  'orderby.deletedBy'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.name'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetApplicationsResponseOK = Array<{ 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null; 'deleted'?: boolean | null; 'deletedAt'?: string | null; 'deletedBy'?: string | null }>
export type GetApplicationsResponses =
  FullResponse<GetApplicationsResponseOK, 200>

export type UpdateApplicationsRequest = {
  'fields'?: Array<'createdAt' | 'deleted' | 'deletedAt' | 'deletedBy' | 'id' | 'name'>;
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
  'where.deleted.eq'?: boolean;
  'where.deleted.neq'?: boolean;
  'where.deleted.gt'?: boolean;
  'where.deleted.gte'?: boolean;
  'where.deleted.lt'?: boolean;
  'where.deleted.lte'?: boolean;
  'where.deleted.like'?: boolean;
  'where.deleted.ilike'?: boolean;
  'where.deleted.in'?: string;
  'where.deleted.nin'?: string;
  'where.deleted.contains'?: string;
  'where.deleted.contained'?: string;
  'where.deleted.overlaps'?: string;
  'where.deletedAt.eq'?: string;
  'where.deletedAt.neq'?: string;
  'where.deletedAt.gt'?: string;
  'where.deletedAt.gte'?: string;
  'where.deletedAt.lt'?: string;
  'where.deletedAt.lte'?: string;
  'where.deletedAt.like'?: string;
  'where.deletedAt.ilike'?: string;
  'where.deletedAt.in'?: string;
  'where.deletedAt.nin'?: string;
  'where.deletedAt.contains'?: string;
  'where.deletedAt.contained'?: string;
  'where.deletedAt.overlaps'?: string;
  'where.deletedBy.eq'?: string;
  'where.deletedBy.neq'?: string;
  'where.deletedBy.gt'?: string;
  'where.deletedBy.gte'?: string;
  'where.deletedBy.lt'?: string;
  'where.deletedBy.lte'?: string;
  'where.deletedBy.like'?: string;
  'where.deletedBy.ilike'?: string;
  'where.deletedBy.in'?: string;
  'where.deletedBy.nin'?: string;
  'where.deletedBy.contains'?: string;
  'where.deletedBy.contained'?: string;
  'where.deletedBy.overlaps'?: string;
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
  'deleted': boolean;
  'deletedAt'?: string | null;
  'deletedBy'?: string | null;
}

/**
 * Default Response
 */
export type UpdateApplicationsResponseOK = Array<{ 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null; 'deleted'?: boolean | null; 'deletedAt'?: string | null; 'deletedBy'?: string | null }>
export type UpdateApplicationsResponses =
  FullResponse<UpdateApplicationsResponseOK, 200>

export type CreateApplicationRequest = {
  'name': string;
}

/**
 * Default Response
 */
export type CreateApplicationResponseOK = { 'id'?: string; 'name'?: string; 'createdAt'?: string }
export type CreateApplicationResponses =
  FullResponse<CreateApplicationResponseOK, 200>

export type GetApplicationByIdRequest = {
  'fields'?: Array<'createdAt' | 'deleted' | 'deletedAt' | 'deletedBy' | 'id' | 'name'>;
  'id': string;
}

/**
 * A Application
 */
export type GetApplicationByIdResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null; 'deleted'?: boolean | null; 'deletedAt'?: string | null; 'deletedBy'?: string | null }
export type GetApplicationByIdResponses =
  FullResponse<GetApplicationByIdResponseOK, 200>

export type UpdateApplicationRequest = {
  'fields'?: Array<'createdAt' | 'deleted' | 'deletedAt' | 'deletedBy' | 'id' | 'name'>;
  'id': string;
  'name': string;
  'createdAt'?: string | null;
  'deleted': boolean;
  'deletedAt'?: string | null;
  'deletedBy'?: string | null;
}

/**
 * A Application
 */
export type UpdateApplicationResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null; 'deleted'?: boolean | null; 'deletedAt'?: string | null; 'deletedBy'?: string | null }
export type UpdateApplicationResponses =
  FullResponse<UpdateApplicationResponseOK, 200>

export type DeleteApplicationsRequest = {
  'fields'?: Array<'createdAt' | 'deleted' | 'deletedAt' | 'deletedBy' | 'id' | 'name'>;
  'id': string;
}

/**
 * A Application
 */
export type DeleteApplicationsResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null; 'deleted'?: boolean | null; 'deletedAt'?: string | null; 'deletedBy'?: string | null }
export type DeleteApplicationsResponses =
  FullResponse<DeleteApplicationsResponseOK, 200>

export type GetTaxonomiesApplicationsChangesForApplicationRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'taxonomyId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetTaxonomiesApplicationsChangesForApplicationResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'createdAt'?: string | null }>
export type GetTaxonomiesApplicationsChangesForApplicationResponses =
  FullResponse<GetTaxonomiesApplicationsChangesForApplicationResponseOK, 200>

export type GetEnvironmentsForApplicationRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'secretsKey' | 'secretsStorageProvider' | 'taxonomyId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetEnvironmentsForApplicationResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'secretsStorageProvider'?: 'plaintext' | 'vault' | null; 'secretsKey'?: string | null; 'createdAt'?: string | null }>
export type GetEnvironmentsForApplicationResponses =
  FullResponse<GetEnvironmentsForApplicationResponseOK, 200>

export type GetEntrypointsForApplicationRequest = {
  'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'path' | 'taxonomyId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetEntrypointsForApplicationResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'applicationId'?: string | null; 'path'?: string | null; 'createdAt'?: string | null }>
export type GetEntrypointsForApplicationResponses =
  FullResponse<GetEntrypointsForApplicationResponseOK, 200>

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
  'fields'?: Array<'applicationId' | 'applicationStateId' | 'bundleId' | 'createdAt' | 'deploymentSettingsId' | 'generationId' | 'id' | 'machineId' | 'status' | 'taxonomyId'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetDeploymentsForApplicationResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'bundleId'?: string | null; 'machineId'?: string | null; 'createdAt'?: string | null; 'deploymentSettingsId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | null }>
export type GetDeploymentsForApplicationResponses =
  FullResponse<GetDeploymentsForApplicationResponseOK, 200>

export type GetDeploymentSettingsForApplicationRequest = {
  'fields'?: Array<'applicationId' | 'cores' | 'createdAt' | 'heap' | 'id' | 'memory' | 'services' | 'threads'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetDeploymentSettingsForApplicationResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'threads'?: number | null; 'cores'?: number | null; 'memory'?: number | null; 'heap'?: number | null; 'services'?: object | null; 'createdAt'?: string | null }>
export type GetDeploymentSettingsForApplicationResponses =
  FullResponse<GetDeploymentSettingsForApplicationResponseOK, 200>

export type GetApplicationSettingsForApplicationRequest = {
  'fields'?: Array<'applicationId' | 'cores' | 'createdAt' | 'heap' | 'id' | 'memory' | 'services' | 'threads'>;
  'id': string;
}

/**
 * Default Response
 */
export type GetApplicationSettingsForApplicationResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'threads'?: number | null; 'cores'?: number | null; 'memory'?: number | null; 'heap'?: number | null; 'createdAt'?: string | null; 'services'?: object | null }>
export type GetApplicationSettingsForApplicationResponses =
  FullResponse<GetApplicationSettingsForApplicationResponseOK, 200>

export type GetApplicationSettingsRequest = {
  /**
   * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
   */
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'applicationId' | 'cores' | 'createdAt' | 'heap' | 'id' | 'memory' | 'services' | 'threads'>;
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
  'where.cores.eq'?: number;
  'where.cores.neq'?: number;
  'where.cores.gt'?: number;
  'where.cores.gte'?: number;
  'where.cores.lt'?: number;
  'where.cores.lte'?: number;
  'where.cores.like'?: number;
  'where.cores.ilike'?: number;
  'where.cores.in'?: string;
  'where.cores.nin'?: string;
  'where.cores.contains'?: string;
  'where.cores.contained'?: string;
  'where.cores.overlaps'?: string;
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
  'where.heap.eq'?: number;
  'where.heap.neq'?: number;
  'where.heap.gt'?: number;
  'where.heap.gte'?: number;
  'where.heap.lt'?: number;
  'where.heap.lte'?: number;
  'where.heap.like'?: number;
  'where.heap.ilike'?: number;
  'where.heap.in'?: string;
  'where.heap.nin'?: string;
  'where.heap.contains'?: string;
  'where.heap.contained'?: string;
  'where.heap.overlaps'?: string;
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
  'where.services.eq'?: string;
  'where.services.neq'?: string;
  'where.services.gt'?: string;
  'where.services.gte'?: string;
  'where.services.lt'?: string;
  'where.services.lte'?: string;
  'where.services.like'?: string;
  'where.services.ilike'?: string;
  'where.services.in'?: string;
  'where.services.nin'?: string;
  'where.services.contains'?: string;
  'where.services.contained'?: string;
  'where.services.overlaps'?: string;
  'where.threads.eq'?: number;
  'where.threads.neq'?: number;
  'where.threads.gt'?: number;
  'where.threads.gte'?: number;
  'where.threads.lt'?: number;
  'where.threads.lte'?: number;
  'where.threads.like'?: number;
  'where.threads.ilike'?: number;
  'where.threads.in'?: string;
  'where.threads.nin'?: string;
  'where.threads.contains'?: string;
  'where.threads.contained'?: string;
  'where.threads.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.applicationId'?: 'asc' | 'desc';
  'orderby.cores'?: 'asc' | 'desc';
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.heap'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.memory'?: 'asc' | 'desc';
  'orderby.services'?: 'asc' | 'desc';
  'orderby.threads'?: 'asc' | 'desc';
}

/**
 * Default Response
 */
export type GetApplicationSettingsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'threads'?: number | null; 'cores'?: number | null; 'memory'?: number | null; 'heap'?: number | null; 'createdAt'?: string | null; 'services'?: object | null }>
export type GetApplicationSettingsResponses =
  FullResponse<GetApplicationSettingsResponseOK, 200>

export type CreateApplicationSettingRequest = {
  'id'?: string;
  'applicationId': string;
  'threads': number;
  'cores': number;
  'memory': number;
  'heap': number;
  'createdAt'?: string | null;
  'services'?: object | null;
}

/**
 * A ApplicationSetting
 */
export type CreateApplicationSettingResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'threads'?: number | null; 'cores'?: number | null; 'memory'?: number | null; 'heap'?: number | null; 'createdAt'?: string | null; 'services'?: object | null }
export type CreateApplicationSettingResponses =
  FullResponse<CreateApplicationSettingResponseOK, 200>

export type UpdateApplicationSettingsRequest = {
  'fields'?: Array<'applicationId' | 'cores' | 'createdAt' | 'heap' | 'id' | 'memory' | 'services' | 'threads'>;
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
  'where.cores.eq'?: number;
  'where.cores.neq'?: number;
  'where.cores.gt'?: number;
  'where.cores.gte'?: number;
  'where.cores.lt'?: number;
  'where.cores.lte'?: number;
  'where.cores.like'?: number;
  'where.cores.ilike'?: number;
  'where.cores.in'?: string;
  'where.cores.nin'?: string;
  'where.cores.contains'?: string;
  'where.cores.contained'?: string;
  'where.cores.overlaps'?: string;
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
  'where.heap.eq'?: number;
  'where.heap.neq'?: number;
  'where.heap.gt'?: number;
  'where.heap.gte'?: number;
  'where.heap.lt'?: number;
  'where.heap.lte'?: number;
  'where.heap.like'?: number;
  'where.heap.ilike'?: number;
  'where.heap.in'?: string;
  'where.heap.nin'?: string;
  'where.heap.contains'?: string;
  'where.heap.contained'?: string;
  'where.heap.overlaps'?: string;
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
  'where.services.eq'?: string;
  'where.services.neq'?: string;
  'where.services.gt'?: string;
  'where.services.gte'?: string;
  'where.services.lt'?: string;
  'where.services.lte'?: string;
  'where.services.like'?: string;
  'where.services.ilike'?: string;
  'where.services.in'?: string;
  'where.services.nin'?: string;
  'where.services.contains'?: string;
  'where.services.contained'?: string;
  'where.services.overlaps'?: string;
  'where.threads.eq'?: number;
  'where.threads.neq'?: number;
  'where.threads.gt'?: number;
  'where.threads.gte'?: number;
  'where.threads.lt'?: number;
  'where.threads.lte'?: number;
  'where.threads.like'?: number;
  'where.threads.ilike'?: number;
  'where.threads.in'?: string;
  'where.threads.nin'?: string;
  'where.threads.contains'?: string;
  'where.threads.contained'?: string;
  'where.threads.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'applicationId': string;
  'threads': number;
  'cores': number;
  'memory': number;
  'heap': number;
  'createdAt'?: string | null;
  'services'?: object | null;
}

/**
 * Default Response
 */
export type UpdateApplicationSettingsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'threads'?: number | null; 'cores'?: number | null; 'memory'?: number | null; 'heap'?: number | null; 'createdAt'?: string | null; 'services'?: object | null }>
export type UpdateApplicationSettingsResponses =
  FullResponse<UpdateApplicationSettingsResponseOK, 200>

export type GetApplicationSettingByIdRequest = {
  'fields'?: Array<'applicationId' | 'cores' | 'createdAt' | 'heap' | 'id' | 'memory' | 'services' | 'threads'>;
  'id': string;
}

/**
 * A ApplicationSetting
 */
export type GetApplicationSettingByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'threads'?: number | null; 'cores'?: number | null; 'memory'?: number | null; 'heap'?: number | null; 'createdAt'?: string | null; 'services'?: object | null }
export type GetApplicationSettingByIdResponses =
  FullResponse<GetApplicationSettingByIdResponseOK, 200>

export type UpdateApplicationSettingRequest = {
  'fields'?: Array<'applicationId' | 'cores' | 'createdAt' | 'heap' | 'id' | 'memory' | 'services' | 'threads'>;
  'id': string;
  'applicationId': string;
  'threads': number;
  'cores': number;
  'memory': number;
  'heap': number;
  'createdAt'?: string | null;
  'services'?: object | null;
}

/**
 * A ApplicationSetting
 */
export type UpdateApplicationSettingResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'threads'?: number | null; 'cores'?: number | null; 'memory'?: number | null; 'heap'?: number | null; 'createdAt'?: string | null; 'services'?: object | null }
export type UpdateApplicationSettingResponses =
  FullResponse<UpdateApplicationSettingResponseOK, 200>

export type DeleteApplicationSettingsRequest = {
  'fields'?: Array<'applicationId' | 'cores' | 'createdAt' | 'heap' | 'id' | 'memory' | 'services' | 'threads'>;
  'id': string;
}

/**
 * A ApplicationSetting
 */
export type DeleteApplicationSettingsResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'threads'?: number | null; 'cores'?: number | null; 'memory'?: number | null; 'heap'?: number | null; 'createdAt'?: string | null; 'services'?: object | null }
export type DeleteApplicationSettingsResponses =
  FullResponse<DeleteApplicationSettingsResponseOK, 200>

export type GetApplicationForApplicationSettingRequest = {
  'fields'?: Array<'createdAt' | 'deleted' | 'deletedAt' | 'deletedBy' | 'id' | 'name'>;
  'id': string;
}

/**
 * A Application
 */
export type GetApplicationForApplicationSettingResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null; 'deleted'?: boolean | null; 'deletedAt'?: string | null; 'deletedBy'?: string | null }
export type GetApplicationForApplicationSettingResponses =
  FullResponse<GetApplicationForApplicationSettingResponseOK, 200>

export type PostUpdateApplicationSettingsRequest = {
  'id': string;
  'threads': number;
  'cores': number;
  'memory': number;
  'heap': number;
  'services': Array<{ 'name'?: string; 'heap'?: number; 'threads'?: number }>;
}

/**
 * Default Response
 */
export type PostUpdateApplicationSettingsResponseOK = object
export type PostUpdateApplicationSettingsResponses =
  FullResponse<PostUpdateApplicationSettingsResponseOK, 200>

export type GetApplicationDomainsRequest = {
  'taxonomyId'?: string;
  'id': string;
}

/**
 * Default Response
 */
export type GetApplicationDomainsResponseOK = { 'internalDomain': string | null }
export type GetApplicationDomainsResponses =
  FullResponse<GetApplicationDomainsResponseOK, 200>

export type GetApplicationInstancesRequest = {
  'taxonomyId'?: string;
  'id': string;
}

/**
 * Default Response
 */
export type GetApplicationInstancesResponseOK = { 'instances': Array<{ 'id': string; 'startTime'?: string }>; 'maximumInstanceCount': number }
export type GetApplicationInstancesResponses =
  FullResponse<GetApplicationInstancesResponseOK, 200>

export type GetApplicationUrlRequest = {
  'taxonomyId'?: string;
  'id': string;
}

/**
 * Default Response
 */
export type GetApplicationUrlResponseOK = { 'url': string | null }
export type GetApplicationUrlResponses =
  FullResponse<GetApplicationUrlResponseOK, 200>

export type ExposeApplicationRequest = {
  'taxonomyId'?: string;
  'id': string;
  'path': string;
}

/**
 * Default Response
 */
export type ExposeApplicationResponseOK = { 'url': string }
export type ExposeApplicationResponses =
  FullResponse<ExposeApplicationResponseOK, 200>

export type HideApplicationRequest = {
  'taxonomyId'?: string;
  'id': string;
}

/**
 * Default Response
 */
export type HideApplicationResponseOK = object
export type HideApplicationResponses =
  FullResponse<HideApplicationResponseOK, 200>

export type DeployApplicationRequest = {
  'id': string;
  'taxonomyName': string;
  'bundleId': string;
  'secrets': Record<string, string> | null;
  'services': Array<{ 'name': string }>;
}

/**
 * Default Response
 */
export type DeployApplicationResponseOK = { 'taxonomy'?: { 'id'?: string | null; 'name'?: string | null; 'main'?: boolean | null; 'status'?: 'started' | 'stopped' | null; 'stage'?: 'closed' | 'merged' | 'opened' | null; 'closedAt'?: string | null; 'createdAt'?: string | null }; 'generation': { 'id'?: string | null; 'taxonomyId'?: string | null; 'mainIteration'?: number | null; 'createdAt'?: string | null; 'status'?: 'empty' | 'failed' | 'started' | 'starting' | null }; 'deployErrors': Array<string> }
export type DeployApplicationResponses =
  FullResponse<DeployApplicationResponseOK, 200>

export type UndeployApplicationRequest = {
  'id': string;
  'taxonomyName': string;
}

/**
 * Default Response
 */
export type UndeployApplicationResponseOK = { 'taxonomy'?: { 'id'?: string | null; 'name'?: string | null; 'main'?: boolean | null; 'status'?: 'started' | 'stopped' | null; 'stage'?: 'closed' | 'merged' | 'opened' | null; 'closedAt'?: string | null; 'createdAt'?: string | null }; 'generation': { 'id'?: string | null; 'taxonomyId'?: string | null; 'mainIteration'?: number | null; 'createdAt'?: string | null; 'status'?: 'empty' | 'failed' | 'started' | 'starting' | null }; 'deployErrors': Array<string> }
export type UndeployApplicationResponses =
  FullResponse<UndeployApplicationResponseOK, 200>

export type DeleteApplicationRequest = {
  'id': string;
}

/**
 * Default Response
 */
export type DeleteApplicationResponseOK = { 'steps': Array<{ 'type': string; 'description': string; 'errors': Array<string> }> }
export type DeleteApplicationResponses =
  FullResponse<DeleteApplicationResponseOK, 200>

export type RestartDeploymentRequest = {
  'taxonomyId'?: string;
  'id': string;
}

export type RestartDeploymentResponseOK = unknown
export type RestartDeploymentResponses =
  FullResponse<RestartDeploymentResponseOK, 200>

export type GetApplicationSecretsKeysRequest = {
  'taxonomyId'?: string;
  'full'?: boolean;
  'id': string;
}

/**
 * Default Response
 */
export type GetApplicationSecretsKeysResponseOK = Array<string>
export type GetApplicationSecretsKeysResponses =
  FullResponse<GetApplicationSecretsKeysResponseOK, 200>

export type GetApplicationSecretsRequest = {
  'taxonomyId'?: string;
  'full'?: boolean;
  'id': string;
}

/**
 * Default Response
 */
export type GetApplicationSecretsResponseOK = Record<string, string>
export type GetApplicationSecretsResponses =
  FullResponse<GetApplicationSecretsResponseOK, 200>

export type SaveApplicationSecretsRequest = {
  'taxonomyId'?: string;
  'id': string;
  'secrets': Record<string, string>;
}

/**
 * Default Response
 */
export type SaveApplicationSecretsResponseOK = object
export type SaveApplicationSecretsResponses =
  FullResponse<SaveApplicationSecretsResponseOK, 200>

export type SaveApplicationStatusRequest = {
  'taxonomyId'?: string;
  'bundleId'?: string;
  'id': string;
  'status': string;
}

/**
 * Default Response
 */
export type SaveApplicationStatusResponseOK = object
export type SaveApplicationStatusResponses =
  FullResponse<SaveApplicationStatusResponseOK, 200>

export type SaveApplicationStateRequest = {
  'taxonomyId'?: string;
  'bundleId'?: string;
  'id': string;
  'metadata': { 'platformaticVersion': string };
  'services': Array<object>;
}

/**
 * Default Response
 */
export type SaveApplicationStateResponseOK = object
export type SaveApplicationStateResponses =
  FullResponse<SaveApplicationStateResponseOK, 200>

export type GetApplicationsIdScalerRequest = {
  'taxonomyId'?: string;
  'id': string;
}

/**
 * Default Response
 */
export type GetApplicationsIdScalerResponseOK = { 'rules'?: Array<{ 'name'?: string; 'scaleUp'?: string; 'scaleDown'?: string }> }
export type GetApplicationsIdScalerResponses =
  FullResponse<GetApplicationsIdScalerResponseOK, 200>

export type PostCreateApplicationRequest = {
  'name': string;
}

/**
 * Default Response
 */
export type PostCreateApplicationResponseOK = { 'id'?: string; 'name'?: string; 'createdAt'?: string }
export type PostCreateApplicationResponses =
  FullResponse<PostCreateApplicationResponseOK, 200>

export type GetTaxonomiesChangesRequest = {
  'taxonomyIds'?: Array<string>;
  'taxonomyStages'?: Array<string>;
  'applicationIds'?: Array<string>;
}

/**
 * Default Response
 */
export type GetTaxonomiesChangesResponseOK = Array<{ 'taxonomyId': string; 'applicationId': string; 'deploymentId': string; 'bundleId': string; 'createdAt': string }>
export type GetTaxonomiesChangesResponses =
  FullResponse<GetTaxonomiesChangesResponseOK, 200>

export type GetGenerationGraphRequest = {
  'id': string;
}

/**
 * Default Response
 */
export type GetGenerationGraphResponseOK = { 'applications': Array<{ 'id': string; 'name': string; 'services': Array<object> }>; 'links': Array<{ 'source'?: { 'applicationId': string | null; 'serviceId': string | null; 'telemetryId': string }; 'target'?: { 'applicationId': string | null; 'serviceId': string | null; 'telemetryId': string; 'url': string | null }; 'requestsAmount'?: number }> }
export type GetGenerationGraphResponses =
  FullResponse<GetGenerationGraphResponseOK, 200>

export type GetMachinesRequest = {
  
}

export type GetMachinesResponseOK = unknown
export type GetMachinesResponses =
  FullResponse<GetMachinesResponseOK, 200>

export type GetMachinesIdRequest = {
  'id': string;
}

export type GetMachinesIdResponseOK = unknown
export type GetMachinesIdResponses =
  FullResponse<GetMachinesIdResponseOK, 200>

export type GetNpmConfigRequest = {
  
}

/**
 * Default Response
 */
export type GetNpmConfigResponseOK = { 'os'?: string; 'cpu'?: string; 'libc'?: string }
export type GetNpmConfigResponses =
  FullResponse<GetNpmConfigResponseOK, 200>

export type GetTaxonomyUrlsRequest = {
  'id': string;
}

/**
 * Default Response
 */
export type GetTaxonomyUrlsResponseOK = { 'urls': Array<string> }
export type GetTaxonomyUrlsResponses =
  FullResponse<GetTaxonomyUrlsResponseOK, 200>

export type GetMainTaxonomyGraphRequest = {
  'generationId'?: string;
  'id': string;
}

/**
 * Default Response
 */
export type GetMainTaxonomyGraphResponseOK = { 'applications': Array<{ 'id': string; 'name': string; 'path': string | null; 'services': Array<object> }>; 'links': Array<{ 'source': { 'applicationId': string | null; 'serviceId': string | null; 'telemetryId': string }; 'target': { 'applicationId': string | null; 'serviceId': string | null; 'telemetryId': string }; 'requestsAmount': string; 'responseTime': string }> }
export type GetMainTaxonomyGraphResponses =
  FullResponse<GetMainTaxonomyGraphResponseOK, 200>

export type GetPreviewTaxonomyGraphRequest = {
  'id': string;
}

/**
 * Default Response
 */
export type GetPreviewTaxonomyGraphResponseOK = { 'applications': Array<{ 'id': string; 'name': string; 'path': string | null; 'status'?: string; 'services': Array<object> }>; 'links': Array<{ 'source': { 'applicationId': string | null; 'serviceId': string | null; 'telemetryId': string }; 'target': { 'applicationId': string | null; 'serviceId': string | null; 'telemetryId': string }; 'status': string }> }
export type GetPreviewTaxonomyGraphResponses =
  FullResponse<GetPreviewTaxonomyGraphResponseOK, 200>

export type StartTaxonomyRequest = {
  'id': string;
}

export type StartTaxonomyResponseOK = unknown
export type StartTaxonomyResponses =
  FullResponse<StartTaxonomyResponseOK, 200>

export type StopTaxonomyRequest = {
  'id': string;
}

export type StopTaxonomyResponseOK = unknown
export type StopTaxonomyResponses =
  FullResponse<StopTaxonomyResponseOK, 200>

export type SyncPreviewTaxonomyRequest = {
  'id': string;
}

export type SyncPreviewTaxonomyResponseOK = unknown
export type SyncPreviewTaxonomyResponses =
  FullResponse<SyncPreviewTaxonomyResponseOK, 200>

export type GetTaxonomySecretsRequest = {
  'full'?: boolean;
  'id': string;
}

/**
 * Default Response
 */
export type GetTaxonomySecretsResponseOK = Record<string, string>
export type GetTaxonomySecretsResponses =
  FullResponse<GetTaxonomySecretsResponseOK, 200>

export type SaveTaxonomySecretsRequest = {
  'id': string;
  'secrets': Record<string, string>;
}

/**
 * Default Response
 */
export type SaveTaxonomySecretsResponseOK = object
export type SaveTaxonomySecretsResponses =
  FullResponse<SaveTaxonomySecretsResponseOK, 200>

export type ImportTaxonomyRequest = {
  'id': string;
  'x-user'?: string;
}

export type ImportTaxonomyResponseOK = unknown
export type ImportTaxonomyResponses =
  FullResponse<ImportTaxonomyResponseOK, 200>

export type ExportTaxonomyRequest = {
  'id': string;
  'x-user': string;
}

export type ExportTaxonomyResponseOK = unknown
export type ExportTaxonomyResponses =
  FullResponse<ExportTaxonomyResponseOK, 200>

export type CloseTaxonomyRequest = {
  'merge'?: boolean;
  'id': string;
}

export type CloseTaxonomyResponseOK = unknown
export type CloseTaxonomyResponses =
  FullResponse<CloseTaxonomyResponseOK, 200>



export interface ControlPlane {
  setBaseUrl(newUrl: string) : void;
  setDefaultHeaders(headers: object) : void;
  /**
   * Get taxonomies.
   *
   * Fetch taxonomies from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getTaxonomies(req: GetTaxonomiesRequest): Promise<GetTaxonomiesResponses>;
  /**
   * Create taxonomy.
   *
   * Add new taxonomy to the database.
   * @param req - request parameters object
   * @returns the API response
   */
  createTaxonomy(req: CreateTaxonomyRequest): Promise<CreateTaxonomyResponses>;
  /**
   * Update taxonomies.
   *
   * Update one or more taxonomies in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateTaxonomies(req: UpdateTaxonomiesRequest): Promise<UpdateTaxonomiesResponses>;
  /**
   * Get Taxonomy by id.
   *
   * Fetch Taxonomy using its id from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getTaxonomyById(req: GetTaxonomyByIdRequest): Promise<GetTaxonomyByIdResponses>;
  /**
   * Update taxonomy.
   *
   * Update taxonomy in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateTaxonomy(req: UpdateTaxonomyRequest): Promise<UpdateTaxonomyResponses>;
  /**
   * Delete taxonomies.
   *
   * Delete one or more taxonomies from the Database.
   * @param req - request parameters object
   * @returns the API response
   */
  deleteTaxonomies(req: DeleteTaxonomiesRequest): Promise<DeleteTaxonomiesResponses>;
  /**
   * Get taxonomiesApplicationsChanges for taxonomy.
   *
   * Fetch all the taxonomiesApplicationsChanges for taxonomy from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getTaxonomiesApplicationsChangesForTaxonomy(req: GetTaxonomiesApplicationsChangesForTaxonomyRequest): Promise<GetTaxonomiesApplicationsChangesForTaxonomyResponses>;
  /**
   * Get environments for taxonomy.
   *
   * Fetch all the environments for taxonomy from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getEnvironmentsForTaxonomy(req: GetEnvironmentsForTaxonomyRequest): Promise<GetEnvironmentsForTaxonomyResponses>;
  /**
   * Get entrypoints for taxonomy.
   *
   * Fetch all the entrypoints for taxonomy from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getEntrypointsForTaxonomy(req: GetEntrypointsForTaxonomyRequest): Promise<GetEntrypointsForTaxonomyResponses>;
  /**
   * Get deployments for taxonomy.
   *
   * Fetch all the deployments for taxonomy from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getDeploymentsForTaxonomy(req: GetDeploymentsForTaxonomyRequest): Promise<GetDeploymentsForTaxonomyResponses>;
  /**
   * Get graphs for taxonomy.
   *
   * Fetch all the graphs for taxonomy from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGraphsForTaxonomy(req: GetGraphsForTaxonomyRequest): Promise<GetGraphsForTaxonomyResponses>;
  /**
   * Get generations for taxonomy.
   *
   * Fetch all the generations for taxonomy from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGenerationsForTaxonomy(req: GetGenerationsForTaxonomyRequest): Promise<GetGenerationsForTaxonomyResponses>;
  /**
   * Get taxonomiesApplicationsChanges.
   *
   * Fetch taxonomiesApplicationsChanges from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getTaxonomiesApplicationsChanges(req: GetTaxonomiesApplicationsChangesRequest): Promise<GetTaxonomiesApplicationsChangesResponses>;
  /**
   * Create taxonomiesApplicationsChange.
   *
   * Add new taxonomiesApplicationsChange to the database.
   * @param req - request parameters object
   * @returns the API response
   */
  createTaxonomiesApplicationsChange(req: CreateTaxonomiesApplicationsChangeRequest): Promise<CreateTaxonomiesApplicationsChangeResponses>;
  /**
   * Update taxonomiesApplicationsChanges.
   *
   * Update one or more taxonomiesApplicationsChanges in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateTaxonomiesApplicationsChanges(req: UpdateTaxonomiesApplicationsChangesRequest): Promise<UpdateTaxonomiesApplicationsChangesResponses>;
  /**
   * Get TaxonomiesApplicationsChange by id.
   *
   * Fetch TaxonomiesApplicationsChange using its id from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getTaxonomiesApplicationsChangeById(req: GetTaxonomiesApplicationsChangeByIdRequest): Promise<GetTaxonomiesApplicationsChangeByIdResponses>;
  /**
   * Update taxonomiesApplicationsChange.
   *
   * Update taxonomiesApplicationsChange in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateTaxonomiesApplicationsChange(req: UpdateTaxonomiesApplicationsChangeRequest): Promise<UpdateTaxonomiesApplicationsChangeResponses>;
  /**
   * Delete taxonomiesApplicationsChanges.
   *
   * Delete one or more taxonomiesApplicationsChanges from the Database.
   * @param req - request parameters object
   * @returns the API response
   */
  deleteTaxonomiesApplicationsChanges(req: DeleteTaxonomiesApplicationsChangesRequest): Promise<DeleteTaxonomiesApplicationsChangesResponses>;
  /**
   * Get taxonomy for taxonomiesApplicationsChange.
   *
   * Fetch the taxonomy for taxonomiesApplicationsChange from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getTaxonomyForTaxonomiesApplicationsChange(req: GetTaxonomyForTaxonomiesApplicationsChangeRequest): Promise<GetTaxonomyForTaxonomiesApplicationsChangeResponses>;
  /**
   * Get application for taxonomiesApplicationsChange.
   *
   * Fetch the application for taxonomiesApplicationsChange from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationForTaxonomiesApplicationsChange(req: GetApplicationForTaxonomiesApplicationsChangeRequest): Promise<GetApplicationForTaxonomiesApplicationsChangeResponses>;
  /**
   * Get environments.
   *
   * Fetch environments from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getEnvironments(req: GetEnvironmentsRequest): Promise<GetEnvironmentsResponses>;
  /**
   * Create environment.
   *
   * Add new environment to the database.
   * @param req - request parameters object
   * @returns the API response
   */
  createEnvironment(req: CreateEnvironmentRequest): Promise<CreateEnvironmentResponses>;
  /**
   * Update environments.
   *
   * Update one or more environments in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateEnvironments(req: UpdateEnvironmentsRequest): Promise<UpdateEnvironmentsResponses>;
  /**
   * Get Environment by id.
   *
   * Fetch Environment using its id from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getEnvironmentById(req: GetEnvironmentByIdRequest): Promise<GetEnvironmentByIdResponses>;
  /**
   * Update environment.
   *
   * Update environment in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateEnvironment(req: UpdateEnvironmentRequest): Promise<UpdateEnvironmentResponses>;
  /**
   * Delete environments.
   *
   * Delete one or more environments from the Database.
   * @param req - request parameters object
   * @returns the API response
   */
  deleteEnvironments(req: DeleteEnvironmentsRequest): Promise<DeleteEnvironmentsResponses>;
  /**
   * Get taxonomy for environment.
   *
   * Fetch the taxonomy for environment from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getTaxonomyForEnvironment(req: GetTaxonomyForEnvironmentRequest): Promise<GetTaxonomyForEnvironmentResponses>;
  /**
   * Get application for environment.
   *
   * Fetch the application for environment from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationForEnvironment(req: GetApplicationForEnvironmentRequest): Promise<GetApplicationForEnvironmentResponses>;
  /**
   * Get entrypoints.
   *
   * Fetch entrypoints from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getEntrypoints(req: GetEntrypointsRequest): Promise<GetEntrypointsResponses>;
  /**
   * Create entrypoint.
   *
   * Add new entrypoint to the database.
   * @param req - request parameters object
   * @returns the API response
   */
  createEntrypoint(req: CreateEntrypointRequest): Promise<CreateEntrypointResponses>;
  /**
   * Update entrypoints.
   *
   * Update one or more entrypoints in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateEntrypoints(req: UpdateEntrypointsRequest): Promise<UpdateEntrypointsResponses>;
  /**
   * Get Entrypoint by id.
   *
   * Fetch Entrypoint using its id from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getEntrypointById(req: GetEntrypointByIdRequest): Promise<GetEntrypointByIdResponses>;
  /**
   * Update entrypoint.
   *
   * Update entrypoint in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateEntrypoint(req: UpdateEntrypointRequest): Promise<UpdateEntrypointResponses>;
  /**
   * Delete entrypoints.
   *
   * Delete one or more entrypoints from the Database.
   * @param req - request parameters object
   * @returns the API response
   */
  deleteEntrypoints(req: DeleteEntrypointsRequest): Promise<DeleteEntrypointsResponses>;
  /**
   * Get taxonomy for entrypoint.
   *
   * Fetch the taxonomy for entrypoint from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getTaxonomyForEntrypoint(req: GetTaxonomyForEntrypointRequest): Promise<GetTaxonomyForEntrypointResponses>;
  /**
   * Get application for entrypoint.
   *
   * Fetch the application for entrypoint from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationForEntrypoint(req: GetApplicationForEntrypointRequest): Promise<GetApplicationForEntrypointResponses>;
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
   * Get taxonomy for deployment.
   *
   * Fetch the taxonomy for deployment from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getTaxonomyForDeployment(req: GetTaxonomyForDeploymentRequest): Promise<GetTaxonomyForDeploymentResponses>;
  /**
   * Get generation for deployment.
   *
   * Fetch the generation for deployment from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGenerationForDeployment(req: GetGenerationForDeploymentRequest): Promise<GetGenerationForDeploymentResponses>;
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
   * Get deploymentSetting for deployment.
   *
   * Fetch the deploymentSetting for deployment from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getDeploymentSettingForDeployment(req: GetDeploymentSettingForDeploymentRequest): Promise<GetDeploymentSettingForDeploymentResponses>;
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
   * Get taxonomy for graph.
   *
   * Fetch the taxonomy for graph from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getTaxonomyForGraph(req: GetTaxonomyForGraphRequest): Promise<GetTaxonomyForGraphResponses>;
  /**
   * Get generation for graph.
   *
   * Fetch the generation for graph from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGenerationForGraph(req: GetGenerationForGraphRequest): Promise<GetGenerationForGraphResponses>;
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
   * Get deployments for generation.
   *
   * Fetch all the deployments for generation from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getDeploymentsForGeneration(req: GetDeploymentsForGenerationRequest): Promise<GetDeploymentsForGenerationResponses>;
  /**
   * Get graphs for generation.
   *
   * Fetch all the graphs for generation from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getGraphsForGeneration(req: GetGraphsForGenerationRequest): Promise<GetGraphsForGenerationResponses>;
  /**
   * Get taxonomy for generation.
   *
   * Fetch the taxonomy for generation from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getTaxonomyForGeneration(req: GetTaxonomyForGenerationRequest): Promise<GetTaxonomyForGenerationResponses>;
  /**
   * Get deploymentSettings.
   *
   * Fetch deploymentSettings from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getDeploymentSettings(req: GetDeploymentSettingsRequest): Promise<GetDeploymentSettingsResponses>;
  /**
   * Create deploymentSetting.
   *
   * Add new deploymentSetting to the database.
   * @param req - request parameters object
   * @returns the API response
   */
  createDeploymentSetting(req: CreateDeploymentSettingRequest): Promise<CreateDeploymentSettingResponses>;
  /**
   * Update deploymentSettings.
   *
   * Update one or more deploymentSettings in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateDeploymentSettings(req: UpdateDeploymentSettingsRequest): Promise<UpdateDeploymentSettingsResponses>;
  /**
   * Get DeploymentSetting by id.
   *
   * Fetch DeploymentSetting using its id from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getDeploymentSettingById(req: GetDeploymentSettingByIdRequest): Promise<GetDeploymentSettingByIdResponses>;
  /**
   * Update deploymentSetting.
   *
   * Update deploymentSetting in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateDeploymentSetting(req: UpdateDeploymentSettingRequest): Promise<UpdateDeploymentSettingResponses>;
  /**
   * Delete deploymentSettings.
   *
   * Delete one or more deploymentSettings from the Database.
   * @param req - request parameters object
   * @returns the API response
   */
  deleteDeploymentSettings(req: DeleteDeploymentSettingsRequest): Promise<DeleteDeploymentSettingsResponses>;
  /**
   * Get deployments for deploymentSetting.
   *
   * Fetch all the deployments for deploymentSetting from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getDeploymentsForDeploymentSetting(req: GetDeploymentsForDeploymentSettingRequest): Promise<GetDeploymentsForDeploymentSettingResponses>;
  /**
   * Get application for deploymentSetting.
   *
   * Fetch the application for deploymentSetting from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationForDeploymentSetting(req: GetApplicationForDeploymentSettingRequest): Promise<GetApplicationForDeploymentSettingResponses>;
  /**
   * Get applications.
   *
   * Fetch applications from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplications(req: GetApplicationsRequest): Promise<GetApplicationsResponses>;
  /**
   * Update applications.
   *
   * Update one or more applications in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateApplications(req: UpdateApplicationsRequest): Promise<UpdateApplicationsResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  createApplication(req: CreateApplicationRequest): Promise<CreateApplicationResponses>;
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
   * Get taxonomiesApplicationsChanges for application.
   *
   * Fetch all the taxonomiesApplicationsChanges for application from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getTaxonomiesApplicationsChangesForApplication(req: GetTaxonomiesApplicationsChangesForApplicationRequest): Promise<GetTaxonomiesApplicationsChangesForApplicationResponses>;
  /**
   * Get environments for application.
   *
   * Fetch all the environments for application from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getEnvironmentsForApplication(req: GetEnvironmentsForApplicationRequest): Promise<GetEnvironmentsForApplicationResponses>;
  /**
   * Get entrypoints for application.
   *
   * Fetch all the entrypoints for application from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getEntrypointsForApplication(req: GetEntrypointsForApplicationRequest): Promise<GetEntrypointsForApplicationResponses>;
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
   * Get deploymentSettings for application.
   *
   * Fetch all the deploymentSettings for application from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getDeploymentSettingsForApplication(req: GetDeploymentSettingsForApplicationRequest): Promise<GetDeploymentSettingsForApplicationResponses>;
  /**
   * Get applicationSettings for application.
   *
   * Fetch all the applicationSettings for application from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationSettingsForApplication(req: GetApplicationSettingsForApplicationRequest): Promise<GetApplicationSettingsForApplicationResponses>;
  /**
   * Get applicationSettings.
   *
   * Fetch applicationSettings from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationSettings(req: GetApplicationSettingsRequest): Promise<GetApplicationSettingsResponses>;
  /**
   * Create applicationSetting.
   *
   * Add new applicationSetting to the database.
   * @param req - request parameters object
   * @returns the API response
   */
  createApplicationSetting(req: CreateApplicationSettingRequest): Promise<CreateApplicationSettingResponses>;
  /**
   * Update applicationSettings.
   *
   * Update one or more applicationSettings in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateApplicationSettings(req: UpdateApplicationSettingsRequest): Promise<UpdateApplicationSettingsResponses>;
  /**
   * Get ApplicationSetting by id.
   *
   * Fetch ApplicationSetting using its id from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationSettingById(req: GetApplicationSettingByIdRequest): Promise<GetApplicationSettingByIdResponses>;
  /**
   * Update applicationSetting.
   *
   * Update applicationSetting in the database.
   * @param req - request parameters object
   * @returns the API response
   */
  updateApplicationSetting(req: UpdateApplicationSettingRequest): Promise<UpdateApplicationSettingResponses>;
  /**
   * Delete applicationSettings.
   *
   * Delete one or more applicationSettings from the Database.
   * @param req - request parameters object
   * @returns the API response
   */
  deleteApplicationSettings(req: DeleteApplicationSettingsRequest): Promise<DeleteApplicationSettingsResponses>;
  /**
   * Get application for applicationSetting.
   *
   * Fetch the application for applicationSetting from the database.
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationForApplicationSetting(req: GetApplicationForApplicationSettingRequest): Promise<GetApplicationForApplicationSettingResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  postUpdateApplicationSettings(req: PostUpdateApplicationSettingsRequest): Promise<PostUpdateApplicationSettingsResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationDomains(req: GetApplicationDomainsRequest): Promise<GetApplicationDomainsResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationInstances(req: GetApplicationInstancesRequest): Promise<GetApplicationInstancesResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationUrl(req: GetApplicationUrlRequest): Promise<GetApplicationUrlResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  exposeApplication(req: ExposeApplicationRequest): Promise<ExposeApplicationResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  hideApplication(req: HideApplicationRequest): Promise<HideApplicationResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  deployApplication(req: DeployApplicationRequest): Promise<DeployApplicationResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  undeployApplication(req: UndeployApplicationRequest): Promise<UndeployApplicationResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  deleteApplication(req: DeleteApplicationRequest): Promise<DeleteApplicationResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  restartDeployment(req: RestartDeploymentRequest): Promise<RestartDeploymentResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationSecretsKeys(req: GetApplicationSecretsKeysRequest): Promise<GetApplicationSecretsKeysResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationSecrets(req: GetApplicationSecretsRequest): Promise<GetApplicationSecretsResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  saveApplicationSecrets(req: SaveApplicationSecretsRequest): Promise<SaveApplicationSecretsResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  saveApplicationStatus(req: SaveApplicationStatusRequest): Promise<SaveApplicationStatusResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  saveApplicationState(req: SaveApplicationStateRequest): Promise<SaveApplicationStateResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getApplicationsIdScaler(req: GetApplicationsIdScalerRequest): Promise<GetApplicationsIdScalerResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  postCreateApplication(req: PostCreateApplicationRequest): Promise<PostCreateApplicationResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getTaxonomiesChanges(req: GetTaxonomiesChangesRequest): Promise<GetTaxonomiesChangesResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getGenerationGraph(req: GetGenerationGraphRequest): Promise<GetGenerationGraphResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getMachines(req: GetMachinesRequest): Promise<GetMachinesResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getMachinesId(req: GetMachinesIdRequest): Promise<GetMachinesIdResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getNpmConfig(req: GetNpmConfigRequest): Promise<GetNpmConfigResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getTaxonomyUrls(req: GetTaxonomyUrlsRequest): Promise<GetTaxonomyUrlsResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getMainTaxonomyGraph(req: GetMainTaxonomyGraphRequest): Promise<GetMainTaxonomyGraphResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getPreviewTaxonomyGraph(req: GetPreviewTaxonomyGraphRequest): Promise<GetPreviewTaxonomyGraphResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  startTaxonomy(req: StartTaxonomyRequest): Promise<StartTaxonomyResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  stopTaxonomy(req: StopTaxonomyRequest): Promise<StopTaxonomyResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  syncPreviewTaxonomy(req: SyncPreviewTaxonomyRequest): Promise<SyncPreviewTaxonomyResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  getTaxonomySecrets(req: GetTaxonomySecretsRequest): Promise<GetTaxonomySecretsResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  saveTaxonomySecrets(req: SaveTaxonomySecretsRequest): Promise<SaveTaxonomySecretsResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  importTaxonomy(req: ImportTaxonomyRequest): Promise<ImportTaxonomyResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  exportTaxonomy(req: ExportTaxonomyRequest): Promise<ExportTaxonomyResponses>;
  /**
   * @param req - request parameters object
   * @returns the API response
   */
  closeTaxonomy(req: CloseTaxonomyRequest): Promise<CloseTaxonomyResponses>;
}
type PlatformaticFrontendClient = Omit<ControlPlane, 'setBaseUrl'>
type BuildOptions = {
  headers?: object
}
export default function build(url: string, options?: BuildOptions): PlatformaticFrontendClient
