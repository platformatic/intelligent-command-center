'use strict'

const { readFileSync } = require('node:fs')
const { readFile } = require('node:fs/promises')

const K8S_TOKEN_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/token'

let k8sToken = process.env.PLT_K8S_TOKEN || null
if (!k8sToken) {
  try {
    k8sToken = readFileSync(K8S_TOKEN_PATH, 'utf8').trim()
  } catch {
    // Not running in K8s
  }
}

function decodeJwtPayload (token) {
  try {
    if (!token) return null
    const base64Payload = token.split('.')[1]
    if (!base64Payload) return null
    const payload = Buffer.from(base64Payload, 'base64').toString('utf8')
    return JSON.parse(payload)
  } catch (err) {
    return null
  }
}

function isTokenExpired (token) {
  const payload = decodeJwtPayload(token)
  if (!payload || !payload.exp) return true
  const currentTime = Math.floor(Date.now() / 1000)
  return payload.exp <= currentTime
}

async function loadToken () {
  const tokenPath = process.env.PLT_K8S_TOKEN_PATH || K8S_TOKEN_PATH
  try {
    k8sToken = await readFile(tokenPath, 'utf8').then(t => t.trim())
  } catch (err) {
    // Not running in K8s or token file not readable
  }
  return k8sToken
}

function getK8sToken () {
  return k8sToken
}

async function getK8sTokenAsync () {
  if (isTokenExpired(k8sToken) || !k8sToken) {
    await loadToken()
  }
  return k8sToken
}

function k8sAuthHeaders () {
  if (!k8sToken) return {}
  return { authorization: `Bearer ${k8sToken}` }
}

async function k8sAuthHeadersAsync () {
  const token = await getK8sTokenAsync()
  if (!token) return {}
  return { authorization: `Bearer ${token}` }
}

module.exports = {
  getK8sToken,
  getK8sTokenAsync,
  k8sAuthHeaders,
  k8sAuthHeadersAsync,
  decodeJwtPayload,
  isTokenExpired,
  loadToken
}
