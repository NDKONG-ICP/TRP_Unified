export const idlFactory = ({ IDL }) => {
  const InitArgs = IDL.Record({
    'personality' : IDL.Opt(IDL.Text),
    'token_id' : IDL.Nat64,
    'owner' : IDL.Principal,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'specialization' : IDL.Opt(IDL.Text),
  });
  const ChatResponse = IDL.Record({
    'voice_url' : IDL.Opt(IDL.Text),
    'conversation_id' : IDL.Nat64,
    'message' : IDL.Text,
    'timestamp' : IDL.Nat64,
  });
  const ClaimResult = IDL.Record({
    'message' : IDL.Text,
    'wallet_type' : IDL.Text,
    'success' : IDL.Bool,
    'new_owner' : IDL.Principal,
  });
  const AxiomConfig = IDL.Record({
    'controllers' : IDL.Vec(IDL.Text),
    'system_prompt' : IDL.Text,
    'temperature' : IDL.Float64,
    'max_memory_entries' : IDL.Nat64,
    'voice_id' : IDL.Text,
    'voice_enabled' : IDL.Bool,
    'max_conversation_length' : IDL.Nat64,
  });
  const ChatMessage = IDL.Record({
    'voice_url' : IDL.Opt(IDL.Text),
    'content' : IDL.Text,
    'role' : IDL.Text,
    'timestamp' : IDL.Nat64,
  });
  const Conversation = IDL.Record({
    'id' : IDL.Nat64,
    'messages' : IDL.Vec(ChatMessage),
    'user' : IDL.Principal,
    'last_message_at' : IDL.Nat64,
    'summary' : IDL.Opt(IDL.Text),
    'started_at' : IDL.Nat64,
  });
  const MemoryEntry = IDL.Record({
    'key' : IDL.Text,
    'value' : IDL.Text,
    'importance' : IDL.Nat8,
    'created_at' : IDL.Nat64,
    'last_accessed' : IDL.Nat64,
    'category' : IDL.Text,
    'access_count' : IDL.Nat64,
  });
  const MultichainMetadata = IDL.Record({
    'bridge_protocol' : IDL.Opt(IDL.Text),
    'sui_package_id' : IDL.Opt(IDL.Text),
    'evm_chain_id' : IDL.Opt(IDL.Nat64),
    'erc1155_token_id' : IDL.Opt(IDL.Text),
    'erc1155_contract' : IDL.Opt(IDL.Text),
    'standards' : IDL.Vec(IDL.Text),
    'btc_inscription' : IDL.Opt(IDL.Text),
    'bridge_address' : IDL.Opt(IDL.Text),
    'btc_brc20' : IDL.Opt(IDL.Text),
    'sol_edition' : IDL.Opt(IDL.Text),
    'btc_runes' : IDL.Opt(IDL.Text),
    'ton_collection' : IDL.Opt(IDL.Text),
    'icp_canister' : IDL.Text,
    'sui_object_id' : IDL.Opt(IDL.Text),
    'sol_mint' : IDL.Opt(IDL.Text),
    'eth_token_id' : IDL.Opt(IDL.Text),
    'ton_item' : IDL.Opt(IDL.Text),
    'eth_contract' : IDL.Opt(IDL.Text),
  });
  const AxiomMetadata = IDL.Record({
    'personality' : IDL.Text,
    'token_id' : IDL.Nat64,
    'image_url' : IDL.Text,
    'owner' : IDL.Principal,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'created_at' : IDL.Nat64,
    'last_active' : IDL.Nat64,
    'specialization' : IDL.Text,
    'total_messages' : IDL.Nat64,
    'multichain_metadata' : MultichainMetadata,
    'total_conversations' : IDL.Nat64,
  });
  const WalletSupport = IDL.Record({
    'supported' : IDL.Bool,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'wallet_type' : IDL.Text,
    'claim_method' : IDL.Text,
  });
  const HttpRequest = IDL.Record({
    'url' : IDL.Text,
    'method' : IDL.Text,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
  });
  const HttpResponse = IDL.Record({
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'status_code' : IDL.Nat16,
  });
  const OwnershipStatus = IDL.Record({
    'token_id' : IDL.Nat64,
    'owner' : IDL.Principal,
    'can_interact' : IDL.Bool,
    'is_owner' : IDL.Bool,
    'caller' : IDL.Principal,
    'is_controller' : IDL.Bool,
  });
  return IDL.Service({
    'add_memory' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Nat8],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'chat' : IDL.Func(
        [IDL.Text, IDL.Opt(IDL.Nat64)],
        [IDL.Variant({ 'Ok' : ChatResponse, 'Err' : IDL.Text })],
        [],
      ),
    'claim_with_internet_identity' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : ClaimResult, 'Err' : IDL.Text })],
        [],
      ),
    'claim_with_oisy' : IDL.Func(
        [IDL.Principal],
        [IDL.Variant({ 'Ok' : ClaimResult, 'Err' : IDL.Text })],
        [],
      ),
    'claim_with_plug' : IDL.Func(
        [IDL.Principal],
        [IDL.Variant({ 'Ok' : ClaimResult, 'Err' : IDL.Text })],
        [],
      ),
    'clear_memories' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'get_config' : IDL.Func([], [AxiomConfig], ['query']),
    'get_conversation' : IDL.Func(
        [IDL.Nat64],
        [IDL.Opt(Conversation)],
        ['query'],
      ),
    'get_conversations' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(Conversation)],
        ['query'],
      ),
    'get_memories' : IDL.Func([], [IDL.Vec(MemoryEntry)], ['query']),
    'get_metadata' : IDL.Func([], [AxiomMetadata], ['query']),
    'get_multichain_metadata' : IDL.Func([], [MultichainMetadata], ['query']),
    'get_supported_wallets' : IDL.Func([], [IDL.Vec(WalletSupport)], ['query']),
    'health' : IDL.Func([], [IDL.Text], ['query']),
    'http_request' : IDL.Func([HttpRequest], [HttpResponse], ['query']),
    'http_update' : IDL.Func([HttpRequest], [HttpResponse], []),
    'transfer_ownership' : IDL.Func(
        [IDL.Principal],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'update_config' : IDL.Func(
        [
          IDL.Opt(IDL.Bool),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Float64),
        ],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'update_multichain_metadata' : IDL.Func(
        [
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Nat64),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
        ],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'update_token_info' : IDL.Func(
        [IDL.Nat64, IDL.Opt(IDL.Text)],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'verify_ownership' : IDL.Func([], [OwnershipStatus], ['query']),
  });
};
export const init = ({ IDL }) => {
  const InitArgs = IDL.Record({
    'personality' : IDL.Opt(IDL.Text),
    'token_id' : IDL.Nat64,
    'owner' : IDL.Principal,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'specialization' : IDL.Opt(IDL.Text),
  });
  return [InitArgs];
};
