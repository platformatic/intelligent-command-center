'use strict'

const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { request } = require('undici')
const {
  buildServer,
  generateK8sHeader,
  setupMockPrometheusServer,
  cleandb,
  cleanValkeyData,
  startMachinist
} = require('../test/helper')

const DEFAULT_REQ_PER_SEC = 100
const SCALER_URL = 'http://localhost:5555'

// This is a function that returns the converts
// the load to the corresponding elu and heap for
// an application with a max heap of 1000 MB
// Tune it if you need
function getMetricsByLoad (reqPerSec) {
  const metricsByLoad = {
    0: { elu: 0, heap: 0 },
    10: { elu: 0.08, heap: 65 },
    50: { elu: 0.22, heap: 100 },
    100: { elu: 0.35, heap: 150 },
    200: { elu: 0.5, heap: 200 },
    300: { elu: 0.65, heap: 285 },
    500: { elu: 0.78, heap: 360 },
    750: { elu: 0.88, heap: 450 },
    1000: { elu: 0.98, heap: 550 },
    1500: { elu: 1, heap: 720 },
    2000: { elu: 1, heap: 1000 }
  }

  let metrics = metricsByLoad[0]

  for (const load of Object.keys(metricsByLoad)) {
    if (reqPerSec >= load) {
      metrics = metricsByLoad[load]
    }
  }

  return metrics
}

class ReplicaSet {
  constructor (applicationId, replicas) {
    this.applicationId = applicationId
    this.replicas = replicas
    this.applications = []
    this.reqPerSec = DEFAULT_REQ_PER_SEC
    this.loadTimeout = null
    this.loadPodIds = null
    this.setReplicas(replicas)
  }

  autocannon (reqPerSec, timeout, podIds = []) {
    console.log('Autocannon applications. Req/sec:', reqPerSec)

    const resetLoad = () => {
      console.log('Setting default application load')
      clearTimeout(this.loadTimeout)
      this.loadTimeout = null
      this.loadPodIds = null
      this.reqPerSec = DEFAULT_REQ_PER_SEC
      this.#updateApplicationsLoad()
    }

    if (this.loadTimeout) {
      resetLoad()
    }

    this.reqPerSec = reqPerSec
    this.loadPodIds = podIds ?? null
    this.#updateApplicationsLoad()

    this.loadTimeout = setTimeout(resetLoad, timeout)
  }

  setReplicas (replicas) {
    console.log('Set replicas to', replicas)

    this.replicas = replicas

    if (this.replicas > this.applications.length) {
      for (let i = this.applications.length; i < this.replicas; i++) {
        const podId = `pod-${i}`
        const application = new WattApplication(
          this.applicationId,
          podId
        )
        this.applications.push(application)
        console.log(`Spawned new pod "${podId}"`)
      }
    }

    if (this.replicas < this.applications.length) {
      for (let i = this.replicas; i < this.applications.length; i++) {
        this.applications[i].close()
        this.applications.splice(i, 1)

        const podId = this.applications[i].podId
        console.log(`Killed pod "${podId}"`)
      }
    }

    this.#updateApplicationsLoad()
  }

  getHeapPromMetrics () {
    const metrics = []
    for (const application of this.applications) {
      metrics.push(application.getHeapPromMetrics())
    }
    return metrics
  }

  getEluPromMetrics () {
    const metrics = []
    for (const application of this.applications) {
      metrics.push(application.getEluPromMetrics())
    }
    return metrics
  }

  #updateApplicationsLoad () {
    const podsCount = this.loadPodIds?.length || this.replicas
    const appReqPerSec = this.reqPerSec / podsCount

    for (const application of this.applications) {
      if (
        this.loadPodIds === null ||
        this.loadPodIds.length === 0 ||
        this.loadPodIds.includes(application.podId)
      ) {
        application.autocannon(appReqPerSec)
      }
    }
  }
}

class WattApplication {
  constructor (applicationId, podId) {
    this.applicationId = applicationId
    this.podId = podId
    this.elu = 0
    this.usedHeapMb = 0
    this.totalHeapMb = 1000
    this.reqPerSec = 0
    this.healthHistory = []
    this.eluMetrics = []
    this.heapMetrics = []
    this.interval = null
    this.#monitorHealth()
  }

  autocannon (reqPerSec) {
    const metrics = getMetricsByLoad(reqPerSec)

    this.elu = metrics.elu
    this.usedHeapMb = metrics.heap
    this.reqPerSec = reqPerSec

    console.log(
      `Change pod "${this.podId}" load to req/sec ${reqPerSec}.`,
      `ELU: ${this.elu}, Heap: ${this.usedHeapMb}`
    )
  }

  getEluPromMetrics () {
    return {
      metric: {
        applicationId: this.applicationId,
        podId: this.podId
      },
      values: this.eluMetrics
    }
  }

  getHeapPromMetrics () {
    return {
      metric: {
        applicationId: this.applicationId,
        podId: this.podId
      },
      values: this.heapMetrics
    }
  }

  close () {
    clearInterval(this.interval)
  }

  #monitorHealth () {
    this.interval = setInterval(
      () => { this.#checkHealth() }, 1000
    ).unref()
  }

  #checkHealth () {
    const heapRation = this.usedHeapMb / this.totalHeapMb
    const unhealthy = heapRation > 0.9 || this.elu > 0.9

    const timestamp = new Date().toISOString()

    const healthStatus = {
      service: 'test-service',
      currentHealth: {
        elu: this.elu,
        heapUsed: this.usedHeapMb,
        heapTotal: this.totalHeapMb
      },
      unhealthy,
      timestamp
    }

    this.healthHistory.push(healthStatus)
    if (this.healthHistory.length > 5) {
      this.healthHistory.splice(0, this.healthHistory.length - 5)
    }

    const usedHeapBytes = this.usedHeapMb * 1024 * 1024
    this.eluMetrics.push([Date.now(), this.elu])
    this.heapMetrics.push([Date.now(), usedHeapBytes])

    // Keep only the last 60 data points
    if (this.eluMetrics.length > 60) {
      this.eluMetrics.splice(0, this.eluMetrics.length - 60)
    }
    if (this.heapMetrics.length > 60) {
      this.heapMetrics.splice(0, this.heapMetrics.length - 60)
    }

    if (unhealthy) {
      this.#sendAlert(healthStatus)
    }
  }

  async #sendAlert (healthAlert) {
    const { statusCode, body } = await request(SCALER_URL + '/alerts', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-k8s': generateK8sHeader(this.podId)
      },
      body: JSON.stringify({
        alert: healthAlert,
        applicationId: this.applicationId,
        healthHistory: this.healthHistory
      })
    })

    const data = await body.json()
    assert.strictEqual(statusCode, 200, data)

    console.log(`Pod "${this.podId}" sent health alert`, {
      elu: this.elu,
      heap: this.usedHeapMb / this.totalHeapMb
    })
  }
}

async function run () {
  const applicationId = randomUUID()
  const replicaSet = new ReplicaSet(applicationId, 1)

  const promServer = await setupMockPrometheusServer({
    heapSize: {
      status: 'success',
      data: {
        resultType: 'matrix',
        get result () {
          return replicaSet.getHeapPromMetrics()
        }
      }
    },
    eventLoop: {
      status: 'success',
      data: {
        resultType: 'matrix',
        get result () {
          return replicaSet.getEluPromMetrics()
        }
      }
    },
    allHeapSize: {
      status: 'success',
      data: {
        resultType: 'matrix',
        get result () {
          return replicaSet.getHeapPromMetrics()
        }
      }
    },
    allEventLoop: {
      status: 'success',
      data: {
        resultType: 'matrix',
        get result () {
          return replicaSet.getEluPromMetrics()
        }
      }
    }
  })

  process.env.PLT_METRICS_PROMETHEUS_URL = promServer.address
  process.env.PLT_SCALER_COOLDOWN = 10
  process.env.PLT_SCALER_POST_EVAL_WINDOW = 10
  process.env.PLT_SCALER_PERIODIC_TRIGGER = 5

  await startMachinist(null, {
    setPodController: ({ replicas }) => {
      replicaSet.setReplicas(replicas)
    }
  })

  const server = await buildServer()
  await cleandb(server)
  await cleanValkeyData()

  await server.start()

  await saveController(server, applicationId)

  return { replicaSet, server }
}

async function saveController (server, applicationId) {
  console.log('Saving app controller')

  await server.platformatic.entities.controller.save({
    input: {
      applicationId,
      deploymentId: randomUUID(),
      namespace: 'platfomratic',
      k8SControllerId: 'test-controller-id',
      kind: 'Controller',
      apiVersion: 'v1',
      replicas: 1
    }
  })
}

if (require.main === module) {
  run()
}

module.exports = run
