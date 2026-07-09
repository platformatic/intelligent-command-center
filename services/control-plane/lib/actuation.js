'use strict'

// Actuation modes split *deciding* the version lifecycle from *actuating* the
// cluster. Each mode is a preset over two independent actuator slots, and each
// slot is one of `apply | plan | noop`:
//
//   - workload slot: creating/scaling the Deployment + Service.
//   - routing slot:  the gateway route (HTTPRoute for k8s, ALB rules for ECS).
//
// | mode    | workload | routing | meaning                                        |
// | observe | noop     | apply   | you deploy workloads; ICC manages routing      |
// | manage  | apply    | apply   | ICC owns the full deploy lifecycle             |
// | advise  | plan     | plan    | ICC mutates nothing; it returns manifests/cmds |
//
// `apply` calls machinist; `plan` collects a manifest/command without mutating;
// `noop` does nothing. The lifecycle layer reads only the resolved slot value
// (apply/plan/noop) and never the provider behind it, so machinist stays
// provider-dumb.
const PRESETS = {
  observe: { workload: 'noop', routing: 'apply' },
  manage: { workload: 'apply', routing: 'apply' },
  advise: { workload: 'plan', routing: 'plan' }
}

// Resolve a mode name to its actuator-slot preset. Unknown/empty modes fall
// back to observe, today's default.
function resolveActuation (mode) {
  return PRESETS[mode] || PRESETS.observe
}

// A single plan entry. `manifest` is the resource ICC would apply; `command` is
// the equivalent the external actor can run in advise mode.
function planStep (kind, action, { manifest = null, command = null, description = null } = {}) {
  return { kind, action, manifest, command, description }
}

module.exports = { PRESETS, resolveActuation, planStep }
