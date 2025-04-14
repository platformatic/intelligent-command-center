/**
 * Graph
 * A Graph
 */
declare interface Graph {
    id?: string;
    createdAt?: string | null;
    generationId: string;
    graph: {
        [name: string]: any;
    };
}
export { Graph };
