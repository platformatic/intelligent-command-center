/// <reference path="../global.d.ts" />
'use strict'

const { UnknownRuleError } = require('../lib/errors.js')
const allLocalRules = require('../rules/index.js')
/** @param {import('fastify').FastifyInstance} app */
module.exports = async function (app) {
  app.post('/rules/:name', {
    schema: {
      body: {
        type: 'object',
        properties: {
          applicationId: { type: 'string' },
          enabled: { type: 'boolean' },
          options: { type: 'object' }
        }
      }
    }
  }, async (req, res) => {
    const { name } = req.params
    const { applicationId, options } = req.body

    let ruleType = 'global'
    if (applicationId) {
      ruleType = 'local'
    }

    // Checks rule name is valid before store its configs
    if (allLocalRules[name] === undefined) {
      throw new UnknownRuleError(name)
    }

    const ruleDefinitionClass = allLocalRules[name]
    // eslint-disable-next-line new-cap
    const ruleDefinitionInstance = new ruleDefinitionClass()

    let ruleId = ''

    // finds the rule in DB
    const savedRule = await app.platformatic.entities.rule.find({
      where: {
        name: { eq: name }
      }
    })
    if (savedRule.length > 0) {
      ruleId = savedRule[0].id
    } else {
      // stores the rule
      const newRule = await app.platformatic.entities.rule.save({
        input: {
          label: ruleDefinitionInstance.label,
          name: ruleDefinitionInstance.name,
          description: ruleDefinitionInstance.description,
          config: ruleDefinitionInstance.config
        }
      })
      ruleId = newRule.id
    }
    // set enabled = true by default for new rules
    const enabled = (req.body.enabled === undefined || req.body.enabled === null)
      ? true
      : req.body.enabled

    // store/update rule config
    const whereClause = {
      ruleId: { eq: ruleId },
      type: { eq: 'global' }
    }
    if (applicationId) {
      whereClause.applicationId = { eq: applicationId }
      whereClause.type = { eq: 'local' }
    }
    const savedRuleConfig = await app.platformatic.entities.ruleConfig.find({
      where: whereClause
    })

    if (savedRuleConfig.length > 0) {
      const input = { ...savedRuleConfig[0] }
      // update fields if needed
      if (options) {
        input.options = options
      }
      if ((enabled !== null && enabled !== undefined) && input.enabled !== enabled) {
        input.enabled = enabled
      }
      await app.platformatic.entities.ruleConfig.save({
        input
      })
    } else {
      // store new rule config
      await app.platformatic.entities.ruleConfig.save({
        input: {
          ruleId,
          type: ruleType,
          applicationId: applicationId ?? null,
          options: options ?? {},
          enabled
        }
      })
    }
    const allConfigs = await app.platformatic.entities.ruleConfig.find({
      where: {
        ruleId: { eq: ruleId }
      },
      orderBy: [{
        field: 'createdAt',
        direction: 'asc'
      }
      ]
    })
    return {
      id: ruleId,
      name: ruleDefinitionInstance.name,
      description: ruleDefinitionInstance.description,
      options: ruleDefinitionInstance.config,
      configs: allConfigs
    }
  })

  app.get('/rules', async (req, res) => {
    const output = []
    const allRules = await app.platformatic.entities.rule.find()
    for (let i = 0; i < allRules.length; i++) {
      const rule = allRules[i]
      const allConfigs = await app.platformatic.entities.ruleConfig.find({
        where: {
          ruleId: { eq: rule.id }
        },
        orderBy: [{
          field: 'createdAt',
          direction: 'asc'
        }
        ]
      })

      output.push({
        ...rule,
        configs: allConfigs
      })
    }
    return output
  })
}
