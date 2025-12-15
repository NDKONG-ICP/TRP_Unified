export const idlFactory = ({ IDL }) => {
  const Trait = IDL.Record({
    'trait_type' : IDL.Text,
    'value' : IDL.Text,
    'rarity_score' : IDL.Nat8,
  });
  const MintArgs = IDL.Record({
    'to' : IDL.Principal,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'attributes' : IDL.Vec(Trait),
    'image' : IDL.Text,
  });
  const NFTControllerRecord = IDL.Record({
    'controllers' : IDL.Vec(IDL.Principal),
    'token_id' : IDL.Nat64,
    'owner' : IDL.Principal,
    'canister_id' : IDL.Opt(IDL.Principal),
    'last_updated' : IDL.Nat64,
    'created_at' : IDL.Nat64,
  });
  const CollectionConfig = IDL.Record({
    'admin' : IDL.Principal,
    'name' : IDL.Text,
    'minted' : IDL.Nat64,
    'description' : IDL.Text,
    'max_supply' : IDL.Nat64,
    'symbol' : IDL.Text,
    'paused' : IDL.Bool,
    'royalty_bps' : IDL.Nat16,
  });
  const ControllerConfig = IDL.Record({
    'frontend_canister' : IDL.Opt(IDL.Principal),
    'auto_add_app_controllers' : IDL.Bool,
    'minter_retains_control' : IDL.Bool,
    'backend_canisters' : IDL.Vec(IDL.Principal),
    'admin_principals' : IDL.Vec(IDL.Principal),
  });
  const Rarity = IDL.Variant({
    'Epic' : IDL.Null,
    'Rare' : IDL.Null,
    'Uncommon' : IDL.Null,
    'Legendary' : IDL.Null,
    'Common' : IDL.Null,
  });
  const NFTMetadata = IDL.Record({
    'creator' : IDL.Principal,
    'collection' : IDL.Text,
    'external_url' : IDL.Opt(IDL.Text),
    'rarity_score' : IDL.Nat32,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'created_at' : IDL.Nat64,
    'attributes' : IDL.Vec(Trait),
    'rarity' : Rarity,
    'image' : IDL.Text,
  });
  const TransferError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat }),
    'NonExistingTokenId' : IDL.Null,
    'Unauthorized' : IDL.Null,
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'InvalidRecipient' : IDL.Null,
    'GenericBatchError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TooOld' : IDL.Null,
  });
  const TransferArg = IDL.Record({
    'to' : IDL.Principal,
    'token_id' : IDL.Nat,
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'from_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time' : IDL.Opt(IDL.Nat64),
  });
  return IDL.Service({
    'add_admin_principal' : IDL.Func(
        [IDL.Principal],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'batch_mint' : IDL.Func(
        [IDL.Vec(MintArgs)],
        [IDL.Vec(IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text }))],
        [],
      ),
    'get_admin_principals' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'get_all_controller_records' : IDL.Func(
        [],
        [IDL.Vec(NFTControllerRecord)],
        ['query'],
      ),
    'get_backend_controllers' : IDL.Func(
        [],
        [IDL.Vec(IDL.Principal)],
        ['query'],
      ),
    'get_collection_config' : IDL.Func([], [CollectionConfig], ['query']),
    'get_controller_config' : IDL.Func([], [ControllerConfig], ['query']),
    'get_nft_controllers' : IDL.Func(
        [IDL.Nat64],
        [IDL.Opt(NFTControllerRecord)],
        ['query'],
      ),
    'get_nft_metadata' : IDL.Func([IDL.Nat], [IDL.Opt(NFTMetadata)], ['query']),
    'health' : IDL.Func([], [IDL.Text], ['query']),
    'icrc37_approve' : IDL.Func(
        [IDL.Nat, IDL.Principal],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : TransferError })],
        [],
      ),
    'icrc7_balance_of' : IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'icrc7_collection_metadata' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
        ['query'],
      ),
    'icrc7_name' : IDL.Func([], [IDL.Text], ['query']),
    'icrc7_owner_of' : IDL.Func([IDL.Nat], [IDL.Opt(IDL.Principal)], ['query']),
    'icrc7_supply_cap' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc7_symbol' : IDL.Func([], [IDL.Text], ['query']),
    'icrc7_token_metadata' : IDL.Func(
        [IDL.Nat],
        [IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)))],
        ['query'],
      ),
    'icrc7_tokens_of' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(IDL.Nat)],
        ['query'],
      ),
    'icrc7_total_supply' : IDL.Func([], [IDL.Nat], ['query']),
    'icrc7_transfer' : IDL.Func(
        [IDL.Vec(TransferArg)],
        [
          IDL.Vec(
            IDL.Opt(IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : TransferError }))
          ),
        ],
        [],
      ),
    'is_authorized_nft_controller' : IDL.Func(
        [IDL.Principal],
        [IDL.Bool],
        ['query'],
      ),
    'mint' : IDL.Func(
        [MintArgs],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text })],
        [],
      ),
    'register_nft_controllers' : IDL.Func(
        [IDL.Nat64, IDL.Opt(IDL.Principal)],
        [IDL.Variant({ 'Ok' : NFTControllerRecord, 'Err' : IDL.Text })],
        [],
      ),
    'remove_admin_principal' : IDL.Func(
        [IDL.Principal],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'set_backend_canisters' : IDL.Func(
        [IDL.Vec(IDL.Principal)],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'set_frontend_canister' : IDL.Func(
        [IDL.Principal],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'set_paused' : IDL.Func(
        [IDL.Bool],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'update_collection_config' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Nat16],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'update_nft_controllers' : IDL.Func(
        [IDL.Nat64],
        [IDL.Variant({ 'Ok' : NFTControllerRecord, 'Err' : IDL.Text })],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
