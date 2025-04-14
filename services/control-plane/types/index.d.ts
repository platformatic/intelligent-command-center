import { Application } from './Application'
import { ApplicationState } from './ApplicationState'
import { ApplicationsConfig } from './ApplicationsConfig'
import { Deployment } from './Deployment'
import { DetectedPod } from './DetectedPod'
import { Generation } from './Generation'
import { GenerationsApplicationsConfig } from './GenerationsApplicationsConfig'
import { GenerationsDeployment } from './GenerationsDeployment'
import { Graph } from './Graph'
  
interface EntityTypes  {
  Application: Application
    ApplicationState: ApplicationState
    ApplicationsConfig: ApplicationsConfig
    Deployment: Deployment
    DetectedPod: DetectedPod
    Generation: Generation
    GenerationsApplicationsConfig: GenerationsApplicationsConfig
    GenerationsDeployment: GenerationsDeployment
    Graph: Graph
}
  
export { EntityTypes, Application, ApplicationState, ApplicationsConfig, Deployment, DetectedPod, Generation, GenerationsApplicationsConfig, GenerationsDeployment, Graph }