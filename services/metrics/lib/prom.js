const { request } = require('undici')

function addTrailingSlash (url) {
  if (url[url.length - 1] === '/') return url
  return `${url}/`
}

async function queryPrometheus (query) {
  const baseUrl = addTrailingSlash(process.env.PLT_METRICS_PROMETHEUS_URL)
  const promUrl = new URL('api/v1/query', baseUrl)
  const response = await request(promUrl, {
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
  const baseUrl = addTrailingSlash(process.env.PLT_METRICS_PROMETHEUS_URL)
  const promUrl = new URL('api/v1/query_range', baseUrl)
  const params = `&start=${start}&end=${end}&step=${step}`

  const response = await request(promUrl, {
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
