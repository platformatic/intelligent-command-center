const baseUrl = `${import.meta.env.VITE_API_BASE_URL}/trafficante`

export const callApiGetCacheRecommendations = async () => {
  const url = `${baseUrl}/recommendations`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  const payload = await response.json()

  if (status !== 200) {
    console.error(`Failed to get cache recommendations: ${payload.message || payload.error}`)
    throw new Error(`Failed to get cache recommendations: ${payload.message || payload.error}`)
  }
  return payload
}
export const callApiGetCacheRecommendationRoutes = async (recommendationId) => {
  const query = {
    'where.recommendationId.eq': recommendationId
  }
  const url = `${baseUrl}/recommendationsRoutes?${new URLSearchParams(query).toString()}`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  const payload = await response.json()
  if (status !== 200) {
    console.error(`Failed to get cache recommendation routes: ${payload.message || payload.error}`)
    throw new Error(`Failed to get cache recommendation routes: ${payload.message || payload.error}`)
  }
  return payload.map((item) => {
    if (Object.keys(item.varyHeaders).length === 0) {
      item.varyHeaders = []
    } else {
      item.varyHeaders = Object.values(item.varyHeaders)
    }
    return item
  })
}
export const callApiUpdateRecommendationStatus = async (recommendation, newStatus) => {
  const url = `${baseUrl}/recommendations/${recommendation.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      taxonomyId: '00000000-0000-0000-0000-000000000000',
      ...recommendation,
      status: newStatus
    })
  })
  const { status } = response
  const payload = await response.json()
  if (status !== 200) {
    console.error(`Failed to update recommendation status: ${payload.message || payload.error}`)
    throw new Error(`Failed to update recommendation status: ${payload.message || payload.error}`)
  }
  return payload
}
export const callApiGetCacheRouteExample = async (applicationId, routeName) => {
  // TODO: remove this once the API is implemented
  const query = { 'where.applicationId.eq': applicationId, 'where.route.eq': routeName }
  const url = `${baseUrl}/routeExamples`
  const response = await fetch(`${url}?${new URLSearchParams(query).toString()}`, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  const json = await response.json()
  if (status !== 200) {
    console.error(`Failed to get cache route example: ${json.message || json.error}`)
    throw new Error(`Failed to get cache route example: ${json.message || json.error}`)
  }
  return json[0]
}
export const mockGetApplications = async () => {
  return [
    {
      id: '1e0a3cf4-db42-487c-8311-516810158354',
      name: 'test-app-1'
    },
    {
      id: '2e0a3cf4-db42-487c-8311-516810158354',
      name: 'test-app-2'
    }
  ]
}

export const getLatestNewCacheRecommendation = async () => {
  const query = { 'where.status.eq': 'new' }
  const url = `${baseUrl}/recommendations`
  const response = await fetch(`${url}?${new URLSearchParams(query).toString()}`, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  const json = await response.json()

  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to get latest new cache recommendation : ${error}`)
    throw new Error(`Failed to get latest new cache recommendation : ${error}`)
  }
  if (json.length > 0) {
    return json[0]
  }
  return null
}

export const callApiUpdateRecommendationRoute = async ({ recommendationId, routeId, selected, ttl, cacheTag, varyHeaders }) => {
  const url = `${baseUrl}/recommendations/${recommendationId}/routes/${routeId}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ selected, ttl, cacheTag, varyHeaders })
  })
  const { status } = response
  if (status !== 200) {
    const payload = await response.json()
    console.error(`Failed to update route configuration: ${payload.message || payload.error}`)
    throw new Error(`Failed to update route configuration: ${payload.message || payload.error}`)
  }
  return true
}

export const callApiApplyRecommendation = async (applicationId, saveInterceptorConfig = false) => {
  const query = {
    applicationId,
    taxonomyId: '00000000-0000-0000-0000-000000000000',
    saveInterceptorConfig
  }
  const url = `${baseUrl}/recommendations/apply?${new URLSearchParams(query).toString()}`
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include'
  })
  const { status } = response
  if (status !== 200) {
    const payload = await response.json()
    console.error(`Failed to apply recommendation: ${payload.message || payload.error}`)
    throw new Error(`Failed to apply recommendation: ${payload.message || payload.error}`)
  }
  return true
}

export const callApiTriggerTrafficante = async () => {
  const url = `${baseUrl}/recommendations`
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include'
  })
  const { status, headers } = response
  if (headers.get('content-length') === '4') {
    // a "null" response happened
    return false
  }
  const payload = await response.json()
  if (status !== 200) {
    console.error(`Failed to trigger trafficante: ${payload.message || payload.error}`)
    throw new Error(`Failed to trigger trafficante: ${payload.message || payload.error}`)
  }
  if (payload.id) {
    return true
  }
  return false
}

export const callApiGetInterceptorConfig = async (recommendationId, applicationId) => {
  const url = `${baseUrl}/recommendations/${recommendationId}/interceptor-configs/${applicationId}`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  const payload = await response.json()
  if (status !== 200) {
    console.error(`Failed to save interceptor config: ${payload.message || payload.error}`)
    throw new Error(`Failed to save interceptor config: ${payload.message || payload.error}`)
  }
  return payload
}
