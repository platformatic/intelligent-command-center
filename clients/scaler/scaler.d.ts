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
     * Update flamegraphs.
     *
     * Update one or more flamegraphs in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateFlamegraphs(req: UpdateFlamegraphsRequest): Promise<UpdateFlamegraphsResponses>;
    /**
     * Get Flamegraph by id.
     *
     * Fetch Flamegraph using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getFlamegraphById(req: GetFlamegraphByIdRequest): Promise<GetFlamegraphByIdResponses>;
    /**
     * Update flamegraph.
     *
     * Update flamegraph in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateFlamegraph(req: UpdateFlamegraphRequest): Promise<UpdateFlamegraphResponses>;
    /**
     * Delete flamegraphs.
     *
     * Delete one or more flamegraphs from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteFlamegraphs(req: DeleteFlamegraphsRequest): Promise<DeleteFlamegraphsResponses>;
    /**
     * Get alerts for flamegraph.
     *
     * Fetch all the alerts for flamegraph from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getAlertsForFlamegraph(req: GetAlertsForFlamegraphRequest): Promise<GetAlertsForFlamegraphResponses>;
    /**
     * Get performanceHistory.
     *
     * Fetch performanceHistory from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getPerformanceHistory(req: GetPerformanceHistoryRequest): Promise<GetPerformanceHistoryResponses>;
    /**
     * Create performanceHistory.
     *
     * Add new performanceHistory to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createPerformanceHistory(req: CreatePerformanceHistoryRequest): Promise<CreatePerformanceHistoryResponses>;
    /**
     * Update performanceHistory.
     *
     * Update one or more performanceHistory in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updatePerformanceHistory(req: UpdatePerformanceHistoryRequest): Promise<UpdatePerformanceHistoryResponses>;
    /**
     * Get PerformanceHistory by id.
     *
     * Fetch PerformanceHistory using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getPerformanceHistoryById(req: GetPerformanceHistoryByIdRequest): Promise<GetPerformanceHistoryByIdResponses>;
    /**
     * Update performanceHistory.
     *
     * Update performanceHistory in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    putUpdatePerformanceHistory(req: PutUpdatePerformanceHistoryRequest): Promise<PutUpdatePerformanceHistoryResponses>;
    /**
     * Delete performanceHistory.
     *
     * Delete one or more performanceHistory from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deletePerformanceHistory(req: DeletePerformanceHistoryRequest): Promise<DeletePerformanceHistoryResponses>;
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
     * Get alerts.
     *
     * Fetch alerts from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getAlerts(req: GetAlertsRequest): Promise<GetAlertsResponses>;
    /**
     * Update alerts.
     *
     * Update one or more alerts in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateAlerts(req: UpdateAlertsRequest): Promise<UpdateAlertsResponses>;
    /**
     * Get Alert by id.
     *
     * Fetch Alert using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getAlertById(req: GetAlertByIdRequest): Promise<GetAlertByIdResponses>;
    /**
     * Update alert.
     *
     * Update alert in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateAlert(req: UpdateAlertRequest): Promise<UpdateAlertResponses>;
    /**
     * Delete alerts.
     *
     * Delete one or more alerts from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteAlerts(req: DeleteAlertsRequest): Promise<DeleteAlertsResponses>;
    /**
     * Get signals for alert.
     *
     * Fetch all the signals for alert from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getSignalsForAlert(req: GetSignalsForAlertRequest): Promise<GetSignalsForAlertResponses>;
    /**
     * Get scaleEvent for alert.
     *
     * Fetch the scaleEvent for alert from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getScaleEventForAlert(req: GetScaleEventForAlertRequest): Promise<GetScaleEventForAlertResponses>;
    /**
     * Get flamegraph for alert.
     *
     * Fetch the flamegraph for alert from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getFlamegraphForAlert(req: GetFlamegraphForAlertRequest): Promise<GetFlamegraphForAlertResponses>;
    /**
     * Get scaleEvents.
     *
     * Fetch scaleEvents from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getScaleEvents(req: GetScaleEventsRequest): Promise<GetScaleEventsResponses>;
    /**
     * Create scaleEvent.
     *
     * Add new scaleEvent to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createScaleEvent(req: CreateScaleEventRequest): Promise<CreateScaleEventResponses>;
    /**
     * Update scaleEvents.
     *
     * Update one or more scaleEvents in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateScaleEvents(req: UpdateScaleEventsRequest): Promise<UpdateScaleEventsResponses>;
    /**
     * Get ScaleEvent by id.
     *
     * Fetch ScaleEvent using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getScaleEventById(req: GetScaleEventByIdRequest): Promise<GetScaleEventByIdResponses>;
    /**
     * Update scaleEvent.
     *
     * Update scaleEvent in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateScaleEvent(req: UpdateScaleEventRequest): Promise<UpdateScaleEventResponses>;
    /**
     * Delete scaleEvents.
     *
     * Delete one or more scaleEvents from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteScaleEvents(req: DeleteScaleEventsRequest): Promise<DeleteScaleEventsResponses>;
    /**
     * Get alerts for scaleEvent.
     *
     * Fetch all the alerts for scaleEvent from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getAlertsForScaleEvent(req: GetAlertsForScaleEventRequest): Promise<GetAlertsForScaleEventResponses>;
    /**
     * Get signals for scaleEvent.
     *
     * Fetch all the signals for scaleEvent from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getSignalsForScaleEvent(req: GetSignalsForScaleEventRequest): Promise<GetSignalsForScaleEventResponses>;
    /**
     * Get metricSnapshots for scaleEvent.
     *
     * Fetch all the metricSnapshots for scaleEvent from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getMetricSnapshotsForScaleEvent(req: GetMetricSnapshotsForScaleEventRequest): Promise<GetMetricSnapshotsForScaleEventResponses>;
    /**
     * Get signals.
     *
     * Fetch signals from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getSignals(req: GetSignalsRequest): Promise<GetSignalsResponses>;
    /**
     * Update signals.
     *
     * Update one or more signals in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateSignals(req: UpdateSignalsRequest): Promise<UpdateSignalsResponses>;
    /**
     * Get Signal by id.
     *
     * Fetch Signal using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getSignalById(req: GetSignalByIdRequest): Promise<GetSignalByIdResponses>;
    /**
     * Update signal.
     *
     * Update signal in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateSignal(req: UpdateSignalRequest): Promise<UpdateSignalResponses>;
    /**
     * Delete signals.
     *
     * Delete one or more signals from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteSignals(req: DeleteSignalsRequest): Promise<DeleteSignalsResponses>;
    /**
     * Get alert for signal.
     *
     * Fetch the alert for signal from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getAlertForSignal(req: GetAlertForSignalRequest): Promise<GetAlertForSignalResponses>;
    /**
     * Get scaleEvent for signal.
     *
     * Fetch the scaleEvent for signal from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getScaleEventForSignal(req: GetScaleEventForSignalRequest): Promise<GetScaleEventForSignalResponses>;
    /**
     * Get metricSnapshots.
     *
     * Fetch metricSnapshots from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getMetricSnapshots(req: GetMetricSnapshotsRequest): Promise<GetMetricSnapshotsResponses>;
    /**
     * Create metricSnapshot.
     *
     * Add new metricSnapshot to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createMetricSnapshot(req: CreateMetricSnapshotRequest): Promise<CreateMetricSnapshotResponses>;
    /**
     * Update metricSnapshots.
     *
     * Update one or more metricSnapshots in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateMetricSnapshots(req: UpdateMetricSnapshotsRequest): Promise<UpdateMetricSnapshotsResponses>;
    /**
     * Get MetricSnapshot by id.
     *
     * Fetch MetricSnapshot using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getMetricSnapshotById(req: GetMetricSnapshotByIdRequest): Promise<GetMetricSnapshotByIdResponses>;
    /**
     * Update metricSnapshot.
     *
     * Update metricSnapshot in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateMetricSnapshot(req: UpdateMetricSnapshotRequest): Promise<UpdateMetricSnapshotResponses>;
    /**
     * Delete metricSnapshots.
     *
     * Delete one or more metricSnapshots from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteMetricSnapshots(req: DeleteMetricSnapshotsRequest): Promise<DeleteMetricSnapshotsResponses>;
    /**
     * Get scaleEvent for metricSnapshot.
     *
     * Fetch the scaleEvent for metricSnapshot from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getScaleEventForMetricSnapshot(req: GetScaleEventForMetricSnapshotRequest): Promise<GetScaleEventForMetricSnapshotResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postAlerts(req: PostAlertsRequest): Promise<PostAlertsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    putControllersNamespaceK8SControllerIdScalingDisabled(req: PutControllersNamespaceK8SControllerIdScalingDisabledRequest): Promise<PutControllersNamespaceK8SControllerIdScalingDisabledResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    saveMachineController(req: SaveMachineControllerRequest): Promise<SaveMachineControllerResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postFlamegraphsRequests(req: PostFlamegraphsRequestsRequest): Promise<PostFlamegraphsRequestsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getFlamegraphs(req: GetFlamegraphsRequest): Promise<GetFlamegraphsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postPodsPodIdServicesServiceIdFlamegraph(req: PostPodsPodIdServicesServiceIdFlamegraphRequest): Promise<PostPodsPodIdServicesServiceIdFlamegraphResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postFlamegraphsFlamegraphIdAlerts(req: PostFlamegraphsFlamegraphIdAlertsRequest): Promise<PostFlamegraphsFlamegraphIdAlertsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getFlamegraphsIdDownload(req: GetFlamegraphsIdDownloadRequest): Promise<GetFlamegraphsIdDownloadResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postFlamegraphsStates(req: PostFlamegraphsStatesRequest): Promise<PostFlamegraphsStatesResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getFlamegraphsStates(req: GetFlamegraphsStatesRequest): Promise<GetFlamegraphsStatesResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postConnect(req: PostConnectRequest): Promise<PostConnectResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postReady(req: PostReadyRequest): Promise<PostReadyResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postDisconnect(req: PostDisconnectRequest): Promise<PostDisconnectResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationPredictions(req: GetApplicationPredictionsRequest): Promise<GetApplicationPredictionsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getAllPredictions(req: GetAllPredictionsRequest): Promise<GetAllPredictionsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    calculatePredictions(req: CalculatePredictionsRequest): Promise<CalculatePredictionsResponses>;
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
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getScaleEventsScaleEventIdMetrics(req: GetScaleEventsScaleEventIdMetricsRequest): Promise<GetScaleEventsScaleEventIdMetricsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getAlertsAlertIdMetrics(req: GetAlertsAlertIdMetricsRequest): Promise<GetAlertsAlertIdMetricsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    postSignals(req: PostSignalsRequest): Promise<PostSignalsResponses>;
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
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'maxPods' | 'minPods'>;
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

  export type UpdateFlamegraphsRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'flamegraph' | 'id' | 'podId' | 'profileType' | 'serviceId'>;
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
    'where.flamegraph.eq'?: string;
    'where.flamegraph.neq'?: string;
    'where.flamegraph.gt'?: string;
    'where.flamegraph.gte'?: string;
    'where.flamegraph.lt'?: string;
    'where.flamegraph.lte'?: string;
    'where.flamegraph.like'?: string;
    'where.flamegraph.ilike'?: string;
    'where.flamegraph.in'?: string;
    'where.flamegraph.nin'?: string;
    'where.flamegraph.contains'?: string;
    'where.flamegraph.contained'?: string;
    'where.flamegraph.overlaps'?: string;
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
    'where.profileType.eq'?: string;
    'where.profileType.neq'?: string;
    'where.profileType.gt'?: string;
    'where.profileType.gte'?: string;
    'where.profileType.lt'?: string;
    'where.profileType.lte'?: string;
    'where.profileType.like'?: string;
    'where.profileType.ilike'?: string;
    'where.profileType.in'?: string;
    'where.profileType.nin'?: string;
    'where.profileType.contains'?: string;
    'where.profileType.contained'?: string;
    'where.profileType.overlaps'?: string;
    'where.serviceId.eq'?: string;
    'where.serviceId.neq'?: string;
    'where.serviceId.gt'?: string;
    'where.serviceId.gte'?: string;
    'where.serviceId.lt'?: string;
    'where.serviceId.lte'?: string;
    'where.serviceId.like'?: string;
    'where.serviceId.ilike'?: string;
    'where.serviceId.in'?: string;
    'where.serviceId.nin'?: string;
    'where.serviceId.contains'?: string;
    'where.serviceId.contained'?: string;
    'where.serviceId.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'flamegraph': string;
    'createdAt'?: string | null;
    'serviceId'?: string | null;
    'podId'?: string | null;
    'profileType': string;
    'applicationId': string;
  }

  /**
   * Default Response
   */
  export type UpdateFlamegraphsResponseOK = Array<{ 'id'?: string | null; 'flamegraph'?: string | null; 'createdAt'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'profileType'?: string | null; 'applicationId'?: string | null }>
  export type UpdateFlamegraphsResponses =
    UpdateFlamegraphsResponseOK

  export type GetFlamegraphByIdRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'flamegraph' | 'id' | 'podId' | 'profileType' | 'serviceId'>;
    'id': string;
  }

  /**
   * A Flamegraph
   */
  export type GetFlamegraphByIdResponseOK = { 'id'?: string | null; 'flamegraph'?: string | null; 'createdAt'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'profileType'?: string | null; 'applicationId'?: string | null }
  export type GetFlamegraphByIdResponses =
    GetFlamegraphByIdResponseOK

  export type UpdateFlamegraphRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'flamegraph' | 'id' | 'podId' | 'profileType' | 'serviceId'>;
    'id': string;
    'flamegraph': string;
    'createdAt'?: string | null;
    'serviceId'?: string | null;
    'podId'?: string | null;
    'profileType': string;
    'applicationId': string;
  }

  /**
   * A Flamegraph
   */
  export type UpdateFlamegraphResponseOK = { 'id'?: string | null; 'flamegraph'?: string | null; 'createdAt'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'profileType'?: string | null; 'applicationId'?: string | null }
  export type UpdateFlamegraphResponses =
    UpdateFlamegraphResponseOK

  export type DeleteFlamegraphsRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'flamegraph' | 'id' | 'podId' | 'profileType' | 'serviceId'>;
    'id': string;
  }

  /**
   * A Flamegraph
   */
  export type DeleteFlamegraphsResponseOK = { 'id'?: string | null; 'flamegraph'?: string | null; 'createdAt'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'profileType'?: string | null; 'applicationId'?: string | null }
  export type DeleteFlamegraphsResponses =
    DeleteFlamegraphsResponseOK

  export type GetAlertsForFlamegraphRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'applicationId' | 'createdAt' | 'elu' | 'flamegraphId' | 'healthHistory' | 'heapTotal' | 'heapUsed' | 'id' | 'podId' | 'scaleEventId' | 'serviceId' | 'unhealthy'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetAlertsForFlamegraphResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'elu'?: number | null; 'heapUsed'?: number | null; 'heapTotal'?: number | null; 'unhealthy'?: boolean | null; 'healthHistory'?: object | null; 'createdAt'?: string | null; 'scaleEventId'?: string | null; 'flamegraphId'?: string | null }>
  export type GetAlertsForFlamegraphResponses =
    GetAlertsForFlamegraphResponseOK

  export type GetPerformanceHistoryRequest = {
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
    'fields'?: Array<'applicationId' | 'createdAt' | 'deltaElu' | 'deltaHeap' | 'eventTimestamp' | 'id' | 'podsAdded' | 'preEluMean' | 'preEluTrend' | 'preHeapMean' | 'preHeapTrend' | 'sigmaElu' | 'sigmaHeap' | 'source' | 'successScore' | 'totalPods' | 'updatedAt'>;
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
    'where.deltaElu.eq'?: number;
    'where.deltaElu.neq'?: number;
    'where.deltaElu.gt'?: number;
    'where.deltaElu.gte'?: number;
    'where.deltaElu.lt'?: number;
    'where.deltaElu.lte'?: number;
    'where.deltaElu.like'?: number;
    'where.deltaElu.ilike'?: number;
    'where.deltaElu.in'?: string;
    'where.deltaElu.nin'?: string;
    'where.deltaElu.contains'?: string;
    'where.deltaElu.contained'?: string;
    'where.deltaElu.overlaps'?: string;
    'where.deltaHeap.eq'?: number;
    'where.deltaHeap.neq'?: number;
    'where.deltaHeap.gt'?: number;
    'where.deltaHeap.gte'?: number;
    'where.deltaHeap.lt'?: number;
    'where.deltaHeap.lte'?: number;
    'where.deltaHeap.like'?: number;
    'where.deltaHeap.ilike'?: number;
    'where.deltaHeap.in'?: string;
    'where.deltaHeap.nin'?: string;
    'where.deltaHeap.contains'?: string;
    'where.deltaHeap.contained'?: string;
    'where.deltaHeap.overlaps'?: string;
    'where.eventTimestamp.eq'?: string;
    'where.eventTimestamp.neq'?: string;
    'where.eventTimestamp.gt'?: string;
    'where.eventTimestamp.gte'?: string;
    'where.eventTimestamp.lt'?: string;
    'where.eventTimestamp.lte'?: string;
    'where.eventTimestamp.like'?: string;
    'where.eventTimestamp.ilike'?: string;
    'where.eventTimestamp.in'?: string;
    'where.eventTimestamp.nin'?: string;
    'where.eventTimestamp.contains'?: string;
    'where.eventTimestamp.contained'?: string;
    'where.eventTimestamp.overlaps'?: string;
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
    'where.podsAdded.eq'?: number;
    'where.podsAdded.neq'?: number;
    'where.podsAdded.gt'?: number;
    'where.podsAdded.gte'?: number;
    'where.podsAdded.lt'?: number;
    'where.podsAdded.lte'?: number;
    'where.podsAdded.like'?: number;
    'where.podsAdded.ilike'?: number;
    'where.podsAdded.in'?: string;
    'where.podsAdded.nin'?: string;
    'where.podsAdded.contains'?: string;
    'where.podsAdded.contained'?: string;
    'where.podsAdded.overlaps'?: string;
    'where.preEluMean.eq'?: number;
    'where.preEluMean.neq'?: number;
    'where.preEluMean.gt'?: number;
    'where.preEluMean.gte'?: number;
    'where.preEluMean.lt'?: number;
    'where.preEluMean.lte'?: number;
    'where.preEluMean.like'?: number;
    'where.preEluMean.ilike'?: number;
    'where.preEluMean.in'?: string;
    'where.preEluMean.nin'?: string;
    'where.preEluMean.contains'?: string;
    'where.preEluMean.contained'?: string;
    'where.preEluMean.overlaps'?: string;
    'where.preEluTrend.eq'?: number;
    'where.preEluTrend.neq'?: number;
    'where.preEluTrend.gt'?: number;
    'where.preEluTrend.gte'?: number;
    'where.preEluTrend.lt'?: number;
    'where.preEluTrend.lte'?: number;
    'where.preEluTrend.like'?: number;
    'where.preEluTrend.ilike'?: number;
    'where.preEluTrend.in'?: string;
    'where.preEluTrend.nin'?: string;
    'where.preEluTrend.contains'?: string;
    'where.preEluTrend.contained'?: string;
    'where.preEluTrend.overlaps'?: string;
    'where.preHeapMean.eq'?: number;
    'where.preHeapMean.neq'?: number;
    'where.preHeapMean.gt'?: number;
    'where.preHeapMean.gte'?: number;
    'where.preHeapMean.lt'?: number;
    'where.preHeapMean.lte'?: number;
    'where.preHeapMean.like'?: number;
    'where.preHeapMean.ilike'?: number;
    'where.preHeapMean.in'?: string;
    'where.preHeapMean.nin'?: string;
    'where.preHeapMean.contains'?: string;
    'where.preHeapMean.contained'?: string;
    'where.preHeapMean.overlaps'?: string;
    'where.preHeapTrend.eq'?: number;
    'where.preHeapTrend.neq'?: number;
    'where.preHeapTrend.gt'?: number;
    'where.preHeapTrend.gte'?: number;
    'where.preHeapTrend.lt'?: number;
    'where.preHeapTrend.lte'?: number;
    'where.preHeapTrend.like'?: number;
    'where.preHeapTrend.ilike'?: number;
    'where.preHeapTrend.in'?: string;
    'where.preHeapTrend.nin'?: string;
    'where.preHeapTrend.contains'?: string;
    'where.preHeapTrend.contained'?: string;
    'where.preHeapTrend.overlaps'?: string;
    'where.sigmaElu.eq'?: number;
    'where.sigmaElu.neq'?: number;
    'where.sigmaElu.gt'?: number;
    'where.sigmaElu.gte'?: number;
    'where.sigmaElu.lt'?: number;
    'where.sigmaElu.lte'?: number;
    'where.sigmaElu.like'?: number;
    'where.sigmaElu.ilike'?: number;
    'where.sigmaElu.in'?: string;
    'where.sigmaElu.nin'?: string;
    'where.sigmaElu.contains'?: string;
    'where.sigmaElu.contained'?: string;
    'where.sigmaElu.overlaps'?: string;
    'where.sigmaHeap.eq'?: number;
    'where.sigmaHeap.neq'?: number;
    'where.sigmaHeap.gt'?: number;
    'where.sigmaHeap.gte'?: number;
    'where.sigmaHeap.lt'?: number;
    'where.sigmaHeap.lte'?: number;
    'where.sigmaHeap.like'?: number;
    'where.sigmaHeap.ilike'?: number;
    'where.sigmaHeap.in'?: string;
    'where.sigmaHeap.nin'?: string;
    'where.sigmaHeap.contains'?: string;
    'where.sigmaHeap.contained'?: string;
    'where.sigmaHeap.overlaps'?: string;
    'where.source.eq'?: string;
    'where.source.neq'?: string;
    'where.source.gt'?: string;
    'where.source.gte'?: string;
    'where.source.lt'?: string;
    'where.source.lte'?: string;
    'where.source.like'?: string;
    'where.source.ilike'?: string;
    'where.source.in'?: string;
    'where.source.nin'?: string;
    'where.source.contains'?: string;
    'where.source.contained'?: string;
    'where.source.overlaps'?: string;
    'where.successScore.eq'?: number;
    'where.successScore.neq'?: number;
    'where.successScore.gt'?: number;
    'where.successScore.gte'?: number;
    'where.successScore.lt'?: number;
    'where.successScore.lte'?: number;
    'where.successScore.like'?: number;
    'where.successScore.ilike'?: number;
    'where.successScore.in'?: string;
    'where.successScore.nin'?: string;
    'where.successScore.contains'?: string;
    'where.successScore.contained'?: string;
    'where.successScore.overlaps'?: string;
    'where.totalPods.eq'?: number;
    'where.totalPods.neq'?: number;
    'where.totalPods.gt'?: number;
    'where.totalPods.gte'?: number;
    'where.totalPods.lt'?: number;
    'where.totalPods.lte'?: number;
    'where.totalPods.like'?: number;
    'where.totalPods.ilike'?: number;
    'where.totalPods.in'?: string;
    'where.totalPods.nin'?: string;
    'where.totalPods.contains'?: string;
    'where.totalPods.contained'?: string;
    'where.totalPods.overlaps'?: string;
    'where.updatedAt.eq'?: string;
    'where.updatedAt.neq'?: string;
    'where.updatedAt.gt'?: string;
    'where.updatedAt.gte'?: string;
    'where.updatedAt.lt'?: string;
    'where.updatedAt.lte'?: string;
    'where.updatedAt.like'?: string;
    'where.updatedAt.ilike'?: string;
    'where.updatedAt.in'?: string;
    'where.updatedAt.nin'?: string;
    'where.updatedAt.contains'?: string;
    'where.updatedAt.contained'?: string;
    'where.updatedAt.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.deltaElu'?: 'asc' | 'desc';
    'orderby.deltaHeap'?: 'asc' | 'desc';
    'orderby.eventTimestamp'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.podsAdded'?: 'asc' | 'desc';
    'orderby.preEluMean'?: 'asc' | 'desc';
    'orderby.preEluTrend'?: 'asc' | 'desc';
    'orderby.preHeapMean'?: 'asc' | 'desc';
    'orderby.preHeapTrend'?: 'asc' | 'desc';
    'orderby.sigmaElu'?: 'asc' | 'desc';
    'orderby.sigmaHeap'?: 'asc' | 'desc';
    'orderby.source'?: 'asc' | 'desc';
    'orderby.successScore'?: 'asc' | 'desc';
    'orderby.totalPods'?: 'asc' | 'desc';
    'orderby.updatedAt'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetPerformanceHistoryResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'eventTimestamp'?: string | null; 'podsAdded'?: number | null; 'totalPods'?: number | null; 'preEluMean'?: number | null; 'preHeapMean'?: number | null; 'preEluTrend'?: number | null; 'preHeapTrend'?: number | null; 'deltaElu'?: number | null; 'deltaHeap'?: number | null; 'sigmaElu'?: number | null; 'sigmaHeap'?: number | null; 'successScore'?: number | null; 'source'?: string | null; 'createdAt'?: string | null; 'updatedAt'?: string | null }>
  export type GetPerformanceHistoryResponses =
    GetPerformanceHistoryResponseOK

  export type CreatePerformanceHistoryRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'deltaElu' | 'deltaHeap' | 'eventTimestamp' | 'id' | 'podsAdded' | 'preEluMean' | 'preEluTrend' | 'preHeapMean' | 'preHeapTrend' | 'sigmaElu' | 'sigmaHeap' | 'source' | 'successScore' | 'totalPods' | 'updatedAt'>;
    'id'?: string;
    'applicationId': string;
    'eventTimestamp': string;
    'podsAdded': number;
    'totalPods': number;
    'preEluMean': number;
    'preHeapMean': number;
    'preEluTrend': number;
    'preHeapTrend': number;
    'deltaElu': number;
    'deltaHeap': number;
    'sigmaElu': number;
    'sigmaHeap': number;
    'successScore': number;
    'source': string;
    'createdAt'?: string | null;
    'updatedAt'?: string | null;
  }

  /**
   * A PerformanceHistory
   */
  export type CreatePerformanceHistoryResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'eventTimestamp'?: string | null; 'podsAdded'?: number | null; 'totalPods'?: number | null; 'preEluMean'?: number | null; 'preHeapMean'?: number | null; 'preEluTrend'?: number | null; 'preHeapTrend'?: number | null; 'deltaElu'?: number | null; 'deltaHeap'?: number | null; 'sigmaElu'?: number | null; 'sigmaHeap'?: number | null; 'successScore'?: number | null; 'source'?: string | null; 'createdAt'?: string | null; 'updatedAt'?: string | null }
  export type CreatePerformanceHistoryResponses =
    CreatePerformanceHistoryResponseOK

  export type UpdatePerformanceHistoryRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'deltaElu' | 'deltaHeap' | 'eventTimestamp' | 'id' | 'podsAdded' | 'preEluMean' | 'preEluTrend' | 'preHeapMean' | 'preHeapTrend' | 'sigmaElu' | 'sigmaHeap' | 'source' | 'successScore' | 'totalPods' | 'updatedAt'>;
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
    'where.deltaElu.eq'?: number;
    'where.deltaElu.neq'?: number;
    'where.deltaElu.gt'?: number;
    'where.deltaElu.gte'?: number;
    'where.deltaElu.lt'?: number;
    'where.deltaElu.lte'?: number;
    'where.deltaElu.like'?: number;
    'where.deltaElu.ilike'?: number;
    'where.deltaElu.in'?: string;
    'where.deltaElu.nin'?: string;
    'where.deltaElu.contains'?: string;
    'where.deltaElu.contained'?: string;
    'where.deltaElu.overlaps'?: string;
    'where.deltaHeap.eq'?: number;
    'where.deltaHeap.neq'?: number;
    'where.deltaHeap.gt'?: number;
    'where.deltaHeap.gte'?: number;
    'where.deltaHeap.lt'?: number;
    'where.deltaHeap.lte'?: number;
    'where.deltaHeap.like'?: number;
    'where.deltaHeap.ilike'?: number;
    'where.deltaHeap.in'?: string;
    'where.deltaHeap.nin'?: string;
    'where.deltaHeap.contains'?: string;
    'where.deltaHeap.contained'?: string;
    'where.deltaHeap.overlaps'?: string;
    'where.eventTimestamp.eq'?: string;
    'where.eventTimestamp.neq'?: string;
    'where.eventTimestamp.gt'?: string;
    'where.eventTimestamp.gte'?: string;
    'where.eventTimestamp.lt'?: string;
    'where.eventTimestamp.lte'?: string;
    'where.eventTimestamp.like'?: string;
    'where.eventTimestamp.ilike'?: string;
    'where.eventTimestamp.in'?: string;
    'where.eventTimestamp.nin'?: string;
    'where.eventTimestamp.contains'?: string;
    'where.eventTimestamp.contained'?: string;
    'where.eventTimestamp.overlaps'?: string;
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
    'where.podsAdded.eq'?: number;
    'where.podsAdded.neq'?: number;
    'where.podsAdded.gt'?: number;
    'where.podsAdded.gte'?: number;
    'where.podsAdded.lt'?: number;
    'where.podsAdded.lte'?: number;
    'where.podsAdded.like'?: number;
    'where.podsAdded.ilike'?: number;
    'where.podsAdded.in'?: string;
    'where.podsAdded.nin'?: string;
    'where.podsAdded.contains'?: string;
    'where.podsAdded.contained'?: string;
    'where.podsAdded.overlaps'?: string;
    'where.preEluMean.eq'?: number;
    'where.preEluMean.neq'?: number;
    'where.preEluMean.gt'?: number;
    'where.preEluMean.gte'?: number;
    'where.preEluMean.lt'?: number;
    'where.preEluMean.lte'?: number;
    'where.preEluMean.like'?: number;
    'where.preEluMean.ilike'?: number;
    'where.preEluMean.in'?: string;
    'where.preEluMean.nin'?: string;
    'where.preEluMean.contains'?: string;
    'where.preEluMean.contained'?: string;
    'where.preEluMean.overlaps'?: string;
    'where.preEluTrend.eq'?: number;
    'where.preEluTrend.neq'?: number;
    'where.preEluTrend.gt'?: number;
    'where.preEluTrend.gte'?: number;
    'where.preEluTrend.lt'?: number;
    'where.preEluTrend.lte'?: number;
    'where.preEluTrend.like'?: number;
    'where.preEluTrend.ilike'?: number;
    'where.preEluTrend.in'?: string;
    'where.preEluTrend.nin'?: string;
    'where.preEluTrend.contains'?: string;
    'where.preEluTrend.contained'?: string;
    'where.preEluTrend.overlaps'?: string;
    'where.preHeapMean.eq'?: number;
    'where.preHeapMean.neq'?: number;
    'where.preHeapMean.gt'?: number;
    'where.preHeapMean.gte'?: number;
    'where.preHeapMean.lt'?: number;
    'where.preHeapMean.lte'?: number;
    'where.preHeapMean.like'?: number;
    'where.preHeapMean.ilike'?: number;
    'where.preHeapMean.in'?: string;
    'where.preHeapMean.nin'?: string;
    'where.preHeapMean.contains'?: string;
    'where.preHeapMean.contained'?: string;
    'where.preHeapMean.overlaps'?: string;
    'where.preHeapTrend.eq'?: number;
    'where.preHeapTrend.neq'?: number;
    'where.preHeapTrend.gt'?: number;
    'where.preHeapTrend.gte'?: number;
    'where.preHeapTrend.lt'?: number;
    'where.preHeapTrend.lte'?: number;
    'where.preHeapTrend.like'?: number;
    'where.preHeapTrend.ilike'?: number;
    'where.preHeapTrend.in'?: string;
    'where.preHeapTrend.nin'?: string;
    'where.preHeapTrend.contains'?: string;
    'where.preHeapTrend.contained'?: string;
    'where.preHeapTrend.overlaps'?: string;
    'where.sigmaElu.eq'?: number;
    'where.sigmaElu.neq'?: number;
    'where.sigmaElu.gt'?: number;
    'where.sigmaElu.gte'?: number;
    'where.sigmaElu.lt'?: number;
    'where.sigmaElu.lte'?: number;
    'where.sigmaElu.like'?: number;
    'where.sigmaElu.ilike'?: number;
    'where.sigmaElu.in'?: string;
    'where.sigmaElu.nin'?: string;
    'where.sigmaElu.contains'?: string;
    'where.sigmaElu.contained'?: string;
    'where.sigmaElu.overlaps'?: string;
    'where.sigmaHeap.eq'?: number;
    'where.sigmaHeap.neq'?: number;
    'where.sigmaHeap.gt'?: number;
    'where.sigmaHeap.gte'?: number;
    'where.sigmaHeap.lt'?: number;
    'where.sigmaHeap.lte'?: number;
    'where.sigmaHeap.like'?: number;
    'where.sigmaHeap.ilike'?: number;
    'where.sigmaHeap.in'?: string;
    'where.sigmaHeap.nin'?: string;
    'where.sigmaHeap.contains'?: string;
    'where.sigmaHeap.contained'?: string;
    'where.sigmaHeap.overlaps'?: string;
    'where.source.eq'?: string;
    'where.source.neq'?: string;
    'where.source.gt'?: string;
    'where.source.gte'?: string;
    'where.source.lt'?: string;
    'where.source.lte'?: string;
    'where.source.like'?: string;
    'where.source.ilike'?: string;
    'where.source.in'?: string;
    'where.source.nin'?: string;
    'where.source.contains'?: string;
    'where.source.contained'?: string;
    'where.source.overlaps'?: string;
    'where.successScore.eq'?: number;
    'where.successScore.neq'?: number;
    'where.successScore.gt'?: number;
    'where.successScore.gte'?: number;
    'where.successScore.lt'?: number;
    'where.successScore.lte'?: number;
    'where.successScore.like'?: number;
    'where.successScore.ilike'?: number;
    'where.successScore.in'?: string;
    'where.successScore.nin'?: string;
    'where.successScore.contains'?: string;
    'where.successScore.contained'?: string;
    'where.successScore.overlaps'?: string;
    'where.totalPods.eq'?: number;
    'where.totalPods.neq'?: number;
    'where.totalPods.gt'?: number;
    'where.totalPods.gte'?: number;
    'where.totalPods.lt'?: number;
    'where.totalPods.lte'?: number;
    'where.totalPods.like'?: number;
    'where.totalPods.ilike'?: number;
    'where.totalPods.in'?: string;
    'where.totalPods.nin'?: string;
    'where.totalPods.contains'?: string;
    'where.totalPods.contained'?: string;
    'where.totalPods.overlaps'?: string;
    'where.updatedAt.eq'?: string;
    'where.updatedAt.neq'?: string;
    'where.updatedAt.gt'?: string;
    'where.updatedAt.gte'?: string;
    'where.updatedAt.lt'?: string;
    'where.updatedAt.lte'?: string;
    'where.updatedAt.like'?: string;
    'where.updatedAt.ilike'?: string;
    'where.updatedAt.in'?: string;
    'where.updatedAt.nin'?: string;
    'where.updatedAt.contains'?: string;
    'where.updatedAt.contained'?: string;
    'where.updatedAt.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'applicationId': string;
    'eventTimestamp': string;
    'podsAdded': number;
    'totalPods': number;
    'preEluMean': number;
    'preHeapMean': number;
    'preEluTrend': number;
    'preHeapTrend': number;
    'deltaElu': number;
    'deltaHeap': number;
    'sigmaElu': number;
    'sigmaHeap': number;
    'successScore': number;
    'source': string;
    'createdAt'?: string | null;
    'updatedAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdatePerformanceHistoryResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'eventTimestamp'?: string | null; 'podsAdded'?: number | null; 'totalPods'?: number | null; 'preEluMean'?: number | null; 'preHeapMean'?: number | null; 'preEluTrend'?: number | null; 'preHeapTrend'?: number | null; 'deltaElu'?: number | null; 'deltaHeap'?: number | null; 'sigmaElu'?: number | null; 'sigmaHeap'?: number | null; 'successScore'?: number | null; 'source'?: string | null; 'createdAt'?: string | null; 'updatedAt'?: string | null }>
  export type UpdatePerformanceHistoryResponses =
    UpdatePerformanceHistoryResponseOK

  export type GetPerformanceHistoryByIdRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'deltaElu' | 'deltaHeap' | 'eventTimestamp' | 'id' | 'podsAdded' | 'preEluMean' | 'preEluTrend' | 'preHeapMean' | 'preHeapTrend' | 'sigmaElu' | 'sigmaHeap' | 'source' | 'successScore' | 'totalPods' | 'updatedAt'>;
    'id': string;
  }

  /**
   * A PerformanceHistory
   */
  export type GetPerformanceHistoryByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'eventTimestamp'?: string | null; 'podsAdded'?: number | null; 'totalPods'?: number | null; 'preEluMean'?: number | null; 'preHeapMean'?: number | null; 'preEluTrend'?: number | null; 'preHeapTrend'?: number | null; 'deltaElu'?: number | null; 'deltaHeap'?: number | null; 'sigmaElu'?: number | null; 'sigmaHeap'?: number | null; 'successScore'?: number | null; 'source'?: string | null; 'createdAt'?: string | null; 'updatedAt'?: string | null }
  export type GetPerformanceHistoryByIdResponses =
    GetPerformanceHistoryByIdResponseOK

  export type PutUpdatePerformanceHistoryRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'deltaElu' | 'deltaHeap' | 'eventTimestamp' | 'id' | 'podsAdded' | 'preEluMean' | 'preEluTrend' | 'preHeapMean' | 'preHeapTrend' | 'sigmaElu' | 'sigmaHeap' | 'source' | 'successScore' | 'totalPods' | 'updatedAt'>;
    'id': string;
    'applicationId': string;
    'eventTimestamp': string;
    'podsAdded': number;
    'totalPods': number;
    'preEluMean': number;
    'preHeapMean': number;
    'preEluTrend': number;
    'preHeapTrend': number;
    'deltaElu': number;
    'deltaHeap': number;
    'sigmaElu': number;
    'sigmaHeap': number;
    'successScore': number;
    'source': string;
    'createdAt'?: string | null;
    'updatedAt'?: string | null;
  }

  /**
   * A PerformanceHistory
   */
  export type PutUpdatePerformanceHistoryResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'eventTimestamp'?: string | null; 'podsAdded'?: number | null; 'totalPods'?: number | null; 'preEluMean'?: number | null; 'preHeapMean'?: number | null; 'preEluTrend'?: number | null; 'preHeapTrend'?: number | null; 'deltaElu'?: number | null; 'deltaHeap'?: number | null; 'sigmaElu'?: number | null; 'sigmaHeap'?: number | null; 'successScore'?: number | null; 'source'?: string | null; 'createdAt'?: string | null; 'updatedAt'?: string | null }
  export type PutUpdatePerformanceHistoryResponses =
    PutUpdatePerformanceHistoryResponseOK

  export type DeletePerformanceHistoryRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'deltaElu' | 'deltaHeap' | 'eventTimestamp' | 'id' | 'podsAdded' | 'preEluMean' | 'preEluTrend' | 'preHeapMean' | 'preHeapTrend' | 'sigmaElu' | 'sigmaHeap' | 'source' | 'successScore' | 'totalPods' | 'updatedAt'>;
    'id': string;
  }

  /**
   * A PerformanceHistory
   */
  export type DeletePerformanceHistoryResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'eventTimestamp'?: string | null; 'podsAdded'?: number | null; 'totalPods'?: number | null; 'preEluMean'?: number | null; 'preHeapMean'?: number | null; 'preEluTrend'?: number | null; 'preHeapTrend'?: number | null; 'deltaElu'?: number | null; 'deltaHeap'?: number | null; 'sigmaElu'?: number | null; 'sigmaHeap'?: number | null; 'successScore'?: number | null; 'source'?: string | null; 'createdAt'?: string | null; 'updatedAt'?: string | null }
  export type DeletePerformanceHistoryResponses =
    DeletePerformanceHistoryResponseOK

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
    'fields'?: Array<'applicationId' | 'controllerId' | 'createdAt' | 'deploymentId' | 'id' | 'namespace' | 'providerMetadata' | 'replicas' | 'scalingDisabled'>;
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
    'where.providerMetadata.eq'?: string;
    'where.providerMetadata.neq'?: string;
    'where.providerMetadata.gt'?: string;
    'where.providerMetadata.gte'?: string;
    'where.providerMetadata.lt'?: string;
    'where.providerMetadata.lte'?: string;
    'where.providerMetadata.like'?: string;
    'where.providerMetadata.ilike'?: string;
    'where.providerMetadata.in'?: string;
    'where.providerMetadata.nin'?: string;
    'where.providerMetadata.contains'?: string;
    'where.providerMetadata.contained'?: string;
    'where.providerMetadata.overlaps'?: string;
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
    'where.scalingDisabled.eq'?: boolean;
    'where.scalingDisabled.neq'?: boolean;
    'where.scalingDisabled.gt'?: boolean;
    'where.scalingDisabled.gte'?: boolean;
    'where.scalingDisabled.lt'?: boolean;
    'where.scalingDisabled.lte'?: boolean;
    'where.scalingDisabled.like'?: boolean;
    'where.scalingDisabled.ilike'?: boolean;
    'where.scalingDisabled.in'?: string;
    'where.scalingDisabled.nin'?: string;
    'where.scalingDisabled.contains'?: string;
    'where.scalingDisabled.contained'?: string;
    'where.scalingDisabled.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.controllerId'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.deploymentId'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.namespace'?: 'asc' | 'desc';
    'orderby.providerMetadata'?: 'asc' | 'desc';
    'orderby.replicas'?: 'asc' | 'desc';
    'orderby.scalingDisabled'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetControllersResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'namespace'?: string | null; 'controllerId'?: string | null; 'replicas'?: number | null; 'createdAt'?: string | null; 'scalingDisabled'?: boolean | null; 'providerMetadata'?: object | null }>
  export type GetControllersResponses =
    GetControllersResponseOK

  export type UpdateControllersRequest = {
    'fields'?: Array<'applicationId' | 'controllerId' | 'createdAt' | 'deploymentId' | 'id' | 'namespace' | 'providerMetadata' | 'replicas' | 'scalingDisabled'>;
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
    'where.providerMetadata.eq'?: string;
    'where.providerMetadata.neq'?: string;
    'where.providerMetadata.gt'?: string;
    'where.providerMetadata.gte'?: string;
    'where.providerMetadata.lt'?: string;
    'where.providerMetadata.lte'?: string;
    'where.providerMetadata.like'?: string;
    'where.providerMetadata.ilike'?: string;
    'where.providerMetadata.in'?: string;
    'where.providerMetadata.nin'?: string;
    'where.providerMetadata.contains'?: string;
    'where.providerMetadata.contained'?: string;
    'where.providerMetadata.overlaps'?: string;
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
    'where.scalingDisabled.eq'?: boolean;
    'where.scalingDisabled.neq'?: boolean;
    'where.scalingDisabled.gt'?: boolean;
    'where.scalingDisabled.gte'?: boolean;
    'where.scalingDisabled.lt'?: boolean;
    'where.scalingDisabled.lte'?: boolean;
    'where.scalingDisabled.like'?: boolean;
    'where.scalingDisabled.ilike'?: boolean;
    'where.scalingDisabled.in'?: string;
    'where.scalingDisabled.nin'?: string;
    'where.scalingDisabled.contains'?: string;
    'where.scalingDisabled.contained'?: string;
    'where.scalingDisabled.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'applicationId': string;
    'deploymentId': string;
    'namespace': string;
    'controllerId': string;
    'replicas': number;
    'createdAt'?: string | null;
    'scalingDisabled'?: boolean | null;
    'providerMetadata'?: object | null;
  }

  /**
   * Default Response
   */
  export type UpdateControllersResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'namespace'?: string | null; 'controllerId'?: string | null; 'replicas'?: number | null; 'createdAt'?: string | null; 'scalingDisabled'?: boolean | null; 'providerMetadata'?: object | null }>
  export type UpdateControllersResponses =
    UpdateControllersResponseOK

  export type GetControllerByIdRequest = {
    'fields'?: Array<'applicationId' | 'controllerId' | 'createdAt' | 'deploymentId' | 'id' | 'namespace' | 'providerMetadata' | 'replicas' | 'scalingDisabled'>;
    'id': string;
  }

  /**
   * A Controller
   */
  export type GetControllerByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'namespace'?: string | null; 'controllerId'?: string | null; 'replicas'?: number | null; 'createdAt'?: string | null; 'scalingDisabled'?: boolean | null; 'providerMetadata'?: object | null }
  export type GetControllerByIdResponses =
    GetControllerByIdResponseOK

  export type UpdateControllerRequest = {
    'fields'?: Array<'applicationId' | 'controllerId' | 'createdAt' | 'deploymentId' | 'id' | 'namespace' | 'providerMetadata' | 'replicas' | 'scalingDisabled'>;
    'id': string;
    'applicationId': string;
    'deploymentId': string;
    'namespace': string;
    'controllerId': string;
    'replicas': number;
    'createdAt'?: string | null;
    'scalingDisabled'?: boolean | null;
    'providerMetadata'?: object | null;
  }

  /**
   * A Controller
   */
  export type UpdateControllerResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'namespace'?: string | null; 'controllerId'?: string | null; 'replicas'?: number | null; 'createdAt'?: string | null; 'scalingDisabled'?: boolean | null; 'providerMetadata'?: object | null }
  export type UpdateControllerResponses =
    UpdateControllerResponseOK

  export type DeleteControllersRequest = {
    'fields'?: Array<'applicationId' | 'controllerId' | 'createdAt' | 'deploymentId' | 'id' | 'namespace' | 'providerMetadata' | 'replicas' | 'scalingDisabled'>;
    'id': string;
  }

  /**
   * A Controller
   */
  export type DeleteControllersResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'namespace'?: string | null; 'controllerId'?: string | null; 'replicas'?: number | null; 'createdAt'?: string | null; 'scalingDisabled'?: boolean | null; 'providerMetadata'?: object | null }
  export type DeleteControllersResponses =
    DeleteControllersResponseOK

  export type GetAlertsRequest = {
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
    'fields'?: Array<'applicationId' | 'createdAt' | 'elu' | 'flamegraphId' | 'healthHistory' | 'heapTotal' | 'heapUsed' | 'id' | 'podId' | 'scaleEventId' | 'serviceId' | 'unhealthy'>;
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
    'where.elu.eq'?: number;
    'where.elu.neq'?: number;
    'where.elu.gt'?: number;
    'where.elu.gte'?: number;
    'where.elu.lt'?: number;
    'where.elu.lte'?: number;
    'where.elu.like'?: number;
    'where.elu.ilike'?: number;
    'where.elu.in'?: string;
    'where.elu.nin'?: string;
    'where.elu.contains'?: string;
    'where.elu.contained'?: string;
    'where.elu.overlaps'?: string;
    'where.flamegraphId.eq'?: string;
    'where.flamegraphId.neq'?: string;
    'where.flamegraphId.gt'?: string;
    'where.flamegraphId.gte'?: string;
    'where.flamegraphId.lt'?: string;
    'where.flamegraphId.lte'?: string;
    'where.flamegraphId.like'?: string;
    'where.flamegraphId.ilike'?: string;
    'where.flamegraphId.in'?: string;
    'where.flamegraphId.nin'?: string;
    'where.flamegraphId.contains'?: string;
    'where.flamegraphId.contained'?: string;
    'where.flamegraphId.overlaps'?: string;
    'where.healthHistory.eq'?: string;
    'where.healthHistory.neq'?: string;
    'where.healthHistory.gt'?: string;
    'where.healthHistory.gte'?: string;
    'where.healthHistory.lt'?: string;
    'where.healthHistory.lte'?: string;
    'where.healthHistory.like'?: string;
    'where.healthHistory.ilike'?: string;
    'where.healthHistory.in'?: string;
    'where.healthHistory.nin'?: string;
    'where.healthHistory.contains'?: string;
    'where.healthHistory.contained'?: string;
    'where.healthHistory.overlaps'?: string;
    'where.heapTotal.eq'?: number;
    'where.heapTotal.neq'?: number;
    'where.heapTotal.gt'?: number;
    'where.heapTotal.gte'?: number;
    'where.heapTotal.lt'?: number;
    'where.heapTotal.lte'?: number;
    'where.heapTotal.like'?: number;
    'where.heapTotal.ilike'?: number;
    'where.heapTotal.in'?: string;
    'where.heapTotal.nin'?: string;
    'where.heapTotal.contains'?: string;
    'where.heapTotal.contained'?: string;
    'where.heapTotal.overlaps'?: string;
    'where.heapUsed.eq'?: number;
    'where.heapUsed.neq'?: number;
    'where.heapUsed.gt'?: number;
    'where.heapUsed.gte'?: number;
    'where.heapUsed.lt'?: number;
    'where.heapUsed.lte'?: number;
    'where.heapUsed.like'?: number;
    'where.heapUsed.ilike'?: number;
    'where.heapUsed.in'?: string;
    'where.heapUsed.nin'?: string;
    'where.heapUsed.contains'?: string;
    'where.heapUsed.contained'?: string;
    'where.heapUsed.overlaps'?: string;
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
    'where.scaleEventId.eq'?: string;
    'where.scaleEventId.neq'?: string;
    'where.scaleEventId.gt'?: string;
    'where.scaleEventId.gte'?: string;
    'where.scaleEventId.lt'?: string;
    'where.scaleEventId.lte'?: string;
    'where.scaleEventId.like'?: string;
    'where.scaleEventId.ilike'?: string;
    'where.scaleEventId.in'?: string;
    'where.scaleEventId.nin'?: string;
    'where.scaleEventId.contains'?: string;
    'where.scaleEventId.contained'?: string;
    'where.scaleEventId.overlaps'?: string;
    'where.serviceId.eq'?: string;
    'where.serviceId.neq'?: string;
    'where.serviceId.gt'?: string;
    'where.serviceId.gte'?: string;
    'where.serviceId.lt'?: string;
    'where.serviceId.lte'?: string;
    'where.serviceId.like'?: string;
    'where.serviceId.ilike'?: string;
    'where.serviceId.in'?: string;
    'where.serviceId.nin'?: string;
    'where.serviceId.contains'?: string;
    'where.serviceId.contained'?: string;
    'where.serviceId.overlaps'?: string;
    'where.unhealthy.eq'?: boolean;
    'where.unhealthy.neq'?: boolean;
    'where.unhealthy.gt'?: boolean;
    'where.unhealthy.gte'?: boolean;
    'where.unhealthy.lt'?: boolean;
    'where.unhealthy.lte'?: boolean;
    'where.unhealthy.like'?: boolean;
    'where.unhealthy.ilike'?: boolean;
    'where.unhealthy.in'?: string;
    'where.unhealthy.nin'?: string;
    'where.unhealthy.contains'?: string;
    'where.unhealthy.contained'?: string;
    'where.unhealthy.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.elu'?: 'asc' | 'desc';
    'orderby.flamegraphId'?: 'asc' | 'desc';
    'orderby.healthHistory'?: 'asc' | 'desc';
    'orderby.heapTotal'?: 'asc' | 'desc';
    'orderby.heapUsed'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.podId'?: 'asc' | 'desc';
    'orderby.scaleEventId'?: 'asc' | 'desc';
    'orderby.serviceId'?: 'asc' | 'desc';
    'orderby.unhealthy'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetAlertsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'elu'?: number | null; 'heapUsed'?: number | null; 'heapTotal'?: number | null; 'unhealthy'?: boolean | null; 'healthHistory'?: object | null; 'createdAt'?: string | null; 'scaleEventId'?: string | null; 'flamegraphId'?: string | null }>
  export type GetAlertsResponses =
    GetAlertsResponseOK

  export type UpdateAlertsRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'elu' | 'flamegraphId' | 'healthHistory' | 'heapTotal' | 'heapUsed' | 'id' | 'podId' | 'scaleEventId' | 'serviceId' | 'unhealthy'>;
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
    'where.elu.eq'?: number;
    'where.elu.neq'?: number;
    'where.elu.gt'?: number;
    'where.elu.gte'?: number;
    'where.elu.lt'?: number;
    'where.elu.lte'?: number;
    'where.elu.like'?: number;
    'where.elu.ilike'?: number;
    'where.elu.in'?: string;
    'where.elu.nin'?: string;
    'where.elu.contains'?: string;
    'where.elu.contained'?: string;
    'where.elu.overlaps'?: string;
    'where.flamegraphId.eq'?: string;
    'where.flamegraphId.neq'?: string;
    'where.flamegraphId.gt'?: string;
    'where.flamegraphId.gte'?: string;
    'where.flamegraphId.lt'?: string;
    'where.flamegraphId.lte'?: string;
    'where.flamegraphId.like'?: string;
    'where.flamegraphId.ilike'?: string;
    'where.flamegraphId.in'?: string;
    'where.flamegraphId.nin'?: string;
    'where.flamegraphId.contains'?: string;
    'where.flamegraphId.contained'?: string;
    'where.flamegraphId.overlaps'?: string;
    'where.healthHistory.eq'?: string;
    'where.healthHistory.neq'?: string;
    'where.healthHistory.gt'?: string;
    'where.healthHistory.gte'?: string;
    'where.healthHistory.lt'?: string;
    'where.healthHistory.lte'?: string;
    'where.healthHistory.like'?: string;
    'where.healthHistory.ilike'?: string;
    'where.healthHistory.in'?: string;
    'where.healthHistory.nin'?: string;
    'where.healthHistory.contains'?: string;
    'where.healthHistory.contained'?: string;
    'where.healthHistory.overlaps'?: string;
    'where.heapTotal.eq'?: number;
    'where.heapTotal.neq'?: number;
    'where.heapTotal.gt'?: number;
    'where.heapTotal.gte'?: number;
    'where.heapTotal.lt'?: number;
    'where.heapTotal.lte'?: number;
    'where.heapTotal.like'?: number;
    'where.heapTotal.ilike'?: number;
    'where.heapTotal.in'?: string;
    'where.heapTotal.nin'?: string;
    'where.heapTotal.contains'?: string;
    'where.heapTotal.contained'?: string;
    'where.heapTotal.overlaps'?: string;
    'where.heapUsed.eq'?: number;
    'where.heapUsed.neq'?: number;
    'where.heapUsed.gt'?: number;
    'where.heapUsed.gte'?: number;
    'where.heapUsed.lt'?: number;
    'where.heapUsed.lte'?: number;
    'where.heapUsed.like'?: number;
    'where.heapUsed.ilike'?: number;
    'where.heapUsed.in'?: string;
    'where.heapUsed.nin'?: string;
    'where.heapUsed.contains'?: string;
    'where.heapUsed.contained'?: string;
    'where.heapUsed.overlaps'?: string;
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
    'where.scaleEventId.eq'?: string;
    'where.scaleEventId.neq'?: string;
    'where.scaleEventId.gt'?: string;
    'where.scaleEventId.gte'?: string;
    'where.scaleEventId.lt'?: string;
    'where.scaleEventId.lte'?: string;
    'where.scaleEventId.like'?: string;
    'where.scaleEventId.ilike'?: string;
    'where.scaleEventId.in'?: string;
    'where.scaleEventId.nin'?: string;
    'where.scaleEventId.contains'?: string;
    'where.scaleEventId.contained'?: string;
    'where.scaleEventId.overlaps'?: string;
    'where.serviceId.eq'?: string;
    'where.serviceId.neq'?: string;
    'where.serviceId.gt'?: string;
    'where.serviceId.gte'?: string;
    'where.serviceId.lt'?: string;
    'where.serviceId.lte'?: string;
    'where.serviceId.like'?: string;
    'where.serviceId.ilike'?: string;
    'where.serviceId.in'?: string;
    'where.serviceId.nin'?: string;
    'where.serviceId.contains'?: string;
    'where.serviceId.contained'?: string;
    'where.serviceId.overlaps'?: string;
    'where.unhealthy.eq'?: boolean;
    'where.unhealthy.neq'?: boolean;
    'where.unhealthy.gt'?: boolean;
    'where.unhealthy.gte'?: boolean;
    'where.unhealthy.lt'?: boolean;
    'where.unhealthy.lte'?: boolean;
    'where.unhealthy.like'?: boolean;
    'where.unhealthy.ilike'?: boolean;
    'where.unhealthy.in'?: string;
    'where.unhealthy.nin'?: string;
    'where.unhealthy.contains'?: string;
    'where.unhealthy.contained'?: string;
    'where.unhealthy.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'applicationId': string;
    'serviceId': string;
    'machineId': string;
    'elu': number;
    'heapUsed': number;
    'heapTotal': number;
    'unhealthy': boolean;
    'healthHistory'?: object | null;
    'createdAt'?: string | null;
    'scaleEventId'?: string | null;
    'flamegraphId'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateAlertsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'elu'?: number | null; 'heapUsed'?: number | null; 'heapTotal'?: number | null; 'unhealthy'?: boolean | null; 'healthHistory'?: object | null; 'createdAt'?: string | null; 'scaleEventId'?: string | null; 'flamegraphId'?: string | null }>
  export type UpdateAlertsResponses =
    UpdateAlertsResponseOK

  export type GetAlertByIdRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'elu' | 'flamegraphId' | 'healthHistory' | 'heapTotal' | 'heapUsed' | 'id' | 'podId' | 'scaleEventId' | 'serviceId' | 'unhealthy'>;
    'id': string;
  }

  /**
   * A Alert
   */
  export type GetAlertByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'elu'?: number | null; 'heapUsed'?: number | null; 'heapTotal'?: number | null; 'unhealthy'?: boolean | null; 'healthHistory'?: object | null; 'createdAt'?: string | null; 'scaleEventId'?: string | null; 'flamegraphId'?: string | null }
  export type GetAlertByIdResponses =
    GetAlertByIdResponseOK

  export type UpdateAlertRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'elu' | 'flamegraphId' | 'healthHistory' | 'heapTotal' | 'heapUsed' | 'id' | 'podId' | 'scaleEventId' | 'serviceId' | 'unhealthy'>;
    'id': string;
    'applicationId': string;
    'serviceId': string;
    'machineId': string;
    'elu': number;
    'heapUsed': number;
    'heapTotal': number;
    'unhealthy': boolean;
    'healthHistory'?: object | null;
    'createdAt'?: string | null;
    'scaleEventId'?: string | null;
    'flamegraphId'?: string | null;
  }

  /**
   * A Alert
   */
  export type UpdateAlertResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'elu'?: number | null; 'heapUsed'?: number | null; 'heapTotal'?: number | null; 'unhealthy'?: boolean | null; 'healthHistory'?: object | null; 'createdAt'?: string | null; 'scaleEventId'?: string | null; 'flamegraphId'?: string | null }
  export type UpdateAlertResponses =
    UpdateAlertResponseOK

  export type DeleteAlertsRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'elu' | 'flamegraphId' | 'healthHistory' | 'heapTotal' | 'heapUsed' | 'id' | 'podId' | 'scaleEventId' | 'serviceId' | 'unhealthy'>;
    'id': string;
  }

  /**
   * A Alert
   */
  export type DeleteAlertsResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'elu'?: number | null; 'heapUsed'?: number | null; 'heapTotal'?: number | null; 'unhealthy'?: boolean | null; 'healthHistory'?: object | null; 'createdAt'?: string | null; 'scaleEventId'?: string | null; 'flamegraphId'?: string | null }
  export type DeleteAlertsResponses =
    DeleteAlertsResponseOK

  export type GetSignalsForAlertRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'alertId' | 'applicationId' | 'createdAt' | 'description' | 'id' | 'podId' | 'scaleEventId' | 'serviceId' | 'timestamp' | 'type' | 'value'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetSignalsForAlertResponseOK = Array<{ 'id'?: string | null; 'alertId'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'scaleEventId'?: string | null; 'type'?: string | null; 'value'?: number | null; 'timestamp'?: string | null; 'description'?: string | null; 'createdAt'?: string | null }>
  export type GetSignalsForAlertResponses =
    GetSignalsForAlertResponseOK

  export type GetScaleEventForAlertRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'direction' | 'id' | 'reason' | 'replicas' | 'replicasDiff' | 'sync' | 'triggerMetric' | 'triggerService'>;
    'id': string;
  }

  /**
   * A ScaleEvent
   */
  export type GetScaleEventForAlertResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'direction'?: string | null; 'replicas'?: number | null; 'replicasDiff'?: number | null; 'reason'?: string | null; 'sync'?: boolean | null; 'createdAt'?: string | null; 'triggerService'?: string | null; 'triggerMetric'?: string | null }
  export type GetScaleEventForAlertResponses =
    GetScaleEventForAlertResponseOK

  export type GetFlamegraphForAlertRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'flamegraph' | 'id' | 'podId' | 'profileType' | 'serviceId'>;
    'id': string;
  }

  /**
   * A Flamegraph
   */
  export type GetFlamegraphForAlertResponseOK = { 'id'?: string | null; 'flamegraph'?: string | null; 'createdAt'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'profileType'?: string | null; 'applicationId'?: string | null }
  export type GetFlamegraphForAlertResponses =
    GetFlamegraphForAlertResponseOK

  export type GetScaleEventsRequest = {
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
    'fields'?: Array<'applicationId' | 'createdAt' | 'direction' | 'id' | 'reason' | 'replicas' | 'replicasDiff' | 'sync' | 'triggerMetric' | 'triggerService'>;
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
    'where.direction.eq'?: string;
    'where.direction.neq'?: string;
    'where.direction.gt'?: string;
    'where.direction.gte'?: string;
    'where.direction.lt'?: string;
    'where.direction.lte'?: string;
    'where.direction.like'?: string;
    'where.direction.ilike'?: string;
    'where.direction.in'?: string;
    'where.direction.nin'?: string;
    'where.direction.contains'?: string;
    'where.direction.contained'?: string;
    'where.direction.overlaps'?: string;
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
    'where.reason.eq'?: string;
    'where.reason.neq'?: string;
    'where.reason.gt'?: string;
    'where.reason.gte'?: string;
    'where.reason.lt'?: string;
    'where.reason.lte'?: string;
    'where.reason.like'?: string;
    'where.reason.ilike'?: string;
    'where.reason.in'?: string;
    'where.reason.nin'?: string;
    'where.reason.contains'?: string;
    'where.reason.contained'?: string;
    'where.reason.overlaps'?: string;
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
    'where.replicasDiff.eq'?: number;
    'where.replicasDiff.neq'?: number;
    'where.replicasDiff.gt'?: number;
    'where.replicasDiff.gte'?: number;
    'where.replicasDiff.lt'?: number;
    'where.replicasDiff.lte'?: number;
    'where.replicasDiff.like'?: number;
    'where.replicasDiff.ilike'?: number;
    'where.replicasDiff.in'?: string;
    'where.replicasDiff.nin'?: string;
    'where.replicasDiff.contains'?: string;
    'where.replicasDiff.contained'?: string;
    'where.replicasDiff.overlaps'?: string;
    'where.sync.eq'?: boolean;
    'where.sync.neq'?: boolean;
    'where.sync.gt'?: boolean;
    'where.sync.gte'?: boolean;
    'where.sync.lt'?: boolean;
    'where.sync.lte'?: boolean;
    'where.sync.like'?: boolean;
    'where.sync.ilike'?: boolean;
    'where.sync.in'?: string;
    'where.sync.nin'?: string;
    'where.sync.contains'?: string;
    'where.sync.contained'?: string;
    'where.sync.overlaps'?: string;
    'where.triggerMetric.eq'?: string;
    'where.triggerMetric.neq'?: string;
    'where.triggerMetric.gt'?: string;
    'where.triggerMetric.gte'?: string;
    'where.triggerMetric.lt'?: string;
    'where.triggerMetric.lte'?: string;
    'where.triggerMetric.like'?: string;
    'where.triggerMetric.ilike'?: string;
    'where.triggerMetric.in'?: string;
    'where.triggerMetric.nin'?: string;
    'where.triggerMetric.contains'?: string;
    'where.triggerMetric.contained'?: string;
    'where.triggerMetric.overlaps'?: string;
    'where.triggerService.eq'?: string;
    'where.triggerService.neq'?: string;
    'where.triggerService.gt'?: string;
    'where.triggerService.gte'?: string;
    'where.triggerService.lt'?: string;
    'where.triggerService.lte'?: string;
    'where.triggerService.like'?: string;
    'where.triggerService.ilike'?: string;
    'where.triggerService.in'?: string;
    'where.triggerService.nin'?: string;
    'where.triggerService.contains'?: string;
    'where.triggerService.contained'?: string;
    'where.triggerService.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.direction'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.reason'?: 'asc' | 'desc';
    'orderby.replicas'?: 'asc' | 'desc';
    'orderby.replicasDiff'?: 'asc' | 'desc';
    'orderby.sync'?: 'asc' | 'desc';
    'orderby.triggerMetric'?: 'asc' | 'desc';
    'orderby.triggerService'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetScaleEventsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'direction'?: string | null; 'replicas'?: number | null; 'replicasDiff'?: number | null; 'reason'?: string | null; 'sync'?: boolean | null; 'createdAt'?: string | null; 'triggerService'?: string | null; 'triggerMetric'?: string | null }>
  export type GetScaleEventsResponses =
    GetScaleEventsResponseOK

  export type CreateScaleEventRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'direction' | 'id' | 'reason' | 'replicas' | 'replicasDiff' | 'sync' | 'triggerMetric' | 'triggerService'>;
    'id'?: string;
    'applicationId': string;
    'direction': string;
    'replicas': number;
    'replicasDiff': number;
    'reason'?: string | null;
    'sync': boolean;
    'createdAt'?: string | null;
    'triggerService'?: string | null;
    'triggerMetric'?: string | null;
  }

  /**
   * A ScaleEvent
   */
  export type CreateScaleEventResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'direction'?: string | null; 'replicas'?: number | null; 'replicasDiff'?: number | null; 'reason'?: string | null; 'sync'?: boolean | null; 'createdAt'?: string | null; 'triggerService'?: string | null; 'triggerMetric'?: string | null }
  export type CreateScaleEventResponses =
    CreateScaleEventResponseOK

  export type UpdateScaleEventsRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'direction' | 'id' | 'reason' | 'replicas' | 'replicasDiff' | 'sync' | 'triggerMetric' | 'triggerService'>;
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
    'where.direction.eq'?: string;
    'where.direction.neq'?: string;
    'where.direction.gt'?: string;
    'where.direction.gte'?: string;
    'where.direction.lt'?: string;
    'where.direction.lte'?: string;
    'where.direction.like'?: string;
    'where.direction.ilike'?: string;
    'where.direction.in'?: string;
    'where.direction.nin'?: string;
    'where.direction.contains'?: string;
    'where.direction.contained'?: string;
    'where.direction.overlaps'?: string;
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
    'where.reason.eq'?: string;
    'where.reason.neq'?: string;
    'where.reason.gt'?: string;
    'where.reason.gte'?: string;
    'where.reason.lt'?: string;
    'where.reason.lte'?: string;
    'where.reason.like'?: string;
    'where.reason.ilike'?: string;
    'where.reason.in'?: string;
    'where.reason.nin'?: string;
    'where.reason.contains'?: string;
    'where.reason.contained'?: string;
    'where.reason.overlaps'?: string;
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
    'where.replicasDiff.eq'?: number;
    'where.replicasDiff.neq'?: number;
    'where.replicasDiff.gt'?: number;
    'where.replicasDiff.gte'?: number;
    'where.replicasDiff.lt'?: number;
    'where.replicasDiff.lte'?: number;
    'where.replicasDiff.like'?: number;
    'where.replicasDiff.ilike'?: number;
    'where.replicasDiff.in'?: string;
    'where.replicasDiff.nin'?: string;
    'where.replicasDiff.contains'?: string;
    'where.replicasDiff.contained'?: string;
    'where.replicasDiff.overlaps'?: string;
    'where.sync.eq'?: boolean;
    'where.sync.neq'?: boolean;
    'where.sync.gt'?: boolean;
    'where.sync.gte'?: boolean;
    'where.sync.lt'?: boolean;
    'where.sync.lte'?: boolean;
    'where.sync.like'?: boolean;
    'where.sync.ilike'?: boolean;
    'where.sync.in'?: string;
    'where.sync.nin'?: string;
    'where.sync.contains'?: string;
    'where.sync.contained'?: string;
    'where.sync.overlaps'?: string;
    'where.triggerMetric.eq'?: string;
    'where.triggerMetric.neq'?: string;
    'where.triggerMetric.gt'?: string;
    'where.triggerMetric.gte'?: string;
    'where.triggerMetric.lt'?: string;
    'where.triggerMetric.lte'?: string;
    'where.triggerMetric.like'?: string;
    'where.triggerMetric.ilike'?: string;
    'where.triggerMetric.in'?: string;
    'where.triggerMetric.nin'?: string;
    'where.triggerMetric.contains'?: string;
    'where.triggerMetric.contained'?: string;
    'where.triggerMetric.overlaps'?: string;
    'where.triggerService.eq'?: string;
    'where.triggerService.neq'?: string;
    'where.triggerService.gt'?: string;
    'where.triggerService.gte'?: string;
    'where.triggerService.lt'?: string;
    'where.triggerService.lte'?: string;
    'where.triggerService.like'?: string;
    'where.triggerService.ilike'?: string;
    'where.triggerService.in'?: string;
    'where.triggerService.nin'?: string;
    'where.triggerService.contains'?: string;
    'where.triggerService.contained'?: string;
    'where.triggerService.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'applicationId': string;
    'direction': string;
    'replicas': number;
    'replicasDiff': number;
    'reason'?: string | null;
    'sync': boolean;
    'createdAt'?: string | null;
    'triggerService'?: string | null;
    'triggerMetric'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateScaleEventsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'direction'?: string | null; 'replicas'?: number | null; 'replicasDiff'?: number | null; 'reason'?: string | null; 'sync'?: boolean | null; 'createdAt'?: string | null; 'triggerService'?: string | null; 'triggerMetric'?: string | null }>
  export type UpdateScaleEventsResponses =
    UpdateScaleEventsResponseOK

  export type GetScaleEventByIdRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'direction' | 'id' | 'reason' | 'replicas' | 'replicasDiff' | 'sync' | 'triggerMetric' | 'triggerService'>;
    'id': string;
  }

  /**
   * A ScaleEvent
   */
  export type GetScaleEventByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'direction'?: string | null; 'replicas'?: number | null; 'replicasDiff'?: number | null; 'reason'?: string | null; 'sync'?: boolean | null; 'createdAt'?: string | null; 'triggerService'?: string | null; 'triggerMetric'?: string | null }
  export type GetScaleEventByIdResponses =
    GetScaleEventByIdResponseOK

  export type UpdateScaleEventRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'direction' | 'id' | 'reason' | 'replicas' | 'replicasDiff' | 'sync' | 'triggerMetric' | 'triggerService'>;
    'id': string;
    'applicationId': string;
    'direction': string;
    'replicas': number;
    'replicasDiff': number;
    'reason'?: string | null;
    'sync': boolean;
    'createdAt'?: string | null;
    'triggerService'?: string | null;
    'triggerMetric'?: string | null;
  }

  /**
   * A ScaleEvent
   */
  export type UpdateScaleEventResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'direction'?: string | null; 'replicas'?: number | null; 'replicasDiff'?: number | null; 'reason'?: string | null; 'sync'?: boolean | null; 'createdAt'?: string | null; 'triggerService'?: string | null; 'triggerMetric'?: string | null }
  export type UpdateScaleEventResponses =
    UpdateScaleEventResponseOK

  export type DeleteScaleEventsRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'direction' | 'id' | 'reason' | 'replicas' | 'replicasDiff' | 'sync' | 'triggerMetric' | 'triggerService'>;
    'id': string;
  }

  /**
   * A ScaleEvent
   */
  export type DeleteScaleEventsResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'direction'?: string | null; 'replicas'?: number | null; 'replicasDiff'?: number | null; 'reason'?: string | null; 'sync'?: boolean | null; 'createdAt'?: string | null; 'triggerService'?: string | null; 'triggerMetric'?: string | null }
  export type DeleteScaleEventsResponses =
    DeleteScaleEventsResponseOK

  export type GetAlertsForScaleEventRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'applicationId' | 'createdAt' | 'elu' | 'flamegraphId' | 'healthHistory' | 'heapTotal' | 'heapUsed' | 'id' | 'podId' | 'scaleEventId' | 'serviceId' | 'unhealthy'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetAlertsForScaleEventResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'elu'?: number | null; 'heapUsed'?: number | null; 'heapTotal'?: number | null; 'unhealthy'?: boolean | null; 'healthHistory'?: object | null; 'createdAt'?: string | null; 'scaleEventId'?: string | null; 'flamegraphId'?: string | null }>
  export type GetAlertsForScaleEventResponses =
    GetAlertsForScaleEventResponseOK

  export type GetSignalsForScaleEventRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'alertId' | 'applicationId' | 'createdAt' | 'description' | 'id' | 'podId' | 'scaleEventId' | 'serviceId' | 'timestamp' | 'type' | 'value'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetSignalsForScaleEventResponseOK = Array<{ 'id'?: string | null; 'alertId'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'scaleEventId'?: string | null; 'type'?: string | null; 'value'?: number | null; 'timestamp'?: string | null; 'description'?: string | null; 'createdAt'?: string | null }>
  export type GetSignalsForScaleEventResponses =
    GetSignalsForScaleEventResponseOK

  export type GetMetricSnapshotsForScaleEventRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'applicationId' | 'createdAt' | 'data' | 'id' | 'metricName' | 'scaleEventId' | 'serviceId'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetMetricSnapshotsForScaleEventResponseOK = Array<{ 'id'?: string | null; 'scaleEventId'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'metricName'?: string | null; 'data'?: object | null; 'createdAt'?: string | null }>
  export type GetMetricSnapshotsForScaleEventResponses =
    GetMetricSnapshotsForScaleEventResponseOK

  export type GetSignalsRequest = {
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
    'fields'?: Array<'alertId' | 'applicationId' | 'createdAt' | 'description' | 'id' | 'podId' | 'scaleEventId' | 'serviceId' | 'timestamp' | 'type' | 'value'>;
    'where.alertId.eq'?: string;
    'where.alertId.neq'?: string;
    'where.alertId.gt'?: string;
    'where.alertId.gte'?: string;
    'where.alertId.lt'?: string;
    'where.alertId.lte'?: string;
    'where.alertId.like'?: string;
    'where.alertId.ilike'?: string;
    'where.alertId.in'?: string;
    'where.alertId.nin'?: string;
    'where.alertId.contains'?: string;
    'where.alertId.contained'?: string;
    'where.alertId.overlaps'?: string;
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
    'where.description.eq'?: string;
    'where.description.neq'?: string;
    'where.description.gt'?: string;
    'where.description.gte'?: string;
    'where.description.lt'?: string;
    'where.description.lte'?: string;
    'where.description.like'?: string;
    'where.description.ilike'?: string;
    'where.description.in'?: string;
    'where.description.nin'?: string;
    'where.description.contains'?: string;
    'where.description.contained'?: string;
    'where.description.overlaps'?: string;
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
    'where.scaleEventId.eq'?: string;
    'where.scaleEventId.neq'?: string;
    'where.scaleEventId.gt'?: string;
    'where.scaleEventId.gte'?: string;
    'where.scaleEventId.lt'?: string;
    'where.scaleEventId.lte'?: string;
    'where.scaleEventId.like'?: string;
    'where.scaleEventId.ilike'?: string;
    'where.scaleEventId.in'?: string;
    'where.scaleEventId.nin'?: string;
    'where.scaleEventId.contains'?: string;
    'where.scaleEventId.contained'?: string;
    'where.scaleEventId.overlaps'?: string;
    'where.serviceId.eq'?: string;
    'where.serviceId.neq'?: string;
    'where.serviceId.gt'?: string;
    'where.serviceId.gte'?: string;
    'where.serviceId.lt'?: string;
    'where.serviceId.lte'?: string;
    'where.serviceId.like'?: string;
    'where.serviceId.ilike'?: string;
    'where.serviceId.in'?: string;
    'where.serviceId.nin'?: string;
    'where.serviceId.contains'?: string;
    'where.serviceId.contained'?: string;
    'where.serviceId.overlaps'?: string;
    'where.timestamp.eq'?: string;
    'where.timestamp.neq'?: string;
    'where.timestamp.gt'?: string;
    'where.timestamp.gte'?: string;
    'where.timestamp.lt'?: string;
    'where.timestamp.lte'?: string;
    'where.timestamp.like'?: string;
    'where.timestamp.ilike'?: string;
    'where.timestamp.in'?: string;
    'where.timestamp.nin'?: string;
    'where.timestamp.contains'?: string;
    'where.timestamp.contained'?: string;
    'where.timestamp.overlaps'?: string;
    'where.type.eq'?: string;
    'where.type.neq'?: string;
    'where.type.gt'?: string;
    'where.type.gte'?: string;
    'where.type.lt'?: string;
    'where.type.lte'?: string;
    'where.type.like'?: string;
    'where.type.ilike'?: string;
    'where.type.in'?: string;
    'where.type.nin'?: string;
    'where.type.contains'?: string;
    'where.type.contained'?: string;
    'where.type.overlaps'?: string;
    'where.value.eq'?: number;
    'where.value.neq'?: number;
    'where.value.gt'?: number;
    'where.value.gte'?: number;
    'where.value.lt'?: number;
    'where.value.lte'?: number;
    'where.value.like'?: number;
    'where.value.ilike'?: number;
    'where.value.in'?: string;
    'where.value.nin'?: string;
    'where.value.contains'?: string;
    'where.value.contained'?: string;
    'where.value.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.alertId'?: 'asc' | 'desc';
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.description'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.podId'?: 'asc' | 'desc';
    'orderby.scaleEventId'?: 'asc' | 'desc';
    'orderby.serviceId'?: 'asc' | 'desc';
    'orderby.timestamp'?: 'asc' | 'desc';
    'orderby.type'?: 'asc' | 'desc';
    'orderby.value'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetSignalsResponseOK = Array<{ 'id'?: string | null; 'alertId'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'scaleEventId'?: string | null; 'type'?: string | null; 'value'?: number | null; 'timestamp'?: string | null; 'description'?: string | null; 'createdAt'?: string | null }>
  export type GetSignalsResponses =
    GetSignalsResponseOK

  export type UpdateSignalsRequest = {
    'fields'?: Array<'alertId' | 'applicationId' | 'createdAt' | 'description' | 'id' | 'podId' | 'scaleEventId' | 'serviceId' | 'timestamp' | 'type' | 'value'>;
    'where.alertId.eq'?: string;
    'where.alertId.neq'?: string;
    'where.alertId.gt'?: string;
    'where.alertId.gte'?: string;
    'where.alertId.lt'?: string;
    'where.alertId.lte'?: string;
    'where.alertId.like'?: string;
    'where.alertId.ilike'?: string;
    'where.alertId.in'?: string;
    'where.alertId.nin'?: string;
    'where.alertId.contains'?: string;
    'where.alertId.contained'?: string;
    'where.alertId.overlaps'?: string;
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
    'where.description.eq'?: string;
    'where.description.neq'?: string;
    'where.description.gt'?: string;
    'where.description.gte'?: string;
    'where.description.lt'?: string;
    'where.description.lte'?: string;
    'where.description.like'?: string;
    'where.description.ilike'?: string;
    'where.description.in'?: string;
    'where.description.nin'?: string;
    'where.description.contains'?: string;
    'where.description.contained'?: string;
    'where.description.overlaps'?: string;
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
    'where.scaleEventId.eq'?: string;
    'where.scaleEventId.neq'?: string;
    'where.scaleEventId.gt'?: string;
    'where.scaleEventId.gte'?: string;
    'where.scaleEventId.lt'?: string;
    'where.scaleEventId.lte'?: string;
    'where.scaleEventId.like'?: string;
    'where.scaleEventId.ilike'?: string;
    'where.scaleEventId.in'?: string;
    'where.scaleEventId.nin'?: string;
    'where.scaleEventId.contains'?: string;
    'where.scaleEventId.contained'?: string;
    'where.scaleEventId.overlaps'?: string;
    'where.serviceId.eq'?: string;
    'where.serviceId.neq'?: string;
    'where.serviceId.gt'?: string;
    'where.serviceId.gte'?: string;
    'where.serviceId.lt'?: string;
    'where.serviceId.lte'?: string;
    'where.serviceId.like'?: string;
    'where.serviceId.ilike'?: string;
    'where.serviceId.in'?: string;
    'where.serviceId.nin'?: string;
    'where.serviceId.contains'?: string;
    'where.serviceId.contained'?: string;
    'where.serviceId.overlaps'?: string;
    'where.timestamp.eq'?: string;
    'where.timestamp.neq'?: string;
    'where.timestamp.gt'?: string;
    'where.timestamp.gte'?: string;
    'where.timestamp.lt'?: string;
    'where.timestamp.lte'?: string;
    'where.timestamp.like'?: string;
    'where.timestamp.ilike'?: string;
    'where.timestamp.in'?: string;
    'where.timestamp.nin'?: string;
    'where.timestamp.contains'?: string;
    'where.timestamp.contained'?: string;
    'where.timestamp.overlaps'?: string;
    'where.type.eq'?: string;
    'where.type.neq'?: string;
    'where.type.gt'?: string;
    'where.type.gte'?: string;
    'where.type.lt'?: string;
    'where.type.lte'?: string;
    'where.type.like'?: string;
    'where.type.ilike'?: string;
    'where.type.in'?: string;
    'where.type.nin'?: string;
    'where.type.contains'?: string;
    'where.type.contained'?: string;
    'where.type.overlaps'?: string;
    'where.value.eq'?: number;
    'where.value.neq'?: number;
    'where.value.gt'?: number;
    'where.value.gte'?: number;
    'where.value.lt'?: number;
    'where.value.lte'?: number;
    'where.value.like'?: number;
    'where.value.ilike'?: number;
    'where.value.in'?: string;
    'where.value.nin'?: string;
    'where.value.contains'?: string;
    'where.value.contained'?: string;
    'where.value.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'alertId'?: string | null;
    'applicationId': string;
    'serviceId': string;
    'machineId': string;
    'scaleEventId'?: string | null;
    'type': string;
    'value'?: number | null;
    'timestamp': string;
    'description'?: string | null;
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateSignalsResponseOK = Array<{ 'id'?: string | null; 'alertId'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'scaleEventId'?: string | null; 'type'?: string | null; 'value'?: number | null; 'timestamp'?: string | null; 'description'?: string | null; 'createdAt'?: string | null }>
  export type UpdateSignalsResponses =
    UpdateSignalsResponseOK

  export type GetSignalByIdRequest = {
    'fields'?: Array<'alertId' | 'applicationId' | 'createdAt' | 'description' | 'id' | 'podId' | 'scaleEventId' | 'serviceId' | 'timestamp' | 'type' | 'value'>;
    'id': string;
  }

  /**
   * A Signal
   */
  export type GetSignalByIdResponseOK = { 'id'?: string | null; 'alertId'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'scaleEventId'?: string | null; 'type'?: string | null; 'value'?: number | null; 'timestamp'?: string | null; 'description'?: string | null; 'createdAt'?: string | null }
  export type GetSignalByIdResponses =
    GetSignalByIdResponseOK

  export type UpdateSignalRequest = {
    'fields'?: Array<'alertId' | 'applicationId' | 'createdAt' | 'description' | 'id' | 'podId' | 'scaleEventId' | 'serviceId' | 'timestamp' | 'type' | 'value'>;
    'id': string;
    'alertId'?: string | null;
    'applicationId': string;
    'serviceId': string;
    'machineId': string;
    'scaleEventId'?: string | null;
    'type': string;
    'value'?: number | null;
    'timestamp': string;
    'description'?: string | null;
    'createdAt'?: string | null;
  }

  /**
   * A Signal
   */
  export type UpdateSignalResponseOK = { 'id'?: string | null; 'alertId'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'scaleEventId'?: string | null; 'type'?: string | null; 'value'?: number | null; 'timestamp'?: string | null; 'description'?: string | null; 'createdAt'?: string | null }
  export type UpdateSignalResponses =
    UpdateSignalResponseOK

  export type DeleteSignalsRequest = {
    'fields'?: Array<'alertId' | 'applicationId' | 'createdAt' | 'description' | 'id' | 'podId' | 'scaleEventId' | 'serviceId' | 'timestamp' | 'type' | 'value'>;
    'id': string;
  }

  /**
   * A Signal
   */
  export type DeleteSignalsResponseOK = { 'id'?: string | null; 'alertId'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'scaleEventId'?: string | null; 'type'?: string | null; 'value'?: number | null; 'timestamp'?: string | null; 'description'?: string | null; 'createdAt'?: string | null }
  export type DeleteSignalsResponses =
    DeleteSignalsResponseOK

  export type GetAlertForSignalRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'elu' | 'flamegraphId' | 'healthHistory' | 'heapTotal' | 'heapUsed' | 'id' | 'podId' | 'scaleEventId' | 'serviceId' | 'unhealthy'>;
    'id': string;
  }

  /**
   * A Alert
   */
  export type GetAlertForSignalResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'podId'?: string | null; 'elu'?: number | null; 'heapUsed'?: number | null; 'heapTotal'?: number | null; 'unhealthy'?: boolean | null; 'healthHistory'?: object | null; 'createdAt'?: string | null; 'scaleEventId'?: string | null; 'flamegraphId'?: string | null }
  export type GetAlertForSignalResponses =
    GetAlertForSignalResponseOK

  export type GetScaleEventForSignalRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'direction' | 'id' | 'reason' | 'replicas' | 'replicasDiff' | 'sync' | 'triggerMetric' | 'triggerService'>;
    'id': string;
  }

  /**
   * A ScaleEvent
   */
  export type GetScaleEventForSignalResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'direction'?: string | null; 'replicas'?: number | null; 'replicasDiff'?: number | null; 'reason'?: string | null; 'sync'?: boolean | null; 'createdAt'?: string | null; 'triggerService'?: string | null; 'triggerMetric'?: string | null }
  export type GetScaleEventForSignalResponses =
    GetScaleEventForSignalResponseOK

  export type GetMetricSnapshotsRequest = {
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
    'fields'?: Array<'applicationId' | 'createdAt' | 'data' | 'id' | 'metricName' | 'scaleEventId' | 'serviceId'>;
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
    'where.data.eq'?: string;
    'where.data.neq'?: string;
    'where.data.gt'?: string;
    'where.data.gte'?: string;
    'where.data.lt'?: string;
    'where.data.lte'?: string;
    'where.data.like'?: string;
    'where.data.ilike'?: string;
    'where.data.in'?: string;
    'where.data.nin'?: string;
    'where.data.contains'?: string;
    'where.data.contained'?: string;
    'where.data.overlaps'?: string;
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
    'where.metricName.eq'?: string;
    'where.metricName.neq'?: string;
    'where.metricName.gt'?: string;
    'where.metricName.gte'?: string;
    'where.metricName.lt'?: string;
    'where.metricName.lte'?: string;
    'where.metricName.like'?: string;
    'where.metricName.ilike'?: string;
    'where.metricName.in'?: string;
    'where.metricName.nin'?: string;
    'where.metricName.contains'?: string;
    'where.metricName.contained'?: string;
    'where.metricName.overlaps'?: string;
    'where.scaleEventId.eq'?: string;
    'where.scaleEventId.neq'?: string;
    'where.scaleEventId.gt'?: string;
    'where.scaleEventId.gte'?: string;
    'where.scaleEventId.lt'?: string;
    'where.scaleEventId.lte'?: string;
    'where.scaleEventId.like'?: string;
    'where.scaleEventId.ilike'?: string;
    'where.scaleEventId.in'?: string;
    'where.scaleEventId.nin'?: string;
    'where.scaleEventId.contains'?: string;
    'where.scaleEventId.contained'?: string;
    'where.scaleEventId.overlaps'?: string;
    'where.serviceId.eq'?: string;
    'where.serviceId.neq'?: string;
    'where.serviceId.gt'?: string;
    'where.serviceId.gte'?: string;
    'where.serviceId.lt'?: string;
    'where.serviceId.lte'?: string;
    'where.serviceId.like'?: string;
    'where.serviceId.ilike'?: string;
    'where.serviceId.in'?: string;
    'where.serviceId.nin'?: string;
    'where.serviceId.contains'?: string;
    'where.serviceId.contained'?: string;
    'where.serviceId.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.data'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.metricName'?: 'asc' | 'desc';
    'orderby.scaleEventId'?: 'asc' | 'desc';
    'orderby.serviceId'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetMetricSnapshotsResponseOK = Array<{ 'id'?: string | null; 'scaleEventId'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'metricName'?: string | null; 'data'?: object | null; 'createdAt'?: string | null }>
  export type GetMetricSnapshotsResponses =
    GetMetricSnapshotsResponseOK

  export type CreateMetricSnapshotRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'data' | 'id' | 'metricName' | 'scaleEventId' | 'serviceId'>;
    'id'?: string;
    'scaleEventId': string;
    'applicationId': string;
    'serviceId': string;
    'metricName': string;
    'data': object;
    'createdAt'?: string | null;
  }

  /**
   * A MetricSnapshot
   */
  export type CreateMetricSnapshotResponseOK = { 'id'?: string | null; 'scaleEventId'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'metricName'?: string | null; 'data'?: object | null; 'createdAt'?: string | null }
  export type CreateMetricSnapshotResponses =
    CreateMetricSnapshotResponseOK

  export type UpdateMetricSnapshotsRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'data' | 'id' | 'metricName' | 'scaleEventId' | 'serviceId'>;
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
    'where.data.eq'?: string;
    'where.data.neq'?: string;
    'where.data.gt'?: string;
    'where.data.gte'?: string;
    'where.data.lt'?: string;
    'where.data.lte'?: string;
    'where.data.like'?: string;
    'where.data.ilike'?: string;
    'where.data.in'?: string;
    'where.data.nin'?: string;
    'where.data.contains'?: string;
    'where.data.contained'?: string;
    'where.data.overlaps'?: string;
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
    'where.metricName.eq'?: string;
    'where.metricName.neq'?: string;
    'where.metricName.gt'?: string;
    'where.metricName.gte'?: string;
    'where.metricName.lt'?: string;
    'where.metricName.lte'?: string;
    'where.metricName.like'?: string;
    'where.metricName.ilike'?: string;
    'where.metricName.in'?: string;
    'where.metricName.nin'?: string;
    'where.metricName.contains'?: string;
    'where.metricName.contained'?: string;
    'where.metricName.overlaps'?: string;
    'where.scaleEventId.eq'?: string;
    'where.scaleEventId.neq'?: string;
    'where.scaleEventId.gt'?: string;
    'where.scaleEventId.gte'?: string;
    'where.scaleEventId.lt'?: string;
    'where.scaleEventId.lte'?: string;
    'where.scaleEventId.like'?: string;
    'where.scaleEventId.ilike'?: string;
    'where.scaleEventId.in'?: string;
    'where.scaleEventId.nin'?: string;
    'where.scaleEventId.contains'?: string;
    'where.scaleEventId.contained'?: string;
    'where.scaleEventId.overlaps'?: string;
    'where.serviceId.eq'?: string;
    'where.serviceId.neq'?: string;
    'where.serviceId.gt'?: string;
    'where.serviceId.gte'?: string;
    'where.serviceId.lt'?: string;
    'where.serviceId.lte'?: string;
    'where.serviceId.like'?: string;
    'where.serviceId.ilike'?: string;
    'where.serviceId.in'?: string;
    'where.serviceId.nin'?: string;
    'where.serviceId.contains'?: string;
    'where.serviceId.contained'?: string;
    'where.serviceId.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'scaleEventId': string;
    'applicationId': string;
    'serviceId': string;
    'metricName': string;
    'data': object;
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateMetricSnapshotsResponseOK = Array<{ 'id'?: string | null; 'scaleEventId'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'metricName'?: string | null; 'data'?: object | null; 'createdAt'?: string | null }>
  export type UpdateMetricSnapshotsResponses =
    UpdateMetricSnapshotsResponseOK

  export type GetMetricSnapshotByIdRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'data' | 'id' | 'metricName' | 'scaleEventId' | 'serviceId'>;
    'id': string;
  }

  /**
   * A MetricSnapshot
   */
  export type GetMetricSnapshotByIdResponseOK = { 'id'?: string | null; 'scaleEventId'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'metricName'?: string | null; 'data'?: object | null; 'createdAt'?: string | null }
  export type GetMetricSnapshotByIdResponses =
    GetMetricSnapshotByIdResponseOK

  export type UpdateMetricSnapshotRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'data' | 'id' | 'metricName' | 'scaleEventId' | 'serviceId'>;
    'id': string;
    'scaleEventId': string;
    'applicationId': string;
    'serviceId': string;
    'metricName': string;
    'data': object;
    'createdAt'?: string | null;
  }

  /**
   * A MetricSnapshot
   */
  export type UpdateMetricSnapshotResponseOK = { 'id'?: string | null; 'scaleEventId'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'metricName'?: string | null; 'data'?: object | null; 'createdAt'?: string | null }
  export type UpdateMetricSnapshotResponses =
    UpdateMetricSnapshotResponseOK

  export type DeleteMetricSnapshotsRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'data' | 'id' | 'metricName' | 'scaleEventId' | 'serviceId'>;
    'id': string;
  }

  /**
   * A MetricSnapshot
   */
  export type DeleteMetricSnapshotsResponseOK = { 'id'?: string | null; 'scaleEventId'?: string | null; 'applicationId'?: string | null; 'serviceId'?: string | null; 'metricName'?: string | null; 'data'?: object | null; 'createdAt'?: string | null }
  export type DeleteMetricSnapshotsResponses =
    DeleteMetricSnapshotsResponseOK

  export type GetScaleEventForMetricSnapshotRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'direction' | 'id' | 'reason' | 'replicas' | 'replicasDiff' | 'sync' | 'triggerMetric' | 'triggerService'>;
    'id': string;
  }

  /**
   * A ScaleEvent
   */
  export type GetScaleEventForMetricSnapshotResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'direction'?: string | null; 'replicas'?: number | null; 'replicasDiff'?: number | null; 'reason'?: string | null; 'sync'?: boolean | null; 'createdAt'?: string | null; 'triggerService'?: string | null; 'triggerMetric'?: string | null }
  export type GetScaleEventForMetricSnapshotResponses =
    GetScaleEventForMetricSnapshotResponseOK

  export type PostAlertsRequest = {
    'applicationId'?: string;
    'alert': { 'id'?: string; 'service'?: string; 'currentHealth'?: { 'elu'?: number; 'heapUsed'?: number; 'heapTotal'?: number }; 'unhealthy'?: boolean; 'timestamp'?: string };
    'healthHistory': Array<{ 'id'?: string; 'service'?: string; 'currentHealth'?: { 'elu'?: number; 'heapUsed'?: number; 'heapTotal'?: number }; 'unhealthy'?: boolean; 'timestamp'?: string }>;
  }

  export type PostAlertsResponseOK = unknown
  export type PostAlertsResponses =
    FullResponse<PostAlertsResponseOK, 200>

  export type PutControllersNamespaceK8SControllerIdScalingDisabledRequest = {
    'namespace': string;
    'k8sControllerId': string;
    'disabled': boolean;
  }

  export type PutControllersNamespaceK8SControllerIdScalingDisabledResponseOK = unknown
  export type PutControllersNamespaceK8SControllerIdScalingDisabledResponses =
    FullResponse<PutControllersNamespaceK8SControllerIdScalingDisabledResponseOK, 200>

  export type SaveMachineControllerRequest = {
    'applicationId': string;
    'deploymentId': string;
    'namespace': string;
    'machineId': string;
  }

  export type SaveMachineControllerResponseOK = unknown
  export type SaveMachineControllerResponses =
    FullResponse<SaveMachineControllerResponseOK, 200>

  export type PostFlamegraphsRequestsRequest = {
    'type': string;
    'applicationId': string;
    'serviceIds': Array<string>;
  }

  export type PostFlamegraphsRequestsResponseOK = unknown
  export type PostFlamegraphsRequestsResponses =
    FullResponse<PostFlamegraphsRequestsResponseOK, 200>

  export type GetFlamegraphsRequest = {
    'applicationId'?: string;
    'limit'?: number;
    'offset'?: number;
  }

  /**
   * Default Response
   */
  export type GetFlamegraphsResponseOK = { 'flamegraphs'?: Array<{ 'id'?: string; 'applicationId'?: string; 'serviceId'?: string; 'podId'?: string; 'type'?: string; 'alertsCount'?: number; 'createdAt'?: string }>; 'total'?: number }
  export type GetFlamegraphsResponses =
    GetFlamegraphsResponseOK

  export type PostPodsPodIdServicesServiceIdFlamegraphRequest = {
    'alertId'?: string;
    'profileType'?: 'cpu' | 'heap';
    'machineId': string;
    'serviceId': string;
  }

  export type PostPodsPodIdServicesServiceIdFlamegraphResponseOK = unknown
  export type PostPodsPodIdServicesServiceIdFlamegraphResponses =
    FullResponse<PostPodsPodIdServicesServiceIdFlamegraphResponseOK, 200>

  export type PostFlamegraphsFlamegraphIdAlertsRequest = {
    'flamegraphId': string;
    'alertIds': Array<string>;
  }

  export type PostFlamegraphsFlamegraphIdAlertsResponseOK = unknown
  export type PostFlamegraphsFlamegraphIdAlertsResponses =
    FullResponse<PostFlamegraphsFlamegraphIdAlertsResponseOK, 200>

  export type GetFlamegraphsIdDownloadRequest = {
    'id': string;
  }

  export type GetFlamegraphsIdDownloadResponseOK = unknown
  export type GetFlamegraphsIdDownloadResponses =
    FullResponse<GetFlamegraphsIdDownloadResponseOK, 200>

  export type PostFlamegraphsStatesRequest = {
    'applicationId': string;
    'machineId': string;
    'expiresIn'?: number;
    'states': Array<object>;
  }

  export type PostFlamegraphsStatesResponseOK = unknown
  export type PostFlamegraphsStatesResponses =
    FullResponse<PostFlamegraphsStatesResponseOK, 200>

  export type GetFlamegraphsStatesRequest = {
    'applicationId': string;
  }

  export type GetFlamegraphsStatesResponseOK = unknown
  export type GetFlamegraphsStatesResponses =
    FullResponse<GetFlamegraphsStatesResponseOK, 200>

  export type PostConnectRequest = {
    'applicationId': string;
    'machineId': string;
    'namespace': string;
    'runtimeId': string;
    'timestamp'?: number;
  }

  /**
   * Default Response
   */
  export type PostConnectResponseOK = { 'success'?: boolean }
  export type PostConnectResponses =
    PostConnectResponseOK

  export type PostReadyRequest = {
    'applicationId': string;
    'runtimeId': string;
    'timestamp': number;
  }

  /**
   * Default Response
   */
  export type PostReadyResponseOK = { 'success'?: boolean }
  export type PostReadyResponses =
    PostReadyResponseOK

  export type PostDisconnectRequest = {
    'applicationId': string;
    'machineId': string;
    'namespace': string;
    'runtimeId': string;
    'timestamp'?: number;
  }

  /**
   * Default Response
   */
  export type PostDisconnectResponseOK = { 'success'?: boolean }
  export type PostDisconnectResponses =
    PostDisconnectResponseOK

  export type GetApplicationPredictionsRequest = {
    'applicationId': string;
  }

  /**
   * Default Response
   */
  export type GetApplicationPredictionsResponseOK = { 'applicationId': string; 'predictions': Array<{ 'timeOfDay'?: number; 'absoluteTime'?: number; 'action'?: string; 'pods'?: number; 'confidence'?: number; 'reasons'?: Array<string>; 'applicationId'?: string }> }
  export type GetApplicationPredictionsResponses =
    GetApplicationPredictionsResponseOK

  export type GetAllPredictionsRequest = {
    
  }

  /**
   * Default Response
   */
  export type GetAllPredictionsResponseOK = { 'predictions': Array<{ 'timeOfDay'?: number; 'absoluteTime'?: number; 'action'?: string; 'pods'?: number; 'confidence'?: number; 'reasons'?: Array<string>; 'applicationId'?: string }>; 'totalPredictions': number; 'nextPrediction'?: { 'timeOfDay'?: number; 'absoluteTime'?: number; 'action'?: string; 'pods'?: number; 'confidence'?: number; 'reasons'?: Array<string>; 'applicationId'?: string } | null }
  export type GetAllPredictionsResponses =
    GetAllPredictionsResponseOK

  export type CalculatePredictionsRequest = {
    
  }

  /**
   * Default Response
   */
  export type CalculatePredictionsResponseOK = { 'success': boolean; 'processedApplications': number; 'totalPredictions': number; 'errors'?: Array<{ 'applicationId'?: string; 'error'?: string }> }
  export type CalculatePredictionsResponses =
    CalculatePredictionsResponseOK

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

  export type GetScaleEventsScaleEventIdMetricsRequest = {
    'scaleEventId': string;
  }

  /**
   * Default Response
   */
  export type GetScaleEventsScaleEventIdMetricsResponseOK = { 'scaleEventId'?: string; 'applicationId'?: string; 'alertTime'?: string; 'podId'?: string; 'metrics'?: { 'elu'?: Array<{ 'timestamp'?: number; 'value'?: number }>; 'heapUsed'?: Array<{ 'timestamp'?: number; 'value'?: number }>; 'heapTotal'?: Array<{ 'timestamp'?: number; 'value'?: number }> } }
  /**
   * Default Response
   */
  export type GetScaleEventsScaleEventIdMetricsResponseNotFound = { 'message'?: string }
  export type GetScaleEventsScaleEventIdMetricsResponses =
    GetScaleEventsScaleEventIdMetricsResponseOK
    | GetScaleEventsScaleEventIdMetricsResponseNotFound

  export type GetAlertsAlertIdMetricsRequest = {
    'alertId': string;
  }

  /**
   * Default Response
   */
  export type GetAlertsAlertIdMetricsResponseOK = { 'alertId'?: string; 'applicationId'?: string; 'alertTime'?: string; 'podId'?: string; 'metrics'?: { 'elu'?: Array<{ 'timestamp'?: number; 'value'?: number }>; 'heapUsed'?: Array<{ 'timestamp'?: number; 'value'?: number }>; 'heapTotal'?: Array<{ 'timestamp'?: number; 'value'?: number }> } }
  /**
   * Default Response
   */
  export type GetAlertsAlertIdMetricsResponseNotFound = { 'message'?: string }
  export type GetAlertsAlertIdMetricsResponses =
    GetAlertsAlertIdMetricsResponseOK
    | GetAlertsAlertIdMetricsResponseNotFound

  export type PostSignalsRequest = {
    'applicationId': string;
    'runtimeId': string;
    'batchStartedAt'?: number;
    'signals': Record<string, unknown>;
  }

  /**
   * Default Response
   */
  export type PostSignalsResponseOK = { 'alerts'?: Array<{ 'serviceId': string; 'workerId': string; 'alertId': string }> }
  export type PostSignalsResponses =
    PostSignalsResponseOK

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
