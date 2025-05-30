'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { getDBKey, parseDBKey } = require('../../lib/db')

test('create db key with port, host, dbname', async () => {
  const db = {
    host: 'localhost',
    port: 5432,
    dbName: 'xxx'
  }

  const res = getDBKey(db)
  assert.strictEqual(res, 'dbns:[localhost:5432:xxx]')

  const res2 = parseDBKey(res)
  assert.deepEqual(res2, {
    host: 'localhost',
    port: 5432,
    dbName: 'xxx'
  })
})

test('create db key with port, host,  but no dbname', async () => {
  const db = {
    host: 'localhost',
    port: 5432
  }

  const res = getDBKey(db)
  assert.strictEqual(res, 'dbns:[localhost:5432:]')

  const res2 = parseDBKey(res)
  assert.deepEqual(res2, {
    host: 'localhost',
    port: 5432,
    dbName: ''
  })
})

test('create db key with dbname but no host or port', async () => {
  const db = {
    dbName: 'xxx'
  }

  const res = getDBKey(db)
  assert.strictEqual(res, 'dbns:[:0:xxx]')

  const res2 = parseDBKey(res)
  assert.deepEqual(res2, {
    host: '',
    port: 0,
    dbName: 'xxx'
  })
})

test('create db key with dbname with path', async () => {
  const db = {
    dbName: '/test/xxx'
  }

  const res = getDBKey(db)
  assert.strictEqual(res, 'dbns:[:0:%2Ftest%2Fxxx]')

  const res2 = parseDBKey(res)
  assert.deepEqual(res2, {
    host: '',
    port: 0,
    dbName: '/test/xxx'
  })
})

test('create db key with dbname with `:`', async () => {
  const db = {
    dbName: ':memory:'
  }

  const res = getDBKey(db)
  assert.strictEqual(res, 'dbns:[:0:%3Amemory%3A]')

  const res2 = parseDBKey(res)
  assert.deepEqual(res2, {
    host: '',
    port: 0,
    dbName: ':memory:'
  })
})
