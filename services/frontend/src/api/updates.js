const baseUrl = `${import.meta.env.VITE_API_BASE_URL}`

export const callGetUpdatesApi = async () => {
  const url = `${baseUrl}/api/updates`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  })

  const json = await response.json()
  return json
}
