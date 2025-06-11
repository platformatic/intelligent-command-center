'use strict'

const getAppFilter = (appId) => appId ? `applicationId="${appId}"` : ''

// Averate resident memory usage across all pods
// TEMPORARY: we should sum up the RSS of all the services by `instanceId` but currently every service return the same global RSS value.
// So we use the `max` to get the value for the whole pod, and then the average across all pods.
// Ref https://github.com/platformatic/platformatic/issues/3332
const createRSSMemoryQuery = ({ appId }) =>
  `avg(max by (instanceId) (process_resident_memory_bytes{${getAppFilter(appId)}}))`

const createTotalHEAPMemoryQuery = ({ appId }) =>
  `avg(sum by (instanceId) (nodejs_heap_size_total_bytes{${getAppFilter(appId)}}))`

const createUsedHEAPMemoryQuery = ({ appId }) =>
  `avg(sum by (instanceId) (nodejs_heap_size_used_bytes{${getAppFilter(appId)}}))`

// The CPU usage is the same for all the services in the same pod, so we can use the `max` to get the value for the whole pod.
const createCPUQuery = ({ appId }) =>
  `avg(max by (instanceId) (process_cpu_percent_usage{${getAppFilter(appId)}}))`

const createEventLoopQuery = ({ appId }) =>
  `avg(max by(instanceId) (nodejs_eventloop_utilization{${getAppFilter(appId)}}))`

// quantile as fraction, so 0.95 for 95th percentile
const createLatencyQuery = ({ appId, quantile, entrypoint }) =>
  `avg(avg by(instanceId)(http_request_all_summary_seconds{${getAppFilter(appId)}, serviceId="${entrypoint}", quantile="${quantile}"}))`

// We should have one value for the whole process. Given that we get one value per service, uses the `max`.
const createRSSMemoryPodQuery = ({ podId, timeWindow }) =>
  `max(avg_over_time(process_resident_memory_bytes{instanceId="${podId}"}[${timeWindow}]))`

const createTotalHEAPMemoryPodQuery = ({ podId, timeWindow }) =>
  `sum(avg_over_time(nodejs_heap_size_total_bytes{instanceId="${podId}"}[${timeWindow}]))`

const createUsedHEAPMemoryPodQuery = ({ podId, timeWindow }) =>
  `sum(avg_over_time(nodejs_heap_size_used_bytes{instanceId="${podId}"}[${timeWindow}]))`

const createMemoryLimitPodQuery = (podId) =>
  `kube_pod_container_resource_limits{resource="memory", pod="${podId}"}`

// in cores
const createCPUPodQuery = ({ podId }) =>
  `sum(rate(container_cpu_usage_seconds_total{container!="", pod="${podId}"}[1m]))`

// number of cores
const createAllocatedCPUPodQuery = ({ podId }) =>
  `kube_pod_container_resource_limits{resource="cpu", pod="${podId}}"}`

const createEventLoopPodQuery = ({ podId }) =>
  `max(nodejs_eventloop_utilization{instanceId="${podId}"})`

// NOTE: the >0 check ensures that only routes in the timeWindow are included in the average,
// otherwise this will return NaN because all requests in the data are included, even if not hit

const createRequestLatencyQuery = ({ applicationId, timeWindow }) =>
  `avg(
    (
      rate(http_request_all_duration_seconds_sum[${timeWindow}])
      * on(pod) group_left(label_platformatic_dev_application_id)
      kube_pod_labels{label_platformatic_dev_application_id="${applicationId}"}
    ) / (
      rate(http_request_all_duration_seconds_count[${timeWindow}])
      * on(pod) group_left(label_platformatic_dev_application_id)
      kube_pod_labels{label_platformatic_dev_application_id="${applicationId}"}
    ) > 0
  )`

const createRequestPerSecondQuery = ({ applicationId, timeWindow }) =>
  `avg(
    rate(http_request_all_summary_seconds_count[${timeWindow}])
    * on(pod) group_left(label_platformatic_dev_application_id)
    kube_pod_labels{label_platformatic_dev_application_id="${applicationId}"} > 0
  )`

module.exports = {
  createRSSMemoryQuery,
  createTotalHEAPMemoryQuery,
  createUsedHEAPMemoryQuery,
  createCPUQuery,
  createEventLoopQuery,
  createLatencyQuery,
  createRSSMemoryPodQuery,
  createTotalHEAPMemoryPodQuery,
  createUsedHEAPMemoryPodQuery,
  createMemoryLimitPodQuery,
  createCPUPodQuery,
  createAllocatedCPUPodQuery,
  createEventLoopPodQuery,
  createRequestPerSecondQuery,
  createRequestLatencyQuery
}
