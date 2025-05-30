'use strict'

const { DB } = require('./span-attributes')
const { sqlinspector } = require('@platformatic/sql-inspector')
const { DB_NAMESPACE } = require('../lib/store-namespaces')

const parseDBSpan = async (span) => {
  const dbSystem = span.attributes[DB.DB_SYSTEM] || 'unknown'
  const dbName = span.attributes[DB.DB_NAME] || 'unknown'
  const host = span.attributes[DB.NET_PEER_NAME] || null
  const port = span.attributes[DB.NET_PEER_PORT] || null
  const dbStatement = span.attributes[DB.DB_STATEMENT] || ''
  const impacted = await sqlinspector(dbStatement)

  const { tables, columns, query_type: queryType, target_table: targetTable } = impacted

  return {
    dbSystem,
    host,
    port,
    dbName,
    tables,
    columns,
    queryType,
    targetTable
  }
}

// This is used to store the changes in the DB.
const getDBKey = ({ host = '', port = '0', dbName = '' }) => {
  dbName = encodeURIComponent(dbName)
  const db = `[${host}:${port}:${dbName}]`
  return `${DB_NAMESPACE}${db}`
}

const parseDBKey = (str) => {
  const db = str.substring(DB_NAMESPACE.length)
  let [host, port, dbName] = db.substring(1, db.length - 1).split(':')
  dbName = decodeURIComponent(dbName)
  return { host, port: +port, dbName }
}

module.exports = {
  parseDBSpan,
  getDBKey,
  parseDBKey
}
