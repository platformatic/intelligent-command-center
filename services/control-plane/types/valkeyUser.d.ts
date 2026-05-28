/**
 * ValkeyUser
 * A ValkeyUser
 */
export interface ValkeyUser {
  id?: string;
  applicationId: string;
  createdAt?: string | null;
  encryptedPassword: string;
  keyPrefix: string;
  username: string;
}