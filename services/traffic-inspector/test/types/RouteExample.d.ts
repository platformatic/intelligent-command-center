/**
 * RouteExample
 * A RouteExample
 */
declare interface RouteExample {
    id?: string;
    applicationId: string;
    createdAt?: string | null;
    request: {
        [name: string]: any;
    };
    response: {
        [name: string]: any;
    };
    route: string;
    telemetryId: string;
}
export { RouteExample };
