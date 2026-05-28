/**
 * Graph
 * A Graph
 */
export interface Graph {
  id?: string;
  createdAt?: string | null;
  generationId: string;
  graph: {
    [name: string]: any;
  };
}