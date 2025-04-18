import { describe, test } from 'node:test'
import assert from 'node:assert'
import {
  getChartForMermaidFromTaxonomy,
  getLinksForTaxonomyGraph,
  getServicesAddedEditedRemoved
} from '../src/utilities/taxonomy.js'

describe('getChartForMermaidFromTaxonomy', () => {
  test('return empty string', async () => {
    assert.equal(getChartForMermaidFromTaxonomy({}), '')
    assert.equal(getChartForMermaidFromTaxonomy({
      id: 'taxonomy-id-1',
      applications: [],
      links: []
    }), '')
  })

  test('return simple chart', async () => {
    const actual = `
    flowchart TB
      subgraph app-1[Application 1]
      click app-1 applicationCallback
      direction TB
      end`
    assert.deepEqual(actual, getChartForMermaidFromTaxonomy({
      id: 'taxonomy-id-1',
      name: 'Taxonomy-name',
      applications: [{
        id: 'app-1',
        name: 'Application 1',
        services: []
      }],
      links: []
    }))
  })

  test('Single Application with only one service', async () => {
    const actual = `
    flowchart TB
      subgraph app-1[Application 1]
      click app-1 applicationCallback
      direction TB
        app-1!autobot(<div class="serviceContainer"><span class="serviceName">autobot</span><span class="serviceTypeInactive">@platformatic/composer</span></div>)
        click app-1!autobot serviceCallback
        class app-1!autobot serviceClassActive
      end`
    assert.deepEqual(getChartForMermaidFromTaxonomy({
      id: 'taxonomy-id-1',
      name: 'Taxonomy-name',
      applications: [{
        id: 'app-1',
        name: 'Application 1',
        services: [{
          id: 'autobot',
          template: '@platformatic/composer',
          outdated: false,
          compliant: true,
          html: '<div class="serviceContainer"><span class="serviceName">autobot</span><span class="serviceTypeInactive">@platformatic/composer</span></div>'
        }]
      }],
      links: []
    }), actual)
  })

  test('Single Application with only one service and entrypoint', async () => {
    const actual = `
    flowchart TB
      subgraph app-1[Application 1]
      click app-1 applicationCallback
      direction TB
        app-1!autobot(<div>html for entrypoint</div>)
        click app-1!autobot serviceCallback
        class app-1!autobot serviceClassActive
      end`
    assert.deepEqual(getChartForMermaidFromTaxonomy({
      id: 'taxonomy-id-1',
      name: 'Taxonomy-name',
      applications: [{
        id: 'app-1',
        name: 'Application 1',
        services: [{
          id: 'autobot',
          entrypoint: true,
          template: '@platformatic/composer',
          outdated: false,
          compliant: true,
          html: '<div>html for entrypoint</div>'
        }]
      }],
      links: []
    }), actual)
  })

  test('Single Application with only one service bud different entrypoint', async () => {
    const actual = `
    flowchart TB
      subgraph app-1[Application 1]
      click app-1 applicationCallback
      direction TB
        app-1!autobot(<div class="serviceContainer"><span class="serviceName">autobot</span><span class="serviceTypeInactive">@platformatic/composer</span></div>)
        click app-1!autobot serviceCallback
        class app-1!autobot serviceClassActive
      end`
    assert.deepEqual(getChartForMermaidFromTaxonomy({
      id: 'taxonomy-id-1',
      name: 'Taxonomy-name',
      applications: [{
        id: 'app-1',
        name: 'Application 1',
        services: [{
          id: 'autobot',
          template: '@platformatic/composer',
          entrypoint: false,
          outdated: false,
          compliant: true,
          html: '<div class="serviceContainer"><span class="serviceName">autobot</span><span class="serviceTypeInactive">@platformatic/composer</span></div>'
        }]
      }],
      links: []
    }), actual)
  })

  test('Single Application with three service unlinked', async () => {
    const actual = `
    flowchart TB
      subgraph app-1[Application 1]
      click app-1 applicationCallback
      direction TB
        app-1!autobot(<div class="serviceContainer"><span class="serviceName">autobot</span><span class="serviceTypeInactive">@platformatic/composer</span></div>)
        click app-1!autobot serviceCallback
        class app-1!autobot serviceClassActive
        app-1!mazinga(<div class="serviceContainerEntrypoint"><div class="entrypointButton"><div class="entrypointIcon"></div></div><span class="serviceName">mazinga</span><span class="serviceTypeInactive">@platformatic/runtime</span></div>)
        click app-1!mazinga serviceCallback
        class app-1!mazinga serviceClassActive
        app-1!megaman(<div class="serviceContainer"><span class="serviceName">megaman</span><span class="serviceTypeInactive">@platformatic/service</span></div>)
        click app-1!megaman serviceCallback
        class app-1!megaman serviceClassActive
      end`
    assert.deepEqual(getChartForMermaidFromTaxonomy({
      id: 'taxonomy-id-1',
      name: 'Taxonomy-name',
      applications: [{
        id: 'app-1',
        name: 'Application 1',
        services: [{
          id: 'autobot',
          template: '@platformatic/composer',
          outdated: false,
          compliant: true,
          html: '<div class="serviceContainer"><span class="serviceName">autobot</span><span class="serviceTypeInactive">@platformatic/composer</span></div>'
        }, {
          id: 'mazinga',
          entrypoint: true,
          template: '@platformatic/runtime',
          outdated: false,
          compliant: true,
          html: '<div class="serviceContainerEntrypoint"><div class="entrypointButton"><div class="entrypointIcon"></div></div><span class="serviceName">mazinga</span><span class="serviceTypeInactive">@platformatic/runtime</span></div>'
        }, {
          id: 'megaman',
          template: '@platformatic/service',
          outdated: false,
          compliant: true,
          html: '<div class="serviceContainer"><span class="serviceName">megaman</span><span class="serviceTypeInactive">@platformatic/service</span></div>'
        }]
      }],
      links: []
    }), actual)
  })

  test('Single Application with five service linked', async () => {
    const actual = `
    flowchart TB
      subgraph app-1[Application Color]
      click app-1 applicationCallback
      direction TB
        app-1!blue(<div class="serviceContainerEntrypoint"><div class="entrypointButton"><div class="entrypointIcon"></div></div><span class="serviceName">blue</span><span class="serviceTypeInactive">@platformatic/composer</span></div>)
        click app-1!blue serviceCallback
        class app-1!blue serviceClassActive
        app-1!black(<div>Black is a stub html</div>)
        click app-1!black serviceCallback
        class app-1!black serviceClassActive
        app-1!yellow(<div class="serviceContainer"><span class="serviceName">yellow</span><span class="serviceTypeInactive">@platformatic/service</span></div>)
        click app-1!yellow serviceCallback
        class app-1!yellow serviceClassActive
        app-1!red(<span>red</span>)
        click app-1!red serviceCallback
        class app-1!red serviceClassActive
        app-1!green()
        click app-1!green serviceCallback
        class app-1!green serviceClassActive
      end
      ingress-controller-taxonomy-id-1 --> app-1!blue
      app-1!blue --> app-1!black
      app-1!yellow --> app-1!red
      linkStyle 2 stroke:#FEB928,stroke-width:1px,stroke-dasharray:6 6
      app-1!red ==> app-1!green
      linkStyle 3 stroke:#21FA90,stroke-width:1px,stroke-dasharray:2 2
      app-1!red -.-> app-1!yellow
      linkStyle 4 stroke:#FEB928,stroke-width:1px,stroke-dasharray:12 12
      app-1!black -.-> app-1!yellow
      linkStyle 5 stroke:#FA2121,stroke-width:1px,stroke-dasharray:12 12`
    assert.deepEqual(getChartForMermaidFromTaxonomy({
      id: 'taxonomy-id-1',
      name: 'Taxonomy-name',
      applications: [{
        id: 'app-1',
        name: 'Application Color',
        services: [{
          entrypoint: true,
          id: 'blue',
          template: '@platformatic/composer',
          outdated: true,
          compliant: true,
          html: '<div class="serviceContainerEntrypoint"><div class="entrypointButton"><div class="entrypointIcon"></div></div><span class="serviceName">blue</span><span class="serviceTypeInactive">@platformatic/composer</span></div>'
        }, {
          id: 'black',
          template: '@platformatic/runtime',
          outdated: false,
          compliant: true,
          html: '<div>Black is a stub html</div>'
        }, {
          id: 'yellow',
          template: '@platformatic/service',
          outdated: false,
          compliant: false,
          html: '<div class="serviceContainer"><span class="serviceName">yellow</span><span class="serviceTypeInactive">@platformatic/service</span></div>'
        }, {
          id: 'red',
          template: '@platformatic/service',
          outdated: false,
          compliant: false,
          html: '<span>red</span>'
        }, {
          id: 'green',
          template: '@platformatic/service',
          outdated: true,
          compliant: false,
          html: ''
        }]
      }],
      links: [{
        applicationSourceId: 'ingress-controller-taxonomy-id-1',
        applicationTargetId: 'app-1',
        source: 'ingress-controller',
        target: 'blue',
        responseTime: 'no_request',
        requestsAmount: 'no_request'
      }, {
        applicationSourceId: 'app-1',
        applicationTargetId: 'app-1',
        source: 'blue',
        target: 'black',
        responseTime: 'no_request',
        requestsAmount: 'no_request'
      }, {
        applicationSourceId: 'app-1',
        applicationTargetId: 'app-1',
        source: 'yellow',
        target: 'red',
        responseTime: 'medium',
        requestsAmount: 'medium'
      }, {
        applicationSourceId: 'app-1',
        applicationTargetId: 'app-1',
        source: 'red',
        target: 'green',
        responseTime: 'fast',
        requestsAmount: 'high'
      }, {
        applicationSourceId: 'app-1',
        applicationTargetId: 'app-1',
        source: 'red',
        target: 'yellow',
        responseTime: 'medium',
        requestsAmount: 'small'
      }, {
        applicationSourceId: 'app-1',
        applicationTargetId: 'app-1',
        source: 'black',
        target: 'yellow',
        responseTime: 'slow',
        requestsAmount: 'small'
      }]
    }), actual)
  })

  test('Double Application with one service each - without ingress controller', async () => {
    const actual = `
    flowchart TB
      subgraph app-1[Application 1]
      click app-1 applicationCallback
      direction TB
        app-1!autobot(<div class="serviceContainerEntrypoint"><div class="entrypointButton"><div class="entrypointIcon"></div></div><span class="serviceName">autobot</span><span class="serviceTypeInactive">@platformatic/composer</span></div>)
        click app-1!autobot serviceCallback
        class app-1!autobot serviceClassActive
      end
      subgraph app-2[Application 2]
      click app-2 applicationCallback
      direction TB
        app-2!megaman(<div class="serviceContainerEntrypoint"><div class="entrypointButton"><div class="entrypointIcon"></div></div><span class="serviceName">megaman</span><span class="serviceTypeInactive">@platformatic/service</span></div>)
        click app-2!megaman serviceCallback
        class app-2!megaman serviceClassActive
      end`
    assert.deepEqual(getChartForMermaidFromTaxonomy({
      id: 'taxonomy-id-1',
      name: 'Taxonomy-name',
      applications: [{
        id: 'app-1',
        name: 'Application 1',
        services: [{
          id: 'autobot',
          entrypoint: true,
          template: '@platformatic/composer',
          html: '<div class="serviceContainerEntrypoint"><div class="entrypointButton"><div class="entrypointIcon"></div></div><span class="serviceName">autobot</span><span class="serviceTypeInactive">@platformatic/composer</span></div>'
        }]
      }, {
        id: 'app-2',
        name: 'Application 2',
        services: [{
          id: 'megaman',
          entrypoint: true,
          template: '@platformatic/service',
          html: '<div class="serviceContainerEntrypoint"><div class="entrypointButton"><div class="entrypointIcon"></div></div><span class="serviceName">megaman</span><span class="serviceTypeInactive">@platformatic/service</span></div>'
        }]
      }],
      links: []
    }), actual)
  })

  test('Double Application with one service each - with ingress controller', async () => {
    const actual = `
    flowchart LR
      ingress-controller-taxonomy-id-1(<div>htmlStub</div>)
      class ingress-controller-taxonomy-id-1 ingressClassActive
      click ingress-controller-taxonomy-id-1 ingressControllerCallback
      subgraph app-1[Application 1]
      click app-1 applicationCallback
      direction TB
        app-1!autobot(<div class="serviceContainerEntrypoint"><div class="entrypointButton"><div class="entrypointIcon"></div></div><span class="serviceName">autobot</span><span class="serviceTypeInactive">@platformatic/composer</span></div>)
        click app-1!autobot serviceCallback
        class app-1!autobot serviceClassActive
      end
      subgraph app-2[Application 2]
      click app-2 applicationCallback
      direction TB
        app-2!megaman(<div class="serviceContainerEntrypoint"><div class="entrypointButton"><div class="entrypointIcon"></div></div><span class="serviceName">megaman</span><span class="serviceTypeInactive">@platformatic/service</span></div>)
        click app-2!megaman serviceCallback
        class app-2!megaman serviceClassActive
      end
      ingress-controller-taxonomy-id-1 --> app-1!autobot
      ingress-controller-taxonomy-id-1 --> app-2!megaman`
    assert.deepEqual(getChartForMermaidFromTaxonomy({
      id: 'taxonomy-id-1',
      name: 'Taxonomy-name',
      html: '<div>htmlStub</div>',
      applications: [{
        id: 'app-1',
        name: 'Application 1',
        services: [{
          entrypoint: true,
          id: 'autobot',
          template: '@platformatic/composer',
          html: '<div class="serviceContainerEntrypoint"><div class="entrypointButton"><div class="entrypointIcon"></div></div><span class="serviceName">autobot</span><span class="serviceTypeInactive">@platformatic/composer</span></div>'
        }]
      }, {
        id: 'app-2',
        name: 'Application 2',
        services: [{
          id: 'megaman',
          entrypoint: true,
          template: '@platformatic/service',
          html: '<div class="serviceContainerEntrypoint"><div class="entrypointButton"><div class="entrypointIcon"></div></div><span class="serviceName">megaman</span><span class="serviceTypeInactive">@platformatic/service</span></div>'
        }]
      }],
      links: [{
        applicationSourceId: 'ingress-controller-taxonomy-id-1',
        applicationTargetId: 'app-1',
        source: 'ingress-controller',
        target: 'autobot',
        responseTime: 'no_response',
        requestsAmount: 'no_response'
      }, {
        applicationSourceId: 'ingress-controller-taxonomy-id-1',
        applicationTargetId: 'app-2',
        source: 'ingress-controller',
        target: 'megaman',
        responseTime: 'no_response',
        requestsAmount: 'no_response'
      }]
    }, true), actual)
  })

  test('Fourth Application with different service - with ingress controller', async () => {
    const actual = `
    flowchart LR
      ingress-controller-taxonomy-id-99(<div>htmlStub2</div>)
      class ingress-controller-taxonomy-id-99 ingressClassActive
      click ingress-controller-taxonomy-id-99 ingressControllerCallback
      subgraph app-1[Colors]
      click app-1 applicationCallback
      direction TB
        app-1!blue(<span>blue</span>)
        click app-1!blue serviceCallback
        class app-1!blue serviceClassActive
        app-1!green(<span>green</span>)
        click app-1!green serviceCallback
        class app-1!green serviceClassActive
        app-1!yellow(<span>yellow</span>)
        click app-1!yellow serviceCallback
        class app-1!yellow serviceClassActive
      end
      subgraph app-2[Animals]
      click app-2 applicationCallback
      direction TB
        app-2!orca(<div class="orcaClass">orca</div>)
        click app-2!orca serviceCallback
        class app-2!orca serviceClassActive
        app-2!bear(<div class="serviceContainerEntrypoint">bear</div>)
        click app-2!bear serviceCallback
        class app-2!bear serviceClassActive
      end
      subgraph app-3[Rocks]
      click app-3 applicationCallback
      direction TB
        app-3!quartz(<div>quartz</div>)
        click app-3!quartz serviceCallback
        class app-3!quartz serviceClassActive
        app-3!emerald(<span>emerald</span>)
        click app-3!emerald serviceCallback
        class app-3!emerald serviceClassActive
      end
      subgraph app-4[Seas]
      click app-4 applicationCallback
      direction TB
        app-4!mediterranean(<span>mediterranean</span>)
        click app-4!mediterranean serviceCallback
        class app-4!mediterranean serviceClassActive
      end
      ingress-controller-taxonomy-id-99 --> app-1!blue
      app-1!blue ==> app-1!green
      linkStyle 1 stroke:#21FA90,stroke-width:1px,stroke-dasharray:2 2
      app-1!blue -.-> app-1!yellow
      linkStyle 2 stroke:#FEB928,stroke-width:1px,stroke-dasharray:12 12
      ingress-controller-taxonomy-id-99 --> app-2!bear
      ingress-controller-taxonomy-id-99 --> app-3!quartz
      app-3!emerald ==> app-3!quartz
      linkStyle 5 stroke:#21FA90,stroke-width:1px,stroke-dasharray:2 2
      ingress-controller-taxonomy-id-99 --> app-4!mediterranean`
    assert.deepEqual(getChartForMermaidFromTaxonomy({
      id: 'taxonomy-id-99',
      name: 'Taxonomy-name',
      html: '<div>htmlStub2</div>',
      applications: [{
        id: 'app-1',
        name: 'Colors',
        services: [{
          id: 'blue',
          entrypoint: true,
          template: '@platformatic/composer',
          outdated: false,
          compliant: false,
          html: '<span>blue</span>'
        }, {
          id: 'green',
          template: '@platformatic/runtime',
          outdated: false,
          compliant: false,
          html: '<span>green</span>'
        }, {
          id: 'yellow',
          template: '@platformatic/service',
          outdated: false,
          compliant: false,
          html: '<span>yellow</span>'
        }]
      }, {
        id: 'app-2',
        name: 'Animals',
        services: [{
          id: 'orca',
          template: '@platformatic/service',
          html: '<div class="orcaClass">orca</div>'
        }, {
          id: 'bear',
          entrypoint: true,
          template: '@platformatic/runtime',
          html: '<div class="serviceContainerEntrypoint">bear</div>'
        }]
      }, {
        id: 'app-3',
        name: 'Rocks',
        services: [{
          entrypoint: true,
          id: 'quartz',
          template: '@platformatic/service',
          html: '<div>quartz</div>'
        }, {
          id: 'emerald',
          template: '@platformatic/runtime',
          html: '<span>emerald</span>'
        }]
      }, {
        id: 'app-4',
        name: 'Seas',
        services: [{
          applicationId: 'app-4',
          id: 'mediterranean',
          entrypoint: true,
          template: '@platformatic/runtime',
          html: '<span>mediterranean</span>'
        }]
      }],
      links: [{
        applicationSourceId: 'ingress-controller-taxonomy-id-99',
        applicationTargetId: 'app-1',
        source: 'ingress-controller',
        target: 'blue',
        responseTime: 'no_response',
        requestsAmount: 'no_response'
      }, {
        applicationSourceId: 'app-1',
        applicationTargetId: 'app-1',
        source: 'blue',
        target: 'green',
        responseTime: 'fast',
        requestsAmount: 'high'
      }, {
        applicationSourceId: 'app-1',
        applicationTargetId: 'app-1',
        source: 'blue',
        target: 'yellow',
        responseTime: 'medium',
        requestsAmount: 'small'
      }, {
        applicationSourceId: 'ingress-controller-taxonomy-id-99',
        applicationTargetId: 'app-2',
        source: 'ingress-controller',
        target: 'bear',
        responseTime: 'no_response',
        requestsAmount: 'no_response'
      }, {
        applicationSourceId: 'ingress-controller-taxonomy-id-99',
        applicationTargetId: 'app-3',
        source: 'ingress-controller',
        target: 'quartz',
        responseTime: 'no_response',
        requestsAmount: 'no_response'
      }, {
        applicationSourceId: 'app-3',
        applicationTargetId: 'app-3',
        source: 'emerald',
        target: 'quartz',
        responseTime: 'fast',
        requestsAmount: 'high'
      }, {
        applicationSourceId: 'ingress-controller-taxonomy-id-99',
        applicationTargetId: 'app-4',
        source: 'ingress-controller',
        target: 'mediterranean',
        responseTime: 'no_response',
        requestsAmount: 'no_response'
      }]
    }, true), actual)
  })
})

describe('getLinksForTaxonomyGraph', () => {
  test('return empty Array', async () => {
    assert.deepEqual(getLinksForTaxonomyGraph(null, null, null), [])
    assert.deepEqual(getLinksForTaxonomyGraph('name', null, null), [])
    assert.deepEqual(getLinksForTaxonomyGraph(null, [], null), [])
    assert.deepEqual(getLinksForTaxonomyGraph(null, null, {}), [])
    assert.deepEqual(getLinksForTaxonomyGraph('name', [], null), [])
    assert.deepEqual(getLinksForTaxonomyGraph('name', [], {}), [])
  })

  test('return service local', async () => {
    const links = [{
      source: {
        applicationId: '1ae6390c-c2d1-40a9-9fd2-c6ed38ba9193',
        serviceId: 'Service-1',
        telemetryId: 'test-app-0-Service-1'
      },
      target: {
        applicationId: '1ae6390c-c2d1-40a9-9fd2-c6ed38ba9193',
        serviceId: 'Service-2',
        telemetryId: 'test-app-0-Service-2',
        url: null
      },
      requestsAmount: 0
    }]

    assert.deepEqual(getLinksForTaxonomyGraph(links, null), [
      {
        source: 'Service-1',
        target: 'Service-2',
        applicationSourceId: '1ae6390c-c2d1-40a9-9fd2-c6ed38ba9193',
        applicationTargetId: '1ae6390c-c2d1-40a9-9fd2-c6ed38ba9193',
        responseTime: 'no_request',
        requestsAmount: 'no_request'
      }
    ])
  })

  test('return empty service for other app, if the entrypoint is null or not valid', async () => {
    const links = [{
      source: {
        applicationId: '1ae6390c-c2d1-40a9-9fd2-c6ed38ba9193',
        serviceId: 'Service-3',
        telemetryId: 'test-app-0-Service-3'
      },
      target: {
        applicationId: 'ebd12272-01e3-4fa5-a533-83c8157239a4',
        serviceId: null,
        telemetryId: '',
        url: null
      },
      requestsAmount: 0
    }]

    assert.deepEqual(getLinksForTaxonomyGraph(links, null), [])
    assert.deepEqual(getLinksForTaxonomyGraph(links, {}), [])
    assert.deepEqual(getLinksForTaxonomyGraph(links, { 'app-test-1': 'service-3' }), [])
  })

  test('return correct service for the other app', async () => {
    const links = [{
      source: {
        applicationId: null,
        serviceId: null,
        telemetryId: 'X'
      },
      target: {
        applicationId: '1ae6390c-c2d1-40a9-9fd2-c6ed38ba9193',
        serviceId: 'Service-1',
        telemetryId: 'test-app-0-Service-3',
        url: null
      }
    }, {
      source: {
        applicationId: '1ae6390c-c2d1-40a9-9fd2-c6ed38ba9193',
        serviceId: 'Service-3',
        telemetryId: 'test-app-0-Service-3'
      },
      target: {
        applicationId: 'ebd12272-01e3-4fa5-a533-83c8157239a4',
        serviceId: null,
        telemetryId: '',
        url: null
      },
      requestsAmount: 0
    }]

    const applications = [{
      id: 'ebd12272-01e3-4fa5-a533-83c8157239a4',
      name: 'test-app-1',
      services: [
        {
          id: 'Service-1',
          type: '@platformatic/composer',
          plugins: [
            {
              name: '@fastify/accepts'
            },
            {
              name: '@fastify/jwt'
            }
          ],
          version: '1.42.0',
          entrypoint: true,
          dependencies: [
            {
              id: 'Service-2',
              local: true,
              applicationId: 'ebd12272-01e3-4fa5-a533-83c8157239a4'
            },
            {
              id: 'Service-3',
              local: true,
              applicationId: 'ebd12272-01e3-4fa5-a533-83c8157239a4'
            }
          ]
        },
        {
          id: 'Service-2',
          type: '@platformatic/service',
          plugins: [
            {
              name: '@fastify/accepts'
            },
            {
              name: '@fastify/jwt'
            }
          ],
          version: '1.42.0',
          entrypoint: false,
          dependencies: [
            {
              id: 'Service-2',
              local: true,
              applicationId: 'ebd12272-01e3-4fa5-a533-83c8157239a4'
            },
            {
              local: false,
              applicationId: '1ae6390c-c2d1-40a9-9fd2-c6ed38ba9193'
            },
            {
              local: false,
              applicationId: 'a2570497-7b14-495a-87e8-3014c6fa7984'
            },
            {
              local: false,
              applicationId: 'fec57263-1e2c-405a-9abf-c5bf3f905db6'
            },
            {
              local: false,
              applicationId: 'f36a756c-c554-4a9c-b64c-1de591b105e6'
            }
          ]
        },
        {
          id: 'Service-3',
          type: '@platformatic/service',
          plugins: [
            {
              name: '@fastify/accepts'
            },
            {
              name: '@fastify/jwt'
            }
          ],
          version: '1.46.0',
          entrypoint: false,
          dependencies: [
            {
              local: false,
              applicationId: '1ae6390c-c2d1-40a9-9fd2-c6ed38ba9193'
            },
            {
              local: false,
              applicationId: 'ebd12272-01e3-4fa5-a533-83c8157239a4'
            },
            {
              local: false,
              applicationId: 'a2570497-7b14-495a-87e8-3014c6fa7984'
            },
            {
              local: false,
              applicationId: 'fec57263-1e2c-405a-9abf-c5bf3f905db6'
            },
            {
              local: false,
              applicationId: 'fcf29587-c597-419c-b0bf-017ce59376e4'
            },
            {
              local: false,
              applicationId: 'bc69006c-afc4-4685-8fb3-9ca6a21700ed'
            }
          ]
        }
      ]
    }]

    assert.deepEqual(getLinksForTaxonomyGraph(links, applications, '0000000000'), [
      {
        source: 'ingress-controller',
        applicationSourceId: 'ingress-controller-0000000000',
        target: 'Service-1',
        applicationTargetId: '1ae6390c-c2d1-40a9-9fd2-c6ed38ba9193',
        responseTime: 'no_request',
        requestsAmount: 'no_request'
      }, {
        source: 'Service-3',
        applicationSourceId: '1ae6390c-c2d1-40a9-9fd2-c6ed38ba9193',
        target: 'Service-1',
        applicationTargetId: 'ebd12272-01e3-4fa5-a533-83c8157239a4',
        responseTime: 'no_request',
        requestsAmount: 'no_request'
      }
    ])
  })
})

describe('getServicesAddedEditedRemoved', () => {
  test('return empty collections of added and removed', async () => {
    const expected = { added: [], removed: [], edited: [] }
    assert.deepEqual(getServicesAddedEditedRemoved(null), expected)
    assert.deepEqual(getServicesAddedEditedRemoved('name'), expected)
    assert.deepEqual(getServicesAddedEditedRemoved([]), expected)
    assert.deepEqual(getServicesAddedEditedRemoved({}), expected)
    assert.deepEqual(getServicesAddedEditedRemoved(), expected)
  })

  test('return diffent values', async () => {
    const applications = [
      {
        id: '2d1a7984-a1a9-4e0b-a6d1-009cffcc147e',
        name: 'test-app-0',
        services: [
          {
            id: 'Service-1',
            type: '@platformatic/composer',
            status: 'unchanged'
          },
          {
            id: 'Service-2',
            type: '@platformatic/service',
            status: 'removed'
          },
          {
            id: 'Service-3',
            type: '@platformatic/service'
          }
        ]
      },
      {
        id: '7b19a8cc-eda4-406b-8c56-c4937a8ee808',
        name: 'test-app-1',
        services: [
          {
            id: 'Service-1',
            type: '@platformatic/composer',
            status: 'added'
          }
        ]
      },
      {
        id: '62b34961-abe6-47f7-bc56-0ec15223f3d2',
        name: 'test-app-2',
        services: [
          {
            id: 'Service-1',
            type: '@platformatic/composer',
            status: 'edited'
          },
          {
            id: 'Service-2',
            type: '@platformatic/service',
            status: 'edited'
          },
          {
            id: 'Service-3',
            type: '@platformatic/service',
            status: 'added'
          },
          {
            id: 'Service-4',
            type: '@platformatic/service',
            status: 'unchanged'

          }
        ]
      }
    ]
    const expected = {
      added: [{
        id: 'Service-1',
        type: '@platformatic/composer',
        applicationId: '7b19a8cc-eda4-406b-8c56-c4937a8ee808',
        applicationName: 'test-app-1',
        status: 'added'
      }, {
        id: 'Service-3',
        type: '@platformatic/service',
        status: 'added',
        applicationId: '62b34961-abe6-47f7-bc56-0ec15223f3d2',
        applicationName: 'test-app-2'
      }],
      removed: [{
        id: 'Service-2',
        type: '@platformatic/service',
        applicationId: '2d1a7984-a1a9-4e0b-a6d1-009cffcc147e',
        applicationName: 'test-app-0',
        status: 'removed'
      }],
      edited: [{
        id: 'Service-1',
        type: '@platformatic/composer',
        status: 'edited',
        applicationId: '62b34961-abe6-47f7-bc56-0ec15223f3d2',
        applicationName: 'test-app-2'
      },
      {
        id: 'Service-2',
        type: '@platformatic/service',
        status: 'edited',
        applicationId: '62b34961-abe6-47f7-bc56-0ec15223f3d2',
        applicationName: 'test-app-2'
      }]
    }
    assert.deepEqual(getServicesAddedEditedRemoved(applications), expected)
  })
})
