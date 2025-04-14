'use strict'

const { join } = require('node:path')
const { readdir, stat } = require('node:fs/promises')
const { request } = require('undici')

async function callGHEndpoint ({ path, method, accessToken }) {
  const res = await request(`https://api.github.com/${path}`, {
    method: method.toUpperCase(),
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'A Platformatic App'
    }
  })

  return await res.body.json()
}

async function getICCServices (excludeMain = false) {
  const output = []
  const servicesDir = join(__dirname, '..', '..')
  const list = await readdir(servicesDir)
  for (const entry of list) {
    if (excludeMain === false || entry !== 'main') {
      const data = await stat(join(servicesDir, entry))
      if (data.isDirectory()) {
        output.push(entry)
      }
    }
  }
  return output
}
module.exports = { callGHEndpoint, getICCServices }
