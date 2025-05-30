const paths = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    dumped_at: { type: 'string' },
    counter: { type: 'integer' },
    exported_at: { type: ['string', 'null'] },
    imported_at: { type: ['string', 'null'] }
  },
  required: ['path', 'counter', 'dumped_at'],
  additionalProperties: false
}

// eslint-disable-next-line camelcase
const db_operations = {
  type: 'object',
  properties: {
    db_id: { type: 'string' },
    db_system: { type: 'string' },
    db_name: { type: 'string' },
    host: { type: ['string', 'null'] },
    port: { type: ['integer', 'null'] },
    tables: { type: 'array', items: { type: 'string' } },
    columns: { type: 'array', items: { type: 'string' } },
    query_type: { type: 'string' },
    target_table: { type: ['string', 'null'] },
    paths: { type: 'array', items: { type: 'string' } },
    dumped_at: { type: 'string' }
  },
  required: ['db_id', 'tables', 'columns', 'query_type', 'paths'],
  additionalProperties: false
}

const latencies = {
  type: 'object',
  properties: {
    service_from: { type: ['string', 'null'] },
    service_to: { type: 'string' },
    mean: { type: 'integer' },
    count: { type: 'integer' },
    dumped_at: { type: 'string' },
    exported_at: { type: ['string', 'null'] },
    imported_at: { type: ['string', 'null'] }
  },
  required: ['service_to', 'mean', 'count', 'dumped_at'],
  additionalProperties: false
}

module.exports = {
  paths,
  // eslint-disable-next-line camelcase
  db_operations,
  latencies
}
