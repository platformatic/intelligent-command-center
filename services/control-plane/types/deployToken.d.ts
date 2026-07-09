/**
 * DeployToken
 * A DeployToken
 */
export interface DeployToken {
  id?: string;
  applicationId: string;
  createdAt?: string | null;
  createdBy?: string | null;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  name: string;
  revokedAt?: string | null;
  tokenHash: string;
}