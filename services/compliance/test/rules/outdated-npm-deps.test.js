'use strict'

const assert = require('node:assert')
const { test } = require('node:test')
const OutdatedNpmDeps = require('../../rules/outdated-npm-deps')
const { startNpmMock } = require('../helper')

test('should check application npm dependencies', async (t) => {
  const mockClient = await startNpmMock(t, [
    {
      packageName: '@foo/bar-1',
      packageVersions: ['0.2.3', '0.2.42', '1.1.1', '1.2.2', '1.2.3']
    },
    {
      packageName: '@foo/bar-2',
      packageVersions: ['0.2.43', '1.1.1', '1.2.2', '1.2.3']
    },
    {
      packageName: '@foo/bar-3',
      packageVersions: ['0.2.44', '1.1.1', '1.2.2', '1.2.3']
    },
    {
      packageName: '@foo/bar-4',
      packageVersions: ['0.2.45', '1.1.1', '1.2.0', '2.1.0']
    }
  ])

  const rule = new OutdatedNpmDeps({ dispatcher: mockClient })

  const npmDependencies = {
    runtime: {
      current: {
        '@foo/bar-1': '1.2.3',
        '@foo/bar-2': '1.2.2',
        '@foo/bar-3': '1.2.3',
        '@foo/bar-4': '1.2.0'
      },
      dependencies: {
        '@foo/bar-1': '1.2.3',
        '@foo/bar-2': '^1.0.0',
        '@foo/bar-3': '^1.2.0',
        '@foo/bar-4': '^1.2.0'
      }
    },
    services: {
      service1: {
        current: {
          '@foo/bar-1': '0.2.3',
          '@foo/bar-2': '0.2.2',
          '@foo/bar-3': '0.2.3',
          '@foo/bar-4': '0.2.0'
        },
        dependencies: {
          '@foo/bar-1': '0.2.3',
          '@foo/bar-2': '~0.2.1',
          '@foo/bar-3': '^0.2.0',
          '@foo/bar-4': '^0.2.33'
        }
      }
    }
  }

  const output = await rule.run({ npmDependencies })
  assert.deepStrictEqual(output, {
    compliant: false,
    details: {
      runtime: {
        '@foo/bar-1': { current: '1.2.3', wanted: '1.2.3', outdated: false },
        '@foo/bar-2': { current: '1.2.2', wanted: '1.2.3', outdated: true },
        '@foo/bar-3': { current: '1.2.3', wanted: '1.2.3', outdated: false },
        '@foo/bar-4': { current: '1.2.0', wanted: '1.2.0', outdated: false }
      },
      services: {
        service1: {
          '@foo/bar-1': { current: '0.2.3', wanted: '0.2.3', outdated: false },
          '@foo/bar-2': { current: '0.2.2', wanted: '0.2.43', outdated: true },
          '@foo/bar-3': { current: '0.2.3', wanted: '0.2.44', outdated: true },
          '@foo/bar-4': { current: '0.2.0', wanted: '0.2.45', outdated: true }
        }
      }
    }
  })
})
