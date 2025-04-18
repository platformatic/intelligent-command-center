import { test } from 'node:test'
import assert from 'node:assert'
import { getGroupedTaxonomyGeneration } from '../src/utilities/taxonomy.js'

test('return elements', async () => {
  const expected = {
    today: [{
      label: 'Jan 03, 2025',
      elements: [{
        label: '08:52 AM',
        id: '11'
      }]
    }],
    'May 2024': [{
      label: 'May 20, 2024',
      elements: [{
        label: '11:52 AM',
        id: '0'
      }, {
        label: '10:52 AM',
        id: '1'
      }, {
        label: '09:52 AM',
        id: '2'
      }]
    }, {
      label: 'May 19, 2024',
      elements: [{
        label: '09:52 AM',
        id: '3'
      }, {
        label: '11:00 AM',
        id: '4'
      }]
    }, {
      label: 'May 17, 2024',
      elements: [{
        label: '09:52 AM',
        id: '5'
      }]
    }],
    'Apr 2024': [{
      label: 'Apr 20, 2024',
      elements: [{
        label: '09:52 AM',
        id: '6'
      }]
    }],
    'Mar 2024': [{
      label: 'Mar 20, 2024',
      elements: [{
        label: '09:52 AM',
        id: '7'
      }]
    }],
    'Feb 2024': [{
      label: 'Feb 20, 2024',
      elements: [{
        label: '09:52 AM',
        id: '8'
      }]
    }],
    'Jan 2024': [{
      label: 'Jan 20, 2024',
      elements: [{
        label: '09:52 AM',
        id: '9'
      }]
    }],
    'Dec 2023': [{
      label: 'Dec 20, 2023',
      elements: [{
        label: '09:52 AM',
        id: '10'
      }]
    }]
  }
  const output = getGroupedTaxonomyGeneration([{
    id: '0',
    createdAt: '2024-05-20T11:52:57.858Z'
  }, {
    id: '1',
    createdAt: '2024-05-20T10:52:57.858Z'
  }, {
    id: '2',
    createdAt: '2024-05-20T09:52:57.858Z'
  }, {
    id: '3',
    createdAt: '2024-05-19T09:52:57.858Z'
  }, {
    id: '4',
    createdAt: '2024-05-19T11:00:57.858Z'
  }, {
    id: '5',
    createdAt: '2024-05-17T09:52:57.858Z'
  }, {
    id: '6',
    createdAt: '2024-04-20T09:52:57.858Z'
  }, {
    id: '7',
    createdAt: '2024-03-20T09:52:57.858Z'
  }, {
    id: '8',
    createdAt: '2024-02-20T09:52:57.858Z'
  }, {
    id: '9',
    createdAt: '2024-01-20T09:52:57.858Z'
  }, {
    id: '10',
    createdAt: '2023-12-20T09:52:57.858Z'
  }, {
    id: '11',
    createdAt: '2025-01-03T08:52:57.858Z'
  }], new Date('2025-01-03T11:52:57.858Z'))

  assert.deepEqual(output, expected)
})

test('return empty', async () => {
  assert.deepEqual(getGroupedTaxonomyGeneration([]), {})
})
