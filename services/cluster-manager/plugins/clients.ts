import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerClients } from '../../../lib/clients-plugin.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientsDir = path.resolve(__dirname, '..', '..', '..', 'clients')

export default registerClients([
  { name: 'controlPlane', applicationId: 'control-plane', schema: path.join(clientsDir, 'control-plane/control-plane.openapi.json') },
  { name: 'metrics', applicationId: 'metrics', schema: path.join(clientsDir, 'metrics/metrics.openapi.json') },
  { name: 'riskService', applicationId: 'risk-service', schema: path.join(clientsDir, 'risk-service/risk-service.openapi.json') }
])
