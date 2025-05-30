'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { bootstrap } = require('../helper')
const moment = require('moment')

test('POST /db/dump must dump db operations', async (t) => {
  const app = await bootstrap(t)
  const { dbOperation } = app.platformatic.entities

  const dump = [
    {
      dbId: 'db:[localhost:5432]',
      host: 'localhost',
      port: 5432,
      dbSystem: 'postgresql',
      dbName: 'postgres',
      queryType: 'SELECT',
      tables: ['mytable'],
      columns: ['mycolumn'],
      targetTable: '',
      paths: ['path1', 'path2']
    }, {
      dbId: 'db:[localhost:5432]',
      host: 'localhost',
      port: 5432,
      dbSystem: 'postgresql',
      dbName: 'postgres',
      queryType: 'INSERT',
      tables: ['mytable2'],
      columns: ['mycolumn2', 'mycolumn3'],
      targetTable: 'mytable2',
      paths: ['path3', 'path4']
    }
  ]

  const res = await app.inject({
    method: 'POST',
    url: '/db/dump',
    body: { dump }
  })

  assert.equal(res.statusCode, 200)
  const saved = await dbOperation.find()
  const found = saved.map(p => {
    delete p.dumpedAt
    delete p.id
    delete p.importedAt
    delete p.exportedAt
    return p
  })
  assert.deepStrictEqual(dump, found)

  {
    // Save the same dump twice
    const dump = [
      {
        dbId: 'db:[localhost:5432]',
        host: 'localhost',
        port: 5432,
        dbSystem: 'postgresql',
        dbName: 'postgres',
        queryType: 'SELECT',
        tables: ['mytable'],
        columns: ['mycolumn'],
        targetTable: '',
        paths: ['path1', 'path2']
      }, {
        dbId: 'db:[localhost:5432]',
        host: 'localhost',
        port: 5432,
        dbSystem: 'postgresql',
        dbName: 'postgres',
        queryType: 'INSERT',
        tables: ['mytable2'],
        columns: ['mycolumn2', 'mycolumn3'],
        targetTable: 'mytable2',
        paths: ['path3', 'path4']
      }
    ]

    await app.inject({
      method: 'POST',
      url: '/db/dump',
      body: { dump }
    })

    await app.inject({
      method: 'POST',
      url: '/db/dump',
      body: { dump }
    })

    const res = await app.inject({
      method: 'POST',
      url: '/db/dump',
      body: { dump }
    })

    assert.equal(res.statusCode, 200)
    const saved = await dbOperation.find()
    const found = saved.map(p => {
      delete p.dumpedAt
      delete p.id
      delete p.importedAt
      delete p.exportedAt
      return p
    })
    assert.deepStrictEqual(dump, found)
  }

  {
    await dbOperation.delete({})
    await app.inject({
      method: 'POST',
      url: '/dump',
      body: {}
    })
    const saved = await dbOperation.find()
    assert.deepStrictEqual([], saved)
  }
})

test('GET /db/window must return the paths inserted no more than 30 days ago', async (t) => {
  const app = await bootstrap(t)
  const { dbOperation } = app.platformatic.entities

  const oneWeekAgo = moment().subtract(1, 'weeks')
  const twoWeeksAgo = moment().subtract(2, 'weeks')
  const fiveWeeksAgo = moment().subtract(5, 'weeks')

  const data = [{
    dbId: 'db:[localhost:5432]',
    host: 'localhost',
    port: 5432,
    dbSystem: 'postgresql',
    dbName: 'postgres',
    queryType: 'SELECT',
    tables: ['mytable'],
    columns: ['mycolumn'],
    targetTable: '',
    paths: ['path1', 'path2'],
    dumpedAt: oneWeekAgo
  }, {
    dbId: 'db:[localhost:5432]',
    host: 'localhost',
    port: 5432,
    dbSystem: 'postgresql',
    dbName: 'postgres',
    queryType: 'SELECT',
    tables: ['mytable'],
    columns: ['mycolumn'],
    targetTable: '',
    paths: ['path3', 'path4'],
    dumpedAt: twoWeeksAgo
  }, {
    dbId: 'db:[localhost:5432]',
    host: 'localhost',
    port: 5432,
    dbSystem: 'postgresql',
    dbName: 'postgres',
    queryType: 'SELECT',
    tables: ['mytable'],
    columns: ['mycolumn'],
    targetTable: '',
    paths: ['path5', 'path6'],
    dumpedAt: fiveWeeksAgo
  }]

  await dbOperation.insert({
    inputs: data
  })

  const res = await app.inject({
    method: 'GET',
    url: '/db/window'
  })

  const expected = data.slice(0, 2).map(p => {
    delete p.dumpedAt
    return p
  })

  const actual = res.json()
  assert.deepStrictEqual(actual, expected)
})
