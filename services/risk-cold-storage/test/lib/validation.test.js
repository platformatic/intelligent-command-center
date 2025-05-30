'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { validateNDJSON } = require('../../lib/validation')

test('validate paths', async (t) => {
  {
    // valid paths
    const paths =
`{"path":"/foo","dumped_at":"2024-12-04T21:16:07.567Z","counter":2,"exported_at":null,"imported_at":null}
{"path":"/bar","dumped_at":"2024-12-04T21:16:07.567Z","counter":3,"exported_at":null,"imported_at":null}`
    validateNDJSON('paths', paths)
  }

  {
    // invalid paths (missing mandatory counter)
    const paths =
`{"path":"/foo","dumped_at":"2024-12-04T21:16:07.567Z","exported_at":null,"imported_at":null}
{"path":"/bar","dumped_at":"2024-12-04T21:16:07.567Z","exported_at":null,"imported_at":null}`

    assert.throws(() => validateNDJSON('paths', paths), {
      name: 'Error',
      message: "data must have required property 'counter'"
    })
  }
})

test('validate db_operations', async (t) => {
  {
    const data = `
    {"db_id":"mydb","tables":["t1", "t2"], "columns":["a", "b"], "query_type": "select", "paths": ["/1"], "dumped_at":"2024-12-04T21:16:07.567Z"}
    {"db_id":"mydb","tables":["t1", "t3"], "columns": ["b", "c"], "query_type": "update", "paths": ["/2"], "dumped_at":"2024-12-04T21:16:07.567Z"}
    `
    validateNDJSON('db_operations', data)
  }

  {
    const data = `
    {"db_id":"mydb","tables":["t1", "t2"],"dumped_at":"2024-12-04T21:16:07.567Z"}
    {"db_id":"mydb","tables":["t1", "t2"],"dumped_at":"2024-12-04T21:16:07.567Z"}
    `
    assert.throws(() => validateNDJSON('db_operations', data), {
      name: 'Error',
      message: "data must have required property 'columns'"
    })
  }
})

test('validate latencies', async (t) => {
  {
    const data = `
    {"service_from":"service1", "service_to": "service2", "mean": 42, "count": 442, "dumped_at":"2024-12-04T21:16:07.567Z"}
    {"service_from":"service3", "service_to": "service2", "mean": 142, "count": 1442, "dumped_at":"2024-12-04T21:16:07.567Z"}
    `
    validateNDJSON('latencies', data)
  }

  {
    const data = `
    {"service_from":"service1", "mean": 42, "count": 442, "dumped_at":"2024-12-04T21:16:07.567Z"}
    {"service_from":"service3", "service_to": "service2", "mean": 142, "count": 1442, "dumped_at":"2024-12-04T21:16:07.567Z"}
    `
    assert.throws(() => validateNDJSON('latencies', data), {
      name: 'Error',
      message: "data must have required property 'service_to'"
    })
  }
})
