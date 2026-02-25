'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomUUID } = require('node:crypto')
const {
  startControlPlane,
  startActivities,
  startMetrics,
  startMachinist,
  startMainService,
  startCompliance,
  startTrafficInspector,
  startScaler,
  generateK8sHeader
} = require('./helper')

test('should save an instance of a new application', async (t) => {
  const applicationName = 'test-app'
  const podId = randomUUID()
  const imageId = randomUUID()

  const activities = []
  await startActivities(t, {
    saveEvent: (activity) => activities.push(activity)
  })

  const complianceRules = []
  await startCompliance(t, {
    saveRule: (ruleName, rule) => {
      complianceRules.push({ ruleName, rule })
    }
  })

  await startMetrics(t)

  const controllers = []
  await startScaler(t, {
    savePodController: (controller) => {
      controllers.push(controller)
    }
  })

  const iccUpdates = []
  await startMainService(t, {
    saveIccUpdate: (update) => {
      iccUpdates.push(update)
    }
  })

  const podsLabels = []
  await startMachinist(t, {
    getPodDetails: () => ({ image: imageId }),
    setPodLabels: (podId, labels) => {
      podsLabels.push({ podId, labels })
    }
  })

  const controlPlane = await startControlPlane(t)

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: { applicationName }
  })

  assert.strictEqual(statusCode, 200, body)

  const {
    applicationId,
    applicationName: responseApplicationName,
    config,
    scaler,
    httpCache,
    iccServices,
    enableOpenTelemetry,
    enableSlicerInterceptor,
    enableTrafficInterceptor
  } = JSON.parse(body)

  assert.strictEqual(responseApplicationName, applicationName)
  assert.strictEqual(enableOpenTelemetry, false)
  assert.strictEqual(enableSlicerInterceptor, false)
  assert.strictEqual(enableTrafficInterceptor, false)

  const { resources, httpCacheConfig } = config
  assert.strictEqual(resources.threads, 1)
  assert.strictEqual(resources.heap, 1024)
  assert.deepStrictEqual(resources.services, [])
  assert.strictEqual(httpCacheConfig, null)

  assert.strictEqual(httpCache.clientOpts.host, 'localhost')
  assert.strictEqual(httpCache.clientOpts.port, 6342)
  assert.strictEqual(
    httpCache.clientOpts.username,
    `plt-application-${applicationId}`
  )
  assert.strictEqual(
    httpCache.clientOpts.keyPrefix,
    `${applicationId}:`
  )
  assert.ok(httpCache.clientOpts.password)

  assert.deepStrictEqual(Object.keys(iccServices).sort(), [
    'activities',
    'compliance',
    'cron',
    'metrics',
    'riskEngine',
    'riskManager',
    'riskService',
    'scaler',
    'trafficante', // v2 default
    'userManager'
  ])

  assert.deepStrictEqual(scaler, { version: 'v1' })

  const { entities } = controlPlane.platformatic

  const generations = await entities.generation.find()
  assert.strictEqual(generations.length, 1)

  const generation = generations[0]
  assert.strictEqual(generation.version, 1)

  const applications = await entities.application.find()
  assert.strictEqual(applications.length, 1)

  const application = applications[0]
  assert.strictEqual(application.name, applicationName)
  assert.strictEqual(application.id, applicationId)

  const applicationStates = await entities.applicationState.find()
  assert.strictEqual(applicationStates.length, 0)

  const deployments = await entities.deployment.find()
  assert.strictEqual(deployments.length, 1)

  const deployment = deployments[0]
  assert.strictEqual(deployment.applicationId, application.id)
  assert.strictEqual(deployment.applicationStateId, null)
  assert.strictEqual(deployment.namespace, 'platformatic')
  assert.strictEqual(deployment.imageId, imageId)
  assert.strictEqual(deployment.status, 'starting')

  const generationsDeployments = await entities.generationsDeployment.find()
  assert.strictEqual(generationsDeployments.length, 1)

  const foundGenerationDeployment = generationsDeployments[0]
  assert.strictEqual(foundGenerationDeployment.generationId, generation.id)
  assert.strictEqual(foundGenerationDeployment.deploymentId, deployment.id)

  const instances = await entities.instance.find()
  assert.strictEqual(instances.length, 1)

  const instance = instances[0]
  assert.strictEqual(instance.applicationId, application.id)
  assert.strictEqual(instance.deploymentId, deployment.id)
  assert.strictEqual(instance.podId, podId)
  assert.strictEqual(instance.status, 'starting')

  const foundAppConfigs = await entities.applicationsConfig.find()
  assert.strictEqual(foundAppConfigs.length, 1)

  const foundAppConfig = foundAppConfigs[0]
  assert.strictEqual(foundAppConfig.applicationId, application.id)
  assert.deepStrictEqual(foundAppConfig.resources, {
    threads: 1,
    heap: 1024,
    services: []
  })

  const generationsConfigs = await entities.generationsApplicationsConfig.find()
  assert.strictEqual(generationsConfigs.length, 1)

  const foundGenerationAppConfigs = generationsConfigs[0]
  assert.strictEqual(foundGenerationAppConfigs.generationId, generation.id)
  assert.strictEqual(foundGenerationAppConfigs.configId, foundAppConfig.id)

  assert.strictEqual(activities.length, 2)

  const createAppActivity = activities[0]
  assert.strictEqual(createAppActivity.type, 'APPLICATION_CREATE')
  assert.strictEqual(createAppActivity.applicationId, application.id)
  assert.strictEqual(createAppActivity.targetId, application.id)
  assert.strictEqual(createAppActivity.success, true)
  assert.deepStrictEqual(createAppActivity.data, { applicationName })

  const deployAppActivity = activities[1]
  assert.strictEqual(deployAppActivity.type, 'APPLICATION_DEPLOY')
  assert.strictEqual(deployAppActivity.applicationId, application.id)
  assert.strictEqual(deployAppActivity.targetId, application.id)
  assert.strictEqual(deployAppActivity.success, true)
  assert.deepStrictEqual(deployAppActivity.data, { applicationName, imageId })

  assert.strictEqual(controllers.length, 1)

  const controller = controllers[0]
  assert.strictEqual(controller.applicationId, application.id)
  assert.strictEqual(controller.deploymentId, deployment.id)
  assert.strictEqual(controller.namespace, 'platformatic')
  assert.strictEqual(controller.podId, podId)

  assert.strictEqual(iccUpdates.length, 2)

  assert.strictEqual(podsLabels.length, 1)

  const podsLabels1 = podsLabels[0]
  assert.strictEqual(podsLabels1.podId, podId)
  assert.deepStrictEqual(podsLabels1.labels, {
    'platformatic.dev/monitor': 'prometheus',
    'platformatic.dev/application-id': application.id,
    'platformatic.dev/deployment-id': deployment.id
  })

  const createdDeploymentUpdate = iccUpdates[0]
  assert.deepStrictEqual(createdDeploymentUpdate, {
    topic: 'ui-updates/applications',
    type: 'deployment-created',
    data: {
      deploymentId: deployment.id,
      applicationId: application.id
    }
  })

  const createdAppUpdate = iccUpdates[1]
  assert.deepStrictEqual(createdAppUpdate, {
    topic: 'ui-updates/applications',
    type: 'application-created',
    data: {
      applicationId,
      applicationName: application.name
    }
  })

  assert.strictEqual(complianceRules.length, 1)

  const complianceRule = complianceRules[0]
  assert.strictEqual(complianceRule.ruleName, 'outdated-npm-deps')
  assert.deepStrictEqual(complianceRule.rule, {
    name: 'outdated-npm-deps',
    description: 'Outdated NPM Dependencies',
    label: 'Outdated NPM Dependencies',
    applicationId,
    config: {}
  })
})

test('should save a new app instance with the same image', async (t) => {
  const applicationName = 'test-app'
  const podId = 'test-pod-3'
  const imageId = 'test-image-1'

  const activities = []
  await startActivities(t, {
    saveEvent: (activity) => activities.push(activity)
  })
  await startMetrics(t)
  await startScaler(t)
  await startMachinist(t, {
    getPodDetails: (podId) => ({ image: imageId })
  })

  let interceptorConfig = null
  await startTrafficInspector(t, {
    getInterceptorConfigs: () => {
      const configs = []
      if (interceptorConfig) {
        configs.push(interceptorConfig)
      }
      return configs
    }
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_CACHE_RECOMMENDATIONS: 'true',
    PLT_SCALER_ALGORITHM_VERSION: 'v2'
  })

  const {
    generation: generation1,
    application: application1,
    deployment: deployment1
  } = await controlPlane.testApi.saveInstance(
    applicationName,
    imageId,
    'test-pod-1'
  )

  const {
    generation: generation2,
    application: application2,
    deployment: deployment2
  } = await controlPlane.testApi.saveInstance(
    'test-app-2',
    'test-image-2',
    'test-pod-2'
  )

  interceptorConfig = {
    applicationId: application1.id,
    applied: true,
    config: {
      rules: [{
        routeToMatch: 'http://testcom/products/:id',
        headers: {
          'cache-control': 'public, max-age=60'
        }
      }]
    }
  }

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: { applicationName }
  })

  assert.strictEqual(statusCode, 200, body)

  const {
    applicationId,
    applicationName: responseApplicationName,
    config,
    scaler,
    enableOpenTelemetry,
    enableSlicerInterceptor,
    enableTrafficInterceptor
  } = JSON.parse(body)

  assert.strictEqual(responseApplicationName, applicationName)
  assert.strictEqual(enableOpenTelemetry, true)
  assert.strictEqual(enableSlicerInterceptor, true)
  assert.strictEqual(enableTrafficInterceptor, true)

  const { resources, httpCacheConfig } = config
  assert.strictEqual(resources.threads, 1)
  assert.strictEqual(resources.heap, 1024)
  assert.deepStrictEqual(resources.services, [])
  assert.deepStrictEqual(httpCacheConfig, interceptorConfig.config)

  const { entities } = controlPlane.platformatic

  const generations = await entities.generation.find()
  assert.strictEqual(generations.length, 2)

  const foundGeneration1 = generations.find(g => g.version === 1)
  assert.strictEqual(foundGeneration1.id, generation1.id)
  assert.strictEqual(foundGeneration1.version, 1)

  const foundGeneration2 = generations.find(g => g.version === 2)
  assert.strictEqual(foundGeneration2.id, generation2.id)
  assert.strictEqual(foundGeneration2.version, 2)

  const applications = await entities.application.find()
  assert.strictEqual(applications.length, 2)

  assert.strictEqual(applicationId, application1.id)

  const applicationStates = await entities.applicationState.find()
  assert.strictEqual(applicationStates.length, 0)

  const deployments = await entities.deployment.find()
  assert.strictEqual(deployments.length, 2)

  {
    const generation1Deployments = await controlPlane.getGenerationDeployments(
      generation1.id
    )
    assert.strictEqual(generation1Deployments.length, 1)

    const generation1Deployment1 = generation1Deployments[0]
    assert.strictEqual(generation1Deployment1.id, deployment1.id)
  }

  {
    const generation2Deployments = await controlPlane.getGenerationDeployments(
      generation2.id
    )
    assert.strictEqual(generation2Deployments.length, 2)

    const generation2Deployment1 = generation2Deployments.find(
      (d) => d.id === deployment1.id
    )
    const generation2Deployment2 = generation2Deployments.find(
      (d) => d.id === deployment2.id
    )
    assert.strictEqual(generation2Deployment1.id, deployment1.id)
    assert.strictEqual(generation2Deployment2.id, deployment2.id)
  }

  const instances = await entities.instance.find()
  assert.strictEqual(instances.length, 3)

  const instance3 = instances.find((i) => i.podId === podId)
  assert.strictEqual(instance3.applicationId, application1.id)
  assert.strictEqual(instance3.deploymentId, deployment1.id)
  assert.strictEqual(instance3.podId, podId)
  assert.strictEqual(instance3.status, 'starting')

  const foundAppConfigs = await entities.applicationsConfig.find()
  assert.strictEqual(foundAppConfigs.length, 2)

  const foundAppConfig1 = foundAppConfigs.find(
    s => s.applicationId === application1.id
  )
  assert.strictEqual(foundAppConfig1.applicationId, application1.id)
  assert.strictEqual(foundAppConfig1.version, 1)
  assert.deepStrictEqual(foundAppConfig1.resources, {
    threads: 1,
    heap: 1024,
    services: []
  })

  const foundAppConfig2 = foundAppConfigs.find(
    s => s.applicationId === application2.id
  )
  assert.strictEqual(foundAppConfig2.applicationId, application2.id)
  assert.strictEqual(foundAppConfig2.version, 1)
  assert.deepStrictEqual(foundAppConfig2.resources, {
    threads: 1,
    heap: 1024,
    services: []
  })

  const generationsAppConfigs = await entities.generationsApplicationsConfig.find()
  assert.strictEqual(generationsAppConfigs.length, 3)

  const generation1Configs = await controlPlane.getGenerationApplicationsConfigs(
    generation1.id
  )
  assert.strictEqual(generation1Configs.length, 1)

  const generation2Configs = await controlPlane.getGenerationApplicationsConfigs(
    generation2.id
  )
  assert.strictEqual(generation2Configs.length, 2)

  assert.strictEqual(activities.length, 0)

  assert.deepStrictEqual(scaler, { version: 'v2' })
})

test('should detect the same pod with the same image', async (t) => {
  const applicationName = 'test-app-1'
  const podId = 'test-pod-1'
  const imageId = 'test-image-1'

  const activities = []
  await startActivities(t, {
    saveEvent: (activity) => activities.push(activity)
  })
  await startMetrics(t)
  await startScaler(t)
  await startMachinist(t, {
    getPodDetails: (podId) => ({ image: imageId })
  })

  const controlPlane = await startControlPlane(t)

  const {
    generation: generation1,
    application: application1,
    deployment: deployment1,
    instance: instance1
  } = await controlPlane.testApi.saveInstance(
    applicationName,
    imageId,
    podId
  )

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: { applicationName }
  })

  assert.strictEqual(statusCode, 200, body)

  const { applicationId, applicationName: responseApplicationName, config } = JSON.parse(body)

  assert.strictEqual(responseApplicationName, applicationName)

  const { resources } = config
  assert.strictEqual(resources.threads, 1)
  assert.strictEqual(resources.heap, 1024)
  assert.deepStrictEqual(resources.services, [])

  const { entities } = controlPlane.platformatic

  const generations = await entities.generation.find()
  assert.strictEqual(generations.length, 1)

  const foundGeneration1 = generations.find(g => g.version === 1)
  assert.strictEqual(foundGeneration1.id, generation1.id)
  assert.strictEqual(foundGeneration1.version, 1)

  const applications = await entities.application.find()
  assert.strictEqual(applications.length, 1)
  assert.strictEqual(applicationId, application1.id)

  const applicationStates = await entities.applicationState.find()
  assert.strictEqual(applicationStates.length, 0)

  const deployments = await entities.deployment.find()
  assert.strictEqual(deployments.length, 1)

  const foundDeployment1 = deployments[0]
  assert.strictEqual(foundDeployment1.id, deployment1.id)
  assert.strictEqual(foundDeployment1.applicationId, application1.id)
  assert.strictEqual(foundDeployment1.namespace, 'platformatic')
  assert.strictEqual(foundDeployment1.imageId, imageId)
  assert.strictEqual(foundDeployment1.status, 'starting')

  const instances = await entities.instance.find()
  assert.strictEqual(instances.length, 1)

  const foundInstance = instances[0]
  assert.strictEqual(foundInstance.id, instance1.id)
  assert.strictEqual(foundInstance.applicationId, application1.id)
  assert.strictEqual(foundInstance.deploymentId, deployment1.id)
  assert.strictEqual(foundInstance.podId, podId)
  assert.strictEqual(foundInstance.status, 'starting')

  const foundAppConfigs = await entities.applicationsConfig.find()
  assert.strictEqual(foundAppConfigs.length, 1)

  const foundAppConfig1 = foundAppConfigs.find(
    s => s.applicationId === application1.id
  )
  assert.strictEqual(foundAppConfig1.applicationId, application1.id)
  assert.strictEqual(foundAppConfig1.version, 1)
  assert.deepStrictEqual(foundAppConfig1.resources, {
    threads: 1,
    heap: 1024,
    services: []
  })

  const generationsDeployments = await entities.generationsDeployment.find()
  assert.strictEqual(generationsDeployments.length, 1)

  const generationsAppConfigs = await entities.generationsApplicationsConfig.find()
  assert.strictEqual(generationsAppConfigs.length, 1)

  assert.strictEqual(activities.length, 0)
})

test('should save an app instance with a different image', async (t) => {
  const applicationName = 'test-app-1'
  const imageId = 'test-image-3'
  const podId = 'test-pod-3'

  const activities = []
  await startActivities(t, {
    saveEvent: (activity) => activities.push(activity)
  })
  await startMetrics(t)
  await startScaler(t)
  await startMachinist(t, {
    getPodDetails: () => ({ image: imageId })
  })

  const controlPlane = await startControlPlane(t)

  const { application: application1 } = await controlPlane.testApi.saveInstance(
    applicationName,
    'test-image-1',
    'test-pod-1'
  )
  const { application: application2 } = await controlPlane.testApi.saveInstance(
    'test-app-2',
    'test-image-2',
    'test-pod-2'
  )

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: { applicationName }
  })

  assert.strictEqual(statusCode, 200, body)

  const { applicationId, applicationName: responseApplicationName, config } = JSON.parse(body)

  assert.strictEqual(responseApplicationName, applicationName)

  const { resources } = config
  assert.strictEqual(resources.threads, 1)
  assert.strictEqual(resources.heap, 1024)
  assert.deepStrictEqual(resources.services, [])

  const { entities } = controlPlane.platformatic

  const generations = await entities.generation.find()
  assert.strictEqual(generations.length, 3)

  const generation3 = generations.find(g => g.version === 3)
  assert.ok(generation3, 'Generation 3 not found')

  const applications = await entities.application.find()
  assert.strictEqual(applications.length, 2)
  assert.strictEqual(applicationId, application1.id)

  const applicationStates = await entities.applicationState.find()
  assert.strictEqual(applicationStates.length, 0)

  const deployments = await entities.deployment.find()
  assert.strictEqual(deployments.length, 3)

  const generation3Deployments = await controlPlane.getGenerationDeployments(
    generation3.id
  )
  assert.strictEqual(generation3Deployments.length, 2)

  const deployment3 = generation3Deployments.find(
    (d) => d.applicationId === application1.id
  )
  assert.strictEqual(deployment3.applicationId, application1.id)
  assert.strictEqual(deployment3.applicationStateId, null)
  assert.strictEqual(deployment3.namespace, 'platformatic')
  assert.strictEqual(deployment3.imageId, imageId)
  assert.strictEqual(deployment3.status, 'starting')

  const instances = await entities.instance.find()
  assert.strictEqual(instances.length, 3)

  const instance3 = instances.find(
    (i) => i.deploymentId === deployment3.id
  )
  assert.strictEqual(instance3.applicationId, application1.id)
  assert.strictEqual(instance3.deploymentId, deployment3.id)
  assert.strictEqual(instance3.namespace, 'platformatic')
  assert.strictEqual(instance3.podId, podId)
  assert.strictEqual(instance3.status, 'starting')

  const foundAppConfigs = await entities.applicationsConfig.find()
  assert.strictEqual(foundAppConfigs.length, 2)

  const generation3Configs = await controlPlane.getGenerationApplicationsConfigs(
    generation3.id
  )
  assert.strictEqual(generation3Configs.length, 2)

  const generation3AppConfig1 = generation3Configs.find(
    (r) => r.applicationId === application1.id
  )
  assert.strictEqual(generation3AppConfig1.applicationId, application1.id)
  assert.strictEqual(generation3AppConfig1.version, 1)
  assert.deepStrictEqual(generation3AppConfig1.resources, {
    threads: 1,
    heap: 1024,
    services: []
  })

  const generation3AppConfig2 = generation3Configs.find(
    (r) => r.applicationId === application2.id
  )
  assert.strictEqual(generation3AppConfig2.applicationId, application2.id)
  assert.strictEqual(generation3AppConfig2.version, 1)
  assert.deepStrictEqual(generation3AppConfig2.resources, {
    threads: 1,
    heap: 1024,
    services: []
  })

  assert.strictEqual(activities.length, 1)

  const deployAppActivity = activities[0]
  assert.strictEqual(deployAppActivity.type, 'APPLICATION_DEPLOY')
  assert.strictEqual(deployAppActivity.applicationId, application1.id)
  assert.strictEqual(deployAppActivity.targetId, application1.id)
  assert.strictEqual(deployAppActivity.success, true)
  assert.deepStrictEqual(deployAppActivity.data, { applicationName, imageId })
})

test('should save an instance of a new application without httpCache', async (t) => {
  const applicationName = 'test-app'
  const podId = randomUUID()
  const imageId = randomUUID()

  const activities = []
  await startActivities(t, {
    saveEvent: (activity) => activities.push(activity)
  })

  const complianceRules = []
  await startCompliance(t, {
    saveRule: (ruleName, rule) => {
      complianceRules.push({ ruleName, rule })
    }
  })

  await startMetrics(t)

  const controllers = []
  await startScaler(t, {
    savePodController: (controller) => {
      controllers.push(controller)
    }
  })

  const iccUpdates = []
  await startMainService(t, {
    saveIccUpdate: (update) => {
      iccUpdates.push(update)
    }
  })

  const podsLabels = []
  await startMachinist(t, {
    getPodDetails: () => ({ image: imageId }),
    setPodLabels: (podId, labels) => {
      podsLabels.push({ podId, labels })
    }
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_CACHE: false
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: { applicationName }
  })

  assert.strictEqual(statusCode, 200, body)

  const { httpCache } = JSON.parse(body)
  assert.strictEqual(httpCache.clientOpts, null)
})

test('should save a lot of simultaneous instances of different applications', async (t) => {
  const activities = []
  await startActivities(t, {
    saveEvent: (activity) => activities.push(activity)
  })
  await startMetrics(t)
  await startMainService(t)
  await startCompliance(t)

  const controllers = []
  await startScaler(t, {
    savePodController: (instance) => {
      controllers.push(instance)
    }
  })

  const APPS_COUNT = 10
  const APP_PODS_COUNT = 10

  const controlPlane = await startControlPlane(t)

  const params = []
  const applicationNames = []
  const imageIds = []

  for (let i = 0; i < APPS_COUNT; i++) {
    const applicationName = `test-app-${i}`
    const imageId = `test-image-${i}`

    applicationNames.push(applicationName)
    imageIds.push(imageId)

    for (let j = 0; j < APP_PODS_COUNT; j++) {
      const podId = `test-pod-${i}-${j}`
      params.push({ applicationName, imageId, podId })
    }
  }

  await startMachinist(t, {
    getPodDetails: (podId) => {
      const { imageId } = params.find(p => p.podId === podId)
      return { image: imageId }
    }
  })

  // Sort params in a random order
  params.sort(() => Math.random() - 0.5)

  const cacheUsernames = new Set()
  const cachePasswords = new Set()

  const saveInstance = async (params) => {
    const { statusCode, body } = await controlPlane.inject({
      method: 'POST',
      url: `/pods/${params.podId}/instance`,
      headers: {
        'content-type': 'application/json',
        'x-k8s': generateK8sHeader(params.podId)
      },
      body: { applicationName: params.applicationName }
    })
    assert.strictEqual(statusCode, 200, body)

    const { httpCache } = JSON.parse(body)
    const { username, password } = httpCache.clientOpts

    assert.ok(username)
    assert.ok(password)

    cacheUsernames.add(username)
    cachePasswords.add(password)
  }

  const results = await Promise.allSettled(params.map(saveInstance))
  for (const result of results) {
    if (result.status === 'rejected') {
      throw result.reason
    }
  }

  const { entities } = controlPlane.platformatic

  const generations = await entities.generation.find()
  assert.strictEqual(generations.length, APPS_COUNT)

  const lastGeneration = generations.sort((a, b) => b.createdAt - a.createdAt)[0]
  assert.strictEqual(lastGeneration.version, APPS_COUNT)

  const applications = await entities.application.find()
  assert.strictEqual(applications.length, APPS_COUNT)

  const applicationStates = await entities.applicationState.find()
  assert.strictEqual(applicationStates.length, 0)

  const deployments = await entities.deployment.find()
  assert.strictEqual(deployments.length, APPS_COUNT)

  const instances = await entities.instance.find()
  assert.strictEqual(instances.length, params.length)

  const valkeyUsers = await entities.valkeyUser.find()
  assert.strictEqual(valkeyUsers.length, APPS_COUNT)

  const configs = await entities.applicationsConfig.find()
  assert.strictEqual(configs.length, APPS_COUNT)

  assert.strictEqual(controllers.length, APPS_COUNT)
  assert.strictEqual(activities.length, APPS_COUNT * 2)
  assert.strictEqual(cacheUsernames.size, APPS_COUNT)
  assert.strictEqual(cachePasswords.size, APPS_COUNT)

  for (let i = 0; i < APPS_COUNT; i++) {
    const applicationName = applicationNames[i]
    const imageId = imageIds[i]

    const application = applications.find(a => a.name === applicationName)
    assert.ok(application, `Application ${applicationName} not found`)

    const applicationDeployments = deployments.filter(
      (d) => d.applicationId === application.id
    )
    assert.strictEqual(applicationDeployments.length, 1)

    const applicationConfigs = configs.filter(
      (s) => s.applicationId === application.id
    )
    assert.strictEqual(applicationConfigs.length, 1)

    const deployment = applicationDeployments[0]
    assert.strictEqual(deployment.applicationId, application.id)
    assert.strictEqual(deployment.applicationStateId, null)
    assert.strictEqual(deployment.status, 'starting')
    assert.strictEqual(deployment.namespace, 'platformatic')
    assert.strictEqual(deployment.imageId, imageId)

    const applicationPods = instances.filter(
      (i) => i.applicationId === application.id
    )
    assert.strictEqual(applicationPods.length, APP_PODS_COUNT)

    for (const instance of applicationPods) {
      assert.strictEqual(instance.applicationId, application.id)
      assert.strictEqual(instance.deploymentId, deployment.id)
      assert.strictEqual(instance.status, 'starting')
      assert.ok(instance.podId)
    }

    const applicationActivities = activities.filter(
      (a) => a.applicationId === application.id
    )
    assert.strictEqual(applicationActivities.length, 2)

    const createAppActivity = applicationActivities[0]
    assert.strictEqual(createAppActivity.type, 'APPLICATION_CREATE')
    assert.strictEqual(createAppActivity.applicationId, application.id)
    assert.strictEqual(createAppActivity.targetId, application.id)
    assert.strictEqual(createAppActivity.success, true)
    assert.deepStrictEqual(createAppActivity.data, { applicationName })

    const deployAppActivity = applicationActivities[1]
    assert.strictEqual(deployAppActivity.type, 'APPLICATION_DEPLOY')
    assert.strictEqual(deployAppActivity.applicationId, application.id)
    assert.strictEqual(deployAppActivity.targetId, application.id)
    assert.strictEqual(deployAppActivity.success, true)
    assert.deepStrictEqual(deployAppActivity.data, { applicationName, imageId })
  }

  let prevGenerationDeployments = []
  let prevGenerationAppConfigs = []

  for (let version = 1; version <= APPS_COUNT; version++) {
    const generation = generations.find(g => g.version === version)

    const generationDeployments = await controlPlane.getGenerationDeployments(
      generation.id
    )
    const generationAppConfigs = await controlPlane.getGenerationApplicationsConfigs(
      generation.id
    )

    assert.strictEqual(
      generationDeployments.length,
      version,
      `Generation ${version} should have ${version} deployments`
    )

    assert.strictEqual(
      generationAppConfigs.length,
      version,
      `Generation ${version} should have ${version} configs`
    )

    assert.ok(generationDeployments.length === prevGenerationDeployments.length + 1)
    assert.ok(generationAppConfigs.length === prevGenerationAppConfigs.length + 1)

    for (const deployment of prevGenerationDeployments) {
      const copiedDeployment = generationDeployments.find(
        (d) => d.id === deployment.id
      )
      assert.ok(copiedDeployment, `Deployment ${deployment.id} not found`)
    }

    for (const config of prevGenerationAppConfigs) {
      const copiedConfig = generationAppConfigs.find(
        (r) => r.id === config.id
      )
      assert.ok(copiedConfig, `Config ${config.id} not found`)
    }

    prevGenerationAppConfigs = generationAppConfigs
    prevGenerationDeployments = generationDeployments
  }
})

test('should throw 401 if x-k8s header is missing', async (t) => {
  const applicationName = 'test-app'
  const podId = randomUUID()

  const controlPlane = await startControlPlane(t)

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json'
    },
    body: { applicationName }
  })

  assert.strictEqual(statusCode, 401, body)

  const error = JSON.parse(body)
  assert.deepStrictEqual(error, {
    statusCode: 401,
    code: 'PLT_CONTROL_PLANE_MISSING_K8S_AUTH_CONTEXT',
    error: 'Unauthorized',
    message: `Missing K8s auth context for pod "${podId}"`
  })
})

test('should throw 401 if pod id param does match with a jwt pod id', async (t) => {
  const applicationName = 'test-app'
  const podId = randomUUID()
  const jwtPodId = randomUUID()

  const controlPlane = await startControlPlane(t)

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(jwtPodId)
    },
    body: { applicationName }
  })

  assert.strictEqual(statusCode, 401, body)

  const error = JSON.parse(body)
  assert.deepStrictEqual(error, {
    statusCode: 401,
    code: 'PLT_CONTROL_PLANE_POD_ID_NOT_AUTHORIZED',
    error: 'Unauthorized',
    message: `Request pod id "${podId}" does not match with a jwt pod id "${jwtPodId}"`
  })
})

test('should get applicationName from controller name when missing from request body', async (t) => {
  const controllerName = 'test-app-k8s-abc123def'
  const podId = randomUUID()
  const imageId = randomUUID()

  const activities = []
  await startActivities(t, {
    saveEvent: (activity) => activities.push(activity)
  })

  const complianceRules = []
  await startCompliance(t, {
    saveRule: (ruleName, rule) => {
      complianceRules.push({ ruleName, rule })
    }
  })

  await startMetrics(t)

  const controllers = []
  await startScaler(t, {
    savePodController: (controller) => {
      controllers.push(controller)
    }
  })

  const iccUpdates = []
  await startMainService(t, {
    saveIccUpdate: (update) => {
      iccUpdates.push(update)
    }
  })

  const podsLabels = []
  await startMachinist(t, {
    getPodDetails: () => ({
      image: imageId,
      controller: {
        name: controllerName
      }
    }),
    setPodLabels: (podId, labels) => {
      podsLabels.push({ podId, labels })
    }
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_CACHE_RECOMMENDATIONS: 'false'
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: {} // No applicationName in body
  })

  assert.strictEqual(statusCode, 200, body)

  const {
    applicationId,
    applicationName: responseApplicationName,
    config,
    httpCache,
    iccServices,
    enableOpenTelemetry,
    enableSlicerInterceptor,
    enableTrafficInterceptor
  } = JSON.parse(body)

  assert.strictEqual(responseApplicationName, controllerName)
  assert.strictEqual(enableOpenTelemetry, false)
  assert.strictEqual(enableSlicerInterceptor, false)
  assert.strictEqual(enableTrafficInterceptor, false)

  const { resources, httpCacheConfig } = config
  assert.strictEqual(resources.threads, 1)
  assert.strictEqual(resources.heap, 1024)
  assert.deepStrictEqual(resources.services, [])
  assert.strictEqual(httpCacheConfig, null)

  assert.strictEqual(httpCache.clientOpts.host, 'localhost')
  assert.strictEqual(httpCache.clientOpts.port, 6342)
  assert.strictEqual(
    httpCache.clientOpts.username,
    `plt-application-${applicationId}`
  )
  assert.strictEqual(
    httpCache.clientOpts.keyPrefix,
    `${applicationId}:`
  )
  assert.ok(httpCache.clientOpts.password)

  assert.deepStrictEqual(Object.keys(iccServices).sort(), [
    'activities',
    'compliance',
    'cron',
    'metrics',
    'riskEngine',
    'riskManager',
    'riskService',
    'scaler',
    'trafficante', // v2 default
    'userManager'
  ])

  const { entities } = controlPlane.platformatic

  const generations = await entities.generation.find()
  assert.strictEqual(generations.length, 1)

  const generation = generations[0]
  assert.strictEqual(generation.version, 1)

  const applications = await entities.application.find()
  assert.strictEqual(applications.length, 1)

  const application = applications[0]
  assert.strictEqual(application.name, controllerName)
  assert.strictEqual(application.id, applicationId)
})

test('should throw ApplicationNameNotFound when applicationName is missing from both body and controller', async (t) => {
  const podId = randomUUID()
  const imageId = randomUUID()

  await startMachinist(t, {
    getPodDetails: () => ({
      image: imageId,
      controller: null // No controller
    })
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_CACHE_RECOMMENDATIONS: 'false'
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: {} // No applicationName in body
  })

  assert.strictEqual(statusCode, 400, body)

  const error = JSON.parse(body)
  assert.deepStrictEqual(error, {
    statusCode: 400,
    code: 'PLT_CONTROL_PLANE_APPLICATION_NAME_NOT_FOUND',
    error: 'Bad Request',
    message: `Application name not found for pod "${podId}"`
  })
})

test('should prefer applicationName from body over controller name', async (t) => {
  const bodyApplicationName = 'test-app-body'
  const controllerName = 'test-app-k8s-xyz789abc'
  const podId = randomUUID()
  const imageId = randomUUID()

  const activities = []
  await startActivities(t, {
    saveEvent: (activity) => activities.push(activity)
  })

  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)

  await startMachinist(t, {
    getPodDetails: () => ({
      image: imageId,
      controller: {
        name: controllerName
      }
    })
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_CACHE_RECOMMENDATIONS: 'false'
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: { applicationName: bodyApplicationName }
  })

  assert.strictEqual(statusCode, 200, body)

  const {
    applicationId,
    applicationName: responseApplicationName
  } = JSON.parse(body)

  assert.strictEqual(responseApplicationName, bodyApplicationName)

  const { entities } = controlPlane.platformatic
  const applications = await entities.application.find()
  assert.strictEqual(applications.length, 1)

  const application = applications[0]
  assert.strictEqual(application.name, bodyApplicationName)
  assert.strictEqual(application.id, applicationId)
})

test('should throw ApplicationNameNotFound when controller name is undefined', async (t) => {
  const podId = randomUUID()
  const imageId = randomUUID()

  await startMachinist(t, {
    getPodDetails: () => ({
      image: imageId,
      controller: {
        name: undefined // No name
      }
    })
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_CACHE_RECOMMENDATIONS: 'false'
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: {} // No applicationName in body
  })

  assert.strictEqual(statusCode, 400, body)

  const error = JSON.parse(body)
  assert.deepStrictEqual(error, {
    statusCode: 400,
    code: 'PLT_CONTROL_PLANE_APPLICATION_NAME_NOT_FOUND',
    error: 'Bad Request',
    message: `Application name not found for pod "${podId}"`
  })
})

test('should create HTTPRoute with default rule only for first version', async (t) => {
  const applicationName = 'test-app-skew'
  const podId = randomUUID()
  const imageId = randomUUID()
  const appLabel = 'my-versioned-app'
  const versionLabel = 'v1.2.3'

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)

  const servicesByLabelsRequests = []
  const appliedHTTPRoutes = []
  await startMachinist(t, {
    getPodDetails: () => ({
      image: imageId,
      labels: {
        'app.kubernetes.io/name': appLabel,
        'plt.dev/version': versionLabel
      },
      controller: {
        name: 'my-versioned-app-v1.2.3'
      }
    }),
    listGateways: () => [{
      metadata: {
        name: 'platform-gateway',
        namespace: 'platformatic'
      },
      spec: {
        gatewayClassName: 'eg',
        listeners: [{ name: 'http', protocol: 'HTTP', port: 80 }]
      }
    }],
    getServicesByLabels: (namespace, labels) => {
      servicesByLabelsRequests.push({ namespace, labels })
      return [{
        metadata: {
          name: 'my-versioned-app-v1.2.3',
          namespace: 'platformatic'
        },
        spec: {
          ports: [{ port: 3042 }]
        }
      }]
    },
    applyHTTPRoute: (namespace, httpRoute) => {
      appliedHTTPRoutes.push({ namespace, httpRoute })
      return httpRoute
    }
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_SKEW_PROTECTION: 'true'
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: { applicationName }
  })

  assert.strictEqual(statusCode, 200, body)

  const { applicationName: responseApplicationName } = JSON.parse(body)
  assert.strictEqual(responseApplicationName, applicationName)

  assert.strictEqual(servicesByLabelsRequests.length, 1)
  assert.deepStrictEqual(servicesByLabelsRequests[0].labels, {
    'app.kubernetes.io/name': appLabel,
    'plt.dev/version': versionLabel
  })

  // First version: HTTPRoute created with only the default rule
  assert.strictEqual(appliedHTTPRoutes.length, 1)
  const { namespace: routeNs, httpRoute } = appliedHTTPRoutes[0]
  assert.strictEqual(routeNs, 'platformatic')
  assert.strictEqual(httpRoute.metadata.name, 'my-versioned-app')
  assert.strictEqual(httpRoute.spec.rules.length, 1)

  // Default rule with path prefix, no draining rules
  const defaultRule = httpRoute.spec.rules[0]
  assert.deepStrictEqual(defaultRule.matches, [{
    path: { type: 'PathPrefix', value: '/my-versioned-app' }
  }])
  assert.strictEqual(defaultRule.backendRefs[0].name, 'my-versioned-app-v1.2.3')
  assert.strictEqual(defaultRule.backendRefs[0].port, 3042)
  assert.strictEqual(defaultRule.filters[0].type, 'URLRewrite')
  assert.ok(defaultRule.filters[1].responseHeaderModifier.add[0].value.includes('__plt_dpl=v1.2.3'))

  // No hostnames (no plt.dev/hostname label)
  assert.strictEqual(httpRoute.spec.hostnames, undefined)

  assert.deepStrictEqual(httpRoute.spec.parentRefs, [{
    kind: 'Gateway',
    name: 'platform-gateway',
    namespace: 'platformatic'
  }])

  // Verify version was saved in the registry
  const { entities } = controlPlane.platformatic
  const versions = await entities.versionRegistry.find({
    where: { appLabel: { eq: appLabel } }
  })
  assert.strictEqual(versions.length, 1)
  assert.strictEqual(versions[0].versionLabel, versionLabel)
  assert.strictEqual(versions[0].pathPrefix, '/my-versioned-app')
  assert.strictEqual(versions[0].hostname, null)
})

test('should create HTTPRoute when second version is detected', async (t) => {
  const applicationName = 'test-app-skew-v2'
  const appLabel = 'my-versioned-app-2'

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)

  let currentPodDetails = null
  const appliedHTTPRoutes = []
  await startMachinist(t, {
    getPodDetails: () => currentPodDetails,
    listGateways: () => [{
      metadata: { name: 'platform-gateway', namespace: 'platformatic' },
      spec: { gatewayClassName: 'eg', listeners: [{ name: 'http', protocol: 'HTTP', port: 80 }] }
    }],
    getServicesByLabels: (namespace, labels) => {
      const version = labels['plt.dev/version']
      return [{
        metadata: { name: `${appLabel}-${version}`, namespace: 'platformatic' },
        spec: { ports: [{ port: 3042 }] }
      }]
    },
    applyHTTPRoute: (namespace, httpRoute) => {
      appliedHTTPRoutes.push({ namespace, httpRoute })
      return httpRoute
    }
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_SKEW_PROTECTION: 'true'
  })

  // First version — HTTPRoute with default rule only
  const podId1 = randomUUID()
  const imageId1 = randomUUID()
  currentPodDetails = {
    image: imageId1,
    labels: {
      'app.kubernetes.io/name': appLabel,
      'plt.dev/version': 'v1.0.0'
    },
    controller: { name: `${appLabel}-v1.0.0` }
  }

  const res1 = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId1}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId1)
    },
    body: { applicationName }
  })
  assert.strictEqual(res1.statusCode, 200, res1.body)
  assert.strictEqual(appliedHTTPRoutes.length, 1)
  assert.strictEqual(appliedHTTPRoutes[0].httpRoute.spec.rules.length, 1)

  // Second version — HTTPRoute updated with both versions
  const podId2 = randomUUID()
  const imageId2 = randomUUID()
  currentPodDetails = {
    image: imageId2,
    labels: {
      'app.kubernetes.io/name': appLabel,
      'plt.dev/version': 'v2.0.0'
    },
    controller: { name: `${appLabel}-v2.0.0` }
  }

  const res2 = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId2}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId2)
    },
    body: { applicationName }
  })
  assert.strictEqual(res2.statusCode, 200, res2.body)

  assert.strictEqual(appliedHTTPRoutes.length, 2)
  const { httpRoute } = appliedHTTPRoutes[1]
  assert.strictEqual(httpRoute.metadata.name, appLabel)

  // 2 rules for draining v1 (cookie + header) + 1 default for v2
  assert.strictEqual(httpRoute.spec.rules.length, 3)

  // Path prefix on all rules — derived from appLabel
  for (const rule of httpRoute.spec.rules) {
    assert.deepStrictEqual(rule.matches[0].path, { type: 'PathPrefix', value: `/${appLabel}` })
  }

  // No hostname label → hostnames absent
  assert.strictEqual(httpRoute.spec.hostnames, undefined)

  // Default rule routes to production (v2)
  const defaultRule = httpRoute.spec.rules[2]
  assert.strictEqual(defaultRule.backendRefs[0].name, `${appLabel}-v2.0.0`)

  // Draining rule routes to v1
  assert.strictEqual(httpRoute.spec.rules[0].backendRefs[0].name, `${appLabel}-v1.0.0`)
})

test('should use plt.dev/hostname and plt.dev/path labels when present', async (t) => {
  const applicationName = 'test-app-skew-labels'
  const appLabel = 'my-labeled-app'

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)

  let currentPodDetails = null
  const appliedHTTPRoutes = []
  await startMachinist(t, {
    getPodDetails: () => currentPodDetails,
    listGateways: () => [{
      metadata: { name: 'platform-gateway', namespace: 'platformatic' },
      spec: { gatewayClassName: 'eg', listeners: [{ name: 'http', protocol: 'HTTP', port: 80 }] }
    }],
    getServicesByLabels: (namespace, labels) => {
      const version = labels['plt.dev/version']
      return [{
        metadata: { name: `${appLabel}-${version}`, namespace: 'platformatic' },
        spec: { ports: [{ port: 3042 }] }
      }]
    },
    applyHTTPRoute: (namespace, httpRoute) => {
      appliedHTTPRoutes.push({ namespace, httpRoute })
      return httpRoute
    }
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_SKEW_PROTECTION: 'true'
  })

  const labelsBase = {
    'app.kubernetes.io/name': appLabel,
    'plt.dev/hostname': 'myapp.example.com',
    'plt.dev/path': '/api/leads'
  }

  // First version
  const podId1 = randomUUID()
  currentPodDetails = {
    image: randomUUID(),
    labels: { ...labelsBase, 'plt.dev/version': 'v1.0.0' },
    controller: { name: `${appLabel}-v1.0.0` }
  }

  const res1 = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId1}/instance`,
    headers: { 'content-type': 'application/json', 'x-k8s': generateK8sHeader(podId1) },
    body: { applicationName }
  })
  assert.strictEqual(res1.statusCode, 200, res1.body)

  // Verify first version saved with correct pathPrefix and hostname
  const { entities } = controlPlane.platformatic
  const versionsAfterFirst = await entities.versionRegistry.find({
    where: { appLabel: { eq: appLabel } }
  })
  assert.strictEqual(versionsAfterFirst.length, 1)
  assert.strictEqual(versionsAfterFirst[0].pathPrefix, '/api/leads')
  assert.strictEqual(versionsAfterFirst[0].hostname, 'myapp.example.com')

  // Second version — triggers HTTPRoute
  const podId2 = randomUUID()
  currentPodDetails = {
    image: randomUUID(),
    labels: { ...labelsBase, 'plt.dev/version': 'v2.0.0' },
    controller: { name: `${appLabel}-v2.0.0` }
  }

  const res2 = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId2}/instance`,
    headers: { 'content-type': 'application/json', 'x-k8s': generateK8sHeader(podId2) },
    body: { applicationName }
  })
  assert.strictEqual(res2.statusCode, 200, res2.body)

  // 2 HTTPRoutes applied: first version (default only) + second version (with draining)
  assert.strictEqual(appliedHTTPRoutes.length, 2)
  const { httpRoute } = appliedHTTPRoutes[1]

  // Hostname is set
  assert.deepStrictEqual(httpRoute.spec.hostnames, ['myapp.example.com'])

  // Custom path prefix on all rules
  for (const rule of httpRoute.spec.rules) {
    assert.deepStrictEqual(rule.matches[0].path, { type: 'PathPrefix', value: '/api/leads' })
  }
})

test('should use custom path prefix without hostname when only plt.dev/path is set', async (t) => {
  const applicationName = 'test-app-path-only'
  const appLabel = 'path-only-app'

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)

  const appliedHTTPRoutes = []
  await startMachinist(t, {
    getPodDetails: () => ({
      image: randomUUID(),
      labels: {
        'app.kubernetes.io/name': appLabel,
        'plt.dev/version': 'v1.0.0',
        'plt.dev/path': '/api/leads'
      },
      controller: { name: `${appLabel}-v1.0.0` }
    }),
    listGateways: () => [{
      metadata: { name: 'platform-gateway', namespace: 'platformatic' },
      spec: { gatewayClassName: 'eg', listeners: [{ name: 'http', protocol: 'HTTP', port: 80 }] }
    }],
    getServicesByLabels: (namespace, labels) => [{
      metadata: { name: `${appLabel}-v1.0.0`, namespace: 'platformatic' },
      spec: { ports: [{ port: 3042 }] }
    }],
    applyHTTPRoute: (namespace, httpRoute) => {
      appliedHTTPRoutes.push({ namespace, httpRoute })
      return httpRoute
    }
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_SKEW_PROTECTION: 'true'
  })

  const podId = randomUUID()
  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: { 'content-type': 'application/json', 'x-k8s': generateK8sHeader(podId) },
    body: { applicationName }
  })
  assert.strictEqual(statusCode, 200, body)

  assert.strictEqual(appliedHTTPRoutes.length, 1)
  const { httpRoute } = appliedHTTPRoutes[0]

  // Custom path prefix used
  assert.deepStrictEqual(httpRoute.spec.rules[0].matches[0].path, { type: 'PathPrefix', value: '/api/leads' })

  // No hostname — hostnames field absent
  assert.strictEqual(httpRoute.spec.hostnames, undefined)

  // Verify DB
  const { entities } = controlPlane.platformatic
  const versions = await entities.versionRegistry.find({
    where: { appLabel: { eq: appLabel } }
  })
  assert.strictEqual(versions[0].pathPrefix, '/api/leads')
  assert.strictEqual(versions[0].hostname, null)
})

test('should use default path prefix with hostname when only plt.dev/hostname is set', async (t) => {
  const applicationName = 'test-app-hostname-only'
  const appLabel = 'hostname-only-app'

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)

  const appliedHTTPRoutes = []
  await startMachinist(t, {
    getPodDetails: () => ({
      image: randomUUID(),
      labels: {
        'app.kubernetes.io/name': appLabel,
        'plt.dev/version': 'v1.0.0',
        'plt.dev/hostname': 'myapp.example.com'
      },
      controller: { name: `${appLabel}-v1.0.0` }
    }),
    listGateways: () => [{
      metadata: { name: 'platform-gateway', namespace: 'platformatic' },
      spec: { gatewayClassName: 'eg', listeners: [{ name: 'http', protocol: 'HTTP', port: 80 }] }
    }],
    getServicesByLabels: (namespace, labels) => [{
      metadata: { name: `${appLabel}-v1.0.0`, namespace: 'platformatic' },
      spec: { ports: [{ port: 3042 }] }
    }],
    applyHTTPRoute: (namespace, httpRoute) => {
      appliedHTTPRoutes.push({ namespace, httpRoute })
      return httpRoute
    }
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_SKEW_PROTECTION: 'true'
  })

  const podId = randomUUID()
  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: { 'content-type': 'application/json', 'x-k8s': generateK8sHeader(podId) },
    body: { applicationName }
  })
  assert.strictEqual(statusCode, 200, body)

  assert.strictEqual(appliedHTTPRoutes.length, 1)
  const { httpRoute } = appliedHTTPRoutes[0]

  // Default path prefix derived from appLabel
  assert.deepStrictEqual(httpRoute.spec.rules[0].matches[0].path, { type: 'PathPrefix', value: `/${appLabel}` })

  // Hostname is set
  assert.deepStrictEqual(httpRoute.spec.hostnames, ['myapp.example.com'])

  // Verify DB
  const { entities } = controlPlane.platformatic
  const versions = await entities.versionRegistry.find({
    where: { appLabel: { eq: appLabel } }
  })
  assert.strictEqual(versions[0].pathPrefix, `/${appLabel}`)
  assert.strictEqual(versions[0].hostname, 'myapp.example.com')
})

test('should handle duplicate pod registration for the same version', async (t) => {
  const applicationName = 'test-app-dup-version'
  const appLabel = 'dup-version-app'

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)

  const appliedHTTPRoutes = []
  await startMachinist(t, {
    getPodDetails: () => ({
      image: randomUUID(),
      labels: {
        'app.kubernetes.io/name': appLabel,
        'plt.dev/version': 'v1.0.0'
      },
      controller: { name: `${appLabel}-v1.0.0` }
    }),
    listGateways: () => [{
      metadata: { name: 'platform-gateway', namespace: 'platformatic' },
      spec: { gatewayClassName: 'eg', listeners: [{ name: 'http', protocol: 'HTTP', port: 80 }] }
    }],
    getServicesByLabels: (namespace, labels) => [{
      metadata: { name: `${appLabel}-v1.0.0`, namespace: 'platformatic' },
      spec: { ports: [{ port: 3042 }] }
    }],
    applyHTTPRoute: (namespace, httpRoute) => {
      appliedHTTPRoutes.push({ namespace, httpRoute })
      return httpRoute
    }
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_SKEW_PROTECTION: 'true'
  })

  // First pod of v1.0.0
  const podId1 = randomUUID()
  const res1 = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId1}/instance`,
    headers: { 'content-type': 'application/json', 'x-k8s': generateK8sHeader(podId1) },
    body: { applicationName }
  })
  assert.strictEqual(res1.statusCode, 200, res1.body)

  // Second pod of the same v1.0.0
  const podId2 = randomUUID()
  const res2 = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId2}/instance`,
    headers: { 'content-type': 'application/json', 'x-k8s': generateK8sHeader(podId2) },
    body: { applicationName }
  })
  assert.strictEqual(res2.statusCode, 200, res2.body)

  // Only one version in the registry (UNIQUE constraint)
  const { entities } = controlPlane.platformatic
  const versions = await entities.versionRegistry.find({
    where: { appLabel: { eq: appLabel } }
  })
  assert.strictEqual(versions.length, 1)
  assert.strictEqual(versions[0].versionLabel, 'v1.0.0')

  // HTTPRoute applied twice but both with just the default rule (no draining)
  assert.strictEqual(appliedHTTPRoutes.length, 2)
  assert.strictEqual(appliedHTTPRoutes[0].httpRoute.spec.rules.length, 1)
  assert.strictEqual(appliedHTTPRoutes[1].httpRoute.spec.rules.length, 1)
})

test('should skip version detection when skew protection is disabled', async (t) => {
  const applicationName = 'test-app-no-skew'
  const podId = randomUUID()
  const imageId = randomUUID()

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)

  const servicesByLabelsRequests = []
  await startMachinist(t, {
    getPodDetails: () => ({
      image: imageId,
      labels: {
        'app.kubernetes.io/name': 'my-app',
        'plt.dev/version': 'v1.0.0'
      },
      controller: {
        name: 'my-app-v1.0.0'
      }
    }),
    getServicesByLabels: (namespace, labels) => {
      servicesByLabelsRequests.push({ namespace, labels })
      return []
    }
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_SKEW_PROTECTION: 'false'
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: { applicationName }
  })

  assert.strictEqual(statusCode, 200, body)
  assert.strictEqual(servicesByLabelsRequests.length, 0)
})

test('should handle missing version labels gracefully when skew protection is enabled', async (t) => {
  const applicationName = 'test-app-no-labels'
  const podId = randomUUID()
  const imageId = randomUUID()

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)

  const servicesByLabelsRequests = []
  await startMachinist(t, {
    getPodDetails: () => ({
      image: imageId
      // No labels
    }),
    getServicesByLabels: (namespace, labels) => {
      servicesByLabelsRequests.push({ namespace, labels })
      return []
    }
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_SKEW_PROTECTION: 'true'
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: { applicationName }
  })

  assert.strictEqual(statusCode, 200, body)
  // Should not call getServicesByLabels when labels are missing
  assert.strictEqual(servicesByLabelsRequests.length, 0)
})

test('should throw ApplicationNameNotFound when controller name is empty string', async (t) => {
  const podId = randomUUID()
  const imageId = randomUUID()

  await startMachinist(t, {
    getPodDetails: () => ({
      image: imageId,
      controller: {
        name: '' // Empty name
      }
    })
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_CACHE_RECOMMENDATIONS: 'false'
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: {} // No applicationName in body
  })

  assert.strictEqual(statusCode, 400, body)

  const error = JSON.parse(body)
  assert.deepStrictEqual(error, {
    statusCode: 400,
    code: 'PLT_CONTROL_PLANE_APPLICATION_NAME_NOT_FOUND',
    error: 'Bad Request',
    message: `Application name not found for pod "${podId}"`
  })
})

test('should accept controller name without dashes', async (t) => {
  const controllerName = 'nodasheshere'
  const podId = randomUUID()
  const imageId = randomUUID()

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)

  await startMachinist(t, {
    getPodDetails: () => ({
      image: imageId,
      controller: {
        name: controllerName
      }
    })
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_CACHE_RECOMMENDATIONS: 'false'
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: {} // No applicationName in body
  })

  assert.strictEqual(statusCode, 200, body)

  const {
    applicationId,
    applicationName: responseApplicationName
  } = JSON.parse(body)

  assert.strictEqual(responseApplicationName, controllerName)

  const { entities } = controlPlane.platformatic
  const applications = await entities.application.find()
  assert.strictEqual(applications.length, 1)

  const application = applications[0]
  assert.strictEqual(application.name, controllerName)
  assert.strictEqual(application.id, applicationId)
})

test('should accept controller regardless of type', async (t) => {
  const controllerName = 'my-app-deployment'
  const podId = randomUUID()
  const imageId = randomUUID()

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)

  await startMachinist(t, {
    getPodDetails: () => ({
      image: imageId,
      controller: {
        name: controllerName,
        kind: 'Deployment' // Not a ReplicaSet, but that's OK
      }
    })
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_CACHE_RECOMMENDATIONS: 'false'
  })

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: {} // No applicationName in body
  })

  assert.strictEqual(statusCode, 200, body)

  const {
    applicationId,
    applicationName: responseApplicationName
  } = JSON.parse(body)

  assert.strictEqual(responseApplicationName, controllerName)

  const { entities } = controlPlane.platformatic
  const applications = await entities.application.find()
  assert.strictEqual(applications.length, 1)

  const application = applications[0]
  assert.strictEqual(application.name, controllerName)
  assert.strictEqual(application.id, applicationId)
})

test('should use existing pod data without fetching application name from Kubernetes', async (t) => {
  const applicationName = 'existing-app'
  const podId = 'existing-pod-1'
  const imageId = 'existing-image-1'

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)

  let kubernetesCallCount = 0
  await startMachinist(t, {
    getPodDetails: (podId) => {
      kubernetesCallCount++
      return {
        image: imageId,
        controller: { name: 'should-not-be-used' }
      }
    }
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_CACHE_RECOMMENDATIONS: 'false'
  })

  // Pre-populate the database with an existing pod
  await controlPlane.testApi.saveInstance(
    applicationName,
    imageId,
    podId
  )

  // Reset the call count after initial setup
  kubernetesCallCount = 0

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: {} // No applicationName in body
  })

  assert.strictEqual(statusCode, 200, body)

  const { applicationName: responseApplicationName } = JSON.parse(body)
  assert.strictEqual(responseApplicationName, applicationName)

  // Verify that Kubernetes was called only once (for image consistency check)
  // and NOT for application name resolution
  assert.strictEqual(kubernetesCallCount, 1, 'Should only call Kubernetes once for image check')
})

test('should use existing pod data when applicationName in request matches database', async (t) => {
  const applicationName = 'matching-app'
  const podId = 'matching-pod-1'
  const imageId = 'matching-image-1'

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)

  let kubernetesCallCount = 0
  await startMachinist(t, {
    getPodDetails: (podId) => {
      kubernetesCallCount++
      return {
        image: imageId,
        controller: { name: 'should-not-be-used' }
      }
    }
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_CACHE_RECOMMENDATIONS: 'false'
  })

  // Pre-populate the database with an existing pod
  await controlPlane.testApi.saveInstance(
    applicationName,
    imageId,
    podId
  )

  // Reset the call count after initial setup
  kubernetesCallCount = 0

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: { applicationName } // Provide matching applicationName
  })

  assert.strictEqual(statusCode, 200, body)

  const { applicationName: responseApplicationName } = JSON.parse(body)
  assert.strictEqual(responseApplicationName, applicationName)

  // Verify that Kubernetes was called only once (for image consistency check)
  // and NOT for application name resolution
  assert.strictEqual(kubernetesCallCount, 1, 'Should only call Kubernetes once for image check')
})

test('should throw error when applicationName in request does not match database', async (t) => {
  const dbApplicationName = 'db-app'
  const requestApplicationName = 'different-app'
  const podId = 'mismatched-pod-1'
  const imageId = 'mismatched-image-1'

  await startActivities(t)
  await startCompliance(t)
  await startMetrics(t)
  await startScaler(t)
  await startMainService(t)

  let kubernetesCallCount = 0
  await startMachinist(t, {
    getPodDetails: (podId) => {
      kubernetesCallCount++
      return {
        image: imageId,
        controller: { name: 'should-not-be-used' }
      }
    }
  })

  const controlPlane = await startControlPlane(t, {}, {
    PLT_FEATURE_CACHE_RECOMMENDATIONS: 'false'
  })

  // Pre-populate the database with an existing pod
  await controlPlane.testApi.saveInstance(
    dbApplicationName,
    imageId,
    podId
  )

  // Reset the call count after initial setup
  kubernetesCallCount = 0

  const { statusCode, body } = await controlPlane.inject({
    method: 'POST',
    url: `/pods/${podId}/instance`,
    headers: {
      'content-type': 'application/json',
      'x-k8s': generateK8sHeader(podId)
    },
    body: { applicationName: requestApplicationName } // Provide non-matching applicationName
  })

  assert.strictEqual(statusCode, 400, body)

  const error = JSON.parse(body)
  assert.deepStrictEqual(error, {
    statusCode: 400,
    code: 'PLT_CONTROL_PLANE_POD_ASSIGNED_TO_DIFFERENT_APPLICATION',
    error: 'Bad Request',
    message: `Pod "${podId}" is assigned to a different application "${dbApplicationName}"`
  })

  // Verify that Kubernetes was NOT called for application name resolution
  // since we failed validation before getting to image check
  assert.strictEqual(kubernetesCallCount, 0, 'Should not call Kubernetes when validation fails early')
})
