/**
 * SkewProtectionPolicy
 * A SkewProtectionPolicy
 */
export interface SkewProtectionPolicy {
  id?: string;
  applicationId: string;
  autoCleanup?: boolean | null;
  cookieName?: string | null;
  createdAt?: string | null;
  enabled?: boolean | null;
  httpGracePeriodMs?: number | null;
  httpMaxAliveMs?: number | null;
  maxAgeS?: number | null;
  maxVersions?: number | null;
  mode?: string | null;
  requiresApproval?: boolean | null;
  updatedAt?: string | null;
  workflowGracePeriodMs?: number | null;
  workflowMaxAliveMs?: number | null;
}