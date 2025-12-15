// Core canister declarations
import { IDL } from '@dfinity/candid';

// Types
export type UserRole = { 'Admin': null } | { 'User': null } | { 'Driver': null } | { 'Shipper': null } | { 'Warehouse': null };

export interface WalletAddresses {
  icp: [] | [string];
  evm: [] | [string];
  btc: [] | [string];
  sol: [] | [string];
}

export interface UserProfile {
  principal: Principal;
  display_name: string;
  email: [] | [string];
  role: UserRole;
  created_at: bigint;
  last_login: bigint;
  kyc_verified: boolean;
  wallet_addresses: WalletAddresses;
}

export interface AdminConfig {
  admin_principal: Principal;
  platform_fee_bps: number;
  treasury_principal: Principal;
  paused: boolean;
}

export type Result = { 'Ok': UserProfile } | { 'Err': string };
export type Result_1 = { 'Ok': null } | { 'Err': string };

import type { Principal } from '@dfinity/principal';

export interface _SERVICE {
  register_user: () => Promise<Result>;
  update_profile: (arg_0: string, arg_1: [] | [string]) => Promise<Result>;
  get_profile: (arg_0: Principal) => Promise<[] | [UserProfile]>;
  get_my_profile: () => Promise<[] | [UserProfile]>;
  get_user_role: (arg_0: Principal) => Promise<[] | [UserRole]>;
  get_total_users: () => Promise<bigint>;
  set_user_role: (arg_0: Principal, arg_1: UserRole) => Promise<Result_1>;
  set_kyc_verified: (arg_0: Principal, arg_1: boolean) => Promise<Result_1>;
  update_config: (arg_0: number, arg_1: Principal) => Promise<Result_1>;
  set_paused: (arg_0: boolean) => Promise<Result_1>;
  get_config: () => Promise<AdminConfig>;
  is_paused: () => Promise<boolean>;
  health: () => Promise<string>;
  get_canister_info: () => Promise<string>;
}

// IDL Factory
export const idlFactory = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => {
  const UserRole = IDL.Variant({
    'Admin': IDL.Null,
    'User': IDL.Null,
    'Driver': IDL.Null,
    'Shipper': IDL.Null,
    'Warehouse': IDL.Null,
  });
  const WalletAddresses = IDL.Record({
    'icp': IDL.Opt(IDL.Text),
    'evm': IDL.Opt(IDL.Text),
    'btc': IDL.Opt(IDL.Text),
    'sol': IDL.Opt(IDL.Text),
  });
  const UserProfile = IDL.Record({
    'principal': IDL.Principal,
    'display_name': IDL.Text,
    'email': IDL.Opt(IDL.Text),
    'role': UserRole,
    'created_at': IDL.Nat64,
    'last_login': IDL.Nat64,
    'kyc_verified': IDL.Bool,
    'wallet_addresses': WalletAddresses,
  });
  const Result = IDL.Variant({ 'Ok': UserProfile, 'Err': IDL.Text });
  const Result_1 = IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text });
  const AdminConfig = IDL.Record({
    'admin_principal': IDL.Principal,
    'platform_fee_bps': IDL.Nat16,
    'treasury_principal': IDL.Principal,
    'paused': IDL.Bool,
  });
  
  return IDL.Service({
    'register_user': IDL.Func([], [Result], []),
    'update_profile': IDL.Func([IDL.Text, IDL.Opt(IDL.Text)], [Result], []),
    'get_profile': IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ['query']),
    'get_my_profile': IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'get_user_role': IDL.Func([IDL.Principal], [IDL.Opt(UserRole)], ['query']),
    'get_total_users': IDL.Func([], [IDL.Nat64], ['query']),
    'set_user_role': IDL.Func([IDL.Principal, UserRole], [Result_1], []),
    'set_kyc_verified': IDL.Func([IDL.Principal, IDL.Bool], [Result_1], []),
    'update_config': IDL.Func([IDL.Nat16, IDL.Principal], [Result_1], []),
    'set_paused': IDL.Func([IDL.Bool], [Result_1], []),
    'get_config': IDL.Func([], [AdminConfig], ['query']),
    'is_paused': IDL.Func([], [IDL.Bool], ['query']),
    'health': IDL.Func([], [IDL.Text], ['query']),
    'get_canister_info': IDL.Func([], [IDL.Text], ['query']),
  });
};

export const init = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => { return []; };





