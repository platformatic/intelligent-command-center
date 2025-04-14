import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getICCServices } from '../services/main/lib/utils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const servicesDir = join(__dirname, '..', 'services')

async function getAllServices () {

}
async function readPackageJson (serviceName) {

}

async function getAllPlatformaticDependencies (packageJsonData) {
  const deps = packageJsonData.dependencies
  const devDeps = packageJsonData.devDependencies
}
async function readPlatformaticConfig (serviceName) {

}
async function main () {
  const services = await getICCServices()
  console.log(services)
}

main()
