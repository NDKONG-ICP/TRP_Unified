/**
 * Treasury Service - typed wrapper around the `treasury` canister.
 */
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId } from './canisterConfig';
import { createActorWithIdl } from './actorFactory';
import { idlFactory as treasuryIdl } from '../declarations/treasury';
import type { _SERVICE as TreasuryActor, Transaction as BackendTransaction, TreasuryStats as BackendTreasuryStats } from '../declarations/treasury/treasury.did';

export interface Transaction {
  id: bigint;
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
  totalTransactions: number;
  totalIcp: bigint;
  totalCkBtc: bigint;
  totalCkEth: bigint;
  totalCkUsdc: bigint;
  totalHarlee: bigint;
  totalRaven: bigint;
  pendingWithdrawals: bigint;
}

export class TreasuryService {
  private actor: TreasuryActor | null = null;

  async init(identity?: Identity): Promise<void> {
    const canisterId = getCanisterId('treasury');
    this.actor = await createActorWithIdl<TreasuryActor>(canisterId, treasuryIdl, identity);
  }

  private ensureActor(): TreasuryActor {
    if (!this.actor) {
      throw new Error('TreasuryService not initialized. Call init() first.');
    }
    return this.actor;
  }

  private mapToken(token: any): string {
    return Object.keys(token)[0] || 'UNKNOWN';
  }

  private mapTxType(txType: any): string {
    return Object.keys(txType)[0] || 'Unknown';
  }

  private parseTx(tx: BackendTransaction): Transaction {
    return {
      id: tx.id,
      type: this.mapTxType(tx.tx_type),
      token: this.mapToken(tx.token),
      amount: tx.amount,
      from: tx.from[0],
      to: tx.to[0],
      timestamp: Number(tx.timestamp),
      memo: tx.memo,
      txHash: tx.tx_hash[0],
      chain: tx.chain,
    };
  }

  async getTransactions(offset: number, limit: number): Promise<Transaction[]> {
    const actor = this.ensureActor();
    const txs = await (actor as any).get_transactions(offset, limit) as BackendTransaction[];
    return txs.map((t) => this.parseTx(t));
  }

  async getTransactionsByPrincipal(principal: string, limit: number): Promise<Transaction[]> {
    const actor = this.ensureActor();
    const txs = await (actor as any).get_transactions_by_principal(Principal.fromText(principal), limit) as BackendTransaction[];
    return txs.map((t) => this.parseTx(t));
  }

  private parseStats(s: BackendTreasuryStats): TreasuryStats {
    return {
      totalTransactions: Number(s.total_transactions),
      totalIcp: s.total_icp_balance,
      totalCkBtc: s.total_ckbtc_balance,
      totalCkEth: s.total_cketh_balance,
      totalCkUsdc: s.total_ckusdc_balance,
      totalHarlee: s.total_harlee_balance,
      totalRaven: s.total_raven_balance,
      pendingWithdrawals: s.pending_withdrawals,
    };
  }

  async getStats(): Promise<TreasuryStats> {
    const actor = this.ensureActor();
    const stats = await (actor as any).get_stats() as BackendTreasuryStats;
    return this.parseStats(stats);
  }
}

export const treasuryService = new TreasuryService();


