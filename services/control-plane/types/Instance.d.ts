/**
 * Instance
 * A Instance
 */
declare interface Instance {
    id?: string;
    applicationId: string;
    createdAt?: string | null;
    deploymentId?: string | null;
    namespace: string;
    podId: string;
    status: "running" | "starting" | "stopped";
}
export { Instance };
