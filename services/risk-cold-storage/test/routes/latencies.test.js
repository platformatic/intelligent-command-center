'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { bootstrap } = require('../helper')
const moment = require('moment')

test('GET /latencies/window must return the values inserted no more than 30 days ago', async (t) => {
  const app = await bootstrap(t)
  const { latency } = app.platformatic.entities

  const oneWeekAgo = moment().subtract(1, 'weeks')
  const twoWeeksAgo = moment().subtract(2, 'weeks')
  const fiveWeeksAgo = moment().subtract(5, 'weeks')

  await latency.insert({
    inputs: [{
      serviceFrom: 'A',
      service_to: 'B',
      count: 10,
      mean: 4242,
      dumpedAt: oneWeekAgo
    }, {
      serviceFrom: 'A',
      serviceTo: 'C',
      count: 5,
      mean: 4243,
      dumpedAt: oneWeekAgo
    }, {
      serviceFrom: null,
      serviceTo: 'A',
      count: 200,
      mean: 4244,
      dumpedAt: twoWeeksAgo
    }, {
      serviceFrom: 'A',
      serviceTo: 'B',
      count: 300,
      mean: 4245,
      dumpedAt: fiveWeeksAgo
    }]
  })

  const res = await app.inject({
    method: 'GET',
    url: '/latencies/window'
  })

  const expected = [
    { from: 'A', to: 'B', count: 10, mean: 4242 },
    { from: 'A', to: 'C', count: 5, mean: 4243 },
    { from: '', to: 'A', count: 200, mean: 4244 }
  ]

  const actual = res.json()
  assert.equal(res.statusCode, 200)
  assert.deepStrictEqual(actual, expected)
})

test('POST /latencies/dump must dump all path to the DB', async (t) => {
  const app = await bootstrap(t)
  const { latency } = app.platformatic.entities

  const dump = [{
    from: '',
    to: 'A',
    count: 1,
    mean: 1
  }, {
    from: 'A',
    to: 'B',
    count: 2,
    mean: 2
  }, {
    from: 'B',
    to: 'C',
    count: 3,
    mean: 3
  }, {
    from: 'C',
    to: 'D',
    count: 4,
    mean: 4
  }, {
    from: 'D',
    to: 'E',
    count: 5,
    mean: 5
  }]

  const res = await app.inject({
    method: 'POST',
    url: '/latencies/dump',
    body: { dump }
  })

  assert.equal(res.statusCode, 200)
  const saved = await latency.find()
  assert.deepStrictEqual(dump, saved.map(p => {
    return {
      from: p.serviceFrom,
      to: p.serviceTo,
      count: p.count,
      mean: p.mean
    }
  }))

  {
    await latency.delete({})
    await app.inject({
      method: 'POST',
      url: '/latencies/dump',
      body: {}
    })
    const saved = await latency.find()
    assert.deepStrictEqual([], saved)
  }
})
