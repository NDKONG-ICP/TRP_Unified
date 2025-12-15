export const idlFactory = ({ IDL }) => {
  const VectorEmbedding = IDL.Record({
    'id' : IDL.Text,
    'metadata' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'shard_id' : IDL.Nat32,
    'importance' : IDL.Float32,
    'vector' : IDL.Vec(IDL.Float32),
    'timestamp' : IDL.Nat64,
  });
  const QueryResult = IDL.Record({
    'id' : IDL.Text,
    'metadata' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'vector' : IDL.Vec(IDL.Float32),
    'similarity' : IDL.Float32,
    'timestamp' : IDL.Nat64,
  });
  const QueryRequest = IDL.Record({
    'top_k' : IDL.Nat32,
    'min_similarity' : IDL.Float32,
    'filter_metadata' : IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))),
    'query_vector' : IDL.Vec(IDL.Float32),
  });
  return IDL.Service({
    'delete_vector' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'get_all_vector_ids' : IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'get_shard_info' : IDL.Func([], [IDL.Nat32, IDL.Nat64], ['query']),
    'get_status' : IDL.Func([], [IDL.Bool, IDL.Nat64, IDL.Nat64], ['query']),
    'get_vector' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : VectorEmbedding, 'Err' : IDL.Text })],
        ['query'],
      ),
    'query_similar' : IDL.Func(
        [IDL.Vec(IDL.Float32), IDL.Nat32],
        [IDL.Variant({ 'Ok' : IDL.Vec(QueryResult), 'Err' : IDL.Text })],
        ['query'],
      ),
    'query_vectors' : IDL.Func(
        [QueryRequest],
        [IDL.Variant({ 'Ok' : IDL.Vec(QueryResult), 'Err' : IDL.Text })],
        ['query'],
      ),
    'store_vector' : IDL.Func(
        [VectorEmbedding],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
