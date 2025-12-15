// NFT canister declarations
import type { Principal } from '@dfinity/principal';

// Types
export type Rarity = { 'Common': null } | { 'Uncommon': null } | { 'Rare': null } | { 'Epic': null } | { 'Legendary': null };

export interface Trait {
  trait_type: string;
  value: string;
  rarity_score: number;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url: [] | [string];
  attributes: Trait[];
  rarity: Rarity;
  rarity_score: number;
  collection: string;
  created_at: bigint;
  creator: Principal;
}

export interface CollectionConfig {
  name: string;
  symbol: string;
  description: string;
  max_supply: bigint;
  minted: bigint;
  royalty_bps: number;
  admin: Principal;
  paused: boolean;
}

export interface TransferArg {
  from_subaccount: [] | [Uint8Array];
  to: Principal;
  token_id: bigint;
  memo: [] | [Uint8Array];
  created_at_time: [] | [bigint];
}

export type TransferError = 
  | { 'NonExistingTokenId': null }
  | { 'InvalidRecipient': null }
  | { 'Unauthorized': null }
  | { 'TooOld': null }
  | { 'CreatedInFuture': { ledger_time: bigint } }
  | { 'Duplicate': { duplicate_of: bigint } }
  | { 'GenericError': { error_code: bigint; message: string } }
  | { 'GenericBatchError': { error_code: bigint; message: string } };

export interface MintArgs {
  to: Principal;
  name: string;
  description: string;
  image: string;
  attributes: Trait[];
}

export interface ControllerConfig {
  admin_principals: Principal[];
  backend_canisters: Principal[];
  frontend_canister: [] | [Principal];
  auto_add_app_controllers: boolean;
  minter_retains_control: boolean;
}

export interface NFTControllerRecord {
  token_id: bigint;
  canister_id: [] | [Principal];
  controllers: Principal[];
  owner: Principal;
  created_at: bigint;
  last_updated: bigint;
}

export type Result = { 'Ok': bigint } | { 'Err': string };
export type Result_1 = { 'Ok': null } | { 'Err': string };
export type Result_2 = { 'Ok': NFTControllerRecord } | { 'Err': string };
export type TransferResult = { 'Ok': bigint } | { 'Err': TransferError };

export interface _SERVICE {
  // ICRC-7 Standard
  icrc7_collection_metadata: () => Promise<Array<[string, string]>>;
  icrc7_name: () => Promise<string>;
  icrc7_symbol: () => Promise<string>;
  icrc7_total_supply: () => Promise<bigint>;
  icrc7_supply_cap: () => Promise<[] | [bigint]>;
  icrc7_owner_of: (arg_0: bigint) => Promise<[] | [Principal]>;
  icrc7_balance_of: (arg_0: Principal) => Promise<bigint>;
  icrc7_tokens_of: (arg_0: Principal) => Promise<bigint[]>;
  icrc7_token_metadata: (arg_0: bigint) => Promise<[] | [Array<[string, string]>]>;
  
  // ICRC-37 Transfer
  icrc7_transfer: (arg_0: TransferArg[]) => Promise<Array<[] | [TransferResult]>>;
  icrc37_approve: (arg_0: bigint, arg_1: Principal) => Promise<Result_1>;
  
  // Minting
  mint: (arg_0: MintArgs) => Promise<Result>;
  batch_mint: (arg_0: MintArgs[]) => Promise<Result[]>;
  
  // Admin
  set_paused: (arg_0: boolean) => Promise<Result_1>;
  update_collection_config: (arg_0: string, arg_1: string, arg_2: string, arg_3: number) => Promise<Result_1>;
  
  // Controller Management
  get_controller_config: () => Promise<ControllerConfig>;
  get_nft_controllers: (arg_0: bigint) => Promise<[] | [NFTControllerRecord]>;
  set_backend_canisters: (arg_0: Principal[]) => Promise<Result_1>;
  set_frontend_canister: (arg_0: Principal) => Promise<Result_1>;
  add_admin_principal: (arg_0: Principal) => Promise<Result_1>;
  remove_admin_principal: (arg_0: Principal) => Promise<Result_1>;
  register_nft_controllers: (arg_0: bigint, arg_1: [] | [Principal]) => Promise<Result_2>;
  update_nft_controllers: (arg_0: bigint) => Promise<Result_2>;
  get_all_controller_records: () => Promise<NFTControllerRecord[]>;
  is_authorized_nft_controller: (arg_0: Principal) => Promise<boolean>;
  get_backend_controllers: () => Promise<Principal[]>;
  get_admin_principals: () => Promise<Principal[]>;
  
  // Queries
  get_collection_config: () => Promise<CollectionConfig>;
  get_nft_metadata: (arg_0: bigint) => Promise<[] | [NFTMetadata]>;
  health: () => Promise<string>;
}

// IDL Factory
export const idlFactory = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => {
  const Rarity = IDL.Variant({
    'Common': IDL.Null,
    'Uncommon': IDL.Null,
    'Rare': IDL.Null,
    'Epic': IDL.Null,
    'Legendary': IDL.Null,
  });
  const Trait = IDL.Record({
    'trait_type': IDL.Text,
    'value': IDL.Text,
    'rarity_score': IDL.Nat8,
  });
  const NFTMetadata = IDL.Record({
    'name': IDL.Text,
    'description': IDL.Text,
    'image': IDL.Text,
    'external_url': IDL.Opt(IDL.Text),
    'attributes': IDL.Vec(Trait),
    'rarity': Rarity,
    'rarity_score': IDL.Nat32,
    'collection': IDL.Text,
    'created_at': IDL.Nat64,
    'creator': IDL.Principal,
  });
  const CollectionConfig = IDL.Record({
    'name': IDL.Text,
    'symbol': IDL.Text,
    'description': IDL.Text,
    'max_supply': IDL.Nat64,
    'minted': IDL.Nat64,
    'royalty_bps': IDL.Nat16,
    'admin': IDL.Principal,
    'paused': IDL.Bool,
  });
  const TransferArg = IDL.Record({
    'from_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
    'to': IDL.Principal,
    'token_id': IDL.Nat,
    'memo': IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time': IDL.Opt(IDL.Nat64),
  });
  const TransferError = IDL.Variant({
    'NonExistingTokenId': IDL.Null,
    'InvalidRecipient': IDL.Null,
    'Unauthorized': IDL.Null,
    'TooOld': IDL.Null,
    'CreatedInFuture': IDL.Record({ 'ledger_time': IDL.Nat64 }),
    'Duplicate': IDL.Record({ 'duplicate_of': IDL.Nat }),
    'GenericError': IDL.Record({ 'error_code': IDL.Nat, 'message': IDL.Text }),
    'GenericBatchError': IDL.Record({ 'error_code': IDL.Nat, 'message': IDL.Text }),
  });
  const MintArgs = IDL.Record({
    'to': IDL.Principal,
    'name': IDL.Text,
    'description': IDL.Text,
    'image': IDL.Text,
    'attributes': IDL.Vec(Trait),
  });
  const ControllerConfig = IDL.Record({
    'admin_principals': IDL.Vec(IDL.Principal),
    'backend_canisters': IDL.Vec(IDL.Principal),
    'frontend_canister': IDL.Opt(IDL.Principal),
    'auto_add_app_controllers': IDL.Bool,
    'minter_retains_control': IDL.Bool,
  });
  const NFTControllerRecord = IDL.Record({
    'token_id': IDL.Nat64,
    'canister_id': IDL.Opt(IDL.Principal),
    'controllers': IDL.Vec(IDL.Principal),
    'owner': IDL.Principal,
    'created_at': IDL.Nat64,
    'last_updated': IDL.Nat64,
  });
  const Result = IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text });
  const Result_1 = IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text });
  const Result_2 = IDL.Variant({ 'Ok': NFTControllerRecord, 'Err': IDL.Text });
  const TransferResult = IDL.Variant({ 'Ok': IDL.Nat, 'Err': TransferError });

  return IDL.Service({
    'icrc7_collection_metadata': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))], ['query']),
    'icrc7_name': IDL.Func([], [IDL.Text], ['query']),
    'icrc7_symbol': IDL.Func([], [IDL.Text], ['query']),
    'icrc7_total_supply': IDL.Func([], [IDL.Nat], ['query']),
    'icrc7_supply_cap': IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'icrc7_owner_of': IDL.Func([IDL.Nat], [IDL.Opt(IDL.Principal)], ['query']),
    'icrc7_balance_of': IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'icrc7_tokens_of': IDL.Func([IDL.Principal], [IDL.Vec(IDL.Nat)], ['query']),
    'icrc7_token_metadata': IDL.Func([IDL.Nat], [IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)))], ['query']),
    'icrc7_transfer': IDL.Func([IDL.Vec(TransferArg)], [IDL.Vec(IDL.Opt(TransferResult))], []),
    'icrc37_approve': IDL.Func([IDL.Nat, IDL.Principal], [Result_1], []),
    'mint': IDL.Func([MintArgs], [Result], []),
    'batch_mint': IDL.Func([IDL.Vec(MintArgs)], [IDL.Vec(Result)], []),
    'set_paused': IDL.Func([IDL.Bool], [Result_1], []),
    'update_collection_config': IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Nat16], [Result_1], []),
    'get_controller_config': IDL.Func([], [ControllerConfig], ['query']),
    'get_nft_controllers': IDL.Func([IDL.Nat64], [IDL.Opt(NFTControllerRecord)], ['query']),
    'set_backend_canisters': IDL.Func([IDL.Vec(IDL.Principal)], [Result_1], []),
    'set_frontend_canister': IDL.Func([IDL.Principal], [Result_1], []),
    'add_admin_principal': IDL.Func([IDL.Principal], [Result_1], []),
    'remove_admin_principal': IDL.Func([IDL.Principal], [Result_1], []),
    'register_nft_controllers': IDL.Func([IDL.Nat64, IDL.Opt(IDL.Principal)], [Result_2], []),
    'update_nft_controllers': IDL.Func([IDL.Nat64], [Result_2], []),
    'get_all_controller_records': IDL.Func([], [IDL.Vec(NFTControllerRecord)], ['query']),
    'is_authorized_nft_controller': IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'get_backend_controllers': IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'get_admin_principals': IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'get_collection_config': IDL.Func([], [CollectionConfig], ['query']),
    'get_nft_metadata': IDL.Func([IDL.Nat], [IDL.Opt(NFTMetadata)], ['query']),
    'health': IDL.Func([], [IDL.Text], ['query']),
  });
};

export const init = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => { return []; };





