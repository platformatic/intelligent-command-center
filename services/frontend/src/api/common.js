const baseUrl = `${import.meta.env.VITE_API_BASE_URL}`

export default async function callApi (service, url, method, body, headers) {
  if (!url.startsWith('/')) {
    url = `/${url}`
  }
  if (body) {
    headers = {
      ...headers,
      'content-type': 'application/json'
    }
    body = JSON.stringify(body)
  }
  if (!method) {
    method = 'GET'
  }
  let urlToFetch = `${baseUrl}/${service}${url}`
  if (service === 'main' || service === '') {
    urlToFetch = `${baseUrl}${url}`
  }
  const response = await fetch(urlToFetch, {
    method,
    body,
    headers,
    credentials: 'include'
  })
  let output = null
  if (response.headers.get('content-type').includes('application/json')) {
    output = await response.json()
  } else {
    output = await response.text()
  }

  if (response.status !== 200) {
    console.error(`Failed to call ${method} ${service}${url}: ${output.message || output.error}`)
    throw new Error(`Failed to call ${method} ${service}${url}: ${output.message || output.error}`)
  }
  // if output is an array return it
  if (Array.isArray(output)) {
    return output
  }

  if (output.length === 0) {
    return true
  }
  return output
}
