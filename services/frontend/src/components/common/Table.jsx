import React from 'react'

export default function Table ({ data, columns }) {
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
        {data.map((row) => (
          <tr key={row.id}>
            {columns.map((column) => (
              <td key={column.key}>{column.render ? column.render(row, row[column.key]) : row[column.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
