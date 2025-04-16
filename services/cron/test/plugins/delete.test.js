'use strict'

const test = require('node:test')
const assert = require('node:assert')

const { buildServer } = require('../helper')

test('logical delete, happy path', async (t) => {
  const server = await buildServer(t)

  await server.platformatic.entities.job.save({
    input: {
      name: 'job1',
      body: 'HELLO FOLKS!'
    }
  })

  const jobs = await server.platformatic.entities.job.find({})
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].deletedAt, null)
  const jobId = jobs[0].id

  server.get('/test', async function (_req, _reply) {
    const { entities } = this.platformatic
    await entities.job.delete({
      where: {
        id: { eq: jobId }
      }
    })
  })

  await server.inject({
    method: 'GET',
    url: '/test'
  })

  {
    const jobs = await server.platformatic.entities.job.find({})
    assert.equal(jobs.length, 0)
  }
})

test('logical delete with rollback', async (t) => {
  const server = await buildServer(t)

  await server.platformatic.entities.job.save({
    input: {
      name: 'job1',
      body: 'HELLO FOLKS!'
    }
  })

  const jobs = await server.platformatic.entities.job.find({})
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].deletedAt, null)
  const jobId = jobs[0].id

  server.get('/test', async function (_req, _reply) {
    const { entities, db } = this.platformatic
    return db.tx(async (tx) => {
      await entities.job.delete({
        where: {
          id: { eq: jobId }
        },
        tx
      })
      throw new Error('BOOM')
    })
  })

  await server.inject({
    method: 'GET',
    url: '/test'
  })

  {
    const jobs = await server.platformatic.entities.job.find({})
    assert.equal(jobs.length, 1)
  }
})

test('cannot delete protected entities', async (t) => {
  const server = await buildServer(t)

  await server.platformatic.entities.job.save({
    input: {
      name: 'job1',
      body: 'HELLO FOLKS!',
      protected: true
    }
  })

  const jobs = await server.platformatic.entities.job.find({})
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].deletedAt, null)
  const jobId = jobs[0].id

  server.get('/test', async function (_req, _reply) {
    const { entities } = this.platformatic
    await entities.job.delete({
      where: {
        id: { eq: jobId }
      }
    })
  })

  const { statusCode, body } = await server.inject({
    method: 'GET',
    url: '/test'
  })

  assert.equal(statusCode, 500)
  assert.equal(body, '{"statusCode":500,"error":"Internal Server Error","message":"Cannot delete protected entity"}')

  {
    const jobs = await server.platformatic.entities.job.find({})
    assert.equal(jobs.length, 1)
    assert.equal(jobs[0].deletedAt, null)
    assert.equal(jobs[0].id, jobId)
  }
})
