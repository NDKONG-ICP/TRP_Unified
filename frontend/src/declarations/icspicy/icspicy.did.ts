import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export type TokenIndex = bigint;
export type Balance = bigint;
export type TokenMetadata = { 'metadata' : [] | [number[]] };
export type TransferRequest = {
  'from' : number[],
  'to' : number[],
  'token' : TokenIndex,
  'notify' : boolean,
  'memo' : number[],
  'subaccount' : [] | [number[]],
};
export type TransferResponse = { 'Ok' : Balance } |
  { 'Err' : TransferError };
export type TransferError = { 'CannotNotify' : number[] } |
  { 'InsufficientBalance' : { 'balance' : Balance } } |
  { 'InvalidToken' : TokenIndex } |
  { 'Rejected' : { 'fee' : Balance } } |
  { 'Unauthorized' : number[] };
export type ICRC7Token = {
  'id' : bigint,
  'owner' : Principal,
  'metadata' : string,
};
export type ICRC37TransferRequest = {
  'from' : Principal,
  'to' : Principal,
  'token_id' : bigint,
};
export type TraitImage = { 'name' : string, 'data' : number[] };
export type LayerUpload = {
  'layer_name' : string,
  'trait_images' : TraitImage[],
};
export type ProjectUpload = {
  'project_name' : string,
  'layers' : LayerUpload[],
};
export type GeneratedNFT = {
  'token_id' : bigint,
  'layers' : string[],
  'rarity_score' : number,
  'metadata' : string,
  'composite_image' : [] | [number[]],
  'owner' : Principal,
};
export type MintRequest = { 'recipient' : [] | [Principal], 'quantity' : bigint };
export type MintResponse = { 'token_ids' : bigint[], 'success' : boolean };
export type UserRole = { 'Admin' : null } |
  { 'User' : null };
export type User = {
  'principal' : Principal,
  'role' : UserRole,
  'registered_at' : bigint,
};
export type AdminConfig = {
  'target_canister_id' : Principal,
  'icrc7_installed' : boolean,
  'icrc37_installed' : boolean,
  'ext_installed' : boolean,
};
export interface _SERVICE {
  'batch_mint' : ActorMethod<[MintRequest], MintResponse>,
  'ext_balance' : ActorMethod<[Principal], Balance>,
  'ext_get_token_metadata' : ActorMethod<[TokenIndex], TokenMetadata>,
  'ext_get_tokens' : ActorMethod<[Principal], TokenIndex[]>,
  'ext_mint' : ActorMethod<[Principal, [] | [number[]]], TokenIndex>,
  'ext_owner_of' : ActorMethod<[TokenIndex], [] | [Principal]>,
  'ext_tokens' : ActorMethod<[bigint, bigint], TokenIndex[]>,
  'ext_transfer' : ActorMethod<[TransferRequest], TransferResponse>,
  'generate_nft' : ActorMethod<[], GeneratedNFT>,
  'get_admin_config' : ActorMethod<[], AdminConfig>,
  'get_admin_principal' : ActorMethod<[], [] | [Principal]>,
  'get_all_nfts' : ActorMethod<[], GeneratedNFT[]>,
  'get_layers' : ActorMethod<[], string[]>,
  'get_nft_metadata' : ActorMethod<[bigint], [] | [string]>,
  'get_rarity_score' : ActorMethod<[bigint], number>,
  'get_user_role_query' : ActorMethod<[Principal], [] | [UserRole]>,
  'get_user_tokens' : ActorMethod<[Principal], bigint[]>,
  'icrc37_transfer' : ActorMethod<[ICRC37TransferRequest], boolean>,
  'icrc7_get_token' : ActorMethod<[bigint], [] | [ICRC7Token]>,
  'icrc7_get_tokens' : ActorMethod<[Principal], ICRC7Token[]>,
  'install_standards' : ActorMethod<[], string>,
  'mint' : ActorMethod<[[] | [Principal]], MintResponse>,
  'set_target_canister' : ActorMethod<[Principal], string>,
  'transfer_nft' : ActorMethod<[Principal, bigint], boolean>,
  'upload_project' : ActorMethod<[ProjectUpload], string>,
}




