import assert, { deepStrictEqual, doesNotThrow, match, ok, strictEqual } from 'node:assert'
import test from 'node:test'

import pino from 'pino'

import { BudgetSet } from '../../../lib/service-grouping/budget-set'
import { Cluster } from '../../../lib/service-grouping/cluster'
import { OptimizationStep } from '../../../lib/service-grouping/optimization-step'
import { LinkCost } from '../../../lib/service-grouping/link-cost'
import { ServiceLink } from '../../../lib/service-grouping/service-link'

const budgets = BudgetSet.from({
  cpu: { min: 0, max: 25 },
  heap: { min: 0, max: 25 },
  loop: { min: 0, max: 25 }
})

const composerCosts = {
  cpu: 1,
  heap: 2,
  loop: 3
}

const logger = pino({ level: 'silent' })

test('new Cluster', () => {
  const cluster = new Cluster(budgets, composerCosts, logger)
  deepStrictEqual(cluster.budgets, budgets, 'stores budgets')
  deepStrictEqual(cluster.composerCosts, composerCosts, 'stores composer cost')
  assert(Array.isArray(cluster.steps), 'has steps array')
  strictEqual(cluster.steps.length, 0, 'steps array is empty')
  assert(cluster.applications instanceof Map, 'has applications map')
  strictEqual(cluster.applications.size, 0, 'applications map is empty')
})

test('Cluster#createApp', () => {
  const cluster = new Cluster(budgets, composerCosts, logger)

  const app1 = cluster.createApp('app1')
  deepStrictEqual(
    cluster.applications.get('app1'),
    app1,
    'stores application in map'
  )
  deepStrictEqual(
    app1.budgets,
    budgets.alloc(app1.composer.costs),
    'inherits cluster budgets'
  )
  deepStrictEqual(
    app1.composer.costs,
    composerCosts,
    'inherits cluster composer costs'
  )

  const customBudgets = BudgetSet.from({
    cpu: { min: 0, max: 10 },
    heap: { min: 0, max: 10 },
    loop: { min: 0, max: 10 }
  })

  const customComposerCosts = {
    cpu: 1,
    heap: 1,
    loop: 1
  }

  const app2 = cluster.createApp('app2', customBudgets, customComposerCosts)
  deepStrictEqual(
    cluster.applications.get('app2'),
    app2,
    'stores application in map'
  )
  deepStrictEqual(
    app2.budgets,
    customBudgets.alloc(app2.composer.costs),
    'uses custom budgets'
  )
  deepStrictEqual(
    app2.composer.costs,
    customComposerCosts,
    'uses custom composer costs'
  )
})

test('Cluster#getApp', () => {
  const cluster = new Cluster(budgets, composerCosts, logger)

  const app1 = cluster.createApp('app1')
  deepStrictEqual(cluster.getApp('app1'), app1, 'returns application')
  strictEqual(cluster.getApp('app2'), undefined, 'returns undefined')
})

test('Cluster#toJSON', () => {
  const cluster = new Cluster(budgets, composerCosts, logger)
  const app1 = cluster.createApp('app1')
  const app2 = cluster.createApp('app2')

  deepStrictEqual(cluster.toJSON(), {
    apps: [app1.toJSON(), app2.toJSON()],
    steps: cluster.steps
  })
})

test('Cluster#from', () => {
  const budgets = {
    cpu: { min: 0, max: 25 },
    heap: { min: 0, max: 25 },
    loop: { min: 0, max: 25 }
  }
  const cluster = Cluster.from({
    applications: {
      app1: [
        {
          name: 'svc1',
          type: 'composer',
          costs: {
            cpu: 10,
            heap: 11,
            loop: 12
          }
        },
        {
          name: 'svc2',
          type: 'service',
          costs: {
            cpu: 20,
            heap: 21,
            loop: 22
          }
        }
      ],
      app2: [
        {
          name: 'svc3',
          type: 'service',
          costs: {
            cpu: 30,
            heap: 31,
            loop: 32
          }
        }
      ]
    },
    links: [
      {
        from: ['app1', 'svc1'],
        to: ['app2', 'svc3'],
        count: 10,
        average: 5
      }
    ],
    budgets,
    composerCosts
  })

  deepStrictEqual(cluster.steps, [])
  deepStrictEqual(cluster.composerCosts, composerCosts)
  deepStrictEqual(cluster.budgets, BudgetSet.from(budgets))
  assert(cluster.applications.has('app1'))
  assert(cluster.applications.has('app2'))
  const app1 = cluster.getApp('app1')
  const app2 = cluster.getApp('app2')

  strictEqual(app1.services.length, 2)
  strictEqual(app2.services.length, 2)
  const svc1 = app1.getService('svc1')
  const svc2 = app1.getService('svc2')
  const svc3 = app2.getService('svc3')

  deepStrictEqual(app1.services, [svc1, svc2])
  deepStrictEqual(app2.services, [app2.composer, svc3])
  deepStrictEqual(svc1.costs, { cpu: 10, heap: 11, loop: 12 })
  deepStrictEqual(svc2.costs, { cpu: 20, heap: 21, loop: 22 })
  deepStrictEqual(svc3.costs, { cpu: 30, heap: 31, loop: 32 })

  strictEqual(svc1.links.length, 1)
  strictEqual(svc2.links.length, 0)
  strictEqual(svc3.links.length, 1)

  deepStrictEqual(svc1.links[0].toJSON(), {
    services: [svc1.target, svc3.target],
    costs: LinkCost.from({
      count: 10,
      average: 5
    })
  })
})

test('Cluster#appsByElu', () => {
  const cluster = Cluster.from({
    applications: {
      app1: [
        {
          name: 'svc1',
          type: 'service',
          costs: {
            cpu: 10,
            heap: 11,
            loop: 12
          }
        },
        {
          name: 'svc2',
          type: 'service',
          costs: {
            cpu: 5,
            heap: 6,
            loop: 7
          }
        }
      ],
      app2: [
        {
          name: 'svc3',
          type: 'service',
          costs: {
            cpu: 30,
            heap: 31,
            loop: 32
          }
        }
      ]
    },
    links: [
      {
        from: ['app1', 'svc1'],
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
  })

  deepStrictEqual(cluster.appsByElu, [
    cluster.getApp('app2'),
    cluster.getApp('app1')
  ], 'sorts by elu')
})

test('Cluster#servicesByLatency', () => {
  const cluster = Cluster.from({
    applications: {
      app1: [
        {
          name: 'svc1',
          type: 'service',
          costs: {
            cpu: 10,
            heap: 11,
            loop: 12
          }
        },
        {
          name: 'svc2',
          type: 'service',
          costs: {
            cpu: 5,
            heap: 6,
            loop: 7
          }
        }
      ],
      app2: [
        {
          name: 'svc3',
          type: 'service',
          costs: {
            cpu: 30,
            heap: 31,
            loop: 32
          }
        }
      ]
    },
    links: [
      {
        from: ['app1', 'svc1'],
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
  })

  deepStrictEqual(cluster.servicesByLatency, [
    cluster.getApp('app2').getService('svc3'),
    cluster.getApp('app1').getService('svc1'),
    cluster.getApp('app1').getService('svc2')
  ], 'sorts by latency')
})

test('Cluster#mostRoomApp', () => {
  const cluster = Cluster.from({
    applications: {
      app1: [
        {
          name: 'svc1',
          type: 'service',
          costs: {
            cpu: 10,
            heap: 11,
            loop: 12
          }
        },
        {
          name: 'svc2',
          type: 'service',
          costs: {
            cpu: 5,
            heap: 6,
            loop: 7
          }
        }
      ],
      app2: [
        {
          name: 'svc3',
          type: 'service',
          costs: {
            cpu: 30,
            heap: 31,
            loop: 32
          }
        }
      ]
    },
    links: [
      {
        from: ['app1', 'svc1'],
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
  })

  strictEqual(
    cluster.mostRoomApp,
    cluster.getApp('app2'),
    'returns app with most room'
  )
})

test('Cluster#apps', () => {
  const cluster = new Cluster(budgets, composerCosts, logger)
  const app1 = cluster.createApp('app1')
  const app2 = cluster.createApp('app2')
  deepStrictEqual(cluster.apps, [app1, app2])
})

test('Cluster#services', () => {
  const cluster = new Cluster(budgets, composerCosts, logger)
  const app1 = cluster.createApp('app1')
  const svc1 = app1.createService('svc1', 'service', composerCosts)
  const svc2 = app1.createService('svc2', 'service', composerCosts)
  const app2 = cluster.createApp('app2')
  const svc3 = app2.createService('svc3', 'service', composerCosts)
  deepStrictEqual(cluster.services, [app1.composer, svc1, svc2, app2.composer, svc3])
})

test('Cluster#averageServiceCosts', () => {
  const cluster = new Cluster(budgets, composerCosts, logger)
  const app1 = cluster.createApp('app1')
  app1.createService('svc1', 'service', { cpu: 10, heap: 11, loop: 12 })
  app1.createService('svc2', 'service', { cpu: 20, heap: 21, loop: 22 })
  const app2 = cluster.createApp('app2')
  app2.createService('svc3', 'service', { cpu: 30, heap: 31, loop: 32 })
  deepStrictEqual(cluster.averageServiceCosts, {
    cpu: 20,
    heap: 21,
    loop: 22
  })

  doesNotThrow(() => {
    const cluster = new Cluster(budgets, composerCosts, logger)
    cluster.averageServiceCosts
  })
})

test('Cluster#splitLinks', () => {
  const cluster = new Cluster(budgets, composerCosts, logger)
  const app1 = cluster.createApp('app1')
  const svc1 = app1.createService('svc1', 'service', composerCosts)
  const app2 = cluster.createApp('app1')
  const svc2 = app2.createService('svc2', 'service', composerCosts)

  const linkCost = LinkCost.from({ count: 12, average: 34 })
  const splitCost = LinkCost.from({ count: 6, average: 34 })

  svc1.linkTo(svc2, linkCost)
  const svc3 = app2.createService('svc2-split', 'service', composerCosts)

  deepStrictEqual(cluster.splitLinks([svc2, svc3], svc2.links), [
    [new ServiceLink([svc2, svc1], splitCost)],
    [new ServiceLink([svc3, svc1], splitCost)]
  ])
})

test('Cluster#duplicateCostlyServices', () => {
  const cluster = Cluster.from({
    applications: {
      app1: [
        {
          name: 'svc1',
          type: 'service',
          costs: {
            cpu: 10,
            heap: 10,
            loop: 10
          }
        },
        {
          name: 'svc2',
          type: 'service',
          costs: {
            cpu: 20,
            heap: 10,
            loop: 10
          }
        }
      ],
      app2: [
        {
          name: 'svc3',
          type: 'service',
          costs: {
            cpu: 10,
            heap: 10,
            loop: 10
          }
        }
      ]
    },
    links: [],
    budgets: {
      cpu: { min: 0, max: 25 },
      heap: { min: 0, max: 25 },
      loop: { min: 0, max: 25 }
    },
    composerCosts
  })

  const steps: OptimizationStep[] = []
  cluster.duplicateCostlyServices(steps)

  matchSteps(steps, [
    // svc2 is above average cost, so it gets duplicated
    /Duplicate service "app1:svc2" to "app1:svc2-dupe-\d+"/
  ])
})

test('Cluster#shrinkOversizeApps', async (t) => {
  await t.test('split until not longer oversized', () => {
    const cluster = Cluster.from({
      applications: {
        app1: [
          {
            name: 'svc1',
            type: 'service',
            costs: {
              cpu: 10,
              heap: 10,
              loop: 10
            }
          },
          {
            name: 'svc2',
            type: 'service',
            costs: {
              cpu: 10,
              heap: 10,
              loop: 10
            }
          }
        ]
      },
      links: [],
      budgets: {
        cpu: { min: 0, max: 15 },
        heap: { min: 0, max: 15 },
        loop: { min: 0, max: 15 }
      },
      composerCosts
    })

    const steps: OptimizationStep[] = []
    cluster.shrinkOversizeApps(steps)

    matchSteps(steps, [
      // app 1 is over-budget so a copy is created
      /Create a new application "app1-reassigned-\d+"/,
      // svc1 is now the highest-cost service so gets moved to new app
      /Move service "svc1" from application "app1" to "app1-reassigned-\d+"/
    ])
  })

  await t.test('do not move services that would not fit in the destination either', () => {
    const cluster = Cluster.from({
      applications: {
        app1: [
          {
            name: 'composer',
            type: 'composer',
            costs: {
              cpu: 2,
              heap: 2,
              loop: 2
            }
          },
          {
            name: 'svc1',
            type: 'service',
            costs: {
              cpu: 10,
              heap: 10,
              loop: 10
            }
          },
          {
            name: 'svc2',
            type: 'service',
            costs: {
              cpu: 10,
              heap: 10,
              loop: 10
            }
          }
        ]
      },
      links: [],
      budgets: {
        cpu: { min: 0, max: 11 },
        heap: { min: 0, max: 11 },
        loop: { min: 0, max: 11 }
      },
      composerCosts: {
        cpu: 1,
        heap: 1,
        loop: 1
      }
    })

    const steps: OptimizationStep[] = []
    cluster.shrinkOversizeApps(steps)

    // Verify that app1 does not get removed
    ok(cluster.apps.map(app => app.name).includes('app1'))

    matchSteps(steps, [
      // app 1 is over-budget so a copy is created
      /Create a new application "app1-reassigned-\d+"/,
      // svc1 is now the highest-cost service so gets moved to new app
      /Move service "svc1" from application "app1" to "app1-reassigned-\d+"/
    ])
  })
})

test('Cluster#mergeSmallApps', () => {
  const cluster = Cluster.from({
    applications: {
      app1: [
        {
          name: 'svc1',
          type: 'service',
          costs: {
            cpu: 100,
            heap: 100,
            loop: 100
          }
        }
      ],
      app2: [
        {
          name: 'svc2',
          type: 'service',
          costs: {
            cpu: 101,
            heap: 101,
            loop: 101
          }
        }
      ],
      app3: [
        {
          name: 'svc3',
          type: 'service',
          costs: {
            cpu: 102,
            heap: 102,
            loop: 102
          }
        }
      ]
    },
    links: [],
    budgets: {
      cpu: { min: 0, max: 500 },
      heap: { min: 0, max: 500 },
      loop: { min: 0, max: 500 }
    },
    composerCosts
  })

  const steps: OptimizationStep[] = []
  cluster.mergeSmallApps(steps)

  matchSteps(steps, [
    'Move service "svc1" from application "app1" to "app2"',
    'Delete application "app1"',
    'Move service "svc3" from application "app3" to "app2"',
    'Delete application "app3"'
  ])
})

test('Cluster#optimizeLinkCosts', () => {
  const cluster = Cluster.from({
    applications: {
      app1: [
        {
          name: 'svc1',
          type: 'service',
          costs: {
            cpu: 10,
            heap: 10,
            loop: 10
          }
        },
        {
          name: 'svc2',
          type: 'service',
          costs: {
            cpu: 10,
            heap: 10,
            loop: 10
          }
        }
      ],
      app2: [
        {
          name: 'svc3',
          type: 'service',
          costs: {
            cpu: 10,
            heap: 10,
            loop: 10
          }
        },
        {
          name: 'svc4',
          type: 'service',
          costs: {
            cpu: 10,
            heap: 10,
            loop: 10
          }
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
  })

  const steps: OptimizationStep[] = []
  cluster.optimizeLinkCosts(steps)

  matchSteps(steps, [
    'Move service "svc1" from application "app1" to "app2"',
    'Move service "svc4" from application "app2" to "app1"'
  ])
})

test('Cluster#optimize', async (t) => {
  await t.test('calls stages in expected order', () => {
    const cluster = new Cluster(budgets, composerCosts, logger)
    const calls: string[] = []

    const steps = [
      'duplicateCostlyServices',
      'mergeSmallApps',
      'shrinkOversizeApps',
      'optimizeLinkCosts'
    ]

    for (const step of steps) {
      (cluster as any)[step] = (): OptimizationStep[] => {
        calls.push(step)
        return []
      }
    }

    cluster.optimize()
    deepStrictEqual(calls, steps)
  })

  await t.test('complex cluster optimization', () => {
    const cluster = Cluster.from({
      applications: {
        gateway: [
          {
            name: 'api',
            type: 'service',
            costs: {
              cpu: 7,
              heap: 150,
              loop: 15
            }
          },
          {
            name: 'ui',
            type: 'service',
            costs: {
              cpu: 20,
              heap: 230,
              loop: 50
            }
          }
        ],
        frontend: [
          {
            name: 'dashboard-ssr',
            type: 'service',
            costs: {
              cpu: 34,
              heap: 740,
              loop: 120
            }
          },
          {
            name: 'static-serve',
            type: 'service',
            costs: {
              cpu: 10,
              heap: 200,
              loop: 80
            }
          },
          {
            name: 'admin-ssr',
            type: 'service',
            costs: {
              cpu: 40,
              heap: 800,
              loop: 150
            }
          }
        ],
        users: [
          {
            name: 'auth',
            type: 'service',
            costs: {
              cpu: 5,
              heap: 100,
              loop: 10
            }
          },
          {
            name: 'account',
            type: 'service',
            costs: {
              cpu: 10,
              heap: 200,
              loop: 20
            }
          }
        ],
        emails: [
          {
            name: 'signup',
            type: 'service',
            costs: {
              cpu: 5,
              heap: 100,
              loop: 10
            }
          },
          {
            name: 'password-reset',
            type: 'service',
            costs: {
              cpu: 2,
              heap: 94,
              loop: 10
            }
          },
          {
            name: 'newsletter',
            type: 'service',
            costs: {
              cpu: 3,
              heap: 70,
              loop: 10
            }
          }
        ]
      },
      links: [
        {
          from: ['gateway', 'api'],
          to: ['users', 'auth'],
          count: 1723,
          average: 8724
        },
        {
          from: ['gateway', 'api'],
          to: ['users', 'account'],
          count: 340,
          average: 13294
        },
        {
          from: ['gateway', 'ui'],
          to: ['frontend', 'dashboard-ssr'],
          count: 2452,
          average: 28954
        },
        {
          from: ['gateway', 'ui'],
          to: ['frontend', 'static-serve'],
          count: 3754,
          average: 11842
        },
        {
          from: ['gateway', 'ui'],
          to: ['frontend', 'admin-ssr'],
          count: 1234,
          average: 23452
        },
        {
          from: ['users', 'auth'],
          to: ['emails', 'signup'],
          count: 1234,
          average: 9345
        },
        {
          from: ['users', 'auth'],
          to: ['emails', 'password-reset'],
          count: 430,
          average: 2345
        },
        {
          from: ['users', 'account'],
          to: ['emails', 'newsletter'],
          count: 50,
          average: 17574
        },
        {
          from: ['users', 'account'],
          to: ['users', 'auth'],
          count: 563,
          average: 4345
        }
      ],
      budgets: {
        cpu: { min: 50, max: 400 },
        heap: { min: 256, max: 4096 },
        loop: { min: 0, max: 500 }
      },
      composerCosts: {
        cpu: 5,
        heap: 100,
        loop: 7
      }
    })

    cluster.optimize()

    matchSteps(cluster.steps, [
      // duplicateCostlyServices
      'Duplicate service "gateway:ui" to "frontend:ui-dupe-1"',
      'Duplicate service "frontend:dashboard-ssr" to "frontend:dashboard-ssr-dupe-2"',
      'Duplicate service "frontend:dashboard-ssr" to "frontend:dashboard-ssr-dupe-3"',
      'Duplicate service "frontend:static-serve" to "frontend:static-serve-dupe-4"',
      'Duplicate service "frontend:admin-ssr" to "frontend:admin-ssr-dupe-5"',
      'Duplicate service "frontend:admin-ssr" to "frontend:admin-ssr-dupe-6"',
      // mergeSmallApps
      'Move service "auth" from application "users" to "emails"',
      'Move service "account" from application "users" to "emails"',
      'Delete application "users"',
      'Move service "signup" from application "emails" to "gateway"',
      'Move service "password-reset" from application "emails" to "gateway"',
      'Move service "newsletter" from application "emails" to "gateway"',
      'Move service "auth" from application "emails" to "gateway"',
      'Move service "account" from application "emails" to "gateway"',
      'Delete application "emails"',
      // shrinkOversizeApps
      'Create a new application "frontend-reassigned-7"',
      'Move service "ui-dupe-1" from application "frontend" to "frontend-reassigned-7"',
      'Move service "admin-ssr" from application "frontend" to "frontend-reassigned-7"',
      'Move service "admin-ssr-dupe-5" from application "frontend" to "frontend-reassigned-7"',
      // optimizeLinkCosts
      'Move service "admin-ssr-dupe-6" from application "frontend" to "gateway"',
      'Move service "ui" from application "gateway" to "frontend"',
      'Move service "admin-ssr-dupe-6" from application "gateway" to "frontend-reassigned-7"',
      'Move service "ui-dupe-1" from application "frontend-reassigned-7" to "gateway"',
      'Move service "admin-ssr-dupe-5" from application "frontend-reassigned-7" to "frontend"',
      'Move service "ui" from application "frontend" to "frontend-reassigned-7"',
      'Move service "admin-ssr-dupe-5" from application "frontend" to "gateway"',
      'Move service "ui-dupe-1" from application "gateway" to "frontend"',
      'Move service "admin-ssr" from application "frontend-reassigned-7" to "frontend"',
      'Move service "ui-dupe-1" from application "frontend" to "frontend-reassigned-7"'
    ])
  })
})

function zip<A, B> (a: A[], b: B[]): [A, B][] {
  return a.map((k, i) => [k, b[i]])
}

function matchSteps (steps: OptimizationStep[], checks: (string | RegExp)[]) {
  strictEqual(steps.length, checks.length)

  for (const [step, check] of zip(steps, checks)) {
    const { message } = step

    if (check instanceof RegExp) {
      match(message, check)
    } else {
      strictEqual(message, check)
    }
  }
}
