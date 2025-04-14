/**
 * User
 * A User
 */
declare interface User {
    id?: string;
    createdAt?: string | null;
    email?: string | null;
    externalId?: string | null;
    joined?: boolean | null;
    role?: string | null;
    username?: string | null;
}
export { User };
