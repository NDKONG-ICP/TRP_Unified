export const idlFactory = ({ IDL }) => {
  const ChatMessage = IDL.Record({
    'content' : IDL.Text,
    'role' : IDL.Text,
    'timestamp' : IDL.Nat64,
  });
  const AIRequest = IDL.Record({
    'use_onchain' : IDL.Bool,
    'context' : IDL.Vec(ChatMessage),
    'system_prompt' : IDL.Opt(IDL.Text),
    'token_id' : IDL.Opt(IDL.Nat64),
    'query_text' : IDL.Text,
    'use_http_parallel' : IDL.Bool,
  });
  const AIResponse = IDL.Record({
    'inference_method' : IDL.Text,
    'tokens_used' : IDL.Nat32,
    'response' : IDL.Text,
    'latency_ms' : IDL.Nat64,
    'confidence_score' : IDL.Float32,
    'model_responses' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text, IDL.Float32)),
  });
  const MemoryResult = IDL.Record({
    'id' : IDL.Text,
    'metadata' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'vector' : IDL.Vec(IDL.Float32),
    'similarity' : IDL.Float32,
  });
  const VoiceRequest = IDL.Record({
    'similarity_boost' : IDL.Opt(IDL.Float32),
    'text' : IDL.Text,
    'stability' : IDL.Opt(IDL.Float32),
    'voice_id' : IDL.Opt(IDL.Text),
  });
  const VoiceResponse = IDL.Record({
    'audio_base64' : IDL.Text,
    'characters_used' : IDL.Nat32,
    'duration_ms' : IDL.Nat64,
  });
  return IDL.Service({
    'get_status' : IDL.Func(
        [],
        [IDL.Bool, IDL.Nat64, IDL.Nat32, IDL.Nat32],
        ['query'],
      ),
    'process_ai_request' : IDL.Func(
        [AIRequest],
        [IDL.Variant({ 'Ok' : AIResponse, 'Err' : IDL.Text })],
        [],
      ),
    'query_memory' : IDL.Func(
        [IDL.Text, IDL.Nat32],
        [IDL.Variant({ 'Ok' : IDL.Vec(MemoryResult), 'Err' : IDL.Text })],
        ['query'],
      ),
    'register_model_canister' : IDL.Func(
        [IDL.Nat32, IDL.Principal],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'register_vector_db_canister' : IDL.Func(
        [IDL.Nat32, IDL.Principal],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'store_memory' : IDL.Func(
        [
          IDL.Text,
          IDL.Vec(IDL.Float32),
          IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
          IDL.Float32,
        ],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'synthesize_voice' : IDL.Func(
        [VoiceRequest],
        [IDL.Variant({ 'Ok' : VoiceResponse, 'Err' : IDL.Text })],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
