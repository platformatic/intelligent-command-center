/**
 * DetectedPod
 * A DetectedPod
 */
declare interface DetectedPod {
    id?: string;
    applicationId: string;
    createdAt?: string | null;
    deploymentId?: string | null;
    podId: string;
    status: "failed" | "started" | "starting";
}
export { DetectedPod };
