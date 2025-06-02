/**
 * Recommendation
 * A Recommendation
 */
declare interface Recommendation {
    id?: string;
    count: number;
    createdAt?: string | null;
    status: "aborted" | "calculating" | "done" | "expired" | "in_progress" | "new" | "old" | "skipped";
    version: number;
}
export { Recommendation };
