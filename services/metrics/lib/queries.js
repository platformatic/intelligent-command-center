'use strict'

const getAppFilter = (appId) => appId ? `applicationId="${appId}"` : ''

// Filter a metric to one version's pods. A version is a distinct workload
// (Deployment/Service) whose pods carry `app.kubernetes.io/instance=<workload>`
// (the version registry's controllerName). We join on that label, NOT on
// `plt.dev/version`: the latter is not exposed by kube-state-metrics and is
// absent entirely on image-derived (no explicit --version) deploys, so joining
// on it silently returns empty. `instance` is the workload/controller name.
const withInstanceFilter = (metricExpr, instance) => {
  if (!instance) return metricExpr
  return `(${metricExpr} * on(instanceId) group_left() label_replace(kube_pod_labels{label_app_kubernetes_io_instance="${instance}"}, "instanceId", "$1", "pod", "(.*)"))`
}

// Averate resident memory usage across all pods
// TEMPORARY: we should sum up the RSS of all the services by `instanceId` but currently every service return the same global RSS value.
// So we use the `max` to get the value for the whole pod, and then the average across all pods.
// Ref https://github.com/platformatic/platformatic/issues/3332
const createRSSMemoryQuery = ({ appId, instance }) =>
  `avg(max by (instanceId) (${withInstanceFilter(`process_resident_memory_bytes{${getAppFilter(appId)}}`, instance)}))`

const createTotalHEAPMemoryQuery = ({ appId, instance }) =>
  `avg(sum by (instanceId) (${withInstanceFilter(`nodejs_heap_size_total_bytes{${getAppFilter(appId)}}`, instance)}))`

const createUsedHEAPMemoryQuery = ({ appId, instance }) =>
  `avg(sum by (instanceId) (${withInstanceFilter(`nodejs_heap_size_used_bytes{${getAppFilter(appId)}}`, instance)}))`

// Whole-application CPU as a percentage of the pod's CPU limit (falling back to
// the CPU request when no limit is set), averaged across the application's pods.
//
// We must NOT use process_cpu_percent_usage here: it is computed from os.cpus()
// and is therefore node-wide (identical for every pod on the node), so it cannot
// represent a single application. The container cgroup CPU covers the whole Watt
// process (all worker threads, GC, libuv) and, divided by the pod's allocation,
// gives the app's CPU as a percentage of its limit.
const createCPUQuery = ({ appId, instance }) => {
  const vf = instance ? `, label_app_kubernetes_io_instance="${instance}"` : ''
  const podLabels = `kube_pod_labels{label_platformatic_dev_application_id="${appId}", label_platformatic_dev_monitor="prometheus"${vf}}`
  return `avg(
    sum(rate(container_cpu_usage_seconds_total{container!="POD"}[1m])) by (pod)
    * on(pod) group_left() ${podLabels}
    /
    (
      sum(kube_pod_container_resource_limits{resource="cpu", unit="core"}) by (pod)
      or
      sum(kube_pod_container_resource_requests{resource="cpu", unit="core"}) by (pod)
    )
    * on(pod) group_left() ${podLabels}
    * 100
  )`
}

const createEventLoopQuery = ({ appId, instance }) =>
  `avg(max by(instanceId) (${withInstanceFilter(`nodejs_eventloop_utilization{${getAppFilter(appId)}}`, instance)}))`

// quantile as fraction, so 0.95 for 95th percentile
const createLatencyQuery = ({ appId, quantile, entrypoint, instance }) =>
  `avg(avg by(instanceId)(${withInstanceFilter(`http_request_all_summary_seconds{${getAppFilter(appId)}, serviceId="${entrypoint}", quantile="${quantile}"}`, instance)}))`

// We should have one value for the whole process. Given that we get one value per service, uses the `max`.
const createRSSMemoryPodQuery = ({ podId, timeWindow }) =>
  `max(avg_over_time(process_resident_memory_bytes{instanceId="${podId}"}[${timeWindow}]))`

const createTotalHEAPMemoryPodQuery = ({ podId, timeWindow }) =>
  `sum(avg_over_time(nodejs_heap_size_total_bytes{instanceId="${podId}"}[${timeWindow}]))`

const createUsedHEAPMemoryPodQuery = ({ podId, timeWindow }) =>
  `sum(avg_over_time(nodejs_heap_size_used_bytes{instanceId="${podId}"}[${timeWindow}]))`

const createMemoryLimitPodQuery = (podId) =>
  `kube_pod_container_resource_limits{resource="memory", pod="${podId}"}`

// Whole-pod CPU as a percentage of the pod's CPU limit (see createCPUQuery for
// why process_cpu_percent_usage cannot be used: it is node-wide).
const createCPUPodQuery = ({ podId }) =>
  `sum(rate(container_cpu_usage_seconds_total{pod="${podId}", container!="POD"}[1m]))
    / (
      sum(kube_pod_container_resource_limits{resource="cpu", unit="core", pod="${podId}"})
      or
      sum(kube_pod_container_resource_requests{resource="cpu", unit="core", pod="${podId}"})
    )
    * 100`

// number of cores
const createAllocatedCPUPodQuery = ({ podId }) =>
  `kube_pod_container_resource_limits{resource="cpu", pod="${podId}"}`

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

// Convert a Prometheus range duration (as produced by the draining checker,
// e.g. "30s", "5m", "1h") into seconds. Defaults to 1 on an unexpected format
// so the query degrades to a request count rather than throwing.
const promWindowToSeconds = (timeWindow) => {
  const match = /^(\d+)([smh])$/.exec(String(timeWindow))
  if (!match) return 1
  const value = Number(match[1])
  if (match[2] === 'h') return value * 3600
  if (match[2] === 'm') return value * 60
  return value
}

// http_request_all_summary_seconds_count resets on every scrape (see the note on
// createVersionRPSQuery below), so rate() returns ~0 under steady traffic. Use
// sum_over_time over the window divided by the window length to get per-pod RPS,
// then average across the pods that actually served traffic (the > 0 filter).
const createRequestPerSecondQuery = ({ applicationId, timeWindow }) =>
  `avg(
    (sum_over_time(http_request_all_summary_seconds_count{callerTelemetryId=""}[${timeWindow}]) / ${promWindowToSeconds(timeWindow)})
    * on(pod) group_left(label_platformatic_dev_application_id)
    kube_pod_labels{label_platformatic_dev_application_id="${applicationId}"} > 0
  )`

// Request per second for a specific app version, filtered by K8s pod labels.
// Used by the draining lifecycle checker to detect whether a draining version
// still has traffic, and by the version manager's traffic-split view. A value of
// 0 over the window means no traffic.
//
// `callerTelemetryId=""` keeps only ingress requests. A Watt app is a mesh of
// internal services (composer -> next -> fastify -> node, ...); one external
// request fans out across them and each hop increments the summary, tagged with
// the caller's telemetry id. Without this filter the rate is inflated by the
// internal fan-out (~1.4x for a 4-service app, more for deeper meshes). The
// entrypoint's external requests carry no callerTelemetryId, so the empty match
// isolates real ingress.
//
// NOTE: http_request_all_summary_seconds_count is a prom-client summary whose
// observation window is reset on every scrape (`collect: () => this.reset()`),
// so its _count is a per-scrape delta, NOT a monotonic counter. rate() assumes a
// cumulative counter and therefore returns ~0 on this metric even under steady
// traffic, which would expire a draining version that is still being hit.
// sum_over_time() adds the per-scrape counts across the window (each request is
// counted in exactly one scrape sample, so there is no double counting), giving
// the total requests in the window; dividing by the window length yields the
// average requests per second.
const createVersionRPSQuery = ({ instance, timeWindow }) =>
  `sum(
    sum_over_time(http_request_all_summary_seconds_count{callerTelemetryId=""}[${timeWindow}])
    * on(pod) group_left()
    kube_pod_labels{label_app_kubernetes_io_instance="${instance}"}
  ) / ${promWindowToSeconds(timeWindow)}`

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
  createRequestLatencyQuery,
  createVersionRPSQuery
}
