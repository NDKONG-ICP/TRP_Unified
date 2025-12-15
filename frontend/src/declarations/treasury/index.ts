// Treasury canister declarations
import type { Principal } from '@dfinity/principal';

// Types
export type TransactionType = 
  | { 'Deposit': null }
  | { 'Withdrawal': null }
  | { 'PlatformFee': null };

export interface Transaction {
  id: bigint;
  tx_type: TransactionType;
  amount: bigint;
  from: [] | [Principal];
  to: [] | [Principal];
  timestamp: bigint;
  memo: string;
}

export interface TreasuryBalance {
  icp: bigint;
  ck_btc: bigint;
  ck_eth: bigint;
  ck_usdc: bigint;
  last_updated: bigint;
}

export interface TreasuryConfig {
  admin: Principal;
  withdrawal_threshold: bigint;
  multi_sig_required: boolean;
  signers: Principal[];
}

export type Result = { 'Ok': bigint } | { 'Err': string };
export type Result_1 = { 'Ok': null } | { 'Err': string };

export interface _SERVICE {
  // Balance Management
  deposit_platform_fee: (arg_0: bigint, arg_1: Principal, arg_2: string) => Promise<Result>;
  withdraw: (arg_0: bigint, arg_1: Principal, arg_2: string) => Promise<Result>;
  
  // Queries
  get_balance: () => Promise<TreasuryBalance>;
  get_icp_balance: () => Promise<bigint>;
  get_transaction: (arg_0: bigint) => Promise<[] | [Transaction]>;
  get_recent_transactions: (arg_0: bigint) => Promise<Transaction[]>;
  get_total_collected: () => Promise<bigint>;
  get_total_withdrawn: () => Promise<bigint>;
  
  // Admin
  set_withdrawal_threshold: (arg_0: bigint) => Promise<Result_1>;
  add_signer: (arg_0: Principal) => Promise<Result_1>;
  get_config: () => Promise<TreasuryConfig>;
  health: () => Promise<string>;
}

// IDL Factory
export const idlFactory = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => {
  const TransactionType = IDL.Variant({
    'Deposit': IDL.Null,
    'Withdrawal': IDL.Null,
    'PlatformFee': IDL.Null,
  });
  const Transaction = IDL.Record({
    'id': IDL.Nat64,
    'tx_type': TransactionType,
    'amount': IDL.Nat64,
    'from': IDL.Opt(IDL.Principal),
    'to': IDL.Opt(IDL.Principal),
    'timestamp': IDL.Nat64,
    'memo': IDL.Text,
  });
  const TreasuryBalance = IDL.Record({
    'icp': IDL.Nat64,
    'ck_btc': IDL.Nat64,
    'ck_eth': IDL.Nat64,
    'ck_usdc': IDL.Nat64,
    'last_updated': IDL.Nat64,
  });
  const TreasuryConfig = IDL.Record({
    'admin': IDL.Principal,
    'withdrawal_threshold': IDL.Nat64,
    'multi_sig_required': IDL.Bool,
    'signers': IDL.Vec(IDL.Principal),
  });
  const Result = IDL.Variant({ 'Ok': IDL.Nat64, 'Err': IDL.Text });
  const Result_1 = IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text });

  return IDL.Service({
    'deposit_platform_fee': IDL.Func([IDL.Nat64, IDL.Principal, IDL.Text], [Result], []),
    'withdraw': IDL.Func([IDL.Nat64, IDL.Principal, IDL.Text], [Result], []),
    'get_balance': IDL.Func([], [TreasuryBalance], ['query']),
    'get_icp_balance': IDL.Func([], [IDL.Nat64], ['query']),
    'get_transaction': IDL.Func([IDL.Nat64], [IDL.Opt(Transaction)], ['query']),
    'get_recent_transactions': IDL.Func([IDL.Nat64], [IDL.Vec(Transaction)], ['query']),
    'get_total_collected': IDL.Func([], [IDL.Nat64], ['query']),
    'get_total_withdrawn': IDL.Func([], [IDL.Nat64], ['query']),
    'set_withdrawal_threshold': IDL.Func([IDL.Nat64], [Result_1], []),
    'add_signer': IDL.Func([IDL.Principal], [Result_1], []),
    'get_config': IDL.Func([], [TreasuryConfig], ['query']),
    'health': IDL.Func([], [IDL.Text], ['query']),
  });
};

export const init = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => { return []; };





