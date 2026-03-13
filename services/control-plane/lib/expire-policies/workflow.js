'use strict'

const { request } = require('undici')
const { k8sAuthHeaders } = require('../k8s-auth')

async function shouldExpire (version, { getVersionRPS, log, workflowUrl }) {
  if (!workflowUrl) {
    log.info({ appLabel: version.appLabel }, 'PLT_WORKFLOW_URL not set — skipping workflow check')
    return false
  }

  const rps = await getVersionRPS(version.appLabel, version.versionLabel)
  if (rps === null) {
    log.info({ appLabel: version.appLabel, versionLabel: version.versionLabel }, 'RPS query returned null — skipping')
    return false
  }
  if (rps > 0) {
    log.info({ appLabel: version.appLabel, versionLabel: version.versionLabel, rps }, 'version still has traffic — skipping')
    return false
  }

  const status = await getWorkflowDrainingStatus(version, { log, workflowUrl })
  if (status === null) {
    log.info({ appLabel: version.appLabel, versionLabel: version.versionLabel }, 'workflow status query failed — skipping')
    return false
  }

  const activeWork = (status.activeRuns || 0) +
    (status.pendingHooks || 0) +
    (status.pendingWaits || 0) +
    (status.queuedMessages || 0)

  if (activeWork > 0) {
    log.info({
      appLabel: version.appLabel,
      versionLabel: version.versionLabel,
      activeRuns: status.activeRuns,
      pendingHooks: status.pendingHooks,
      pendingWaits: status.pendingWaits,
      queuedMessages: status.queuedMessages
    }, 'workflow version still has active work — skipping')
    return false
  }

  log.info({ appLabel: version.appLabel, versionLabel: version.versionLabel }, 'workflow version has no active work — ready to expire')
  return true
}

async function forceExpire (version, { log, workflowUrl }) {
  if (!workflowUrl) return

  // ICC appLabel → workflow API :appId, ICC versionLabel → workflow API :deploymentId
  const url = `${workflowUrl}/api/v1/apps/${encodeURIComponent(version.appLabel)}/versions/${encodeURIComponent(version.versionLabel)}/expire`
  try {
    const { statusCode, body } = await request(url, { method: 'POST', headers: k8sAuthHeaders() })
    if (statusCode !== 200) {
      const error = await body.text()
      log.warn({
        appLabel: version.appLabel,
        versionLabel: version.versionLabel,
        statusCode,
        error
      }, 'failed to force-expire workflow')
    }
  } catch (err) {
    log.warn({
      err,
      appLabel: version.appLabel,
      versionLabel: version.versionLabel
    }, 'error force-expiring workflow')
  }
}

async function getWorkflowDrainingStatus (version, { log, workflowUrl }) {
  // ICC appLabel → workflow API :appId, ICC versionLabel → workflow API :deploymentId
  const url = `${workflowUrl}/api/v1/apps/${encodeURIComponent(version.appLabel)}/versions/${encodeURIComponent(version.versionLabel)}/status`
  try {
    const { statusCode, body } = await request(url, { headers: k8sAuthHeaders() })
    if (statusCode !== 200) {
      const error = await body.text()
      log.warn({
        appLabel: version.appLabel,
        versionLabel: version.versionLabel,
        statusCode,
        error
      }, 'failed to query workflow draining status')
      return null
    }
    return body.json()
  } catch (err) {
    log.warn({
      err,
      appLabel: version.appLabel,
      versionLabel: version.versionLabel
    }, 'error querying workflow draining status')
    return null
  }
}

module.exports = { shouldExpire, forceExpire }
