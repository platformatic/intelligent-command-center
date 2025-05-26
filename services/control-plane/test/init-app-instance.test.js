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

  const { applicationId, config, httpCache, iccServices } = JSON.parse(body)

  const { version, resources } = config
  assert.strictEqual(version, 1)
  assert.strictEqual(resources.threads, 1)
  assert.strictEqual(resources.heap, 1024)
  assert.deepStrictEqual(resources.services, [])

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
    'trafficante',
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

  assert.strictEqual(iccUpdates.length, 1)

  assert.strictEqual(podsLabels.length, 1)

  const podsLabels1 = podsLabels[0]
  assert.strictEqual(podsLabels1.podId, podId)
  assert.deepStrictEqual(podsLabels1.labels, {
    'platformatic.dev/monitor': 'prometheus',
    'platformatic.dev/application-id': application.id,
    'platformatic.dev/deployment-id': deployment.id
  })

  const createdAppUpdate = iccUpdates[0]
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

  const controlPlane = await startControlPlane(t)

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

  const { applicationId, config } = JSON.parse(body)

  const { version, resources } = config
  assert.strictEqual(version, 1)
  assert.strictEqual(resources.threads, 1)
  assert.strictEqual(resources.heap, 1024)
  assert.deepStrictEqual(resources.services, [])

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

  const { applicationId, config } = JSON.parse(body)

  const { version, resources } = config
  assert.strictEqual(version, 1)
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

  const { applicationId, config } = JSON.parse(body)

  const { version, resources } = config
  assert.strictEqual(version, 1)
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
