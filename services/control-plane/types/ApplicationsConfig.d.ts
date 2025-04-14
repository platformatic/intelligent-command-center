/**
 * ApplicationsConfig
 * A ApplicationsConfig
 */
declare interface ApplicationsConfig {
    id?: string;
    applicationId: string;
    createdAt?: string | null;
    resources: {
        [name: string]: any;
    };
    version: number;
}
export { ApplicationsConfig };
