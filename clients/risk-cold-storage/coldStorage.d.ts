import { type FastifyReply, type FastifyPluginAsync } from 'fastify'
import { type GetHeadersOptions, type StatusCode1xx, type StatusCode2xx, type StatusCode3xx, type StatusCode4xx, type StatusCode5xx } from '@platformatic/client'
import { type FormData } from 'undici'

declare namespace coldStorage {
  export type ColdStorage = {
    /**
     * Get dbOperations.
     *
     * Fetch dbOperations from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getDbOperations(req: GetDbOperationsRequest): Promise<GetDbOperationsResponses>;
    /**
     * Create dbOperation.
     *
     * Add new dbOperation to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createDbOperation(req: CreateDbOperationRequest): Promise<CreateDbOperationResponses>;
    /**
     * Update dbOperations.
     *
     * Update one or more dbOperations in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateDbOperations(req: UpdateDbOperationsRequest): Promise<UpdateDbOperationsResponses>;
    /**
     * Get DbOperation by dbId.
     *
     * Fetch DbOperation using its dbId from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getDbOperationByDbId(req: GetDbOperationByDbIdRequest): Promise<GetDbOperationByDbIdResponses>;
    /**
     * Update dbOperation.
     *
     * Update dbOperation in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateDbOperation(req: UpdateDbOperationRequest): Promise<UpdateDbOperationResponses>;
    /**
     * Delete dbOperations.
     *
     * Delete one or more dbOperations from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteDbOperations(req: DeleteDbOperationsRequest): Promise<DeleteDbOperationsResponses>;
    /**
     * Get latencies.
     *
     * Fetch latencies from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getLatencies(req: GetLatenciesRequest): Promise<GetLatenciesResponses>;
    /**
     * Create latency.
     *
     * Add new latency to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createLatency(req: CreateLatencyRequest): Promise<CreateLatencyResponses>;
    /**
     * Update latencies.
     *
     * Update one or more latencies in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateLatencies(req: UpdateLatenciesRequest): Promise<UpdateLatenciesResponses>;
    /**
     * Get Latency by serviceFrom.
     *
     * Fetch Latency using its serviceFrom from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getLatencyByServiceFrom(req: GetLatencyByServiceFromRequest): Promise<GetLatencyByServiceFromResponses>;
    /**
     * Update latency.
     *
     * Update latency in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateLatency(req: UpdateLatencyRequest): Promise<UpdateLatencyResponses>;
    /**
     * Delete latencies.
     *
     * Delete one or more latencies from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteLatencies(req: DeleteLatenciesRequest): Promise<DeleteLatenciesResponses>;
    /**
     * Get calculations.
     *
     * Fetch calculations from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getCalculations(req: GetCalculationsRequest): Promise<GetCalculationsResponses>;
    /**
     * Create calculation.
     *
     * Add new calculation to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createCalculation(req: CreateCalculationRequest): Promise<CreateCalculationResponses>;
    /**
     * Update calculations.
     *
     * Update one or more calculations in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateCalculations(req: UpdateCalculationsRequest): Promise<UpdateCalculationsResponses>;
    /**
     * Get Calculation by id.
     *
     * Fetch Calculation using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getCalculationById(req: GetCalculationByIdRequest): Promise<GetCalculationByIdResponses>;
    /**
     * Update calculation.
     *
     * Update calculation in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateCalculation(req: UpdateCalculationRequest): Promise<UpdateCalculationResponses>;
    /**
     * Delete calculations.
     *
     * Delete one or more calculations from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteCalculations(req: DeleteCalculationsRequest): Promise<DeleteCalculationsResponses>;
    /**
     * Get importsExports.
     *
     * Fetch importsExports from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getImportsExports(req: GetImportsExportsRequest): Promise<GetImportsExportsResponses>;
    /**
     * Create importsExport.
     *
     * Add new importsExport to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createImportsExport(req: CreateImportsExportRequest): Promise<CreateImportsExportResponses>;
    /**
     * Update importsExports.
     *
     * Update one or more importsExports in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateImportsExports(req: UpdateImportsExportsRequest): Promise<UpdateImportsExportsResponses>;
    /**
     * Get ImportsExport by id.
     *
     * Fetch ImportsExport using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getImportsExportById(req: GetImportsExportByIdRequest): Promise<GetImportsExportByIdResponses>;
    /**
     * Update importsExport.
     *
     * Update importsExport in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateImportsExport(req: UpdateImportsExportRequest): Promise<UpdateImportsExportResponses>;
    /**
     * Delete importsExports.
     *
     * Delete one or more importsExports from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteImportsExports(req: DeleteImportsExportsRequest): Promise<DeleteImportsExportsResponses>;
    /**
     * Get paths.
     *
     * Fetch paths from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getPaths(req: GetPathsRequest): Promise<GetPathsResponses>;
    /**
     * Create path.
     *
     * Add new path to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createPath(req: CreatePathRequest): Promise<CreatePathResponses>;
    /**
     * Update paths.
     *
     * Update one or more paths in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updatePaths(req: UpdatePathsRequest): Promise<UpdatePathsResponses>;
    /**
     * Get Path by path.
     *
     * Fetch Path using its path from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getPathByPath(req: GetPathByPathRequest): Promise<GetPathByPathResponses>;
    /**
     * Update path.
     *
     * Update path in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updatePath(req: UpdatePathRequest): Promise<UpdatePathResponses>;
    /**
     * Delete paths.
     *
     * Delete one or more paths from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deletePaths(req: DeletePathsRequest): Promise<DeletePathsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getDbWindow(req: GetDbWindowRequest): Promise<GetDbWindowResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postDbDump(req: PostDbDumpRequest): Promise<PostDbDumpResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getDownloadFile(req: GetDownloadFileRequest): Promise<GetDownloadFileResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getLatenciesWindow(req: GetLatenciesWindowRequest): Promise<GetLatenciesWindowResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postLatenciesDump(req: PostLatenciesDumpRequest): Promise<PostLatenciesDumpResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getPathsWindow(req: GetPathsWindowRequest): Promise<GetPathsWindowResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postPathsDump(req: PostPathsDumpRequest): Promise<PostPathsDumpResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getStatus(req: GetStatusRequest): Promise<GetStatusResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getSync(req: GetSyncRequest): Promise<GetSyncResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getSyncAvailable(req: GetSyncAvailableRequest): Promise<GetSyncAvailableResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getSyncLatest(req: GetSyncLatestRequest): Promise<GetSyncLatestResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getSyncConfig(req: GetSyncConfigRequest): Promise<GetSyncConfigResponses>;
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

  export type GetDbOperationsRequest = {
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
    'fields'?: Array<'columns' | 'dbId' | 'dbName' | 'dbSystem' | 'dumpedAt' | 'exportedAt' | 'host' | 'importedAt' | 'paths' | 'port' | 'queryType' | 'tables' | 'targetTable'>;
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
    'where.or'?: Array<string>;
    'orderby.dbId'?: 'asc' | 'desc';
    'orderby.dbName'?: 'asc' | 'desc';
    'orderby.dbSystem'?: 'asc' | 'desc';
    'orderby.dumpedAt'?: 'asc' | 'desc';
    'orderby.exportedAt'?: 'asc' | 'desc';
    'orderby.host'?: 'asc' | 'desc';
    'orderby.importedAt'?: 'asc' | 'desc';
    'orderby.port'?: 'asc' | 'desc';
    'orderby.queryType'?: 'asc' | 'desc';
    'orderby.targetTable'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetDbOperationsResponseOK = Array<{ 'dbId'?: string | null; 'dbSystem'?: string | null; 'dbName'?: string | null; 'host'?: string | null; 'port'?: number | null; 'tables'?: Array<string> | null; 'columns'?: Array<string> | null; 'queryType'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | null; 'targetTable'?: string | null; 'paths'?: Array<string> | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }>
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
    'dumpedAt': string;
    'exportedAt'?: string | null;
    'importedAt'?: string | null;
  }

  /**
   * A DbOperation
   */
  export type CreateDbOperationResponseOK = { 'dbId'?: string | null; 'dbSystem'?: string | null; 'dbName'?: string | null; 'host'?: string | null; 'port'?: number | null; 'tables'?: Array<string> | null; 'columns'?: Array<string> | null; 'queryType'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | null; 'targetTable'?: string | null; 'paths'?: Array<string> | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type CreateDbOperationResponses =
    CreateDbOperationResponseOK

  export type UpdateDbOperationsRequest = {
    'fields'?: Array<'columns' | 'dbId' | 'dbName' | 'dbSystem' | 'dumpedAt' | 'exportedAt' | 'host' | 'importedAt' | 'paths' | 'port' | 'queryType' | 'tables' | 'targetTable'>;
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
    'dumpedAt': string;
    'exportedAt'?: string | null;
    'importedAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateDbOperationsResponseOK = Array<{ 'dbId'?: string | null; 'dbSystem'?: string | null; 'dbName'?: string | null; 'host'?: string | null; 'port'?: number | null; 'tables'?: Array<string> | null; 'columns'?: Array<string> | null; 'queryType'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | null; 'targetTable'?: string | null; 'paths'?: Array<string> | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }>
  export type UpdateDbOperationsResponses =
    UpdateDbOperationsResponseOK

  export type GetDbOperationByDbIdRequest = {
    'fields'?: Array<'columns' | 'dbId' | 'dbName' | 'dbSystem' | 'dumpedAt' | 'exportedAt' | 'host' | 'importedAt' | 'paths' | 'port' | 'queryType' | 'tables' | 'targetTable'>;
    'dbId': string;
  }

  /**
   * A DbOperation
   */
  export type GetDbOperationByDbIdResponseOK = { 'dbId'?: string | null; 'dbSystem'?: string | null; 'dbName'?: string | null; 'host'?: string | null; 'port'?: number | null; 'tables'?: Array<string> | null; 'columns'?: Array<string> | null; 'queryType'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | null; 'targetTable'?: string | null; 'paths'?: Array<string> | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type GetDbOperationByDbIdResponses =
    GetDbOperationByDbIdResponseOK

  export type UpdateDbOperationRequest = {
    'fields'?: Array<'columns' | 'dbId' | 'dbName' | 'dbSystem' | 'dumpedAt' | 'exportedAt' | 'host' | 'importedAt' | 'paths' | 'port' | 'queryType' | 'tables' | 'targetTable'>;
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
    'dumpedAt': string;
    'exportedAt'?: string | null;
    'importedAt'?: string | null;
  }

  /**
   * A DbOperation
   */
  export type UpdateDbOperationResponseOK = { 'dbId'?: string | null; 'dbSystem'?: string | null; 'dbName'?: string | null; 'host'?: string | null; 'port'?: number | null; 'tables'?: Array<string> | null; 'columns'?: Array<string> | null; 'queryType'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | null; 'targetTable'?: string | null; 'paths'?: Array<string> | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type UpdateDbOperationResponses =
    UpdateDbOperationResponseOK

  export type DeleteDbOperationsRequest = {
    'fields'?: Array<'columns' | 'dbId' | 'dbName' | 'dbSystem' | 'dumpedAt' | 'exportedAt' | 'host' | 'importedAt' | 'paths' | 'port' | 'queryType' | 'tables' | 'targetTable'>;
    'dbId': string;
  }

  /**
   * A DbOperation
   */
  export type DeleteDbOperationsResponseOK = { 'dbId'?: string | null; 'dbSystem'?: string | null; 'dbName'?: string | null; 'host'?: string | null; 'port'?: number | null; 'tables'?: Array<string> | null; 'columns'?: Array<string> | null; 'queryType'?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | null; 'targetTable'?: string | null; 'paths'?: Array<string> | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type DeleteDbOperationsResponses =
    DeleteDbOperationsResponseOK

  export type GetLatenciesRequest = {
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
    'fields'?: Array<'count' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'mean' | 'serviceFrom' | 'serviceTo'>;
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
    'where.or'?: Array<string>;
    'orderby.count'?: 'asc' | 'desc';
    'orderby.dumpedAt'?: 'asc' | 'desc';
    'orderby.exportedAt'?: 'asc' | 'desc';
    'orderby.importedAt'?: 'asc' | 'desc';
    'orderby.mean'?: 'asc' | 'desc';
    'orderby.serviceFrom'?: 'asc' | 'desc';
    'orderby.serviceTo'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetLatenciesResponseOK = Array<{ 'serviceFrom'?: string | null; 'serviceTo'?: string | null; 'mean'?: number | null; 'count'?: number | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }>
  export type GetLatenciesResponses =
    GetLatenciesResponseOK

  export type CreateLatencyRequest = {
    'serviceFrom'?: string | null;
    'serviceTo': string;
    'mean': number;
    'count': number;
    'dumpedAt': string;
    'exportedAt'?: string | null;
    'importedAt'?: string | null;
  }

  /**
   * A Latency
   */
  export type CreateLatencyResponseOK = { 'serviceFrom'?: string | null; 'serviceTo'?: string | null; 'mean'?: number | null; 'count'?: number | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type CreateLatencyResponses =
    CreateLatencyResponseOK

  export type UpdateLatenciesRequest = {
    'fields'?: Array<'count' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'mean' | 'serviceFrom' | 'serviceTo'>;
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
    'where.or'?: Array<string>;
    'serviceFrom'?: string | null;
    'serviceTo': string;
    'mean': number;
    'count': number;
    'dumpedAt': string;
    'exportedAt'?: string | null;
    'importedAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateLatenciesResponseOK = Array<{ 'serviceFrom'?: string | null; 'serviceTo'?: string | null; 'mean'?: number | null; 'count'?: number | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }>
  export type UpdateLatenciesResponses =
    UpdateLatenciesResponseOK

  export type GetLatencyByServiceFromRequest = {
    'fields'?: Array<'count' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'mean' | 'serviceFrom' | 'serviceTo'>;
    'serviceFrom': string;
  }

  /**
   * A Latency
   */
  export type GetLatencyByServiceFromResponseOK = { 'serviceFrom'?: string | null; 'serviceTo'?: string | null; 'mean'?: number | null; 'count'?: number | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type GetLatencyByServiceFromResponses =
    GetLatencyByServiceFromResponseOK

  export type UpdateLatencyRequest = {
    'fields'?: Array<'count' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'mean' | 'serviceFrom' | 'serviceTo'>;
    'serviceFrom': string;
    'serviceTo': string;
    'mean': number;
    'count': number;
    'dumpedAt': string;
    'exportedAt'?: string | null;
    'importedAt'?: string | null;
  }

  /**
   * A Latency
   */
  export type UpdateLatencyResponseOK = { 'serviceFrom'?: string | null; 'serviceTo'?: string | null; 'mean'?: number | null; 'count'?: number | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type UpdateLatencyResponses =
    UpdateLatencyResponseOK

  export type DeleteLatenciesRequest = {
    'fields'?: Array<'count' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'mean' | 'serviceFrom' | 'serviceTo'>;
    'serviceFrom': string;
  }

  /**
   * A Latency
   */
  export type DeleteLatenciesResponseOK = { 'serviceFrom'?: string | null; 'serviceTo'?: string | null; 'mean'?: number | null; 'count'?: number | null; 'dumpedAt'?: string | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type DeleteLatenciesResponses =
    DeleteLatenciesResponseOK

  export type GetCalculationsRequest = {
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

  /**
   * Default Response
   */
  export type GetCalculationsResponseOK = Array<{ 'id'?: string | null; 'request'?: object | null; 'response'?: object | null; 'createdAt'?: string | null }>
  export type GetCalculationsResponses =
    GetCalculationsResponseOK

  export type CreateCalculationRequest = {
    'id'?: string;
    'request': object;
    'response': object;
    'createdAt'?: string | null;
  }

  /**
   * A Calculation
   */
  export type CreateCalculationResponseOK = { 'id'?: string | null; 'request'?: object | null; 'response'?: object | null; 'createdAt'?: string | null }
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

  /**
   * Default Response
   */
  export type UpdateCalculationsResponseOK = Array<{ 'id'?: string | null; 'request'?: object | null; 'response'?: object | null; 'createdAt'?: string | null }>
  export type UpdateCalculationsResponses =
    UpdateCalculationsResponseOK

  export type GetCalculationByIdRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'request' | 'response'>;
    'id': string;
  }

  /**
   * A Calculation
   */
  export type GetCalculationByIdResponseOK = { 'id'?: string | null; 'request'?: object | null; 'response'?: object | null; 'createdAt'?: string | null }
  export type GetCalculationByIdResponses =
    GetCalculationByIdResponseOK

  export type UpdateCalculationRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'request' | 'response'>;
    'id': string;
    'request': object;
    'response': object;
    'createdAt'?: string | null;
  }

  /**
   * A Calculation
   */
  export type UpdateCalculationResponseOK = { 'id'?: string | null; 'request'?: object | null; 'response'?: object | null; 'createdAt'?: string | null }
  export type UpdateCalculationResponses =
    UpdateCalculationResponseOK

  export type DeleteCalculationsRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'request' | 'response'>;
    'id': string;
  }

  /**
   * A Calculation
   */
  export type DeleteCalculationsResponseOK = { 'id'?: string | null; 'request'?: object | null; 'response'?: object | null; 'createdAt'?: string | null }
  export type DeleteCalculationsResponses =
    DeleteCalculationsResponseOK

  export type GetImportsExportsRequest = {
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
    'fields'?: Array<'discarded' | 'fileName' | 'fileSize' | 'hmac' | 'id' | 'importAttempts' | 'isExport' | 'latestDataAcquiredAt' | 'logs' | 'success' | 'synchedAt'>;
    'where.discarded.eq'?: boolean;
    'where.discarded.neq'?: boolean;
    'where.discarded.gt'?: boolean;
    'where.discarded.gte'?: boolean;
    'where.discarded.lt'?: boolean;
    'where.discarded.lte'?: boolean;
    'where.discarded.like'?: boolean;
    'where.discarded.ilike'?: boolean;
    'where.discarded.in'?: string;
    'where.discarded.nin'?: string;
    'where.discarded.contains'?: string;
    'where.discarded.contained'?: string;
    'where.discarded.overlaps'?: string;
    'where.fileName.eq'?: string;
    'where.fileName.neq'?: string;
    'where.fileName.gt'?: string;
    'where.fileName.gte'?: string;
    'where.fileName.lt'?: string;
    'where.fileName.lte'?: string;
    'where.fileName.like'?: string;
    'where.fileName.ilike'?: string;
    'where.fileName.in'?: string;
    'where.fileName.nin'?: string;
    'where.fileName.contains'?: string;
    'where.fileName.contained'?: string;
    'where.fileName.overlaps'?: string;
    'where.fileSize.eq'?: number;
    'where.fileSize.neq'?: number;
    'where.fileSize.gt'?: number;
    'where.fileSize.gte'?: number;
    'where.fileSize.lt'?: number;
    'where.fileSize.lte'?: number;
    'where.fileSize.like'?: number;
    'where.fileSize.ilike'?: number;
    'where.fileSize.in'?: string;
    'where.fileSize.nin'?: string;
    'where.fileSize.contains'?: string;
    'where.fileSize.contained'?: string;
    'where.fileSize.overlaps'?: string;
    'where.hmac.eq'?: string;
    'where.hmac.neq'?: string;
    'where.hmac.gt'?: string;
    'where.hmac.gte'?: string;
    'where.hmac.lt'?: string;
    'where.hmac.lte'?: string;
    'where.hmac.like'?: string;
    'where.hmac.ilike'?: string;
    'where.hmac.in'?: string;
    'where.hmac.nin'?: string;
    'where.hmac.contains'?: string;
    'where.hmac.contained'?: string;
    'where.hmac.overlaps'?: string;
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
    'where.importAttempts.eq'?: number;
    'where.importAttempts.neq'?: number;
    'where.importAttempts.gt'?: number;
    'where.importAttempts.gte'?: number;
    'where.importAttempts.lt'?: number;
    'where.importAttempts.lte'?: number;
    'where.importAttempts.like'?: number;
    'where.importAttempts.ilike'?: number;
    'where.importAttempts.in'?: string;
    'where.importAttempts.nin'?: string;
    'where.importAttempts.contains'?: string;
    'where.importAttempts.contained'?: string;
    'where.importAttempts.overlaps'?: string;
    'where.isExport.eq'?: boolean;
    'where.isExport.neq'?: boolean;
    'where.isExport.gt'?: boolean;
    'where.isExport.gte'?: boolean;
    'where.isExport.lt'?: boolean;
    'where.isExport.lte'?: boolean;
    'where.isExport.like'?: boolean;
    'where.isExport.ilike'?: boolean;
    'where.isExport.in'?: string;
    'where.isExport.nin'?: string;
    'where.isExport.contains'?: string;
    'where.isExport.contained'?: string;
    'where.isExport.overlaps'?: string;
    'where.latestDataAcquiredAt.eq'?: string;
    'where.latestDataAcquiredAt.neq'?: string;
    'where.latestDataAcquiredAt.gt'?: string;
    'where.latestDataAcquiredAt.gte'?: string;
    'where.latestDataAcquiredAt.lt'?: string;
    'where.latestDataAcquiredAt.lte'?: string;
    'where.latestDataAcquiredAt.like'?: string;
    'where.latestDataAcquiredAt.ilike'?: string;
    'where.latestDataAcquiredAt.in'?: string;
    'where.latestDataAcquiredAt.nin'?: string;
    'where.latestDataAcquiredAt.contains'?: string;
    'where.latestDataAcquiredAt.contained'?: string;
    'where.latestDataAcquiredAt.overlaps'?: string;
    'where.logs.eq'?: string;
    'where.logs.neq'?: string;
    'where.logs.gt'?: string;
    'where.logs.gte'?: string;
    'where.logs.lt'?: string;
    'where.logs.lte'?: string;
    'where.logs.like'?: string;
    'where.logs.ilike'?: string;
    'where.logs.in'?: string;
    'where.logs.nin'?: string;
    'where.logs.contains'?: string;
    'where.logs.contained'?: string;
    'where.logs.overlaps'?: string;
    'where.success.eq'?: boolean;
    'where.success.neq'?: boolean;
    'where.success.gt'?: boolean;
    'where.success.gte'?: boolean;
    'where.success.lt'?: boolean;
    'where.success.lte'?: boolean;
    'where.success.like'?: boolean;
    'where.success.ilike'?: boolean;
    'where.success.in'?: string;
    'where.success.nin'?: string;
    'where.success.contains'?: string;
    'where.success.contained'?: string;
    'where.success.overlaps'?: string;
    'where.synchedAt.eq'?: string;
    'where.synchedAt.neq'?: string;
    'where.synchedAt.gt'?: string;
    'where.synchedAt.gte'?: string;
    'where.synchedAt.lt'?: string;
    'where.synchedAt.lte'?: string;
    'where.synchedAt.like'?: string;
    'where.synchedAt.ilike'?: string;
    'where.synchedAt.in'?: string;
    'where.synchedAt.nin'?: string;
    'where.synchedAt.contains'?: string;
    'where.synchedAt.contained'?: string;
    'where.synchedAt.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.discarded'?: 'asc' | 'desc';
    'orderby.fileName'?: 'asc' | 'desc';
    'orderby.fileSize'?: 'asc' | 'desc';
    'orderby.hmac'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.importAttempts'?: 'asc' | 'desc';
    'orderby.isExport'?: 'asc' | 'desc';
    'orderby.latestDataAcquiredAt'?: 'asc' | 'desc';
    'orderby.logs'?: 'asc' | 'desc';
    'orderby.success'?: 'asc' | 'desc';
    'orderby.synchedAt'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetImportsExportsResponseOK = Array<{ 'id'?: string | null; 'success'?: boolean | null; 'isExport'?: boolean | null; 'synchedAt'?: string | null; 'fileName'?: string | null; 'logs'?: object | null; 'fileSize'?: number | null; 'latestDataAcquiredAt'?: string | null; 'importAttempts'?: number | null; 'discarded'?: boolean | null; 'hmac'?: string | null }>
  export type GetImportsExportsResponses =
    GetImportsExportsResponseOK

  export type CreateImportsExportRequest = {
    'id'?: string;
    'success': boolean;
    'isExport': boolean;
    'synchedAt': string;
    'fileName'?: string | null;
    'logs'?: object | null;
    'fileSize'?: number | null;
    'latestDataAcquiredAt'?: string | null;
    'importAttempts': number;
    'discarded'?: boolean | null;
    'hmac'?: string | null;
  }

  /**
   * A ImportsExport
   */
  export type CreateImportsExportResponseOK = { 'id'?: string | null; 'success'?: boolean | null; 'isExport'?: boolean | null; 'synchedAt'?: string | null; 'fileName'?: string | null; 'logs'?: object | null; 'fileSize'?: number | null; 'latestDataAcquiredAt'?: string | null; 'importAttempts'?: number | null; 'discarded'?: boolean | null; 'hmac'?: string | null }
  export type CreateImportsExportResponses =
    CreateImportsExportResponseOK

  export type UpdateImportsExportsRequest = {
    'fields'?: Array<'discarded' | 'fileName' | 'fileSize' | 'hmac' | 'id' | 'importAttempts' | 'isExport' | 'latestDataAcquiredAt' | 'logs' | 'success' | 'synchedAt'>;
    'where.discarded.eq'?: boolean;
    'where.discarded.neq'?: boolean;
    'where.discarded.gt'?: boolean;
    'where.discarded.gte'?: boolean;
    'where.discarded.lt'?: boolean;
    'where.discarded.lte'?: boolean;
    'where.discarded.like'?: boolean;
    'where.discarded.ilike'?: boolean;
    'where.discarded.in'?: string;
    'where.discarded.nin'?: string;
    'where.discarded.contains'?: string;
    'where.discarded.contained'?: string;
    'where.discarded.overlaps'?: string;
    'where.fileName.eq'?: string;
    'where.fileName.neq'?: string;
    'where.fileName.gt'?: string;
    'where.fileName.gte'?: string;
    'where.fileName.lt'?: string;
    'where.fileName.lte'?: string;
    'where.fileName.like'?: string;
    'where.fileName.ilike'?: string;
    'where.fileName.in'?: string;
    'where.fileName.nin'?: string;
    'where.fileName.contains'?: string;
    'where.fileName.contained'?: string;
    'where.fileName.overlaps'?: string;
    'where.fileSize.eq'?: number;
    'where.fileSize.neq'?: number;
    'where.fileSize.gt'?: number;
    'where.fileSize.gte'?: number;
    'where.fileSize.lt'?: number;
    'where.fileSize.lte'?: number;
    'where.fileSize.like'?: number;
    'where.fileSize.ilike'?: number;
    'where.fileSize.in'?: string;
    'where.fileSize.nin'?: string;
    'where.fileSize.contains'?: string;
    'where.fileSize.contained'?: string;
    'where.fileSize.overlaps'?: string;
    'where.hmac.eq'?: string;
    'where.hmac.neq'?: string;
    'where.hmac.gt'?: string;
    'where.hmac.gte'?: string;
    'where.hmac.lt'?: string;
    'where.hmac.lte'?: string;
    'where.hmac.like'?: string;
    'where.hmac.ilike'?: string;
    'where.hmac.in'?: string;
    'where.hmac.nin'?: string;
    'where.hmac.contains'?: string;
    'where.hmac.contained'?: string;
    'where.hmac.overlaps'?: string;
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
    'where.importAttempts.eq'?: number;
    'where.importAttempts.neq'?: number;
    'where.importAttempts.gt'?: number;
    'where.importAttempts.gte'?: number;
    'where.importAttempts.lt'?: number;
    'where.importAttempts.lte'?: number;
    'where.importAttempts.like'?: number;
    'where.importAttempts.ilike'?: number;
    'where.importAttempts.in'?: string;
    'where.importAttempts.nin'?: string;
    'where.importAttempts.contains'?: string;
    'where.importAttempts.contained'?: string;
    'where.importAttempts.overlaps'?: string;
    'where.isExport.eq'?: boolean;
    'where.isExport.neq'?: boolean;
    'where.isExport.gt'?: boolean;
    'where.isExport.gte'?: boolean;
    'where.isExport.lt'?: boolean;
    'where.isExport.lte'?: boolean;
    'where.isExport.like'?: boolean;
    'where.isExport.ilike'?: boolean;
    'where.isExport.in'?: string;
    'where.isExport.nin'?: string;
    'where.isExport.contains'?: string;
    'where.isExport.contained'?: string;
    'where.isExport.overlaps'?: string;
    'where.latestDataAcquiredAt.eq'?: string;
    'where.latestDataAcquiredAt.neq'?: string;
    'where.latestDataAcquiredAt.gt'?: string;
    'where.latestDataAcquiredAt.gte'?: string;
    'where.latestDataAcquiredAt.lt'?: string;
    'where.latestDataAcquiredAt.lte'?: string;
    'where.latestDataAcquiredAt.like'?: string;
    'where.latestDataAcquiredAt.ilike'?: string;
    'where.latestDataAcquiredAt.in'?: string;
    'where.latestDataAcquiredAt.nin'?: string;
    'where.latestDataAcquiredAt.contains'?: string;
    'where.latestDataAcquiredAt.contained'?: string;
    'where.latestDataAcquiredAt.overlaps'?: string;
    'where.logs.eq'?: string;
    'where.logs.neq'?: string;
    'where.logs.gt'?: string;
    'where.logs.gte'?: string;
    'where.logs.lt'?: string;
    'where.logs.lte'?: string;
    'where.logs.like'?: string;
    'where.logs.ilike'?: string;
    'where.logs.in'?: string;
    'where.logs.nin'?: string;
    'where.logs.contains'?: string;
    'where.logs.contained'?: string;
    'where.logs.overlaps'?: string;
    'where.success.eq'?: boolean;
    'where.success.neq'?: boolean;
    'where.success.gt'?: boolean;
    'where.success.gte'?: boolean;
    'where.success.lt'?: boolean;
    'where.success.lte'?: boolean;
    'where.success.like'?: boolean;
    'where.success.ilike'?: boolean;
    'where.success.in'?: string;
    'where.success.nin'?: string;
    'where.success.contains'?: string;
    'where.success.contained'?: string;
    'where.success.overlaps'?: string;
    'where.synchedAt.eq'?: string;
    'where.synchedAt.neq'?: string;
    'where.synchedAt.gt'?: string;
    'where.synchedAt.gte'?: string;
    'where.synchedAt.lt'?: string;
    'where.synchedAt.lte'?: string;
    'where.synchedAt.like'?: string;
    'where.synchedAt.ilike'?: string;
    'where.synchedAt.in'?: string;
    'where.synchedAt.nin'?: string;
    'where.synchedAt.contains'?: string;
    'where.synchedAt.contained'?: string;
    'where.synchedAt.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'success': boolean;
    'isExport': boolean;
    'synchedAt': string;
    'fileName'?: string | null;
    'logs'?: object | null;
    'fileSize'?: number | null;
    'latestDataAcquiredAt'?: string | null;
    'importAttempts': number;
    'discarded'?: boolean | null;
    'hmac'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateImportsExportsResponseOK = Array<{ 'id'?: string | null; 'success'?: boolean | null; 'isExport'?: boolean | null; 'synchedAt'?: string | null; 'fileName'?: string | null; 'logs'?: object | null; 'fileSize'?: number | null; 'latestDataAcquiredAt'?: string | null; 'importAttempts'?: number | null; 'discarded'?: boolean | null; 'hmac'?: string | null }>
  export type UpdateImportsExportsResponses =
    UpdateImportsExportsResponseOK

  export type GetImportsExportByIdRequest = {
    'fields'?: Array<'discarded' | 'fileName' | 'fileSize' | 'hmac' | 'id' | 'importAttempts' | 'isExport' | 'latestDataAcquiredAt' | 'logs' | 'success' | 'synchedAt'>;
    'id': string;
  }

  /**
   * A ImportsExport
   */
  export type GetImportsExportByIdResponseOK = { 'id'?: string | null; 'success'?: boolean | null; 'isExport'?: boolean | null; 'synchedAt'?: string | null; 'fileName'?: string | null; 'logs'?: object | null; 'fileSize'?: number | null; 'latestDataAcquiredAt'?: string | null; 'importAttempts'?: number | null; 'discarded'?: boolean | null; 'hmac'?: string | null }
  export type GetImportsExportByIdResponses =
    GetImportsExportByIdResponseOK

  export type UpdateImportsExportRequest = {
    'fields'?: Array<'discarded' | 'fileName' | 'fileSize' | 'hmac' | 'id' | 'importAttempts' | 'isExport' | 'latestDataAcquiredAt' | 'logs' | 'success' | 'synchedAt'>;
    'id': string;
    'success': boolean;
    'isExport': boolean;
    'synchedAt': string;
    'fileName'?: string | null;
    'logs'?: object | null;
    'fileSize'?: number | null;
    'latestDataAcquiredAt'?: string | null;
    'importAttempts': number;
    'discarded'?: boolean | null;
    'hmac'?: string | null;
  }

  /**
   * A ImportsExport
   */
  export type UpdateImportsExportResponseOK = { 'id'?: string | null; 'success'?: boolean | null; 'isExport'?: boolean | null; 'synchedAt'?: string | null; 'fileName'?: string | null; 'logs'?: object | null; 'fileSize'?: number | null; 'latestDataAcquiredAt'?: string | null; 'importAttempts'?: number | null; 'discarded'?: boolean | null; 'hmac'?: string | null }
  export type UpdateImportsExportResponses =
    UpdateImportsExportResponseOK

  export type DeleteImportsExportsRequest = {
    'fields'?: Array<'discarded' | 'fileName' | 'fileSize' | 'hmac' | 'id' | 'importAttempts' | 'isExport' | 'latestDataAcquiredAt' | 'logs' | 'success' | 'synchedAt'>;
    'id': string;
  }

  /**
   * A ImportsExport
   */
  export type DeleteImportsExportsResponseOK = { 'id'?: string | null; 'success'?: boolean | null; 'isExport'?: boolean | null; 'synchedAt'?: string | null; 'fileName'?: string | null; 'logs'?: object | null; 'fileSize'?: number | null; 'latestDataAcquiredAt'?: string | null; 'importAttempts'?: number | null; 'discarded'?: boolean | null; 'hmac'?: string | null }
  export type DeleteImportsExportsResponses =
    DeleteImportsExportsResponseOK

  export type GetPathsRequest = {
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
    'fields'?: Array<'counter' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'path'>;
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
    'where.or'?: Array<string>;
    'orderby.counter'?: 'asc' | 'desc';
    'orderby.dumpedAt'?: 'asc' | 'desc';
    'orderby.exportedAt'?: 'asc' | 'desc';
    'orderby.importedAt'?: 'asc' | 'desc';
    'orderby.path'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetPathsResponseOK = Array<{ 'path'?: string | null; 'dumpedAt'?: string | null; 'counter'?: number | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }>
  export type GetPathsResponses =
    GetPathsResponseOK

  export type CreatePathRequest = {
    'path'?: string;
    'dumpedAt': string;
    'counter': number;
    'exportedAt'?: string | null;
    'importedAt'?: string | null;
  }

  /**
   * A Path
   */
  export type CreatePathResponseOK = { 'path'?: string | null; 'dumpedAt'?: string | null; 'counter'?: number | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type CreatePathResponses =
    CreatePathResponseOK

  export type UpdatePathsRequest = {
    'fields'?: Array<'counter' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'path'>;
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
    'where.or'?: Array<string>;
    'path'?: string;
    'dumpedAt': string;
    'counter': number;
    'exportedAt'?: string | null;
    'importedAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdatePathsResponseOK = Array<{ 'path'?: string | null; 'dumpedAt'?: string | null; 'counter'?: number | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }>
  export type UpdatePathsResponses =
    UpdatePathsResponseOK

  export type GetPathByPathRequest = {
    'fields'?: Array<'counter' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'path'>;
    'path': string;
  }

  /**
   * A Path
   */
  export type GetPathByPathResponseOK = { 'path'?: string | null; 'dumpedAt'?: string | null; 'counter'?: number | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type GetPathByPathResponses =
    GetPathByPathResponseOK

  export type UpdatePathRequest = {
    'fields'?: Array<'counter' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'path'>;
    'path': string;
    'dumpedAt': string;
    'counter': number;
    'exportedAt'?: string | null;
    'importedAt'?: string | null;
  }

  /**
   * A Path
   */
  export type UpdatePathResponseOK = { 'path'?: string | null; 'dumpedAt'?: string | null; 'counter'?: number | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type UpdatePathResponses =
    UpdatePathResponseOK

  export type DeletePathsRequest = {
    'fields'?: Array<'counter' | 'dumpedAt' | 'exportedAt' | 'importedAt' | 'path'>;
    'path': string;
  }

  /**
   * A Path
   */
  export type DeletePathsResponseOK = { 'path'?: string | null; 'dumpedAt'?: string | null; 'counter'?: number | null; 'exportedAt'?: string | null; 'importedAt'?: string | null }
  export type DeletePathsResponses =
    DeletePathsResponseOK

  export type GetDbWindowRequest = {
    'days'?: number;
  }

  /**
   * Default Response
   */
  export type GetDbWindowResponseOK = Array<{ 'dbId'?: string; 'columns'?: Array<string>; 'targetTable'?: string; 'tables'?: Array<string>; 'queryType'?: string; 'dbName'?: string; 'host'?: string; 'port'?: number; 'dbSystem'?: string; 'paths'?: Array<string> }>
  export type GetDbWindowResponses =
    GetDbWindowResponseOK

  export type PostDbDumpRequest = {
    'dump': Array<{ 'dbId'?: string; 'columns'?: Array<string>; 'targetTable'?: string; 'tables'?: Array<string>; 'queryType'?: string; 'dbName'?: string; 'host'?: string; 'port'?: number; 'dbSystem'?: string; 'paths'?: Array<string> }>;
  }

  export type PostDbDumpResponseOK = unknown
  export type PostDbDumpResponses =
    FullResponse<PostDbDumpResponseOK, 200>

  export type GetDownloadFileRequest = {
    'file': string;
  }

  export type GetDownloadFileResponseOK = unknown
  export type GetDownloadFileResponses =
    FullResponse<GetDownloadFileResponseOK, 200>

  export type GetLatenciesWindowRequest = {
    'days'?: number;
  }

  /**
   * Default Response
   */
  export type GetLatenciesWindowResponseOK = Array<{ 'from'?: string; 'to'?: string; 'count'?: number; 'mean'?: number }>
  export type GetLatenciesWindowResponses =
    GetLatenciesWindowResponseOK

  export type PostLatenciesDumpRequest = {
    'dump': Array<{ 'from'?: string; 'to'?: string; 'mean'?: number; 'count'?: number }>;
  }

  export type PostLatenciesDumpResponseOK = unknown
  export type PostLatenciesDumpResponses =
    FullResponse<PostLatenciesDumpResponseOK, 200>

  export type GetPathsWindowRequest = {
    'days'?: number;
  }

  /**
   * Default Response
   */
  export type GetPathsWindowResponseOK = Record<string, number>
  export type GetPathsWindowResponses =
    GetPathsWindowResponseOK

  export type PostPathsDumpRequest = {
    'dump': Array<{ 'path'?: string; 'counter'?: number }>;
  }

  export type PostPathsDumpResponseOK = unknown
  export type PostPathsDumpResponses =
    FullResponse<PostPathsDumpResponseOK, 200>

  export type GetStatusRequest = {
    
  }

  export type GetStatusResponseOK = unknown
  export type GetStatusResponses =
    FullResponse<GetStatusResponseOK, 200>

  export type GetSyncRequest = {
    
  }

  export type GetSyncResponseOK = unknown
  export type GetSyncResponses =
    FullResponse<GetSyncResponseOK, 200>

  export type GetSyncAvailableRequest = {
    
  }

  export type GetSyncAvailableResponseOK = unknown
  export type GetSyncAvailableResponses =
    FullResponse<GetSyncAvailableResponseOK, 200>

  export type GetSyncLatestRequest = {
    
  }

  export type GetSyncLatestResponseOK = unknown
  export type GetSyncLatestResponses =
    FullResponse<GetSyncLatestResponseOK, 200>

  export type GetSyncConfigRequest = {
    
  }

  export type GetSyncConfigResponseOK = unknown
  export type GetSyncConfigResponses =
    FullResponse<GetSyncConfigResponseOK, 200>

}

type ColdStoragePlugin = FastifyPluginAsync<NonNullable<coldStorage.ColdStorageOptions>>

declare module 'fastify' {
  interface ConfigureColdStorage {
    getHeaders(req: FastifyRequest, reply: FastifyReply, options: GetHeadersOptions): Promise<Record<string,string>>;
  }
  interface FastifyInstance {
    configureColdStorage(opts: ConfigureColdStorage): unknown
  }

  interface FastifyRequest {
    /**
     * Platformatic DB
     *
     * Exposing a SQL database as REST
     */
    'coldStorage': coldStorage.ColdStorage;
  }
}

declare function coldStorage(...params: Parameters<ColdStoragePlugin>): ReturnType<ColdStoragePlugin>;
export = coldStorage;
