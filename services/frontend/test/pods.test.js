import { test } from 'node:test'
import assert from 'node:assert'
import { groupFilteredPods } from '../src/utilities/pods.js'

test('return elements 1 row', async () => {
  const expected = [[
    {
      id: 'plt-daa43957-mock-instance-id-1',
      applicationId: '6ceee4f9-5864-4da6-a0c3-d59785e87230',
      taxonomyId: '00000000-0000-0000-0000-000000000000'
    },
    {
      id: 'plt-daa43957-mock-instance-id-2',
      applicationId: '6ceee4f9-5864-4da6-a0c3-d59785e87230',
      taxonomyId: '00000000-0000-0000-0000-000000000000'
    },
    {
      id: 'plt-daa43957-mock-instance-id-3',
      applicationId: '6ceee4f9-5864-4da6-a0c3-d59785e87230',
      taxonomyId: '00000000-0000-0000-0000-000000000000'
    },
    {
      id: 'plt-daa43957-mock-instance-id-4',
      applicationId: '6ceee4f9-5864-4da6-a0c3-d59785e87230',
      taxonomyId: '00000000-0000-0000-0000-000000000000'
    }, {
      id: 'plt-daa43957-mock-instance-id-4-clone-4',
      fillingType: true
    }]]

  const result = groupFilteredPods([
    {
      id: 'plt-daa43957-mock-instance-id-1',
      applicationId: '6ceee4f9-5864-4da6-a0c3-d59785e87230',
      taxonomyId: '00000000-0000-0000-0000-000000000000'
    },
    {
      id: 'plt-daa43957-mock-instance-id-2',
      applicationId: '6ceee4f9-5864-4da6-a0c3-d59785e87230',
      taxonomyId: '00000000-0000-0000-0000-000000000000'
    },
    {
      id: 'plt-daa43957-mock-instance-id-3',
      applicationId: '6ceee4f9-5864-4da6-a0c3-d59785e87230',
      taxonomyId: '00000000-0000-0000-0000-000000000000'
    },
    {
      id: 'plt-daa43957-mock-instance-id-4',
      applicationId: '6ceee4f9-5864-4da6-a0c3-d59785e87230',
      taxonomyId: '00000000-0000-0000-0000-000000000000'
    }], 5)

  assert.deepEqual(result, expected)
})

test('return empty', async () => {
  const output = groupFilteredPods([], 5)
  assert.deepEqual(output, [])
})
