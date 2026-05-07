import { type FastifyReply, type FastifyPluginAsync } from 'fastify'
import { type GetHeadersOptions, type StatusCode1xx, type StatusCode2xx, type StatusCode3xx, type StatusCode4xx, type StatusCode5xx } from '@platformatic/client'
import { type FormData } from 'undici'

declare namespace controlPlane {
  export type ControlPlane = {
    /**
     * Get deployments.
     *
     * Fetch deployments from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getDeployments(req: GetDeploymentsRequest): Promise<GetDeploymentsResponses>;
    /**
     * Create deployment.
     *
     * Add new deployment to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createDeployment(req: CreateDeploymentRequest): Promise<CreateDeploymentResponses>;
    /**
     * Update deployments.
     *
     * Update one or more deployments in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateDeployments(req: UpdateDeploymentsRequest): Promise<UpdateDeploymentsResponses>;
    /**
     * Get Deployment by id.
     *
     * Fetch Deployment using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getDeploymentById(req: GetDeploymentByIdRequest): Promise<GetDeploymentByIdResponses>;
    /**
     * Update deployment.
     *
     * Update deployment in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateDeployment(req: UpdateDeploymentRequest): Promise<UpdateDeploymentResponses>;
    /**
     * Delete deployments.
     *
     * Delete one or more deployments from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteDeployments(req: DeleteDeploymentsRequest): Promise<DeleteDeploymentsResponses>;
    /**
     * Get instances for deployment.
     *
     * Fetch all the instances for deployment from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getInstancesForDeployment(req: GetInstancesForDeploymentRequest): Promise<GetInstancesForDeploymentResponses>;
    /**
     * Get generationsDeployments for deployment.
     *
     * Fetch all the generationsDeployments for deployment from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getGenerationsDeploymentsForDeployment(req: GetGenerationsDeploymentsForDeploymentRequest): Promise<GetGenerationsDeploymentsForDeploymentResponses>;
    /**
     * Get versionRegistry for deployment.
     *
     * Fetch all the versionRegistry for deployment from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getVersionRegistryForDeployment(req: GetVersionRegistryForDeploymentRequest): Promise<GetVersionRegistryForDeploymentResponses>;
    /**
     * Get application for deployment.
     *
     * Fetch the application for deployment from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationForDeployment(req: GetApplicationForDeploymentRequest): Promise<GetApplicationForDeploymentResponses>;
    /**
     * Get applicationState for deployment.
     *
     * Fetch the applicationState for deployment from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationStateForDeployment(req: GetApplicationStateForDeploymentRequest): Promise<GetApplicationStateForDeploymentResponses>;
    /**
     * Get generations.
     *
     * Fetch generations from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getGenerations(req: GetGenerationsRequest): Promise<GetGenerationsResponses>;
    /**
     * Create generation.
     *
     * Add new generation to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createGeneration(req: CreateGenerationRequest): Promise<CreateGenerationResponses>;
    /**
     * Update generations.
     *
     * Update one or more generations in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateGenerations(req: UpdateGenerationsRequest): Promise<UpdateGenerationsResponses>;
    /**
     * Get Generation by id.
     *
     * Fetch Generation using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getGenerationById(req: GetGenerationByIdRequest): Promise<GetGenerationByIdResponses>;
    /**
     * Update generation.
     *
     * Update generation in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateGeneration(req: UpdateGenerationRequest): Promise<UpdateGenerationResponses>;
    /**
     * Delete generations.
     *
     * Delete one or more generations from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteGenerations(req: DeleteGenerationsRequest): Promise<DeleteGenerationsResponses>;
    /**
     * Get graphs for generation.
     *
     * Fetch all the graphs for generation from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getGraphsForGeneration(req: GetGraphsForGenerationRequest): Promise<GetGraphsForGenerationResponses>;
    /**
     * Get generationsDeployments for generation.
     *
     * Fetch all the generationsDeployments for generation from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getGenerationsDeploymentsForGeneration(req: GetGenerationsDeploymentsForGenerationRequest): Promise<GetGenerationsDeploymentsForGenerationResponses>;
    /**
     * Get generationsApplicationsConfigs for generation.
     *
     * Fetch all the generationsApplicationsConfigs for generation from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getGenerationsApplicationsConfigsForGeneration(req: GetGenerationsApplicationsConfigsForGenerationRequest): Promise<GetGenerationsApplicationsConfigsForGenerationResponses>;
    /**
     * Get graphs.
     *
     * Fetch graphs from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getGraphs(req: GetGraphsRequest): Promise<GetGraphsResponses>;
    /**
     * Create graph.
     *
     * Add new graph to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createGraph(req: CreateGraphRequest): Promise<CreateGraphResponses>;
    /**
     * Update graphs.
     *
     * Update one or more graphs in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateGraphs(req: UpdateGraphsRequest): Promise<UpdateGraphsResponses>;
    /**
     * Get Graph by id.
     *
     * Fetch Graph using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getGraphById(req: GetGraphByIdRequest): Promise<GetGraphByIdResponses>;
    /**
     * Update graph.
     *
     * Update graph in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateGraph(req: UpdateGraphRequest): Promise<UpdateGraphResponses>;
    /**
     * Delete graphs.
     *
     * Delete one or more graphs from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteGraphs(req: DeleteGraphsRequest): Promise<DeleteGraphsResponses>;
    /**
     * Get generation for graph.
     *
     * Fetch the generation for graph from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getGenerationForGraph(req: GetGenerationForGraphRequest): Promise<GetGenerationForGraphResponses>;
    /**
     * Get applications.
     *
     * Fetch applications from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplications(req: GetApplicationsRequest): Promise<GetApplicationsResponses>;
    /**
     * Create application.
     *
     * Add new application to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createApplication(req: CreateApplicationRequest): Promise<CreateApplicationResponses>;
    /**
     * Update applications.
     *
     * Update one or more applications in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateApplications(req: UpdateApplicationsRequest): Promise<UpdateApplicationsResponses>;
    /**
     * Get Application by id.
     *
     * Fetch Application using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationById(req: GetApplicationByIdRequest): Promise<GetApplicationByIdResponses>;
    /**
     * Update application.
     *
     * Update application in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateApplication(req: UpdateApplicationRequest): Promise<UpdateApplicationResponses>;
    /**
     * Delete applications.
     *
     * Delete one or more applications from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteApplications(req: DeleteApplicationsRequest): Promise<DeleteApplicationsResponses>;
    /**
     * Get deployments for application.
     *
     * Fetch all the deployments for application from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getDeploymentsForApplication(req: GetDeploymentsForApplicationRequest): Promise<GetDeploymentsForApplicationResponses>;
    /**
     * Get applicationsConfigs for application.
     *
     * Fetch all the applicationsConfigs for application from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationsConfigsForApplication(req: GetApplicationsConfigsForApplicationRequest): Promise<GetApplicationsConfigsForApplicationResponses>;
    /**
     * Get applicationStates for application.
     *
     * Fetch all the applicationStates for application from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationStatesForApplication(req: GetApplicationStatesForApplicationRequest): Promise<GetApplicationStatesForApplicationResponses>;
    /**
     * Get instances for application.
     *
     * Fetch all the instances for application from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getInstancesForApplication(req: GetInstancesForApplicationRequest): Promise<GetInstancesForApplicationResponses>;
    /**
     * Get valkeyUsers for application.
     *
     * Fetch all the valkeyUsers for application from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getValkeyUsersForApplication(req: GetValkeyUsersForApplicationRequest): Promise<GetValkeyUsersForApplicationResponses>;
    /**
     * Get versionRegistry for application.
     *
     * Fetch all the versionRegistry for application from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getVersionRegistryForApplication(req: GetVersionRegistryForApplicationRequest): Promise<GetVersionRegistryForApplicationResponses>;
    /**
     * Get skewProtectionPolicies for application.
     *
     * Fetch all the skewProtectionPolicies for application from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getSkewProtectionPoliciesForApplication(req: GetSkewProtectionPoliciesForApplicationRequest): Promise<GetSkewProtectionPoliciesForApplicationResponses>;
    /**
     * Get applicationsConfigs.
     *
     * Fetch applicationsConfigs from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationsConfigs(req: GetApplicationsConfigsRequest): Promise<GetApplicationsConfigsResponses>;
    /**
     * Create applicationsConfig.
     *
     * Add new applicationsConfig to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createApplicationsConfig(req: CreateApplicationsConfigRequest): Promise<CreateApplicationsConfigResponses>;
    /**
     * Update applicationsConfigs.
     *
     * Update one or more applicationsConfigs in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateApplicationsConfigs(req: UpdateApplicationsConfigsRequest): Promise<UpdateApplicationsConfigsResponses>;
    /**
     * Get ApplicationsConfig by id.
     *
     * Fetch ApplicationsConfig using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationsConfigById(req: GetApplicationsConfigByIdRequest): Promise<GetApplicationsConfigByIdResponses>;
    /**
     * Update applicationsConfig.
     *
     * Update applicationsConfig in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateApplicationsConfig(req: UpdateApplicationsConfigRequest): Promise<UpdateApplicationsConfigResponses>;
    /**
     * Delete applicationsConfigs.
     *
     * Delete one or more applicationsConfigs from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteApplicationsConfigs(req: DeleteApplicationsConfigsRequest): Promise<DeleteApplicationsConfigsResponses>;
    /**
     * Get generationsApplicationsConfigs for applicationsConfig.
     *
     * Fetch all the generationsApplicationsConfigs for applicationsConfig from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getGenerationsApplicationsConfigsForApplicationsConfig(req: GetGenerationsApplicationsConfigsForApplicationsConfigRequest): Promise<GetGenerationsApplicationsConfigsForApplicationsConfigResponses>;
    /**
     * Get application for applicationsConfig.
     *
     * Fetch the application for applicationsConfig from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationForApplicationsConfig(req: GetApplicationForApplicationsConfigRequest): Promise<GetApplicationForApplicationsConfigResponses>;
    /**
     * Get applicationStates.
     *
     * Fetch applicationStates from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationStates(req: GetApplicationStatesRequest): Promise<GetApplicationStatesResponses>;
    /**
     * Create applicationState.
     *
     * Add new applicationState to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createApplicationState(req: CreateApplicationStateRequest): Promise<CreateApplicationStateResponses>;
    /**
     * Update applicationStates.
     *
     * Update one or more applicationStates in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateApplicationStates(req: UpdateApplicationStatesRequest): Promise<UpdateApplicationStatesResponses>;
    /**
     * Get ApplicationState by id.
     *
     * Fetch ApplicationState using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationStateById(req: GetApplicationStateByIdRequest): Promise<GetApplicationStateByIdResponses>;
    /**
     * Update applicationState.
     *
     * Update applicationState in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateApplicationState(req: UpdateApplicationStateRequest): Promise<UpdateApplicationStateResponses>;
    /**
     * Delete applicationStates.
     *
     * Delete one or more applicationStates from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteApplicationStates(req: DeleteApplicationStatesRequest): Promise<DeleteApplicationStatesResponses>;
    /**
     * Get deployments for applicationState.
     *
     * Fetch all the deployments for applicationState from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getDeploymentsForApplicationState(req: GetDeploymentsForApplicationStateRequest): Promise<GetDeploymentsForApplicationStateResponses>;
    /**
     * Get application for applicationState.
     *
     * Fetch the application for applicationState from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationForApplicationState(req: GetApplicationForApplicationStateRequest): Promise<GetApplicationForApplicationStateResponses>;
    /**
     * Get instances.
     *
     * Fetch instances from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getInstances(req: GetInstancesRequest): Promise<GetInstancesResponses>;
    /**
     * Create instance.
     *
     * Add new instance to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createInstance(req: CreateInstanceRequest): Promise<CreateInstanceResponses>;
    /**
     * Update instances.
     *
     * Update one or more instances in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateInstances(req: UpdateInstancesRequest): Promise<UpdateInstancesResponses>;
    /**
     * Get Instance by id.
     *
     * Fetch Instance using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getInstanceById(req: GetInstanceByIdRequest): Promise<GetInstanceByIdResponses>;
    /**
     * Update instance.
     *
     * Update instance in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateInstance(req: UpdateInstanceRequest): Promise<UpdateInstanceResponses>;
    /**
     * Delete instances.
     *
     * Delete one or more instances from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteInstances(req: DeleteInstancesRequest): Promise<DeleteInstancesResponses>;
    /**
     * Get application for instance.
     *
     * Fetch the application for instance from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationForInstance(req: GetApplicationForInstanceRequest): Promise<GetApplicationForInstanceResponses>;
    /**
     * Get deployment for instance.
     *
     * Fetch the deployment for instance from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getDeploymentForInstance(req: GetDeploymentForInstanceRequest): Promise<GetDeploymentForInstanceResponses>;
    /**
     * Get valkeyUsers.
     *
     * Fetch valkeyUsers from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getValkeyUsers(req: GetValkeyUsersRequest): Promise<GetValkeyUsersResponses>;
    /**
     * Create valkeyUser.
     *
     * Add new valkeyUser to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createValkeyUser(req: CreateValkeyUserRequest): Promise<CreateValkeyUserResponses>;
    /**
     * Update valkeyUsers.
     *
     * Update one or more valkeyUsers in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateValkeyUsers(req: UpdateValkeyUsersRequest): Promise<UpdateValkeyUsersResponses>;
    /**
     * Get ValkeyUser by id.
     *
     * Fetch ValkeyUser using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getValkeyUserById(req: GetValkeyUserByIdRequest): Promise<GetValkeyUserByIdResponses>;
    /**
     * Update valkeyUser.
     *
     * Update valkeyUser in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateValkeyUser(req: UpdateValkeyUserRequest): Promise<UpdateValkeyUserResponses>;
    /**
     * Delete valkeyUsers.
     *
     * Delete one or more valkeyUsers from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteValkeyUsers(req: DeleteValkeyUsersRequest): Promise<DeleteValkeyUsersResponses>;
    /**
     * Get application for valkeyUser.
     *
     * Fetch the application for valkeyUser from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationForValkeyUser(req: GetApplicationForValkeyUserRequest): Promise<GetApplicationForValkeyUserResponses>;
    /**
     * Get generationsDeployments.
     *
     * Fetch generationsDeployments from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getGenerationsDeployments(req: GetGenerationsDeploymentsRequest): Promise<GetGenerationsDeploymentsResponses>;
    /**
     * Create generationsDeployment.
     *
     * Add new generationsDeployment to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createGenerationsDeployment(req: CreateGenerationsDeploymentRequest): Promise<CreateGenerationsDeploymentResponses>;
    /**
     * Update generationsDeployments.
     *
     * Update one or more generationsDeployments in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateGenerationsDeployments(req: UpdateGenerationsDeploymentsRequest): Promise<UpdateGenerationsDeploymentsResponses>;
    /**
     * Get GenerationsDeployment by GenerationIdAndDeploymentId.
     *
     * Fetch GenerationsDeployment by GenerationIdAndDeploymentId from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getGenerationsDeploymentByGenerationIdAndDeploymentId(req: GetGenerationsDeploymentByGenerationIdAndDeploymentIdRequest): Promise<GetGenerationsDeploymentByGenerationIdAndDeploymentIdResponses>;
    /**
     * Update GenerationsDeployment by GenerationIdAndDeploymentId.
     *
     * Update GenerationsDeployment by GenerationIdAndDeploymentId in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    postGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentId(req: PostGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdRequest): Promise<PostGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponses>;
    /**
     * Update GenerationsDeployment by GenerationIdAndDeploymentId.
     *
     * Update GenerationsDeployment by GenerationIdAndDeploymentId in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    putGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentId(req: PutGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdRequest): Promise<PutGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponses>;
    /**
     * Delete GenerationsDeployment by GenerationIdAndDeploymentId.
     *
     * Delete GenerationsDeployment by GenerationIdAndDeploymentId from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentId(req: DeleteGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdRequest): Promise<DeleteGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponses>;
    /**
     * Get generationsApplicationsConfigs.
     *
     * Fetch generationsApplicationsConfigs from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getGenerationsApplicationsConfigs(req: GetGenerationsApplicationsConfigsRequest): Promise<GetGenerationsApplicationsConfigsResponses>;
    /**
     * Create generationsApplicationsConfig.
     *
     * Add new generationsApplicationsConfig to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createGenerationsApplicationsConfig(req: CreateGenerationsApplicationsConfigRequest): Promise<CreateGenerationsApplicationsConfigResponses>;
    /**
     * Update generationsApplicationsConfigs.
     *
     * Update one or more generationsApplicationsConfigs in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateGenerationsApplicationsConfigs(req: UpdateGenerationsApplicationsConfigsRequest): Promise<UpdateGenerationsApplicationsConfigsResponses>;
    /**
     * Get GenerationsApplicationsConfig by GenerationIdAndConfigId.
     *
     * Fetch GenerationsApplicationsConfig by GenerationIdAndConfigId from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getGenerationsApplicationsConfigByGenerationIdAndConfigId(req: GetGenerationsApplicationsConfigByGenerationIdAndConfigIdRequest): Promise<GetGenerationsApplicationsConfigByGenerationIdAndConfigIdResponses>;
    /**
     * Update GenerationsApplicationsConfig by GenerationIdAndConfigId.
     *
     * Update GenerationsApplicationsConfig by GenerationIdAndConfigId in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    postGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigId(req: PostGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdRequest): Promise<PostGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponses>;
    /**
     * Update GenerationsApplicationsConfig by GenerationIdAndConfigId.
     *
     * Update GenerationsApplicationsConfig by GenerationIdAndConfigId in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    putGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigId(req: PutGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdRequest): Promise<PutGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponses>;
    /**
     * Delete GenerationsApplicationsConfig by GenerationIdAndConfigId.
     *
     * Delete GenerationsApplicationsConfig by GenerationIdAndConfigId from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigId(req: DeleteGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdRequest): Promise<DeleteGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponses>;
    /**
     * Get versionRegistry.
     *
     * Fetch versionRegistry from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getVersionRegistry(req: GetVersionRegistryRequest): Promise<GetVersionRegistryResponses>;
    /**
     * Create versionRegistry.
     *
     * Add new versionRegistry to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createVersionRegistry(req: CreateVersionRegistryRequest): Promise<CreateVersionRegistryResponses>;
    /**
     * Update versionRegistry.
     *
     * Update one or more versionRegistry in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateVersionRegistry(req: UpdateVersionRegistryRequest): Promise<UpdateVersionRegistryResponses>;
    /**
     * Get VersionRegistry by id.
     *
     * Fetch VersionRegistry using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getVersionRegistryById(req: GetVersionRegistryByIdRequest): Promise<GetVersionRegistryByIdResponses>;
    /**
     * Update versionRegistry.
     *
     * Update versionRegistry in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    putUpdateVersionRegistry(req: PutUpdateVersionRegistryRequest): Promise<PutUpdateVersionRegistryResponses>;
    /**
     * Delete versionRegistry.
     *
     * Delete one or more versionRegistry from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteVersionRegistry(req: DeleteVersionRegistryRequest): Promise<DeleteVersionRegistryResponses>;
    /**
     * Get application for versionRegistry.
     *
     * Fetch the application for versionRegistry from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationForVersionRegistry(req: GetApplicationForVersionRegistryRequest): Promise<GetApplicationForVersionRegistryResponses>;
    /**
     * Get deployment for versionRegistry.
     *
     * Fetch the deployment for versionRegistry from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getDeploymentForVersionRegistry(req: GetDeploymentForVersionRegistryRequest): Promise<GetDeploymentForVersionRegistryResponses>;
    /**
     * Get skewProtectionPolicies.
     *
     * Fetch skewProtectionPolicies from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getSkewProtectionPolicies(req: GetSkewProtectionPoliciesRequest): Promise<GetSkewProtectionPoliciesResponses>;
    /**
     * Create skewProtectionPolicy.
     *
     * Add new skewProtectionPolicy to the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    createSkewProtectionPolicy(req: CreateSkewProtectionPolicyRequest): Promise<CreateSkewProtectionPolicyResponses>;
    /**
     * Update skewProtectionPolicies.
     *
     * Update one or more skewProtectionPolicies in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateSkewProtectionPolicies(req: UpdateSkewProtectionPoliciesRequest): Promise<UpdateSkewProtectionPoliciesResponses>;
    /**
     * Get SkewProtectionPolicy by id.
     *
     * Fetch SkewProtectionPolicy using its id from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getSkewProtectionPolicyById(req: GetSkewProtectionPolicyByIdRequest): Promise<GetSkewProtectionPolicyByIdResponses>;
    /**
     * Update skewProtectionPolicy.
     *
     * Update skewProtectionPolicy in the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    updateSkewProtectionPolicy(req: UpdateSkewProtectionPolicyRequest): Promise<UpdateSkewProtectionPolicyResponses>;
    /**
     * Delete skewProtectionPolicies.
     *
     * Delete one or more skewProtectionPolicies from the Database.
     * @param req - request parameters object
     * @returns the API response body
     */
    deleteSkewProtectionPolicies(req: DeleteSkewProtectionPoliciesRequest): Promise<DeleteSkewProtectionPoliciesResponses>;
    /**
     * Get application for skewProtectionPolicy.
     *
     * Fetch the application for skewProtectionPolicy from the database.
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationForSkewProtectionPolicy(req: GetApplicationForSkewProtectionPolicyRequest): Promise<GetApplicationForSkewProtectionPolicyResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    emitApplicationConfig(req: EmitApplicationConfigRequest): Promise<EmitApplicationConfigResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getGenerationGraph(req: GetGenerationGraphRequest): Promise<GetGenerationGraphResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    initApplicationInstance(req: InitApplicationInstanceRequest): Promise<InitApplicationInstanceResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    saveApplicationInstanceStatus(req: SaveApplicationInstanceStatusRequest): Promise<SaveApplicationInstanceStatusResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    saveApplicationInstanceState(req: SaveApplicationInstanceStateRequest): Promise<SaveApplicationInstanceStateResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationK8SState(req: GetApplicationK8SStateRequest): Promise<GetApplicationK8SStateResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationResources(req: GetApplicationResourcesRequest): Promise<GetApplicationResourcesResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    setApplicationResources(req: SetApplicationResourcesRequest): Promise<SetApplicationResourcesResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    getApplicationVersions(req: GetApplicationVersionsRequest): Promise<GetApplicationVersionsResponses>;
    /**
     * @param req - request parameters object
     * @returns the API response body
     */
    expireApplicationVersion(req: ExpireApplicationVersionRequest): Promise<ExpireApplicationVersionResponses>;
  }
  export interface ControlPlaneOptions {
    url: string
  }
  export const controlPlane: ControlPlanePlugin;
  export { controlPlane as default };
  export interface FullResponse<T, U extends number> {
    'statusCode': U;
    'headers': Record<string, string>;
    'body': T;
  }

  export type GetDeploymentsRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    /**
     * Include cursor headers in response. Cursor keys built from orderBy clause
     */
    'cursor'?: boolean;
    /**
     * Cursor for forward pagination. List objects after this cursor position
     */
    'startAfter'?: string;
    /**
     * Cursor for backward pagination. List objects before this cursor position
     */
    'endBefore'?: string;
    'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'namespace' | 'status'>;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.applicationStateId.eq'?: string;
    'where.applicationStateId.neq'?: string;
    'where.applicationStateId.gt'?: string;
    'where.applicationStateId.gte'?: string;
    'where.applicationStateId.lt'?: string;
    'where.applicationStateId.lte'?: string;
    'where.applicationStateId.like'?: string;
    'where.applicationStateId.ilike'?: string;
    'where.applicationStateId.in'?: string;
    'where.applicationStateId.nin'?: string;
    'where.applicationStateId.contains'?: string;
    'where.applicationStateId.contained'?: string;
    'where.applicationStateId.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.imageId.eq'?: string;
    'where.imageId.neq'?: string;
    'where.imageId.gt'?: string;
    'where.imageId.gte'?: string;
    'where.imageId.lt'?: string;
    'where.imageId.lte'?: string;
    'where.imageId.like'?: string;
    'where.imageId.ilike'?: string;
    'where.imageId.in'?: string;
    'where.imageId.nin'?: string;
    'where.imageId.contains'?: string;
    'where.imageId.contained'?: string;
    'where.imageId.overlaps'?: string;
    'where.namespace.eq'?: string;
    'where.namespace.neq'?: string;
    'where.namespace.gt'?: string;
    'where.namespace.gte'?: string;
    'where.namespace.lt'?: string;
    'where.namespace.lte'?: string;
    'where.namespace.like'?: string;
    'where.namespace.ilike'?: string;
    'where.namespace.in'?: string;
    'where.namespace.nin'?: string;
    'where.namespace.contains'?: string;
    'where.namespace.contained'?: string;
    'where.namespace.overlaps'?: string;
    'where.status.eq'?: 'failed' | 'started' | 'starting' | 'stopped';
    'where.status.neq'?: 'failed' | 'started' | 'starting' | 'stopped';
    'where.status.gt'?: 'failed' | 'started' | 'starting' | 'stopped';
    'where.status.gte'?: 'failed' | 'started' | 'starting' | 'stopped';
    'where.status.lt'?: 'failed' | 'started' | 'starting' | 'stopped';
    'where.status.lte'?: 'failed' | 'started' | 'starting' | 'stopped';
    'where.status.like'?: 'failed' | 'started' | 'starting' | 'stopped';
    'where.status.ilike'?: 'failed' | 'started' | 'starting' | 'stopped';
    'where.status.in'?: string;
    'where.status.nin'?: string;
    'where.status.contains'?: string;
    'where.status.contained'?: string;
    'where.status.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.applicationStateId'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.imageId'?: 'asc' | 'desc';
    'orderby.namespace'?: 'asc' | 'desc';
    'orderby.status'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetDeploymentsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | 'stopped' | null; 'imageId'?: string | null; 'namespace'?: string | null; 'createdAt'?: string | null }>
  export type GetDeploymentsResponses =
    GetDeploymentsResponseOK

  export type CreateDeploymentRequest = {
    'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'namespace' | 'status'>;
    'id'?: string;
    'applicationId': string;
    'applicationStateId'?: string | null;
    'status': 'failed' | 'started' | 'starting' | 'stopped';
    'imageId': string;
    'namespace': string;
    'createdAt'?: string | null;
  }

  /**
   * A Deployment
   */
  export type CreateDeploymentResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | 'stopped' | null; 'imageId'?: string | null; 'namespace'?: string | null; 'createdAt'?: string | null }
  export type CreateDeploymentResponses =
    CreateDeploymentResponseOK

  export type UpdateDeploymentsRequest = {
    'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'namespace' | 'status'>;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.applicationStateId.eq'?: string;
    'where.applicationStateId.neq'?: string;
    'where.applicationStateId.gt'?: string;
    'where.applicationStateId.gte'?: string;
    'where.applicationStateId.lt'?: string;
    'where.applicationStateId.lte'?: string;
    'where.applicationStateId.like'?: string;
    'where.applicationStateId.ilike'?: string;
    'where.applicationStateId.in'?: string;
    'where.applicationStateId.nin'?: string;
    'where.applicationStateId.contains'?: string;
    'where.applicationStateId.contained'?: string;
    'where.applicationStateId.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.imageId.eq'?: string;
    'where.imageId.neq'?: string;
    'where.imageId.gt'?: string;
    'where.imageId.gte'?: string;
    'where.imageId.lt'?: string;
    'where.imageId.lte'?: string;
    'where.imageId.like'?: string;
    'where.imageId.ilike'?: string;
    'where.imageId.in'?: string;
    'where.imageId.nin'?: string;
    'where.imageId.contains'?: string;
    'where.imageId.contained'?: string;
    'where.imageId.overlaps'?: string;
    'where.namespace.eq'?: string;
    'where.namespace.neq'?: string;
    'where.namespace.gt'?: string;
    'where.namespace.gte'?: string;
    'where.namespace.lt'?: string;
    'where.namespace.lte'?: string;
    'where.namespace.like'?: string;
    'where.namespace.ilike'?: string;
    'where.namespace.in'?: string;
    'where.namespace.nin'?: string;
    'where.namespace.contains'?: string;
    'where.namespace.contained'?: string;
    'where.namespace.overlaps'?: string;
    'where.status.eq'?: 'failed' | 'started' | 'starting' | 'stopped';
    'where.status.neq'?: 'failed' | 'started' | 'starting' | 'stopped';
    'where.status.gt'?: 'failed' | 'started' | 'starting' | 'stopped';
    'where.status.gte'?: 'failed' | 'started' | 'starting' | 'stopped';
    'where.status.lt'?: 'failed' | 'started' | 'starting' | 'stopped';
    'where.status.lte'?: 'failed' | 'started' | 'starting' | 'stopped';
    'where.status.like'?: 'failed' | 'started' | 'starting' | 'stopped';
    'where.status.ilike'?: 'failed' | 'started' | 'starting' | 'stopped';
    'where.status.in'?: string;
    'where.status.nin'?: string;
    'where.status.contains'?: string;
    'where.status.contained'?: string;
    'where.status.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'applicationId': string;
    'applicationStateId'?: string | null;
    'status': 'failed' | 'started' | 'starting' | 'stopped';
    'imageId': string;
    'namespace': string;
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateDeploymentsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | 'stopped' | null; 'imageId'?: string | null; 'namespace'?: string | null; 'createdAt'?: string | null }>
  export type UpdateDeploymentsResponses =
    UpdateDeploymentsResponseOK

  export type GetDeploymentByIdRequest = {
    'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'namespace' | 'status'>;
    'id': string;
  }

  /**
   * A Deployment
   */
  export type GetDeploymentByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | 'stopped' | null; 'imageId'?: string | null; 'namespace'?: string | null; 'createdAt'?: string | null }
  export type GetDeploymentByIdResponses =
    GetDeploymentByIdResponseOK

  export type UpdateDeploymentRequest = {
    'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'namespace' | 'status'>;
    'id': string;
    'applicationId': string;
    'applicationStateId'?: string | null;
    'status': 'failed' | 'started' | 'starting' | 'stopped';
    'imageId': string;
    'namespace': string;
    'createdAt'?: string | null;
  }

  /**
   * A Deployment
   */
  export type UpdateDeploymentResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | 'stopped' | null; 'imageId'?: string | null; 'namespace'?: string | null; 'createdAt'?: string | null }
  export type UpdateDeploymentResponses =
    UpdateDeploymentResponseOK

  export type DeleteDeploymentsRequest = {
    'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'namespace' | 'status'>;
    'id': string;
  }

  /**
   * A Deployment
   */
  export type DeleteDeploymentsResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | 'stopped' | null; 'imageId'?: string | null; 'namespace'?: string | null; 'createdAt'?: string | null }
  export type DeleteDeploymentsResponses =
    DeleteDeploymentsResponseOK

  export type GetInstancesForDeploymentRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'applicationId' | 'createdAt' | 'deploymentId' | 'id' | 'machineId' | 'namespace' | 'status'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetInstancesForDeploymentResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'machineId'?: string | null; 'namespace'?: string | null; 'status'?: 'running' | 'starting' | 'stopped' | null; 'createdAt'?: string | null }>
  export type GetInstancesForDeploymentResponses =
    GetInstancesForDeploymentResponseOK

  export type GetGenerationsDeploymentsForDeploymentRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'deploymentId' | 'generationId'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetGenerationsDeploymentsForDeploymentResponseOK = Array<{ 'generationId'?: string | null; 'deploymentId'?: string | null }>
  export type GetGenerationsDeploymentsForDeploymentResponses =
    GetGenerationsDeploymentsForDeploymentResponseOK

  export type GetVersionRegistryForDeploymentRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'appLabel' | 'applicationId' | 'createdAt' | 'deploymentId' | 'drainedAt' | 'expirePolicy' | 'expiredAt' | 'hostname' | 'id' | 'k8SDeploymentName' | 'namespace' | 'pathPrefix' | 'serviceName' | 'servicePort' | 'status' | 'versionLabel'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetVersionRegistryForDeploymentResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'appLabel'?: string | null; 'versionLabel'?: string | null; 'k8SDeploymentName'?: string | null; 'serviceName'?: string | null; 'servicePort'?: number | null; 'namespace'?: string | null; 'pathPrefix'?: string | null; 'hostname'?: string | null; 'status'?: 'active' | 'draining' | 'expired' | null; 'expirePolicy'?: string | null; 'drainedAt'?: string | null; 'expiredAt'?: string | null; 'createdAt'?: string | null }>
  export type GetVersionRegistryForDeploymentResponses =
    GetVersionRegistryForDeploymentResponseOK

  export type GetApplicationForDeploymentRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'name'>;
    'id': string;
  }

  /**
   * A Application
   */
  export type GetApplicationForDeploymentResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
  export type GetApplicationForDeploymentResponses =
    GetApplicationForDeploymentResponseOK

  export type GetApplicationStateForDeploymentRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'pltVersion' | 'state'>;
    'id': string;
  }

  /**
   * A ApplicationState
   */
  export type GetApplicationStateForDeploymentResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'pltVersion'?: string | null; 'state'?: object | null; 'createdAt'?: string | null }
  export type GetApplicationStateForDeploymentResponses =
    GetApplicationStateForDeploymentResponseOK

  export type GetGenerationsRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    /**
     * Include cursor headers in response. Cursor keys built from orderBy clause
     */
    'cursor'?: boolean;
    /**
     * Cursor for forward pagination. List objects after this cursor position
     */
    'startAfter'?: string;
    /**
     * Cursor for backward pagination. List objects before this cursor position
     */
    'endBefore'?: string;
    'fields'?: Array<'createdAt' | 'id' | 'version'>;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.version.eq'?: number;
    'where.version.neq'?: number;
    'where.version.gt'?: number;
    'where.version.gte'?: number;
    'where.version.lt'?: number;
    'where.version.lte'?: number;
    'where.version.like'?: number;
    'where.version.ilike'?: number;
    'where.version.in'?: string;
    'where.version.nin'?: string;
    'where.version.contains'?: string;
    'where.version.contained'?: string;
    'where.version.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.version'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetGenerationsResponseOK = Array<{ 'id'?: string | null; 'version'?: number | null; 'createdAt'?: string | null }>
  export type GetGenerationsResponses =
    GetGenerationsResponseOK

  export type CreateGenerationRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'version'>;
    'id'?: string;
    'version': number;
    'createdAt'?: string | null;
  }

  /**
   * A Generation
   */
  export type CreateGenerationResponseOK = { 'id'?: string | null; 'version'?: number | null; 'createdAt'?: string | null }
  export type CreateGenerationResponses =
    CreateGenerationResponseOK

  export type UpdateGenerationsRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'version'>;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.version.eq'?: number;
    'where.version.neq'?: number;
    'where.version.gt'?: number;
    'where.version.gte'?: number;
    'where.version.lt'?: number;
    'where.version.lte'?: number;
    'where.version.like'?: number;
    'where.version.ilike'?: number;
    'where.version.in'?: string;
    'where.version.nin'?: string;
    'where.version.contains'?: string;
    'where.version.contained'?: string;
    'where.version.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'version': number;
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateGenerationsResponseOK = Array<{ 'id'?: string | null; 'version'?: number | null; 'createdAt'?: string | null }>
  export type UpdateGenerationsResponses =
    UpdateGenerationsResponseOK

  export type GetGenerationByIdRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'version'>;
    'id': string;
  }

  /**
   * A Generation
   */
  export type GetGenerationByIdResponseOK = { 'id'?: string | null; 'version'?: number | null; 'createdAt'?: string | null }
  export type GetGenerationByIdResponses =
    GetGenerationByIdResponseOK

  export type UpdateGenerationRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'version'>;
    'id': string;
    'version': number;
    'createdAt'?: string | null;
  }

  /**
   * A Generation
   */
  export type UpdateGenerationResponseOK = { 'id'?: string | null; 'version'?: number | null; 'createdAt'?: string | null }
  export type UpdateGenerationResponses =
    UpdateGenerationResponseOK

  export type DeleteGenerationsRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'version'>;
    'id': string;
  }

  /**
   * A Generation
   */
  export type DeleteGenerationsResponseOK = { 'id'?: string | null; 'version'?: number | null; 'createdAt'?: string | null }
  export type DeleteGenerationsResponses =
    DeleteGenerationsResponseOK

  export type GetGraphsForGenerationRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetGraphsForGenerationResponseOK = Array<{ 'id'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }>
  export type GetGraphsForGenerationResponses =
    GetGraphsForGenerationResponseOK

  export type GetGenerationsDeploymentsForGenerationRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'deploymentId' | 'generationId'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetGenerationsDeploymentsForGenerationResponseOK = Array<{ 'generationId'?: string | null; 'deploymentId'?: string | null }>
  export type GetGenerationsDeploymentsForGenerationResponses =
    GetGenerationsDeploymentsForGenerationResponseOK

  export type GetGenerationsApplicationsConfigsForGenerationRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'configId' | 'generationId'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetGenerationsApplicationsConfigsForGenerationResponseOK = Array<{ 'generationId'?: string | null; 'configId'?: string | null }>
  export type GetGenerationsApplicationsConfigsForGenerationResponses =
    GetGenerationsApplicationsConfigsForGenerationResponseOK

  export type GetGraphsRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    /**
     * Include cursor headers in response. Cursor keys built from orderBy clause
     */
    'cursor'?: boolean;
    /**
     * Cursor for forward pagination. List objects after this cursor position
     */
    'startAfter'?: string;
    /**
     * Cursor for backward pagination. List objects before this cursor position
     */
    'endBefore'?: string;
    'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id'>;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.generationId.eq'?: string;
    'where.generationId.neq'?: string;
    'where.generationId.gt'?: string;
    'where.generationId.gte'?: string;
    'where.generationId.lt'?: string;
    'where.generationId.lte'?: string;
    'where.generationId.like'?: string;
    'where.generationId.ilike'?: string;
    'where.generationId.in'?: string;
    'where.generationId.nin'?: string;
    'where.generationId.contains'?: string;
    'where.generationId.contained'?: string;
    'where.generationId.overlaps'?: string;
    'where.graph.eq'?: string;
    'where.graph.neq'?: string;
    'where.graph.gt'?: string;
    'where.graph.gte'?: string;
    'where.graph.lt'?: string;
    'where.graph.lte'?: string;
    'where.graph.like'?: string;
    'where.graph.ilike'?: string;
    'where.graph.in'?: string;
    'where.graph.nin'?: string;
    'where.graph.contains'?: string;
    'where.graph.contained'?: string;
    'where.graph.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.generationId'?: 'asc' | 'desc';
    'orderby.graph'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetGraphsResponseOK = Array<{ 'id'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }>
  export type GetGraphsResponses =
    GetGraphsResponseOK

  export type CreateGraphRequest = {
    'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id'>;
    'id'?: string;
    'generationId': string;
    'graph': object;
    'createdAt'?: string | null;
  }

  /**
   * A Graph
   */
  export type CreateGraphResponseOK = { 'id'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }
  export type CreateGraphResponses =
    CreateGraphResponseOK

  export type UpdateGraphsRequest = {
    'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id'>;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.generationId.eq'?: string;
    'where.generationId.neq'?: string;
    'where.generationId.gt'?: string;
    'where.generationId.gte'?: string;
    'where.generationId.lt'?: string;
    'where.generationId.lte'?: string;
    'where.generationId.like'?: string;
    'where.generationId.ilike'?: string;
    'where.generationId.in'?: string;
    'where.generationId.nin'?: string;
    'where.generationId.contains'?: string;
    'where.generationId.contained'?: string;
    'where.generationId.overlaps'?: string;
    'where.graph.eq'?: string;
    'where.graph.neq'?: string;
    'where.graph.gt'?: string;
    'where.graph.gte'?: string;
    'where.graph.lt'?: string;
    'where.graph.lte'?: string;
    'where.graph.like'?: string;
    'where.graph.ilike'?: string;
    'where.graph.in'?: string;
    'where.graph.nin'?: string;
    'where.graph.contains'?: string;
    'where.graph.contained'?: string;
    'where.graph.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'generationId': string;
    'graph': object;
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateGraphsResponseOK = Array<{ 'id'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }>
  export type UpdateGraphsResponses =
    UpdateGraphsResponseOK

  export type GetGraphByIdRequest = {
    'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id'>;
    'id': string;
  }

  /**
   * A Graph
   */
  export type GetGraphByIdResponseOK = { 'id'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }
  export type GetGraphByIdResponses =
    GetGraphByIdResponseOK

  export type UpdateGraphRequest = {
    'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id'>;
    'id': string;
    'generationId': string;
    'graph': object;
    'createdAt'?: string | null;
  }

  /**
   * A Graph
   */
  export type UpdateGraphResponseOK = { 'id'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }
  export type UpdateGraphResponses =
    UpdateGraphResponseOK

  export type DeleteGraphsRequest = {
    'fields'?: Array<'createdAt' | 'generationId' | 'graph' | 'id'>;
    'id': string;
  }

  /**
   * A Graph
   */
  export type DeleteGraphsResponseOK = { 'id'?: string | null; 'generationId'?: string | null; 'graph'?: object | null; 'createdAt'?: string | null }
  export type DeleteGraphsResponses =
    DeleteGraphsResponseOK

  export type GetGenerationForGraphRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'version'>;
    'id': string;
  }

  /**
   * A Generation
   */
  export type GetGenerationForGraphResponseOK = { 'id'?: string | null; 'version'?: number | null; 'createdAt'?: string | null }
  export type GetGenerationForGraphResponses =
    GetGenerationForGraphResponseOK

  export type GetApplicationsRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    /**
     * Include cursor headers in response. Cursor keys built from orderBy clause
     */
    'cursor'?: boolean;
    /**
     * Cursor for forward pagination. List objects after this cursor position
     */
    'startAfter'?: string;
    /**
     * Cursor for backward pagination. List objects before this cursor position
     */
    'endBefore'?: string;
    'fields'?: Array<'createdAt' | 'id' | 'name'>;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.name.eq'?: string;
    'where.name.neq'?: string;
    'where.name.gt'?: string;
    'where.name.gte'?: string;
    'where.name.lt'?: string;
    'where.name.lte'?: string;
    'where.name.like'?: string;
    'where.name.ilike'?: string;
    'where.name.in'?: string;
    'where.name.nin'?: string;
    'where.name.contains'?: string;
    'where.name.contained'?: string;
    'where.name.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.name'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetApplicationsResponseOK = Array<{ 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }>
  export type GetApplicationsResponses =
    GetApplicationsResponseOK

  export type CreateApplicationRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'name'>;
    'id'?: string;
    'name': string;
    'createdAt'?: string | null;
  }

  /**
   * A Application
   */
  export type CreateApplicationResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
  export type CreateApplicationResponses =
    CreateApplicationResponseOK

  export type UpdateApplicationsRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'name'>;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.name.eq'?: string;
    'where.name.neq'?: string;
    'where.name.gt'?: string;
    'where.name.gte'?: string;
    'where.name.lt'?: string;
    'where.name.lte'?: string;
    'where.name.like'?: string;
    'where.name.ilike'?: string;
    'where.name.in'?: string;
    'where.name.nin'?: string;
    'where.name.contains'?: string;
    'where.name.contained'?: string;
    'where.name.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'name': string;
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateApplicationsResponseOK = Array<{ 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }>
  export type UpdateApplicationsResponses =
    UpdateApplicationsResponseOK

  export type GetApplicationByIdRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'name'>;
    'id': string;
  }

  /**
   * A Application
   */
  export type GetApplicationByIdResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
  export type GetApplicationByIdResponses =
    GetApplicationByIdResponseOK

  export type UpdateApplicationRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'name'>;
    'id': string;
    'name': string;
    'createdAt'?: string | null;
  }

  /**
   * A Application
   */
  export type UpdateApplicationResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
  export type UpdateApplicationResponses =
    UpdateApplicationResponseOK

  export type DeleteApplicationsRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'name'>;
    'id': string;
  }

  /**
   * A Application
   */
  export type DeleteApplicationsResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
  export type DeleteApplicationsResponses =
    DeleteApplicationsResponseOK

  export type GetDeploymentsForApplicationRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'namespace' | 'status'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetDeploymentsForApplicationResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | 'stopped' | null; 'imageId'?: string | null; 'namespace'?: string | null; 'createdAt'?: string | null }>
  export type GetDeploymentsForApplicationResponses =
    GetDeploymentsForApplicationResponseOK

  export type GetApplicationsConfigsForApplicationRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'resources' | 'version'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetApplicationsConfigsForApplicationResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'version'?: number | null; 'resources'?: object | null; 'createdAt'?: string | null }>
  export type GetApplicationsConfigsForApplicationResponses =
    GetApplicationsConfigsForApplicationResponseOK

  export type GetApplicationStatesForApplicationRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'pltVersion' | 'state'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetApplicationStatesForApplicationResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'pltVersion'?: string | null; 'state'?: object | null; 'createdAt'?: string | null }>
  export type GetApplicationStatesForApplicationResponses =
    GetApplicationStatesForApplicationResponseOK

  export type GetInstancesForApplicationRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'applicationId' | 'createdAt' | 'deploymentId' | 'id' | 'machineId' | 'namespace' | 'status'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetInstancesForApplicationResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'machineId'?: string | null; 'namespace'?: string | null; 'status'?: 'running' | 'starting' | 'stopped' | null; 'createdAt'?: string | null }>
  export type GetInstancesForApplicationResponses =
    GetInstancesForApplicationResponseOK

  export type GetValkeyUsersForApplicationRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'applicationId' | 'createdAt' | 'encryptedPassword' | 'id' | 'keyPrefix' | 'username'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetValkeyUsersForApplicationResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'username'?: string | null; 'encryptedPassword'?: string | null; 'keyPrefix'?: string | null; 'createdAt'?: string | null }>
  export type GetValkeyUsersForApplicationResponses =
    GetValkeyUsersForApplicationResponseOK

  export type GetVersionRegistryForApplicationRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'appLabel' | 'applicationId' | 'createdAt' | 'deploymentId' | 'drainedAt' | 'expirePolicy' | 'expiredAt' | 'hostname' | 'id' | 'k8SDeploymentName' | 'namespace' | 'pathPrefix' | 'serviceName' | 'servicePort' | 'status' | 'versionLabel'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetVersionRegistryForApplicationResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'appLabel'?: string | null; 'versionLabel'?: string | null; 'k8SDeploymentName'?: string | null; 'serviceName'?: string | null; 'servicePort'?: number | null; 'namespace'?: string | null; 'pathPrefix'?: string | null; 'hostname'?: string | null; 'status'?: 'active' | 'draining' | 'expired' | null; 'expirePolicy'?: string | null; 'drainedAt'?: string | null; 'expiredAt'?: string | null; 'createdAt'?: string | null }>
  export type GetVersionRegistryForApplicationResponses =
    GetVersionRegistryForApplicationResponseOK

  export type GetSkewProtectionPoliciesForApplicationRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'applicationId' | 'autoCleanup' | 'cookieName' | 'createdAt' | 'httpGracePeriodMs' | 'httpMaxAliveMs' | 'id' | 'maxAgeS' | 'maxVersions' | 'updatedAt' | 'workflowGracePeriodMs' | 'workflowMaxAliveMs'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetSkewProtectionPoliciesForApplicationResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'httpGracePeriodMs'?: number | null; 'httpMaxAliveMs'?: number | null; 'workflowGracePeriodMs'?: number | null; 'workflowMaxAliveMs'?: number | null; 'maxAgeS'?: number | null; 'maxVersions'?: number | null; 'cookieName'?: string | null; 'autoCleanup'?: boolean | null; 'createdAt'?: string | null; 'updatedAt'?: string | null }>
  export type GetSkewProtectionPoliciesForApplicationResponses =
    GetSkewProtectionPoliciesForApplicationResponseOK

  export type GetApplicationsConfigsRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    /**
     * Include cursor headers in response. Cursor keys built from orderBy clause
     */
    'cursor'?: boolean;
    /**
     * Cursor for forward pagination. List objects after this cursor position
     */
    'startAfter'?: string;
    /**
     * Cursor for backward pagination. List objects before this cursor position
     */
    'endBefore'?: string;
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'resources' | 'version'>;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.resources.eq'?: string;
    'where.resources.neq'?: string;
    'where.resources.gt'?: string;
    'where.resources.gte'?: string;
    'where.resources.lt'?: string;
    'where.resources.lte'?: string;
    'where.resources.like'?: string;
    'where.resources.ilike'?: string;
    'where.resources.in'?: string;
    'where.resources.nin'?: string;
    'where.resources.contains'?: string;
    'where.resources.contained'?: string;
    'where.resources.overlaps'?: string;
    'where.version.eq'?: number;
    'where.version.neq'?: number;
    'where.version.gt'?: number;
    'where.version.gte'?: number;
    'where.version.lt'?: number;
    'where.version.lte'?: number;
    'where.version.like'?: number;
    'where.version.ilike'?: number;
    'where.version.in'?: string;
    'where.version.nin'?: string;
    'where.version.contains'?: string;
    'where.version.contained'?: string;
    'where.version.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.resources'?: 'asc' | 'desc';
    'orderby.version'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetApplicationsConfigsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'version'?: number | null; 'resources'?: object | null; 'createdAt'?: string | null }>
  export type GetApplicationsConfigsResponses =
    GetApplicationsConfigsResponseOK

  export type CreateApplicationsConfigRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'resources' | 'version'>;
    'id'?: string;
    'applicationId': string;
    'version': number;
    'resources': object;
    'createdAt'?: string | null;
  }

  /**
   * A ApplicationsConfig
   */
  export type CreateApplicationsConfigResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'version'?: number | null; 'resources'?: object | null; 'createdAt'?: string | null }
  export type CreateApplicationsConfigResponses =
    CreateApplicationsConfigResponseOK

  export type UpdateApplicationsConfigsRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'resources' | 'version'>;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.resources.eq'?: string;
    'where.resources.neq'?: string;
    'where.resources.gt'?: string;
    'where.resources.gte'?: string;
    'where.resources.lt'?: string;
    'where.resources.lte'?: string;
    'where.resources.like'?: string;
    'where.resources.ilike'?: string;
    'where.resources.in'?: string;
    'where.resources.nin'?: string;
    'where.resources.contains'?: string;
    'where.resources.contained'?: string;
    'where.resources.overlaps'?: string;
    'where.version.eq'?: number;
    'where.version.neq'?: number;
    'where.version.gt'?: number;
    'where.version.gte'?: number;
    'where.version.lt'?: number;
    'where.version.lte'?: number;
    'where.version.like'?: number;
    'where.version.ilike'?: number;
    'where.version.in'?: string;
    'where.version.nin'?: string;
    'where.version.contains'?: string;
    'where.version.contained'?: string;
    'where.version.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'applicationId': string;
    'version': number;
    'resources': object;
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateApplicationsConfigsResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'version'?: number | null; 'resources'?: object | null; 'createdAt'?: string | null }>
  export type UpdateApplicationsConfigsResponses =
    UpdateApplicationsConfigsResponseOK

  export type GetApplicationsConfigByIdRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'resources' | 'version'>;
    'id': string;
  }

  /**
   * A ApplicationsConfig
   */
  export type GetApplicationsConfigByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'version'?: number | null; 'resources'?: object | null; 'createdAt'?: string | null }
  export type GetApplicationsConfigByIdResponses =
    GetApplicationsConfigByIdResponseOK

  export type UpdateApplicationsConfigRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'resources' | 'version'>;
    'id': string;
    'applicationId': string;
    'version': number;
    'resources': object;
    'createdAt'?: string | null;
  }

  /**
   * A ApplicationsConfig
   */
  export type UpdateApplicationsConfigResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'version'?: number | null; 'resources'?: object | null; 'createdAt'?: string | null }
  export type UpdateApplicationsConfigResponses =
    UpdateApplicationsConfigResponseOK

  export type DeleteApplicationsConfigsRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'resources' | 'version'>;
    'id': string;
  }

  /**
   * A ApplicationsConfig
   */
  export type DeleteApplicationsConfigsResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'version'?: number | null; 'resources'?: object | null; 'createdAt'?: string | null }
  export type DeleteApplicationsConfigsResponses =
    DeleteApplicationsConfigsResponseOK

  export type GetGenerationsApplicationsConfigsForApplicationsConfigRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'configId' | 'generationId'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetGenerationsApplicationsConfigsForApplicationsConfigResponseOK = Array<{ 'generationId'?: string | null; 'configId'?: string | null }>
  export type GetGenerationsApplicationsConfigsForApplicationsConfigResponses =
    GetGenerationsApplicationsConfigsForApplicationsConfigResponseOK

  export type GetApplicationForApplicationsConfigRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'name'>;
    'id': string;
  }

  /**
   * A Application
   */
  export type GetApplicationForApplicationsConfigResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
  export type GetApplicationForApplicationsConfigResponses =
    GetApplicationForApplicationsConfigResponseOK

  export type GetApplicationStatesRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    /**
     * Include cursor headers in response. Cursor keys built from orderBy clause
     */
    'cursor'?: boolean;
    /**
     * Cursor for forward pagination. List objects after this cursor position
     */
    'startAfter'?: string;
    /**
     * Cursor for backward pagination. List objects before this cursor position
     */
    'endBefore'?: string;
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'pltVersion' | 'state'>;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.pltVersion.eq'?: string;
    'where.pltVersion.neq'?: string;
    'where.pltVersion.gt'?: string;
    'where.pltVersion.gte'?: string;
    'where.pltVersion.lt'?: string;
    'where.pltVersion.lte'?: string;
    'where.pltVersion.like'?: string;
    'where.pltVersion.ilike'?: string;
    'where.pltVersion.in'?: string;
    'where.pltVersion.nin'?: string;
    'where.pltVersion.contains'?: string;
    'where.pltVersion.contained'?: string;
    'where.pltVersion.overlaps'?: string;
    'where.state.eq'?: string;
    'where.state.neq'?: string;
    'where.state.gt'?: string;
    'where.state.gte'?: string;
    'where.state.lt'?: string;
    'where.state.lte'?: string;
    'where.state.like'?: string;
    'where.state.ilike'?: string;
    'where.state.in'?: string;
    'where.state.nin'?: string;
    'where.state.contains'?: string;
    'where.state.contained'?: string;
    'where.state.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.pltVersion'?: 'asc' | 'desc';
    'orderby.state'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetApplicationStatesResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'pltVersion'?: string | null; 'state'?: object | null; 'createdAt'?: string | null }>
  export type GetApplicationStatesResponses =
    GetApplicationStatesResponseOK

  export type CreateApplicationStateRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'pltVersion' | 'state'>;
    'id'?: string;
    'applicationId': string;
    'pltVersion': string;
    'state': object;
    'createdAt'?: string | null;
  }

  /**
   * A ApplicationState
   */
  export type CreateApplicationStateResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'pltVersion'?: string | null; 'state'?: object | null; 'createdAt'?: string | null }
  export type CreateApplicationStateResponses =
    CreateApplicationStateResponseOK

  export type UpdateApplicationStatesRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'pltVersion' | 'state'>;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.pltVersion.eq'?: string;
    'where.pltVersion.neq'?: string;
    'where.pltVersion.gt'?: string;
    'where.pltVersion.gte'?: string;
    'where.pltVersion.lt'?: string;
    'where.pltVersion.lte'?: string;
    'where.pltVersion.like'?: string;
    'where.pltVersion.ilike'?: string;
    'where.pltVersion.in'?: string;
    'where.pltVersion.nin'?: string;
    'where.pltVersion.contains'?: string;
    'where.pltVersion.contained'?: string;
    'where.pltVersion.overlaps'?: string;
    'where.state.eq'?: string;
    'where.state.neq'?: string;
    'where.state.gt'?: string;
    'where.state.gte'?: string;
    'where.state.lt'?: string;
    'where.state.lte'?: string;
    'where.state.like'?: string;
    'where.state.ilike'?: string;
    'where.state.in'?: string;
    'where.state.nin'?: string;
    'where.state.contains'?: string;
    'where.state.contained'?: string;
    'where.state.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'applicationId': string;
    'pltVersion': string;
    'state': object;
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateApplicationStatesResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'pltVersion'?: string | null; 'state'?: object | null; 'createdAt'?: string | null }>
  export type UpdateApplicationStatesResponses =
    UpdateApplicationStatesResponseOK

  export type GetApplicationStateByIdRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'pltVersion' | 'state'>;
    'id': string;
  }

  /**
   * A ApplicationState
   */
  export type GetApplicationStateByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'pltVersion'?: string | null; 'state'?: object | null; 'createdAt'?: string | null }
  export type GetApplicationStateByIdResponses =
    GetApplicationStateByIdResponseOK

  export type UpdateApplicationStateRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'pltVersion' | 'state'>;
    'id': string;
    'applicationId': string;
    'pltVersion': string;
    'state': object;
    'createdAt'?: string | null;
  }

  /**
   * A ApplicationState
   */
  export type UpdateApplicationStateResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'pltVersion'?: string | null; 'state'?: object | null; 'createdAt'?: string | null }
  export type UpdateApplicationStateResponses =
    UpdateApplicationStateResponseOK

  export type DeleteApplicationStatesRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'id' | 'pltVersion' | 'state'>;
    'id': string;
  }

  /**
   * A ApplicationState
   */
  export type DeleteApplicationStatesResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'pltVersion'?: string | null; 'state'?: object | null; 'createdAt'?: string | null }
  export type DeleteApplicationStatesResponses =
    DeleteApplicationStatesResponseOK

  export type GetDeploymentsForApplicationStateRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'namespace' | 'status'>;
    'totalCount'?: boolean;
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetDeploymentsForApplicationStateResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | 'stopped' | null; 'imageId'?: string | null; 'namespace'?: string | null; 'createdAt'?: string | null }>
  export type GetDeploymentsForApplicationStateResponses =
    GetDeploymentsForApplicationStateResponseOK

  export type GetApplicationForApplicationStateRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'name'>;
    'id': string;
  }

  /**
   * A Application
   */
  export type GetApplicationForApplicationStateResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
  export type GetApplicationForApplicationStateResponses =
    GetApplicationForApplicationStateResponseOK

  export type GetInstancesRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    /**
     * Include cursor headers in response. Cursor keys built from orderBy clause
     */
    'cursor'?: boolean;
    /**
     * Cursor for forward pagination. List objects after this cursor position
     */
    'startAfter'?: string;
    /**
     * Cursor for backward pagination. List objects before this cursor position
     */
    'endBefore'?: string;
    'fields'?: Array<'applicationId' | 'createdAt' | 'deploymentId' | 'id' | 'machineId' | 'namespace' | 'status'>;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.deploymentId.eq'?: string;
    'where.deploymentId.neq'?: string;
    'where.deploymentId.gt'?: string;
    'where.deploymentId.gte'?: string;
    'where.deploymentId.lt'?: string;
    'where.deploymentId.lte'?: string;
    'where.deploymentId.like'?: string;
    'where.deploymentId.ilike'?: string;
    'where.deploymentId.in'?: string;
    'where.deploymentId.nin'?: string;
    'where.deploymentId.contains'?: string;
    'where.deploymentId.contained'?: string;
    'where.deploymentId.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.namespace.eq'?: string;
    'where.namespace.neq'?: string;
    'where.namespace.gt'?: string;
    'where.namespace.gte'?: string;
    'where.namespace.lt'?: string;
    'where.namespace.lte'?: string;
    'where.namespace.like'?: string;
    'where.namespace.ilike'?: string;
    'where.namespace.in'?: string;
    'where.namespace.nin'?: string;
    'where.namespace.contains'?: string;
    'where.namespace.contained'?: string;
    'where.namespace.overlaps'?: string;
    'where.machineId.eq'?: string;
    'where.machineId.neq'?: string;
    'where.machineId.gt'?: string;
    'where.machineId.gte'?: string;
    'where.machineId.lt'?: string;
    'where.machineId.lte'?: string;
    'where.machineId.like'?: string;
    'where.machineId.ilike'?: string;
    'where.machineId.in'?: string;
    'where.machineId.nin'?: string;
    'where.machineId.contains'?: string;
    'where.machineId.contained'?: string;
    'where.machineId.overlaps'?: string;
    'where.status.eq'?: 'running' | 'starting' | 'stopped';
    'where.status.neq'?: 'running' | 'starting' | 'stopped';
    'where.status.gt'?: 'running' | 'starting' | 'stopped';
    'where.status.gte'?: 'running' | 'starting' | 'stopped';
    'where.status.lt'?: 'running' | 'starting' | 'stopped';
    'where.status.lte'?: 'running' | 'starting' | 'stopped';
    'where.status.like'?: 'running' | 'starting' | 'stopped';
    'where.status.ilike'?: 'running' | 'starting' | 'stopped';
    'where.status.in'?: string;
    'where.status.nin'?: string;
    'where.status.contains'?: string;
    'where.status.contained'?: string;
    'where.status.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.deploymentId'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.namespace'?: 'asc' | 'desc';
    'orderby.podId'?: 'asc' | 'desc';
    'orderby.status'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetInstancesResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'machineId'?: string | null; 'namespace'?: string | null; 'status'?: 'running' | 'starting' | 'stopped' | null; 'createdAt'?: string | null }>
  export type GetInstancesResponses =
    GetInstancesResponseOK

  export type CreateInstanceRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'deploymentId' | 'id' | 'machineId' | 'namespace' | 'status'>;
    'id'?: string;
    'applicationId': string;
    'deploymentId'?: string | null;
    'machineId': string;
    'namespace': string;
    'status': 'running' | 'starting' | 'stopped';
    'createdAt'?: string | null;
  }

  /**
   * A Instance
   */
  export type CreateInstanceResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'machineId'?: string | null; 'namespace'?: string | null; 'status'?: 'running' | 'starting' | 'stopped' | null; 'createdAt'?: string | null }
  export type CreateInstanceResponses =
    CreateInstanceResponseOK

  export type UpdateInstancesRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'deploymentId' | 'id' | 'machineId' | 'namespace' | 'status'>;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.deploymentId.eq'?: string;
    'where.deploymentId.neq'?: string;
    'where.deploymentId.gt'?: string;
    'where.deploymentId.gte'?: string;
    'where.deploymentId.lt'?: string;
    'where.deploymentId.lte'?: string;
    'where.deploymentId.like'?: string;
    'where.deploymentId.ilike'?: string;
    'where.deploymentId.in'?: string;
    'where.deploymentId.nin'?: string;
    'where.deploymentId.contains'?: string;
    'where.deploymentId.contained'?: string;
    'where.deploymentId.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.namespace.eq'?: string;
    'where.namespace.neq'?: string;
    'where.namespace.gt'?: string;
    'where.namespace.gte'?: string;
    'where.namespace.lt'?: string;
    'where.namespace.lte'?: string;
    'where.namespace.like'?: string;
    'where.namespace.ilike'?: string;
    'where.namespace.in'?: string;
    'where.namespace.nin'?: string;
    'where.namespace.contains'?: string;
    'where.namespace.contained'?: string;
    'where.namespace.overlaps'?: string;
    'where.machineId.eq'?: string;
    'where.machineId.neq'?: string;
    'where.machineId.gt'?: string;
    'where.machineId.gte'?: string;
    'where.machineId.lt'?: string;
    'where.machineId.lte'?: string;
    'where.machineId.like'?: string;
    'where.machineId.ilike'?: string;
    'where.machineId.in'?: string;
    'where.machineId.nin'?: string;
    'where.machineId.contains'?: string;
    'where.machineId.contained'?: string;
    'where.machineId.overlaps'?: string;
    'where.status.eq'?: 'running' | 'starting' | 'stopped';
    'where.status.neq'?: 'running' | 'starting' | 'stopped';
    'where.status.gt'?: 'running' | 'starting' | 'stopped';
    'where.status.gte'?: 'running' | 'starting' | 'stopped';
    'where.status.lt'?: 'running' | 'starting' | 'stopped';
    'where.status.lte'?: 'running' | 'starting' | 'stopped';
    'where.status.like'?: 'running' | 'starting' | 'stopped';
    'where.status.ilike'?: 'running' | 'starting' | 'stopped';
    'where.status.in'?: string;
    'where.status.nin'?: string;
    'where.status.contains'?: string;
    'where.status.contained'?: string;
    'where.status.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'applicationId': string;
    'deploymentId'?: string | null;
    'machineId': string;
    'namespace': string;
    'status': 'running' | 'starting' | 'stopped';
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateInstancesResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'machineId'?: string | null; 'namespace'?: string | null; 'status'?: 'running' | 'starting' | 'stopped' | null; 'createdAt'?: string | null }>
  export type UpdateInstancesResponses =
    UpdateInstancesResponseOK

  export type GetInstanceByIdRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'deploymentId' | 'id' | 'machineId' | 'namespace' | 'status'>;
    'id': string;
  }

  /**
   * A Instance
   */
  export type GetInstanceByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'machineId'?: string | null; 'namespace'?: string | null; 'status'?: 'running' | 'starting' | 'stopped' | null; 'createdAt'?: string | null }
  export type GetInstanceByIdResponses =
    GetInstanceByIdResponseOK

  export type UpdateInstanceRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'deploymentId' | 'id' | 'machineId' | 'namespace' | 'status'>;
    'id': string;
    'applicationId': string;
    'deploymentId'?: string | null;
    'machineId': string;
    'namespace': string;
    'status': 'running' | 'starting' | 'stopped';
    'createdAt'?: string | null;
  }

  /**
   * A Instance
   */
  export type UpdateInstanceResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'machineId'?: string | null; 'namespace'?: string | null; 'status'?: 'running' | 'starting' | 'stopped' | null; 'createdAt'?: string | null }
  export type UpdateInstanceResponses =
    UpdateInstanceResponseOK

  export type DeleteInstancesRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'deploymentId' | 'id' | 'machineId' | 'namespace' | 'status'>;
    'id': string;
  }

  /**
   * A Instance
   */
  export type DeleteInstancesResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'machineId'?: string | null; 'namespace'?: string | null; 'status'?: 'running' | 'starting' | 'stopped' | null; 'createdAt'?: string | null }
  export type DeleteInstancesResponses =
    DeleteInstancesResponseOK

  export type GetApplicationForInstanceRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'name'>;
    'id': string;
  }

  /**
   * A Application
   */
  export type GetApplicationForInstanceResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
  export type GetApplicationForInstanceResponses =
    GetApplicationForInstanceResponseOK

  export type GetDeploymentForInstanceRequest = {
    'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'namespace' | 'status'>;
    'id': string;
  }

  /**
   * A Deployment
   */
  export type GetDeploymentForInstanceResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | 'stopped' | null; 'imageId'?: string | null; 'namespace'?: string | null; 'createdAt'?: string | null }
  export type GetDeploymentForInstanceResponses =
    GetDeploymentForInstanceResponseOK

  export type GetValkeyUsersRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    /**
     * Include cursor headers in response. Cursor keys built from orderBy clause
     */
    'cursor'?: boolean;
    /**
     * Cursor for forward pagination. List objects after this cursor position
     */
    'startAfter'?: string;
    /**
     * Cursor for backward pagination. List objects before this cursor position
     */
    'endBefore'?: string;
    'fields'?: Array<'applicationId' | 'createdAt' | 'encryptedPassword' | 'id' | 'keyPrefix' | 'username'>;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.encryptedPassword.eq'?: string;
    'where.encryptedPassword.neq'?: string;
    'where.encryptedPassword.gt'?: string;
    'where.encryptedPassword.gte'?: string;
    'where.encryptedPassword.lt'?: string;
    'where.encryptedPassword.lte'?: string;
    'where.encryptedPassword.like'?: string;
    'where.encryptedPassword.ilike'?: string;
    'where.encryptedPassword.in'?: string;
    'where.encryptedPassword.nin'?: string;
    'where.encryptedPassword.contains'?: string;
    'where.encryptedPassword.contained'?: string;
    'where.encryptedPassword.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.keyPrefix.eq'?: string;
    'where.keyPrefix.neq'?: string;
    'where.keyPrefix.gt'?: string;
    'where.keyPrefix.gte'?: string;
    'where.keyPrefix.lt'?: string;
    'where.keyPrefix.lte'?: string;
    'where.keyPrefix.like'?: string;
    'where.keyPrefix.ilike'?: string;
    'where.keyPrefix.in'?: string;
    'where.keyPrefix.nin'?: string;
    'where.keyPrefix.contains'?: string;
    'where.keyPrefix.contained'?: string;
    'where.keyPrefix.overlaps'?: string;
    'where.username.eq'?: string;
    'where.username.neq'?: string;
    'where.username.gt'?: string;
    'where.username.gte'?: string;
    'where.username.lt'?: string;
    'where.username.lte'?: string;
    'where.username.like'?: string;
    'where.username.ilike'?: string;
    'where.username.in'?: string;
    'where.username.nin'?: string;
    'where.username.contains'?: string;
    'where.username.contained'?: string;
    'where.username.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.encryptedPassword'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.keyPrefix'?: 'asc' | 'desc';
    'orderby.username'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetValkeyUsersResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'username'?: string | null; 'encryptedPassword'?: string | null; 'keyPrefix'?: string | null; 'createdAt'?: string | null }>
  export type GetValkeyUsersResponses =
    GetValkeyUsersResponseOK

  export type CreateValkeyUserRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'encryptedPassword' | 'id' | 'keyPrefix' | 'username'>;
    'id'?: string;
    'applicationId': string;
    'username': string;
    'encryptedPassword': string;
    'keyPrefix': string;
    'createdAt'?: string | null;
  }

  /**
   * A ValkeyUser
   */
  export type CreateValkeyUserResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'username'?: string | null; 'encryptedPassword'?: string | null; 'keyPrefix'?: string | null; 'createdAt'?: string | null }
  export type CreateValkeyUserResponses =
    CreateValkeyUserResponseOK

  export type UpdateValkeyUsersRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'encryptedPassword' | 'id' | 'keyPrefix' | 'username'>;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.encryptedPassword.eq'?: string;
    'where.encryptedPassword.neq'?: string;
    'where.encryptedPassword.gt'?: string;
    'where.encryptedPassword.gte'?: string;
    'where.encryptedPassword.lt'?: string;
    'where.encryptedPassword.lte'?: string;
    'where.encryptedPassword.like'?: string;
    'where.encryptedPassword.ilike'?: string;
    'where.encryptedPassword.in'?: string;
    'where.encryptedPassword.nin'?: string;
    'where.encryptedPassword.contains'?: string;
    'where.encryptedPassword.contained'?: string;
    'where.encryptedPassword.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.keyPrefix.eq'?: string;
    'where.keyPrefix.neq'?: string;
    'where.keyPrefix.gt'?: string;
    'where.keyPrefix.gte'?: string;
    'where.keyPrefix.lt'?: string;
    'where.keyPrefix.lte'?: string;
    'where.keyPrefix.like'?: string;
    'where.keyPrefix.ilike'?: string;
    'where.keyPrefix.in'?: string;
    'where.keyPrefix.nin'?: string;
    'where.keyPrefix.contains'?: string;
    'where.keyPrefix.contained'?: string;
    'where.keyPrefix.overlaps'?: string;
    'where.username.eq'?: string;
    'where.username.neq'?: string;
    'where.username.gt'?: string;
    'where.username.gte'?: string;
    'where.username.lt'?: string;
    'where.username.lte'?: string;
    'where.username.like'?: string;
    'where.username.ilike'?: string;
    'where.username.in'?: string;
    'where.username.nin'?: string;
    'where.username.contains'?: string;
    'where.username.contained'?: string;
    'where.username.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'applicationId': string;
    'username': string;
    'encryptedPassword': string;
    'keyPrefix': string;
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateValkeyUsersResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'username'?: string | null; 'encryptedPassword'?: string | null; 'keyPrefix'?: string | null; 'createdAt'?: string | null }>
  export type UpdateValkeyUsersResponses =
    UpdateValkeyUsersResponseOK

  export type GetValkeyUserByIdRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'encryptedPassword' | 'id' | 'keyPrefix' | 'username'>;
    'id': string;
  }

  /**
   * A ValkeyUser
   */
  export type GetValkeyUserByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'username'?: string | null; 'encryptedPassword'?: string | null; 'keyPrefix'?: string | null; 'createdAt'?: string | null }
  export type GetValkeyUserByIdResponses =
    GetValkeyUserByIdResponseOK

  export type UpdateValkeyUserRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'encryptedPassword' | 'id' | 'keyPrefix' | 'username'>;
    'id': string;
    'applicationId': string;
    'username': string;
    'encryptedPassword': string;
    'keyPrefix': string;
    'createdAt'?: string | null;
  }

  /**
   * A ValkeyUser
   */
  export type UpdateValkeyUserResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'username'?: string | null; 'encryptedPassword'?: string | null; 'keyPrefix'?: string | null; 'createdAt'?: string | null }
  export type UpdateValkeyUserResponses =
    UpdateValkeyUserResponseOK

  export type DeleteValkeyUsersRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'encryptedPassword' | 'id' | 'keyPrefix' | 'username'>;
    'id': string;
  }

  /**
   * A ValkeyUser
   */
  export type DeleteValkeyUsersResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'username'?: string | null; 'encryptedPassword'?: string | null; 'keyPrefix'?: string | null; 'createdAt'?: string | null }
  export type DeleteValkeyUsersResponses =
    DeleteValkeyUsersResponseOK

  export type GetApplicationForValkeyUserRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'name'>;
    'id': string;
  }

  /**
   * A Application
   */
  export type GetApplicationForValkeyUserResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
  export type GetApplicationForValkeyUserResponses =
    GetApplicationForValkeyUserResponseOK

  export type GetGenerationsDeploymentsRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    /**
     * Include cursor headers in response. Cursor keys built from orderBy clause
     */
    'cursor'?: boolean;
    /**
     * Cursor for forward pagination. List objects after this cursor position
     */
    'startAfter'?: string;
    /**
     * Cursor for backward pagination. List objects before this cursor position
     */
    'endBefore'?: string;
    'fields'?: Array<'deploymentId' | 'generationId'>;
    'where.deploymentId.eq'?: string;
    'where.deploymentId.neq'?: string;
    'where.deploymentId.gt'?: string;
    'where.deploymentId.gte'?: string;
    'where.deploymentId.lt'?: string;
    'where.deploymentId.lte'?: string;
    'where.deploymentId.like'?: string;
    'where.deploymentId.ilike'?: string;
    'where.deploymentId.in'?: string;
    'where.deploymentId.nin'?: string;
    'where.deploymentId.contains'?: string;
    'where.deploymentId.contained'?: string;
    'where.deploymentId.overlaps'?: string;
    'where.generationId.eq'?: string;
    'where.generationId.neq'?: string;
    'where.generationId.gt'?: string;
    'where.generationId.gte'?: string;
    'where.generationId.lt'?: string;
    'where.generationId.lte'?: string;
    'where.generationId.like'?: string;
    'where.generationId.ilike'?: string;
    'where.generationId.in'?: string;
    'where.generationId.nin'?: string;
    'where.generationId.contains'?: string;
    'where.generationId.contained'?: string;
    'where.generationId.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.deploymentId'?: 'asc' | 'desc';
    'orderby.generationId'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetGenerationsDeploymentsResponseOK = Array<{ 'generationId'?: string | null; 'deploymentId'?: string | null }>
  export type GetGenerationsDeploymentsResponses =
    GetGenerationsDeploymentsResponseOK

  export type CreateGenerationsDeploymentRequest = {
    'fields'?: Array<'deploymentId' | 'generationId'>;
    'generationId': string;
    'deploymentId': string;
  }

  /**
   * A GenerationsDeployment
   */
  export type CreateGenerationsDeploymentResponseOK = { 'generationId'?: string | null; 'deploymentId'?: string | null }
  export type CreateGenerationsDeploymentResponses =
    CreateGenerationsDeploymentResponseOK

  export type UpdateGenerationsDeploymentsRequest = {
    'fields'?: Array<'deploymentId' | 'generationId'>;
    'where.deploymentId.eq'?: string;
    'where.deploymentId.neq'?: string;
    'where.deploymentId.gt'?: string;
    'where.deploymentId.gte'?: string;
    'where.deploymentId.lt'?: string;
    'where.deploymentId.lte'?: string;
    'where.deploymentId.like'?: string;
    'where.deploymentId.ilike'?: string;
    'where.deploymentId.in'?: string;
    'where.deploymentId.nin'?: string;
    'where.deploymentId.contains'?: string;
    'where.deploymentId.contained'?: string;
    'where.deploymentId.overlaps'?: string;
    'where.generationId.eq'?: string;
    'where.generationId.neq'?: string;
    'where.generationId.gt'?: string;
    'where.generationId.gte'?: string;
    'where.generationId.lt'?: string;
    'where.generationId.lte'?: string;
    'where.generationId.like'?: string;
    'where.generationId.ilike'?: string;
    'where.generationId.in'?: string;
    'where.generationId.nin'?: string;
    'where.generationId.contains'?: string;
    'where.generationId.contained'?: string;
    'where.generationId.overlaps'?: string;
    'where.or'?: Array<string>;
    'generationId': string;
    'deploymentId': string;
  }

  /**
   * Default Response
   */
  export type UpdateGenerationsDeploymentsResponseOK = Array<{ 'generationId'?: string | null; 'deploymentId'?: string | null }>
  export type UpdateGenerationsDeploymentsResponses =
    UpdateGenerationsDeploymentsResponseOK

  export type GetGenerationsDeploymentByGenerationIdAndDeploymentIdRequest = {
    'fields'?: Array<'deploymentId' | 'generationId'>;
    'generationId': string;
    'deploymentId': string;
  }

  /**
   * A GenerationsDeployment
   */
  export type GetGenerationsDeploymentByGenerationIdAndDeploymentIdResponseOK = { 'generationId'?: string | null; 'deploymentId'?: string | null }
  export type GetGenerationsDeploymentByGenerationIdAndDeploymentIdResponses =
    GetGenerationsDeploymentByGenerationIdAndDeploymentIdResponseOK

  export type PostGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdRequest = {
    'fields'?: Array<'deploymentId' | 'generationId'>;
    'generationId': string;
    'deploymentId': string;
  }

  /**
   * A GenerationsDeployment
   */
  export type PostGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponseOK = { 'generationId'?: string | null; 'deploymentId'?: string | null }
  export type PostGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponses =
    PostGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponseOK

  export type PutGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdRequest = {
    'fields'?: Array<'deploymentId' | 'generationId'>;
    'generationId': string;
    'deploymentId': string;
  }

  /**
   * A GenerationsDeployment
   */
  export type PutGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponseOK = { 'generationId'?: string | null; 'deploymentId'?: string | null }
  export type PutGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponses =
    PutGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponseOK

  export type DeleteGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdRequest = {
    'fields'?: Array<'deploymentId' | 'generationId'>;
    'generationId': string;
    'deploymentId': string;
  }

  /**
   * A GenerationsDeployment
   */
  export type DeleteGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponseOK = { 'generationId'?: string | null; 'deploymentId'?: string | null }
  export type DeleteGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponses =
    DeleteGenerationsDeploymentsGenerationGenerationIdDeploymentDeploymentIdResponseOK

  export type GetGenerationsApplicationsConfigsRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    /**
     * Include cursor headers in response. Cursor keys built from orderBy clause
     */
    'cursor'?: boolean;
    /**
     * Cursor for forward pagination. List objects after this cursor position
     */
    'startAfter'?: string;
    /**
     * Cursor for backward pagination. List objects before this cursor position
     */
    'endBefore'?: string;
    'fields'?: Array<'configId' | 'generationId'>;
    'where.configId.eq'?: string;
    'where.configId.neq'?: string;
    'where.configId.gt'?: string;
    'where.configId.gte'?: string;
    'where.configId.lt'?: string;
    'where.configId.lte'?: string;
    'where.configId.like'?: string;
    'where.configId.ilike'?: string;
    'where.configId.in'?: string;
    'where.configId.nin'?: string;
    'where.configId.contains'?: string;
    'where.configId.contained'?: string;
    'where.configId.overlaps'?: string;
    'where.generationId.eq'?: string;
    'where.generationId.neq'?: string;
    'where.generationId.gt'?: string;
    'where.generationId.gte'?: string;
    'where.generationId.lt'?: string;
    'where.generationId.lte'?: string;
    'where.generationId.like'?: string;
    'where.generationId.ilike'?: string;
    'where.generationId.in'?: string;
    'where.generationId.nin'?: string;
    'where.generationId.contains'?: string;
    'where.generationId.contained'?: string;
    'where.generationId.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.configId'?: 'asc' | 'desc';
    'orderby.generationId'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetGenerationsApplicationsConfigsResponseOK = Array<{ 'generationId'?: string | null; 'configId'?: string | null }>
  export type GetGenerationsApplicationsConfigsResponses =
    GetGenerationsApplicationsConfigsResponseOK

  export type CreateGenerationsApplicationsConfigRequest = {
    'fields'?: Array<'configId' | 'generationId'>;
    'generationId': string;
    'configId': string;
  }

  /**
   * A GenerationsApplicationsConfig
   */
  export type CreateGenerationsApplicationsConfigResponseOK = { 'generationId'?: string | null; 'configId'?: string | null }
  export type CreateGenerationsApplicationsConfigResponses =
    CreateGenerationsApplicationsConfigResponseOK

  export type UpdateGenerationsApplicationsConfigsRequest = {
    'fields'?: Array<'configId' | 'generationId'>;
    'where.configId.eq'?: string;
    'where.configId.neq'?: string;
    'where.configId.gt'?: string;
    'where.configId.gte'?: string;
    'where.configId.lt'?: string;
    'where.configId.lte'?: string;
    'where.configId.like'?: string;
    'where.configId.ilike'?: string;
    'where.configId.in'?: string;
    'where.configId.nin'?: string;
    'where.configId.contains'?: string;
    'where.configId.contained'?: string;
    'where.configId.overlaps'?: string;
    'where.generationId.eq'?: string;
    'where.generationId.neq'?: string;
    'where.generationId.gt'?: string;
    'where.generationId.gte'?: string;
    'where.generationId.lt'?: string;
    'where.generationId.lte'?: string;
    'where.generationId.like'?: string;
    'where.generationId.ilike'?: string;
    'where.generationId.in'?: string;
    'where.generationId.nin'?: string;
    'where.generationId.contains'?: string;
    'where.generationId.contained'?: string;
    'where.generationId.overlaps'?: string;
    'where.or'?: Array<string>;
    'generationId': string;
    'configId': string;
  }

  /**
   * Default Response
   */
  export type UpdateGenerationsApplicationsConfigsResponseOK = Array<{ 'generationId'?: string | null; 'configId'?: string | null }>
  export type UpdateGenerationsApplicationsConfigsResponses =
    UpdateGenerationsApplicationsConfigsResponseOK

  export type GetGenerationsApplicationsConfigByGenerationIdAndConfigIdRequest = {
    'fields'?: Array<'configId' | 'generationId'>;
    'generationId': string;
    'configId': string;
  }

  /**
   * A GenerationsApplicationsConfig
   */
  export type GetGenerationsApplicationsConfigByGenerationIdAndConfigIdResponseOK = { 'generationId'?: string | null; 'configId'?: string | null }
  export type GetGenerationsApplicationsConfigByGenerationIdAndConfigIdResponses =
    GetGenerationsApplicationsConfigByGenerationIdAndConfigIdResponseOK

  export type PostGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdRequest = {
    'fields'?: Array<'configId' | 'generationId'>;
    'generationId': string;
    'configId': string;
  }

  /**
   * A GenerationsApplicationsConfig
   */
  export type PostGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponseOK = { 'generationId'?: string | null; 'configId'?: string | null }
  export type PostGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponses =
    PostGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponseOK

  export type PutGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdRequest = {
    'fields'?: Array<'configId' | 'generationId'>;
    'generationId': string;
    'configId': string;
  }

  /**
   * A GenerationsApplicationsConfig
   */
  export type PutGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponseOK = { 'generationId'?: string | null; 'configId'?: string | null }
  export type PutGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponses =
    PutGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponseOK

  export type DeleteGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdRequest = {
    'fields'?: Array<'configId' | 'generationId'>;
    'generationId': string;
    'configId': string;
  }

  /**
   * A GenerationsApplicationsConfig
   */
  export type DeleteGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponseOK = { 'generationId'?: string | null; 'configId'?: string | null }
  export type DeleteGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponses =
    DeleteGenerationsApplicationsConfigsGenerationGenerationIdApplicationsConfigConfigIdResponseOK

  export type GetVersionRegistryRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    /**
     * Include cursor headers in response. Cursor keys built from orderBy clause
     */
    'cursor'?: boolean;
    /**
     * Cursor for forward pagination. List objects after this cursor position
     */
    'startAfter'?: string;
    /**
     * Cursor for backward pagination. List objects before this cursor position
     */
    'endBefore'?: string;
    'fields'?: Array<'appLabel' | 'applicationId' | 'createdAt' | 'deploymentId' | 'drainedAt' | 'expirePolicy' | 'expiredAt' | 'hostname' | 'id' | 'k8SDeploymentName' | 'namespace' | 'pathPrefix' | 'serviceName' | 'servicePort' | 'status' | 'versionLabel'>;
    'where.appLabel.eq'?: string;
    'where.appLabel.neq'?: string;
    'where.appLabel.gt'?: string;
    'where.appLabel.gte'?: string;
    'where.appLabel.lt'?: string;
    'where.appLabel.lte'?: string;
    'where.appLabel.like'?: string;
    'where.appLabel.ilike'?: string;
    'where.appLabel.in'?: string;
    'where.appLabel.nin'?: string;
    'where.appLabel.contains'?: string;
    'where.appLabel.contained'?: string;
    'where.appLabel.overlaps'?: string;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.deploymentId.eq'?: string;
    'where.deploymentId.neq'?: string;
    'where.deploymentId.gt'?: string;
    'where.deploymentId.gte'?: string;
    'where.deploymentId.lt'?: string;
    'where.deploymentId.lte'?: string;
    'where.deploymentId.like'?: string;
    'where.deploymentId.ilike'?: string;
    'where.deploymentId.in'?: string;
    'where.deploymentId.nin'?: string;
    'where.deploymentId.contains'?: string;
    'where.deploymentId.contained'?: string;
    'where.deploymentId.overlaps'?: string;
    'where.drainedAt.eq'?: string;
    'where.drainedAt.neq'?: string;
    'where.drainedAt.gt'?: string;
    'where.drainedAt.gte'?: string;
    'where.drainedAt.lt'?: string;
    'where.drainedAt.lte'?: string;
    'where.drainedAt.like'?: string;
    'where.drainedAt.ilike'?: string;
    'where.drainedAt.in'?: string;
    'where.drainedAt.nin'?: string;
    'where.drainedAt.contains'?: string;
    'where.drainedAt.contained'?: string;
    'where.drainedAt.overlaps'?: string;
    'where.expirePolicy.eq'?: string;
    'where.expirePolicy.neq'?: string;
    'where.expirePolicy.gt'?: string;
    'where.expirePolicy.gte'?: string;
    'where.expirePolicy.lt'?: string;
    'where.expirePolicy.lte'?: string;
    'where.expirePolicy.like'?: string;
    'where.expirePolicy.ilike'?: string;
    'where.expirePolicy.in'?: string;
    'where.expirePolicy.nin'?: string;
    'where.expirePolicy.contains'?: string;
    'where.expirePolicy.contained'?: string;
    'where.expirePolicy.overlaps'?: string;
    'where.expiredAt.eq'?: string;
    'where.expiredAt.neq'?: string;
    'where.expiredAt.gt'?: string;
    'where.expiredAt.gte'?: string;
    'where.expiredAt.lt'?: string;
    'where.expiredAt.lte'?: string;
    'where.expiredAt.like'?: string;
    'where.expiredAt.ilike'?: string;
    'where.expiredAt.in'?: string;
    'where.expiredAt.nin'?: string;
    'where.expiredAt.contains'?: string;
    'where.expiredAt.contained'?: string;
    'where.expiredAt.overlaps'?: string;
    'where.hostname.eq'?: string;
    'where.hostname.neq'?: string;
    'where.hostname.gt'?: string;
    'where.hostname.gte'?: string;
    'where.hostname.lt'?: string;
    'where.hostname.lte'?: string;
    'where.hostname.like'?: string;
    'where.hostname.ilike'?: string;
    'where.hostname.in'?: string;
    'where.hostname.nin'?: string;
    'where.hostname.contains'?: string;
    'where.hostname.contained'?: string;
    'where.hostname.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.k8SDeploymentName.eq'?: string;
    'where.k8SDeploymentName.neq'?: string;
    'where.k8SDeploymentName.gt'?: string;
    'where.k8SDeploymentName.gte'?: string;
    'where.k8SDeploymentName.lt'?: string;
    'where.k8SDeploymentName.lte'?: string;
    'where.k8SDeploymentName.like'?: string;
    'where.k8SDeploymentName.ilike'?: string;
    'where.k8SDeploymentName.in'?: string;
    'where.k8SDeploymentName.nin'?: string;
    'where.k8SDeploymentName.contains'?: string;
    'where.k8SDeploymentName.contained'?: string;
    'where.k8SDeploymentName.overlaps'?: string;
    'where.namespace.eq'?: string;
    'where.namespace.neq'?: string;
    'where.namespace.gt'?: string;
    'where.namespace.gte'?: string;
    'where.namespace.lt'?: string;
    'where.namespace.lte'?: string;
    'where.namespace.like'?: string;
    'where.namespace.ilike'?: string;
    'where.namespace.in'?: string;
    'where.namespace.nin'?: string;
    'where.namespace.contains'?: string;
    'where.namespace.contained'?: string;
    'where.namespace.overlaps'?: string;
    'where.pathPrefix.eq'?: string;
    'where.pathPrefix.neq'?: string;
    'where.pathPrefix.gt'?: string;
    'where.pathPrefix.gte'?: string;
    'where.pathPrefix.lt'?: string;
    'where.pathPrefix.lte'?: string;
    'where.pathPrefix.like'?: string;
    'where.pathPrefix.ilike'?: string;
    'where.pathPrefix.in'?: string;
    'where.pathPrefix.nin'?: string;
    'where.pathPrefix.contains'?: string;
    'where.pathPrefix.contained'?: string;
    'where.pathPrefix.overlaps'?: string;
    'where.serviceName.eq'?: string;
    'where.serviceName.neq'?: string;
    'where.serviceName.gt'?: string;
    'where.serviceName.gte'?: string;
    'where.serviceName.lt'?: string;
    'where.serviceName.lte'?: string;
    'where.serviceName.like'?: string;
    'where.serviceName.ilike'?: string;
    'where.serviceName.in'?: string;
    'where.serviceName.nin'?: string;
    'where.serviceName.contains'?: string;
    'where.serviceName.contained'?: string;
    'where.serviceName.overlaps'?: string;
    'where.servicePort.eq'?: number;
    'where.servicePort.neq'?: number;
    'where.servicePort.gt'?: number;
    'where.servicePort.gte'?: number;
    'where.servicePort.lt'?: number;
    'where.servicePort.lte'?: number;
    'where.servicePort.like'?: number;
    'where.servicePort.ilike'?: number;
    'where.servicePort.in'?: string;
    'where.servicePort.nin'?: string;
    'where.servicePort.contains'?: string;
    'where.servicePort.contained'?: string;
    'where.servicePort.overlaps'?: string;
    'where.status.eq'?: 'active' | 'draining' | 'expired';
    'where.status.neq'?: 'active' | 'draining' | 'expired';
    'where.status.gt'?: 'active' | 'draining' | 'expired';
    'where.status.gte'?: 'active' | 'draining' | 'expired';
    'where.status.lt'?: 'active' | 'draining' | 'expired';
    'where.status.lte'?: 'active' | 'draining' | 'expired';
    'where.status.like'?: 'active' | 'draining' | 'expired';
    'where.status.ilike'?: 'active' | 'draining' | 'expired';
    'where.status.in'?: string;
    'where.status.nin'?: string;
    'where.status.contains'?: string;
    'where.status.contained'?: string;
    'where.status.overlaps'?: string;
    'where.versionLabel.eq'?: string;
    'where.versionLabel.neq'?: string;
    'where.versionLabel.gt'?: string;
    'where.versionLabel.gte'?: string;
    'where.versionLabel.lt'?: string;
    'where.versionLabel.lte'?: string;
    'where.versionLabel.like'?: string;
    'where.versionLabel.ilike'?: string;
    'where.versionLabel.in'?: string;
    'where.versionLabel.nin'?: string;
    'where.versionLabel.contains'?: string;
    'where.versionLabel.contained'?: string;
    'where.versionLabel.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.appLabel'?: 'asc' | 'desc';
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.deploymentId'?: 'asc' | 'desc';
    'orderby.drainedAt'?: 'asc' | 'desc';
    'orderby.expirePolicy'?: 'asc' | 'desc';
    'orderby.expiredAt'?: 'asc' | 'desc';
    'orderby.hostname'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.k8SDeploymentName'?: 'asc' | 'desc';
    'orderby.namespace'?: 'asc' | 'desc';
    'orderby.pathPrefix'?: 'asc' | 'desc';
    'orderby.serviceName'?: 'asc' | 'desc';
    'orderby.servicePort'?: 'asc' | 'desc';
    'orderby.status'?: 'asc' | 'desc';
    'orderby.versionLabel'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetVersionRegistryResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'appLabel'?: string | null; 'versionLabel'?: string | null; 'k8SDeploymentName'?: string | null; 'serviceName'?: string | null; 'servicePort'?: number | null; 'namespace'?: string | null; 'pathPrefix'?: string | null; 'hostname'?: string | null; 'status'?: 'active' | 'draining' | 'expired' | null; 'expirePolicy'?: string | null; 'drainedAt'?: string | null; 'expiredAt'?: string | null; 'createdAt'?: string | null }>
  export type GetVersionRegistryResponses =
    GetVersionRegistryResponseOK

  export type CreateVersionRegistryRequest = {
    'fields'?: Array<'appLabel' | 'applicationId' | 'createdAt' | 'deploymentId' | 'drainedAt' | 'expirePolicy' | 'expiredAt' | 'hostname' | 'id' | 'k8SDeploymentName' | 'namespace' | 'pathPrefix' | 'serviceName' | 'servicePort' | 'status' | 'versionLabel'>;
    'id'?: string;
    'applicationId': string;
    'deploymentId': string;
    'appLabel': string;
    'versionLabel': string;
    'k8SDeploymentName': string;
    'serviceName': string;
    'servicePort': number;
    'namespace': string;
    'pathPrefix': string;
    'hostname'?: string | null;
    'status': 'active' | 'draining' | 'expired';
    'expirePolicy': string;
    'drainedAt'?: string | null;
    'expiredAt'?: string | null;
    'createdAt'?: string | null;
  }

  /**
   * A VersionRegistry
   */
  export type CreateVersionRegistryResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'appLabel'?: string | null; 'versionLabel'?: string | null; 'k8SDeploymentName'?: string | null; 'serviceName'?: string | null; 'servicePort'?: number | null; 'namespace'?: string | null; 'pathPrefix'?: string | null; 'hostname'?: string | null; 'status'?: 'active' | 'draining' | 'expired' | null; 'expirePolicy'?: string | null; 'drainedAt'?: string | null; 'expiredAt'?: string | null; 'createdAt'?: string | null }
  export type CreateVersionRegistryResponses =
    CreateVersionRegistryResponseOK

  export type UpdateVersionRegistryRequest = {
    'fields'?: Array<'appLabel' | 'applicationId' | 'createdAt' | 'deploymentId' | 'drainedAt' | 'expirePolicy' | 'expiredAt' | 'hostname' | 'id' | 'k8SDeploymentName' | 'namespace' | 'pathPrefix' | 'serviceName' | 'servicePort' | 'status' | 'versionLabel'>;
    'where.appLabel.eq'?: string;
    'where.appLabel.neq'?: string;
    'where.appLabel.gt'?: string;
    'where.appLabel.gte'?: string;
    'where.appLabel.lt'?: string;
    'where.appLabel.lte'?: string;
    'where.appLabel.like'?: string;
    'where.appLabel.ilike'?: string;
    'where.appLabel.in'?: string;
    'where.appLabel.nin'?: string;
    'where.appLabel.contains'?: string;
    'where.appLabel.contained'?: string;
    'where.appLabel.overlaps'?: string;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.deploymentId.eq'?: string;
    'where.deploymentId.neq'?: string;
    'where.deploymentId.gt'?: string;
    'where.deploymentId.gte'?: string;
    'where.deploymentId.lt'?: string;
    'where.deploymentId.lte'?: string;
    'where.deploymentId.like'?: string;
    'where.deploymentId.ilike'?: string;
    'where.deploymentId.in'?: string;
    'where.deploymentId.nin'?: string;
    'where.deploymentId.contains'?: string;
    'where.deploymentId.contained'?: string;
    'where.deploymentId.overlaps'?: string;
    'where.drainedAt.eq'?: string;
    'where.drainedAt.neq'?: string;
    'where.drainedAt.gt'?: string;
    'where.drainedAt.gte'?: string;
    'where.drainedAt.lt'?: string;
    'where.drainedAt.lte'?: string;
    'where.drainedAt.like'?: string;
    'where.drainedAt.ilike'?: string;
    'where.drainedAt.in'?: string;
    'where.drainedAt.nin'?: string;
    'where.drainedAt.contains'?: string;
    'where.drainedAt.contained'?: string;
    'where.drainedAt.overlaps'?: string;
    'where.expirePolicy.eq'?: string;
    'where.expirePolicy.neq'?: string;
    'where.expirePolicy.gt'?: string;
    'where.expirePolicy.gte'?: string;
    'where.expirePolicy.lt'?: string;
    'where.expirePolicy.lte'?: string;
    'where.expirePolicy.like'?: string;
    'where.expirePolicy.ilike'?: string;
    'where.expirePolicy.in'?: string;
    'where.expirePolicy.nin'?: string;
    'where.expirePolicy.contains'?: string;
    'where.expirePolicy.contained'?: string;
    'where.expirePolicy.overlaps'?: string;
    'where.expiredAt.eq'?: string;
    'where.expiredAt.neq'?: string;
    'where.expiredAt.gt'?: string;
    'where.expiredAt.gte'?: string;
    'where.expiredAt.lt'?: string;
    'where.expiredAt.lte'?: string;
    'where.expiredAt.like'?: string;
    'where.expiredAt.ilike'?: string;
    'where.expiredAt.in'?: string;
    'where.expiredAt.nin'?: string;
    'where.expiredAt.contains'?: string;
    'where.expiredAt.contained'?: string;
    'where.expiredAt.overlaps'?: string;
    'where.hostname.eq'?: string;
    'where.hostname.neq'?: string;
    'where.hostname.gt'?: string;
    'where.hostname.gte'?: string;
    'where.hostname.lt'?: string;
    'where.hostname.lte'?: string;
    'where.hostname.like'?: string;
    'where.hostname.ilike'?: string;
    'where.hostname.in'?: string;
    'where.hostname.nin'?: string;
    'where.hostname.contains'?: string;
    'where.hostname.contained'?: string;
    'where.hostname.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.k8SDeploymentName.eq'?: string;
    'where.k8SDeploymentName.neq'?: string;
    'where.k8SDeploymentName.gt'?: string;
    'where.k8SDeploymentName.gte'?: string;
    'where.k8SDeploymentName.lt'?: string;
    'where.k8SDeploymentName.lte'?: string;
    'where.k8SDeploymentName.like'?: string;
    'where.k8SDeploymentName.ilike'?: string;
    'where.k8SDeploymentName.in'?: string;
    'where.k8SDeploymentName.nin'?: string;
    'where.k8SDeploymentName.contains'?: string;
    'where.k8SDeploymentName.contained'?: string;
    'where.k8SDeploymentName.overlaps'?: string;
    'where.namespace.eq'?: string;
    'where.namespace.neq'?: string;
    'where.namespace.gt'?: string;
    'where.namespace.gte'?: string;
    'where.namespace.lt'?: string;
    'where.namespace.lte'?: string;
    'where.namespace.like'?: string;
    'where.namespace.ilike'?: string;
    'where.namespace.in'?: string;
    'where.namespace.nin'?: string;
    'where.namespace.contains'?: string;
    'where.namespace.contained'?: string;
    'where.namespace.overlaps'?: string;
    'where.pathPrefix.eq'?: string;
    'where.pathPrefix.neq'?: string;
    'where.pathPrefix.gt'?: string;
    'where.pathPrefix.gte'?: string;
    'where.pathPrefix.lt'?: string;
    'where.pathPrefix.lte'?: string;
    'where.pathPrefix.like'?: string;
    'where.pathPrefix.ilike'?: string;
    'where.pathPrefix.in'?: string;
    'where.pathPrefix.nin'?: string;
    'where.pathPrefix.contains'?: string;
    'where.pathPrefix.contained'?: string;
    'where.pathPrefix.overlaps'?: string;
    'where.serviceName.eq'?: string;
    'where.serviceName.neq'?: string;
    'where.serviceName.gt'?: string;
    'where.serviceName.gte'?: string;
    'where.serviceName.lt'?: string;
    'where.serviceName.lte'?: string;
    'where.serviceName.like'?: string;
    'where.serviceName.ilike'?: string;
    'where.serviceName.in'?: string;
    'where.serviceName.nin'?: string;
    'where.serviceName.contains'?: string;
    'where.serviceName.contained'?: string;
    'where.serviceName.overlaps'?: string;
    'where.servicePort.eq'?: number;
    'where.servicePort.neq'?: number;
    'where.servicePort.gt'?: number;
    'where.servicePort.gte'?: number;
    'where.servicePort.lt'?: number;
    'where.servicePort.lte'?: number;
    'where.servicePort.like'?: number;
    'where.servicePort.ilike'?: number;
    'where.servicePort.in'?: string;
    'where.servicePort.nin'?: string;
    'where.servicePort.contains'?: string;
    'where.servicePort.contained'?: string;
    'where.servicePort.overlaps'?: string;
    'where.status.eq'?: 'active' | 'draining' | 'expired';
    'where.status.neq'?: 'active' | 'draining' | 'expired';
    'where.status.gt'?: 'active' | 'draining' | 'expired';
    'where.status.gte'?: 'active' | 'draining' | 'expired';
    'where.status.lt'?: 'active' | 'draining' | 'expired';
    'where.status.lte'?: 'active' | 'draining' | 'expired';
    'where.status.like'?: 'active' | 'draining' | 'expired';
    'where.status.ilike'?: 'active' | 'draining' | 'expired';
    'where.status.in'?: string;
    'where.status.nin'?: string;
    'where.status.contains'?: string;
    'where.status.contained'?: string;
    'where.status.overlaps'?: string;
    'where.versionLabel.eq'?: string;
    'where.versionLabel.neq'?: string;
    'where.versionLabel.gt'?: string;
    'where.versionLabel.gte'?: string;
    'where.versionLabel.lt'?: string;
    'where.versionLabel.lte'?: string;
    'where.versionLabel.like'?: string;
    'where.versionLabel.ilike'?: string;
    'where.versionLabel.in'?: string;
    'where.versionLabel.nin'?: string;
    'where.versionLabel.contains'?: string;
    'where.versionLabel.contained'?: string;
    'where.versionLabel.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'applicationId': string;
    'deploymentId': string;
    'appLabel': string;
    'versionLabel': string;
    'k8SDeploymentName': string;
    'serviceName': string;
    'servicePort': number;
    'namespace': string;
    'pathPrefix': string;
    'hostname'?: string | null;
    'status': 'active' | 'draining' | 'expired';
    'expirePolicy': string;
    'drainedAt'?: string | null;
    'expiredAt'?: string | null;
    'createdAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateVersionRegistryResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'appLabel'?: string | null; 'versionLabel'?: string | null; 'k8SDeploymentName'?: string | null; 'serviceName'?: string | null; 'servicePort'?: number | null; 'namespace'?: string | null; 'pathPrefix'?: string | null; 'hostname'?: string | null; 'status'?: 'active' | 'draining' | 'expired' | null; 'expirePolicy'?: string | null; 'drainedAt'?: string | null; 'expiredAt'?: string | null; 'createdAt'?: string | null }>
  export type UpdateVersionRegistryResponses =
    UpdateVersionRegistryResponseOK

  export type GetVersionRegistryByIdRequest = {
    'fields'?: Array<'appLabel' | 'applicationId' | 'createdAt' | 'deploymentId' | 'drainedAt' | 'expirePolicy' | 'expiredAt' | 'hostname' | 'id' | 'k8SDeploymentName' | 'namespace' | 'pathPrefix' | 'serviceName' | 'servicePort' | 'status' | 'versionLabel'>;
    'id': string;
  }

  /**
   * A VersionRegistry
   */
  export type GetVersionRegistryByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'appLabel'?: string | null; 'versionLabel'?: string | null; 'k8SDeploymentName'?: string | null; 'serviceName'?: string | null; 'servicePort'?: number | null; 'namespace'?: string | null; 'pathPrefix'?: string | null; 'hostname'?: string | null; 'status'?: 'active' | 'draining' | 'expired' | null; 'expirePolicy'?: string | null; 'drainedAt'?: string | null; 'expiredAt'?: string | null; 'createdAt'?: string | null }
  export type GetVersionRegistryByIdResponses =
    GetVersionRegistryByIdResponseOK

  export type PutUpdateVersionRegistryRequest = {
    'fields'?: Array<'appLabel' | 'applicationId' | 'createdAt' | 'deploymentId' | 'drainedAt' | 'expirePolicy' | 'expiredAt' | 'hostname' | 'id' | 'k8SDeploymentName' | 'namespace' | 'pathPrefix' | 'serviceName' | 'servicePort' | 'status' | 'versionLabel'>;
    'id': string;
    'applicationId': string;
    'deploymentId': string;
    'appLabel': string;
    'versionLabel': string;
    'k8SDeploymentName': string;
    'serviceName': string;
    'servicePort': number;
    'namespace': string;
    'pathPrefix': string;
    'hostname'?: string | null;
    'status': 'active' | 'draining' | 'expired';
    'expirePolicy': string;
    'drainedAt'?: string | null;
    'expiredAt'?: string | null;
    'createdAt'?: string | null;
  }

  /**
   * A VersionRegistry
   */
  export type PutUpdateVersionRegistryResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'appLabel'?: string | null; 'versionLabel'?: string | null; 'k8SDeploymentName'?: string | null; 'serviceName'?: string | null; 'servicePort'?: number | null; 'namespace'?: string | null; 'pathPrefix'?: string | null; 'hostname'?: string | null; 'status'?: 'active' | 'draining' | 'expired' | null; 'expirePolicy'?: string | null; 'drainedAt'?: string | null; 'expiredAt'?: string | null; 'createdAt'?: string | null }
  export type PutUpdateVersionRegistryResponses =
    PutUpdateVersionRegistryResponseOK

  export type DeleteVersionRegistryRequest = {
    'fields'?: Array<'appLabel' | 'applicationId' | 'createdAt' | 'deploymentId' | 'drainedAt' | 'expirePolicy' | 'expiredAt' | 'hostname' | 'id' | 'k8SDeploymentName' | 'namespace' | 'pathPrefix' | 'serviceName' | 'servicePort' | 'status' | 'versionLabel'>;
    'id': string;
  }

  /**
   * A VersionRegistry
   */
  export type DeleteVersionRegistryResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'deploymentId'?: string | null; 'appLabel'?: string | null; 'versionLabel'?: string | null; 'k8SDeploymentName'?: string | null; 'serviceName'?: string | null; 'servicePort'?: number | null; 'namespace'?: string | null; 'pathPrefix'?: string | null; 'hostname'?: string | null; 'status'?: 'active' | 'draining' | 'expired' | null; 'expirePolicy'?: string | null; 'drainedAt'?: string | null; 'expiredAt'?: string | null; 'createdAt'?: string | null }
  export type DeleteVersionRegistryResponses =
    DeleteVersionRegistryResponseOK

  export type GetApplicationForVersionRegistryRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'name'>;
    'id': string;
  }

  /**
   * A Application
   */
  export type GetApplicationForVersionRegistryResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
  export type GetApplicationForVersionRegistryResponses =
    GetApplicationForVersionRegistryResponseOK

  export type GetDeploymentForVersionRegistryRequest = {
    'fields'?: Array<'applicationId' | 'applicationStateId' | 'createdAt' | 'id' | 'imageId' | 'namespace' | 'status'>;
    'id': string;
  }

  /**
   * A Deployment
   */
  export type GetDeploymentForVersionRegistryResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'applicationStateId'?: string | null; 'status'?: 'failed' | 'started' | 'starting' | 'stopped' | null; 'imageId'?: string | null; 'namespace'?: string | null; 'createdAt'?: string | null }
  export type GetDeploymentForVersionRegistryResponses =
    GetDeploymentForVersionRegistryResponseOK

  export type GetSkewProtectionPoliciesRequest = {
    /**
     * Limit will be applied by default if not passed. If the provided value exceeds the maximum allowed value a validation error will be thrown
     */
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    /**
     * Include cursor headers in response. Cursor keys built from orderBy clause
     */
    'cursor'?: boolean;
    /**
     * Cursor for forward pagination. List objects after this cursor position
     */
    'startAfter'?: string;
    /**
     * Cursor for backward pagination. List objects before this cursor position
     */
    'endBefore'?: string;
    'fields'?: Array<'applicationId' | 'autoCleanup' | 'cookieName' | 'createdAt' | 'httpGracePeriodMs' | 'httpMaxAliveMs' | 'id' | 'maxAgeS' | 'maxVersions' | 'updatedAt' | 'workflowGracePeriodMs' | 'workflowMaxAliveMs'>;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.autoCleanup.eq'?: boolean;
    'where.autoCleanup.neq'?: boolean;
    'where.autoCleanup.gt'?: boolean;
    'where.autoCleanup.gte'?: boolean;
    'where.autoCleanup.lt'?: boolean;
    'where.autoCleanup.lte'?: boolean;
    'where.autoCleanup.like'?: boolean;
    'where.autoCleanup.ilike'?: boolean;
    'where.autoCleanup.in'?: string;
    'where.autoCleanup.nin'?: string;
    'where.autoCleanup.contains'?: string;
    'where.autoCleanup.contained'?: string;
    'where.autoCleanup.overlaps'?: string;
    'where.cookieName.eq'?: string;
    'where.cookieName.neq'?: string;
    'where.cookieName.gt'?: string;
    'where.cookieName.gte'?: string;
    'where.cookieName.lt'?: string;
    'where.cookieName.lte'?: string;
    'where.cookieName.like'?: string;
    'where.cookieName.ilike'?: string;
    'where.cookieName.in'?: string;
    'where.cookieName.nin'?: string;
    'where.cookieName.contains'?: string;
    'where.cookieName.contained'?: string;
    'where.cookieName.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.httpGracePeriodMs.eq'?: number;
    'where.httpGracePeriodMs.neq'?: number;
    'where.httpGracePeriodMs.gt'?: number;
    'where.httpGracePeriodMs.gte'?: number;
    'where.httpGracePeriodMs.lt'?: number;
    'where.httpGracePeriodMs.lte'?: number;
    'where.httpGracePeriodMs.like'?: number;
    'where.httpGracePeriodMs.ilike'?: number;
    'where.httpGracePeriodMs.in'?: string;
    'where.httpGracePeriodMs.nin'?: string;
    'where.httpGracePeriodMs.contains'?: string;
    'where.httpGracePeriodMs.contained'?: string;
    'where.httpGracePeriodMs.overlaps'?: string;
    'where.httpMaxAliveMs.eq'?: number;
    'where.httpMaxAliveMs.neq'?: number;
    'where.httpMaxAliveMs.gt'?: number;
    'where.httpMaxAliveMs.gte'?: number;
    'where.httpMaxAliveMs.lt'?: number;
    'where.httpMaxAliveMs.lte'?: number;
    'where.httpMaxAliveMs.like'?: number;
    'where.httpMaxAliveMs.ilike'?: number;
    'where.httpMaxAliveMs.in'?: string;
    'where.httpMaxAliveMs.nin'?: string;
    'where.httpMaxAliveMs.contains'?: string;
    'where.httpMaxAliveMs.contained'?: string;
    'where.httpMaxAliveMs.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.maxAgeS.eq'?: number;
    'where.maxAgeS.neq'?: number;
    'where.maxAgeS.gt'?: number;
    'where.maxAgeS.gte'?: number;
    'where.maxAgeS.lt'?: number;
    'where.maxAgeS.lte'?: number;
    'where.maxAgeS.like'?: number;
    'where.maxAgeS.ilike'?: number;
    'where.maxAgeS.in'?: string;
    'where.maxAgeS.nin'?: string;
    'where.maxAgeS.contains'?: string;
    'where.maxAgeS.contained'?: string;
    'where.maxAgeS.overlaps'?: string;
    'where.maxVersions.eq'?: number;
    'where.maxVersions.neq'?: number;
    'where.maxVersions.gt'?: number;
    'where.maxVersions.gte'?: number;
    'where.maxVersions.lt'?: number;
    'where.maxVersions.lte'?: number;
    'where.maxVersions.like'?: number;
    'where.maxVersions.ilike'?: number;
    'where.maxVersions.in'?: string;
    'where.maxVersions.nin'?: string;
    'where.maxVersions.contains'?: string;
    'where.maxVersions.contained'?: string;
    'where.maxVersions.overlaps'?: string;
    'where.updatedAt.eq'?: string;
    'where.updatedAt.neq'?: string;
    'where.updatedAt.gt'?: string;
    'where.updatedAt.gte'?: string;
    'where.updatedAt.lt'?: string;
    'where.updatedAt.lte'?: string;
    'where.updatedAt.like'?: string;
    'where.updatedAt.ilike'?: string;
    'where.updatedAt.in'?: string;
    'where.updatedAt.nin'?: string;
    'where.updatedAt.contains'?: string;
    'where.updatedAt.contained'?: string;
    'where.updatedAt.overlaps'?: string;
    'where.workflowGracePeriodMs.eq'?: number;
    'where.workflowGracePeriodMs.neq'?: number;
    'where.workflowGracePeriodMs.gt'?: number;
    'where.workflowGracePeriodMs.gte'?: number;
    'where.workflowGracePeriodMs.lt'?: number;
    'where.workflowGracePeriodMs.lte'?: number;
    'where.workflowGracePeriodMs.like'?: number;
    'where.workflowGracePeriodMs.ilike'?: number;
    'where.workflowGracePeriodMs.in'?: string;
    'where.workflowGracePeriodMs.nin'?: string;
    'where.workflowGracePeriodMs.contains'?: string;
    'where.workflowGracePeriodMs.contained'?: string;
    'where.workflowGracePeriodMs.overlaps'?: string;
    'where.workflowMaxAliveMs.eq'?: number;
    'where.workflowMaxAliveMs.neq'?: number;
    'where.workflowMaxAliveMs.gt'?: number;
    'where.workflowMaxAliveMs.gte'?: number;
    'where.workflowMaxAliveMs.lt'?: number;
    'where.workflowMaxAliveMs.lte'?: number;
    'where.workflowMaxAliveMs.like'?: number;
    'where.workflowMaxAliveMs.ilike'?: number;
    'where.workflowMaxAliveMs.in'?: string;
    'where.workflowMaxAliveMs.nin'?: string;
    'where.workflowMaxAliveMs.contains'?: string;
    'where.workflowMaxAliveMs.contained'?: string;
    'where.workflowMaxAliveMs.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.autoCleanup'?: 'asc' | 'desc';
    'orderby.cookieName'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.httpGracePeriodMs'?: 'asc' | 'desc';
    'orderby.httpMaxAliveMs'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.maxAgeS'?: 'asc' | 'desc';
    'orderby.maxVersions'?: 'asc' | 'desc';
    'orderby.updatedAt'?: 'asc' | 'desc';
    'orderby.workflowGracePeriodMs'?: 'asc' | 'desc';
    'orderby.workflowMaxAliveMs'?: 'asc' | 'desc';
  }

  /**
   * Default Response
   */
  export type GetSkewProtectionPoliciesResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'httpGracePeriodMs'?: number | null; 'httpMaxAliveMs'?: number | null; 'workflowGracePeriodMs'?: number | null; 'workflowMaxAliveMs'?: number | null; 'maxAgeS'?: number | null; 'maxVersions'?: number | null; 'cookieName'?: string | null; 'autoCleanup'?: boolean | null; 'createdAt'?: string | null; 'updatedAt'?: string | null }>
  export type GetSkewProtectionPoliciesResponses =
    GetSkewProtectionPoliciesResponseOK

  export type CreateSkewProtectionPolicyRequest = {
    'fields'?: Array<'applicationId' | 'autoCleanup' | 'cookieName' | 'createdAt' | 'httpGracePeriodMs' | 'httpMaxAliveMs' | 'id' | 'maxAgeS' | 'maxVersions' | 'updatedAt' | 'workflowGracePeriodMs' | 'workflowMaxAliveMs'>;
    'id'?: string;
    'applicationId': string;
    'httpGracePeriodMs'?: number | null;
    'httpMaxAliveMs'?: number | null;
    'workflowGracePeriodMs'?: number | null;
    'workflowMaxAliveMs'?: number | null;
    'maxAgeS'?: number | null;
    'maxVersions'?: number | null;
    'cookieName'?: string | null;
    'autoCleanup'?: boolean | null;
    'createdAt'?: string | null;
    'updatedAt'?: string | null;
  }

  /**
   * A SkewProtectionPolicy
   */
  export type CreateSkewProtectionPolicyResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'httpGracePeriodMs'?: number | null; 'httpMaxAliveMs'?: number | null; 'workflowGracePeriodMs'?: number | null; 'workflowMaxAliveMs'?: number | null; 'maxAgeS'?: number | null; 'maxVersions'?: number | null; 'cookieName'?: string | null; 'autoCleanup'?: boolean | null; 'createdAt'?: string | null; 'updatedAt'?: string | null }
  export type CreateSkewProtectionPolicyResponses =
    CreateSkewProtectionPolicyResponseOK

  export type UpdateSkewProtectionPoliciesRequest = {
    'fields'?: Array<'applicationId' | 'autoCleanup' | 'cookieName' | 'createdAt' | 'httpGracePeriodMs' | 'httpMaxAliveMs' | 'id' | 'maxAgeS' | 'maxVersions' | 'updatedAt' | 'workflowGracePeriodMs' | 'workflowMaxAliveMs'>;
    'where.applicationId.eq'?: string;
    'where.applicationId.neq'?: string;
    'where.applicationId.gt'?: string;
    'where.applicationId.gte'?: string;
    'where.applicationId.lt'?: string;
    'where.applicationId.lte'?: string;
    'where.applicationId.like'?: string;
    'where.applicationId.ilike'?: string;
    'where.applicationId.in'?: string;
    'where.applicationId.nin'?: string;
    'where.applicationId.contains'?: string;
    'where.applicationId.contained'?: string;
    'where.applicationId.overlaps'?: string;
    'where.autoCleanup.eq'?: boolean;
    'where.autoCleanup.neq'?: boolean;
    'where.autoCleanup.gt'?: boolean;
    'where.autoCleanup.gte'?: boolean;
    'where.autoCleanup.lt'?: boolean;
    'where.autoCleanup.lte'?: boolean;
    'where.autoCleanup.like'?: boolean;
    'where.autoCleanup.ilike'?: boolean;
    'where.autoCleanup.in'?: string;
    'where.autoCleanup.nin'?: string;
    'where.autoCleanup.contains'?: string;
    'where.autoCleanup.contained'?: string;
    'where.autoCleanup.overlaps'?: string;
    'where.cookieName.eq'?: string;
    'where.cookieName.neq'?: string;
    'where.cookieName.gt'?: string;
    'where.cookieName.gte'?: string;
    'where.cookieName.lt'?: string;
    'where.cookieName.lte'?: string;
    'where.cookieName.like'?: string;
    'where.cookieName.ilike'?: string;
    'where.cookieName.in'?: string;
    'where.cookieName.nin'?: string;
    'where.cookieName.contains'?: string;
    'where.cookieName.contained'?: string;
    'where.cookieName.overlaps'?: string;
    'where.createdAt.eq'?: string;
    'where.createdAt.neq'?: string;
    'where.createdAt.gt'?: string;
    'where.createdAt.gte'?: string;
    'where.createdAt.lt'?: string;
    'where.createdAt.lte'?: string;
    'where.createdAt.like'?: string;
    'where.createdAt.ilike'?: string;
    'where.createdAt.in'?: string;
    'where.createdAt.nin'?: string;
    'where.createdAt.contains'?: string;
    'where.createdAt.contained'?: string;
    'where.createdAt.overlaps'?: string;
    'where.httpGracePeriodMs.eq'?: number;
    'where.httpGracePeriodMs.neq'?: number;
    'where.httpGracePeriodMs.gt'?: number;
    'where.httpGracePeriodMs.gte'?: number;
    'where.httpGracePeriodMs.lt'?: number;
    'where.httpGracePeriodMs.lte'?: number;
    'where.httpGracePeriodMs.like'?: number;
    'where.httpGracePeriodMs.ilike'?: number;
    'where.httpGracePeriodMs.in'?: string;
    'where.httpGracePeriodMs.nin'?: string;
    'where.httpGracePeriodMs.contains'?: string;
    'where.httpGracePeriodMs.contained'?: string;
    'where.httpGracePeriodMs.overlaps'?: string;
    'where.httpMaxAliveMs.eq'?: number;
    'where.httpMaxAliveMs.neq'?: number;
    'where.httpMaxAliveMs.gt'?: number;
    'where.httpMaxAliveMs.gte'?: number;
    'where.httpMaxAliveMs.lt'?: number;
    'where.httpMaxAliveMs.lte'?: number;
    'where.httpMaxAliveMs.like'?: number;
    'where.httpMaxAliveMs.ilike'?: number;
    'where.httpMaxAliveMs.in'?: string;
    'where.httpMaxAliveMs.nin'?: string;
    'where.httpMaxAliveMs.contains'?: string;
    'where.httpMaxAliveMs.contained'?: string;
    'where.httpMaxAliveMs.overlaps'?: string;
    'where.id.eq'?: string;
    'where.id.neq'?: string;
    'where.id.gt'?: string;
    'where.id.gte'?: string;
    'where.id.lt'?: string;
    'where.id.lte'?: string;
    'where.id.like'?: string;
    'where.id.ilike'?: string;
    'where.id.in'?: string;
    'where.id.nin'?: string;
    'where.id.contains'?: string;
    'where.id.contained'?: string;
    'where.id.overlaps'?: string;
    'where.maxAgeS.eq'?: number;
    'where.maxAgeS.neq'?: number;
    'where.maxAgeS.gt'?: number;
    'where.maxAgeS.gte'?: number;
    'where.maxAgeS.lt'?: number;
    'where.maxAgeS.lte'?: number;
    'where.maxAgeS.like'?: number;
    'where.maxAgeS.ilike'?: number;
    'where.maxAgeS.in'?: string;
    'where.maxAgeS.nin'?: string;
    'where.maxAgeS.contains'?: string;
    'where.maxAgeS.contained'?: string;
    'where.maxAgeS.overlaps'?: string;
    'where.maxVersions.eq'?: number;
    'where.maxVersions.neq'?: number;
    'where.maxVersions.gt'?: number;
    'where.maxVersions.gte'?: number;
    'where.maxVersions.lt'?: number;
    'where.maxVersions.lte'?: number;
    'where.maxVersions.like'?: number;
    'where.maxVersions.ilike'?: number;
    'where.maxVersions.in'?: string;
    'where.maxVersions.nin'?: string;
    'where.maxVersions.contains'?: string;
    'where.maxVersions.contained'?: string;
    'where.maxVersions.overlaps'?: string;
    'where.updatedAt.eq'?: string;
    'where.updatedAt.neq'?: string;
    'where.updatedAt.gt'?: string;
    'where.updatedAt.gte'?: string;
    'where.updatedAt.lt'?: string;
    'where.updatedAt.lte'?: string;
    'where.updatedAt.like'?: string;
    'where.updatedAt.ilike'?: string;
    'where.updatedAt.in'?: string;
    'where.updatedAt.nin'?: string;
    'where.updatedAt.contains'?: string;
    'where.updatedAt.contained'?: string;
    'where.updatedAt.overlaps'?: string;
    'where.workflowGracePeriodMs.eq'?: number;
    'where.workflowGracePeriodMs.neq'?: number;
    'where.workflowGracePeriodMs.gt'?: number;
    'where.workflowGracePeriodMs.gte'?: number;
    'where.workflowGracePeriodMs.lt'?: number;
    'where.workflowGracePeriodMs.lte'?: number;
    'where.workflowGracePeriodMs.like'?: number;
    'where.workflowGracePeriodMs.ilike'?: number;
    'where.workflowGracePeriodMs.in'?: string;
    'where.workflowGracePeriodMs.nin'?: string;
    'where.workflowGracePeriodMs.contains'?: string;
    'where.workflowGracePeriodMs.contained'?: string;
    'where.workflowGracePeriodMs.overlaps'?: string;
    'where.workflowMaxAliveMs.eq'?: number;
    'where.workflowMaxAliveMs.neq'?: number;
    'where.workflowMaxAliveMs.gt'?: number;
    'where.workflowMaxAliveMs.gte'?: number;
    'where.workflowMaxAliveMs.lt'?: number;
    'where.workflowMaxAliveMs.lte'?: number;
    'where.workflowMaxAliveMs.like'?: number;
    'where.workflowMaxAliveMs.ilike'?: number;
    'where.workflowMaxAliveMs.in'?: string;
    'where.workflowMaxAliveMs.nin'?: string;
    'where.workflowMaxAliveMs.contains'?: string;
    'where.workflowMaxAliveMs.contained'?: string;
    'where.workflowMaxAliveMs.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'applicationId': string;
    'httpGracePeriodMs'?: number | null;
    'httpMaxAliveMs'?: number | null;
    'workflowGracePeriodMs'?: number | null;
    'workflowMaxAliveMs'?: number | null;
    'maxAgeS'?: number | null;
    'maxVersions'?: number | null;
    'cookieName'?: string | null;
    'autoCleanup'?: boolean | null;
    'createdAt'?: string | null;
    'updatedAt'?: string | null;
  }

  /**
   * Default Response
   */
  export type UpdateSkewProtectionPoliciesResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'httpGracePeriodMs'?: number | null; 'httpMaxAliveMs'?: number | null; 'workflowGracePeriodMs'?: number | null; 'workflowMaxAliveMs'?: number | null; 'maxAgeS'?: number | null; 'maxVersions'?: number | null; 'cookieName'?: string | null; 'autoCleanup'?: boolean | null; 'createdAt'?: string | null; 'updatedAt'?: string | null }>
  export type UpdateSkewProtectionPoliciesResponses =
    UpdateSkewProtectionPoliciesResponseOK

  export type GetSkewProtectionPolicyByIdRequest = {
    'fields'?: Array<'applicationId' | 'autoCleanup' | 'cookieName' | 'createdAt' | 'httpGracePeriodMs' | 'httpMaxAliveMs' | 'id' | 'maxAgeS' | 'maxVersions' | 'updatedAt' | 'workflowGracePeriodMs' | 'workflowMaxAliveMs'>;
    'id': string;
  }

  /**
   * A SkewProtectionPolicy
   */
  export type GetSkewProtectionPolicyByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'httpGracePeriodMs'?: number | null; 'httpMaxAliveMs'?: number | null; 'workflowGracePeriodMs'?: number | null; 'workflowMaxAliveMs'?: number | null; 'maxAgeS'?: number | null; 'maxVersions'?: number | null; 'cookieName'?: string | null; 'autoCleanup'?: boolean | null; 'createdAt'?: string | null; 'updatedAt'?: string | null }
  export type GetSkewProtectionPolicyByIdResponses =
    GetSkewProtectionPolicyByIdResponseOK

  export type UpdateSkewProtectionPolicyRequest = {
    'fields'?: Array<'applicationId' | 'autoCleanup' | 'cookieName' | 'createdAt' | 'httpGracePeriodMs' | 'httpMaxAliveMs' | 'id' | 'maxAgeS' | 'maxVersions' | 'updatedAt' | 'workflowGracePeriodMs' | 'workflowMaxAliveMs'>;
    'id': string;
    'applicationId': string;
    'httpGracePeriodMs'?: number | null;
    'httpMaxAliveMs'?: number | null;
    'workflowGracePeriodMs'?: number | null;
    'workflowMaxAliveMs'?: number | null;
    'maxAgeS'?: number | null;
    'maxVersions'?: number | null;
    'cookieName'?: string | null;
    'autoCleanup'?: boolean | null;
    'createdAt'?: string | null;
    'updatedAt'?: string | null;
  }

  /**
   * A SkewProtectionPolicy
   */
  export type UpdateSkewProtectionPolicyResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'httpGracePeriodMs'?: number | null; 'httpMaxAliveMs'?: number | null; 'workflowGracePeriodMs'?: number | null; 'workflowMaxAliveMs'?: number | null; 'maxAgeS'?: number | null; 'maxVersions'?: number | null; 'cookieName'?: string | null; 'autoCleanup'?: boolean | null; 'createdAt'?: string | null; 'updatedAt'?: string | null }
  export type UpdateSkewProtectionPolicyResponses =
    UpdateSkewProtectionPolicyResponseOK

  export type DeleteSkewProtectionPoliciesRequest = {
    'fields'?: Array<'applicationId' | 'autoCleanup' | 'cookieName' | 'createdAt' | 'httpGracePeriodMs' | 'httpMaxAliveMs' | 'id' | 'maxAgeS' | 'maxVersions' | 'updatedAt' | 'workflowGracePeriodMs' | 'workflowMaxAliveMs'>;
    'id': string;
  }

  /**
   * A SkewProtectionPolicy
   */
  export type DeleteSkewProtectionPoliciesResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'httpGracePeriodMs'?: number | null; 'httpMaxAliveMs'?: number | null; 'workflowGracePeriodMs'?: number | null; 'workflowMaxAliveMs'?: number | null; 'maxAgeS'?: number | null; 'maxVersions'?: number | null; 'cookieName'?: string | null; 'autoCleanup'?: boolean | null; 'createdAt'?: string | null; 'updatedAt'?: string | null }
  export type DeleteSkewProtectionPoliciesResponses =
    DeleteSkewProtectionPoliciesResponseOK

  export type GetApplicationForSkewProtectionPolicyRequest = {
    'fields'?: Array<'createdAt' | 'id' | 'name'>;
    'id': string;
  }

  /**
   * A Application
   */
  export type GetApplicationForSkewProtectionPolicyResponseOK = { 'id'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
  export type GetApplicationForSkewProtectionPolicyResponses =
    GetApplicationForSkewProtectionPolicyResponseOK

  export type EmitApplicationConfigRequest = {
    'id': string;
  }

  /**
   * Default Response
   */
  export type EmitApplicationConfigResponseOK = object
  export type EmitApplicationConfigResponses =
    EmitApplicationConfigResponseOK

  export type GetGenerationGraphRequest = {
    'generationId'?: string;
  }

  /**
   * Default Response
   */
  export type GetGenerationGraphResponseOK = { 'applications': Array<{ 'id': string; 'name': string; 'services': Array<object> }>; 'links': Array<{ 'source': { 'applicationId': string | null; 'serviceId': string | null; 'telemetryId': string }; 'target': { 'applicationId': string | null; 'serviceId': string | null; 'telemetryId': string }; 'requestsAmount': string; 'responseTime': string }> }
  export type GetGenerationGraphResponses =
    GetGenerationGraphResponseOK

  export type InitApplicationInstanceRequest = {
    'machineId': string;
    'applicationName': string;
    'apiVersion': 'v2' | 'v3';
  }

  /**
   * Default Response
   */
  export type InitApplicationInstanceResponseOK = { 'applicationId': string; 'applicationName': string; 'config': { 'resources'?: { 'threads'?: number; 'heap'?: number; 'services'?: Array<{ 'name'?: string; 'heap'?: number; 'threads'?: number }> }; 'httpCacheConfig'?: object | null }; 'enableOpenTelemetry'?: boolean; 'enableSlicerInterceptor'?: boolean; 'enableTrafficInterceptor'?: boolean; 'httpCache': { 'clientOpts'?: { 'host': string; 'port': number; 'username': string; 'password': string; 'keyPrefix': string } | null }; 'iccServices': Record<string, { 'url': string }>; 'scaler'?: { 'version': 'v1' | 'v2' } }
  export type InitApplicationInstanceResponses =
    InitApplicationInstanceResponseOK

  export type SaveApplicationInstanceStatusRequest = {
    'id': string;
    'status': string;
  }

  export type SaveApplicationInstanceStatusResponseOK = unknown
  export type SaveApplicationInstanceStatusResponses =
    FullResponse<SaveApplicationInstanceStatusResponseOK, 200>

  export type SaveApplicationInstanceStateRequest = {
    'id': string;
    'metadata': { 'platformaticVersion': string };
    'services': Array<object>;
  }

  /**
   * Default Response
   */
  export type SaveApplicationInstanceStateResponseOK = object
  export type SaveApplicationInstanceStateResponses =
    SaveApplicationInstanceStateResponseOK

  export type GetApplicationK8SStateRequest = {
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetApplicationK8SStateResponseOK = { 'pods'?: Array<{ 'id'?: string; 'status'?: string; 'startTime'?: string; 'resources'?: { 'limits'?: { 'cpu'?: string; 'memory'?: string }; 'requests'?: { 'cpu'?: string; 'memory'?: string } }; 'versionLabel'?: string }> }
  export type GetApplicationK8SStateResponses =
    GetApplicationK8SStateResponseOK

  export type GetApplicationResourcesRequest = {
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetApplicationResourcesResponseOK = { 'threads': number; 'heap': number; 'services': Array<{ 'name'?: string; 'heap'?: number; 'threads'?: number }> }
  export type GetApplicationResourcesResponses =
    GetApplicationResourcesResponseOK

  export type SetApplicationResourcesRequest = {
    'id': string;
    'threads': number;
    'heap': number;
    'services': Array<{ 'name'?: string; 'heap'?: number; 'threads'?: number }>;
  }

  /**
   * Default Response
   */
  export type SetApplicationResourcesResponseOK = object
  export type SetApplicationResourcesResponses =
    SetApplicationResourcesResponseOK

  export type GetApplicationVersionsRequest = {
    'status'?: 'active' | 'draining' | 'expired';
    'id': string;
  }

  /**
   * Default Response
   */
  export type GetApplicationVersionsResponseOK = { 'versions': Array<{ 'id'?: string; 'deploymentId'?: string; 'appLabel'?: string; 'versionLabel'?: string; 'controllerName'?: string; 'serviceName'?: string; 'servicePort'?: number; 'namespace'?: string; 'pathPrefix'?: string; 'hostname'?: unknown; 'status'?: string; 'createdAt'?: unknown; 'expiredAt'?: unknown }> }
  export type GetApplicationVersionsResponses =
    GetApplicationVersionsResponseOK

  export type ExpireApplicationVersionRequest = {
    'id': string;
    'versionLabel': string;
  }

  /**
   * Default Response
   */
  export type ExpireApplicationVersionResponseOK = { 'expired': boolean; 'activeVersion': unknown; 'drainingVersions': Array<{ 'versionId'?: string; 'serviceName'?: string; 'port'?: number }> }
  export type ExpireApplicationVersionResponses =
    ExpireApplicationVersionResponseOK

}

type ControlPlanePlugin = FastifyPluginAsync<NonNullable<controlPlane.ControlPlaneOptions>>

declare module 'fastify' {
  interface ConfigureControlPlane {
    getHeaders(req: FastifyRequest, reply: FastifyReply, options: GetHeadersOptions): Promise<Record<string,string>>;
  }
  interface FastifyInstance {
    configureControlPlane(opts: ConfigureControlPlane): unknown
  }

  interface FastifyRequest {
    /**
     * Platformatic DB
     *
     * Exposing a SQL database as REST
     */
    'controlPlane': controlPlane.ControlPlane;
  }
}

declare function controlPlane(...params: Parameters<ControlPlanePlugin>): ReturnType<ControlPlanePlugin>;
export = controlPlane;
