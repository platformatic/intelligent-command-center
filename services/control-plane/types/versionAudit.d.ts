/**
 * VersionAudit
 * A VersionAudit
 */
export interface VersionAudit {
  id?: string;
  actorId?: string | null;
  actorName?: string | null;
  actorType: string;
  applicationId: string;
  createdAt?: string | null;
  detail?: {
    [name: string]: any;
  } | null;
  event: string;
  fromState?: string | null;
  reason?: string | null;
  toState?: string | null;
  versionLabel?: string | null;
}