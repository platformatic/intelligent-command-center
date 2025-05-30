import { type FastifyReply, type FastifyPluginAsync } from 'fastify'
import { type GetHeadersOptions, type StatusCode1xx, type StatusCode2xx, type StatusCode3xx, type StatusCode4xx, type StatusCode5xx } from '@platformatic/client'
import { type FormData } from 'undici'

declare namespace coldStorage {
  export type ColdStorage = {
    getCalculations(req: GetCalculationsRequest): Promise<GetCalculationsResponses>;
    createCalculation(req: CreateCalculationRequest): Promise<CreateCalculationResponses>;
    updateCalculations(req: UpdateCalculationsRequest): Promise<UpdateCalculationsResponses>;
    getCalculationById(req: GetCalculationByIdRequest): Promise<GetCalculationByIdResponses>;
    updateCalculation(req: UpdateCalculationRequest): Promise<UpdateCalculationResponses>;
    deleteCalculations(req: DeleteCalculationsRequest): Promise<DeleteCalculationsResponses>;
    getDbOperations(req: GetDbOperationsRequest): Promise<GetDbOperationsResponses>;
    createDbOperation(req: CreateDbOperationRequest): Promise<CreateDbOperationResponses>;
    updateDbOperations(req: UpdateDbOperationsRequest): Promise<UpdateDbOperationsResponses>;
    getDbOperationByDbId(req: GetDbOperationByDbIdRequest): Promise<GetDbOperationByDbIdResponses>;
    updateDbOperation(req: UpdateDbOperationRequest): Promise<UpdateDbOperationResponses>;
    deleteDbOperations(req: DeleteDbOperationsRequest): Promise<DeleteDbOperationsResponses>;
    getLatencies(req: GetLatenciesRequest): Promise<GetLatenciesResponses>;
    createLatency(req: CreateLatencyRequest): Promise<CreateLatencyResponses>;
    updateLatencies(req: UpdateLatenciesRequest): Promise<UpdateLatenciesResponses>;
    getLatencyByServiceFrom(req: GetLatencyByServiceFromRequest): Promise<GetLatencyByServiceFromResponses>;
    updateLatency(req: UpdateLatencyRequest): Promise<UpdateLatencyResponses>;
    deleteLatencies(req: DeleteLatenciesRequest): Promise<DeleteLatenciesResponses>;
    getPaths(req: GetPathsRequest): Promise<GetPathsResponses>;
    createPath(req: CreatePathRequest): Promise<CreatePathResponses>;
    updatePaths(req: UpdatePathsRequest): Promise<UpdatePathsResponses>;
    getPathByPath(req: GetPathByPathRequest): Promise<GetPathByPathResponses>;
    updatePath(req: UpdatePathRequest): Promise<UpdatePathResponses>;
    deletePaths(req: DeletePathsRequest): Promise<DeletePathsResponses>;
    getPathsWindow(req: GetPathsWindowRequest): Promise<GetPathsWindowResponses>;
    postPathsDump(req: PostPathsDumpRequest): Promise<PostPathsDumpResponses>;
    getDbWindow(req: GetDbWindowRequest): Promise<GetDbWindowResponses>;
    postDbDump(req: PostDbDumpRequest): Promise<PostDbDumpResponses>;
    getLatenciesWindow(req: GetLatenciesWindowRequest): Promise<GetLatenciesWindowResponses>;
    postLatenciesDump(req: PostLatenciesDumpRequest): Promise<PostLatenciesDumpResponses>;
  }
  export interface ColdStorageOptions {
    url: string
  }
  export const coldStorage: ColdStoragePlugin;
  export { coldStorage as default };
  export interface FullResponse<T, U extends number> {
    'statusCode': U;
    'headers': Record<string, string>;
    'body': T;
  }

  export type GetCalculationsRequest = {
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    'fields'?: Array<'createdAt' | 'id' | 'request' | 'response'>;
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
    'where.or'?: Array<string>;
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.request'?: 'asc' | 'desc';
    'orderby.response'?: 'asc' | 'desc';
  }

  export type GetCalculationsResponseOK = Array<{ 'id'?: string | null; 'request'?: object; 'response'?: object; 'createdAt'?: string | null }>
  export type GetCalculationsResponses =
    GetCalculationsResponseOK

  export type CreateCalculationRequest = {
    'id'?: string;
    'request': object;
    'response': object;
    'createdAt'?: string | null;
  }

  export type CreateCalculationResponseOK = { 'id'?: string | null; 'request'?: object; 'response'?: object; 'createdAt'?: string | null }
  export type CreateCalculationResponses =
    CreateCalculationResponseOK

  export type UpdateCalculationsRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'request' | 'response'>;
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
    'where.or'?: Array<string>;
    'id'?: string;
    'request': object;
    'response': object;
    'createdAt'?: string | null;
  }

  export type UpdateCalculationsResponseOK = Array<{ 'id'?: string | null; 'request'?: object; 'response'?: object; 'createdAt'?: string | null }>
  export type UpdateCalculationsResponses =
    UpdateCalculationsResponseOK

  export type GetCalculationByIdRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'request' | 'response'>;
    'id': string;
  }

  export type GetCalculationByIdResponseOK = { 'id'?: string | null; 'request'?: object; 'response'?: object; 'createdAt'?: string | null }
  export type GetCalculationByIdResponses =
    GetCalculationByIdResponseOK

  export type UpdateCalculationRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'request' | 'response'>;
    'id': string;
    'request': object;
    'response': object;
    'createdAt'?: string | null;
  }

  export type UpdateCalculationResponseOK = { 'id'?: string | null; 'request'?: object; 'response'?: object; 'createdAt'?: string | null }
  export type UpdateCalculationResponses =
    UpdateCalculationResponseOK

  export type DeleteCalculationsRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'request' | 'response'>;
    'id': string;
  }

  export type DeleteCalculationsResponseOK = { 'id'?: string | null; 'request'?: object; 'response'?: object; 'createdAt'?: string | null }
  export type DeleteCalculationsResponses =
    DeleteCalculationsResponseOK

  export type GetDbOperationsRequest = {
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    'fields'?: Array<'columns' | 'dbId' | 'dbName' | 'dbSystem' | 'dumpedAt' | 'host' | 'paths' | 'port' | 'queryType' | 'tables' | 'targetTable' | 'taxonomyId'>;
    'where.columns.all'?: string;
    'where.columns.any'?: string;
    'where.dbId.eq'?: string;
    'where.dbId.neq'?: string;
    'where.dbId.gt'?: string;
    'where.dbId.gte'?: string;
    'where.dbId.lt'?: string;
    'where.dbId.lte'?: string;
    'where.dbId.like'?: string;
    'where.dbId.ilike'?: string;
    'where.dbId.in'?: string;
    'where.dbId.nin'?: string;
    'where.dbId.contains'?: string;
    'where.dbId.contained'?: string;
    'where.dbId.overlaps'?: string;
    'where.dbName.eq'?: string;
    'where.dbName.neq'?: string;
    'where.dbName.gt'?: string;
    'where.dbName.gte'?: string;
    'where.dbName.lt'?: string;
    'where.dbName.lte'?: string;
    'where.dbName.like'?: string;
    'where.dbName.ilike'?: string;
    'where.dbName.in'?: string;
    'where.dbName.nin'?: string;
    'where.dbName.contains'?: string;
    'where.dbName.contained'?: string;
    'where.dbName.overlaps'?: string;
    'where.dbSystem.eq'?: string;
    'where.dbSystem.neq'?: string;
    'where.dbSystem.gt'?: string;
    'where.dbSystem.gte'?: string;
    'where.dbSystem.lt'?: string;
    'where.dbSystem.lte'?: string;
    'where.dbSystem.like'?: string;
    'where.dbSystem.ilike'?: string;
    'where.dbSystem.in'?: string;
    'where.dbSystem.nin'?: string;
    'where.dbSystem.contains'?: string;
    'where.dbSystem.contained'?: string;
    'where.dbSystem.overlaps'?: string;
    'where.dumpedAt.eq'?: string;
    'where.dumpedAt.neq'?: string;
    'where.dumpedAt.gt'?: string;
    'where.dumpedAt.gte'?: string;
    'where.dumpedAt.lt'?: string;
    'where.dumpedAt.lte'?: string;
    'where.dumpedAt.like'?: string;
    'where.dumpedAt.ilike'?: string;
    'where.dumpedAt.in'?: string;
    'where.dumpedAt.nin'?: string;
    'where.dumpedAt.contains'?: string;
    'where.dumpedAt.contained'?: string;
    'where.dumpedAt.overlaps'?: string;
    'where.host.eq'?: string;
    'where.host.neq'?: string;
    'where.host.gt'?: string;
    'where.host.gte'?: string;
    'where.host.lt'?: string;
    'where.host.lte'?: string;
    'where.host.like'?: string;
    'where.host.ilike'?: string;
    'where.host.in'?: string;
    'where.host.nin'?: string;
    'where.host.contains'?: string;
    'where.host.contained'?: string;
    'where.host.overlaps'?: string;
    'where.paths.all'?: string;
    'where.paths.any'?: string;
    'where.port.eq'?: number;
    'where.port.neq'?: number;
    'where.port.gt'?: number;
    'where.port.gte'?: number;
    'where.port.lt'?: number;
    'where.port.lte'?: number;
    'where.port.like'?: number;
    'where.port.ilike'?: number;
    'where.port.in'?: string;
    'where.port.nin'?: string;
    'where.port.contains'?: string;
    'where.port.contained'?: string;
    'where.port.overlaps'?: string;
    'where.queryType.eq'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'where.queryType.neq'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'where.queryType.gt'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'where.queryType.gte'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'where.queryType.lt'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'where.queryType.lte'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'where.queryType.like'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'where.queryType.ilike'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'where.queryType.in'?: string;
    'where.queryType.nin'?: string;
    'where.queryType.contains'?: string;
    'where.queryType.contained'?: string;
    'where.queryType.overlaps'?: string;
    'where.tables.all'?: string;
    'where.tables.any'?: string;
    'where.targetTable.eq'?: string;
    'where.targetTable.neq'?: string;
    'where.targetTable.gt'?: string;
    'where.targetTable.gte'?: string;
    'where.targetTable.lt'?: string;
    'where.targetTable.lte'?: string;
    'where.targetTable.like'?: string;
    'where.targetTable.ilike'?: string;
    'where.targetTable.in'?: string;
    'where.targetTable.nin'?: string;
    'where.targetTable.contains'?: string;
    'where.targetTable.contained'?: string;
    'where.targetTable.overlaps'?: string;
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
    'orderby.dbId'?: 'asc' | 'desc';
    'orderby.dbName'?: 'asc' | 'desc';
    'orderby.dbSystem'?: 'asc' | 'desc';
    'orderby.dumpedAt'?: 'asc' | 'desc';
    'orderby.host'?: 'asc' | 'desc';
    'orderby.port'?: 'asc' | 'desc';
    'orderby.queryType'?: 'asc' | 'desc';
    'orderby.targetTable'?: 'asc' | 'desc';
    'orderby.taxonomyId'?: 'asc' | 'desc';
  }

  export type GetDbOperationsResponseOK = Array<{ 'dbId'?: string | null; 'dbSystem'?: string | null; 'dbName'?: string | null; 'host'?: string | null; 'port'?: number | null; 'tables'?: Array<string>; 'columns'?: Array<string>; 'queryType'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'; 'targetTable'?: string | null; 'paths'?: Array<string>; 'taxonomyId'?: string | null; 'dumpedAt'?: string | null }>
  export type GetDbOperationsResponses =
    GetDbOperationsResponseOK

  export type CreateDbOperationRequest = {
    'dbId'?: string;
    'dbSystem'?: string | null;
    'dbName'?: string | null;
    'host'?: string | null;
    'port'?: number | null;
    'tables': Array<string>;
    'columns': Array<string>;
    'queryType': 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'targetTable'?: string | null;
    'paths': Array<string>;
    'taxonomyId'?: string | null;
    'dumpedAt': string;
  }

  export type CreateDbOperationResponseOK = { 'dbId'?: string | null; 'dbSystem'?: string | null; 'dbName'?: string | null; 'host'?: string | null; 'port'?: number | null; 'tables'?: Array<string>; 'columns'?: Array<string>; 'queryType'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'; 'targetTable'?: string | null; 'paths'?: Array<string>; 'taxonomyId'?: string | null; 'dumpedAt'?: string | null }
  export type CreateDbOperationResponses =
    CreateDbOperationResponseOK

  export type UpdateDbOperationsRequest = {
    'fields'?: Array<'columns' | 'dbId' | 'dbName' | 'dbSystem' | 'dumpedAt' | 'host' | 'paths' | 'port' | 'queryType' | 'tables' | 'targetTable' | 'taxonomyId'>;
    'where.columns.all'?: string;
    'where.columns.any'?: string;
    'where.dbId.eq'?: string;
    'where.dbId.neq'?: string;
    'where.dbId.gt'?: string;
    'where.dbId.gte'?: string;
    'where.dbId.lt'?: string;
    'where.dbId.lte'?: string;
    'where.dbId.like'?: string;
    'where.dbId.ilike'?: string;
    'where.dbId.in'?: string;
    'where.dbId.nin'?: string;
    'where.dbId.contains'?: string;
    'where.dbId.contained'?: string;
    'where.dbId.overlaps'?: string;
    'where.dbName.eq'?: string;
    'where.dbName.neq'?: string;
    'where.dbName.gt'?: string;
    'where.dbName.gte'?: string;
    'where.dbName.lt'?: string;
    'where.dbName.lte'?: string;
    'where.dbName.like'?: string;
    'where.dbName.ilike'?: string;
    'where.dbName.in'?: string;
    'where.dbName.nin'?: string;
    'where.dbName.contains'?: string;
    'where.dbName.contained'?: string;
    'where.dbName.overlaps'?: string;
    'where.dbSystem.eq'?: string;
    'where.dbSystem.neq'?: string;
    'where.dbSystem.gt'?: string;
    'where.dbSystem.gte'?: string;
    'where.dbSystem.lt'?: string;
    'where.dbSystem.lte'?: string;
    'where.dbSystem.like'?: string;
    'where.dbSystem.ilike'?: string;
    'where.dbSystem.in'?: string;
    'where.dbSystem.nin'?: string;
    'where.dbSystem.contains'?: string;
    'where.dbSystem.contained'?: string;
    'where.dbSystem.overlaps'?: string;
    'where.dumpedAt.eq'?: string;
    'where.dumpedAt.neq'?: string;
    'where.dumpedAt.gt'?: string;
    'where.dumpedAt.gte'?: string;
    'where.dumpedAt.lt'?: string;
    'where.dumpedAt.lte'?: string;
    'where.dumpedAt.like'?: string;
    'where.dumpedAt.ilike'?: string;
    'where.dumpedAt.in'?: string;
    'where.dumpedAt.nin'?: string;
    'where.dumpedAt.contains'?: string;
    'where.dumpedAt.contained'?: string;
    'where.dumpedAt.overlaps'?: string;
    'where.host.eq'?: string;
    'where.host.neq'?: string;
    'where.host.gt'?: string;
    'where.host.gte'?: string;
    'where.host.lt'?: string;
    'where.host.lte'?: string;
    'where.host.like'?: string;
    'where.host.ilike'?: string;
    'where.host.in'?: string;
    'where.host.nin'?: string;
    'where.host.contains'?: string;
    'where.host.contained'?: string;
    'where.host.overlaps'?: string;
    'where.paths.all'?: string;
    'where.paths.any'?: string;
    'where.port.eq'?: number;
    'where.port.neq'?: number;
    'where.port.gt'?: number;
    'where.port.gte'?: number;
    'where.port.lt'?: number;
    'where.port.lte'?: number;
    'where.port.like'?: number;
    'where.port.ilike'?: number;
    'where.port.in'?: string;
    'where.port.nin'?: string;
    'where.port.contains'?: string;
    'where.port.contained'?: string;
    'where.port.overlaps'?: string;
    'where.queryType.eq'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'where.queryType.neq'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'where.queryType.gt'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'where.queryType.gte'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'where.queryType.lt'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'where.queryType.lte'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'where.queryType.like'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'where.queryType.ilike'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'where.queryType.in'?: string;
    'where.queryType.nin'?: string;
    'where.queryType.contains'?: string;
    'where.queryType.contained'?: string;
    'where.queryType.overlaps'?: string;
    'where.tables.all'?: string;
    'where.tables.any'?: string;
    'where.targetTable.eq'?: string;
    'where.targetTable.neq'?: string;
    'where.targetTable.gt'?: string;
    'where.targetTable.gte'?: string;
    'where.targetTable.lt'?: string;
    'where.targetTable.lte'?: string;
    'where.targetTable.like'?: string;
    'where.targetTable.ilike'?: string;
    'where.targetTable.in'?: string;
    'where.targetTable.nin'?: string;
    'where.targetTable.contains'?: string;
    'where.targetTable.contained'?: string;
    'where.targetTable.overlaps'?: string;
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
    'dbId'?: string;
    'dbSystem'?: string | null;
    'dbName'?: string | null;
    'host'?: string | null;
    'port'?: number | null;
    'tables': Array<string>;
    'columns': Array<string>;
    'queryType': 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'targetTable'?: string | null;
    'paths': Array<string>;
    'taxonomyId'?: string | null;
    'dumpedAt': string;
  }

  export type UpdateDbOperationsResponseOK = Array<{ 'dbId'?: string | null; 'dbSystem'?: string | null; 'dbName'?: string | null; 'host'?: string | null; 'port'?: number | null; 'tables'?: Array<string>; 'columns'?: Array<string>; 'queryType'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'; 'targetTable'?: string | null; 'paths'?: Array<string>; 'taxonomyId'?: string | null; 'dumpedAt'?: string | null }>
  export type UpdateDbOperationsResponses =
    UpdateDbOperationsResponseOK

  export type GetDbOperationByDbIdRequest = {
    'fields'?: Array<'columns' | 'dbId' | 'dbName' | 'dbSystem' | 'dumpedAt' | 'host' | 'paths' | 'port' | 'queryType' | 'tables' | 'targetTable' | 'taxonomyId'>;
    'dbId': string;
  }

  export type GetDbOperationByDbIdResponseOK = { 'dbId'?: string | null; 'dbSystem'?: string | null; 'dbName'?: string | null; 'host'?: string | null; 'port'?: number | null; 'tables'?: Array<string>; 'columns'?: Array<string>; 'queryType'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'; 'targetTable'?: string | null; 'paths'?: Array<string>; 'taxonomyId'?: string | null; 'dumpedAt'?: string | null }
  export type GetDbOperationByDbIdResponses =
    GetDbOperationByDbIdResponseOK

  export type UpdateDbOperationRequest = {
    'fields'?: Array<'columns' | 'dbId' | 'dbName' | 'dbSystem' | 'dumpedAt' | 'host' | 'paths' | 'port' | 'queryType' | 'tables' | 'targetTable' | 'taxonomyId'>;
    'dbId': string;
    'dbSystem'?: string | null;
    'dbName'?: string | null;
    'host'?: string | null;
    'port'?: number | null;
    'tables': Array<string>;
    'columns': Array<string>;
    'queryType': 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    'targetTable'?: string | null;
    'paths': Array<string>;
    'taxonomyId'?: string | null;
    'dumpedAt': string;
  }

  export type UpdateDbOperationResponseOK = { 'dbId'?: string | null; 'dbSystem'?: string | null; 'dbName'?: string | null; 'host'?: string | null; 'port'?: number | null; 'tables'?: Array<string>; 'columns'?: Array<string>; 'queryType'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'; 'targetTable'?: string | null; 'paths'?: Array<string>; 'taxonomyId'?: string | null; 'dumpedAt'?: string | null }
  export type UpdateDbOperationResponses =
    UpdateDbOperationResponseOK

  export type DeleteDbOperationsRequest = {
    'fields'?: Array<'columns' | 'dbId' | 'dbName' | 'dbSystem' | 'dumpedAt' | 'host' | 'paths' | 'port' | 'queryType' | 'tables' | 'targetTable' | 'taxonomyId'>;
    'dbId': string;
  }

  export type DeleteDbOperationsResponseOK = { 'dbId'?: string | null; 'dbSystem'?: string | null; 'dbName'?: string | null; 'host'?: string | null; 'port'?: number | null; 'tables'?: Array<string>; 'columns'?: Array<string>; 'queryType'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'; 'targetTable'?: string | null; 'paths'?: Array<string>; 'taxonomyId'?: string | null; 'dumpedAt'?: string | null }
  export type DeleteDbOperationsResponses =
    DeleteDbOperationsResponseOK

  export type GetLatenciesRequest = {
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    'fields'?: Array<'count' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'mean' | 'serviceFrom' | 'serviceTo' | 'taxonomyId'>;
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
    'where.dumpedAt.eq'?: string;
    'where.dumpedAt.neq'?: string;
    'where.dumpedAt.gt'?: string;
    'where.dumpedAt.gte'?: string;
    'where.dumpedAt.lt'?: string;
    'where.dumpedAt.lte'?: string;
    'where.dumpedAt.like'?: string;
    'where.dumpedAt.ilike'?: string;
    'where.dumpedAt.in'?: string;
    'where.dumpedAt.nin'?: string;
    'where.dumpedAt.contains'?: string;
    'where.dumpedAt.contained'?: string;
    'where.dumpedAt.overlaps'?: string;
    'where.exportedAt.eq'?: string;
    'where.exportedAt.neq'?: string;
    'where.exportedAt.gt'?: string;
    'where.exportedAt.gte'?: string;
    'where.exportedAt.lt'?: string;
    'where.exportedAt.lte'?: string;
    'where.exportedAt.like'?: string;
    'where.exportedAt.ilike'?: string;
    'where.exportedAt.in'?: string;
    'where.exportedAt.nin'?: string;
    'where.exportedAt.contains'?: string;
    'where.exportedAt.contained'?: string;
    'where.exportedAt.overlaps'?: string;
    'where.importedAt.eq'?: string;
    'where.importedAt.neq'?: string;
    'where.importedAt.gt'?: string;
    'where.importedAt.gte'?: string;
    'where.importedAt.lt'?: string;
    'where.importedAt.lte'?: string;
    'where.importedAt.like'?: string;
    'where.importedAt.ilike'?: string;
    'where.importedAt.in'?: string;
    'where.importedAt.nin'?: string;
    'where.importedAt.contains'?: string;
    'where.importedAt.contained'?: string;
    'where.importedAt.overlaps'?: string;
    'where.mean.eq'?: number;
    'where.mean.neq'?: number;
    'where.mean.gt'?: number;
    'where.mean.gte'?: number;
    'where.mean.lt'?: number;
    'where.mean.lte'?: number;
    'where.mean.like'?: number;
    'where.mean.ilike'?: number;
    'where.mean.in'?: string;
    'where.mean.nin'?: string;
    'where.mean.contains'?: string;
    'where.mean.contained'?: string;
    'where.mean.overlaps'?: string;
    'where.serviceFrom.eq'?: string;
    'where.serviceFrom.neq'?: string;
    'where.serviceFrom.gt'?: string;
    'where.serviceFrom.gte'?: string;
    'where.serviceFrom.lt'?: string;
    'where.serviceFrom.lte'?: string;
    'where.serviceFrom.like'?: string;
    'where.serviceFrom.ilike'?: string;
    'where.serviceFrom.in'?: string;
    'where.serviceFrom.nin'?: string;
    'where.serviceFrom.contains'?: string;
    'where.serviceFrom.contained'?: string;
    'where.serviceFrom.overlaps'?: string;
    'where.serviceTo.eq'?: string;
    'where.serviceTo.neq'?: string;
    'where.serviceTo.gt'?: string;
    'where.serviceTo.gte'?: string;
    'where.serviceTo.lt'?: string;
    'where.serviceTo.lte'?: string;
    'where.serviceTo.like'?: string;
    'where.serviceTo.ilike'?: string;
    'where.serviceTo.in'?: string;
    'where.serviceTo.nin'?: string;
    'where.serviceTo.contains'?: string;
    'where.serviceTo.contained'?: string;
    'where.serviceTo.overlaps'?: string;
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
    'orderby.count'?: 'asc' | 'desc';
    'orderby.dumpedAt'?: 'asc' | 'desc';
    'orderby.exportedAt'?: 'asc' | 'desc';
    'orderby.importedAt'?: 'asc' | 'desc';
    'orderby.mean'?: 'asc' | 'desc';
    'orderby.serviceFrom'?: 'asc' | 'desc';
    'orderby.serviceTo'?: 'asc' | 'desc';
    'orderby.taxonomyId'?: 'asc' | 'desc';
  }

  export type GetLatenciesResponseOK = Array<{ 'taxonomyId'?: string | null; 'serviceFrom'?: string | null; 'serviceTo'?: string | null; 'mean'?: number | null; 'count'?: number | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }>
  export type GetLatenciesResponses =
    GetLatenciesResponseOK

  export type CreateLatencyRequest = {
    'taxonomyId'?: string | null;
    'serviceFrom'?: string | null;
    'serviceTo': string;
    'mean': number;
    'count': number;
    'dumpedAt': string;
    'exportedAt'?: string | null;
    'importedAt'?: string | null;
  }

  export type CreateLatencyResponseOK = { 'taxonomyId'?: string | null; 'serviceFrom'?: string | null; 'serviceTo'?: string | null; 'mean'?: number | null; 'count'?: number | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type CreateLatencyResponses =
    CreateLatencyResponseOK

  export type UpdateLatenciesRequest = {
    'fields'?: Array<'count' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'mean' | 'serviceFrom' | 'serviceTo' | 'taxonomyId'>;
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
    'where.dumpedAt.eq'?: string;
    'where.dumpedAt.neq'?: string;
    'where.dumpedAt.gt'?: string;
    'where.dumpedAt.gte'?: string;
    'where.dumpedAt.lt'?: string;
    'where.dumpedAt.lte'?: string;
    'where.dumpedAt.like'?: string;
    'where.dumpedAt.ilike'?: string;
    'where.dumpedAt.in'?: string;
    'where.dumpedAt.nin'?: string;
    'where.dumpedAt.contains'?: string;
    'where.dumpedAt.contained'?: string;
    'where.dumpedAt.overlaps'?: string;
    'where.exportedAt.eq'?: string;
    'where.exportedAt.neq'?: string;
    'where.exportedAt.gt'?: string;
    'where.exportedAt.gte'?: string;
    'where.exportedAt.lt'?: string;
    'where.exportedAt.lte'?: string;
    'where.exportedAt.like'?: string;
    'where.exportedAt.ilike'?: string;
    'where.exportedAt.in'?: string;
    'where.exportedAt.nin'?: string;
    'where.exportedAt.contains'?: string;
    'where.exportedAt.contained'?: string;
    'where.exportedAt.overlaps'?: string;
    'where.importedAt.eq'?: string;
    'where.importedAt.neq'?: string;
    'where.importedAt.gt'?: string;
    'where.importedAt.gte'?: string;
    'where.importedAt.lt'?: string;
    'where.importedAt.lte'?: string;
    'where.importedAt.like'?: string;
    'where.importedAt.ilike'?: string;
    'where.importedAt.in'?: string;
    'where.importedAt.nin'?: string;
    'where.importedAt.contains'?: string;
    'where.importedAt.contained'?: string;
    'where.importedAt.overlaps'?: string;
    'where.mean.eq'?: number;
    'where.mean.neq'?: number;
    'where.mean.gt'?: number;
    'where.mean.gte'?: number;
    'where.mean.lt'?: number;
    'where.mean.lte'?: number;
    'where.mean.like'?: number;
    'where.mean.ilike'?: number;
    'where.mean.in'?: string;
    'where.mean.nin'?: string;
    'where.mean.contains'?: string;
    'where.mean.contained'?: string;
    'where.mean.overlaps'?: string;
    'where.serviceFrom.eq'?: string;
    'where.serviceFrom.neq'?: string;
    'where.serviceFrom.gt'?: string;
    'where.serviceFrom.gte'?: string;
    'where.serviceFrom.lt'?: string;
    'where.serviceFrom.lte'?: string;
    'where.serviceFrom.like'?: string;
    'where.serviceFrom.ilike'?: string;
    'where.serviceFrom.in'?: string;
    'where.serviceFrom.nin'?: string;
    'where.serviceFrom.contains'?: string;
    'where.serviceFrom.contained'?: string;
    'where.serviceFrom.overlaps'?: string;
    'where.serviceTo.eq'?: string;
    'where.serviceTo.neq'?: string;
    'where.serviceTo.gt'?: string;
    'where.serviceTo.gte'?: string;
    'where.serviceTo.lt'?: string;
    'where.serviceTo.lte'?: string;
    'where.serviceTo.like'?: string;
    'where.serviceTo.ilike'?: string;
    'where.serviceTo.in'?: string;
    'where.serviceTo.nin'?: string;
    'where.serviceTo.contains'?: string;
    'where.serviceTo.contained'?: string;
    'where.serviceTo.overlaps'?: string;
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
    'taxonomyId'?: string | null;
    'serviceFrom'?: string | null;
    'serviceTo': string;
    'mean': number;
    'count': number;
    'dumpedAt': string;
    'exportedAt'?: string | null;
    'importedAt'?: string | null;
  }

  export type UpdateLatenciesResponseOK = Array<{ 'taxonomyId'?: string | null; 'serviceFrom'?: string | null; 'serviceTo'?: string | null; 'mean'?: number | null; 'count'?: number | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }>
  export type UpdateLatenciesResponses =
    UpdateLatenciesResponseOK

  export type GetLatencyByServiceFromRequest = {
    'fields'?: Array<'count' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'mean' | 'serviceFrom' | 'serviceTo' | 'taxonomyId'>;
    'serviceFrom': string;
  }

  export type GetLatencyByServiceFromResponseOK = { 'taxonomyId'?: string | null; 'serviceFrom'?: string | null; 'serviceTo'?: string | null; 'mean'?: number | null; 'count'?: number | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type GetLatencyByServiceFromResponses =
    GetLatencyByServiceFromResponseOK

  export type UpdateLatencyRequest = {
    'fields'?: Array<'count' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'mean' | 'serviceFrom' | 'serviceTo' | 'taxonomyId'>;
    'serviceFrom': string;
    'taxonomyId'?: string | null;
    'serviceTo': string;
    'mean': number;
    'count': number;
    'dumpedAt': string;
    'exportedAt'?: string | null;
    'importedAt'?: string | null;
  }

  export type UpdateLatencyResponseOK = { 'taxonomyId'?: string | null; 'serviceFrom'?: string | null; 'serviceTo'?: string | null; 'mean'?: number | null; 'count'?: number | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type UpdateLatencyResponses =
    UpdateLatencyResponseOK

  export type DeleteLatenciesRequest = {
    'fields'?: Array<'count' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'mean' | 'serviceFrom' | 'serviceTo' | 'taxonomyId'>;
    'serviceFrom': string;
  }

  export type DeleteLatenciesResponseOK = { 'taxonomyId'?: string | null; 'serviceFrom'?: string | null; 'serviceTo'?: string | null; 'mean'?: number | null; 'count'?: number | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type DeleteLatenciesResponses =
    DeleteLatenciesResponseOK

  export type GetPathsRequest = {
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    'fields'?: Array<'counter' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'path' | 'taxonomyId'>;
    'where.counter.eq'?: number;
    'where.counter.neq'?: number;
    'where.counter.gt'?: number;
    'where.counter.gte'?: number;
    'where.counter.lt'?: number;
    'where.counter.lte'?: number;
    'where.counter.like'?: number;
    'where.counter.ilike'?: number;
    'where.counter.in'?: string;
    'where.counter.nin'?: string;
    'where.counter.contains'?: string;
    'where.counter.contained'?: string;
    'where.counter.overlaps'?: string;
    'where.dumpedAt.eq'?: string;
    'where.dumpedAt.neq'?: string;
    'where.dumpedAt.gt'?: string;
    'where.dumpedAt.gte'?: string;
    'where.dumpedAt.lt'?: string;
    'where.dumpedAt.lte'?: string;
    'where.dumpedAt.like'?: string;
    'where.dumpedAt.ilike'?: string;
    'where.dumpedAt.in'?: string;
    'where.dumpedAt.nin'?: string;
    'where.dumpedAt.contains'?: string;
    'where.dumpedAt.contained'?: string;
    'where.dumpedAt.overlaps'?: string;
    'where.exportedAt.eq'?: string;
    'where.exportedAt.neq'?: string;
    'where.exportedAt.gt'?: string;
    'where.exportedAt.gte'?: string;
    'where.exportedAt.lt'?: string;
    'where.exportedAt.lte'?: string;
    'where.exportedAt.like'?: string;
    'where.exportedAt.ilike'?: string;
    'where.exportedAt.in'?: string;
    'where.exportedAt.nin'?: string;
    'where.exportedAt.contains'?: string;
    'where.exportedAt.contained'?: string;
    'where.exportedAt.overlaps'?: string;
    'where.importedAt.eq'?: string;
    'where.importedAt.neq'?: string;
    'where.importedAt.gt'?: string;
    'where.importedAt.gte'?: string;
    'where.importedAt.lt'?: string;
    'where.importedAt.lte'?: string;
    'where.importedAt.like'?: string;
    'where.importedAt.ilike'?: string;
    'where.importedAt.in'?: string;
    'where.importedAt.nin'?: string;
    'where.importedAt.contains'?: string;
    'where.importedAt.contained'?: string;
    'where.importedAt.overlaps'?: string;
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
    'orderby.counter'?: 'asc' | 'desc';
    'orderby.dumpedAt'?: 'asc' | 'desc';
    'orderby.exportedAt'?: 'asc' | 'desc';
    'orderby.importedAt'?: 'asc' | 'desc';
    'orderby.path'?: 'asc' | 'desc';
    'orderby.taxonomyId'?: 'asc' | 'desc';
  }

  export type GetPathsResponseOK = Array<{ 'path'?: string | null; 'dumpedAt'?: string | null; 'counter'?: number | null; 'taxonomyId'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }>
  export type GetPathsResponses =
    GetPathsResponseOK

  export type CreatePathRequest = {
    'path'?: string;
    'dumpedAt': string;
    'counter': number;
    'taxonomyId'?: string | null;
    'exportedAt'?: string | null;
    'importedAt'?: string | null;
  }

  export type CreatePathResponseOK = { 'path'?: string | null; 'dumpedAt'?: string | null; 'counter'?: number | null; 'taxonomyId'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type CreatePathResponses =
    CreatePathResponseOK

  export type UpdatePathsRequest = {
    'fields'?: Array<'counter' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'path' | 'taxonomyId'>;
    'where.counter.eq'?: number;
    'where.counter.neq'?: number;
    'where.counter.gt'?: number;
    'where.counter.gte'?: number;
    'where.counter.lt'?: number;
    'where.counter.lte'?: number;
    'where.counter.like'?: number;
    'where.counter.ilike'?: number;
    'where.counter.in'?: string;
    'where.counter.nin'?: string;
    'where.counter.contains'?: string;
    'where.counter.contained'?: string;
    'where.counter.overlaps'?: string;
    'where.dumpedAt.eq'?: string;
    'where.dumpedAt.neq'?: string;
    'where.dumpedAt.gt'?: string;
    'where.dumpedAt.gte'?: string;
    'where.dumpedAt.lt'?: string;
    'where.dumpedAt.lte'?: string;
    'where.dumpedAt.like'?: string;
    'where.dumpedAt.ilike'?: string;
    'where.dumpedAt.in'?: string;
    'where.dumpedAt.nin'?: string;
    'where.dumpedAt.contains'?: string;
    'where.dumpedAt.contained'?: string;
    'where.dumpedAt.overlaps'?: string;
    'where.exportedAt.eq'?: string;
    'where.exportedAt.neq'?: string;
    'where.exportedAt.gt'?: string;
    'where.exportedAt.gte'?: string;
    'where.exportedAt.lt'?: string;
    'where.exportedAt.lte'?: string;
    'where.exportedAt.like'?: string;
    'where.exportedAt.ilike'?: string;
    'where.exportedAt.in'?: string;
    'where.exportedAt.nin'?: string;
    'where.exportedAt.contains'?: string;
    'where.exportedAt.contained'?: string;
    'where.exportedAt.overlaps'?: string;
    'where.importedAt.eq'?: string;
    'where.importedAt.neq'?: string;
    'where.importedAt.gt'?: string;
    'where.importedAt.gte'?: string;
    'where.importedAt.lt'?: string;
    'where.importedAt.lte'?: string;
    'where.importedAt.like'?: string;
    'where.importedAt.ilike'?: string;
    'where.importedAt.in'?: string;
    'where.importedAt.nin'?: string;
    'where.importedAt.contains'?: string;
    'where.importedAt.contained'?: string;
    'where.importedAt.overlaps'?: string;
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
    'path'?: string;
    'dumpedAt': string;
    'counter': number;
    'taxonomyId'?: string | null;
    'exportedAt'?: string | null;
    'importedAt'?: string | null;
  }

  export type UpdatePathsResponseOK = Array<{ 'path'?: string | null; 'dumpedAt'?: string | null; 'counter'?: number | null; 'taxonomyId'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }>
  export type UpdatePathsResponses =
    UpdatePathsResponseOK

  export type GetPathByPathRequest = {
    'fields'?: Array<'counter' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'path' | 'taxonomyId'>;
    'path': string;
  }

  export type GetPathByPathResponseOK = { 'path'?: string | null; 'dumpedAt'?: string | null; 'counter'?: number | null; 'taxonomyId'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type GetPathByPathResponses =
    GetPathByPathResponseOK

  export type UpdatePathRequest = {
    'fields'?: Array<'counter' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'path' | 'taxonomyId'>;
    'path': string;
    'dumpedAt': string;
    'counter': number;
    'taxonomyId'?: string | null;
    'exportedAt'?: string | null;
    'importedAt'?: string | null;
  }

  export type UpdatePathResponseOK = { 'path'?: string | null; 'dumpedAt'?: string | null; 'counter'?: number | null; 'taxonomyId'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type UpdatePathResponses =
    UpdatePathResponseOK

  export type DeletePathsRequest = {
    'fields'?: Array<'counter' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'path' | 'taxonomyId'>;
    'path': string;
  }

  export type DeletePathsResponseOK = { 'path'?: string | null; 'dumpedAt'?: string | null; 'counter'?: number | null; 'taxonomyId'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type DeletePathsResponses =
    DeletePathsResponseOK

  export type GetPathsWindowRequest = {
    'days'?: number;
    'taxonomyId'?: string;
  }

  export type GetPathsWindowResponseOK = {
    'type': unknown;
  }
  export type GetPathsWindowResponses =
    GetPathsWindowResponseOK

  export type PostPathsDumpRequest = {
    'dump': Array<{ 'path'?: string; 'taxonomyId'?: unknown; 'counter'?: number }>;
  }

  export type PostPathsDumpResponseOK = unknown
  export type PostPathsDumpResponses =
    FullResponse<PostPathsDumpResponseOK, 200>

  export type GetDbWindowRequest = {
    'days'?: number;
    'taxonomyId'?: string;
  }

  export type GetDbWindowResponseOK = Array<{ 'dbId'?: string; 'columns'?: Array<string>; 'targetTable'?: string; 'tables'?: Array<string>; 'queryType'?: string; 'dbName'?: string; 'host'?: string; 'port'?: number; 'dbSystem'?: string; 'paths'?: Array<string>; 'taxonomyId'?: unknown }>
  export type GetDbWindowResponses =
    GetDbWindowResponseOK

  export type PostDbDumpRequest = {
    'dump': Array<{ 'dbId'?: string; 'columns'?: Array<string>; 'targetTable'?: string; 'tables'?: Array<string>; 'queryType'?: string; 'dbName'?: string; 'host'?: string; 'port'?: number; 'dbSystem'?: string; 'paths'?: Array<string>; 'taxonomyId'?: unknown }>;
  }

  export type PostDbDumpResponseOK = unknown
  export type PostDbDumpResponses =
    FullResponse<PostDbDumpResponseOK, 200>

  export type GetLatenciesWindowRequest = {
    'days'?: number;
    'taxonomyId'?: string;
  }

  export type GetLatenciesWindowResponseOK = Array<{ 'from'?: string; 'to'?: string; 'count'?: number; 'mean'?: number; 'taxonomyId'?: unknown }>
  export type GetLatenciesWindowResponses =
    GetLatenciesWindowResponseOK

  export type PostLatenciesDumpRequest = {
    'dump': Array<{ 'taxonomyId'?: unknown; 'from'?: string; 'to'?: string; 'mean'?: number; 'count'?: number }>;
  }

  export type PostLatenciesDumpResponseOK = unknown
  export type PostLatenciesDumpResponses =
    FullResponse<PostLatenciesDumpResponseOK, 200>

}

type ColdStoragePlugin = FastifyPluginAsync<NonNullable<coldStorage.ColdStorageOptions>>

declare module 'fastify' {
  interface ConfigureColdStorage {
    getHeaders(req: FastifyRequest, reply: FastifyReply, options: GetHeadersOptions): Promise<Record<string, string>>;
  }
  interface FastifyInstance {
    configureColdStorage(opts: ConfigureColdStorage): unknown
  }

  interface FastifyRequest {
    'coldStorage': coldStorage.ColdStorage;
  }
}

declare function coldStorage(...params: Parameters<ColdStoragePlugin>): ReturnType<ColdStoragePlugin>;
export = coldStorage;
