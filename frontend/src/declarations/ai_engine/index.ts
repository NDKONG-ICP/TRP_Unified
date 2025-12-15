// AI Engine canister declarations
import type { Principal } from '@dfinity/principal';

// Types
export interface AlternativeRoute {
  name: string;
  distance_miles: number;
  duration_hours: number;
  notes: string;
}

export interface RouteOptimization {
  origin: string;
  destination: string;
  distance_miles: number;
  duration_hours: number;
  fuel_cost_estimate: number;
  toll_cost_estimate: number;
  weather_conditions: string;
  traffic_level: string;
  recommended_stops: string[];
  alternative_routes: AlternativeRoute[];
  cached_at: bigint;
}

export interface ETAPrediction {
  origin: string;
  destination: string;
  current_location: [] | [string];
  estimated_arrival: string;
  confidence: number;
  factors: string[];
}

export interface FuelStop {
  location: string;
  price_per_gallon: number;
  distance_from_start: number;
}

export interface FuelOptimization {
  route: string;
  total_fuel_gallons: number;
  estimated_cost: number;
  recommended_stops: FuelStop[];
  potential_savings: number;
}

export interface AIConfig {
  admin: Principal;
  cache_duration_ns: bigint;
  max_requests_per_minute: number;
}

// LLM Council Types
export type QueryPriority = 
  | { 'Low': null }
  | { 'Normal': null }
  | { 'High': null }
  | { 'Critical': null };

export interface LLMResponse {
  provider_id: string;
  provider_name: string;
  response: string;
  tokens_used: number;
  latency_ms: bigint;
  timestamp: bigint;
}

export interface ResponseReview {
  reviewer_id: string;
  reviewed_response_id: string;
  accuracy_score: number;
  insight_score: number;
  completeness_score: number;
  overall_rank: number;
  feedback: string;
}

export interface CouncilQuery {
  query_id: string;
  user_query: string;
  context: [] | [string];
  requested_at: bigint;
  priority: QueryPriority;
}

export type CouncilStage = 
  | { 'Pending': null }
  | { 'CollectingResponses': null }
  | { 'ReviewingResponses': null }
  | { 'GeneratingConsensus': null }
  | { 'Completed': null }
  | { 'Failed': string };

export interface LLMProvider {
  id: string;
  name: string;
  model: string;
  api_endpoint: string;
  max_tokens: number;
  temperature: number;
  is_chairman: boolean;
}

export interface CouncilConfig {
  council_id: string;
  name: string;
  members: LLMProvider[];
  chairman: string;
  review_enabled: boolean;
  anonymize_reviews: boolean;
  max_rounds: number;
}

export interface CouncilSession {
  session_id: string;
  config: CouncilConfig;
  query: CouncilQuery;
  stage: CouncilStage;
  individual_responses: LLMResponse[];
  reviews: ResponseReview[];
  rankings: Array<[string, number]>;
  final_response: [] | [string];
  chairman_summary: [] | [string];
  total_tokens: number;
  total_latency_ms: bigint;
  created_at: bigint;
  completed_at: [] | [bigint];
}

export interface CouncilResult {
  session_id: string;
  query: string;
  final_response: string;
  individual_responses: LLMResponse[];
  rankings: Array<[string, number]>;
  confidence_score: number;
  dissent_notes: [] | [string];
  processing_time_ms: bigint;
}

// Memory Types
export type MemoryType = 
  | { 'ShortTerm': null }
  | { 'LongTerm': null }
  | { 'Episodic': null }
  | { 'Semantic': null }
  | { 'Procedural': null };

export interface Memory {
  id: string;
  memory_type: MemoryType;
  content: string;
  summary: [] | [string];
  embedding: [] | [number[]];
  importance: number;
  access_count: number;
  last_accessed: bigint;
  created_at: bigint;
  metadata: Array<[string, string]>;
  related_memories: string[];
  tags: string[];
}

export type NodeType = 
  | { 'Entity': null }
  | { 'Concept': null }
  | { 'Event': null }
  | { 'Action': null }
  | { 'Attribute': null };

export interface KnowledgeNode {
  id: string;
  node_type: NodeType;
  label: string;
  properties: Array<[string, string]>;
  embedding: [] | [number[]];
  created_at: bigint;
  updated_at: bigint;
}

export interface AgentMemory {
  agent_id: string;
  context_window: string[];
  context_size: bigint;
}

export type Result = { 'Ok': RouteOptimization } | { 'Err': string };
export type Result_1 = { 'Ok': bigint } | { 'Err': string };
export type Result_2 = { 'Ok': string } | { 'Err': string };
export type Result_3 = { 'Ok': CouncilResult } | { 'Err': string };

export interface _SERVICE {
  // Route Optimization
  optimize_route: (arg_0: string, arg_1: string) => Promise<Result>;
  predict_eta: (arg_0: string, arg_1: string, arg_2: [] | [string]) => Promise<ETAPrediction>;
  optimize_fuel: (arg_0: string, arg_1: string, arg_2: number) => Promise<FuelOptimization>;
  
  // Cache Management
  clear_cache: () => Promise<Result_1>;
  get_cache_stats: () => Promise<[bigint, bigint]>;
  get_cached_route: (arg_0: string, arg_1: string) => Promise<[] | [RouteOptimization]>;
  
  // Config
  get_config: () => Promise<AIConfig>;
  health: () => Promise<string>;
  
  // LLM Council API
  create_council_query: (arg_0: string, arg_1: string) => Promise<Result_2>;
  add_council_response: (arg_0: string, arg_1: string, arg_2: string, arg_3: string, arg_4: number, arg_5: bigint) => Promise<Result_2>;
  add_council_review: (arg_0: string, arg_1: string, arg_2: string, arg_3: number, arg_4: number, arg_5: number, arg_6: number, arg_7: string) => Promise<Result_2>;
  finalize_council_response: (arg_0: string, arg_1: string, arg_2: string) => Promise<Result_3>;
  get_council_session: (arg_0: string) => Promise<[] | [CouncilSession]>;
  get_chairman_prompt: (arg_0: string) => Promise<Result_2>;
  get_council_config: () => Promise<CouncilConfig>;
  
  // Agent Memory API
  get_agent_memory: (arg_0: string) => Promise<AgentMemory>;
  remember: (arg_0: string, arg_1: string, arg_2: string, arg_3: number, arg_4: string[]) => Promise<Result_2>;
  recall: (arg_0: string, arg_1: string, arg_2: number) => Promise<Memory[]>;
  add_context: (arg_0: string, arg_1: string) => Promise<Result_2>;
  get_context: (arg_0: string) => Promise<string>;
  add_knowledge_node: (arg_0: string, arg_1: string, arg_2: string, arg_3: Array<[string, string]>) => Promise<Result_2>;
  add_knowledge_edge: (arg_0: string, arg_1: string, arg_2: string, arg_3: string, arg_4: number) => Promise<Result_2>;
  find_knowledge_node: (arg_0: string, arg_1: string) => Promise<[] | [KnowledgeNode]>;
  maintain_memory: (arg_0: string) => Promise<Result_2>;
  get_memory_stats: (arg_0: string) => Promise<[bigint, bigint, bigint]>;
}

// IDL Factory
export const idlFactory = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => {
  const AlternativeRoute = IDL.Record({
    'name': IDL.Text,
    'distance_miles': IDL.Float64,
    'duration_hours': IDL.Float64,
    'notes': IDL.Text,
  });
  const RouteOptimization = IDL.Record({
    'origin': IDL.Text,
    'destination': IDL.Text,
    'distance_miles': IDL.Float64,
    'duration_hours': IDL.Float64,
    'fuel_cost_estimate': IDL.Float64,
    'toll_cost_estimate': IDL.Float64,
    'weather_conditions': IDL.Text,
    'traffic_level': IDL.Text,
    'recommended_stops': IDL.Vec(IDL.Text),
    'alternative_routes': IDL.Vec(AlternativeRoute),
    'cached_at': IDL.Nat64,
  });
  const ETAPrediction = IDL.Record({
    'origin': IDL.Text,
    'destination': IDL.Text,
    'current_location': IDL.Opt(IDL.Text),
    'estimated_arrival': IDL.Text,
    'confidence': IDL.Float64,
    'factors': IDL.Vec(IDL.Text),
  });
  const FuelStop = IDL.Record({
    'location': IDL.Text,
    'price_per_gallon': IDL.Float64,
    'distance_from_start': IDL.Float64,
  });
  const FuelOptimization = IDL.Record({
    'route': IDL.Text,
    'total_fuel_gallons': IDL.Float64,
    'estimated_cost': IDL.Float64,
    'recommended_stops': IDL.Vec(FuelStop),
    'potential_savings': IDL.Float64,
  });
  const AIConfig = IDL.Record({
    'admin': IDL.Principal,
    'cache_duration_ns': IDL.Nat64,
    'max_requests_per_minute': IDL.Nat32,
  });
  const QueryPriority = IDL.Variant({
    'Low': IDL.Null,
    'Normal': IDL.Null,
    'High': IDL.Null,
    'Critical': IDL.Null,
  });
  const LLMResponse = IDL.Record({
    'provider_id': IDL.Text,
    'provider_name': IDL.Text,
    'response': IDL.Text,
    'tokens_used': IDL.Nat32,
    'latency_ms': IDL.Nat64,
    'timestamp': IDL.Nat64,
  });
  const ResponseReview = IDL.Record({
    'reviewer_id': IDL.Text,
    'reviewed_response_id': IDL.Text,
    'accuracy_score': IDL.Nat8,
    'insight_score': IDL.Nat8,
    'completeness_score': IDL.Nat8,
    'overall_rank': IDL.Nat8,
    'feedback': IDL.Text,
  });
  const CouncilQuery = IDL.Record({
    'query_id': IDL.Text,
    'user_query': IDL.Text,
    'context': IDL.Opt(IDL.Text),
    'requested_at': IDL.Nat64,
    'priority': QueryPriority,
  });
  const CouncilStage = IDL.Variant({
    'Pending': IDL.Null,
    'CollectingResponses': IDL.Null,
    'ReviewingResponses': IDL.Null,
    'GeneratingConsensus': IDL.Null,
    'Completed': IDL.Null,
    'Failed': IDL.Text,
  });
  const LLMProvider = IDL.Record({
    'id': IDL.Text,
    'name': IDL.Text,
    'model': IDL.Text,
    'api_endpoint': IDL.Text,
    'max_tokens': IDL.Nat32,
    'temperature': IDL.Float32,
    'is_chairman': IDL.Bool,
  });
  const CouncilConfig = IDL.Record({
    'council_id': IDL.Text,
    'name': IDL.Text,
    'members': IDL.Vec(LLMProvider),
    'chairman': IDL.Text,
    'review_enabled': IDL.Bool,
    'anonymize_reviews': IDL.Bool,
    'max_rounds': IDL.Nat8,
  });
  const CouncilSession = IDL.Record({
    'session_id': IDL.Text,
    'config': CouncilConfig,
    'query': CouncilQuery,
    'stage': CouncilStage,
    'individual_responses': IDL.Vec(LLMResponse),
    'reviews': IDL.Vec(ResponseReview),
    'rankings': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat8)),
    'final_response': IDL.Opt(IDL.Text),
    'chairman_summary': IDL.Opt(IDL.Text),
    'total_tokens': IDL.Nat32,
    'total_latency_ms': IDL.Nat64,
    'created_at': IDL.Nat64,
    'completed_at': IDL.Opt(IDL.Nat64),
  });
  const CouncilResult = IDL.Record({
    'session_id': IDL.Text,
    'query': IDL.Text,
    'final_response': IDL.Text,
    'individual_responses': IDL.Vec(LLMResponse),
    'rankings': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat8)),
    'confidence_score': IDL.Float32,
    'dissent_notes': IDL.Opt(IDL.Text),
    'processing_time_ms': IDL.Nat64,
  });
  const MemoryType = IDL.Variant({
    'ShortTerm': IDL.Null,
    'LongTerm': IDL.Null,
    'Episodic': IDL.Null,
    'Semantic': IDL.Null,
    'Procedural': IDL.Null,
  });
  const Memory = IDL.Record({
    'id': IDL.Text,
    'memory_type': MemoryType,
    'content': IDL.Text,
    'summary': IDL.Opt(IDL.Text),
    'embedding': IDL.Opt(IDL.Vec(IDL.Float32)),
    'importance': IDL.Float32,
    'access_count': IDL.Nat32,
    'last_accessed': IDL.Nat64,
    'created_at': IDL.Nat64,
    'metadata': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'related_memories': IDL.Vec(IDL.Text),
    'tags': IDL.Vec(IDL.Text),
  });
  const NodeType = IDL.Variant({
    'Entity': IDL.Null,
    'Concept': IDL.Null,
    'Event': IDL.Null,
    'Action': IDL.Null,
    'Attribute': IDL.Null,
  });
  const KnowledgeNode = IDL.Record({
    'id': IDL.Text,
    'node_type': NodeType,
    'label': IDL.Text,
    'properties': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'embedding': IDL.Opt(IDL.Vec(IDL.Float32)),
    'created_at': IDL.Nat64,
    'updated_at': IDL.Nat64,
  });
  const AgentMemory = IDL.Record({
    'agent_id': IDL.Text,
    'context_window': IDL.Vec(IDL.Text),
    'context_size': IDL.Nat64,
  });
  const Result = IDL.Variant({ 'Ok': RouteOptimization, 'Err': IDL.Text });
  const Result_1 = IDL.Variant({ 'Ok': IDL.Nat64, 'Err': IDL.Text });
  const Result_2 = IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text });
  const Result_3 = IDL.Variant({ 'Ok': CouncilResult, 'Err': IDL.Text });

  return IDL.Service({
    'optimize_route': IDL.Func([IDL.Text, IDL.Text], [Result], []),
    'predict_eta': IDL.Func([IDL.Text, IDL.Text, IDL.Opt(IDL.Text)], [ETAPrediction], ['query']),
    'optimize_fuel': IDL.Func([IDL.Text, IDL.Text, IDL.Float64], [FuelOptimization], ['query']),
    'clear_cache': IDL.Func([], [Result_1], []),
    'get_cache_stats': IDL.Func([], [IDL.Nat64, IDL.Nat64], ['query']),
    'get_cached_route': IDL.Func([IDL.Text, IDL.Text], [IDL.Opt(RouteOptimization)], ['query']),
    'get_config': IDL.Func([], [AIConfig], ['query']),
    'health': IDL.Func([], [IDL.Text], ['query']),
    'create_council_query': IDL.Func([IDL.Text, IDL.Text], [Result_2], []),
    'add_council_response': IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Nat32, IDL.Nat64], [Result_2], []),
    'add_council_review': IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Nat8, IDL.Nat8, IDL.Nat8, IDL.Nat8, IDL.Text], [Result_2], []),
    'finalize_council_response': IDL.Func([IDL.Text, IDL.Text, IDL.Text], [Result_3], []),
    'get_council_session': IDL.Func([IDL.Text], [IDL.Opt(CouncilSession)], ['query']),
    'get_chairman_prompt': IDL.Func([IDL.Text], [Result_2], ['query']),
    'get_council_config': IDL.Func([], [CouncilConfig], ['query']),
    'get_agent_memory': IDL.Func([IDL.Text], [AgentMemory], []),
    'remember': IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Float32, IDL.Vec(IDL.Text)], [Result_2], []),
    'recall': IDL.Func([IDL.Text, IDL.Text, IDL.Nat32], [IDL.Vec(Memory)], ['query']),
    'add_context': IDL.Func([IDL.Text, IDL.Text], [Result_2], []),
    'get_context': IDL.Func([IDL.Text], [IDL.Text], ['query']),
    'add_knowledge_node': IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))], [Result_2], []),
    'add_knowledge_edge': IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Float32], [Result_2], []),
    'find_knowledge_node': IDL.Func([IDL.Text, IDL.Text], [IDL.Opt(KnowledgeNode)], ['query']),
    'maintain_memory': IDL.Func([IDL.Text], [Result_2], []),
    'get_memory_stats': IDL.Func([IDL.Text], [IDL.Nat64, IDL.Nat64, IDL.Nat64], ['query']),
  });
};

export const init = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => { return []; };





