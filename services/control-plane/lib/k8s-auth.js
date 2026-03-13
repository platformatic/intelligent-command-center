'use strict'

const { readFileSync } = require('node:fs')

const K8S_TOKEN_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/token'

let k8sToken = process.env.PLT_K8S_TOKEN || null
if (!k8sToken) {
  try {
    k8sToken = readFileSync(K8S_TOKEN_PATH, 'utf8').trim()
  } catch {
    // Not running in K8s
  }
}

function getK8sToken () {
  return k8sToken
}

function k8sAuthHeaders () {
  if (!k8sToken) return {}
  return { authorization: `Bearer ${k8sToken}` }
}

module.exports = { getK8sToken, k8sAuthHeaders }
