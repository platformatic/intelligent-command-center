import React from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import { getFormattedTimeAndDate } from '~/utilities/dates'
import StatusPill from '../../common/StatusPill'
function TableDeployments ({
  deployments = [],
  withApplicationName = false
}) {
  const columns = [
    {
      label: 'Deployment Id',
      key: 'id'
    }
  ]
  if (withApplicationName) {
    columns.push({
      label: 'Application Name',
      key: 'applicationName'
    })
  }
  columns.push({
    label: 'Deployed on (GMT)',
    key: 'createdAt'
  })
  columns.push({
    label: 'Image Id',
    key: 'imageId'
  })
  columns.push({
    label: 'Status',
    key: 'status'
  })

  function renderColumn (column, deployment) {
    switch (column.key) {
      case 'id':
      case 'imageId':
        return <td key={column.key} className={typographyStyles.terminal}>{deployment[column.key]}</td>
      case 'status':
        return <td key={column.key}><StatusPill status={deployment[column.key]} /></td>
      case 'createdAt':
        return <td key={column.key}>{getFormattedTimeAndDate(deployment[column.key])}</td>
      default:
        return <td key={column.key}>{deployment[column.key]}</td>
    }
  }
  return (
    <table>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {deployments.map((deployment) => (
          <tr key={deployment.id}>
            {columns.map((column) => (
              renderColumn(column, deployment)
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default TableDeployments
