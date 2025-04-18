import { describe, test } from 'node:test'
import assert from 'node:assert'
import {
  getCacheDependenciesTreeChart,
  getCacheDependenciesWarning
} from '../src/utilities/caching.js'

describe('getCacheDependenciesTreeChart', () => {
  const entryCacheId = 'xxxxx'
  test('return empty string', async () => {
    assert.equal(getCacheDependenciesTreeChart(entryCacheId), '')
  })

  test('groups the services in the apps with external service, no requests', async () => {
    const traces = {
      services: [
        'test-cache-main',
        'test-cache-other',
        'test-cache-internal',
        'test-cache2-api2',
        'external2',
        'external1'
      ]
    }

    const applications = [{ id: '1', name: 'test-cache' }, { id: '2', name: 'test-cache2' }]

    const chart = getCacheDependenciesTreeChart(entryCacheId, traces, [], applications)
    const expected = `
flowchart LR
  
subgraph 2[test-cache2]
  direction LR
  test-cache2-api2[api2]
end
subgraph 1[test-cache]
  direction LR
  test-cache-other[other]
  test-cache-main[main]
  test-cache-internal[internal]
end

external2[external2]
external1[external1]
linkStyle default stroke-width:2px,fill:none,stroke:#fff
`

    assert.equal(chart, expected)
  })

  test('groups the services in the apps with external service, with requests but not dependents', async () => {
    const traces = {
      services: [
        'test-cache-main',
        'test-cache-other',
        'test-cache-internal'
      ],
      requests: [
        {
          sourceTelemetryId: 'X',
          targetTelemetryId: 'test-cache-main',
          method: 'GET',
          path: '/other',
          httpCacheId: null
        },
        {
          sourceTelemetryId: 'test-cache-main',
          targetTelemetryId: 'test-cache-other',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'd03d891a-e219-421d-a23c-70f451b937a3'
        },
        {
          sourceTelemetryId: 'test-cache-other',
          targetTelemetryId: 'test-cache-internal',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'f5759577-94ef-49bf-8116-cef96b769303'
        }
      ]
    }

    const applications = [{ id: '1', name: 'test-cache' }]

    const chart = getCacheDependenciesTreeChart(entryCacheId, traces, [], applications)

    const expected = `
flowchart LR
  
subgraph 1[test-cache]
  direction LR
  test-cache-other[other]
  test-cache-main[main]
  test-cache-internal[internal]
end
test-cache-main --> test-cache-other
test-cache-other --> test-cache-internal

linkStyle default stroke-width:2px,fill:none,stroke:#fff
`
    assert.equal(chart, expected)
  })

  test('groups the services in the apps with external service, with requests and dependents', async () => {
    const traces = {
      services: [
        'test-cache-main',
        'test-cache-other',
        'test-cache-internal',
        'test-cache-internal2'
      ],
      requests: [
        {
          sourceTelemetryId: 'X',
          targetTelemetryId: 'test-cache-main',
          method: 'GET',
          path: '/other',
          httpCacheId: null
        },
        {
          sourceTelemetryId: 'test-cache-main',
          targetTelemetryId: 'test-cache-other',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'd03d891a-e219-421d-a23c-70f451b937a3'
        },
        {
          sourceTelemetryId: 'test-cache-other',
          targetTelemetryId: 'test-cache-internal',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'f5759577-94ef-49bf-8116-cef96b769303'
        },
        {
          sourceTelemetryId: 'test-cache-other',
          targetTelemetryId: 'test-cache-internal2',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'xxxxxxxxxxx'
        }
      ]
    }

    const dependents = [
      {
        id: 'd03d891a-e219-421d-a23c-70f451b937a3',
        kind: 'HTTP_CACHE',
        name: 'other',
        applicationId: '1'
      },
      {
        id: 'f5759577-94ef-49bf-8116-cef96b769303',
        kind: 'HTTP_CACHE',
        name: 'internal',
        applicationId: '1'
      }
    ]

    const entryCacheId = 'd03d891a-e219-421d-a23c-70f451b937a3'

    const applications = [{ id: '1', name: 'test-cache' }]

    const chart = getCacheDependenciesTreeChart(entryCacheId, traces, dependents, applications)
    const expected = `
flowchart LR
  
subgraph 1[test-cache]
  direction LR
  test-cache-other[other]
  test-cache-main[main]
  test-cache-internal2[internal2]
  test-cache-internal[internal]
end
test-cache-main --> test-cache-other
test-cache-other --> test-cache-internal
test-cache-other --> test-cache-internal2

linkStyle default stroke-width:2px,fill:none,stroke:#fff
linkStyle 0 stroke-width:2px,fill:none,stroke:#2588e4
linkStyle 1 stroke-width:2px,fill:none,stroke:#feb928
`

    assert.equal(chart, expected)
  })
})

describe('getCacheDependenciesWarning', () => {
  const entryCacheId = 'xxxxx'
  test('deafults to false', async () => {
    assert.equal(getCacheDependenciesWarning(entryCacheId), false)
  })

  test('should not show the warning: every dependent id is in the requests', async () => {
    const traces = {
      services: [
        'test-cache-main',
        'test-cache-other',
        'test-cache-internal',
        'test-cache-internal2'
      ],
      requests: [
        {
          sourceTelemetryId: 'X',
          targetTelemetryId: 'test-cache-main',
          method: 'GET',
          path: '/other',
          httpCacheId: null
        },
        {
          sourceTelemetryId: 'test-cache-main',
          targetTelemetryId: 'test-cache-other',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'd03d891a-e219-421d-a23c-70f451b937a3'
        },
        {
          sourceTelemetryId: 'test-cache-other',
          targetTelemetryId: 'test-cache-internal',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'f5759577-94ef-49bf-8116-cef96b769303'
        },
        {
          sourceTelemetryId: 'test-cache-other',
          targetTelemetryId: 'test-cache-internal2',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'xxxxxxxxxxx'
        }
      ]
    }

    const dependents = [
      {
        id: 'd03d891a-e219-421d-a23c-70f451b937a3',
        kind: 'HTTP_CACHE',
        name: 'other',
        applicationId: '1'
      },
      {
        id: 'f5759577-94ef-49bf-8116-cef96b769303',
        kind: 'HTTP_CACHE',
        name: 'internal',
        applicationId: '1'
      }
    ]

    const isWarning = getCacheDependenciesWarning(traces, dependents)
    assert.equal(isWarning, false)
  })

  test('should show the warning: there is a dependent id which is not in the requests', async () => {
    const traces = {
      services: [
        'test-cache-main',
        'test-cache-other',
        'test-cache-internal',
        'test-cache-internal2'
      ],
      requests: [
        {
          sourceTelemetryId: 'X',
          targetTelemetryId: 'test-cache-main',
          method: 'GET',
          path: '/other',
          httpCacheId: null
        },
        {
          sourceTelemetryId: 'test-cache-main',
          targetTelemetryId: 'test-cache-other',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'd03d891a-e219-421d-a23c-70f451b937a3'
        },
        {
          sourceTelemetryId: 'test-cache-other',
          targetTelemetryId: 'test-cache-internal',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'f5759577-94ef-49bf-8116-cef96b769303'
        },
        {
          sourceTelemetryId: 'test-cache-other',
          targetTelemetryId: 'test-cache-internal2',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'xxxxxxxxxxx'
        }
      ]
    }

    const dependents = [
      {
        id: 'd03d891a-e219-421d-a23c-70f451b937a3',
        kind: 'HTTP_CACHE',
        name: 'other',
        applicationId: '1'
      },
      {
        id: 'f5759577-94ef-49bf-8116-cef96b769303',
        kind: 'HTTP_CACHE',
        name: 'internal',
        applicationId: '1'
      },
      {
        id: 'xxxxxxxxxxxxxxx-will-not-be-in-requests',
        kind: 'HTTP_CACHE',
        name: 'internal',
        applicationId: '1'
      }
    ]

    const isWarning = getCacheDependenciesWarning(traces, dependents)
    assert.equal(isWarning, true)
  })

  test('with more than 3 service, should set direction to LR', async () => {
    const traces = {
      services: [
        'test-cache-main',
        'test-cache-other',
        'test-cache-internal'
      ],
      requests: [
        {
          sourceTelemetryId: 'X',
          targetTelemetryId: 'test-cache-main',
          method: 'GET',
          path: '/other',
          httpCacheId: null
        },
        {
          sourceTelemetryId: 'test-cache-main',
          targetTelemetryId: 'test-cache-other',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'd03d891a-e219-421d-a23c-70f451b937a3'
        },
        {
          sourceTelemetryId: 'test-cache-other',
          targetTelemetryId: 'test-cache-internal',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'f5759577-94ef-49bf-8116-cef96b769303'
        }
      ]
    }

    const applications = [
      { id: '1', name: 'test-cache' },
      { id: '2', name: 'test-cache2' },
      { id: '3', name: 'test-cache3' },
      { id: '4', name: 'test-cache4' }
    ]

    const chart = getCacheDependenciesTreeChart(entryCacheId, traces, [], applications)

    const expected = `
flowchart LR
  
subgraph 4[test-cache4]
  direction TB
end
subgraph 3[test-cache3]
  direction TB
end
subgraph 2[test-cache2]
  direction TB
end
subgraph 1[test-cache]
  direction TB
  test-cache-other[other]
  test-cache-main[main]
  test-cache-internal[internal]
end
test-cache-main --> test-cache-other
test-cache-other --> test-cache-internal

linkStyle default stroke-width:2px,fill:none,stroke:#fff
`
    assert.equal(chart, expected)
  })

  test('groups the services avoiding redundant links', async () => {
    const traces = {
      services: [
        'test-cache-main',
        'test-cache-other',
        'test-cache-internal',
        'test-cache-internal2'
      ],
      requests: [
        {
          sourceTelemetryId: 'X',
          targetTelemetryId: 'test-cache-main',
          method: 'GET',
          path: '/other',
          httpCacheId: null
        },
        {
          sourceTelemetryId: 'test-cache-main',
          targetTelemetryId: 'test-cache-other',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'd03d891a-e219-421d-a23c-70f451b937a3'
        },
        {
          sourceTelemetryId: 'test-cache-main',
          targetTelemetryId: 'test-cache-other',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'd03d891a-e219-421d-a23c-000000000000'
        },
        {
          sourceTelemetryId: 'test-cache-other',
          targetTelemetryId: 'test-cache-internal',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'f5759577-94ef-49bf-8116-cef96b769303'
        },
        {
          sourceTelemetryId: 'test-cache-other',
          targetTelemetryId: 'test-cache-internal2',
          method: 'GET',
          path: '/cached-counter',
          httpCacheId: 'xxxxxxxxxxx'
        }
      ]
    }

    const dependents = [
      {
        id: 'd03d891a-e219-421d-a23c-70f451b937a3',
        kind: 'HTTP_CACHE',
        name: 'other',
        applicationId: '1'
      },
      {
        id: 'f5759577-94ef-49bf-8116-cef96b769303',
        kind: 'HTTP_CACHE',
        name: 'internal',
        applicationId: '1'
      }
    ]

    const entryCacheId = 'd03d891a-e219-421d-a23c-70f451b937a3'

    const applications = [{ id: '1', name: 'test-cache' }]

    const chart = getCacheDependenciesTreeChart(entryCacheId, traces, dependents, applications)
    const expected = `
flowchart LR
  
subgraph 1[test-cache]
  direction LR
  test-cache-other[other]
  test-cache-main[main]
  test-cache-internal2[internal2]
  test-cache-internal[internal]
end
test-cache-main --> test-cache-other
test-cache-other --> test-cache-internal
test-cache-other --> test-cache-internal2

linkStyle default stroke-width:2px,fill:none,stroke:#fff
linkStyle 0 stroke-width:2px,fill:none,stroke:#2588e4
linkStyle 1 stroke-width:2px,fill:none,stroke:#feb928
`

    assert.equal(chart, expected)
  })
})
