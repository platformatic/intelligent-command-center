/**
 * InterceptorConfig
 * A InterceptorConfig
 */
export interface InterceptorConfig {
  id?: string;
  applicationId: string;
  applied?: boolean | null;
  config: {
    [name: string]: any;
  };
  createdAt?: string | null;
  recommendationId: string;
}