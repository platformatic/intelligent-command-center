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
    gracePeriodMs?: number | null;
    maxAgeS?: number | null;
    maxVersions?: number | null;
    updatedAt?: string | null;
}
export { SkewProtectionPolicy };
