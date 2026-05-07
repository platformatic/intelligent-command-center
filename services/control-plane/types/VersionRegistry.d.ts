/**
 * VersionRegistry
 * A VersionRegistry
 */
declare interface VersionRegistry {
    id?: string;
    appLabel: string;
    applicationId: string;
    controllerName: string;
    createdAt?: string | null;
    deploymentId: string;
    drainedAt?: string | null;
    expirePolicy: string;
    expiredAt?: string | null;
    hostname?: string | null;
    namespace: string;
    pathPrefix: string;
    serviceName: string;
    servicePort: number;
    status: "active" | "draining" | "expired";
    versionLabel: string;
}
export { VersionRegistry };
