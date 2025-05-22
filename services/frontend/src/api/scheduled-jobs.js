/* eslint-disable no-unreachable */
const baseUrl = `${import.meta.env.VITE_API_BASE_URL}`

/**
 * Generates a random UUID v4
 * @returns {string} A random UUID v4 string
 */
export function generateUUID () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export const callApiGetScheduledJobById = async (id) => {
  const url = `${baseUrl}/cron/jobs/${id}`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  const payload = await response.json()

  if (status !== 200) {
    console.error(`Failed to get scheduled task: ${payload.message || payload.error}`)
    throw new Error(`Failed to get scheduled task: ${payload.message || payload.error}`)
  }
  return payload
}

export const callApiGetScheduledJobs = async (applicationId) => {
  const query = { 'where.applicationId.eq': applicationId }
  const url = `${baseUrl}/cron/jobs`
  const response = await fetch(`${url}?${new URLSearchParams(query).toString()}`, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  const json = await response.json()

  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to get scheduled jobs: ${error}`)
    throw new Error(`Failed to get scheduled jobs: ${error}`)
  }
  return json
}

export const callApiCreateScheduledJob = async (job) => {
  const url = `${baseUrl}/cron/jobs`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(job)
  })
  const { status } = response

  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to create scheduled job: ${error}`)
    throw new Error(`Failed to create scheduled job: ${error}`)
  }
  const json = await response.json()
  return json
}

export const callApiGetScheduledJobsMetrics = async (applicationId) => {
  const res = await fetch(`${baseUrl}/metrics/apps/${applicationId}/jobs`, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = res
  if (status !== 200) {
    const error = await res.text()
    console.error(`Failed to get scheduled tasks metrics: ${error}`)
    throw new Error(`Failed to get scheduled tasks metrics: ${error}`)
  }
  const metrics = await res.json()
  return metrics
}

export const callApiDeleteScheduledJob = async (id) => {
  const url = `${baseUrl}/cron/jobs/${id}`
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include'
  })
  const { status } = response
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to delete scheduled task: ${error}`)
    throw new Error(`Failed to delete scheduled task: ${error}`)
  }
  return true
}

export const callApiGetScheduledJobMetrics = async (jobId) => {
  const res = await fetch(`${baseUrl}/metrics/jobs/${jobId}`, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = res
  if (status !== 200) {
    const error = await res.text()
    console.error(`Failed to get scheduled tasks metrics: ${error}`)
    throw new Error(`Failed to get scheduled tasks metrics: ${error}`)
  }
  return res.json()
}

export const callApiUpdateScheduledJob = async (id, data) => {
  const url = `${baseUrl}/cron/jobs/${id}`
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  const { status } = response
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to update scheduled job: ${error}`)
    throw new Error(`Failed to update scheduled job: ${error}`)
  }
  const json = await response.json()
  return json
}

export const callApiGetScheduledJobMessages = async (id) => {
  const query = { 'orderby.createdAt': 'desc', limit: 100, offset: 0 }
  const url = `${baseUrl}/cron/jobs/${id}/messages?${new URLSearchParams(query).toString()}`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response

  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to get scheduled job messages: ${error}`)
    throw new Error(`Failed to get scheduled job messages: ${error}`)
  }
  const json = await response.json()
  const output = json.map((message) => {
    let responseBody = message.responseBody
    try {
      responseBody = JSON.parse(responseBody)
    } catch (e) {}

    let responseHeaders = message.responseHeaders
    try {
      responseHeaders = JSON.parse(responseHeaders)
    } catch (e) {}

    return {
      ...message,
      responseBody,
      responseHeaders
    }
  })
  // TODO: investigate why the query is not returning the messages in the correct order
  return output.sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
}

export async function callApiSuspendScheduledJob (id) {
  const url = `${baseUrl}/cron/jobs/${id}/pause`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to suspend scheduled job: ${error}`)
    throw new Error(`Failed to suspend scheduled job: ${error}`)
  }
  return true
}

export async function callApiResumeScheduledJob (id) {
  const url = `${baseUrl}/cron/jobs/${id}/resume`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to resume scheduled job: ${error}`)
    throw new Error(`Failed to resume scheduled job: ${error}`)
  }
  return true
}

export async function callApiRunScheduledJobNow (id) {
  const url = `${baseUrl}/cron/jobs/${id}/run`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to run scheduled job: ${error}`)
    throw new Error(`Failed to run scheduled job: ${error}`)
  }
  return true
}

export const callApiCancelRetryingMessage = async (id) => {
  const url = `${baseUrl}/cron/messages/${id}/cancel`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  })
  const { status } = response
  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to cancel retrying message: ${error}`)
    throw new Error(`Failed to cancel retrying message: ${error}`)
  }
  return true
}
