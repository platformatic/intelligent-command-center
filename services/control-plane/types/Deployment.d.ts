/**
 * Deployment
 * A Deployment
 */
declare interface Deployment {
    id?: string;
    applicationId: string;
    applicationStateId?: string | null;
    createdAt?: string | null;
    imageId: string;
    status: "failed" | "started" | "starting";
}
export { Deployment };
