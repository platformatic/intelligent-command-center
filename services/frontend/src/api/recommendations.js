const baseUrl = `${import.meta.env.VITE_API_BASE_URL}`

export const callApiGetRecommendations = async () => {
  const query = { 'orderby.createdAt': 'DESC' }
  const url = `${baseUrl}/cluster-manager/recommendations`
  const response = await fetch(`${url}?${new URLSearchParams(query).toString()}`, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response

  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to get recommendations: ${error}`)
    throw new Error(`Failed to get recommendations : ${error}`)
  }

  const json = await response.json()
  return json
}

export const callApiUpdateRecommendation = async (recommendationId, newStatus) => {
  const url = `${baseUrl}/cluster-manager/recommendations/${recommendationId}`
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ status: newStatus, count: 0 }),
    credentials: 'include'
  })
  const { status } = response
  const json = await response.json()

  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to update recommendation ${recommendationId}: ${error}`)
    throw new Error(`Failed to update recommendation ${recommendationId} : ${error}`)
  }
  return json
}

export const getLatestNewRecommendation = async () => {
  const query = { 'where.status.eq': 'new' }
  const url = `${baseUrl}/cluster-manager/recommendations`
  const response = await fetch(`${url}?${new URLSearchParams(query).toString()}`, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  const json = await response.json()

  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to get latest new recommendation : ${error}`)
    throw new Error(`Failed to get latest new recommendation : ${error}`)
  }
  if (json.length > 0) {
    return json[0]
  }
  return null
}

export const getRecommendationsCount = async () => {
  const url = `${baseUrl}/cluster-manager/recommendations/count`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to get recommendations count : ${error}`)
    throw new Error(`Failed to get recommendations count : ${error}`)
  }
  return parseInt(await response.text())
}
