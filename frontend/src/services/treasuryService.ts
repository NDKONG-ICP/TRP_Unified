/**
 * Treasury Service - Real balance fetching from treasury canister
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';

// Treasury Canister IDL
const treasuryIdlFactory = ({ IDL }: { IDL: any }) => {
  const TokenType = IDL.Variant({
    'ICP': IDL.Null,
    'CkBTC': IDL.Null,
    'CkETH': IDL.Null,
    'CkUSDC': IDL.Null,
    'CkUSDT': IDL.Null,
    'HARLEE': IDL.Null,
    'RAVEN': IDL.Null,
    'BTC': IDL.Null,
    'ETH': IDL.Null,
    'SOL': IDL.Null,
    'SUI': IDL.Null,
  });

  const TransactionType = IDL.Variant({
    'Deposit': IDL.Null,
    'Withdrawal': IDL.Null,
    'PlatformFee': IDL.Null,
    'NFTSale': IDL.Null,
    'SubscriptionPayment': IDL.Null,
    'Airdrop': IDL.Null,
    'Reward': IDL.Null,
    'Transfer': IDL.Null,
  });

  const Transaction = IDL.Record({
    'id': IDL.Nat64,
    'tx_type': TransactionType,
    'token': TokenType,
    'amount': IDL.Nat64,
    'from': IDL.Opt(IDL.Text),
    'to': IDL.Opt(IDL.Text),
    'timestamp': IDL.Nat64,
    'memo': IDL.Text,
    'tx_hash': IDL.Opt(IDL.Text),
    'chain': IDL.Text,
  });

  const TreasuryBalance = IDL.Record({
    'icp': IDL.Nat64,
    'ck_btc': IDL.Nat64,
    'ck_eth': IDL.Nat64,
    'ck_usdc': IDL.Nat64,
    'ck_usdt': IDL.Nat64,
    'harlee': IDL.Nat64,
    'raven': IDL.Nat64,
    'last_updated': IDL.Nat64,
  });

  const MultiChainAddresses = IDL.Record({
    'icp_principal': IDL.Text,
    'icp_account_id': IDL.Text,
    'btc_address': IDL.Text,
    'eth_address': IDL.Text,
    'sol_address': IDL.Text,
  });

  const TreasuryStats = IDL.Record({
    'total_icp_balance': IDL.Nat64,
    'total_ckbtc_balance': IDL.Nat64,
    'total_cketh_balance': IDL.Nat64,
    'total_ckusdc_balance': IDL.Nat64,
    'total_harlee_balance': IDL.Nat64,
    'total_raven_balance': IDL.Nat64,
    'total_transactions': IDL.Nat64,
    'pending_withdrawals': IDL.Nat64,
    'total_collected_icp': IDL.Nat64,
    'total_withdrawn_icp': IDL.Nat64,
    'last_updated': IDL.Nat64,
  });

  const WithdrawalStatus = IDL.Variant({
    'Pending': IDL.Null,
    'Approved': IDL.Null,
    'Executed': IDL.Null,
    'Rejected': IDL.Null,
    'Cancelled': IDL.Null,
  });

  const PendingWithdrawal = IDL.Record({
    'id': IDL.Nat64,
    'token': TokenType,
    'amount': IDL.Nat64,
    'to_address': IDL.Text,
    'chain': IDL.Text,
    'requested_by': IDL.Principal,
    'requested_at': IDL.Nat64,
    'status': WithdrawalStatus,
    'approvals': IDL.Vec(IDL.Principal),
    'rejection_reason': IDL.Opt(IDL.Text),
    'executed_at': IDL.Opt(IDL.Nat64),
    'tx_hash': IDL.Opt(IDL.Text),
  });

  return IDL.Service({
    'get_balance': IDL.Func([], [TreasuryBalance], ['query']),
    'get_transactions': IDL.Func([IDL.Nat64, IDL.Nat64], [IDL.Vec(Transaction)], ['query']),
    'get_pending_withdrawals': IDL.Func([], [IDL.Vec(PendingWithdrawal)], ['query']),
    'get_multi_chain_addresses': IDL.Func([], [MultiChainAddresses], ['query']),
    'is_caller_admin': IDL.Func([], [IDL.Bool], ['query']),
    'get_treasury_stats': IDL.Func([], [TreasuryStats], ['query']),
    'health': IDL.Func([], [IDL.Text], ['query']),
  });
};

// Types
export interface TreasuryBalance {
  icp: bigint;
  ckBtc: bigint;
  ckEth: bigint;
  ckUsdc: bigint;
  ckUsdt: bigint;
  harlee: bigint;
  raven: bigint;
  lastUpdated: number;
}

export interface Transaction {
  id: number;
  type: string;
  token: string;
  amount: bigint;
  from?: string;
  to?: string;
  timestamp: number;
  memo: string;
  txHash?: string;
  chain: string;
}

export interface TreasuryStats {
  totalIcp: bigint;
  totalCkBtc: bigint;
  totalCkEth: bigint;
  totalCkUsdc: bigint;
  totalHarlee: bigint;
  totalRaven: bigint;
  totalTransactions: number;
  pendingWithdrawals: number;
  lastUpdated: number;
}

export interface MultiChainAddresses {
  icpPrincipal: string;
  icpAccountId: string;
  btcAddress: string;
  ethAddress: string;
  solAddress: string;
}

export class TreasuryService {
  private actor: any = null;
  private agent: HttpAgent | null = null;

  async init(identity?: Identity): Promise<void> {
    const host = getICHost();
    this.agent = new HttpAgent({ identity, host });
    
    if (!isMainnet) {
      await this.agent.fetchRootKey();
    }
    
    const canisterId = getCanisterId('treasury');
    this.actor = Actor.createActor(treasuryIdlFactory, {
      agent: this.agent,
      canisterId,
    });
  }

  private ensureActor(): void {
    if (!this.actor) {
      throw new Error('TreasuryService not initialized. Call init() first.');
    }
  }

  async getBalance(): Promise<TreasuryBalance> {
    this.ensureActor();
    try {
      const result = await this.actor.get_balance();
      return {
        icp: BigInt(result.icp),
        ckBtc: BigInt(result.ck_btc),
        ckEth: BigInt(result.ck_eth),
        ckUsdc: BigInt(result.ck_usdc),
        ckUsdt: BigInt(result.ck_usdt),
        harlee: BigInt(result.harlee),
        raven: BigInt(result.raven),
        lastUpdated: Number(result.last_updated),
      };
    } catch (error) {
      console.error('Failed to fetch treasury balance:', error);
      throw error;
    }
  }

  async getTransactions(offset: number = 0, limit: number = 50): Promise<Transaction[]> {
    this.ensureActor();
    try {
      const result = await this.actor.get_transactions(BigInt(offset), BigInt(limit));
      return result.map((tx: any) => ({
        id: Number(tx.id),
        type: Object.keys(tx.tx_type)[0],
        token: Object.keys(tx.token)[0],
        amount: BigInt(tx.amount),
        from: tx.from[0] || undefined,
        to: tx.to[0] || undefined,
        timestamp: Number(tx.timestamp),
        memo: tx.memo,
        txHash: tx.tx_hash[0] || undefined,
        chain: tx.chain,
      }));
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      throw error;
    }
  }

  async getStats(): Promise<TreasuryStats> {
    this.ensureActor();
    try {
      const result = await this.actor.get_treasury_stats();
      return {
        totalIcp: BigInt(result.total_icp_balance),
        totalCkBtc: BigInt(result.total_ckbtc_balance),
        totalCkEth: BigInt(result.total_cketh_balance),
        totalCkUsdc: BigInt(result.total_ckusdc_balance),
        totalHarlee: BigInt(result.total_harlee_balance),
        totalRaven: BigInt(result.total_raven_balance),
        totalTransactions: Number(result.total_transactions),
        pendingWithdrawals: Number(result.pending_withdrawals),
        lastUpdated: Number(result.last_updated),
      };
    } catch (error) {
      console.error('Failed to fetch treasury stats:', error);
      throw error;
    }
  }

  async getMultiChainAddresses(): Promise<MultiChainAddresses> {
    this.ensureActor();
    try {
      const result = await this.actor.get_multi_chain_addresses();
      return {
        icpPrincipal: result.icp_principal,
        icpAccountId: result.icp_account_id,
        btcAddress: result.btc_address,
        ethAddress: result.eth_address,
        solAddress: result.sol_address,
      };
    } catch (error) {
      console.error('Failed to fetch multi-chain addresses:', error);
      throw error;
    }
  }

  async isAdmin(): Promise<boolean> {
    this.ensureActor();
    try {
      return await this.actor.is_caller_admin();
    } catch (error) {
      console.error('Failed to check admin status:', error);
      return false;
    }
  }

  async healthCheck(): Promise<string> {
    this.ensureActor();
    return await this.actor.health();
  }
}

// Singleton instance
export const treasuryService = new TreasuryService();

// React hook for treasury data
import { useState, useEffect, useCallback } from 'react';

export function useTreasury(identity?: Identity) {
  const [balance, setBalance] = useState<TreasuryBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await treasuryService.init(identity);
      
      const [balanceData, txData, statsData, adminStatus] = await Promise.all([
        treasuryService.getBalance(),
        treasuryService.getTransactions(0, 20),
        treasuryService.getStats(),
        treasuryService.isAdmin(),
      ]);
      
      setBalance(balanceData);
      setTransactions(txData);
      setStats(statsData);
      setIsAdmin(adminStatus);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch treasury data');
      console.error('Treasury fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [identity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    balance,
    transactions,
    stats,
    isLoading,
    error,
    isAdmin,
    refresh: fetchData,
  };
}

export default treasuryService;




