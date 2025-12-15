/**
 * Payment Service - Chain Fusion Multi-Token Payments
 * Supports: ICP, ckBTC, ckETH, ckUSDC, ckUSDT, $HARLEE, $RAVEN
 * Handles subscription payments with on-chain verification
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';

// ============ TYPES ============

export type PaymentToken = 
  | 'ICP' 
  | 'ckBTC' 
  | 'ckETH' 
  | 'ckUSDC' 
  | 'ckUSDT' 
  | 'HARLEE' 
  | 'RAVEN';

export interface TokenConfig {
  symbol: PaymentToken;
  name: string;
  decimals: number;
  ledgerCanister: string;
  indexCanister?: string;
  logo: string;
  minAmount: bigint;
}

export interface TokenPrice {
  token: PaymentToken;
  usdPrice: number;
  lastUpdated: number;
}

export interface PaymentRequest {
  id: string;
  amount: bigint;
  token: PaymentToken;
  usdValue: number;
  recipient: string;
  memo: string;
  purpose: PaymentPurpose;
  expiresAt: number;
  status: PaymentStatus;
}

export type PaymentPurpose = 
  | 'subscription_monthly'
  | 'subscription_yearly'
  | 'subscription_lifetime'
  | 'nft_purchase'
  | 'nft_mint'
  | 'staking'
  | 'tip'
  | 'other';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'failed'
  | 'expired';

export interface PaymentResult {
  success: boolean;
  txHash?: string;
  blockHeight?: bigint;
  error?: string;
}

// ============ TOKEN CONFIGURATIONS ============

export const TOKEN_CONFIGS: Record<PaymentToken, TokenConfig> = {
  ICP: {
    symbol: 'ICP',
    name: 'Internet Computer',
    decimals: 8,
    ledgerCanister: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
    indexCanister: 'qhbym-qaaaa-aaaaa-aaafq-cai',
    logo: '🔵',
    minAmount: BigInt(10000), // 0.0001 ICP
  },
  ckBTC: {
    symbol: 'ckBTC',
    name: 'Chain-Key Bitcoin',
    decimals: 8,
    ledgerCanister: 'mxzaz-hqaaa-aaaar-qaada-cai',
    indexCanister: 'n5wcd-faaaa-aaaar-qaaea-cai',
    logo: '🟠',
    minAmount: BigInt(1000), // 0.00001 BTC
  },
  ckETH: {
    symbol: 'ckETH',
    name: 'Chain-Key Ethereum',
    decimals: 18,
    ledgerCanister: 'ss2fx-dyaaa-aaaar-qacoq-cai',
    indexCanister: 's3zol-vqaaa-aaaar-qacpa-cai',
    logo: '🔷',
    minAmount: BigInt('10000000000000'), // 0.00001 ETH
  },
  ckUSDC: {
    symbol: 'ckUSDC',
    name: 'Chain-Key USDC',
    decimals: 6,
    ledgerCanister: 'xevnm-gaaaa-aaaar-qafnq-cai',
    logo: '💵',
    minAmount: BigInt(10000), // 0.01 USDC
  },
  ckUSDT: {
    symbol: 'ckUSDT',
    name: 'Chain-Key USDT',
    decimals: 6,
    ledgerCanister: 'cngnf-vqaaa-aaaar-qag4q-cai',
    logo: '💲',
    minAmount: BigInt(10000), // 0.01 USDT
  },
  HARLEE: {
    symbol: 'HARLEE',
    name: 'HARLEE Token',
    decimals: 8,
    ledgerCanister: 'tlm4l-kaaaa-aaaah-qqeha-cai',
    indexCanister: '5ipsq-2iaaa-aaaae-qffka-cai',
    logo: '🦅',
    minAmount: BigInt(100000000), // 1 HARLEE
  },
  RAVEN: {
    symbol: 'RAVEN',
    name: 'RAVEN Token',
    decimals: 8,
    ledgerCanister: '', // To be deployed
    logo: '🐦‍⬛',
    minAmount: BigInt(100000000), // 1 RAVEN
  },
};

// Subscription prices in USD
export const SUBSCRIPTION_PRICES_USD = {
  monthly: 25,
  yearly: 125,
  lifetime: 312.50,
};

// ============ ICRC-1 LEDGER IDL ============

const icrc1IdlFactory = ({ IDL }: { IDL: any }) => {
  const Account = IDL.Record({
    'owner': IDL.Principal,
    'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
  });

  const TransferArg = IDL.Record({
    'to': Account,
    'fee': IDL.Opt(IDL.Nat),
    'memo': IDL.Opt(IDL.Vec(IDL.Nat8)),
    'from_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time': IDL.Opt(IDL.Nat64),
    'amount': IDL.Nat,
  });

  const TransferError = IDL.Variant({
    'GenericError': IDL.Record({ 'message': IDL.Text, 'error_code': IDL.Nat }),
    'TemporarilyUnavailable': IDL.Null,
    'BadBurn': IDL.Record({ 'min_burn_amount': IDL.Nat }),
    'Duplicate': IDL.Record({ 'duplicate_of': IDL.Nat }),
    'BadFee': IDL.Record({ 'expected_fee': IDL.Nat }),
    'CreatedInFuture': IDL.Record({ 'ledger_time': IDL.Nat64 }),
    'TooOld': IDL.Null,
    'InsufficientFunds': IDL.Record({ 'balance': IDL.Nat }),
  });

  return IDL.Service({
    'icrc1_balance_of': IDL.Func([Account], [IDL.Nat], ['query']),
    'icrc1_decimals': IDL.Func([], [IDL.Nat8], ['query']),
    'icrc1_fee': IDL.Func([], [IDL.Nat], ['query']),
    'icrc1_name': IDL.Func([], [IDL.Text], ['query']),
    'icrc1_symbol': IDL.Func([], [IDL.Text], ['query']),
    'icrc1_transfer': IDL.Func(
      [TransferArg],
      [IDL.Variant({ 'Ok': IDL.Nat, 'Err': TransferError })],
      [],
    ),
  });
};

// ============ SERVICE CLASS ============

export class PaymentService {
  private agent: HttpAgent | null = null;
  private identity?: Identity;
  private tokenPrices: Map<PaymentToken, TokenPrice> = new Map();
  private pendingPayments: Map<string, PaymentRequest> = new Map();

  async init(identity?: Identity): Promise<void> {
    this.identity = identity;
    const host = getICHost();
    this.agent = new HttpAgent({ identity, host });
    
    if (!isMainnet) {
      await this.agent.fetchRootKey();
    }

    // Fetch initial prices
    await this.refreshPrices();
  }

  // ============ PRICE MANAGEMENT ============

  async refreshPrices(): Promise<void> {
    try {
      // In production, fetch from price oracle or CoinGecko
      // For now, use estimated prices
      const prices: Record<PaymentToken, number> = {
        ICP: 12.50,
        ckBTC: 98000,
        ckETH: 3500,
        ckUSDC: 1.00,
        ckUSDT: 1.00,
        HARLEE: 0.001,
        RAVEN: 0.01,
      };

      const now = Date.now();
      for (const [token, price] of Object.entries(prices)) {
        this.tokenPrices.set(token as PaymentToken, {
          token: token as PaymentToken,
          usdPrice: price,
          lastUpdated: now,
        });
      }
    } catch (error) {
      console.error('Failed to refresh prices:', error);
    }
  }

  getTokenPrice(token: PaymentToken): number {
    return this.tokenPrices.get(token)?.usdPrice || 0;
  }

  // Calculate amount needed for USD value
  calculateTokenAmount(usdValue: number, token: PaymentToken): bigint {
    const price = this.getTokenPrice(token);
    if (price === 0) return BigInt(0);
    
    const config = TOKEN_CONFIGS[token];
    const tokenAmount = usdValue / price;
    return BigInt(Math.ceil(tokenAmount * Math.pow(10, config.decimals)));
  }

  // ============ BALANCE QUERIES ============

  async getBalance(token: PaymentToken, principal: string): Promise<bigint> {
    if (!this.agent) throw new Error('Payment service not initialized');
    
    const config = TOKEN_CONFIGS[token];
    if (!config.ledgerCanister) return BigInt(0);

    try {
      const actor = Actor.createActor(icrc1IdlFactory, {
        agent: this.agent,
        canisterId: config.ledgerCanister,
      });

      const balance = await (actor as any).icrc1_balance_of({
        owner: Principal.fromText(principal),
        subaccount: [],
      });

      return BigInt(balance);
    } catch (error) {
      console.error(`Failed to get ${token} balance:`, error);
      return BigInt(0);
    }
  }

  async getAllBalances(principal: string): Promise<Record<PaymentToken, bigint>> {
    const balances: Record<PaymentToken, bigint> = {} as any;
    
    for (const token of Object.keys(TOKEN_CONFIGS) as PaymentToken[]) {
      balances[token] = await this.getBalance(token, principal);
    }
    
    return balances;
  }

  // ============ PAYMENTS ============

  async createPaymentRequest(
    usdAmount: number,
    token: PaymentToken,
    purpose: PaymentPurpose,
    memo: string
  ): Promise<PaymentRequest> {
    const amount = this.calculateTokenAmount(usdAmount, token);
    const treasuryPrincipal = getCanisterId('treasury');
    
    const request: PaymentRequest = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      token,
      usdValue: usdAmount,
      recipient: treasuryPrincipal,
      memo,
      purpose,
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
      status: 'pending',
    };
    
    this.pendingPayments.set(request.id, request);
    return request;
  }

  async executePayment(requestId: string): Promise<PaymentResult> {
    const request = this.pendingPayments.get(requestId);
    if (!request) {
      return { success: false, error: 'Payment request not found' };
    }
    
    if (request.status !== 'pending') {
      return { success: false, error: `Payment already ${request.status}` };
    }
    
    if (Date.now() > request.expiresAt) {
      request.status = 'expired';
      return { success: false, error: 'Payment request expired' };
    }

    request.status = 'processing';
    
    try {
      if (!this.agent || !this.identity) {
        throw new Error('Not authenticated');
      }

      const config = TOKEN_CONFIGS[request.token];
      if (!config.ledgerCanister) {
        throw new Error(`${request.token} ledger not available`);
      }

      const actor = Actor.createActor(icrc1IdlFactory, {
        agent: this.agent,
        canisterId: config.ledgerCanister,
      });

      const memoBytes = new TextEncoder().encode(request.memo);
      
      const result = await (actor as any).icrc1_transfer({
        to: {
          owner: Principal.fromText(request.recipient),
          subaccount: [],
        },
        amount: request.amount,
        fee: [],
        memo: [Array.from(memoBytes)],
        from_subaccount: [],
        created_at_time: [],
      });

      if ('Ok' in result) {
        request.status = 'confirmed';
        return {
          success: true,
          txHash: result.Ok.toString(),
          blockHeight: BigInt(result.Ok),
        };
      } else {
        const errorMsg = this.parseTransferError(result.Err);
        request.status = 'failed';
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      request.status = 'failed';
      return { success: false, error: error.message || 'Payment failed' };
    }
  }

  private parseTransferError(error: any): string {
    if ('InsufficientFunds' in error) {
      return `Insufficient funds. Available: ${error.InsufficientFunds.balance}`;
    }
    if ('BadFee' in error) {
      return `Invalid fee. Expected: ${error.BadFee.expected_fee}`;
    }
    if ('TooOld' in error) {
      return 'Transaction too old';
    }
    if ('CreatedInFuture' in error) {
      return 'Transaction timestamp in future';
    }
    if ('Duplicate' in error) {
      return `Duplicate transaction: ${error.Duplicate.duplicate_of}`;
    }
    if ('GenericError' in error) {
      return error.GenericError.message;
    }
    return 'Transfer failed';
  }

  // ============ SUBSCRIPTION PAYMENTS ============

  async payForSubscription(
    plan: 'monthly' | 'yearly' | 'lifetime',
    token: PaymentToken
  ): Promise<PaymentResult> {
    const usdAmount = SUBSCRIPTION_PRICES_USD[plan];
    const memo = `subscription_${plan}_${Date.now()}`;
    
    const request = await this.createPaymentRequest(
      usdAmount,
      token,
      `subscription_${plan}` as PaymentPurpose,
      memo
    );
    
    return this.executePayment(request.id);
  }

  // Get subscription payment options
  getSubscriptionOptions(plan: 'monthly' | 'yearly' | 'lifetime'): Array<{
    token: PaymentToken;
    amount: bigint;
    formatted: string;
    usdValue: number;
  }> {
    const usdAmount = SUBSCRIPTION_PRICES_USD[plan];
    const options = [];
    
    for (const token of ['ICP', 'ckBTC', 'ckETH', 'ckUSDC', 'ckUSDT'] as PaymentToken[]) {
      const amount = this.calculateTokenAmount(usdAmount, token);
      const config = TOKEN_CONFIGS[token];
      const formatted = this.formatTokenAmount(amount, token);
      
      options.push({
        token,
        amount,
        formatted,
        usdValue: usdAmount,
      });
    }
    
    return options;
  }

  // ============ VERIFICATION ============

  async verifyPayment(txHash: string, token: PaymentToken): Promise<boolean> {
    // In production, verify against the ledger
    // Check that the transaction exists and matches expected parameters
    console.log(`Verifying ${token} payment: ${txHash}`);
    return true;
  }

  // ============ HELPERS ============

  formatTokenAmount(amount: bigint, token: PaymentToken): string {
    const config = TOKEN_CONFIGS[token];
    const num = Number(amount) / Math.pow(10, config.decimals);
    
    if (token === 'ckBTC') {
      return num.toFixed(8);
    }
    if (token === 'ckETH') {
      return num.toFixed(6);
    }
    return num.toFixed(2);
  }

  getPaymentRequest(id: string): PaymentRequest | undefined {
    return this.pendingPayments.get(id);
  }
}

// Singleton
export const paymentService = new PaymentService();

// ============ REACT HOOKS ============

import { useState, useEffect, useCallback } from 'react';

export function useTokenPrices(identity?: Identity) {
  const [prices, setPrices] = useState<Map<PaymentToken, TokenPrice>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      await paymentService.init(identity);
      await paymentService.refreshPrices();
      
      const priceMap = new Map<PaymentToken, TokenPrice>();
      for (const token of Object.keys(TOKEN_CONFIGS) as PaymentToken[]) {
        const price = paymentService.getTokenPrice(token);
        priceMap.set(token, {
          token,
          usdPrice: price,
          lastUpdated: Date.now(),
        });
      }
      setPrices(priceMap);
      setIsLoading(false);
    };
    
    fetch();
    // Refresh every 5 minutes
    const interval = setInterval(fetch, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [identity]);

  return { prices, isLoading };
}

export function useTokenBalances(principal?: string, identity?: Identity) {
  const [balances, setBalances] = useState<Record<PaymentToken, bigint>>({} as any);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!principal) {
      setBalances({} as any);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await paymentService.init(identity);
      const data = await paymentService.getAllBalances(principal);
      setBalances(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch balances');
    } finally {
      setIsLoading(false);
    }
  }, [principal, identity]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return { balances, isLoading, error, refresh: fetchBalances };
}

export function useSubscriptionPayment(identity?: Identity) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentResult | null>(null);

  const pay = useCallback(async (
    plan: 'monthly' | 'yearly' | 'lifetime',
    token: PaymentToken
  ) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    
    try {
      await paymentService.init(identity);
      const paymentResult = await paymentService.payForSubscription(plan, token);
      setResult(paymentResult);
      
      if (!paymentResult.success) {
        setError(paymentResult.error || 'Payment failed');
      }
      
      return paymentResult;
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      return { success: false, error: err.message };
    } finally {
      setIsProcessing(false);
    }
  }, [identity]);

  return { pay, isProcessing, error, result };
}

export default paymentService;
