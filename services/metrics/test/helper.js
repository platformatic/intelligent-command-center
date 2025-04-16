'use strict'

const { join } = require('node:path')
const { readFile } = require('node:fs/promises')
const { buildServer } = require('@platformatic/service')
const fastify = require('fastify')
const formBody = require('@fastify/formbody')

const defaultEnv = {
  PLT_METRICS_PROMETHEUS_URL: 'http://localhost:4005'
}

function setUpEnvironment (env = {}) {
  Object.assign(process.env, defaultEnv, env)
}

async function startMetrics (t, controlPlane) {
  setUpEnvironment()
  const config = JSON.parse(await readFile(join(__dirname, '..', 'platformatic.json'), 'utf8'))
  config.server ||= {}
  config.server.logger ||= {}
  config.server.logger.level = 'error'
  config.watch = false
  const server = await buildServer(config)
  // We inject here the mocked "clients" for other runtime's services
  server.addHook('preHandler', (req, _reply, done) => {
    req.controlPlane = controlPlane
    done()
  })
  t.after(() => server.close())
  return server
}

async function startPrometheusK8s (t, machineId) {
  const coresQuery = 'kube_node_status_allocatable{resource="cpu",unit="core"}'
  const cpuAllQuery = 'sum((sum(rate(container_cpu_usage_seconds_total{container!="POD"}[1m])) by (pod)) * on(pod) group_left(label_app_kubernetes_io_name){label_app_kubernetes_io_name="zio-paperone"}) * 100'
  const memAllQuery = 'sum(sum(container_memory_working_set_bytes{container_name!="POD"}) by (pod) * on(pod) group_left(label_app_kubernetes_io_name){label_app_kubernetes_io_name="zio-paperone"})'
  const totalMemQuery = 'kube_node_status_allocatable{resource="memory",unit="byte"}'
  const cpuAppQuery = `sum(delta(container_cpu_usage_seconds_total{container="${machineId}"}[1m]))`
  const cpuAllAppsQuery = 'sum(delta(container_cpu_usage_seconds_total{container=~"plt.*"}[1m]))'
  const cpuAllAppsButAppQuery = `sum(delta(container_cpu_usage_seconds_total{container!="${machineId}", container=~"plt.*"}[1m]))`
  const memAppQuery = `sum(container_memory_working_set_bytes{container="${machineId}"})`
  const memAllButAppQuery = `sum(sum(container_memory_working_set_bytes{container!="${machineId}"}) by (pod) * on(pod) group_left(label_app_kubernetes_io_name){label_app_kubernetes_io_name="zio-paperone"})`
  const podsAppQuery = `count(kube_pod_labels{label_app_kubernetes_io_instance="${machineId}"})`
  const podsAllQuery = 'count(kube_pod_labels{label_app_kubernetes_io_name="zio-paperone"})'
  const requestLatencyQuery = `avg((rate(http_request_duration_seconds_sum{service="${machineId}"}[1m]) / rate(http_request_duration_seconds_count{service="${machineId}"}[1m])) > 0)`
  const requestPerSecondQuery = `avg(rate(http_request_summary_seconds_count{service="${machineId}"}[5m]) > 0)`

  const prometheus = fastify({ keepAliveTimeout: 1 })
  prometheus.register(formBody)
  t.after(() => prometheus.close())

  prometheus.post('/api/v1/query', async (req, reply) => {
    const { query } = req.body

    let value = 0
    if (query.includes(coresQuery)) {
      value = 10
    } else if (query.includes(cpuAllQuery)) {
      value = 3.14159
    } else if (query === memAllQuery) {
      value = 1721122686
    } else if (query === totalMemQuery) {
      value = 2721122686
    } else if (query === cpuAppQuery) {
      value = 40
    } else if (query === cpuAllAppsQuery) {
      value = 50
    } else if (query === cpuAllAppsButAppQuery) {
      value = 10
    } else if (query === memAppQuery) {
      value = 1721122686
    } else if (query === memAllButAppQuery) {
      value = 3721122686
    } else if (query === podsAppQuery) {
      value = 3
    } else if (query === podsAllQuery) {
      value = 5
    } else if (query === requestLatencyQuery) {
      value = 0.120
    } else if (query === requestPerSecondQuery) {
      value = 50.11
    }

    return {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [
              1721122686.143,
              value
            ]
          }
        ]
      }
    }
  })

  await prometheus.listen({ port: 4005 })
  return prometheus
}

async function startPrometheus (t, machineId) {
  const prometheus = fastify({ keepAliveTimeout: 1 })
  prometheus.register(formBody)
  t.after(() => prometheus.close())

  prometheus.post('/api/v1/query', async (req, reply) => {
    const { query } = req.body

    let value = 0
    if (query.includes('process_resident_memory_bytes')) {
      value = 3721122686
    } else if (query.includes('nodejs_heap_size_total_bytes')) {
      value = 2721122686
    } else if (query.includes('nodejs_heap_size_used_bytes')) {
      value = 1721122686
    } else if (query.includes('container_cpu_usage_seconds_total')) {
      value = 0.5
    } else if (query.includes('nodejs_eventloop_utilization')) {
      value = 0.461803
    } else if (query.includes('http_request_duration_seconds_sum')) {
      if (query.includes('1y')) {
        value = 0.123
      } else {
        value = 0.321
      }
    } else if (query.includes('histogram_quantile')) {
      if (query.includes('0.5')) {
        value = 0.222
      } else if (query.includes('0.95')) {
        value = 0.333
      } else if (query.includes('0.99')) {
        value = 0.444
      } else if (query.includes('0.9')) {
        value = 0.222
      } else {
        value = 0
      }
    } else if (query.includes('http_request_duration_seconds_count')) {
      if (query.includes('1y')) {
        value = 555
      } else {
        value = 666
      }
    } else if (query.includes('kube_pod_container_resource_limits{resource="memory"')) {
      value = 4721122686
    } else if (query.includes('kube_pod_container_resource_limits{resource="cpu"')) {
      value = 2
    }

    return {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {
              applicationId: 'test-application-id',
              serviceId: 'test-service-id',
              telemetry_id: 'X'
            },
            value: [
              1721122686.143,
              value
            ]
          }
        ]
      }
    }
  })

  prometheus.post('/api/v1/query_range', async (req, reply) => {
    const { query } = req.body

    let value = 0
    if (query.includes('process_resident_memory_bytes')) {
      value = 2721122686
    } else if (query.includes('nodejs_heap_size_total_bytes')) {
      value = 1721122686
    } else if (query.includes('nodejs_heap_size_used_bytes')) {
      value = 3721122686
    } else if (query.includes('process_cpu_percent_usage')) {
      value = 2.71828
    } else if (query.includes('thread_cpu_percent_usage')) {
      value = 3.71828
    } else if (query.includes('nodejs_eventloop_utilization')) {
      value = 0.461803
    } else if (query.includes('http_request_all_summary_seconds')) {
      if (query.includes('0.95')) {
        value = 0.333
      } else if (query.includes('0.99')) {
        value = 0.444
      } else if (query.includes('0.9')) {
        value = 0.222
      } else {
        value = 0
      }
    }

    return {
      status: 'success',
      data: {
        resultType: 'matrix',
        result: [
          {
            metric: {},
            values: [[
              1721122686.143,
              value
            ], [
              1721123686.143,
              value
            ], [
              1721124686.143,
              value
            ]]
          }
        ]
      }
    }
  })

  await prometheus.listen({ port: 4005 })
  return prometheus
}

async function startPrometheusWithNoValues (t, machineId) {
  const prometheus = fastify({ keepAliveTimeout: 1 })
  prometheus.register(formBody)
  t.after(() => prometheus.close())

  prometheus.post('/api/v1/query', async (req, reply) => {
    const value = undefined

    return {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {
              applicationId: 'test-application-id',
              serviceId: 'test-service-id',
              telemetry_id: 'X'
            },
            value: [
              1721122686.143,
              value
            ]
          }
        ]
      }
    }
  })

  prometheus.post('/api/v1/query_range', async (req, reply) => {
    const value = undefined

    return {
      status: 'success',
      data: {
        resultType: 'matrix',
        result: [
          {
            metric: {},
            values: [[
              1721122686.143,
              value
            ], [
              1721123686.143,
              value
            ], [
              1721124686.143,
              value
            ]]
          }
        ]
      }
    }
  })

  await prometheus.listen({ port: 4005 })
  return prometheus
}

const getControlPlane = (machineId) => {
  return {
    getGenerations: async () => {
      return [
        {
          id: 'generation-1'
        }
      ]
    },
    getDeployments: async () => {
      return [
        {
          machineId
        }
      ]
    },
    getApplicationStateById: async () => {
      return {
        state: {
          services: [
            {
              id: 'service-1',
              entrypoint: true
            }
          ]
        }
      }
    }
  }
}

async function startPrometheusCache (t, applicationId) {
  const prometheus = fastify({ keepAliveTimeout: 1 })
  prometheus.register(formBody)
  t.after(() => prometheus.close())

  const missQuery = `sum(http_cache_miss_count{applicationId="${applicationId}"})`
  const hitQuery = `sum(http_cache_hit_count{applicationId="${applicationId}"})`
  const missQueryAll = 'sum(http_cache_miss_count)'
  const hitQueryAll = 'sum(http_cache_hit_count)'

  prometheus.post('/api/v1/query_range', async (req, reply) => {
    let value
    const { query } = req.body

    if (query.includes(missQuery)) {
      value = 2
    } else if (query.includes(hitQuery)) {
      value = 10
    } else if (query.includes(missQueryAll)) {
      value = 20
    } else if (query.includes(hitQueryAll)) {
      value = 100
    }

    return {
      status: 'success',
      data: {
        resultType: 'matrix',
        result: [
          {
            metric: {},
            values: [[
              1721122686.143,
              value
            ]]
          }
        ]
      }
    }
  })

  await prometheus.listen({ port: 4005 })
  return prometheus
}

async function startPrometheusJobs (t, applicationId) {
  const prometheus = fastify({ keepAliveTimeout: 1 })
  prometheus.register(formBody)
  t.after(() => prometheus.close())

  const messagesSentQuery = `icc_jobs_messages_sent{applicationId="${applicationId}"}`
  const messagesFailedQuery = `icc_jobs_messages_failed{applicationId="${applicationId}"}`
  const messagesRetriesQuery = `icc_jobs_messages_retries{applicationId="${applicationId}"}`
  const averageExecutionTimeQuery = `icc_jobs_messages_execution_time_sum{applicationId="${applicationId}"} / icc_jobs_messages_sent{applicationId="${applicationId}"}`

  prometheus.post('/api/v1/query', async (req, _reply) => {
    let value
    const { query } = req.body

    if (query.includes(averageExecutionTimeQuery)) {
      value = 2.5
    } else if (query.includes(messagesFailedQuery)) {
      value = 10
    } else if (query.includes(messagesRetriesQuery)) {
      value = 5
    } else if (query.includes(messagesSentQuery)) {
      value = 100
    }

    return {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {
              applicationId: `${applicationId}`
            },
            value: [
              1721122686.143,
              value
            ]
          }
        ]
      }
    }
  })

  await prometheus.listen({ port: 4005 })
  return prometheus
}

async function startPrometheusJob (t, jobId) {
  const prometheus = fastify({ keepAliveTimeout: 1 })
  prometheus.register(formBody)
  t.after(() => prometheus.close())

  const messagesSentQuery = `icc_jobs_messages_sent{jobId="${jobId}"}`
  const messagesFailedQuery = `icc_jobs_messages_failed{jobId="${jobId}"}`
  const messagesRetriesQuery = `icc_jobs_messages_retries{jobId="${jobId}"}`
  const averageExecutionTimeQuery = `icc_jobs_messages_execution_time_sum{jobId="${jobId}"} / icc_jobs_messages_sent{jobId="${jobId}"}`

  prometheus.post('/api/v1/query', async (req, _reply) => {
    let value
    const { query } = req.body

    if (query.includes(averageExecutionTimeQuery)) {
      value = 5.5
    } else if (query.includes(messagesFailedQuery)) {
      value = 20
    } else if (query.includes(messagesRetriesQuery)) {
      value = 10
    } else if (query.includes(messagesSentQuery)) {
      value = 200
    }

    return {
      status: 'success',
      data: {
        resultType: 'vector',
        result: [
          {
            metric: {},
            value: [
              1721122686.143,
              value
            ]
          }
        ]
      }
    }
  })

  await prometheus.listen({ port: 4005 })
  return prometheus
}

module.exports = {
  startMetrics,
  startPrometheusK8s,
  startPrometheus,
  startPrometheusWithNoValues,
  getControlPlane,
  startPrometheusCache,
  startPrometheusJobs,
  startPrometheusJob,
  defaultEnv
}
