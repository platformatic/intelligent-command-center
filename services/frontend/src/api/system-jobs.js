/* eslint-disable no-unreachable */
import { calculateCronFromValue, calculateValueFromCron, SYNC_QUEUE_NAME } from './cron_utils'

const baseUrl = `${import.meta.env.VITE_API_BASE_URL}`

const getHeaders = () => {
  const headers = {
    'content-type': 'application/json'
  }
  return headers
}

export const getCurrentSync = async () => {
  try {
    const response = await fetch(`${baseUrl}/cron/icc-jobs/${SYNC_QUEUE_NAME}`)
    const data = await response.json()
    const { name, schedule, when, paused } = data
    if (paused) {
      console.log('current paused')
      return { value: 'OFF' }
    }
    const value = calculateValueFromCron(schedule)
    return { name, value, schedule, when }
  } catch (error) {
    console.error('Failed to get current sync')
    return { value: 'OFF' }
  }
}

export const setSyncConfig = async (value) => {
  try {
    // if the schedule is OFF, we pause the sync
    const schedule = calculateCronFromValue(value)
    const payload = {
      schedule
    }
    const response = await fetch(`${baseUrl}/cron/icc-jobs/${SYNC_QUEUE_NAME}`, {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    const off = data?.paused || !data?.schedule
    const newValue = off ? 'OFF' : calculateValueFromCron(data.schedule)
    return {
      name: data.name,
      value: newValue,
      schedule: data.schedule,
      when: data.when
    }
  } catch (error) {
    console.error('Failed to set current sync')
    return { value: 'OFF' }
  }
}

export const getSystemJobs = async () => {
  const response = await fetch(`${baseUrl}/cron/icc-jobs`)
  const { status } = response
  const payload = await response.json()

  if (status !== 200) {
    console.error(`Failed to get system jobs: ${payload.message || payload.error}`)
    throw new Error(`Failed to get system jobs: ${payload.message || payload.error}`)
  }
  return payload
}

export const setSystemJobs = async (iccJobSchedules) => {
  const url = `${baseUrl}/cron/icc-jobs`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'PUT',
    credentials: 'include',
    body: JSON.stringify(iccJobSchedules)
  })
  const { status } = response

  if (status !== 200) {
    const error = await response.text()
    console.error(`Failed to change jobs schedules: ${error}`)
    throw new Error(`Failed to change job schedules: ${error}`)
  }
  const json = await response.json()
  return json
}
