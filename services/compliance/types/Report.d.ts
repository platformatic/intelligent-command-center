/**
 * Report
 * A Report
 */
declare interface Report {
    id?: string;
    applicationId?: string | null;
    bundleId?: string | null;
    createdAt?: string | null;
    result: boolean;
    ruleSet: {
        [name: string]: any;
    };
}
export { Report };
