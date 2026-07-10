import {
  getGenerations,
  getDeployments,
  getApplicationStates,
  getApplications,
  setBaseUrl as setBaseUrlControlPlane,
  getApplicationById,
  getApplicationStatesForApplication,
  getGenerationGraph
} from '../clients/control-plane/control-plane.mjs'

import {
  setBaseUrl as setBaseUrlCompendium
} from '../clients/compendium/compendium.mjs'

import { unitSingular, unitSingularCap } from './components/application/autoscaler/v2/unitLabel'

import {
  setBaseUrl as setBaseURiskManager
} from '../clients/risk-manager/risk-manager.mjs'

import {
  getReports,
  setBaseUrl as setBaseURLCompliance
} from '../clients/compliance/compliance.mjs'

import { getLinksForTaxonomyGraph } from './utilities/taxonomy'

import extractScalingEvents from './utilities/extract-scaling-events'

import { sortCollection, sortCollectionByDate } from './utilitySorting'

import callApi from './api/common'
import { getScalingHistorySummary } from './api/autoscaler'
const baseUrl = `${import.meta.env.VITE_API_BASE_URL}`
const baseApiUrl = `${baseUrl}/api`
setBaseUrlControlPlane(`${baseUrl}/control-plane`)
setBaseUrlCompendium(`${baseUrl}/compendium`)
setBaseURiskManager(`${baseUrl}/risk-manager`)
setBaseURLCompliance(`${baseUrl}/compliance`)

// TODO: remove these mocks
// These are function that have been removed from the control-plane client

async function getApplicationsIdScaler () {}

const getHeaders = () => {
  const headers = {
    'content-type': 'application/json'
  }
  return headers
}

const DESC = 'desc'

export const logoutUser = async () => {
  return await fetch(`${baseApiUrl}/logout`, {
    method: 'GET',
    headers: { ...getHeaders() },
    credentials: 'include',
    redirect: 'follow'
  })
}

export const getUser = async () => {
  return await fetch(`${baseApiUrl}/me`, {
    method: 'GET',
    headers: { ...getHeaders() },
    credentials: 'include'
  })
}

/* APPLICATIONS */
export const getApplicationsRaw = async () => {
  const { body: applications } = await getApplications({
    'where.deleted.eq': 'false'
  })
  return applications
}

export const getLastStartedGeneration = async () => {
  const { body: generations } = await getGenerations({
    'where.status.neq': 'failed',
    'orderby.createdAt': DESC,
    limit: 1
  })
  return generations.length === 1 ? generations[0] : null
}

export const getApplicationsWithMetadata = async () => {
  const { body: applications } = await getApplications({})
  if (applications.length === 0) return []
  // One bulk fetch to know which apps have at least one deployment; apps created
  // without a deployment render the "not deployed yet" card. Newest first so the
  // 1000-row cap keeps recently active apps covered.
  const { body: allDeployments } = await getDeployments({ 'orderby.createdAt': DESC, limit: 1000 })
  const deployedAppIds = new Set(allDeployments.map(deployment => deployment.applicationId))
  const applicationsWithMetadata = applications.map(
    application => ({
      ...application,
      state: {},
      url: null,
      isDeployed: deployedAppIds.has(application.id)
    })
  )
  for (let i = 0; i < applications.length; i++) {
    const currentApplication = applications[i]
    const { body: applicationState } = await getApplicationStatesForApplication({
      id: currentApplication.id
    })
    if (applicationState.length > 0) {
      // sort applicationState by createdAt descending
      applicationState.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      applicationsWithMetadata[i].state = applicationState[0].state
      applicationsWithMetadata[i].latestChange = applicationState[0].createdAt
      applicationsWithMetadata[i].pltVersion = applicationState[0].pltVersion
    }
  }
  return applicationsWithMetadata
}

export const getApiApplication = async (id) => {
  let lastUpdated = null
  let lastStarted = null
  let pltVersion = null
  let latestDeployment = {}
  let state = {}
  const { body: application } = await getApplicationById({ id })
  const { body: arrayState } = await getApplicationStates({
    'where.applicationId.eq': id,
    'orderby.createdAt': DESC,
    limit: 1
  })

  if (arrayState.length > 0) {
    pltVersion = arrayState[0].pltVersion
    state = arrayState[0]?.state ?? {}
  }

  // Real per-app deployment presence: gates the "not deployed yet" detail view
  // and the deployment-only sidebar items. Kept separate from the demo replica
  // list below, which other detail widgets still consume.
  const { body: appDeployments } = await getDeployments({
    'where.applicationId.eq': id,
    limit: 1
  })
  const isDeployed = appDeployments.length > 0

  let { body: deployments } = await getDeployments({
    'orderby.createdAt': DESC
  })

  // 3 replicas
  const replicas = 3
  const output = Array(replicas).fill(deployments[0]).map((deployment, idx) => {
    const output = { ...deployment }
    if (idx === 1) {
      output.status = 'started'
    } else if (idx === 2) {
      output.status = 'stopped'
    } else {
      output.status = 'started'
    }
    return output
  })
  deployments = output
  if (deployments.length > 0) {
    lastStarted = deployments[0].createdAt
    latestDeployment = deployments[0]
  }

  const response = await fetch((`${baseApiUrl}/events?` + new URLSearchParams({
    applicationId: id,
    'orderby.createdAt': DESC,
    limit: 1,
    offset: 0
  }).toString()), {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })

  const activities = await response.json()

  lastUpdated = activities[0]?.createdAt ?? null

  return {
    ...application,
    pltVersion,
    state,
    isDeployed,
    deployments,
    latestDeployment,
    lastStarted,
    lastUpdated
  }
}

/* METRICS */
export const getApiMetricsForApplication = async (applicationId, radix, versionLabel = null) => {
  const versionQuery = versionLabel ? `?versionLabel=${encodeURIComponent(versionLabel)}` : ''
  return fetch(`${baseUrl}/metrics/apps/${applicationId}/${radix}${versionQuery}`, {
    method: 'GET',
    headers: getHeaders()
  })
}

export const getApiMetricsPod = async (applicationId, podId, radix) => {
  let url = `${baseUrl}/metrics/apps/${applicationId}/pods/${podId}`
  if (radix) {
    url += `/${radix}`
  }
  const res = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
  const output = await res.json()
  return output
}

export const getApiMetricsPodPerService = async (applicationId, podId, serviceId, radix) => {
  let url = `${baseUrl}/metrics/apps/${applicationId}/pods/${podId}/services/${serviceId}`
  if (radix) {
    url += `/${radix}`
  }
  const res = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
  const output = await res.json()
  return output
}

/* KUBERNETES RESOURCES */

export const getKubernetesResources = async (applicationId, versionLabel = null) => {
  const { pods } = await getApiApplicationK8sState(applicationId)
  const scaleConfig = await getApiApplicationScaleConfig(applicationId)

  const versionQuery = versionLabel ? `?versionLabel=${encodeURIComponent(versionLabel)}` : ''
  const url = `${baseUrl}/metrics/kubernetes/apps/${applicationId}${versionQuery}`
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders()
  })

  if (!response.ok) {
    throw new Error('Unable to get kubernetes metrics')
  }

  const podVersionLabel = (pod) => pod.versionLabel ?? pod.version_label
  const filteredPods = versionLabel ? pods.filter(pod => podVersionLabel(pod) === versionLabel) : pods

  const k8sMetrics = await response.json()
  return {
    ...k8sMetrics,
    pods: {
      current: filteredPods.length,
      max: scaleConfig.maxPods
    }
  }
}

// Autoscaler
export const getRequestsPerSecond = async (applicationId, deploymentId = null) => {
  const url = `${baseUrl}/metrics/kubernetes/apps/${applicationId}/rps`
  return fetch(url, {
    method: 'GET',
    headers: getHeaders()
  })
}

/* ACTIVITIES */
export const getApiActivities = async (applicationId, filters = { limit: 10, offset: 0, search: '', userId: '', event: '' }) => {
  let url = `${baseApiUrl}/events?limit=${filters.limit}&offset=${filters.offset}`
  if (applicationId) {
    url += `&applicationId=${applicationId}`
  }
  if ((filters?.search ?? '') !== '') url += `&search=${filters.search}`
  if ((filters?.userId ?? '') !== '') url += `&userId=${filters.userId}`
  if ((filters?.event ?? '') !== '') url += `&event=${filters.event}`
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
  const totalCount = response.headers.get('X-Total-Count')

  const activities = await response.json()
  return { activities, totalCount }
}

export const getApiActivitiesTypes = async () => {
  return await fetch(`${baseUrl}/activities/types`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
}

export const getApiActivitiesUsers = async () => {
  return await fetch(`${baseUrl}/activities/users`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
}

/* DEPLOYMENTS */

// Join deployments to their skew version (by deploymentId) so the UI can show the
// version label and its lifecycle status. A drained/expired version has its pods
// scaled to zero, which the raw deployment status reports as 'failed'; the version
// status (active/draining/expired) is the meaningful one. Fetches versions once
// per distinct application present in the list.
export const enrichDeploymentsWithVersions = async (deployments) => {
  const applicationIds = [...new Set(deployments.map(deployment => deployment.applicationId))]
  const versionsByDeploymentId = new Map()
  await Promise.all(applicationIds.map(async (applicationId) => {
    const data = await callApi('control-plane', `/applications/${applicationId}/versions`).catch(() => ({ versions: [] }))
    for (const version of (data?.versions ?? [])) {
      versionsByDeploymentId.set(version.deploymentId, version)
    }
  }))
  return deployments.map(deployment => {
    const version = versionsByDeploymentId.get(deployment.id)
    return {
      ...deployment,
      versionLabel: version?.versionLabel || null,
      displayStatus: version?.status || deployment.status
    }
  })
}

export const getApiDeploymentsHistory = async (payload) => {
  const queryObject = {
    'orderby.createdAt': DESC,
    totalCount: true,
    limit: payload.limit,
    offset: payload.offset
  }
  if (payload.filterDeploymentsByApplicationId) {
    queryObject['where.applicationId.eq'] = payload.filterDeploymentsByApplicationId
  }

  const { headers, body: deployments } = await getDeployments(queryObject)
  return { deployments, totalCount: headers['x-total-count'] }
}

/* GITHUB */
const gitHubUserCache = {}
export const getGithubUserInfo = async (commitUserEmail) => {
  if (!gitHubUserCache[commitUserEmail]) {
    // avoid hitting Github rate limit
    // speed up fetching the same data over and over again
    gitHubUserCache[commitUserEmail] = await fetch(`https://api.github.com/search/users?q=${commitUserEmail} in:email`, {
      method: 'GET'
    })
  }
  return gitHubUserCache[commitUserEmail]
}

/* TAXONOMY */

export const getApiMainTaxonomyGraph = async (generationId) => {
  const { body: graph } = await getGenerationGraph({ generationId })

  const { applications, links } = graph

  return {
    applications,
    links: getLinksForTaxonomyGraph(links, applications)
  }
}

export const getApiTaxonomyGenerations = async (options = {}) => {
  const { body: generations } = await getGenerations()
  return sortCollectionByDate(generations, 'createdAt', false)
}

/* PACKAGE VERSIONS */
export const getPackageVersions = async () => {
  const url = `${baseApiUrl}/package_versions`
  return fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
}

/* INSTANCES */
export const getApiApplicationK8sState = async (applicationId) => {
  return callApi('control-plane', `/applications/${applicationId}/k8s/state`, 'GET')
}

export const getApiApplicationScaleConfig = async (applicationId) => {
  return callApi('scaler', `/applications/${applicationId}/scale-configs`, 'GET')
}

/* PODS */
export const getApiPods = async (applicationId, versionLabel = null) => {
  const { pods } = await callApi('control-plane', `/applications/${applicationId}/k8s/state`, 'GET')
  const podVersionLabel = (pod) => pod.versionLabel ?? pod.version_label
  const filteredPods = versionLabel ? pods.filter(pod => podVersionLabel(pod) === versionLabel) : pods
  const output = await Promise.all(filteredPods.map(async (pod) => {
    const [dataValuesMem, dataValuesCpu] = await Promise.all([
      getApiMetricsPod(applicationId, pod.id, 'mem'),
      getApiMetricsPod(applicationId, pod.id, 'cpu')
    ])
    return {
      id: pod.id,
      dataValues: { ...dataValuesMem, ...dataValuesCpu },
      status: pod.status.toLowerCase()
    }
  }))
  return output
}

export const getApiPod = async (applicationId, podId) => {
  const [dataValuesMem, dataValuesCpu] = await Promise.all([
    getApiMetricsPod(applicationId, podId, 'mem'),
    getApiMetricsPod(applicationId, podId, 'cpu')
  ])
  return { ...dataValuesMem, ...dataValuesCpu }
}

export const callApiRevokeKey = async (applicationId, id) => {
  const url = `${baseUrl}/user-manager/appApiKeys`

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      applicationId,
      id,
      key: '',
      revoked: true
    })
  })

  const { revoked } = await response.json()

  return {
    id,
    revoked,
    applicationId
  }
}

export const callApiRegenerateKey = async (applicationId, id) => {
  const url = `${baseUrl}/user-manager/appApiKeys/${id}/regenerate`

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      applicationId,
      key: ''
    })
  })

  const { key } = await response.json()

  return {
    key,
    regenerated: true,
    applicationId
  }
}

export const getApiAPIKeys = async (applicationId) => {
  const response = await fetch((`${baseUrl}/user-manager/appApiKeys?` + new URLSearchParams({ 'where.applicationId.eq': applicationId }).toString()), {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })

  const apiKeys = await response.json()

  return apiKeys.map(apikey => ({
    name: apikey.name,
    id: apikey.id,
    value: apikey.suffix,
    createdOn: apikey?.createdAt,
    usedOn: apikey?.usedOn,
    revoked: apikey?.revoked
  }))
}

export const callApiAddKey = async (id, name) => {
  const url = `${baseUrl}/user-manager/appApiKeys`

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      applicationId: id,
      key: '',
      name
    })
  })

  const { key: apiSecretsKey } = await response.json()

  return {
    id,
    name,
    apiSecretsKey
  }
}

/* COMPLIANCY */
export const getApiCompliancy = async (applicationId) => {
  return await getReports({
    'where.applicationId.eq': applicationId,
    'orderby.createdAt': DESC,
    limit: 1
  })
}

/* AUTOSCALER */
export const getApiMetricsReplicaSetOverview = async (applicationId) => {
  const { pods } = await getApiApplicationK8sState(applicationId)
  const scaleConfig = await getApiApplicationScaleConfig(applicationId)
  const scalingSummary = await getScalingHistorySummary(applicationId)

  return {
    pods: pods.length,
    minPods: scaleConfig.minPods,
    maxPods: scaleConfig.maxPods,
    countScaleUp: scalingSummary.up,
    countScaleDown: scalingSummary.down,
    latestScaleUp: scalingSummary.latestUp,
    latestScaleDown: scalingSummary.latestDown
  }
}

export const getScalingMarkers = async (taxonomyId, applicationId) => {
  const { body } = await getApplicationsIdScaler({ id: applicationId, taxonomyId })
  return body
}

export const getScalingEventHistory = async (taxonomyId, applicationId) => {
  const { body: deployments } = await getDeployments({
    'where.applicationId.eq': applicationId,
    'where.taxonomyId.eq': taxonomyId,
    'orderby.createdAt': DESC,
    limit: 1
  })
  const [latestDeployment] = deployments

  const labels = new URLSearchParams({
    name: latestDeployment.machineId,
    resource: 'Deployment'
  })

  const response = await fetch(`${baseUrl}/log-proxy/events/history?${labels.toString()}`, {
    method: 'GET',
    credentials: 'include',
    headers: getHeaders()
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`Failed to get scaling history: ${error}`)
    throw new Error(`Failed to get scaling history: ${error}`)
  }

  const { events } = await response.json()
  const scalingHistory = events
    .filter(({ object: ev }) => ev.reason === 'ScalingReplicaSet')
    .map(({ object: ev }) => {
      const scaleType = ev.note.startsWith('Scaled down') ? 'DOWN' : 'UP'
      return {
        datetime: ev.metadata.creationTimestamp,
        activity: scaleType === 'DOWN' ? `${unitSingularCap} removed` : `New ${unitSingular}`,
        description: ev.note,
        scaleType
      }
    })
    .sort(function (a, b) {
      return new Date(b.datetime) - new Date(a.datetime)
    })

  const chartEvents = extractScalingEvents(scalingHistory)

  return {
    events: scalingHistory,
    chartEvents,
    totalCount: scalingHistory.length
  }
}

/* USER AND ROLES */
export const getApiUsers = async () => {
  const response = await fetch(`${baseUrl}/user-manager/users`, {
    method: 'GET',
    credentials: 'include',
    headers: getHeaders()
  })

  const users = await response.json()

  return sortCollection(users, 'username')
}

export const callApiRemoveUser = async (userId) => {
  return await fetch(`${baseUrl}/user-manager/users/${userId}`, {
    method: 'DELETE',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({})
  })
}

export const callApiChangeRoleUser = async (userId, role) => {
  return await fetch(`${baseUrl}/user-manager/users/${userId}`, {
    method: 'PUT',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      role
    })
  })
}

export const callApiInviteUser = async (emails) => {
  const promises = [emails.map(email => fetch(`${baseUrl}/user-manager/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      email
    })
  }))]
  return await Promise.all(promises)
}

export const callApiGetApplicationHttpCache = async (appId, options) => {
  const url = `${baseUrl}/cache-manager/applications/${appId}/http-cache?`

  const response = await fetch(url + new URLSearchParams(options).toString(), {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  const json = await response.json()
  if (json.code === 'PLT_CACHE_MANAGER_CACHE_NOT_FOUND') {
    return {
      client: [],
      server: []
    }
  }
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to get cached entries: ${error}`)
    throw new Error(`Failed to get cached entries: ${error}`)
  }
  return json
}

export const callApiGetApplicationHttpCacheDetail = async (appId, key, kind) => {
  const url = `${baseUrl}/cache-manager/applications/${appId}/http-cache/${key}?`
  const query = { kind }
  const response = await fetch(url + new URLSearchParams(query).toString(), {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  if (status !== 200) {
    const error = await response.json()
    console.error(`Failed to get cached entry detail: ${error}`)
    throw error
  }
  return await response.text()
}

export const callApiInvalidateApplicationHttpCache = async (appId, entries) => {
  const url = `${baseUrl}/cache-manager/applications/${appId}/http-cache/invalidate`
  const httpCacheIds = []
  const nextCacheIds = []
  entries.forEach((entry) => {
    switch (entry.kind) {
      case 'NEXT_CACHE_FETCH':
      case 'NEXT_CACHE_PAGE':
        nextCacheIds.push(entry.id)
        break

      case 'HTTP_CACHE':
        httpCacheIds.push(entry.id)
        break
    }
  })
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify({ httpCacheIds, nextCacheIds })
  })
  const { status } = response
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to invalidate cache: ${error}`)
    throw new Error(`Failed to invalidate cache: ${error}`)
  }
  return true
}

export const callApiDeployApplication = async (appId) => {
  const url = `${baseUrl}/control-plane/applications/${appId}/deploy`
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify({})
  })
  const { status } = response
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to deploy application: ${error}`)
    throw new Error(`Failed to deploy application: ${error}`)
  }
  return true
}

/* CACHE METRICS */
export const getCacheStatsForApplication = async (applicationId) => {
  const res = await fetch(`${baseUrl}/metrics/cache/apps/${applicationId}`, {
    method: 'GET',
    headers: getHeaders()
  })
  return res.json()
}

export const getCacheStats = async () => {
  const res = await fetch(`${baseUrl}/metrics/cache`, {
    method: 'GET',
    headers: getHeaders()
  })
  return res.json()
}

export const callApiGetCacheDependents = async (appId, cacheEntryId) => {
  const url = `${baseUrl}/cache-manager/applications/${appId}/http-cache/${cacheEntryId}/dependents`

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  const json = await response.json()
  if (json.code === 'PLT_CACHE_MANAGER_CACHE_NOT_FOUND') {
    return {
      client: [],
      server: []
    }
  }
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to get http cache dependents: ${error}`)
    throw new Error(`Failed to get http cache dependents : ${error}`)
  }
  return json.dependents
}

export const callApiGetCacheTraces = async (cacheEntryId) => {
  const url = `${baseUrl}/risk-service/http-cache/${cacheEntryId}/traces`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  const json = await response.json()
  if (json.code === 'PLT_CACHE_MANAGER_CACHE_NOT_FOUND') {
    return {
      client: [],
      server: []
    }
  }
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to get http cache traces: ${error}`)
    throw new Error(`Failed to get http cache traces : ${error}`)
  }
  return json
}

// SYNCH

export const callApiGetSyncConfig = async () => {
  const response = await fetch(`${baseUrl}/risk-cold-storage/sync/config`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`Failed to get synch config: ${error}`)
    throw new Error(`Failed to get synch config: ${error}`)
  }

  return await response.json()
}

export const callApiGetSync = async () => {
  const response = await fetch(`${baseUrl}/risk-cold-storage/sync`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`Failed to get synch config: ${error}`)
    throw new Error(`Failed to get synch config: ${error}`)
  }
}

const toArray = obj => Array.isArray(obj) ? obj : [...Object.values(obj)]

export const callApiGetSyncExports = async (filters = { limit: 10, offset: 0 }) => {
  const whereCond = `&where.isExport.eq=true&orderby.synchedAt=${DESC}`
  const url =
    `${baseUrl}/risk-cold-storage/importsExports?limit=${filters.limit}&offset=${filters.offset}&totalCount=true&${whereCond}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })

  const exports = await response.json()
  const totalCount = response.headers.get('X-Total-Count')

  const data = exports.map((item) => {
    let status = item.success ? 'SUCCESS' : 'ERROR'
    if (item.discarded) {
      status = 'DISCARDED'
    }
    return {
      ...item,
      status,
      logs: toArray(item.logs)
    }
  })
  return { data, totalCount }
}

export const callApiGetSyncImports = async (filters = { limit: 10, offset: 0 }) => {
  const whereCond = `&where.isExport.eq=false&orderby.synchedAt=${DESC}`
  const url =
    `${baseUrl}/risk-cold-storage/importsExports?limit=${filters.limit}&offset=${filters.offset}&totalCount=true&${whereCond}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })

  const imports = await response.json()
  const totalCount = response.headers.get('X-Total-Count')

  const data = imports.map((item) => {
    let status = item.success ? 'SUCCESS' : 'ERROR'
    if (item.discarded) {
      status = 'DISCARDED'
    }
    return {
      ...item,
      status,
      logs: toArray(item.logs)
    }
  })
  return { data, totalCount }
}

export const callApiGetSyncAvailableImports = async () => {
  const url = `${baseUrl}/risk-cold-storage/sync/available?orderby.fileName=${DESC}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
  let data = await response.json()
  if (!data || !Array.isArray(data)) {
    data = []
  }
  const imports = data.map((item) => {
    return {
      synchedAt: item.fileName.split('.zip')[0],
      ...item
    }
  })
  return { data: imports }
}

export const downloadSynchZip = async (fileName) => {
  return fetch(`${baseUrl}/risk-cold-storage/download/${fileName}`, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
}

// Deployments list order: active first, then the pending/in-flight states, then
// expired last. Within a status, newest first.
const VERSION_STATUS_RANK = { active: 0, 'pending-apply': 1, staged: 2, draining: 3, 'pending-expire': 4, expired: 6 }
const versionStatusRank = (status) => VERSION_STATUS_RANK[status] ?? 5

export const getVersionRegistryByApplicationId = async (applicationId, options = {}) => {
  const searchParams = new URLSearchParams()
  if (options.status) {
    searchParams.set('status', options.status)
  }
  const query = searchParams.toString()
  const url = `${baseUrl}/control-plane/applications/${applicationId}/versions${query ? `?${query}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })

  if (!response.ok) {
    return []
  }

  const { versions } = await response.json()
  const raw = versions ?? []
  const list = raw.map((v) => ({
    ...v,
    versionLabel: v.versionLabel ?? v.version_label ?? ''
  }))
  list.sort((a, b) => {
    const rankDiff = versionStatusRank(a.status) - versionStatusRank(b.status)
    if (rankDiff !== 0) return rankDiff
    const aAt = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bAt = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return bAt - aAt
  })
  return list
}

export const getApplicationVersionsPage = async (applicationId, { page = 0, limit = 10, status } = {}) => {
  const searchParams = new URLSearchParams()
  searchParams.set('limit', String(limit))
  searchParams.set('offset', String(page * limit))
  if (status) {
    searchParams.set('status', status)
  }
  const url = `${baseUrl}/control-plane/applications/${applicationId}/versions?${searchParams.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })

  if (!response.ok) {
    return { versions: [], totalCount: 0 }
  }

  const data = await response.json()
  // Server returns rows already ordered newest-first; do not re-sort here.
  const versions = (data.versions ?? []).map((v) => ({
    ...v,
    versionLabel: v.versionLabel ?? v.version_label ?? ''
  }))
  return { versions, totalCount: data.totalCount ?? versions.length }
}

export const getApplicationVersionsRPS = async (applicationId) => {
  const url = `${baseUrl}/control-plane/applications/${applicationId}/versions/rps`
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
  if (!response.ok) {
    return {}
  }
  const { rps } = await response.json()
  // Map versionLabel -> rps for easy per-row lookup; drop null (metric absent).
  const byVersion = {}
  for (const entry of rps ?? []) {
    if (entry.rps !== null && entry.rps !== undefined) {
      byVersion[entry.versionLabel] = entry.rps
    }
  }
  return byVersion
}

const versionLifecycleAction = async (applicationId, versionLabel, action) => {
  const url = `${baseUrl}/control-plane/applications/${applicationId}/versions/${encodeURIComponent(versionLabel)}/${action}`
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({}),
    credentials: 'include'
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message ?? `Failed to ${action} version ${versionLabel}`)
  }
  return response.json()
}

export const expireApplicationVersion = (applicationId, versionLabel) =>
  versionLifecycleAction(applicationId, versionLabel, 'expire')

export const promoteApplicationVersion = (applicationId, versionLabel) =>
  versionLifecycleAction(applicationId, versionLabel, 'promote')

export const approveApplicationVersion = (applicationId, versionLabel) =>
  versionLifecycleAction(applicationId, versionLabel, 'approve')

export const rejectApplicationVersion = (applicationId, versionLabel) =>
  versionLifecycleAction(applicationId, versionLabel, 'reject')

export const getVersionActuationPlan = async (applicationId, versionLabel) => {
  const url = `${baseUrl}/control-plane/applications/${applicationId}/versions/${encodeURIComponent(versionLabel)}/actuation-plan`
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message ?? `Failed to load plan for ${versionLabel}`)
  }
  return response.json()
}

export const getApplicationVersionAudit = async (applicationId, versionLabel) => {
  const url = `${baseUrl}/control-plane/applications/${applicationId}/versions/${encodeURIComponent(versionLabel)}/audit`
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
  if (!response.ok) {
    return []
  }
  const { audit } = await response.json()
  return audit ?? []
}

export const getSkewProtectionPolicy = async (applicationId) => {
  const url = `${baseUrl}/control-plane/applications/${applicationId}/skew-protection/policy`
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
  if (!response.ok) {
    return null
  }
  return response.json()
}

export const deployApplicationVersion = async (applicationId, body) => {
  const url = `${baseUrl}/control-plane/applications/${applicationId}/deploy`
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
    credentials: 'include'
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message ?? 'Failed to deploy version')
  }
  return response.json()
}

export const putSkewProtectionPolicy = async (applicationId, overrides) => {
  const url = `${baseUrl}/control-plane/applications/${applicationId}/skew-protection/policy`
  const response = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(overrides),
    credentials: 'include'
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message ?? 'Failed to update skew protection policy')
  }
  return response.json()
}

export const getActuationMode = async (applicationId) => {
  const url = `${baseUrl}/control-plane/applications/${applicationId}/actuation-mode`
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
  if (!response.ok) {
    return null
  }
  return response.json()
}

export const putActuationMode = async (applicationId, mode) => {
  const url = `${baseUrl}/control-plane/applications/${applicationId}/actuation-mode`
  const response = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ mode }),
    credentials: 'include'
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message ?? 'Failed to update deployment mode')
  }
  return response.json()
}

// Create a Watt with no deployment yet. The backend also issues its first deploy
// token; the plaintext token is returned once here and never again.
export const createApplication = async (name) => {
  const url = `${baseUrl}/control-plane/applications/create`
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name }),
    credentials: 'include'
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message ?? 'Failed to create Watt')
  }
  return response.json()
}

export const getDeployTokens = async (applicationId, { page = 0, limit = 10, sort = 'createdAt', order = 'desc' } = {}) => {
  const searchParams = new URLSearchParams()
  searchParams.set('limit', String(limit))
  searchParams.set('offset', String(page * limit))
  searchParams.set('sort', sort)
  searchParams.set('order', order)
  const url = `${baseUrl}/control-plane/applications/${applicationId}/deploy-tokens?${searchParams.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    credentials: 'include'
  })
  if (!response.ok) {
    return { deployTokens: [], totalCount: 0 }
  }
  const data = await response.json()
  return { deployTokens: data.deployTokens ?? [], totalCount: data.totalCount ?? 0 }
}

export const createDeployToken = async (applicationId, { name, expiresAt }) => {
  const url = `${baseUrl}/control-plane/applications/${applicationId}/deploy-tokens`
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, expiresAt: expiresAt ?? null }),
    credentials: 'include'
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message ?? 'Failed to create deploy token')
  }
  return response.json()
}

export const revokeDeployToken = async (applicationId, tokenId) => {
  const url = `${baseUrl}/control-plane/applications/${applicationId}/deploy-tokens/${tokenId}`
  // No content-type: this DELETE has no body, and Fastify's JSON parser rejects an
  // empty body when content-type is application/json.
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message ?? 'Failed to revoke deploy token')
  }
  return response.json()
}
