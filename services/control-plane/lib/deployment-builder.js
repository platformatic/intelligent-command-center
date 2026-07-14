'use strict'

// Ported from desk/lib/deploy.js (the development/demo templater). ICC reuses
// the pure Deployment/Service object construction and drops desk's side effects
// — the `kubectl apply`, the `docker build`, the run-dir writes, and the
// HTTPRoute (ICC owns routing separately). ICC hands these objects to machinist.

const { deriveVersion } = require('./version')

// Template defaults for the advise-mode plan: ICC has no running pod to read the
// real values from, so it seeds the manifest it hands the customer to apply. Only
// starting points -- the customer owns the applied workload and can change them.
const DEFAULT_RESOURCES = {
  requests: { memory: '512Mi', cpu: '500m' },
  limits: { memory: '1Gi', cpu: '750m' }
}

// The app's HTTP port defaults to the Watt convention; the deploy request can
// override it (buildDeployment/buildService take a `port`).
const APP_PORT = 3042
const METRICS_PORT = 9090

// A k8s-safe name segment, unique per version: an explicit --version verbatim when
// it is already a valid RFC1123 label, else the image tag (unique per build). A
// derived plt_ id is NOT a valid resource name ('_' + case-sensitive base62, so it
// cannot be lowercased without risking collisions); it stays the routing/label
// version only, and the workload is named from the image tag -- matching desk so
// versions get their own coexisting Deployment/Service for skew protection.
function resourceVersion (version, image) {
  if (version && /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(version)) return version
  const nameAndTag = String(image).slice(String(image).lastIndexOf('/') + 1)
  const colon = nameAndTag.lastIndexOf(':')
  const tag = colon >= 0 ? nameAndTag.slice(colon + 1) : 'latest'
  return tag.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'latest'
}

// Resources are named `{appName}-{segment}`; the pod selector matches the same
// value on app.kubernetes.io/instance.
function resourceName (appName, version, image) {
  return `${appName}-${resourceVersion(version, image)}`
}

function buildLabels ({ appName, instance, version, isWorkflow, minReplicas, maxReplicas }) {
  const labels = {
    'app.kubernetes.io/name': appName,
    'app.kubernetes.io/instance': instance
  }
  if (version) labels['plt.dev/version'] = version
  if (isWorkflow) labels['plt.dev/workflow'] = 'true'
  if (minReplicas) labels['icc.platformatic.dev/scaler-min'] = String(minReplicas)
  if (maxReplicas) labels['icc.platformatic.dev/scaler-max'] = String(maxReplicas)
  return labels
}

// Per-version pull-secret name; referenced by the Deployment's imagePullSecrets.
function pullSecretName (appName, version, image) {
  return `${resourceName(appName, version, image)}-pull`
}

// A kubernetes.io/dockerconfigjson Secret for pulling a private image. Returns
// null when no credentials were supplied (public image). ICC builds the
// dockerconfigjson from the structured { registry, username, password } so the
// caller never has to assemble it.
function buildPullSecret ({ appName, version, image, pullSecret }) {
  if (!pullSecret) return null
  const { registry, username, password } = pullSecret
  const auth = Buffer.from(`${username}:${password}`).toString('base64')
  const dockerconfig = { auths: { [registry]: { username, password, auth } } }
  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name: pullSecretName(appName, version, image) },
    type: 'kubernetes.io/dockerconfigjson',
    data: { '.dockerconfigjson': Buffer.from(JSON.stringify(dockerconfig)).toString('base64') }
  }
}

function buildDeployment ({
  appName, image, version, hostname = null, port = APP_PORT,
  envVars = {}, isWorkflow = false, minReplicas = null, maxReplicas = null,
  pullSecret = null
}) {
  const name = resourceName(appName, version, image)
  const labels = buildLabels({ appName, instance: name, version, isWorkflow, minReplicas, maxReplicas })

  // Pod labels drive ICC's reactive registration when the pod boots and calls
  // POST /pods/:podId/instance. Only DNS-safe values go here — K8s label values
  // cannot contain '/', so the pathPrefix is NOT a label (registration derives
  // it as `/${appLabel}`); the workflow flag conveys the expire policy.
  const podLabels = { ...labels, 'platformatic.dev/monitor': 'prometheus' }
  if (hostname) podLabels['plt.dev/hostname'] = hostname

  // Resolved the same way ICC records versions: explicit version, else the image
  // tag. Exposed to every pod so the app can self-identify its deployment version
  // (skew-aware routing, telemetry). PLT_WORLD_DEPLOYMENT_VERSION stays for
  // Platformatic World, which also reads PLT_DEPLOYMENT_VERSION now.
  const deploymentVersion = version || deriveVersion(image)
  const env = [
    ...Object.entries(envVars).map(([k, value]) => ({ name: k, value: String(value) })),
    { name: 'PLT_INSTANCE_ID', valueFrom: { fieldRef: { fieldPath: 'metadata.name' } } },
    { name: 'PLT_DEPLOYMENT_VERSION', value: deploymentVersion },
    ...(isWorkflow
      ? [{ name: 'PLT_WORLD_DEPLOYMENT_VERSION', value: deploymentVersion }]
      : [])
  ]

  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: { name, labels },
    spec: {
      ...(minReplicas ? { replicas: minReplicas } : {}),
      selector: { matchLabels: { 'app.kubernetes.io/instance': name } },
      template: {
        metadata: { labels: podLabels },
        spec: {
          ...(pullSecret ? { imagePullSecrets: [{ name: pullSecretName(appName, version, image) }] } : {}),
          containers: [
            {
              name,
              image,
              imagePullPolicy: 'Always',
              ports: [
                { name: 'app', containerPort: port, protocol: 'TCP' },
                { name: 'metrics', containerPort: METRICS_PORT, protocol: 'TCP' }
              ],
              readinessProbe: {
                httpGet: { path: '/ready', port: 'metrics', scheme: 'HTTP' },
                periodSeconds: 15,
                failureThreshold: 5
              },
              livenessProbe: {
                httpGet: { path: '/status', port: 'metrics', scheme: 'HTTP' },
                periodSeconds: 2,
                successThreshold: 1,
                timeoutSeconds: 1,
                failureThreshold: 5
              },
              startupProbe: {
                httpGet: { path: '/ready', port: 'metrics', scheme: 'HTTP' },
                initialDelaySeconds: 5,
                periodSeconds: 3,
                successThreshold: 1,
                failureThreshold: 15
              },
              env,
              resources: DEFAULT_RESOURCES
            }
          ]
        }
      }
    }
  }
}

function buildService ({ appName, version, image, port = APP_PORT, isWorkflow = false, headless = false }) {
  const name = resourceName(appName, version, image)
  const labels = buildLabels({ appName, instance: name, version, isWorkflow })

  return {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { name, labels },
    spec: {
      type: 'ClusterIP',
      ...(headless ? { clusterIP: 'None' } : {}),
      selector: { 'app.kubernetes.io/instance': name },
      ports: [
        { name: 'app', protocol: 'TCP', port, targetPort: 'app' },
        { name: 'metrics', protocol: 'TCP', port: METRICS_PORT, targetPort: 'metrics' }
      ]
    }
  }
}

module.exports = { buildDeployment, buildService, buildPullSecret, pullSecretName, resourceName, resourceVersion, DEFAULT_RESOURCES, APP_PORT }
