/// <reference path="../global.d.ts" />
'use strict'

const { queryPrometheus } = require('./prom')
const {
  createRequestPerSecondQuery,
  createRequestLatencyQuery
} = require('./queries')
const { toGB } = require('./utils')

const memAllQuery = `
  sum(
    container_memory_working_set_bytes{container!=""}
    * on(pod) group_left()
    kube_pod_labels{label_platformatic_dev_monitor="prometheus"}
  )`

const cpuAllQuery = `
  sum(
    delta(container_cpu_usage_seconds_total{container!=""}[1m])
    * on(pod) group_left()
    kube_pod_labels{label_platformatic_dev_monitor="prometheus"}
  )`

const totalMemQuery =
  'sum(kube_node_status_allocatable{resource="memory",unit="byte"})'
// const podsAllQuery = 'count(kube_pod_labels{label_app_kubernetes_io_name="wattpro"})'

const getAppCPUMetrics = async (applicationId) => {
  const cpuAppQuery = `
    sum(rate(container_cpu_usage_seconds_total{pod=~".*", container!="POD"}[1m])) by (pod) 
    * on(pod) group_left() 
    kube_pod_labels{
      label_platformatic_dev_application_id="${applicationId}",
      label_platformatic_dev_monitor="prometheus"
    }
    /
    (
      sum(kube_pod_container_resource_limits{resource="cpu", unit="core"}) by (pod)
      or 
      sum(kube_pod_container_resource_requests{resource="cpu", unit="core"}) by (pod)
    )
    * on(pod) group_left()
    kube_pod_labels{
      label_platformatic_dev_application_id="${applicationId}",
      label_platformatic_dev_monitor="prometheus"
    }
    * 100`

  const cpuAllAppsQuery = `
    sum(rate(container_cpu_usage_seconds_total{pod=~".*", container!="POD"}[1m])) by (pod) 
    * on(pod) group_left() 
    kube_pod_labels{
      label_platformatic_dev_monitor="prometheus"
    }
    /
    (
      sum(kube_pod_container_resource_limits{resource="cpu", unit="core"}) by (pod)
      or 
      sum(kube_pod_container_resource_requests{resource="cpu", unit="core"}) by (pod)
    )
    * on(pod) group_left()
    kube_pod_labels{
      label_platformatic_dev_monitor="prometheus"
    }
    * 100`

  const cpuAllAppsButAppQuery = `
    sum(rate(container_cpu_usage_seconds_total{pod=~".*", container!="POD"}[1m])) by (pod) 
    * on(pod) group_left() 
    kube_pod_labels{
      label_platformatic_dev_application_id!="${applicationId}",
      label_platformatic_dev_monitor="prometheus"
    }
    /
    (
      sum(kube_pod_container_resource_limits{resource="cpu", unit="core"}) by (pod)
      or 
      sum(kube_pod_container_resource_requests{resource="cpu", unit="core"}) by (pod)
    )
    * on(pod) group_left()
    kube_pod_labels{
      label_platformatic_dev_application_id!="${applicationId}",
      label_platformatic_dev_monitor="prometheus"
    }
    * 100`

  const [cpuAppRes, cpuAllAppsRes, cpuButAppSecondsRes] = await Promise.all([
    queryPrometheus(cpuAppQuery),
    queryPrometheus(cpuAllAppsQuery),
    queryPrometheus(cpuAllAppsButAppQuery)
  ])

  const cpuApp = parseFloat(cpuAppRes?.data?.result[0]?.value[1]) || 0
  const cpuAllApps = parseFloat(cpuAllAppsRes?.data?.result[0]?.value[1]) || 0
  const cpuButApp =
    parseFloat(cpuButAppSecondsRes?.data?.result[0]?.value[1]) || 0

  return {
    cpuAppUsage: cpuApp,
    cpuAllAppsUsage: cpuAllApps,
    cpuAllAppsUsageButApp: cpuButApp
  }
}

const getAppMemMetrics = async (applicationId) => {
  const sumMemAppQuery = `
    sum(
      container_memory_working_set_bytes{container!=""}
      * on(pod) group_left()
      kube_pod_labels{label_platformatic_dev_application_id="${applicationId}"}
    )`

  const avgMemAppQuery = `
    avg(
      container_memory_working_set_bytes{container!=""}
      * on(pod) group_left()
      kube_pod_labels{label_platformatic_dev_application_id="${applicationId}"}
    )`

  const memAllButAppQuery = `
    sum(
      container_memory_working_set_bytes{container!=""}
      * on(pod) group_left()
      kube_pod_labels{
        label_platformatic_dev_application_id!="${applicationId}",
        label_platformatic_dev_monitor="prometheus"
      }
    )`

  const [avgMemAppRes, sumMemAppRes, memAllRes, memAllAppsButAppRes, totalRes] =
    await Promise.all([
      queryPrometheus(avgMemAppQuery),
      queryPrometheus(sumMemAppQuery),
      queryPrometheus(memAllQuery),
      queryPrometheus(memAllButAppQuery),
      queryPrometheus(totalMemQuery)
    ])

  const avgMemApp = toGB(
    parseFloat(avgMemAppRes?.data?.result[0]?.value[1] ?? 0)
  )
  const sumMemApp = toGB(
    parseFloat(sumMemAppRes?.data?.result[0]?.value[1] ?? 0)
  )
  const memAll = toGB(parseFloat(memAllRes?.data?.result[0]?.value[1] ?? 0))
  const memAllAppsButApp = toGB(
    parseFloat(memAllAppsButAppRes?.data?.result[0]?.value[1] ?? 0)
  )
  const totalMemory = toGB(
    parseFloat(totalRes?.data?.result[0]?.value[1] ?? 0)
  )

  return {
    avgMemoryAppUsage: avgMemApp,
    memoryAppUsage: sumMemApp,
    memoryAllAppsUsage: memAll,
    memoryAllAppsUsageButApp: memAllAppsButApp,
    totalMemory
  }
}

const getAppPodsMetrics = async (applicationId) => {
  const podsAppQuery = `count(kube_pod_labels{label_platformatic_dev_application_id="${applicationId}"})`
  const podsAllQuery =
    'count(kube_pod_labels{label_platformatic_dev_monitor="prometheus"})'

  const [podsAppRes, podsAllRes] = await Promise.all([
    queryPrometheus(podsAppQuery),
    queryPrometheus(podsAllQuery)
  ])

  const appsPods = parseInt(podsAppRes?.data?.result[0]?.value[1])
  const allPods = parseInt(podsAllRes?.data?.result[0]?.value[1])

  return {
    pods: appsPods,
    podsAll: allPods
  }
}

const getAppRequestMetrics = async (applicationId) => {
  const query = createRequestLatencyQuery({ applicationId, timeWindow: '1m' })
  const requestLatencyRes = await queryPrometheus(query)
  const latency =
    (parseFloat(requestLatencyRes?.data?.result[0]?.value[1]) || 0) * 1000
  return { latency }
}

const getAppEventLoopUtilization = async (applicationId) => {
  const query = `avg(max by(instanceId) (nodejs_eventloop_utilization{applicationId="${applicationId}"}))`
  const eluAppRes = await queryPrometheus(query)
  const eluApp = (parseFloat(eluAppRes?.data?.result[0]?.value[1]) || 0) * 100
  return {
    eluApp
  }
}

const getAppK8SMetrics = async (applicationId) => {
  const cpu = await getAppCPUMetrics(applicationId)
  const memory = await getAppMemMetrics(applicationId)
  const pods = await getAppPodsMetrics(applicationId)
  const requests = await getAppRequestMetrics(applicationId)
  const elu = await getAppEventLoopUtilization(applicationId)

  const res = {
    cpu,
    memory,
    pods,
    requests,
    elu
  }
  return res
}

const getInfraK8SMetrics = async () => {
  const [cpuAllRes, memAllRes, totalRes] = await Promise.all([
    queryPrometheus(cpuAllQuery),
    queryPrometheus(memAllQuery),
    queryPrometheus(totalMemQuery)
  ])

  const cpuAll = parseFloat(cpuAllRes?.data?.result[0]?.value[1])
  const memAll = toGB(parseFloat(memAllRes?.data?.result[0]?.value[1]))
  const totalMemory = toGB(parseFloat(totalRes?.data?.result[0]?.value[1]))

  return {
    cpu: cpuAll,
    memory: memAll,
    totalMemory
  }
}

const getAppRPSMetrics = async (applicationId) => {
  const query = createRequestPerSecondQuery({
    applicationId,
    timeWindow: '5m'
  })
  const rpsRes = await queryPrometheus(query)
  const rps = parseFloat(rpsRes?.data?.result[0]?.value[1])
  return rps
}

module.exports = {
  getAppK8SMetrics,
  getInfraK8SMetrics,
  getAppRPSMetrics
}
