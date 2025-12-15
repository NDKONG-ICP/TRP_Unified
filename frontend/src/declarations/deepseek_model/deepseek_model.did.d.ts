import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface ChatMessage {
  'content' : string,
  'role' : string,
  'timestamp' : bigint,
}
export interface InferenceRequest {
  'top_p' : number,
  'context' : Array<ChatMessage>,
  'system_prompt' : [] | [string],
  'temperature' : number,
  'max_tokens' : number,
  'prompt' : string,
}
export interface InferenceResponse {
  'inference_time_ms' : bigint,
  'response' : string,
  'shards_used' : Uint32Array | number[],
  'tokens_generated' : number,
}
/**
 * DeepSeek R1 7B Model Weight Sharding Canister
 * Stores and serves sharded model weights for on-chain inference
 */
export interface ModelShard {
  'shard_data' : Uint8Array | number[],
  'model_hash' : string,
  'shard_size' : bigint,
  'shard_id' : number,
  'quantization' : [] | [string],
  'shard_index' : bigint,
  'total_shards' : number,
  /**
   * "Q4_K_M", "Q8_0", "F16", etc. (optional for backward compatibility)
   */
  'compression_ratio' : [] | [number],
}
export interface _SERVICE {
  'get_all_shard_ids' : ActorMethod<[], Uint32Array | number[]>,
  'get_model_info' : ActorMethod<[], [string, number, bigint]>,
  'get_shard' : ActorMethod<
    [number],
    { 'Ok' : ModelShard } |
      { 'Err' : string }
  >,
  /**
   * Health & Status
   */
  'get_status' : ActorMethod<[], [boolean, bigint, number]>,
  /**
   * (model_name, total_shards, total_size)
   * On-chain Inference
   */
  'infer' : ActorMethod<
    [InferenceRequest],
    { 'Ok' : InferenceResponse } |
      { 'Err' : string }
  >,
  'infer_with_shards' : ActorMethod<
    [InferenceRequest, Uint32Array | number[]],
    { 'Ok' : InferenceResponse } |
      { 'Err' : string }
  >,
  /**
   * Model Weight Management
   */
  'store_shard' : ActorMethod<
    [ModelShard],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
