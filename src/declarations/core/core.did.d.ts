import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AdminConfig {
  'platform_fee_bps' : number,
  'treasury_principal' : Principal,
  'paused' : boolean,
  'admin_principal' : Principal,
}
export interface UserProfile {
  'last_login' : bigint,
  'user_principal' : Principal,
  'kyc_verified' : boolean,
  'role' : UserRole,
  'created_at' : bigint,
  'email' : [] | [string],
  'display_name' : string,
  'wallet_addresses' : WalletAddresses,
}
export type UserRole = { 'Driver' : null } |
  { 'User' : null } |
  { 'Warehouse' : null } |
  { 'Admin' : null } |
  { 'Shipper' : null };
export interface WalletAddresses {
  'btc' : [] | [string],
  'evm' : [] | [string],
  'icp' : [] | [string],
  'sol' : [] | [string],
}
export interface _SERVICE {
  'get_canister_info' : ActorMethod<[], string>,
  'get_config' : ActorMethod<[], AdminConfig>,
  'get_my_profile' : ActorMethod<[], [] | [UserProfile]>,
  'get_profile' : ActorMethod<[Principal], [] | [UserProfile]>,
  'get_total_users' : ActorMethod<[], bigint>,
  'get_user_role' : ActorMethod<[Principal], [] | [UserRole]>,
  'get_verified_drivers' : ActorMethod<[], Array<UserProfile>>,
  /**
   * Health
   */
  'health' : ActorMethod<[], string>,
  'is_paused' : ActorMethod<[], boolean>,
  /**
   * User Management
   */
  'register_user' : ActorMethod<
    [],
    { 'Ok' : UserProfile } |
      { 'Err' : string }
  >,
  'set_kyc_verified' : ActorMethod<
    [Principal, boolean],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'set_paused' : ActorMethod<[boolean], { 'Ok' : null } | { 'Err' : string }>,
  /**
   * Admin Functions
   */
  'set_user_role' : ActorMethod<
    [Principal, UserRole],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'update_config' : ActorMethod<
    [number, Principal],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'update_profile' : ActorMethod<
    [string, [] | [string]],
    { 'Ok' : UserProfile } |
      { 'Err' : string }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
