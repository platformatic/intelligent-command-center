/**
 * RecommendationsRoute
 * A RecommendationsRoute
 */
declare interface RecommendationsRoute {
    id?: string;
    applicationId: string;
    applied?: boolean | null;
    cacheTag?: string | null;
    createdAt?: string | null;
    domain: string;
    hits: number;
    memory: number;
    misses: number;
    recommendationId: string;
    recommended: boolean;
    route: string;
    score: number;
    scores: {
        [name: string]: any;
    };
    selected?: boolean | null;
    serviceName: string;
    telemetryId: string;
    ttl: number;
    varyHeaders?: {
        [name: string]: any;
    } | null;
}
export { RecommendationsRoute };
