/**
 * Activity
 * A Activity
 */
declare interface Activity {
    id?: string;
    applicationId?: string | null;
    createdAt?: string | null;
    data?: {
        [name: string]: any;
    } | null;
    description?: string | null;
    event: string;
    objectId?: string | null;
    objectType?: string | null;
    userId?: string | null;
    username?: string | null;
}
export { Activity };
