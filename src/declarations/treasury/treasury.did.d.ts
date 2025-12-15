import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface MultiChainAddresses {
  'sol_address' : string,
  'icp_account_id' : string,
  'eth_address' : string,
  'icp_principal' : string,
  'btc_address' : string,
}
export interface PendingWithdrawal {
  'id' : bigint,
  'status' : WithdrawalStatus,
  'token' : TokenType,
  'executed_at' : [] | [bigint],
  'chain' : string,
  'to_address' : string,
  'requested_at' : bigint,
  'requested_by' : Principal,
  'rejection_reason' : [] | [string],
  'tx_hash' : [] | [string],
  'amount' : bigint,
  'approvals' : Array<Principal>,
}
export type TokenType = { 'BTC' : null } |
  { 'ETH' : null } |
  { 'ICP' : null } |
  { 'SOL' : null } |
  { 'SUI' : null } |
  { 'RAVEN' : null } |
  { 'HARLEE' : null } |
  { 'CkUSDC' : null } |
  { 'CkUSDT' : null } |
  { 'CkBTC' : null } |
  { 'CkETH' : null };
export interface Transaction {
  'id' : bigint,
  'to' : [] | [string],
  'token' : TokenType,
  'from' : [] | [string],
  'chain' : string,
  'memo' : string,
  'timestamp' : bigint,
  'tx_hash' : [] | [string],
  'tx_type' : TransactionType,
  'amount' : bigint,
}
export type TransactionType = { 'PlatformFee' : null } |
  { 'Deposit' : null } |
  { 'NFTSale' : null } |
  { 'Reward' : null } |
  { 'SubscriptionPayment' : null } |
  { 'Airdrop' : null } |
  { 'Withdrawal' : null } |
  { 'Transfer' : null };
export interface TreasuryBalance {
  'icp' : bigint,
  'last_updated' : bigint,
  'ck_btc' : bigint,
  'ck_eth' : bigint,
  'harlee' : bigint,
  'ck_usdc' : bigint,
  'ck_usdt' : bigint,
  'raven' : bigint,
}
export interface TreasuryConfig {
  'platform_fee_percentage' : bigint,
  'required_approvals' : number,
  'withdrawal_threshold' : bigint,
  'multi_chain_addresses' : MultiChainAddresses,
  'multi_sig_required' : boolean,
  'paused' : boolean,
  'admin_principals' : Array<string>,
}
export interface TreasuryStats {
  'total_ckbtc_balance' : bigint,
  'total_ckusdc_balance' : bigint,
  'pending_withdrawals' : bigint,
  'last_updated' : bigint,
  'total_raven_balance' : bigint,
  'total_harlee_balance' : bigint,
  'total_collected_icp' : bigint,
  'total_transactions' : bigint,
  'total_cketh_balance' : bigint,
  'total_icp_balance' : bigint,
  'total_withdrawn_icp' : bigint,
}
export type WithdrawalStatus = { 'Approved' : null } |
  { 'Rejected' : null } |
  { 'Executed' : null } |
  { 'Cancelled' : null } |
  { 'Pending' : null };
export interface _SERVICE {
  'add_admin' : ActorMethod<[string], { 'Ok' : null } | { 'Err' : string }>,
  'approve_withdrawal' : ActorMethod<
    [bigint],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'deposit' : ActorMethod<
    [TokenType, bigint, string, string],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'deposit_harlee_rewards' : ActorMethod<
    [bigint, string],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'deposit_platform_fee' : ActorMethod<
    [bigint, Principal, string],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'distribute_harlee_reward' : ActorMethod<
    [Principal, bigint, string],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'distribute_staking_reward' : ActorMethod<
    [Principal, bigint, number],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'execute_withdrawal' : ActorMethod<
    [bigint],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'fetch_all_balances' : ActorMethod<
    [],
    { 'Ok' : TreasuryBalance } |
      { 'Err' : string }
  >,
  'fetch_harlee_balance' : ActorMethod<
    [],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'fetch_icp_balance' : ActorMethod<[], { 'Ok' : bigint } | { 'Err' : string }>,
  'get_admin_principals' : ActorMethod<[], Array<string>>,
  'get_balance' : ActorMethod<[], TreasuryBalance>,
  'get_config' : ActorMethod<[], TreasuryConfig>,
  'get_multi_chain_addresses' : ActorMethod<[], MultiChainAddresses>,
  'get_pending_withdrawals' : ActorMethod<[], Array<PendingWithdrawal>>,
  'get_token_balance_query' : ActorMethod<[TokenType], bigint>,
  'get_transaction' : ActorMethod<[bigint], [] | [Transaction]>,
  'get_transactions' : ActorMethod<[bigint, bigint], Array<Transaction>>,
  'get_treasury_stats' : ActorMethod<[], TreasuryStats>,
  'health' : ActorMethod<[], string>,
  'is_caller_admin' : ActorMethod<[], boolean>,
  'reject_withdrawal' : ActorMethod<
    [bigint, string],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'remove_admin' : ActorMethod<[string], { 'Ok' : null } | { 'Err' : string }>,
  'request_withdrawal' : ActorMethod<
    [TokenType, bigint, string],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'transfer_harlee' : ActorMethod<
    [Principal, bigint, [] | [string]],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'update_config' : ActorMethod<
    [
      [] | [bigint],
      [] | [boolean],
      [] | [number],
      [] | [bigint],
      [] | [boolean],
    ],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'update_multi_chain_addresses' : ActorMethod<
    [[] | [string], [] | [string], [] | [string]],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
