export const idlFactory = ({ IDL }) => {
  const TokenType = IDL.Variant({
    'BTC' : IDL.Null,
    'ETH' : IDL.Null,
    'ICP' : IDL.Null,
    'SOL' : IDL.Null,
    'SUI' : IDL.Null,
    'RAVEN' : IDL.Null,
    'HARLEE' : IDL.Null,
    'CkUSDC' : IDL.Null,
    'CkUSDT' : IDL.Null,
    'CkBTC' : IDL.Null,
    'CkETH' : IDL.Null,
  });
  const TreasuryBalance = IDL.Record({
    'icp' : IDL.Nat64,
    'last_updated' : IDL.Nat64,
    'ck_btc' : IDL.Nat64,
    'ck_eth' : IDL.Nat64,
    'harlee' : IDL.Nat64,
    'ck_usdc' : IDL.Nat64,
    'ck_usdt' : IDL.Nat64,
    'raven' : IDL.Nat64,
  });
  const MultiChainAddresses = IDL.Record({
    'sol_address' : IDL.Text,
    'icp_account_id' : IDL.Text,
    'eth_address' : IDL.Text,
    'icp_principal' : IDL.Text,
    'btc_address' : IDL.Text,
  });
  const TreasuryConfig = IDL.Record({
    'platform_fee_percentage' : IDL.Nat64,
    'required_approvals' : IDL.Nat8,
    'withdrawal_threshold' : IDL.Nat64,
    'multi_chain_addresses' : MultiChainAddresses,
    'multi_sig_required' : IDL.Bool,
    'paused' : IDL.Bool,
    'admin_principals' : IDL.Vec(IDL.Text),
  });
  const WithdrawalStatus = IDL.Variant({
    'Approved' : IDL.Null,
    'Rejected' : IDL.Null,
    'Executed' : IDL.Null,
    'Cancelled' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const PendingWithdrawal = IDL.Record({
    'id' : IDL.Nat64,
    'status' : WithdrawalStatus,
    'token' : TokenType,
    'executed_at' : IDL.Opt(IDL.Nat64),
    'chain' : IDL.Text,
    'to_address' : IDL.Text,
    'requested_at' : IDL.Nat64,
    'requested_by' : IDL.Principal,
    'rejection_reason' : IDL.Opt(IDL.Text),
    'tx_hash' : IDL.Opt(IDL.Text),
    'amount' : IDL.Nat64,
    'approvals' : IDL.Vec(IDL.Principal),
  });
  const TransactionType = IDL.Variant({
    'PlatformFee' : IDL.Null,
    'Deposit' : IDL.Null,
    'NFTSale' : IDL.Null,
    'Reward' : IDL.Null,
    'SubscriptionPayment' : IDL.Null,
    'Airdrop' : IDL.Null,
    'Withdrawal' : IDL.Null,
    'Transfer' : IDL.Null,
  });
  const Transaction = IDL.Record({
    'id' : IDL.Nat64,
    'to' : IDL.Opt(IDL.Text),
    'token' : TokenType,
    'from' : IDL.Opt(IDL.Text),
    'chain' : IDL.Text,
    'memo' : IDL.Text,
    'timestamp' : IDL.Nat64,
    'tx_hash' : IDL.Opt(IDL.Text),
    'tx_type' : TransactionType,
    'amount' : IDL.Nat64,
  });
  const TreasuryStats = IDL.Record({
    'total_ckbtc_balance' : IDL.Nat64,
    'total_ckusdc_balance' : IDL.Nat64,
    'pending_withdrawals' : IDL.Nat64,
    'last_updated' : IDL.Nat64,
    'total_raven_balance' : IDL.Nat64,
    'total_harlee_balance' : IDL.Nat64,
    'total_collected_icp' : IDL.Nat64,
    'total_transactions' : IDL.Nat64,
    'total_cketh_balance' : IDL.Nat64,
    'total_icp_balance' : IDL.Nat64,
    'total_withdrawn_icp' : IDL.Nat64,
  });
  return IDL.Service({
    'add_admin' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'approve_withdrawal' : IDL.Func(
        [IDL.Nat64],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'deposit' : IDL.Func(
        [TokenType, IDL.Nat64, IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'deposit_harlee_rewards' : IDL.Func(
        [IDL.Nat64, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'deposit_platform_fee' : IDL.Func(
        [IDL.Nat64, IDL.Principal, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'distribute_harlee_reward' : IDL.Func(
        [IDL.Principal, IDL.Nat64, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'distribute_staking_reward' : IDL.Func(
        [IDL.Principal, IDL.Nat64, IDL.Nat32],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'execute_withdrawal' : IDL.Func(
        [IDL.Nat64],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'fetch_all_balances' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : TreasuryBalance, 'Err' : IDL.Text })],
        [],
      ),
    'fetch_harlee_balance' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'fetch_icp_balance' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'get_admin_principals' : IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'get_balance' : IDL.Func([], [TreasuryBalance], ['query']),
    'get_config' : IDL.Func([], [TreasuryConfig], ['query']),
    'get_multi_chain_addresses' : IDL.Func(
        [],
        [MultiChainAddresses],
        ['query'],
      ),
    'get_pending_withdrawals' : IDL.Func(
        [],
        [IDL.Vec(PendingWithdrawal)],
        ['query'],
      ),
    'get_token_balance_query' : IDL.Func([TokenType], [IDL.Nat64], ['query']),
    'get_transaction' : IDL.Func(
        [IDL.Nat64],
        [IDL.Opt(Transaction)],
        ['query'],
      ),
    'get_transactions' : IDL.Func(
        [IDL.Nat64, IDL.Nat64],
        [IDL.Vec(Transaction)],
        ['query'],
      ),
    'get_treasury_stats' : IDL.Func([], [TreasuryStats], ['query']),
    'health' : IDL.Func([], [IDL.Text], ['query']),
    'is_caller_admin' : IDL.Func([], [IDL.Bool], ['query']),
    'reject_withdrawal' : IDL.Func(
        [IDL.Nat64, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'remove_admin' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'request_withdrawal' : IDL.Func(
        [TokenType, IDL.Nat64, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'transfer_harlee' : IDL.Func(
        [IDL.Principal, IDL.Nat64, IDL.Opt(IDL.Text)],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'update_config' : IDL.Func(
        [
          IDL.Opt(IDL.Nat64),
          IDL.Opt(IDL.Bool),
          IDL.Opt(IDL.Nat8),
          IDL.Opt(IDL.Nat64),
          IDL.Opt(IDL.Bool),
        ],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'update_multi_chain_addresses' : IDL.Func(
        [IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
