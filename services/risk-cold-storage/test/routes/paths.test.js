'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { bootstrap } = require('../helper')
const moment = require('moment')

test('GET /paths/window must return the paths inserted no more than 30 days ago', async (t) => {
  const app = await bootstrap(t)
  const { path } = app.platformatic.entities

  const oneWeekAgo = moment().subtract(1, 'weeks')
  const twoWeeksAgo = moment().subtract(2, 'weeks')
  const fiveWeeksAgo = moment().subtract(5, 'weeks')

  await path.insert({
    inputs: [{
      path: '/foo',
      counter: 1,
      dumpedAt: oneWeekAgo
    }, {
      path: '/bar',
      counter: 2,
      dumpedAt: oneWeekAgo
    }, {
      path: '/foo',
      counter: 2,
      dumpedAt: twoWeeksAgo
    }, {
      path: '/bar',
      counter: 3,
      dumpedAt: twoWeeksAgo
    }, {
      path: '/old',
      counter: 4,
      dumpedAt: fiveWeeksAgo
    }]
  })

  const res = await app.inject({
    method: 'GET',
    url: '/paths/window'
  })

  const expected = {
    '/bar': 5,
    '/foo': 3
  }

  const actual = res.json()
  assert.deepStrictEqual(actual, expected)
})

test('GET /paths/window?days=x must return the paths inserted no more than x days ago', async (t) => {
  const app = await bootstrap(t)
  const { path } = app.platformatic.entities

  const oneWeekAgo = moment().subtract(1, 'weeks')
  const twoWeeksAgo = moment().subtract(2, 'weeks')
  const fiveWeeksAgo = moment().subtract(5, 'weeks')

  await path.insert({
    inputs: [{
      path: '/foo',
      counter: 1,
      dumpedAt: oneWeekAgo
    }, {
      path: '/bar',
      counter: 2,
      dumpedAt: oneWeekAgo
    }, {
      path: '/foo',
      counter: 2,
      dumpedAt: twoWeeksAgo
    }, {
      path: '/bar',
      counter: 3,
      dumpedAt: twoWeeksAgo
    }, {
      path: '/old',
      counter: 4,
      dumpedAt: fiveWeeksAgo
    }]
  })

  const res = await app.inject({
    method: 'GET',
    url: '/paths/window?days=8'
  })

  const expected = {
    '/bar': 2,
    '/foo': 1
  }
  const actual = res.json()
  assert.deepStrictEqual(actual, expected)
})

test('POST /paths/dump must dump all path to the DB', async (t) => {
  const app = await bootstrap(t)
  const { path } = app.platformatic.entities

  const dump = [{
    path: '/foo',
    counter: 1
  }, {
    path: '/bar',
    counter: 2
  }, {
    path: '/foa',
    counter: 2
  }, {
    path: '/baz',
    counter: 3
  }, {
    path: '/old',
    counter: 4
  }]

  const res = await app.inject({
    method: 'POST',
    url: '/paths/dump',
    body: { dump }
  })

  assert.equal(res.statusCode, 200)

  const saved = await path.find()
  assert.deepStrictEqual(dump, saved.map(p => {
    delete p.dumpedAt
    delete p.exportedAt
    delete p.importedAt
    return p
  }))

  {
    await path.delete({})
    await app.inject({
      method: 'POST',
      url: '/paths/dump',
      body: {}
    })
    const saved = await path.find()
    assert.deepStrictEqual([], saved)
  }
})
