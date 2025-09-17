/**
 * InterceptorConfig
 * A InterceptorConfig
 */
declare interface InterceptorConfig {
    id?: string;
    applicationId: string;
    applied?: boolean | null;
    config: {
        [name: string]: any;
    };
    createdAt?: string | null;
    recommendationId: string;
}
export { InterceptorConfig };
