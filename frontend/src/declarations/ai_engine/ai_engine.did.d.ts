import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AIConfig {
  'admin' : Principal,
  'cache_duration_ns' : bigint,
  'max_requests_per_minute' : number,
}
export interface AgentMemory {
  'agent_id' : string,
  'context_window' : Array<string>,
  'context_size' : bigint,
}
export interface AlternativeRoute {
  'name' : string,
  'duration_hours' : number,
  'notes' : string,
  'distance_miles' : number,
}
export interface CouncilConfig {
  'review_enabled' : boolean,
  'members' : Array<LLMProvider>,
  'council_id' : string,
  'name' : string,
  'anonymize_reviews' : boolean,
  'chairman' : string,
  'max_rounds' : number,
}
export interface CouncilQuery {
  'user_query' : string,
  'context' : [] | [string],
  'requested_at' : bigint,
  'query_id' : string,
  'priority' : QueryPriority,
}
export interface CouncilResult {
  'user_query' : string,
  'rankings' : Array<[string, number]>,
  'session_id' : string,
  'final_response' : string,
  'processing_time_ms' : bigint,
  'individual_responses' : Array<LLMResponse>,
  'dissent_notes' : [] | [string],
  'confidence_score' : number,
}
export interface CouncilSession {
  'rankings' : Array<[string, number]>,
  'reviews' : Array<ResponseReview>,
  'session_id' : string,
  'final_response' : [] | [string],
  'chairman_summary' : [] | [string],
  'created_at' : bigint,
  'stage' : CouncilStage,
  'individual_responses' : Array<LLMResponse>,
  'total_latency_ms' : bigint,
  'config' : CouncilConfig,
  'completed_at' : [] | [bigint],
  'total_tokens' : number,
  'council_query' : CouncilQuery,
}
export type CouncilStage = { 'Failed' : string } |
  { 'ReviewingResponses' : null } |
  { 'GeneratingConsensus' : null } |
  { 'CollectingResponses' : null } |
  { 'Completed' : null } |
  { 'Pending' : null };
export interface ETAPrediction {
  'destination' : string,
  'estimated_arrival' : string,
  'origin' : string,
  'current_location' : [] | [string],
  'factors' : Array<string>,
  'confidence' : number,
}
export interface FuelOptimization {
  'potential_savings' : number,
  'recommended_stops' : Array<FuelStop>,
  'estimated_cost' : number,
  'route' : string,
  'total_fuel_gallons' : number,
}
export interface FuelStop {
  'price_per_gallon' : number,
  'location' : string,
  'distance_from_start' : number,
}
export interface KnowledgeNode {
  'id' : string,
  'updated_at' : bigint,
  'node_type' : NodeType,
  'properties' : Array<[string, string]>,
  'created_at' : bigint,
  'label' : string,
  'embedding' : [] | [Array<number>],
}
export interface LLMProvider {
  'id' : string,
  'model' : string,
  'is_chairman' : boolean,
  'temperature' : number,
  'name' : string,
  'max_tokens' : number,
  'api_endpoint' : string,
}
export interface LLMResponse {
  'provider_name' : string,
  'provider_id' : string,
  'tokens_used' : number,
  'response' : string,
  'timestamp' : bigint,
  'latency_ms' : bigint,
}
export interface Memory {
  'id' : string,
  'content' : string,
  'memory_type' : MemoryType,
  'metadata' : Array<[string, string]>,
  'tags' : Array<string>,
  'importance' : number,
  'created_at' : bigint,
  'last_accessed' : bigint,
  'summary' : [] | [string],
  'related_memories' : Array<string>,
  'embedding' : [] | [Array<number>],
  'access_count' : number,
}
/**
 * Memory Types
 */
export type MemoryType = { 'Episodic' : null } |
  { 'Procedural' : null } |
  { 'ShortTerm' : null } |
  { 'LongTerm' : null } |
  { 'Semantic' : null };
export type NodeType = { 'Event' : null } |
  { 'Entity' : null } |
  { 'Action' : null } |
  { 'Attribute' : null } |
  { 'Concept' : null };
/**
 * LLM Council Types
 */
export type QueryPriority = { 'Low' : null } |
  { 'High' : null } |
  { 'Normal' : null } |
  { 'Critical' : null };
export interface ResponseReview {
  'insight_score' : number,
  'overall_rank' : number,
  'reviewer_id' : string,
  'feedback' : string,
  'reviewed_response_id' : string,
  'completeness_score' : number,
  'accuracy_score' : number,
}
export interface RouteOptimization {
  'fuel_cost_estimate' : number,
  'destination' : string,
  'alternative_routes' : Array<AlternativeRoute>,
  'origin' : string,
  'cached_at' : bigint,
  'traffic_level' : string,
  'toll_cost_estimate' : number,
  'duration_hours' : number,
  'weather_conditions' : string,
  'distance_miles' : number,
  'recommended_stops' : Array<string>,
}
export interface _SERVICE {
  'add_context' : ActorMethod<
    [string, string],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'add_council_response' : ActorMethod<
    [string, string, string, string, number, bigint],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'add_council_review' : ActorMethod<
    [string, string, string, number, number, number, number, string],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'add_knowledge_edge' : ActorMethod<
    [string, string, string, string, number],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'add_knowledge_node' : ActorMethod<
    [string, string, string, Array<[string, string]>],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  /**
   * Cache Management
   */
  'clear_cache' : ActorMethod<[], { 'Ok' : bigint } | { 'Err' : string }>,
  /**
   * LLM Council API
   */
  'create_council_query' : ActorMethod<
    [string, string],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'finalize_council_response' : ActorMethod<
    [string, string, string],
    { 'Ok' : CouncilResult } |
      { 'Err' : string }
  >,
  'find_knowledge_node' : ActorMethod<[string, string], [] | [KnowledgeNode]>,
  /**
   * Agent Memory API
   */
  'get_agent_memory' : ActorMethod<[string], AgentMemory>,
  'get_cache_stats' : ActorMethod<[], [bigint, bigint]>,
  'get_cached_route' : ActorMethod<[string, string], [] | [RouteOptimization]>,
  'get_chairman_prompt' : ActorMethod<
    [string],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  /**
   * Config
   */
  'get_config' : ActorMethod<[], AIConfig>,
  'get_context' : ActorMethod<[string], string>,
  'get_council_config' : ActorMethod<[], CouncilConfig>,
  'get_council_session' : ActorMethod<[string], [] | [CouncilSession]>,
  'get_memory_stats' : ActorMethod<[string], [bigint, bigint, bigint]>,
  'health' : ActorMethod<[], string>,
  'maintain_memory' : ActorMethod<
    [string],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'optimize_fuel' : ActorMethod<[string, string, number], FuelOptimization>,
  /**
   * Route Optimization
   */
  'optimize_route' : ActorMethod<
    [string, string],
    { 'Ok' : RouteOptimization } |
      { 'Err' : string }
  >,
  'predict_eta' : ActorMethod<[string, string, [] | [string]], ETAPrediction>,
  'recall' : ActorMethod<[string, string, number], Array<Memory>>,
  'remember' : ActorMethod<
    [string, string, string, number, Array<string>],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
