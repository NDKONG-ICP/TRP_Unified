export const idlFactory = ({ IDL }) => {
  const LLMResponse = IDL.Record({
    'provider_name' : IDL.Text,
    'provider_id' : IDL.Text,
    'tokens_used' : IDL.Nat32,
    'response' : IDL.Text,
    'timestamp' : IDL.Nat64,
    'latency_ms' : IDL.Nat64,
  });
  const CouncilResult = IDL.Record({
    'user_query' : IDL.Text,
    'rankings' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat8)),
    'session_id' : IDL.Text,
    'final_response' : IDL.Text,
    'processing_time_ms' : IDL.Nat64,
    'individual_responses' : IDL.Vec(LLMResponse),
    'dissent_notes' : IDL.Opt(IDL.Text),
    'confidence_score' : IDL.Float32,
  });
  const NodeType = IDL.Variant({
    'Event' : IDL.Null,
    'Entity' : IDL.Null,
    'Action' : IDL.Null,
    'Attribute' : IDL.Null,
    'Concept' : IDL.Null,
  });
  const KnowledgeNode = IDL.Record({
    'id' : IDL.Text,
    'updated_at' : IDL.Nat64,
    'node_type' : NodeType,
    'properties' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'created_at' : IDL.Nat64,
    'label' : IDL.Text,
    'embedding' : IDL.Opt(IDL.Vec(IDL.Float32)),
  });
  const AgentMemory = IDL.Record({
    'agent_id' : IDL.Text,
    'context_window' : IDL.Vec(IDL.Text),
    'context_size' : IDL.Nat64,
  });
  const AlternativeRoute = IDL.Record({
    'name' : IDL.Text,
    'duration_hours' : IDL.Float64,
    'notes' : IDL.Text,
    'distance_miles' : IDL.Float64,
  });
  const RouteOptimization = IDL.Record({
    'fuel_cost_estimate' : IDL.Float64,
    'destination' : IDL.Text,
    'alternative_routes' : IDL.Vec(AlternativeRoute),
    'origin' : IDL.Text,
    'cached_at' : IDL.Nat64,
    'traffic_level' : IDL.Text,
    'toll_cost_estimate' : IDL.Float64,
    'duration_hours' : IDL.Float64,
    'weather_conditions' : IDL.Text,
    'distance_miles' : IDL.Float64,
    'recommended_stops' : IDL.Vec(IDL.Text),
  });
  const AIConfig = IDL.Record({
    'admin' : IDL.Principal,
    'cache_duration_ns' : IDL.Nat64,
    'max_requests_per_minute' : IDL.Nat32,
  });
  const LLMProvider = IDL.Record({
    'id' : IDL.Text,
    'model' : IDL.Text,
    'is_chairman' : IDL.Bool,
    'temperature' : IDL.Float32,
    'name' : IDL.Text,
    'max_tokens' : IDL.Nat32,
    'api_endpoint' : IDL.Text,
  });
  const CouncilConfig = IDL.Record({
    'review_enabled' : IDL.Bool,
    'members' : IDL.Vec(LLMProvider),
    'council_id' : IDL.Text,
    'name' : IDL.Text,
    'anonymize_reviews' : IDL.Bool,
    'chairman' : IDL.Text,
    'max_rounds' : IDL.Nat8,
  });
  const ResponseReview = IDL.Record({
    'insight_score' : IDL.Nat8,
    'overall_rank' : IDL.Nat8,
    'reviewer_id' : IDL.Text,
    'feedback' : IDL.Text,
    'reviewed_response_id' : IDL.Text,
    'completeness_score' : IDL.Nat8,
    'accuracy_score' : IDL.Nat8,
  });
  const CouncilStage = IDL.Variant({
    'Failed' : IDL.Text,
    'ReviewingResponses' : IDL.Null,
    'GeneratingConsensus' : IDL.Null,
    'CollectingResponses' : IDL.Null,
    'Completed' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const QueryPriority = IDL.Variant({
    'Low' : IDL.Null,
    'High' : IDL.Null,
    'Normal' : IDL.Null,
    'Critical' : IDL.Null,
  });
  const CouncilQuery = IDL.Record({
    'user_query' : IDL.Text,
    'context' : IDL.Opt(IDL.Text),
    'requested_at' : IDL.Nat64,
    'query_id' : IDL.Text,
    'priority' : QueryPriority,
  });
  const CouncilSession = IDL.Record({
    'rankings' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat8)),
    'reviews' : IDL.Vec(ResponseReview),
    'session_id' : IDL.Text,
    'final_response' : IDL.Opt(IDL.Text),
    'chairman_summary' : IDL.Opt(IDL.Text),
    'created_at' : IDL.Nat64,
    'stage' : CouncilStage,
    'individual_responses' : IDL.Vec(LLMResponse),
    'total_latency_ms' : IDL.Nat64,
    'config' : CouncilConfig,
    'completed_at' : IDL.Opt(IDL.Nat64),
    'total_tokens' : IDL.Nat32,
    'council_query' : CouncilQuery,
  });
  const FuelStop = IDL.Record({
    'price_per_gallon' : IDL.Float64,
    'location' : IDL.Text,
    'distance_from_start' : IDL.Float64,
  });
  const FuelOptimization = IDL.Record({
    'potential_savings' : IDL.Float64,
    'recommended_stops' : IDL.Vec(FuelStop),
    'estimated_cost' : IDL.Float64,
    'route' : IDL.Text,
    'total_fuel_gallons' : IDL.Float64,
  });
  const ETAPrediction = IDL.Record({
    'destination' : IDL.Text,
    'estimated_arrival' : IDL.Text,
    'origin' : IDL.Text,
    'current_location' : IDL.Opt(IDL.Text),
    'factors' : IDL.Vec(IDL.Text),
    'confidence' : IDL.Float64,
  });
  const MemoryType = IDL.Variant({
    'Episodic' : IDL.Null,
    'Procedural' : IDL.Null,
    'ShortTerm' : IDL.Null,
    'LongTerm' : IDL.Null,
    'Semantic' : IDL.Null,
  });
  const Memory = IDL.Record({
    'id' : IDL.Text,
    'content' : IDL.Text,
    'memory_type' : MemoryType,
    'metadata' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'tags' : IDL.Vec(IDL.Text),
    'importance' : IDL.Float32,
    'created_at' : IDL.Nat64,
    'last_accessed' : IDL.Nat64,
    'summary' : IDL.Opt(IDL.Text),
    'related_memories' : IDL.Vec(IDL.Text),
    'embedding' : IDL.Opt(IDL.Vec(IDL.Float32)),
    'access_count' : IDL.Nat32,
  });
  return IDL.Service({
    'add_context' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'add_council_response' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Nat32, IDL.Nat64],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'add_council_review' : IDL.Func(
        [
          IDL.Text,
          IDL.Text,
          IDL.Text,
          IDL.Nat8,
          IDL.Nat8,
          IDL.Nat8,
          IDL.Nat8,
          IDL.Text,
        ],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'add_knowledge_edge' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Float32],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'add_knowledge_node' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'clear_cache' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'create_council_query' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'finalize_council_response' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : CouncilResult, 'Err' : IDL.Text })],
        [],
      ),
    'find_knowledge_node' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Opt(KnowledgeNode)],
        ['query'],
      ),
    'get_agent_memory' : IDL.Func([IDL.Text], [AgentMemory], []),
    'get_cache_stats' : IDL.Func([], [IDL.Nat64, IDL.Nat64], ['query']),
    'get_cached_route' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Opt(RouteOptimization)],
        ['query'],
      ),
    'get_chairman_prompt' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        ['query'],
      ),
    'get_config' : IDL.Func([], [AIConfig], ['query']),
    'get_context' : IDL.Func([IDL.Text], [IDL.Text], ['query']),
    'get_council_config' : IDL.Func([], [CouncilConfig], ['query']),
    'get_council_session' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(CouncilSession)],
        ['query'],
      ),
    'get_memory_stats' : IDL.Func(
        [IDL.Text],
        [IDL.Nat64, IDL.Nat64, IDL.Nat64],
        ['query'],
      ),
    'health' : IDL.Func([], [IDL.Text], ['query']),
    'maintain_memory' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'optimize_fuel' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Float64],
        [FuelOptimization],
        ['query'],
      ),
    'optimize_route' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : RouteOptimization, 'Err' : IDL.Text })],
        [],
      ),
    'predict_eta' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
        [ETAPrediction],
        ['query'],
      ),
    'recall' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Nat32],
        [IDL.Vec(Memory)],
        ['query'],
      ),
    'remember' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Float32, IDL.Vec(IDL.Text)],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
