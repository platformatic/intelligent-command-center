/**
 * Rule
 * A Rule
 */
declare interface Rule {
    id?: string;
    config: {
        [name: string]: any;
    };
    createdAt?: string | null;
    description?: string | null;
    label?: string | null;
    name?: string | null;
}
export { Rule };
