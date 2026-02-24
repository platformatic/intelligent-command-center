import { Application } from './Application'
import { ApplicationState } from './ApplicationState'
import { ApplicationsConfig } from './ApplicationsConfig'
import { Deployment } from './Deployment'
import { Generation } from './Generation'
import { GenerationsApplicationsConfig } from './GenerationsApplicationsConfig'
import { GenerationsDeployment } from './GenerationsDeployment'
import { Graph } from './Graph'
import { Instance } from './Instance'
import { ValkeyUser } from './ValkeyUser'
import { VersionRegistry } from './VersionRegistry'
  
interface EntityTypes  {
  Application: Application
    ApplicationState: ApplicationState
    ApplicationsConfig: ApplicationsConfig
    Deployment: Deployment
    Generation: Generation
    GenerationsApplicationsConfig: GenerationsApplicationsConfig
    GenerationsDeployment: GenerationsDeployment
    Graph: Graph
    Instance: Instance
    ValkeyUser: ValkeyUser
    VersionRegistry: VersionRegistry
}
  
export { EntityTypes, Application, ApplicationState, ApplicationsConfig, Deployment, Generation, GenerationsApplicationsConfig, GenerationsDeployment, Graph, Instance, ValkeyUser, VersionRegistry }