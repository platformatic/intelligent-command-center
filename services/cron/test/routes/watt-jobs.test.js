'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { buildServer, getJobFromName } = require('../helper')
const { setTimeout: sleep } = require('node:timers/promises')

test('PUT /watt-jobs creates a new job with WATT type', async (t) => {
  const server = await buildServer(t)

  const jobPayload = {
    name: 'test-watt-job',
    callbackUrl: 'http://example.com/api',
    schedule: '0 */2 * * *',
    method: 'POST',
    maxRetries: 5,
    body: { data: 'test' },
    headers: { 'content-type': 'application/json' },
    applicationId: '00000000-0000-0000-0000-000000000001'
  }

  const res = await server.inject({
    method: 'PUT',
    url: '/watt-jobs',
    payload: jobPayload
  })

  const { statusCode, body } = res
  const job = JSON.parse(body)

  assert.equal(statusCode, 200)
  assert.equal(job.name, jobPayload.name)
  assert.equal(job.schedule, jobPayload.schedule)
  assert.equal(job.url, jobPayload.callbackUrl)
  assert.equal(job.method, jobPayload.method)
  assert.equal(job.maxRetries, jobPayload.maxRetries)
  assert.equal(job.applicationId, jobPayload.applicationId)
  assert.equal(job.jobType, 'WATT')

  // Verify job was saved in database with correct type
  const dbJob = await getJobFromName(jobPayload.name)
  assert.equal(dbJob.job_type, 'WATT')
})

test('PUT /watt-jobs updates an existing job with the same name, applicationId', async (t) => {
  const server = await buildServer(t)

  // First create a job
  const initialJob = {
    name: 'update-watt-job',
    callbackUrl: 'http://example.com/api/original',
    schedule: '0 */2 * * *',
    method: 'GET',
    maxRetries: 3,
    body: { data: 'initial' },
    headers: { 'content-type': 'application/json' },
    applicationId: '00000000-0000-0000-0000-000000000001'
  }

  await server.inject({
    method: 'PUT',
    url: '/watt-jobs',
    payload: initialJob
  })

  // Now update the same job
  const updatedJob = {
    name: initialJob.name, // Same name
    callbackUrl: 'http://example.com/api/updated',
    schedule: '0 */4 * * *', // Different schedule
    method: 'POST', // Different method
    maxRetries: 5, // Different maxRetries
    body: { data: 'updated' }, // Different body
    headers: { 'x-api-key': 'abc123' }, // Different headers
    applicationId: initialJob.applicationId // Same applicationId
  }

  const res = await server.inject({
    method: 'PUT',
    url: '/watt-jobs',
    payload: updatedJob
  })

  const { statusCode, body } = res
  const job = JSON.parse(body)

  assert.equal(statusCode, 200)
  assert.equal(job.name, updatedJob.name)
  assert.equal(job.schedule, updatedJob.schedule)
  assert.equal(job.url, updatedJob.callbackUrl)
  assert.equal(job.method, updatedJob.method)
  assert.equal(job.maxRetries, updatedJob.maxRetries)
  assert.equal(job.applicationId, updatedJob.applicationId)
  assert.equal(job.jobType, 'WATT')

  // Verify the job was updated in the database
  const dbJob = await getJobFromName(updatedJob.name)
  assert.equal(dbJob.job_type, 'WATT')
  assert.equal(dbJob.callback_url, updatedJob.callbackUrl)
  assert.equal(dbJob.schedule, updatedJob.schedule)
})

test('PUT /watt-jobs does not update a job when no changes are made', async (t) => {
  const server = await buildServer(t)

  // First create a job
  const jobPayload = {
    name: 'unchanged-watt-job',
    callbackUrl: 'http://example.com/api/test',
    schedule: '0 */6 * * *',
    method: 'PUT',
    maxRetries: 4,
    body: { test: 'data' },
    headers: { authorization: 'Bearer token123' },
    applicationId: '00000000-0000-0000-0000-000000000003'
  }

  await server.inject({
    method: 'PUT',
    url: '/watt-jobs',
    payload: jobPayload
  })

  const { updatedAt: updatedAtBefore } = (await server.platformatic.entities.job.find({}))[0]

  // Wait to ensure timestamps would be different if updated
  await sleep(200)

  // Submit the exact same job data again
  const secondRes = await server.inject({
    method: 'PUT',
    url: '/watt-jobs',
    payload: jobPayload
  })

  // All properties must remain the same
  const secondJob = JSON.parse(secondRes.body)
  assert.equal(secondJob.name, jobPayload.name)
  assert.equal(secondJob.schedule, jobPayload.schedule)
  assert.equal(secondJob.url, jobPayload.callbackUrl)
  assert.equal(secondJob.method, jobPayload.method)
  assert.equal(secondJob.maxRetries, jobPayload.maxRetries)
  assert.equal(secondJob.applicationId, jobPayload.applicationId)
  assert.equal(secondJob.jobType, 'WATT')

  const jobsAfter = await server.platformatic.entities.job.find({})
  const { updatedAt: updatedAtAfter } = jobsAfter[0]
  assert.equal(jobsAfter.length, 1)

  // Verify the job was not updated in the database
  assert.deepEqual(updatedAtBefore, updatedAtAfter)
})
