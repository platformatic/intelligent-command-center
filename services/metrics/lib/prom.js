const { Client } = require('undici')

async function queryPrometheus (query) {
  const promUrl = process.env.PLT_METRICS_PROMETHEUS_URL
  const client = new Client(promUrl)
  const response = await client.request({
    path: '/api/v1/query',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `query=${encodeURIComponent(query)}`
  })
  const body = await response.body.text()
  const data = JSON.parse(body)
  return data
}

async function queryRangePrometheus (query, start, end, step = '1m') {
  const promUrl = process.env.PLT_METRICS_PROMETHEUS_URL
  const params = `&start=${start}&end=${end}&step=${step}`

  const client = new Client(promUrl)
  const response = await client.request({
    path: '/api/v1/query_range',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `query=${encodeURIComponent(query)}${params}`
  })
  const body = await response.body.text()
  const data = JSON.parse(body)
  return data
}

module.exports = {
  queryPrometheus,
  queryRangePrometheus
}
