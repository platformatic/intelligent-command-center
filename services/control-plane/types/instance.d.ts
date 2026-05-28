/**
 * Instance
 * A Instance
 */
export interface Instance {
  id?: string;
  applicationId: string;
  createdAt?: string | null;
  deploymentId?: string | null;
  machineId: string;
  namespace: string;
  status: "running" | "starting" | "stopped";
}