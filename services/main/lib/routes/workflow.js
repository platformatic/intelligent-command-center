/// <reference path="../../global.d.ts" />
'use strict'

const { readFileSync } = require('node:fs')
const { request } = require('undici')

const K8S_TOKEN_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/token'

let k8sToken = null
try {
  k8sToken = readFileSync(K8S_TOKEN_PATH, 'utf8').trim()
} catch {
  // Not running in K8s
}

function authHeaders () {
  if (k8sToken) {
    return { authorization: `Bearer ${k8sToken}` }
  }
  return {}
}

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  const workflowUrl = app.config.PLT_WORKFLOW_URL

  if (!workflowUrl) {
    app.log.info('PLT_WORKFLOW_URL not set, workflow proxy disabled')
    return
  }

  app.get('/workflow/apps/:appId/runs', {
    handler: async (req, reply) => {
      const { appId } = req.params
      const target = `${workflowUrl}/api/v1/apps/${encodeURIComponent(appId)}/runs`
      const { statusCode, body } = await request(target, {
        method: 'GET',
        query: req.query,
        headers: authHeaders()
      })

      reply.code(statusCode)
      return body.json()
    }
  })

  app.get('/workflow/apps/:appId/runs/:runId', {
    handler: async (req, reply) => {
      const { appId, runId } = req.params
      const target = `${workflowUrl}/api/v1/apps/${encodeURIComponent(appId)}/runs/${encodeURIComponent(runId)}`
      const { statusCode, body } = await request(target, {
        method: 'GET',
        query: req.query,
        headers: authHeaders()
      })

      reply.code(statusCode)
      return body.json()
    }
  })

  app.get('/workflow/apps/:appId/runs/:runId/steps', {
    handler: async (req, reply) => {
      const { appId, runId } = req.params
      const target = `${workflowUrl}/api/v1/apps/${encodeURIComponent(appId)}/runs/${encodeURIComponent(runId)}/steps`
      const { statusCode, body } = await request(target, {
        method: 'GET',
        query: req.query,
        headers: authHeaders()
      })

      reply.code(statusCode)
      return body.json()
    }
  })

  app.get('/workflow/apps/:appId/runs/:runId/events', {
    handler: async (req, reply) => {
      const { appId, runId } = req.params
      const target = `${workflowUrl}/api/v1/apps/${encodeURIComponent(appId)}/runs/${encodeURIComponent(runId)}/events`
      const { statusCode, body } = await request(target, {
        method: 'GET',
        query: req.query,
        headers: authHeaders()
      })

      reply.code(statusCode)
      return body.json()
    }
  })

  app.get('/workflow/apps/:appId/hooks', {
    handler: async (req, reply) => {
      const { appId } = req.params
      const target = `${workflowUrl}/api/v1/apps/${encodeURIComponent(appId)}/hooks`
      const { statusCode, body } = await request(target, {
        method: 'GET',
        query: req.query,
        headers: authHeaders()
      })

      reply.code(statusCode)
      return body.json()
    }
  })

  // Run actions: replay, cancel, wake-up
  for (const action of ['replay', 'cancel', 'wake-up']) {
    app.post(`/workflow/apps/:appId/runs/:runId/${action}`, {
      handler: async (req, reply) => {
        const { appId, runId } = req.params
        const target = `${workflowUrl}/api/v1/apps/${encodeURIComponent(appId)}/runs/${encodeURIComponent(runId)}/${action}`
        const { statusCode, body } = await request(target, {
          method: 'POST',
          headers: { ...authHeaders(), 'content-type': 'application/json' },
          body: JSON.stringify(req.body || {})
        })

        reply.code(statusCode)
        return body.json()
      }
    })
  }
}
