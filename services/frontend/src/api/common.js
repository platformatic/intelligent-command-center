const baseUrl = `${import.meta.env.VITE_API_BASE_URL}`

export default async function callApi (service, url, method, body, headers) {
  const response = await fetch(`${baseUrl}/${service}/${url}`, {
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
    console.error(`Failed to call ${method} ${service}/${url}: ${output.message || output.error}`)
    throw new Error(`Failed to call ${method} ${service}/${url}: ${output.message || output.error}`)
  }
  if (output.length === 0) {
    return true
  }
  return output
}
