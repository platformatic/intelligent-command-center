import { type FastifyReply, type FastifyPluginAsync } from 'fastify'
import { type GetHeadersOptions } from '@platformatic/client'

declare namespace activities {
  export type Activities = {
    getActivities(req?: GetActivitiesRequest): Promise<GetActivitiesResponses>;
    createActivity(req?: CreateActivityRequest): Promise<CreateActivityResponses>;
    updateActivities(req?: UpdateActivitiesRequest): Promise<UpdateActivitiesResponses>;
    getActivityById(req?: GetActivityByIdRequest): Promise<GetActivityByIdResponses>;
    updateActivity(req?: UpdateActivityRequest): Promise<UpdateActivityResponses>;
    deleteActivities(req?: DeleteActivitiesRequest): Promise<DeleteActivitiesResponses>;
    postEvents(req?: PostEventsRequest): Promise<PostEventsResponses>;
    getEvents(req?: GetEventsRequest): Promise<GetEventsResponses>;
  }
  export interface ActivitiesOptions {
    url: string
  }
  export const activities: ActivitiesPlugin;
  export { activities as default };
  export interface FullResponse<T, U extends number> {
    'statusCode': U;
    'headers': Record<string, string>;
    'body': T;
  }

  export type GetActivitiesRequest = {
    'limit'?: number;
    'offset'?: number;
    'totalCount'?: boolean;
    'fields'?: Array<'applicationId' | 'createdAt' | 'data' | 'description' | 'event' | 'id' | 'objectId' | 'objectType' | 'userId' | 'username'>;
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
    'where.data.eq'?: string;
    'where.data.neq'?: string;
    'where.data.gt'?: string;
    'where.data.gte'?: string;
    'where.data.lt'?: string;
    'where.data.lte'?: string;
    'where.data.like'?: string;
    'where.data.in'?: string;
    'where.data.nin'?: string;
    'where.data.contains'?: string;
    'where.data.contained'?: string;
    'where.data.overlaps'?: string;
    'where.description.eq'?: string;
    'where.description.neq'?: string;
    'where.description.gt'?: string;
    'where.description.gte'?: string;
    'where.description.lt'?: string;
    'where.description.lte'?: string;
    'where.description.like'?: string;
    'where.description.in'?: string;
    'where.description.nin'?: string;
    'where.description.contains'?: string;
    'where.description.contained'?: string;
    'where.description.overlaps'?: string;
    'where.event.eq'?: string;
    'where.event.neq'?: string;
    'where.event.gt'?: string;
    'where.event.gte'?: string;
    'where.event.lt'?: string;
    'where.event.lte'?: string;
    'where.event.like'?: string;
    'where.event.in'?: string;
    'where.event.nin'?: string;
    'where.event.contains'?: string;
    'where.event.contained'?: string;
    'where.event.overlaps'?: string;
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
    'where.objectId.eq'?: string;
    'where.objectId.neq'?: string;
    'where.objectId.gt'?: string;
    'where.objectId.gte'?: string;
    'where.objectId.lt'?: string;
    'where.objectId.lte'?: string;
    'where.objectId.like'?: string;
    'where.objectId.in'?: string;
    'where.objectId.nin'?: string;
    'where.objectId.contains'?: string;
    'where.objectId.contained'?: string;
    'where.objectId.overlaps'?: string;
    'where.objectType.eq'?: string;
    'where.objectType.neq'?: string;
    'where.objectType.gt'?: string;
    'where.objectType.gte'?: string;
    'where.objectType.lt'?: string;
    'where.objectType.lte'?: string;
    'where.objectType.like'?: string;
    'where.objectType.in'?: string;
    'where.objectType.nin'?: string;
    'where.objectType.contains'?: string;
    'where.objectType.contained'?: string;
    'where.objectType.overlaps'?: string;
    'where.userId.eq'?: string;
    'where.userId.neq'?: string;
    'where.userId.gt'?: string;
    'where.userId.gte'?: string;
    'where.userId.lt'?: string;
    'where.userId.lte'?: string;
    'where.userId.like'?: string;
    'where.userId.in'?: string;
    'where.userId.nin'?: string;
    'where.userId.contains'?: string;
    'where.userId.contained'?: string;
    'where.userId.overlaps'?: string;
    'where.username.eq'?: string;
    'where.username.neq'?: string;
    'where.username.gt'?: string;
    'where.username.gte'?: string;
    'where.username.lt'?: string;
    'where.username.lte'?: string;
    'where.username.like'?: string;
    'where.username.in'?: string;
    'where.username.nin'?: string;
    'where.username.contains'?: string;
    'where.username.contained'?: string;
    'where.username.overlaps'?: string;
    'where.or'?: Array<string>;
    'orderby.applicationId'?: 'asc' | 'desc';
    'orderby.createdAt'?: 'asc' | 'desc';
    'orderby.data'?: 'asc' | 'desc';
    'orderby.description'?: 'asc' | 'desc';
    'orderby.event'?: 'asc' | 'desc';
    'orderby.id'?: 'asc' | 'desc';
    'orderby.objectId'?: 'asc' | 'desc';
    'orderby.objectType'?: 'asc' | 'desc';
    'orderby.userId'?: 'asc' | 'desc';
    'orderby.username'?: 'asc' | 'desc';
  }

  export type GetActivitiesResponseOK = Array<{ 'id'?: string | null; 'userId'?: string | null; 'username'?: string | null; 'applicationId'?: string | null; 'event'?: string | null; 'objectType'?: string | null; 'objectId'?: string | null; 'data'?: object; 'description'?: string | null; 'createdAt'?: string | null }>
  export type GetActivitiesResponses =
    GetActivitiesResponseOK

  export type CreateActivityRequest = {
    'id'?: string;
    'userId'?: string | null;
    'username'?: string | null;
    'applicationId'?: string | null;
    'event': string;
    'objectType'?: string | null;
    'objectId'?: string | null;
    'data'?: object;
    'description'?: string | null;
    'createdAt'?: string | null;
  }

  export type CreateActivityResponseOK = { 'id'?: string | null; 'userId'?: string | null; 'username'?: string | null; 'applicationId'?: string | null; 'event'?: string | null; 'objectType'?: string | null; 'objectId'?: string | null; 'data'?: object; 'description'?: string | null; 'createdAt'?: string | null }
  export type CreateActivityResponses =
    CreateActivityResponseOK

  export type UpdateActivitiesRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'data' | 'description' | 'event' | 'id' | 'objectId' | 'objectType' | 'userId' | 'username'>;
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
    'where.data.eq'?: string;
    'where.data.neq'?: string;
    'where.data.gt'?: string;
    'where.data.gte'?: string;
    'where.data.lt'?: string;
    'where.data.lte'?: string;
    'where.data.like'?: string;
    'where.data.in'?: string;
    'where.data.nin'?: string;
    'where.data.contains'?: string;
    'where.data.contained'?: string;
    'where.data.overlaps'?: string;
    'where.description.eq'?: string;
    'where.description.neq'?: string;
    'where.description.gt'?: string;
    'where.description.gte'?: string;
    'where.description.lt'?: string;
    'where.description.lte'?: string;
    'where.description.like'?: string;
    'where.description.in'?: string;
    'where.description.nin'?: string;
    'where.description.contains'?: string;
    'where.description.contained'?: string;
    'where.description.overlaps'?: string;
    'where.event.eq'?: string;
    'where.event.neq'?: string;
    'where.event.gt'?: string;
    'where.event.gte'?: string;
    'where.event.lt'?: string;
    'where.event.lte'?: string;
    'where.event.like'?: string;
    'where.event.in'?: string;
    'where.event.nin'?: string;
    'where.event.contains'?: string;
    'where.event.contained'?: string;
    'where.event.overlaps'?: string;
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
    'where.objectId.eq'?: string;
    'where.objectId.neq'?: string;
    'where.objectId.gt'?: string;
    'where.objectId.gte'?: string;
    'where.objectId.lt'?: string;
    'where.objectId.lte'?: string;
    'where.objectId.like'?: string;
    'where.objectId.in'?: string;
    'where.objectId.nin'?: string;
    'where.objectId.contains'?: string;
    'where.objectId.contained'?: string;
    'where.objectId.overlaps'?: string;
    'where.objectType.eq'?: string;
    'where.objectType.neq'?: string;
    'where.objectType.gt'?: string;
    'where.objectType.gte'?: string;
    'where.objectType.lt'?: string;
    'where.objectType.lte'?: string;
    'where.objectType.like'?: string;
    'where.objectType.in'?: string;
    'where.objectType.nin'?: string;
    'where.objectType.contains'?: string;
    'where.objectType.contained'?: string;
    'where.objectType.overlaps'?: string;
    'where.userId.eq'?: string;
    'where.userId.neq'?: string;
    'where.userId.gt'?: string;
    'where.userId.gte'?: string;
    'where.userId.lt'?: string;
    'where.userId.lte'?: string;
    'where.userId.like'?: string;
    'where.userId.in'?: string;
    'where.userId.nin'?: string;
    'where.userId.contains'?: string;
    'where.userId.contained'?: string;
    'where.userId.overlaps'?: string;
    'where.username.eq'?: string;
    'where.username.neq'?: string;
    'where.username.gt'?: string;
    'where.username.gte'?: string;
    'where.username.lt'?: string;
    'where.username.lte'?: string;
    'where.username.like'?: string;
    'where.username.in'?: string;
    'where.username.nin'?: string;
    'where.username.contains'?: string;
    'where.username.contained'?: string;
    'where.username.overlaps'?: string;
    'where.or'?: Array<string>;
    'id'?: string;
    'userId'?: string | null;
    'username'?: string | null;
    'applicationId'?: string | null;
    'event': string;
    'objectType'?: string | null;
    'objectId'?: string | null;
    'data'?: object;
    'description'?: string | null;
    'createdAt'?: string | null;
  }

  export type UpdateActivitiesResponseOK = Array<{ 'id'?: string | null; 'userId'?: string | null; 'username'?: string | null; 'applicationId'?: string | null; 'event'?: string | null; 'objectType'?: string | null; 'objectId'?: string | null; 'data'?: object; 'description'?: string | null; 'createdAt'?: string | null }>
  export type UpdateActivitiesResponses =
    UpdateActivitiesResponseOK

  export type GetActivityByIdRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'data' | 'description' | 'event' | 'id' | 'objectId' | 'objectType' | 'userId' | 'username'>;
    'id': string;
  }

  export type GetActivityByIdResponseOK = { 'id'?: string | null; 'userId'?: string | null; 'username'?: string | null; 'applicationId'?: string | null; 'event'?: string | null; 'objectType'?: string | null; 'objectId'?: string | null; 'data'?: object; 'description'?: string | null; 'createdAt'?: string | null }
  export type GetActivityByIdResponses =
    GetActivityByIdResponseOK

  export type UpdateActivityRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'data' | 'description' | 'event' | 'id' | 'objectId' | 'objectType' | 'userId' | 'username'>;
    'id': string;
    'userId'?: string | null;
    'username'?: string | null;
    'applicationId'?: string | null;
    'event': string;
    'objectType'?: string | null;
    'objectId'?: string | null;
    'data'?: object;
    'description'?: string | null;
    'createdAt'?: string | null;
  }

  export type UpdateActivityResponseOK = { 'id'?: string | null; 'userId'?: string | null; 'username'?: string | null; 'applicationId'?: string | null; 'event'?: string | null; 'objectType'?: string | null; 'objectId'?: string | null; 'data'?: object; 'description'?: string | null; 'createdAt'?: string | null }
  export type UpdateActivityResponses =
    UpdateActivityResponseOK

  export type DeleteActivitiesRequest = {
    'fields'?: Array<'applicationId' | 'createdAt' | 'data' | 'description' | 'event' | 'id' | 'objectId' | 'objectType' | 'userId' | 'username'>;
    'id': string;
  }

  export type DeleteActivitiesResponseOK = { 'id'?: string | null; 'userId'?: string | null; 'username'?: string | null; 'applicationId'?: string | null; 'event'?: string | null; 'objectType'?: string | null; 'objectId'?: string | null; 'data'?: object; 'description'?: string | null; 'createdAt'?: string | null }
  export type DeleteActivitiesResponses =
    DeleteActivitiesResponseOK

  export type PostEventsRequest = {
    'type': string;
    'userId': string;
    'username': string;
    'targetId': string;
    'applicationId'?: string;
    'data': object;
  }

  export type PostEventsResponseOK = unknown
  export type PostEventsResponses =
    FullResponse<PostEventsResponseOK, 200>

  export type GetEventsRequest = {
    unknown
  }

  export type GetEventsResponseOK = unknown
  export type GetEventsResponses =
    FullResponse<GetEventsResponseOK, 200>

}

type ActivitiesPlugin = FastifyPluginAsync<NonNullable<activities.ActivitiesOptions>>

declare module 'fastify' {
  interface ConfigureActivities {
    getHeaders(req: FastifyRequest, reply: FastifyReply, options: GetHeadersOptions): Promise<Record<string,string>>;
  }
  interface FastifyInstance {
    configureActivities(opts: ConfigureActivities): unknown
  }

  interface FastifyRequest {
    'activities': activities.Activities;
  }
}

declare function activities(...params: Parameters<ActivitiesPlugin>): ReturnType<ActivitiesPlugin>;
export = activities;
