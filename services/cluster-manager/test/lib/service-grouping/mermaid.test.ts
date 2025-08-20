import test from 'node:test'

import { Cluster, ClusterInput } from '../../../lib/service-grouping/cluster'
import { mermaidInput, mermaidOutput } from '../../../lib/service-grouping/mermaid'
import { strictEqual } from 'node:assert'

Error.stackTraceLimit = 100

const composerCosts = { cpu: 1, heap: 2, loop: 3 }

const clusterInput: ClusterInput = {
  applications: {
    app1: [
      {
        name: 'svc1',
        type: 'service',
        costs: { cpu: 10, heap: 10, loop: 10 }
      },
      {
        name: 'svc2',
        type: 'service',
        costs: { cpu: 10, heap: 10, loop: 10 }
      }
    ],
    app2: [
      {
        name: 'svc3',
        type: 'service',
        costs: { cpu: 10, heap: 10, loop: 10 }
      },
      {
        name: 'svc4',
        type: 'service',
        costs: { cpu: 10, heap: 10, loop: 10 }
      }
    ]
  },
  links: [
    {
      from: ['app1', 'svc1'],
      to: ['app2', 'svc4'],
      count: 10,
      average: 5
    },
    {
      from: ['app1', 'svc2'],
      to: ['app2', 'svc4'],
      count: 100,
      average: 5
    },
    {
      from: ['app2', 'svc3'],
      to: ['app1', 'svc2'],
      count: 10,
      average: 5
    },
    {
      from: ['app2', 'svc4'],
      to: ['app2', 'svc3'],
      count: 10,
      average: 5
    }
  ],
  budgets: {
    cpu: { min: 0, max: 25 },
    heap: { min: 0, max: 25 },
    loop: { min: 0, max: 25 }
  },
  composerCosts
}

const inputResult = `
graph TD
  subgraph app1
    app1:svc1[svc1]@{ cpu: 10, heap: 10, loop: 10 }
    app1:svc2[svc2]@{ cpu: 10, heap: 10, loop: 10 }
  end
  subgraph app2
    app2:svc3[svc3]@{ cpu: 10, heap: 10, loop: 10 }
    app2:svc4[svc4]@{ cpu: 10, heap: 10, loop: 10 }
  end
  app1:svc1 -->|50| app2:svc4
  app1:svc2 -->|500| app2:svc4
  app2:svc3 -->|50| app1:svc2
  app2:svc4 -->|50| app2:svc3
`.trimStart()

test('mermaidInput', () => {
  strictEqual(mermaidInput(clusterInput), inputResult)
})

const outputResult = `
graph TD
  subgraph app1
    app1:composer[composer]@{ cpu: 1, heap: 2, loop: 3 }
    app1:svc1[svc1]@{ cpu: 10, heap: 10, loop: 10 }
    app1:svc2[svc2]@{ cpu: 10, heap: 10, loop: 10 }
  end
  subgraph app2
    app2:composer[composer]@{ cpu: 1, heap: 2, loop: 3 }
    app2:svc3[svc3]@{ cpu: 10, heap: 10, loop: 10 }
    app2:svc4[svc4]@{ cpu: 10, heap: 10, loop: 10 }
  end
  app1:svc1 -->|50| app2:svc4
  app1:svc2 -->|500| app2:svc4
  app2:svc3 -->|50| app1:svc2
  app2:svc4 -->|50| app2:svc3
`.trimStart()

test('mermaidOutput', () => {
  const cluster = Cluster.from(clusterInput)
  strictEqual(mermaidOutput(cluster), outputResult)
})

const postOptimizationResult = `
graph TD
  subgraph app1
    app1:composer[composer]@{ cpu: 1, heap: 2, loop: 3 }
    app1:svc2[svc2]@{ cpu: 10, heap: 10, loop: 10 }
    app1:svc4[svc4]@{ cpu: 10, heap: 10, loop: 10 }
  end
  subgraph app2
    app2:composer[composer]@{ cpu: 1, heap: 2, loop: 3 }
    app2:svc3[svc3]@{ cpu: 10, heap: 10, loop: 10 }
    app2:svc1[svc1]@{ cpu: 10, heap: 10, loop: 10 }
  end
  app1:svc2 -->|500| app1:svc4
  app2:svc3 -->|50| app1:svc2
  app2:svc1 -->|50| app1:svc4
  app1:svc4 -->|50| app2:svc3
`.trimStart()

test('mermaidOutput (post-optimization)', () => {
  const cluster = Cluster.from(clusterInput)
  cluster.optimize()
  strictEqual(mermaidOutput(cluster), postOptimizationResult)
})
