import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AIRequest {
  'use_onchain' : boolean,
  'context' : Array<ChatMessage>,
  'system_prompt' : [] | [string],
  'token_id' : [] | [bigint],
  'query_text' : string,
  'use_http_parallel' : boolean,
}
export interface AIResponse {
  'inference_method' : string,
  'tokens_used' : number,
  'response' : string,
  'latency_ms' : bigint,
  'confidence_score' : number,
  'model_responses' : Array<[string, string, number]>,
}
/**
 * Queen Bee AI Pipeline Orchestrator
 * Coordinates on-chain DeepSeek R1 inference, HTTP outcalls, voice processing, and memory storage
 */
export interface ChatMessage {
  'content' : string,
  'role' : string,
  'timestamp' : bigint,
}
export interface MemoryResult {
  'id' : string,
  'metadata' : Array<[string, string]>,
  'vector' : Array<number>,
  'similarity' : number,
}
export interface VoiceRequest {
  'similarity_boost' : [] | [number],
  'text' : string,
  'stability' : [] | [number],
  'voice_id' : [] | [string],
}
export interface VoiceResponse {
  'audio_base64' : string,
  'characters_used' : number,
  'duration_ms' : bigint,
}
export interface _SERVICE {
  'get_status' : ActorMethod<[], [boolean, bigint, number, number]>,
  'process_ai_request' : ActorMethod<
    [AIRequest],
    { 'Ok' : AIResponse } |
      { 'Err' : string }
  >,
  'query_memory' : ActorMethod<
    [string, number],
    { 'Ok' : Array<MemoryResult> } |
      { 'Err' : string }
  >,
  'register_model_canister' : ActorMethod<
    [number, Principal],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'register_vector_db_canister' : ActorMethod<
    [number, Principal],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'store_memory' : ActorMethod<
    [string, Array<number>, Array<[string, string]>, number],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'synthesize_voice' : ActorMethod<
    [VoiceRequest],
    { 'Ok' : VoiceResponse } |
      { 'Err' : string }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
