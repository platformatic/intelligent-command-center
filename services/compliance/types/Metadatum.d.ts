/**
 * Metadatum
 * A Metadatum
 */
declare interface Metadatum {
    id?: string;
    applicationId?: string | null;
    bundleId?: string | null;
    createdAt?: string | null;
    data: {
        [name: string]: any;
    };
}
export { Metadatum };
