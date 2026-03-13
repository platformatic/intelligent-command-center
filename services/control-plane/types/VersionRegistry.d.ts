/**
 * VersionRegistry
 * A VersionRegistry
 */
declare interface VersionRegistry {
    id?: string;
    appLabel: string;
    applicationId: string;
    createdAt?: string | null;
    deploymentId: string;
    drainedAt?: string | null;
    expirePolicy: string;
    expiredAt?: string | null;
    hostname?: string | null;
    k8SDeploymentName: string;
    namespace: string;
    pathPrefix: string;
    serviceName: string;
    servicePort: number;
    status: "active" | "draining" | "expired";
    versionLabel: string;
}
export { VersionRegistry };
