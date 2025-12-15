import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface CollectionConfig {
  'admin' : Principal,
  'name' : string,
  'minted' : bigint,
  'description' : string,
  'max_supply' : bigint,
  'symbol' : string,
  'paused' : boolean,
  'royalty_bps' : number,
}
/**
 * Controller Configuration Types
 */
export interface ControllerConfig {
  'frontend_canister' : [] | [Principal],
  'auto_add_app_controllers' : boolean,
  'minter_retains_control' : boolean,
  'backend_canisters' : Array<Principal>,
  'admin_principals' : Array<Principal>,
}
export interface MintArgs {
  'to' : Principal,
  'name' : string,
  'description' : string,
  'attributes' : Array<Trait>,
  'image' : string,
}
export interface NFTControllerRecord {
  'controllers' : Array<Principal>,
  'token_id' : bigint,
  'owner' : Principal,
  'canister_id' : [] | [Principal],
  'last_updated' : bigint,
  'created_at' : bigint,
}
export interface NFTMetadata {
  'creator' : Principal,
  'collection' : string,
  'external_url' : [] | [string],
  'rarity_score' : number,
  'name' : string,
  'description' : string,
  'created_at' : bigint,
  'attributes' : Array<Trait>,
  'rarity' : Rarity,
  'image' : string,
}
export type Rarity = { 'Epic' : null } |
  { 'Rare' : null } |
  { 'Uncommon' : null } |
  { 'Legendary' : null } |
  { 'Common' : null };
export interface Trait {
  'trait_type' : string,
  'value' : string,
  'rarity_score' : number,
}
export interface TransferArg {
  'to' : Principal,
  'token_id' : bigint,
  'memo' : [] | [Uint8Array | number[]],
  'from_subaccount' : [] | [Uint8Array | number[]],
  'created_at_time' : [] | [bigint],
}
export type TransferError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'Duplicate' : { 'duplicate_of' : bigint } } |
  { 'NonExistingTokenId' : null } |
  { 'Unauthorized' : null } |
  { 'CreatedInFuture' : { 'ledger_time' : bigint } } |
  { 'InvalidRecipient' : null } |
  { 'GenericBatchError' : { 'message' : string, 'error_code' : bigint } } |
  { 'TooOld' : null };
export interface _SERVICE {
  'add_admin_principal' : ActorMethod<
    [Principal],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'batch_mint' : ActorMethod<
    [Array<MintArgs>],
    Array<{ 'Ok' : bigint } | { 'Err' : string }>
  >,
  'get_admin_principals' : ActorMethod<[], Array<Principal>>,
  'get_all_controller_records' : ActorMethod<[], Array<NFTControllerRecord>>,
  'get_backend_controllers' : ActorMethod<[], Array<Principal>>,
  /**
   * Queries
   */
  'get_collection_config' : ActorMethod<[], CollectionConfig>,
  /**
   * Controller Management - Application canisters as controllers
   */
  'get_controller_config' : ActorMethod<[], ControllerConfig>,
  'get_nft_controllers' : ActorMethod<[bigint], [] | [NFTControllerRecord]>,
  'get_nft_metadata' : ActorMethod<[bigint], [] | [NFTMetadata]>,
  'health' : ActorMethod<[], string>,
  'icrc37_approve' : ActorMethod<
    [bigint, Principal],
    { 'Ok' : null } |
      { 'Err' : TransferError }
  >,
  'icrc7_balance_of' : ActorMethod<[Principal], bigint>,
  /**
   * ICRC-7 Standard
   */
  'icrc7_collection_metadata' : ActorMethod<[], Array<[string, string]>>,
  'icrc7_name' : ActorMethod<[], string>,
  'icrc7_owner_of' : ActorMethod<[bigint], [] | [Principal]>,
  'icrc7_supply_cap' : ActorMethod<[], [] | [bigint]>,
  'icrc7_symbol' : ActorMethod<[], string>,
  'icrc7_token_metadata' : ActorMethod<
    [bigint],
    [] | [Array<[string, string]>]
  >,
  'icrc7_tokens_of' : ActorMethod<[Principal], Array<bigint>>,
  'icrc7_total_supply' : ActorMethod<[], bigint>,
  /**
   * ICRC-37 Transfer
   */
  'icrc7_transfer' : ActorMethod<
    [Array<TransferArg>],
    Array<[] | [{ 'Ok' : bigint } | { 'Err' : TransferError }]>
  >,
  'is_authorized_nft_controller' : ActorMethod<[Principal], boolean>,
  /**
   * Minting
   */
  'mint' : ActorMethod<[MintArgs], { 'Ok' : bigint } | { 'Err' : string }>,
  'register_nft_controllers' : ActorMethod<
    [bigint, [] | [Principal]],
    { 'Ok' : NFTControllerRecord } |
      { 'Err' : string }
  >,
  'remove_admin_principal' : ActorMethod<
    [Principal],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'set_backend_canisters' : ActorMethod<
    [Array<Principal>],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'set_frontend_canister' : ActorMethod<
    [Principal],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  /**
   * Admin
   */
  'set_paused' : ActorMethod<[boolean], { 'Ok' : null } | { 'Err' : string }>,
  'update_collection_config' : ActorMethod<
    [string, string, string, number],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'update_nft_controllers' : ActorMethod<
    [bigint],
    { 'Ok' : NFTControllerRecord } |
      { 'Err' : string }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
