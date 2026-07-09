'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { buildDeployment, buildService, resourceName } = require('../lib/deployment-builder')
const { deriveVersion } = require('../lib/version')

test('resourceName uses an explicit version, else a k8s-safe segment from the image tag', () => {
  assert.strictEqual(resourceName('leads-demo', 'v3'), 'leads-demo-v3')
  // no explicit version: name from the image tag (unique per build) so versions coexist
  assert.strictEqual(resourceName('leads-demo', null, 'reg/leads-demo:1783570901756'), 'leads-demo-1783570901756')
  // a derived plt_ id is not a valid k8s name -> falls back to the image tag
  assert.strictEqual(resourceName('leads-demo', 'plt_e0gpABC', 'reg/leads-demo:abc123'), 'leads-demo-abc123')
})

test('buildDeployment stamps skew labels, ports, probes and env', () => {
  const dep = buildDeployment({
    appName: 'leads-demo',
    image: 'reg/leads-demo:abc',
    version: 'v3',
    hostname: 'leads.example.com',
    minReplicas: 2,
    maxReplicas: 5,
    envVars: { FOO: 'bar' }
  })

  assert.strictEqual(dep.kind, 'Deployment')
  assert.strictEqual(dep.metadata.name, 'leads-demo-v3')
  assert.strictEqual(dep.metadata.labels['app.kubernetes.io/name'], 'leads-demo')
  assert.strictEqual(dep.metadata.labels['app.kubernetes.io/instance'], 'leads-demo-v3')
  assert.strictEqual(dep.metadata.labels['plt.dev/version'], 'v3')
  assert.strictEqual(dep.metadata.labels['icc.platformatic.dev/scaler-min'], '2')
  assert.strictEqual(dep.metadata.labels['icc.platformatic.dev/scaler-max'], '5')
  assert.strictEqual(dep.spec.replicas, 2)
  assert.deepStrictEqual(dep.spec.selector.matchLabels, { 'app.kubernetes.io/instance': 'leads-demo-v3' })

  // Pod labels drive ICC's reactive registration. Only DNS-safe values allowed:
  // the pathPrefix (has a '/') is NOT a label — registration derives it.
  const pod = dep.spec.template.metadata.labels
  assert.strictEqual(pod['platformatic.dev/monitor'], 'prometheus')
  assert.strictEqual(pod['plt.dev/hostname'], 'leads.example.com')
  assert.strictEqual(pod['plt.dev/path'], undefined)

  const c = dep.spec.template.spec.containers[0]
  assert.strictEqual(c.image, 'reg/leads-demo:abc')
  assert.deepStrictEqual(c.ports.map(p => p.containerPort), [3042, 9090])
  assert.strictEqual(c.readinessProbe.httpGet.port, 'metrics')
  assert.strictEqual(c.livenessProbe.httpGet.path, '/status')
  const foo = c.env.find(e => e.name === 'FOO')
  assert.strictEqual(foo.value, 'bar')
  const instanceId = c.env.find(e => e.name === 'PLT_INSTANCE_ID')
  assert.strictEqual(instanceId.valueFrom.fieldRef.fieldPath, 'metadata.name')
  const depVersion = c.env.find(e => e.name === 'PLT_DEPLOYMENT_VERSION')
  assert.strictEqual(depVersion.value, 'v3')
})

test('buildDeployment omits replicas + scaler labels when unset; adds workflow env', () => {
  const dep = buildDeployment({ appName: 'wf', image: 'reg/wf:1', version: 'v1', isWorkflow: true })
  assert.strictEqual(dep.spec.replicas, undefined)
  assert.strictEqual(dep.metadata.labels['icc.platformatic.dev/scaler-min'], undefined)
  assert.strictEqual(dep.metadata.labels['plt.dev/workflow'], 'true')
  const wfEnv = dep.spec.template.spec.containers[0].env.find(e => e.name === 'PLT_WORLD_DEPLOYMENT_VERSION')
  assert.strictEqual(wfEnv.value, 'v1')
  const depEnv = dep.spec.template.spec.containers[0].env.find(e => e.name === 'PLT_DEPLOYMENT_VERSION')
  assert.strictEqual(depEnv.value, 'v1')
})

test('buildDeployment mints PLT_DEPLOYMENT_VERSION (plt_ id) from the image when version is omitted', () => {
  const dep = buildDeployment({ appName: 'leads-demo', image: 'reg/leads-demo:1.4.2' })
  const depEnv = dep.spec.template.spec.containers[0].env.find(e => e.name === 'PLT_DEPLOYMENT_VERSION')
  assert.strictEqual(depEnv.value, deriveVersion('reg/leads-demo:1.4.2'))
  assert.match(depEnv.value, /^plt_[0-9A-Za-z]{24}$/)
})

test('buildService mirrors the pod selector and exposes both ports; no scaler labels', () => {
  const svc = buildService({ appName: 'leads-demo', version: 'v3' })
  assert.strictEqual(svc.kind, 'Service')
  assert.strictEqual(svc.metadata.name, 'leads-demo-v3')
  assert.strictEqual(svc.spec.type, 'ClusterIP')
  assert.deepStrictEqual(svc.spec.selector, { 'app.kubernetes.io/instance': 'leads-demo-v3' })
  assert.deepStrictEqual(svc.spec.ports.map(p => p.targetPort), ['app', 'metrics'])
  assert.deepStrictEqual(svc.spec.ports.map(p => p.port), [3042, 9090])
  assert.strictEqual(svc.metadata.labels['icc.platformatic.dev/scaler-min'], undefined)
  assert.strictEqual(svc.metadata.labels['platformatic.dev/monitor'], undefined)
})

test('app port defaults to 3042 but is overridable; metrics port stays fixed', () => {
  const dep = buildDeployment({ appName: 'api', image: 'reg/api:1', version: 'v1', port: 8080 })
  assert.deepStrictEqual(dep.spec.template.spec.containers[0].ports.map(p => p.containerPort), [8080, 9090])
  // probes stay on the named metrics port, unaffected by the app port
  assert.strictEqual(dep.spec.template.spec.containers[0].readinessProbe.httpGet.port, 'metrics')

  const svc = buildService({ appName: 'api', version: 'v1', port: 8080 })
  assert.deepStrictEqual(svc.spec.ports.map(p => p.port), [8080, 9090])
  assert.deepStrictEqual(svc.spec.ports.map(p => p.targetPort), ['app', 'metrics'])
})
