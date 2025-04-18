export interface FullResponse<T, U extends number> {
  'statusCode': U;
  'headers': object;
  'body': T;
}

export type GetRepositoriesRequest = {
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'createdAt' | 'id' | 'name' | 'url'>;
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
  'where.name.eq'?: string;
  'where.name.neq'?: string;
  'where.name.gt'?: string;
  'where.name.gte'?: string;
  'where.name.lt'?: string;
  'where.name.lte'?: string;
  'where.name.like'?: string;
  'where.name.in'?: string;
  'where.name.nin'?: string;
  'where.name.contains'?: string;
  'where.name.contained'?: string;
  'where.name.overlaps'?: string;
  'where.url.eq'?: string;
  'where.url.neq'?: string;
  'where.url.gt'?: string;
  'where.url.gte'?: string;
  'where.url.lt'?: string;
  'where.url.lte'?: string;
  'where.url.like'?: string;
  'where.url.in'?: string;
  'where.url.nin'?: string;
  'where.url.contains'?: string;
  'where.url.contained'?: string;
  'where.url.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.name'?: 'asc' | 'desc';
  'orderby.url'?: 'asc' | 'desc';
}

export type GetRepositoriesResponseOK = Array<{ 'id'?: string | null; 'name'?: string | null; 'url'?: string | null; 'createdAt'?: string | null }>
export type GetRepositoriesResponses =
  GetRepositoriesResponseOK

export type CreateRepositoryRequest = {
  'id'?: string;
  'name': string;
  'url': string;
  'createdAt'?: string | null;
}

export type CreateRepositoryResponseOK = { 'id'?: string | null; 'name'?: string | null; 'url'?: string | null; 'createdAt'?: string | null }
export type CreateRepositoryResponses =
  CreateRepositoryResponseOK

export type UpdateRepositoriesRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name' | 'url'>;
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
  'where.name.eq'?: string;
  'where.name.neq'?: string;
  'where.name.gt'?: string;
  'where.name.gte'?: string;
  'where.name.lt'?: string;
  'where.name.lte'?: string;
  'where.name.like'?: string;
  'where.name.in'?: string;
  'where.name.nin'?: string;
  'where.name.contains'?: string;
  'where.name.contained'?: string;
  'where.name.overlaps'?: string;
  'where.url.eq'?: string;
  'where.url.neq'?: string;
  'where.url.gt'?: string;
  'where.url.gte'?: string;
  'where.url.lt'?: string;
  'where.url.lte'?: string;
  'where.url.like'?: string;
  'where.url.in'?: string;
  'where.url.nin'?: string;
  'where.url.contains'?: string;
  'where.url.contained'?: string;
  'where.url.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'name': string;
  'url': string;
  'createdAt'?: string | null;
}

export type UpdateRepositoriesResponseOK = Array<{ 'id'?: string | null; 'name'?: string | null; 'url'?: string | null; 'createdAt'?: string | null }>
export type UpdateRepositoriesResponses =
  UpdateRepositoriesResponseOK

export type GetRepositoryByIdRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name' | 'url'>;
  'id': string;
}

export type GetRepositoryByIdResponseOK = { 'id'?: string | null; 'name'?: string | null; 'url'?: string | null; 'createdAt'?: string | null }
export type GetRepositoryByIdResponses =
  GetRepositoryByIdResponseOK

export type UpdateRepositoryRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name' | 'url'>;
  'id': string;
  'name': string;
  'url': string;
  'createdAt'?: string | null;
}

export type UpdateRepositoryResponseOK = { 'id'?: string | null; 'name'?: string | null; 'url'?: string | null; 'createdAt'?: string | null }
export type UpdateRepositoryResponses =
  UpdateRepositoryResponseOK

export type DeleteRepositoriesRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name' | 'url'>;
  'id': string;
}

export type DeleteRepositoriesResponseOK = { 'id'?: string | null; 'name'?: string | null; 'url'?: string | null; 'createdAt'?: string | null }
export type DeleteRepositoriesResponses =
  DeleteRepositoriesResponseOK

export type GetBranchesForRepositoryRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name' | 'repositoryId'>;
  'id': string;
}

export type GetBranchesForRepositoryResponseOK = Array<{ 'id'?: string | null; 'repositoryId'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }>
export type GetBranchesForRepositoryResponses =
  GetBranchesForRepositoryResponseOK

export type GetBranchesRequest = {
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'createdAt' | 'id' | 'name' | 'repositoryId'>;
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
  'where.name.eq'?: string;
  'where.name.neq'?: string;
  'where.name.gt'?: string;
  'where.name.gte'?: string;
  'where.name.lt'?: string;
  'where.name.lte'?: string;
  'where.name.like'?: string;
  'where.name.in'?: string;
  'where.name.nin'?: string;
  'where.name.contains'?: string;
  'where.name.contained'?: string;
  'where.name.overlaps'?: string;
  'where.repositoryId.eq'?: string;
  'where.repositoryId.neq'?: string;
  'where.repositoryId.gt'?: string;
  'where.repositoryId.gte'?: string;
  'where.repositoryId.lt'?: string;
  'where.repositoryId.lte'?: string;
  'where.repositoryId.like'?: string;
  'where.repositoryId.in'?: string;
  'where.repositoryId.nin'?: string;
  'where.repositoryId.contains'?: string;
  'where.repositoryId.contained'?: string;
  'where.repositoryId.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.name'?: 'asc' | 'desc';
  'orderby.repositoryId'?: 'asc' | 'desc';
}

export type GetBranchesResponseOK = Array<{ 'id'?: string | null; 'repositoryId'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }>
export type GetBranchesResponses =
  GetBranchesResponseOK

export type CreateBranchRequest = {
  'id'?: string;
  'repositoryId': string;
  'name': string;
  'createdAt'?: string | null;
}

export type CreateBranchResponseOK = { 'id'?: string | null; 'repositoryId'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
export type CreateBranchResponses =
  CreateBranchResponseOK

export type UpdateBranchesRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name' | 'repositoryId'>;
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
  'where.name.eq'?: string;
  'where.name.neq'?: string;
  'where.name.gt'?: string;
  'where.name.gte'?: string;
  'where.name.lt'?: string;
  'where.name.lte'?: string;
  'where.name.like'?: string;
  'where.name.in'?: string;
  'where.name.nin'?: string;
  'where.name.contains'?: string;
  'where.name.contained'?: string;
  'where.name.overlaps'?: string;
  'where.repositoryId.eq'?: string;
  'where.repositoryId.neq'?: string;
  'where.repositoryId.gt'?: string;
  'where.repositoryId.gte'?: string;
  'where.repositoryId.lt'?: string;
  'where.repositoryId.lte'?: string;
  'where.repositoryId.like'?: string;
  'where.repositoryId.in'?: string;
  'where.repositoryId.nin'?: string;
  'where.repositoryId.contains'?: string;
  'where.repositoryId.contained'?: string;
  'where.repositoryId.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'repositoryId': string;
  'name': string;
  'createdAt'?: string | null;
}

export type UpdateBranchesResponseOK = Array<{ 'id'?: string | null; 'repositoryId'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }>
export type UpdateBranchesResponses =
  UpdateBranchesResponseOK

export type GetBranchByIdRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name' | 'repositoryId'>;
  'id': string;
}

export type GetBranchByIdResponseOK = { 'id'?: string | null; 'repositoryId'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
export type GetBranchByIdResponses =
  GetBranchByIdResponseOK

export type UpdateBranchRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name' | 'repositoryId'>;
  'id': string;
  'repositoryId': string;
  'name': string;
  'createdAt'?: string | null;
}

export type UpdateBranchResponseOK = { 'id'?: string | null; 'repositoryId'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
export type UpdateBranchResponses =
  UpdateBranchResponseOK

export type DeleteBranchesRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name' | 'repositoryId'>;
  'id': string;
}

export type DeleteBranchesResponseOK = { 'id'?: string | null; 'repositoryId'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
export type DeleteBranchesResponses =
  DeleteBranchesResponseOK

export type GetPullRequestsForBranchRequest = {
  'fields'?: Array<'branchId' | 'createdAt' | 'id' | 'number' | 'title'>;
  'id': string;
}

export type GetPullRequestsForBranchResponseOK = Array<{ 'id'?: string | null; 'branchId'?: string | null; 'number'?: number | null; 'title'?: string | null; 'createdAt'?: string | null }>
export type GetPullRequestsForBranchResponses =
  GetPullRequestsForBranchResponseOK

export type GetCommitsForBranchRequest = {
  'fields'?: Array<'branchId' | 'createdAt' | 'id' | 'message' | 'sha' | 'userEmail'>;
  'id': string;
}

export type GetCommitsForBranchResponseOK = Array<{ 'id'?: string | null; 'branchId'?: string | null; 'sha'?: string | null; 'createdAt'?: string | null; 'userEmail'?: string | null; 'message'?: string | null }>
export type GetCommitsForBranchResponses =
  GetCommitsForBranchResponseOK

export type GetRepositoryForBranchRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name' | 'url'>;
  'id': string;
}

export type GetRepositoryForBranchResponseOK = { 'id'?: string | null; 'name'?: string | null; 'url'?: string | null; 'createdAt'?: string | null }
export type GetRepositoryForBranchResponses =
  GetRepositoryForBranchResponseOK

export type GetPullRequestsRequest = {
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'branchId' | 'createdAt' | 'id' | 'number' | 'title'>;
  'where.branchId.eq'?: string;
  'where.branchId.neq'?: string;
  'where.branchId.gt'?: string;
  'where.branchId.gte'?: string;
  'where.branchId.lt'?: string;
  'where.branchId.lte'?: string;
  'where.branchId.like'?: string;
  'where.branchId.in'?: string;
  'where.branchId.nin'?: string;
  'where.branchId.contains'?: string;
  'where.branchId.contained'?: string;
  'where.branchId.overlaps'?: string;
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
  'where.number.eq'?: number;
  'where.number.neq'?: number;
  'where.number.gt'?: number;
  'where.number.gte'?: number;
  'where.number.lt'?: number;
  'where.number.lte'?: number;
  'where.number.like'?: number;
  'where.number.in'?: string;
  'where.number.nin'?: string;
  'where.number.contains'?: string;
  'where.number.contained'?: string;
  'where.number.overlaps'?: string;
  'where.title.eq'?: string;
  'where.title.neq'?: string;
  'where.title.gt'?: string;
  'where.title.gte'?: string;
  'where.title.lt'?: string;
  'where.title.lte'?: string;
  'where.title.like'?: string;
  'where.title.in'?: string;
  'where.title.nin'?: string;
  'where.title.contains'?: string;
  'where.title.contained'?: string;
  'where.title.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.branchId'?: 'asc' | 'desc';
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.number'?: 'asc' | 'desc';
  'orderby.title'?: 'asc' | 'desc';
}

export type GetPullRequestsResponseOK = Array<{ 'id'?: string | null; 'branchId'?: string | null; 'number'?: number | null; 'title'?: string | null; 'createdAt'?: string | null }>
export type GetPullRequestsResponses =
  GetPullRequestsResponseOK

export type CreatePullRequestRequest = {
  'id'?: string;
  'branchId': string;
  'number': number;
  'title': string;
  'createdAt'?: string | null;
}

export type CreatePullRequestResponseOK = { 'id'?: string | null; 'branchId'?: string | null; 'number'?: number | null; 'title'?: string | null; 'createdAt'?: string | null }
export type CreatePullRequestResponses =
  CreatePullRequestResponseOK

export type UpdatePullRequestsRequest = {
  'fields'?: Array<'branchId' | 'createdAt' | 'id' | 'number' | 'title'>;
  'where.branchId.eq'?: string;
  'where.branchId.neq'?: string;
  'where.branchId.gt'?: string;
  'where.branchId.gte'?: string;
  'where.branchId.lt'?: string;
  'where.branchId.lte'?: string;
  'where.branchId.like'?: string;
  'where.branchId.in'?: string;
  'where.branchId.nin'?: string;
  'where.branchId.contains'?: string;
  'where.branchId.contained'?: string;
  'where.branchId.overlaps'?: string;
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
  'where.number.eq'?: number;
  'where.number.neq'?: number;
  'where.number.gt'?: number;
  'where.number.gte'?: number;
  'where.number.lt'?: number;
  'where.number.lte'?: number;
  'where.number.like'?: number;
  'where.number.in'?: string;
  'where.number.nin'?: string;
  'where.number.contains'?: string;
  'where.number.contained'?: string;
  'where.number.overlaps'?: string;
  'where.title.eq'?: string;
  'where.title.neq'?: string;
  'where.title.gt'?: string;
  'where.title.gte'?: string;
  'where.title.lt'?: string;
  'where.title.lte'?: string;
  'where.title.like'?: string;
  'where.title.in'?: string;
  'where.title.nin'?: string;
  'where.title.contains'?: string;
  'where.title.contained'?: string;
  'where.title.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'branchId': string;
  'number': number;
  'title': string;
  'createdAt'?: string | null;
}

export type UpdatePullRequestsResponseOK = Array<{ 'id'?: string | null; 'branchId'?: string | null; 'number'?: number | null; 'title'?: string | null; 'createdAt'?: string | null }>
export type UpdatePullRequestsResponses =
  UpdatePullRequestsResponseOK

export type GetPullRequestByIdRequest = {
  'fields'?: Array<'branchId' | 'createdAt' | 'id' | 'number' | 'title'>;
  'id': string;
}

export type GetPullRequestByIdResponseOK = { 'id'?: string | null; 'branchId'?: string | null; 'number'?: number | null; 'title'?: string | null; 'createdAt'?: string | null }
export type GetPullRequestByIdResponses =
  GetPullRequestByIdResponseOK

export type UpdatePullRequestRequest = {
  'fields'?: Array<'branchId' | 'createdAt' | 'id' | 'number' | 'title'>;
  'id': string;
  'branchId': string;
  'number': number;
  'title': string;
  'createdAt'?: string | null;
}

export type UpdatePullRequestResponseOK = { 'id'?: string | null; 'branchId'?: string | null; 'number'?: number | null; 'title'?: string | null; 'createdAt'?: string | null }
export type UpdatePullRequestResponses =
  UpdatePullRequestResponseOK

export type DeletePullRequestsRequest = {
  'fields'?: Array<'branchId' | 'createdAt' | 'id' | 'number' | 'title'>;
  'id': string;
}

export type DeletePullRequestsResponseOK = { 'id'?: string | null; 'branchId'?: string | null; 'number'?: number | null; 'title'?: string | null; 'createdAt'?: string | null }
export type DeletePullRequestsResponses =
  DeletePullRequestsResponseOK

export type GetBranchForPullRequestRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name' | 'repositoryId'>;
  'id': string;
}

export type GetBranchForPullRequestResponseOK = { 'id'?: string | null; 'repositoryId'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
export type GetBranchForPullRequestResponses =
  GetBranchForPullRequestResponseOK

export type GetBundlesRequest = {
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'applicationId' | 'codeChecksum' | 'commitId' | 'configPath' | 'createdAt' | 'id' | 'size' | 'uploadKey'>;
  'where.applicationId.eq'?: string;
  'where.applicationId.neq'?: string;
  'where.applicationId.gt'?: string;
  'where.applicationId.gte'?: string;
  'where.applicationId.lt'?: string;
  'where.applicationId.lte'?: string;
  'where.applicationId.like'?: string;
  'where.applicationId.in'?: string;
  'where.applicationId.nin'?: string;
  'where.applicationId.contains'?: string;
  'where.applicationId.contained'?: string;
  'where.applicationId.overlaps'?: string;
  'where.codeChecksum.eq'?: string;
  'where.codeChecksum.neq'?: string;
  'where.codeChecksum.gt'?: string;
  'where.codeChecksum.gte'?: string;
  'where.codeChecksum.lt'?: string;
  'where.codeChecksum.lte'?: string;
  'where.codeChecksum.like'?: string;
  'where.codeChecksum.in'?: string;
  'where.codeChecksum.nin'?: string;
  'where.codeChecksum.contains'?: string;
  'where.codeChecksum.contained'?: string;
  'where.codeChecksum.overlaps'?: string;
  'where.commitId.eq'?: string;
  'where.commitId.neq'?: string;
  'where.commitId.gt'?: string;
  'where.commitId.gte'?: string;
  'where.commitId.lt'?: string;
  'where.commitId.lte'?: string;
  'where.commitId.like'?: string;
  'where.commitId.in'?: string;
  'where.commitId.nin'?: string;
  'where.commitId.contains'?: string;
  'where.commitId.contained'?: string;
  'where.commitId.overlaps'?: string;
  'where.configPath.eq'?: string;
  'where.configPath.neq'?: string;
  'where.configPath.gt'?: string;
  'where.configPath.gte'?: string;
  'where.configPath.lt'?: string;
  'where.configPath.lte'?: string;
  'where.configPath.like'?: string;
  'where.configPath.in'?: string;
  'where.configPath.nin'?: string;
  'where.configPath.contains'?: string;
  'where.configPath.contained'?: string;
  'where.configPath.overlaps'?: string;
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
  'where.size.eq'?: number;
  'where.size.neq'?: number;
  'where.size.gt'?: number;
  'where.size.gte'?: number;
  'where.size.lt'?: number;
  'where.size.lte'?: number;
  'where.size.like'?: number;
  'where.size.in'?: string;
  'where.size.nin'?: string;
  'where.size.contains'?: string;
  'where.size.contained'?: string;
  'where.size.overlaps'?: string;
  'where.uploadKey.eq'?: string;
  'where.uploadKey.neq'?: string;
  'where.uploadKey.gt'?: string;
  'where.uploadKey.gte'?: string;
  'where.uploadKey.lt'?: string;
  'where.uploadKey.lte'?: string;
  'where.uploadKey.like'?: string;
  'where.uploadKey.in'?: string;
  'where.uploadKey.nin'?: string;
  'where.uploadKey.contains'?: string;
  'where.uploadKey.contained'?: string;
  'where.uploadKey.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.applicationId'?: 'asc' | 'desc';
  'orderby.codeChecksum'?: 'asc' | 'desc';
  'orderby.commitId'?: 'asc' | 'desc';
  'orderby.configPath'?: 'asc' | 'desc';
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.size'?: 'asc' | 'desc';
  'orderby.uploadKey'?: 'asc' | 'desc';
}

export type GetBundlesResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'commitId'?: string | null; 'configPath'?: string | null; 'codeChecksum'?: string | null; 'uploadKey'?: string | null; 'createdAt'?: string | null; 'size'?: number | null }>
export type GetBundlesResponses =
  GetBundlesResponseOK

export type CreateBundleRequest = {
  'id'?: string;
  'applicationId': string;
  'commitId'?: string | null;
  'configPath': string;
  'codeChecksum': string;
  'uploadKey': string;
  'createdAt'?: string | null;
  'size': number;
}

export type CreateBundleResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'commitId'?: string | null; 'configPath'?: string | null; 'codeChecksum'?: string | null; 'uploadKey'?: string | null; 'createdAt'?: string | null; 'size'?: number | null }
export type CreateBundleResponses =
  CreateBundleResponseOK

export type UpdateBundlesRequest = {
  'fields'?: Array<'applicationId' | 'codeChecksum' | 'commitId' | 'configPath' | 'createdAt' | 'id' | 'size' | 'uploadKey'>;
  'where.applicationId.eq'?: string;
  'where.applicationId.neq'?: string;
  'where.applicationId.gt'?: string;
  'where.applicationId.gte'?: string;
  'where.applicationId.lt'?: string;
  'where.applicationId.lte'?: string;
  'where.applicationId.like'?: string;
  'where.applicationId.in'?: string;
  'where.applicationId.nin'?: string;
  'where.applicationId.contains'?: string;
  'where.applicationId.contained'?: string;
  'where.applicationId.overlaps'?: string;
  'where.codeChecksum.eq'?: string;
  'where.codeChecksum.neq'?: string;
  'where.codeChecksum.gt'?: string;
  'where.codeChecksum.gte'?: string;
  'where.codeChecksum.lt'?: string;
  'where.codeChecksum.lte'?: string;
  'where.codeChecksum.like'?: string;
  'where.codeChecksum.in'?: string;
  'where.codeChecksum.nin'?: string;
  'where.codeChecksum.contains'?: string;
  'where.codeChecksum.contained'?: string;
  'where.codeChecksum.overlaps'?: string;
  'where.commitId.eq'?: string;
  'where.commitId.neq'?: string;
  'where.commitId.gt'?: string;
  'where.commitId.gte'?: string;
  'where.commitId.lt'?: string;
  'where.commitId.lte'?: string;
  'where.commitId.like'?: string;
  'where.commitId.in'?: string;
  'where.commitId.nin'?: string;
  'where.commitId.contains'?: string;
  'where.commitId.contained'?: string;
  'where.commitId.overlaps'?: string;
  'where.configPath.eq'?: string;
  'where.configPath.neq'?: string;
  'where.configPath.gt'?: string;
  'where.configPath.gte'?: string;
  'where.configPath.lt'?: string;
  'where.configPath.lte'?: string;
  'where.configPath.like'?: string;
  'where.configPath.in'?: string;
  'where.configPath.nin'?: string;
  'where.configPath.contains'?: string;
  'where.configPath.contained'?: string;
  'where.configPath.overlaps'?: string;
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
  'where.size.eq'?: number;
  'where.size.neq'?: number;
  'where.size.gt'?: number;
  'where.size.gte'?: number;
  'where.size.lt'?: number;
  'where.size.lte'?: number;
  'where.size.like'?: number;
  'where.size.in'?: string;
  'where.size.nin'?: string;
  'where.size.contains'?: string;
  'where.size.contained'?: string;
  'where.size.overlaps'?: string;
  'where.uploadKey.eq'?: string;
  'where.uploadKey.neq'?: string;
  'where.uploadKey.gt'?: string;
  'where.uploadKey.gte'?: string;
  'where.uploadKey.lt'?: string;
  'where.uploadKey.lte'?: string;
  'where.uploadKey.like'?: string;
  'where.uploadKey.in'?: string;
  'where.uploadKey.nin'?: string;
  'where.uploadKey.contains'?: string;
  'where.uploadKey.contained'?: string;
  'where.uploadKey.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'applicationId': string;
  'commitId'?: string | null;
  'configPath': string;
  'codeChecksum': string;
  'uploadKey': string;
  'createdAt'?: string | null;
  'size': number;
}

export type UpdateBundlesResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'commitId'?: string | null; 'configPath'?: string | null; 'codeChecksum'?: string | null; 'uploadKey'?: string | null; 'createdAt'?: string | null; 'size'?: number | null }>
export type UpdateBundlesResponses =
  UpdateBundlesResponseOK

export type GetBundleByIdRequest = {
  'fields'?: Array<'applicationId' | 'codeChecksum' | 'commitId' | 'configPath' | 'createdAt' | 'id' | 'size' | 'uploadKey'>;
  'id': string;
}

export type GetBundleByIdResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'commitId'?: string | null; 'configPath'?: string | null; 'codeChecksum'?: string | null; 'uploadKey'?: string | null; 'createdAt'?: string | null; 'size'?: number | null }
export type GetBundleByIdResponses =
  GetBundleByIdResponseOK

export type UpdateBundleRequest = {
  'fields'?: Array<'applicationId' | 'codeChecksum' | 'commitId' | 'configPath' | 'createdAt' | 'id' | 'size' | 'uploadKey'>;
  'id': string;
  'applicationId': string;
  'commitId'?: string | null;
  'configPath': string;
  'codeChecksum': string;
  'uploadKey': string;
  'createdAt'?: string | null;
  'size': number;
}

export type UpdateBundleResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'commitId'?: string | null; 'configPath'?: string | null; 'codeChecksum'?: string | null; 'uploadKey'?: string | null; 'createdAt'?: string | null; 'size'?: number | null }
export type UpdateBundleResponses =
  UpdateBundleResponseOK

export type DeleteBundlesRequest = {
  'fields'?: Array<'applicationId' | 'codeChecksum' | 'commitId' | 'configPath' | 'createdAt' | 'id' | 'size' | 'uploadKey'>;
  'id': string;
}

export type DeleteBundlesResponseOK = { 'id'?: string | null; 'applicationId'?: string | null; 'commitId'?: string | null; 'configPath'?: string | null; 'codeChecksum'?: string | null; 'uploadKey'?: string | null; 'createdAt'?: string | null; 'size'?: number | null }
export type DeleteBundlesResponses =
  DeleteBundlesResponseOK

export type GetCommitForBundleRequest = {
  'fields'?: Array<'branchId' | 'createdAt' | 'id' | 'message' | 'sha' | 'userEmail'>;
  'id': string;
}

export type GetCommitForBundleResponseOK = { 'id'?: string | null; 'branchId'?: string | null; 'sha'?: string | null; 'createdAt'?: string | null; 'userEmail'?: string | null; 'message'?: string | null }
export type GetCommitForBundleResponses =
  GetCommitForBundleResponseOK

export type GetExportablesRequest = {
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'createdAt' | 'generationId' | 'id' | 'taxonomyId' | 'uploadKey'>;
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
  'where.generationId.eq'?: string;
  'where.generationId.neq'?: string;
  'where.generationId.gt'?: string;
  'where.generationId.gte'?: string;
  'where.generationId.lt'?: string;
  'where.generationId.lte'?: string;
  'where.generationId.like'?: string;
  'where.generationId.in'?: string;
  'where.generationId.nin'?: string;
  'where.generationId.contains'?: string;
  'where.generationId.contained'?: string;
  'where.generationId.overlaps'?: string;
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
  'where.taxonomyId.eq'?: string;
  'where.taxonomyId.neq'?: string;
  'where.taxonomyId.gt'?: string;
  'where.taxonomyId.gte'?: string;
  'where.taxonomyId.lt'?: string;
  'where.taxonomyId.lte'?: string;
  'where.taxonomyId.like'?: string;
  'where.taxonomyId.in'?: string;
  'where.taxonomyId.nin'?: string;
  'where.taxonomyId.contains'?: string;
  'where.taxonomyId.contained'?: string;
  'where.taxonomyId.overlaps'?: string;
  'where.uploadKey.eq'?: string;
  'where.uploadKey.neq'?: string;
  'where.uploadKey.gt'?: string;
  'where.uploadKey.gte'?: string;
  'where.uploadKey.lt'?: string;
  'where.uploadKey.lte'?: string;
  'where.uploadKey.like'?: string;
  'where.uploadKey.in'?: string;
  'where.uploadKey.nin'?: string;
  'where.uploadKey.contains'?: string;
  'where.uploadKey.contained'?: string;
  'where.uploadKey.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.generationId'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.taxonomyId'?: 'asc' | 'desc';
  'orderby.uploadKey'?: 'asc' | 'desc';
}

export type GetExportablesResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'uploadKey'?: string | null; 'createdAt'?: string | null }>
export type GetExportablesResponses =
  GetExportablesResponseOK

export type CreateExportableRequest = {
  'id'?: string;
  'taxonomyId': string;
  'generationId': string;
  'uploadKey': string;
  'createdAt'?: string | null;
}

export type CreateExportableResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'uploadKey'?: string | null; 'createdAt'?: string | null }
export type CreateExportableResponses =
  CreateExportableResponseOK

export type UpdateExportablesRequest = {
  'fields'?: Array<'createdAt' | 'generationId' | 'id' | 'taxonomyId' | 'uploadKey'>;
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
  'where.generationId.eq'?: string;
  'where.generationId.neq'?: string;
  'where.generationId.gt'?: string;
  'where.generationId.gte'?: string;
  'where.generationId.lt'?: string;
  'where.generationId.lte'?: string;
  'where.generationId.like'?: string;
  'where.generationId.in'?: string;
  'where.generationId.nin'?: string;
  'where.generationId.contains'?: string;
  'where.generationId.contained'?: string;
  'where.generationId.overlaps'?: string;
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
  'where.taxonomyId.eq'?: string;
  'where.taxonomyId.neq'?: string;
  'where.taxonomyId.gt'?: string;
  'where.taxonomyId.gte'?: string;
  'where.taxonomyId.lt'?: string;
  'where.taxonomyId.lte'?: string;
  'where.taxonomyId.like'?: string;
  'where.taxonomyId.in'?: string;
  'where.taxonomyId.nin'?: string;
  'where.taxonomyId.contains'?: string;
  'where.taxonomyId.contained'?: string;
  'where.taxonomyId.overlaps'?: string;
  'where.uploadKey.eq'?: string;
  'where.uploadKey.neq'?: string;
  'where.uploadKey.gt'?: string;
  'where.uploadKey.gte'?: string;
  'where.uploadKey.lt'?: string;
  'where.uploadKey.lte'?: string;
  'where.uploadKey.like'?: string;
  'where.uploadKey.in'?: string;
  'where.uploadKey.nin'?: string;
  'where.uploadKey.contains'?: string;
  'where.uploadKey.contained'?: string;
  'where.uploadKey.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'taxonomyId': string;
  'generationId': string;
  'uploadKey': string;
  'createdAt'?: string | null;
}

export type UpdateExportablesResponseOK = Array<{ 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'uploadKey'?: string | null; 'createdAt'?: string | null }>
export type UpdateExportablesResponses =
  UpdateExportablesResponseOK

export type GetExportableByIdRequest = {
  'fields'?: Array<'createdAt' | 'generationId' | 'id' | 'taxonomyId' | 'uploadKey'>;
  'id': string;
}

export type GetExportableByIdResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'uploadKey'?: string | null; 'createdAt'?: string | null }
export type GetExportableByIdResponses =
  GetExportableByIdResponseOK

export type UpdateExportableRequest = {
  'fields'?: Array<'createdAt' | 'generationId' | 'id' | 'taxonomyId' | 'uploadKey'>;
  'id': string;
  'taxonomyId': string;
  'generationId': string;
  'uploadKey': string;
  'createdAt'?: string | null;
}

export type UpdateExportableResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'uploadKey'?: string | null; 'createdAt'?: string | null }
export type UpdateExportableResponses =
  UpdateExportableResponseOK

export type DeleteExportablesRequest = {
  'fields'?: Array<'createdAt' | 'generationId' | 'id' | 'taxonomyId' | 'uploadKey'>;
  'id': string;
}

export type DeleteExportablesResponseOK = { 'id'?: string | null; 'taxonomyId'?: string | null; 'generationId'?: string | null; 'uploadKey'?: string | null; 'createdAt'?: string | null }
export type DeleteExportablesResponses =
  DeleteExportablesResponseOK

export type GetCommitsRequest = {
  'limit'?: number;
  'offset'?: number;
  'totalCount'?: boolean;
  'fields'?: Array<'branchId' | 'createdAt' | 'id' | 'message' | 'sha' | 'userEmail'>;
  'where.branchId.eq'?: string;
  'where.branchId.neq'?: string;
  'where.branchId.gt'?: string;
  'where.branchId.gte'?: string;
  'where.branchId.lt'?: string;
  'where.branchId.lte'?: string;
  'where.branchId.like'?: string;
  'where.branchId.in'?: string;
  'where.branchId.nin'?: string;
  'where.branchId.contains'?: string;
  'where.branchId.contained'?: string;
  'where.branchId.overlaps'?: string;
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
  'where.message.eq'?: string;
  'where.message.neq'?: string;
  'where.message.gt'?: string;
  'where.message.gte'?: string;
  'where.message.lt'?: string;
  'where.message.lte'?: string;
  'where.message.like'?: string;
  'where.message.in'?: string;
  'where.message.nin'?: string;
  'where.message.contains'?: string;
  'where.message.contained'?: string;
  'where.message.overlaps'?: string;
  'where.sha.eq'?: string;
  'where.sha.neq'?: string;
  'where.sha.gt'?: string;
  'where.sha.gte'?: string;
  'where.sha.lt'?: string;
  'where.sha.lte'?: string;
  'where.sha.like'?: string;
  'where.sha.in'?: string;
  'where.sha.nin'?: string;
  'where.sha.contains'?: string;
  'where.sha.contained'?: string;
  'where.sha.overlaps'?: string;
  'where.userEmail.eq'?: string;
  'where.userEmail.neq'?: string;
  'where.userEmail.gt'?: string;
  'where.userEmail.gte'?: string;
  'where.userEmail.lt'?: string;
  'where.userEmail.lte'?: string;
  'where.userEmail.like'?: string;
  'where.userEmail.in'?: string;
  'where.userEmail.nin'?: string;
  'where.userEmail.contains'?: string;
  'where.userEmail.contained'?: string;
  'where.userEmail.overlaps'?: string;
  'where.or'?: Array<string>;
  'orderby.branchId'?: 'asc' | 'desc';
  'orderby.createdAt'?: 'asc' | 'desc';
  'orderby.id'?: 'asc' | 'desc';
  'orderby.message'?: 'asc' | 'desc';
  'orderby.sha'?: 'asc' | 'desc';
  'orderby.userEmail'?: 'asc' | 'desc';
}

export type GetCommitsResponseOK = Array<{ 'id'?: string | null; 'branchId'?: string | null; 'sha'?: string | null; 'createdAt'?: string | null; 'userEmail'?: string | null; 'message'?: string | null }>
export type GetCommitsResponses =
  GetCommitsResponseOK

export type CreateCommitRequest = {
  'id'?: string;
  'branchId': string;
  'sha': string;
  'createdAt'?: string | null;
  'userEmail'?: string | null;
  'message'?: string | null;
}

export type CreateCommitResponseOK = { 'id'?: string | null; 'branchId'?: string | null; 'sha'?: string | null; 'createdAt'?: string | null; 'userEmail'?: string | null; 'message'?: string | null }
export type CreateCommitResponses =
  CreateCommitResponseOK

export type UpdateCommitsRequest = {
  'fields'?: Array<'branchId' | 'createdAt' | 'id' | 'message' | 'sha' | 'userEmail'>;
  'where.branchId.eq'?: string;
  'where.branchId.neq'?: string;
  'where.branchId.gt'?: string;
  'where.branchId.gte'?: string;
  'where.branchId.lt'?: string;
  'where.branchId.lte'?: string;
  'where.branchId.like'?: string;
  'where.branchId.in'?: string;
  'where.branchId.nin'?: string;
  'where.branchId.contains'?: string;
  'where.branchId.contained'?: string;
  'where.branchId.overlaps'?: string;
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
  'where.message.eq'?: string;
  'where.message.neq'?: string;
  'where.message.gt'?: string;
  'where.message.gte'?: string;
  'where.message.lt'?: string;
  'where.message.lte'?: string;
  'where.message.like'?: string;
  'where.message.in'?: string;
  'where.message.nin'?: string;
  'where.message.contains'?: string;
  'where.message.contained'?: string;
  'where.message.overlaps'?: string;
  'where.sha.eq'?: string;
  'where.sha.neq'?: string;
  'where.sha.gt'?: string;
  'where.sha.gte'?: string;
  'where.sha.lt'?: string;
  'where.sha.lte'?: string;
  'where.sha.like'?: string;
  'where.sha.in'?: string;
  'where.sha.nin'?: string;
  'where.sha.contains'?: string;
  'where.sha.contained'?: string;
  'where.sha.overlaps'?: string;
  'where.userEmail.eq'?: string;
  'where.userEmail.neq'?: string;
  'where.userEmail.gt'?: string;
  'where.userEmail.gte'?: string;
  'where.userEmail.lt'?: string;
  'where.userEmail.lte'?: string;
  'where.userEmail.like'?: string;
  'where.userEmail.in'?: string;
  'where.userEmail.nin'?: string;
  'where.userEmail.contains'?: string;
  'where.userEmail.contained'?: string;
  'where.userEmail.overlaps'?: string;
  'where.or'?: Array<string>;
  'id'?: string;
  'branchId': string;
  'sha': string;
  'createdAt'?: string | null;
  'userEmail'?: string | null;
  'message'?: string | null;
}

export type UpdateCommitsResponseOK = Array<{ 'id'?: string | null; 'branchId'?: string | null; 'sha'?: string | null; 'createdAt'?: string | null; 'userEmail'?: string | null; 'message'?: string | null }>
export type UpdateCommitsResponses =
  UpdateCommitsResponseOK

export type GetCommitByIdRequest = {
  'fields'?: Array<'branchId' | 'createdAt' | 'id' | 'message' | 'sha' | 'userEmail'>;
  'id': string;
}

export type GetCommitByIdResponseOK = { 'id'?: string | null; 'branchId'?: string | null; 'sha'?: string | null; 'createdAt'?: string | null; 'userEmail'?: string | null; 'message'?: string | null }
export type GetCommitByIdResponses =
  GetCommitByIdResponseOK

export type UpdateCommitRequest = {
  'fields'?: Array<'branchId' | 'createdAt' | 'id' | 'message' | 'sha' | 'userEmail'>;
  'id': string;
  'branchId': string;
  'sha': string;
  'createdAt'?: string | null;
  'userEmail'?: string | null;
  'message'?: string | null;
}

export type UpdateCommitResponseOK = { 'id'?: string | null; 'branchId'?: string | null; 'sha'?: string | null; 'createdAt'?: string | null; 'userEmail'?: string | null; 'message'?: string | null }
export type UpdateCommitResponses =
  UpdateCommitResponseOK

export type DeleteCommitsRequest = {
  'fields'?: Array<'branchId' | 'createdAt' | 'id' | 'message' | 'sha' | 'userEmail'>;
  'id': string;
}

export type DeleteCommitsResponseOK = { 'id'?: string | null; 'branchId'?: string | null; 'sha'?: string | null; 'createdAt'?: string | null; 'userEmail'?: string | null; 'message'?: string | null }
export type DeleteCommitsResponses =
  DeleteCommitsResponseOK

export type GetBundlesForCommitRequest = {
  'fields'?: Array<'applicationId' | 'codeChecksum' | 'commitId' | 'configPath' | 'createdAt' | 'id' | 'size' | 'uploadKey'>;
  'id': string;
}

export type GetBundlesForCommitResponseOK = Array<{ 'id'?: string | null; 'applicationId'?: string | null; 'commitId'?: string | null; 'configPath'?: string | null; 'codeChecksum'?: string | null; 'uploadKey'?: string | null; 'createdAt'?: string | null; 'size'?: number | null }>
export type GetBundlesForCommitResponses =
  GetBundlesForCommitResponseOK

export type GetBranchForCommitRequest = {
  'fields'?: Array<'createdAt' | 'id' | 'name' | 'repositoryId'>;
  'id': string;
}

export type GetBranchForCommitResponseOK = { 'id'?: string | null; 'repositoryId'?: string | null; 'name'?: string | null; 'createdAt'?: string | null }
export type GetBranchForCommitResponses =
  GetBranchForCommitResponseOK

export type GetBundlesWithMetadataRequest = {
  'bundleIds'?: Array<string>;
  'applicationIds'?: Array<string>;
  'limit'?: number;
  'offset'?: number;
}

export type GetBundlesWithMetadataResponseOK = Array<{ 'id': string; 'applicationId': string; 'createdAt': string; 'metadata': unknown }>
export type GetBundlesWithMetadataResponses =
  GetBundlesWithMetadataResponseOK

export type DeployBundleRequest = {
  'bundle': { 'applicationId': string; 'configPath': string; 'checksum': string; 'size': number };
  'metadata'?: { 'repository': { 'name': string; 'url': string }; 'branch': { 'name': string }; 'commit': { 'sha': string; 'message': string; 'userEmail': string | null }; 'pullRequest'?: { 'number': number; 'title': string } };
}

export type DeployBundleResponseOK = {
  'bundleId': string;
  'deployToken': string | null;
}
export type DeployBundleResponses =
  DeployBundleResponseOK

export type UploadBundleRequest = {
  'x-platformatic-deploy-token': string;
  'id': string;
}

export type UploadBundleResponseOK = unknown
export type UploadBundleResponses =
  FullResponse<UploadBundleResponseOK, 200>

export type GetBundleDownloadUrlRequest = {
  'id': string;
}

export type GetBundleDownloadUrlResponseOK = {
  'url': string;
}
export type GetBundleDownloadUrlResponses =
  GetBundleDownloadUrlResponseOK

export type GetExportableDownloadUrlRequest = {
  'id': string;
}

export type GetExportableDownloadUrlResponseOK = {
  'url': string;
}
export type GetExportableDownloadUrlResponses =
  GetExportableDownloadUrlResponseOK

export type DeployExportableRequest = {
  'taxonomyId': string;
  'generationId': string;
}

export type DeployExportableResponseOK = {
  'exportableId': string;
  'uploadUrl': string;
}
export type DeployExportableResponses =
  DeployExportableResponseOK

export type UploadExportableRequest = {
  'id': string;
}

export type UploadExportableResponseOK = unknown
export type UploadExportableResponses =
  FullResponse<UploadExportableResponseOK, 200>



export interface Compendium {
  setBaseUrl(newUrl: string) : void;
  setDefaultHeaders(headers: Object) : void;
  getRepositories(req: GetRepositoriesRequest): Promise<GetRepositoriesResponses>;
  createRepository(req: CreateRepositoryRequest): Promise<CreateRepositoryResponses>;
  updateRepositories(req: UpdateRepositoriesRequest): Promise<UpdateRepositoriesResponses>;
  getRepositoryById(req: GetRepositoryByIdRequest): Promise<GetRepositoryByIdResponses>;
  updateRepository(req: UpdateRepositoryRequest): Promise<UpdateRepositoryResponses>;
  deleteRepositories(req: DeleteRepositoriesRequest): Promise<DeleteRepositoriesResponses>;
  getBranchesForRepository(req: GetBranchesForRepositoryRequest): Promise<GetBranchesForRepositoryResponses>;
  getBranches(req: GetBranchesRequest): Promise<GetBranchesResponses>;
  createBranch(req: CreateBranchRequest): Promise<CreateBranchResponses>;
  updateBranches(req: UpdateBranchesRequest): Promise<UpdateBranchesResponses>;
  getBranchById(req: GetBranchByIdRequest): Promise<GetBranchByIdResponses>;
  updateBranch(req: UpdateBranchRequest): Promise<UpdateBranchResponses>;
  deleteBranches(req: DeleteBranchesRequest): Promise<DeleteBranchesResponses>;
  getPullRequestsForBranch(req: GetPullRequestsForBranchRequest): Promise<GetPullRequestsForBranchResponses>;
  getCommitsForBranch(req: GetCommitsForBranchRequest): Promise<GetCommitsForBranchResponses>;
  getRepositoryForBranch(req: GetRepositoryForBranchRequest): Promise<GetRepositoryForBranchResponses>;
  getPullRequests(req: GetPullRequestsRequest): Promise<GetPullRequestsResponses>;
  createPullRequest(req: CreatePullRequestRequest): Promise<CreatePullRequestResponses>;
  updatePullRequests(req: UpdatePullRequestsRequest): Promise<UpdatePullRequestsResponses>;
  getPullRequestById(req: GetPullRequestByIdRequest): Promise<GetPullRequestByIdResponses>;
  updatePullRequest(req: UpdatePullRequestRequest): Promise<UpdatePullRequestResponses>;
  deletePullRequests(req: DeletePullRequestsRequest): Promise<DeletePullRequestsResponses>;
  getBranchForPullRequest(req: GetBranchForPullRequestRequest): Promise<GetBranchForPullRequestResponses>;
  getBundles(req: GetBundlesRequest): Promise<GetBundlesResponses>;
  createBundle(req: CreateBundleRequest): Promise<CreateBundleResponses>;
  updateBundles(req: UpdateBundlesRequest): Promise<UpdateBundlesResponses>;
  getBundleById(req: GetBundleByIdRequest): Promise<GetBundleByIdResponses>;
  updateBundle(req: UpdateBundleRequest): Promise<UpdateBundleResponses>;
  deleteBundles(req: DeleteBundlesRequest): Promise<DeleteBundlesResponses>;
  getCommitForBundle(req: GetCommitForBundleRequest): Promise<GetCommitForBundleResponses>;
  getExportables(req: GetExportablesRequest): Promise<GetExportablesResponses>;
  createExportable(req: CreateExportableRequest): Promise<CreateExportableResponses>;
  updateExportables(req: UpdateExportablesRequest): Promise<UpdateExportablesResponses>;
  getExportableById(req: GetExportableByIdRequest): Promise<GetExportableByIdResponses>;
  updateExportable(req: UpdateExportableRequest): Promise<UpdateExportableResponses>;
  deleteExportables(req: DeleteExportablesRequest): Promise<DeleteExportablesResponses>;
  getCommits(req: GetCommitsRequest): Promise<GetCommitsResponses>;
  createCommit(req: CreateCommitRequest): Promise<CreateCommitResponses>;
  updateCommits(req: UpdateCommitsRequest): Promise<UpdateCommitsResponses>;
  getCommitById(req: GetCommitByIdRequest): Promise<GetCommitByIdResponses>;
  updateCommit(req: UpdateCommitRequest): Promise<UpdateCommitResponses>;
  deleteCommits(req: DeleteCommitsRequest): Promise<DeleteCommitsResponses>;
  getBundlesForCommit(req: GetBundlesForCommitRequest): Promise<GetBundlesForCommitResponses>;
  getBranchForCommit(req: GetBranchForCommitRequest): Promise<GetBranchForCommitResponses>;
  getBundlesWithMetadata(req: GetBundlesWithMetadataRequest): Promise<GetBundlesWithMetadataResponses>;
  deployBundle(req: DeployBundleRequest): Promise<DeployBundleResponses>;
  uploadBundle(req: UploadBundleRequest): Promise<UploadBundleResponses>;
  getBundleDownloadUrl(req: GetBundleDownloadUrlRequest): Promise<GetBundleDownloadUrlResponses>;
  getExportableDownloadUrl(req: GetExportableDownloadUrlRequest): Promise<GetExportableDownloadUrlResponses>;
  deployExportable(req: DeployExportableRequest): Promise<DeployExportableResponses>;
  uploadExportable(req: UploadExportableRequest): Promise<UploadExportableResponses>;
}
type PlatformaticFrontendClient = Omit<Compendium, 'setBaseUrl'>
type BuildOptions = {
  headers?: Object
}
export default function build(url: string, options?: BuildOptions): PlatformaticFrontendClient
