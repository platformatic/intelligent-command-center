export interface FullResponse<T, U extends number> {
  'statusCode': U;
  'headers': object;
  'body': T;
}

export type GetRisksRequest = {
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'branchTaxonomyId' | 'createdAt' | 'graphql' | 'id' | 'mainTaxonomyId' | 'openapi' | 'risk'>;
  'where.branchTaxonomyId.eq'?: string;
  'where.branchTaxonomyId.neq'?: string;
  'where.branchTaxonomyId.gt'?: string;
  'where.branchTaxonomyId.gte'?: string;
  'where.branchTaxonomyId.lt'?: string;
  'where.branchTaxonomyId.lte'?: string;
  'where.branchTaxonomyId.like'?: string;
  'where.branchTaxonomyId.in'?: string;
  'where.branchTaxonomyId.nin'?: string;
  'where.branchTaxonomyId.contains'?: string;
  'where.branchTaxonomyId.contained'?: string;
  'where.branchTaxonomyId.overlaps'?: string;
  'where.createdAt.eq'?: string;
  'where.createdAt.neq'?: string;
  'where.createdAt.gt'?: string;
  'where.createdAt.gte'?: string;
  'where.createdAt.lt'?: string;
  'where.createdAt.lte'?: string;
  'where.createdAt.like'?: string;
  'where.createdAt.in'?: string;
  'where.createdAt.nin'?: string;
  'where.createdAt.contains'?: string;
  'where.createdAt.contained'?: string;
  'where.createdAt.overlaps'?: string;
  'where.graphql.eq'?: string;
  'where.graphql.neq'?: string;
  'where.graphql.gt'?: string;
  'where.graphql.gte'?: string;
  'where.graphql.lt'?: string;
  'where.graphql.lte'?: string;
  'where.graphql.like'?: string;
  'where.graphql.in'?: string;
  'where.graphql.nin'?: string;
  'where.graphql.contains'?: string;
  'where.graphql.contained'?: string;
  'where.graphql.overlaps'?: string;
  'where.id.eq'?: string;
  'where.id.neq'?: string;
  'where.id.gt'?: string;
  'where.id.gte'?: string;
  'where.id.lt'?: string;
  'where.id.lte'?: string;
  'where.id.like'?: string;
  'where.id.in'?: string;
  'where.id.nin'?: string;
  'where.id.contains'?: string;
  'where.id.contained'?: string;
  'where.id.overlaps'?: string;
  'where.mainTaxonomyId.eq'?: string;
  'where.mainTaxonomyId.neq'?: string;
  'where.mainTaxonomyId.gt'?: string;
  'where.mainTaxonomyId.gte'?: string;
  'where.mainTaxonomyId.lt'?: string;
  'where.mainTaxonomyId.lte'?: string;
  'where.mainTaxonomyId.like'?: string;
  'where.mainTaxonomyId.in'?: string;
  'where.mainTaxonomyId.nin'?: string;
  'where.mainTaxonomyId.contains'?: string;
  'where.mainTaxonomyId.contained'?: string;
  'where.mainTaxonomyId.overlaps'?: string;
  'where.openapi.eq'?: string;
  'where.openapi.neq'?: string;
  'where.openapi.gt'?: string;
  'where.openapi.gte'?: string;
  'where.openapi.lt'?: string;
  'where.openapi.lte'?: string;
  'where.openapi.like'?: string;
  'where.openapi.in'?: string;
  'where.openapi.nin'?: string;
  'where.openapi.contains'?: string;
  'where.openapi.contained'?: string;
  'where.openapi.overlaps'?: string;
  'where.risk.eq'?: number;
  'where.risk.neq'?: number;
  'where.risk.gt'?: number;
  'where.risk.gte'?: number;
  'where.risk.lt'?: number;
  'where.risk.lte'?: number;
  'where.risk.like'?: number;
  'where.risk.in'?: string;
  'where.risk.nin'?: string;
  'where.risk.contains'?: string;
  'where.risk.contained'?: string;
  'where.risk.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.branchTaxonomyId'?: 'asc' | 'desc';
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.graphql'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.mainTaxonomyId'?: 'asc' | 'desc';
  'orderby.openapi'?: 'asc' | 'desc';
  'orderby.risk'?: 'asc' | 'desc';
}

export type GetRisksResponseOK = Array<{ 'id'?: string | null; 'mainTaxonomyId'?: string | null; 'branchTaxonomyId'?: string | null; 'risk'?: number | null; 'openapi'?: object; 'graphql'?: object; 'createdAt'?: string | null }>
export type GetRisksResponses =
  GetRisksResponseOK

export type UpdateRisksRequest = {
  'fields'?: Array<'branchTaxonomyId' | 'createdAt' | 'graphql' | 'id' | 'mainTaxonomyId' | 'openapi' | 'risk'>;
  'where.branchTaxonomyId.eq'?: string;
  'where.branchTaxonomyId.neq'?: string;
  'where.branchTaxonomyId.gt'?: string;
  'where.branchTaxonomyId.gte'?: string;
  'where.branchTaxonomyId.lt'?: string;
  'where.branchTaxonomyId.lte'?: string;
  'where.branchTaxonomyId.like'?: string;
  'where.branchTaxonomyId.in'?: string;
  'where.branchTaxonomyId.nin'?: string;
  'where.branchTaxonomyId.contains'?: string;
  'where.branchTaxonomyId.contained'?: string;
  'where.branchTaxonomyId.overlaps'?: string;
  'where.createdAt.eq'?: string;
  'where.createdAt.neq'?: string;
  'where.createdAt.gt'?: string;
  'where.createdAt.gte'?: string;
  'where.createdAt.lt'?: string;
  'where.createdAt.lte'?: string;
  'where.createdAt.like'?: string;
  'where.createdAt.in'?: string;
  'where.createdAt.nin'?: string;
  'where.createdAt.contains'?: string;
  'where.createdAt.contained'?: string;
  'where.createdAt.overlaps'?: string;
  'where.graphql.eq'?: string;
  'where.graphql.neq'?: string;
  'where.graphql.gt'?: string;
  'where.graphql.gte'?: string;
  'where.graphql.lt'?: string;
  'where.graphql.lte'?: string;
  'where.graphql.like'?: string;
  'where.graphql.in'?: string;
  'where.graphql.nin'?: string;
  'where.graphql.contains'?: string;
  'where.graphql.contained'?: string;
  'where.graphql.overlaps'?: string;
  'where.id.eq'?: string;
  'where.id.neq'?: string;
  'where.id.gt'?: string;
  'where.id.gte'?: string;
  'where.id.lt'?: string;
  'where.id.lte'?: string;
  'where.id.like'?: string;
  'where.id.in'?: string;
  'where.id.nin'?: string;
  'where.id.contains'?: string;
  'where.id.contained'?: string;
  'where.id.overlaps'?: string;
  'where.mainTaxonomyId.eq'?: string;
  'where.mainTaxonomyId.neq'?: string;
  'where.mainTaxonomyId.gt'?: string;
  'where.mainTaxonomyId.gte'?: string;
  'where.mainTaxonomyId.lt'?: string;
  'where.mainTaxonomyId.lte'?: string;
  'where.mainTaxonomyId.like'?: string;
  'where.mainTaxonomyId.in'?: string;
  'where.mainTaxonomyId.nin'?: string;
  'where.mainTaxonomyId.contains'?: string;
  'where.mainTaxonomyId.contained'?: string;
  'where.mainTaxonomyId.overlaps'?: string;
  'where.openapi.eq'?: string;
  'where.openapi.neq'?: string;
  'where.openapi.gt'?: string;
  'where.openapi.gte'?: string;
  'where.openapi.lt'?: string;
  'where.openapi.lte'?: string;
  'where.openapi.like'?: string;
  'where.openapi.in'?: string;
  'where.openapi.nin'?: string;
  'where.openapi.contains'?: string;
  'where.openapi.contained'?: string;
  'where.openapi.overlaps'?: string;
  'where.risk.eq'?: number;
  'where.risk.neq'?: number;
  'where.risk.gt'?: number;
  'where.risk.gte'?: number;
  'where.risk.lt'?: number;
  'where.risk.lte'?: number;
  'where.risk.like'?: number;
  'where.risk.in'?: string;
  'where.risk.nin'?: string;
  'where.risk.contains'?: string;
  'where.risk.contained'?: string;
  'where.risk.overlaps'?: string;
  'where.or'?: Array<string>;
  'id': string;
  'mainTaxonomyId': string | null;
  'branchTaxonomyId': string | null;
  'risk': number | null;
  'openapi': object;
  'graphql': object;
  'createdAt': string | null;
}

export type UpdateRisksResponseOK = Array<{ 'id'?: string | null; 'mainTaxonomyId'?: string | null; 'branchTaxonomyId'?: string | null; 'risk'?: number | null; 'openapi'?: object; 'graphql'?: object; 'createdAt'?: string | null }>
export type UpdateRisksResponses =
  UpdateRisksResponseOK

export type GetRiskByIdRequest = {
  'fields'?: Array<'branchTaxonomyId' | 'createdAt' | 'graphql' | 'id' | 'mainTaxonomyId' | 'openapi' | 'risk'>;
  'id': string;
}

export type GetRiskByIdResponseOK = { 'id'?: string | null; 'mainTaxonomyId'?: string | null; 'branchTaxonomyId'?: string | null; 'risk'?: number | null; 'openapi'?: object; 'graphql'?: object; 'createdAt'?: string | null }
export type GetRiskByIdResponses =
  GetRiskByIdResponseOK

export type PostBranchRiskRequest = {
  'previewName': string;
}

export type PostBranchRiskResponseOK = unknown
export type PostBranchRiskResponses =
  FullResponse<PostBranchRiskResponseOK, 200>



export interface RiskManager {
  setBaseUrl(newUrl: string) : void;
  getRisks(req?: GetRisksRequest): Promise<GetRisksResponses>;
  updateRisks(req?: UpdateRisksRequest): Promise<UpdateRisksResponses>;
  getRiskById(req?: GetRiskByIdRequest): Promise<GetRiskByIdResponses>;
  postBranchRisk(req?: PostBranchRiskRequest): Promise<PostBranchRiskResponses>;
}
type PlatformaticFrontendClient = Omit<Risk-manager, 'setBaseUrl'>
export default function build(url: string): PlatformaticFrontendClient
