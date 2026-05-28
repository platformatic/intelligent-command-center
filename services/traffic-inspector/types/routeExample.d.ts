/**
 * RouteExample
 * A RouteExample
 */
export interface RouteExample {
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