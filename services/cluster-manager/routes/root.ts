/// <reference path="../global.d.ts" />
'use strict'

// Budget
const budgetType = (min, max) => ({
  type: 'object',
  default: {},
  additionalProperties: true,
  properties: {
    min: { type: 'number', default: min },
    max: { type: 'number', default: max },
    used: { type: 'number' },
    allocated: { type: 'number' },
    available: { type: 'number' }
  }
})

// BudgetSet
const budgetSetType = {
  type: 'object',
  default: {},
  properties: {
    cpu: budgetType(0, 100),
    heap: budgetType(0, 512),
    loop: budgetType(0, 100)
  }
}

// CostSet
const costSetType = {
  type: 'object',
  properties: {
    cpu: { type: 'number' },
    heap: { type: 'number' },
    loop: { type: 'number' }
  }
}

// ServiceLink
const serviceLinkType = {
  type: 'object',
  properties: {
    from: { type: 'string' },
    to: { type: 'string' },
    count: { type: 'number' },
    average: { type: 'number' }
  }
}

// Service
const serviceType = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    type: { type: 'string' },
    costs: costSetType,
    links: {
      type: 'array',
      items: serviceLinkType
    }
  }
}

// App
const appType = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    budgets: budgetSetType,
    services: {
      type: 'array',
      items: serviceType
    }
  }
}

// OptimizationStep
const optimizationStepType = {
  type: 'object',
  properties: {
    type: { type: 'string' },
    message: { type: 'string' }
  },
  additionalProperties: true
}

// Cluster
const clusterType = {
  type: 'object',
  properties: {
    apps: {
      type: 'array',
      items: appType
    },
    steps: {
      type: 'array',
      items: optimizationStepType
    }
  }
}

// CostSet for composer costs
const composerCostsType = {
  type: 'object',
  default: {},
  properties: {
    cpu: {
      type: 'number',
      default: 5
    },
    heap: {
      type: 'number',
      default: 256
    },
    loop: {
      type: 'number',
      default: 1
    }
  }
}

/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app, opts) {
  app.get('/optimize', {
    schema: {
      operationId: 'optimize',
      params: {
        type: 'object',
        properties: {
          podBudget: budgetSetType,
          composerCosts: composerCostsType
        }
      },
      response: {
        200: clusterType
      }
    },
    handler: async (req) => {
      const { composerCosts, podBudget } = req.params
      const result = await app.optimizeAndRecommend({
        composerCosts,
        podBudget
      }, { req })
      return result
    }
  })
}
