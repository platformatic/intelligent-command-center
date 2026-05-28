/**
 * Recommendation
 * A Recommendation
 */
export interface Recommendation {
  id?: string;
  count: number;
  createdAt?: string | null;
  status: "aborted" | "calculating" | "done" | "expired" | "in_progress" | "new" | "old" | "skipped";
  version: number;
}