/**
 * RuleConfig
 * A RuleConfig
 */
declare interface RuleConfig {
    id?: string;
    applicationId?: string | null;
    createdAt?: string | null;
    enabled?: boolean | null;
    options: {
        [name: string]: any;
    };
    ruleId: string;
    type: "global" | "local";
}
export { RuleConfig };
