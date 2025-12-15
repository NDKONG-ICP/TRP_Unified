import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface QueryRequest {
  'top_k' : number,
  'min_similarity' : number,
  'filter_metadata' : [] | [Array<[string, string]>],
  'query_vector' : Array<number>,
}
export interface QueryResult {
  'id' : string,
  'metadata' : Array<[string, string]>,
  'vector' : Array<number>,
  'similarity' : number,
  'timestamp' : bigint,
}
export interface VectorEmbedding {
  'id' : string,
  'metadata' : Array<[string, string]>,
  'shard_id' : number,
  'importance' : number,
  'vector' : Array<number>,
  'timestamp' : bigint,
}
export interface _SERVICE {
  'delete_vector' : ActorMethod<[string], { 'Ok' : null } | { 'Err' : string }>,
  'get_all_vector_ids' : ActorMethod<[], Array<string>>,
  'get_shard_info' : ActorMethod<[], [number, bigint]>,
  'get_status' : ActorMethod<[], [boolean, bigint, bigint]>,
  'get_vector' : ActorMethod<
    [string],
    { 'Ok' : VectorEmbedding } |
      { 'Err' : string }
  >,
  'query_similar' : ActorMethod<
    [Array<number>, number],
    { 'Ok' : Array<QueryResult> } |
      { 'Err' : string }
  >,
  'query_vectors' : ActorMethod<
    [QueryRequest],
    { 'Ok' : Array<QueryResult> } |
      { 'Err' : string }
  >,
  'store_vector' : ActorMethod<
    [VectorEmbedding],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
