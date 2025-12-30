/**
 * Transaction Service - Real transaction history from canisters
 * Aggregates transactions from Treasury, NFT, and other canisters
 */

import { Principal } from '@dfinity/principal';
import { Identity } from '@dfinity/agent';
import { treasuryService, Transaction as TreasuryTx } from './treasuryService';
import { nftService } from './nftService';
import { TOKEN_CANISTERS } from './tokenService';
const HARLEE_LEDGER_CANISTER = TOKEN_CANISTERS.HARLEE.ledger;
const HARLEE_DECIMALS = TOKEN_CANISTERS.HARLEE.decimals;
import { getICHost, isMainnet } from './canisterConfig';

// Unified transaction type
export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: bigint;
  token: string;
  from?: string;
  to?: string;
  timestamp: number;
  memo?: string;
  txHash?: string;
  chain: string;
  metadata?: Record<string, any>;
}

export type TransactionType = 
  | 'deposit' 
  | 'withdrawal' 
  | 'transfer' 
  | 'nft_mint' 
  | 'nft_transfer' 
  | 'nft_sale'
  | 'subscription'
  | 'staking_reward'
  | 'platform_fee'
  | 'airdrop';

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface TransactionFilter {
  type?: TransactionType | TransactionType[];
  token?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: bigint;
  maxAmount?: bigint;
  status?: TransactionStatus;
}

export interface TransactionStats {
  totalTransactions: number;
  totalVolume: bigint;
  totalDeposits: bigint;
  totalWithdrawals: bigint;
  lastTransaction?: Transaction;
}

export class TransactionService {
  private identity?: Identity;
  private initialized = false;

  async init(identity?: Identity): Promise<void> {
    this.identity = identity;
    await treasuryService.init(identity);
    await nftService.init(identity);
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('TransactionService not initialized. Call init() first.');
    }
  }

  /**
   * Get treasury transactions
   */
  async getTreasuryTransactions(offset = 0, limit = 50): Promise<Transaction[]> {
    this.ensureInitialized();
    
    try {
      const txs = await treasuryService.getTransactions(offset, limit);
      return txs.map((tx) => this.mapTreasuryTransaction(tx));
    } catch (error) {
      console.error('Failed to fetch treasury transactions:', error);
      throw error;
    }
  }

  /**
   * Get user's transaction history
   */
  async getUserTransactions(principal: string, limit = 50): Promise<Transaction[]> {
    this.ensureInitialized();
    
    const transactions: Transaction[] = [];
    
    try {
      // Fetch from treasury
      const treasuryTxs = await treasuryService.getTransactions(0, limit);
      const userTreasuryTxs = treasuryTxs.filter((tx) =>
        tx.from === principal || tx.to === principal
      );
      transactions.push(...userTreasuryTxs.map((tx) => this.mapTreasuryTransaction(tx)));
    } catch (error) {
      console.warn('Failed to fetch treasury transactions:', error);
    }
    
    // Sort by timestamp descending
    transactions.sort((a, b) => b.timestamp - a.timestamp);
    
    return transactions.slice(0, limit);
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(txId: string): Promise<Transaction | null> {
    this.ensureInitialized();
    
    // Try parsing as number for treasury transactions
    const numId = parseInt(txId);
    if (!isNaN(numId)) {
      const txs = await treasuryService.getTransactions(0, 100);
      const tx = txs.find((t) => Number(t.id) === numId);
      if (tx) {
        return this.mapTreasuryTransaction(tx);
      }
    }
    
    return null;
  }

  /**
   * Filter transactions
   */
  async filterTransactions(
    transactions: Transaction[],
    filter: TransactionFilter
  ): Promise<Transaction[]> {
    return transactions.filter(tx => {
      // Type filter
      if (filter.type) {
        const types = Array.isArray(filter.type) ? filter.type : [filter.type];
        if (!types.includes(tx.type)) return false;
      }
      
      // Token filter
      if (filter.token && tx.token !== filter.token) return false;
      
      // Date range filter
      if (filter.dateFrom && tx.timestamp < filter.dateFrom.getTime()) return false;
      if (filter.dateTo && tx.timestamp > filter.dateTo.getTime()) return false;
      
      // Amount filter
      if (filter.minAmount && tx.amount < filter.minAmount) return false;
      if (filter.maxAmount && tx.amount > filter.maxAmount) return false;
      
      // Status filter
      if (filter.status && tx.status !== filter.status) return false;
      
      return true;
    });
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(principal?: string): Promise<TransactionStats> {
    this.ensureInitialized();
    
    try {
      const stats = await treasuryService.getStats();
      const txs = await treasuryService.getTransactions(0, 1);
      
      return {
        totalTransactions: stats.totalTransactions,
        totalVolume: stats.totalIcp + stats.totalCkBtc + stats.totalCkEth,
        totalDeposits: stats.totalIcp,
        totalWithdrawals: 0n, // Would need separate tracking
        lastTransaction: txs[0] ? this.mapTreasuryTransaction(txs[0]) : undefined,
      };
    } catch (error) {
      console.error('Failed to fetch transaction stats:', error);
      return {
        totalTransactions: 0,
        totalVolume: 0n,
        totalDeposits: 0n,
        totalWithdrawals: 0n,
      };
    }
  }

  /**
   * Map treasury transaction to unified format
   */
  private mapTreasuryTransaction(tx: TreasuryTx): Transaction {
    const typeMap: Record<string, TransactionType> = {
      'Deposit': 'deposit',
      'Withdrawal': 'withdrawal',
      'Transfer': 'transfer',
      'PlatformFee': 'platform_fee',
      'NFTSale': 'nft_sale',
      'SubscriptionPayment': 'subscription',
      'Airdrop': 'airdrop',
      'Reward': 'staking_reward',
    };

    return {
      id: tx.id.toString(),
      type: typeMap[tx.type] || 'transfer',
      status: 'confirmed',
      amount: tx.amount,
      token: tx.token,
      from: tx.from,
      to: tx.to,
      timestamp: tx.timestamp,
      memo: tx.memo,
      txHash: tx.txHash,
      chain: tx.chain,
    };
  }
}

// Singleton
export const transactionService = new TransactionService();

// React Hook for transaction history
import { useState, useEffect, useCallback } from 'react';

export interface UseTransactionsOptions {
  principal?: string;
  limit?: number;
  filter?: TransactionFilter;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useTransactions(identity?: Identity, options: UseTransactionsOptions = {}) {
  const { principal, limit = 20, filter, autoRefresh = false, refreshInterval = 30000 } = options;
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await transactionService.init(identity);
      
      let txs: Transaction[];
      if (principal) {
        txs = await transactionService.getUserTransactions(principal, limit);
      } else {
        txs = await transactionService.getTreasuryTransactions(0, limit);
      }
      
      if (filter) {
        txs = await transactionService.filterTransactions(txs, filter);
      }
      
      setTransactions(txs);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions');
      console.error('Transaction fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [identity, principal, limit, filter]);

  useEffect(() => {
    fetchTransactions();
    
    if (autoRefresh) {
      const interval = setInterval(fetchTransactions, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchTransactions, autoRefresh, refreshInterval]);

  return {
    transactions,
    isLoading,
    error,
    refresh: fetchTransactions,
  };
}

export function useTransactionStats(identity?: Identity, principal?: string) {
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await transactionService.init(identity);
      const statsData = await transactionService.getTransactionStats(principal);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transaction stats');
      console.error('Stats fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [identity, principal]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  };
}

// Format helpers
export function formatTransactionType(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    transfer: 'Transfer',
    nft_mint: 'NFT Mint',
    nft_transfer: 'NFT Transfer',
    nft_sale: 'NFT Sale',
    subscription: 'Subscription',
    staking_reward: 'Staking Reward',
    platform_fee: 'Platform Fee',
    airdrop: 'Airdrop',
  };
  return labels[type] || type;
}

export function getTransactionTypeColor(type: TransactionType): string {
  const colors: Record<TransactionType, string> = {
    deposit: 'text-green-400',
    withdrawal: 'text-red-400',
    transfer: 'text-blue-400',
    nft_mint: 'text-purple-400',
    nft_transfer: 'text-purple-300',
    nft_sale: 'text-gold-400',
    subscription: 'text-cyan-400',
    staking_reward: 'text-amber-400',
    platform_fee: 'text-gray-400',
    airdrop: 'text-pink-400',
  };
  return colors[type] || 'text-silver-400';
}

export default transactionService;

