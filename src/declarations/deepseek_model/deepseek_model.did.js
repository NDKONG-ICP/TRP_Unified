export const idlFactory = ({ IDL }) => {
  const ModelShard = IDL.Record({
    'shard_data' : IDL.Vec(IDL.Nat8),
    'model_hash' : IDL.Text,
    'shard_size' : IDL.Nat64,
    'shard_id' : IDL.Nat32,
    'quantization' : IDL.Opt(IDL.Text),
    'shard_index' : IDL.Nat64,
    'total_shards' : IDL.Nat32,
    'compression_ratio' : IDL.Opt(IDL.Float32),
  });
  const ChatMessage = IDL.Record({
    'content' : IDL.Text,
    'role' : IDL.Text,
    'timestamp' : IDL.Nat64,
  });
  const InferenceRequest = IDL.Record({
    'top_p' : IDL.Float32,
    'context' : IDL.Vec(ChatMessage),
    'system_prompt' : IDL.Opt(IDL.Text),
    'temperature' : IDL.Float32,
    'max_tokens' : IDL.Nat32,
    'prompt' : IDL.Text,
  });
  const InferenceResponse = IDL.Record({
    'inference_time_ms' : IDL.Nat64,
    'response' : IDL.Text,
    'shards_used' : IDL.Vec(IDL.Nat32),
    'tokens_generated' : IDL.Nat32,
  });
  return IDL.Service({
    'get_all_shard_ids' : IDL.Func([], [IDL.Vec(IDL.Nat32)], ['query']),
    'get_model_info' : IDL.Func(
        [],
        [IDL.Text, IDL.Nat32, IDL.Nat64],
        ['query'],
      ),
    'get_shard' : IDL.Func(
        [IDL.Nat32],
        [IDL.Variant({ 'Ok' : ModelShard, 'Err' : IDL.Text })],
        ['query'],
      ),
    'get_status' : IDL.Func([], [IDL.Bool, IDL.Nat64, IDL.Nat32], ['query']),
    'infer' : IDL.Func(
        [InferenceRequest],
        [IDL.Variant({ 'Ok' : InferenceResponse, 'Err' : IDL.Text })],
        [],
      ),
    'infer_with_shards' : IDL.Func(
        [InferenceRequest, IDL.Vec(IDL.Nat32)],
        [IDL.Variant({ 'Ok' : InferenceResponse, 'Err' : IDL.Text })],
        [],
      ),
    'store_shard' : IDL.Func(
        [ModelShard],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
