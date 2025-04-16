/// <reference path="../global.d.ts" />
'use strict'

const { queryPrometheus } = require('./prom')
const { createRequestPerSecondQuery, createRequestLatencyQuery } = require('./queries')
const { toGB } = require('./utils')

const cpuAllQuery = 'sum((sum(rate(container_cpu_usage_seconds_total{container!="POD"}[1m])) by (pod)) * on(pod) group_left(label_app_kubernetes_io_name){label_app_kubernetes_io_name="zio-paperone"}) * 100'
const memAllQuery = 'sum(sum(container_memory_working_set_bytes{container_name!="POD"}) by (pod) * on(pod) group_left(label_app_kubernetes_io_name){label_app_kubernetes_io_name="zio-paperone"})'
const totalMemQuery = 'kube_node_status_allocatable{resource="memory",unit="byte"}'
const podsAllQuery = 'count(kube_pod_labels{label_app_kubernetes_io_name="zio-paperone"})'

const getAppCPUMetrics = async (machineId) => {
  const coresQuery = 'kube_node_status_allocatable{resource="cpu",unit="core"}'
  const cpuAppQuery = `sum(delta(container_cpu_usage_seconds_total{container="${machineId}"}[1m]))`
  const cpuAllAppsQuery = 'sum(delta(container_cpu_usage_seconds_total{container=~"plt.*"}[1m]))'
  const cpuAllAppsButAppQuery = `sum(delta(container_cpu_usage_seconds_total{container!="${machineId}", container=~"plt.*"}[1m]))`

  const [coresRes, cpuAppRes, cpuAllAppsRes, cpuButAppSecondsRes] = await Promise.all([
    queryPrometheus(coresQuery),
    queryPrometheus(cpuAppQuery),
    queryPrometheus(cpuAllAppsQuery),
    queryPrometheus(cpuAllAppsButAppQuery)
  ])

  const cores = parseFloat(coresRes?.data?.result[0]?.value[1]) || 0
  const cpuAppSeconds = parseFloat(cpuAppRes?.data?.result[0]?.value[1]) || 0
  const cpuAllAppsSeconds = parseFloat(cpuAllAppsRes?.data?.result[0]?.value[1]) || 0
  const cpuButAppSeconds = parseFloat(cpuButAppSecondsRes?.data?.result[0]?.value[1]) || 0

  const totalCPUtimeSeconds = cores * 60 // in seconds

  // We calculate the % of CPU usage agains the totalCPUtimeSeconds
  const cpuApp = (cpuAppSeconds / totalCPUtimeSeconds) * 100
  const cpuAllApps = (cpuAllAppsSeconds / totalCPUtimeSeconds) * 100
  const cpuButApp = (cpuButAppSeconds / totalCPUtimeSeconds) * 100

  return {
    cpuAppUsage: cpuApp,
    cpuAllAppsUsage: cpuAllApps,
    cpuAllAppsUsageButApp: cpuButApp
  }
}

const getAppMemMetrics = async (machineId) => {
  const memAppQuery = `sum(container_memory_working_set_bytes{container="${machineId}"})`
  const memAllButAppQuery = `sum(sum(container_memory_working_set_bytes{container!="${machineId}"}) by (pod) * on(pod) group_left(label_app_kubernetes_io_name){label_app_kubernetes_io_name="zio-paperone"})`

  const [memAppRes, memAllRes, memAllAppsButAppRes, totalRes] = await Promise.all([
    queryPrometheus(memAppQuery),
    queryPrometheus(memAllQuery),
    queryPrometheus(memAllButAppQuery),
    queryPrometheus(totalMemQuery)
  ])

  const memApp = toGB(parseFloat(memAppRes?.data?.result[0]?.value[1]))
  const memAll = toGB(parseFloat(memAllRes?.data?.result[0]?.value[1]))
  const memAllAppsButApp = toGB(parseFloat(memAllAppsButAppRes?.data?.result[0]?.value[1]))
  const totalMemory = toGB(parseFloat(totalRes?.data?.result[0]?.value[1]))

  return {
    memoryAppUsage: memApp,
    memoryAllAppsUsage: memAll,
    memoryAllAppsUsageButApp: memAllAppsButApp,
    totalMemory
  }
}

const getAppPodsMetrics = async (machineId) => {
  const podsAppQuery = `count(kube_pod_labels{label_app_kubernetes_io_instance="${machineId}"})`
  const [podsAppRes, podsAllRes] = await Promise.all([
    queryPrometheus(podsAppQuery),
    queryPrometheus(podsAllQuery)
  ])
  const pods = parseInt(podsAppRes?.data?.result[0]?.value[1])
  const podsAll = parseInt(podsAllRes?.data?.result[0]?.value[1])
  return {
    pods,
    podsAll
  }
}

const getAppRequestMetrics = async (machineId) => {
  const query = createRequestLatencyQuery({ podId: machineId, timeWindow: '1m' })
  const requestLatencyRes = await queryPrometheus(query)
  const latency = (parseFloat(requestLatencyRes?.data?.result[0]?.value[1]) || 0) * 1000
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

const getAppK8SMetrics = async (machineId, applicationId) => {
  const cpu = await getAppCPUMetrics(machineId)
  const memory = await getAppMemMetrics(machineId)
  const pods = await getAppPodsMetrics(machineId)
  const requests = await getAppRequestMetrics(machineId)
  const elu = await getAppEventLoopUtilization(applicationId)

  return {
    cpu,
    memory,
    pods,
    requests,
    elu
  }
}

const getAppK8sRPS = async (machineId) => {
  const rps = await getAppRPSMetrics(machineId)
  return { rps }
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

const getAppRPSMetrics = async (machineId) => {
  const query = createRequestPerSecondQuery({ podId: machineId, timeWindow: '5m' })
  const rpsRes = await queryPrometheus(query)
  const rps = parseFloat(rpsRes?.data?.result[0]?.value[1])
  return rps
}

module.exports = {
  getAppK8SMetrics,
  getInfraK8SMetrics,
  getAppK8sRPS
}
