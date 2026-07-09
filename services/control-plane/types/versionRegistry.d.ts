/**
 * VersionRegistry
 * A VersionRegistry
 */
export interface VersionRegistry {
  id?: string;
  appLabel: string;
  applicationId: string;
  controllerName: string;
  createdAt?: string | null;
  deploymentId?: string | null;
  drainedAt?: string | null;
  expirePolicy: string;
  expiredAt?: string | null;
  hostname?: string | null;
  mode?: string | null;
  namespace: string;
  pathPrefix: string;
  plan?: {
    [name: string]: any;
  } | null;
  serviceName: string;
  servicePort: number;
  status: "active" | "draining" | "expired" | "pending-apply" | "pending-expire" | "staged";
  versionLabel: string;
}