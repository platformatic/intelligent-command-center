import React from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import { getFormattedTimeAndDate } from '~/utilities/dates'
import DeploymentStatusPill from '../detail/deployments/DeploymentStatusPill'
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
      label: 'Watt Name',
      key: 'applicationName'
    })
  }
  columns.push({
    label: 'Deployed on (GMT)',
    key: 'createdAt'
  })
  columns.push({
    label: 'Version',
    key: 'versionLabel'
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
      case 'versionLabel':
        return <td key={column.key}>{deployment[column.key] || '-'}</td>
      case 'status':
        // Prefer the version's skew lifecycle status (active/draining/expired) when
        // the deployment is tied to a registered version: a drained version's pods are
        // scaled to zero, which the raw deployment status reports as 'failed'.
        return <td key={column.key}><DeploymentStatusPill status={deployment.displayStatus ?? deployment[column.key]} /></td>
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
