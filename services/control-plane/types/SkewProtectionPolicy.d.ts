/**
 * SkewProtectionPolicy
 * A SkewProtectionPolicy
 */
declare interface SkewProtectionPolicy {
    id?: string;
    applicationId: string;
    autoCleanup?: boolean | null;
    cookieName?: string | null;
    createdAt?: string | null;
    httpGracePeriodMs?: number | null;
    httpMaxAliveMs?: number | null;
    maxAgeS?: number | null;
    maxVersions?: number | null;
    updatedAt?: string | null;
    workflowGracePeriodMs?: number | null;
    workflowMaxAliveMs?: number | null;
}
export { SkewProtectionPolicy };
