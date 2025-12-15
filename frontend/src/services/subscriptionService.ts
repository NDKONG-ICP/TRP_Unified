/**
 * Subscription Service - RavenAI & AI Council Subscriptions
 * Handles demo, monthly, yearly, and lifetime subscriptions
 * On-chain storage via raven_ai canister
 */

import { Principal } from '@dfinity/principal';
import { HttpAgent, Actor } from '@dfinity/agent';
import { getCanisterId, isMainnet, getICHost } from './canisterConfig';

// Treasury canister ID - used to get treasury address dynamically
const TREASURY_CANISTER_ID = getCanisterId('treasury');

// Get treasury address from canister (more secure than hardcoding)
async function getTreasuryPrincipal(): Promise<string> {
  // In production, fetch from treasury canister
  // For now, use the treasury canister's own ID
  return TREASURY_CANISTER_ID;
}

// Subscription plan types
export type SubscriptionPlan = 'Demo' | 'Monthly' | 'Yearly' | 'Lifetime' | 'NFTHolder';

export interface Subscription {
  user: string;
  plan: SubscriptionPlan;
  startedAt: bigint;
  expiresAt?: bigint;
  isActive: boolean;
  paymentHistory: SubscriptionPayment[];
}

export interface SubscriptionPayment {
  amount: bigint;
  token: string;
  paidAt: bigint;
  txHash?: string;
}

export interface SubscriptionPricing {
  plan: string;
  priceICP: number;
  priceUSD: number;
  duration: string;
  features: string[];
}

// Subscription pricing in ICP (e8s)
export const SUBSCRIPTION_PRICES = {
  monthly: {
    icp: BigInt(2_00000000),  // 2 ICP
    usd: 25,
    duration: '30 days',
    features: [
      'Unlimited RavenAI chat',
      'AI Council access',
      'Voice synthesis (Eleven Labs)',
      'Persistent memory',
    ],
  },
  yearly: {
    icp: BigInt(10_00000000),  // 10 ICP
    usd: 125,
    duration: '365 days',
    features: [
      'All Monthly features',
      '2 months free (vs monthly)',
      'Priority support',
      'Early access to new features',
    ],
  },
  lifetime: {
    icp: BigInt(25_00000000),  // 25 ICP
    usd: 312.50,
    duration: 'Forever',
    features: [
      'All Yearly features',
      'Never pay again',
      'Exclusive lifetime badge',
      'Founding member perks',
    ],
  },
};

// Demo duration in milliseconds
export const DEMO_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  
  if (subscription.plan === 'Lifetime' || subscription.plan === 'NFTHolder') {
    return true;
  }
  
  if (subscription.expiresAt) {
    const expiresMs = Number(subscription.expiresAt) / 1_000_000;
    return Date.now() < expiresMs;
  }
  
  return subscription.isActive;
}

/**
 * Get time remaining on subscription
 */
export function getTimeRemaining(subscription: Subscription | null): string {
  if (!subscription || !subscription.expiresAt) {
    return 'No active subscription';
  }
  
  if (subscription.plan === 'Lifetime' || subscription.plan === 'NFTHolder') {
    return 'Unlimited';
  }
  
  const expiresMs = Number(subscription.expiresAt) / 1_000_000;
  const remaining = expiresMs - Date.now();
  
  if (remaining <= 0) {
    return 'Expired';
  }
  
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours > 1 ? 's' : ''}`;
}

/**
 * Format ICP amount
 */
export function formatICP(e8s: bigint): string {
  const icp = Number(e8s) / 100_000_000;
  return `${icp.toFixed(2)} ICP`;
}

/**
 * Subscription Service Class
 */
export class SubscriptionService {
  private agent: HttpAgent;
  private identity: any;
  
  constructor(identity?: any) {
    this.identity = identity;
    
    const host = getICHost();
    
    this.agent = new HttpAgent({ 
      host,
      identity,
    });
    
    if (!isMainnet()) {
      this.agent.fetchRootKey().catch(console.error);
    }
  }
  
  /**
   * Check user's subscription status from on-chain storage
   */
  async checkSubscription(): Promise<Subscription | null> {
    if (!this.identity) return null;
    
    const principal = this.identity.getPrincipal?.();
    if (!principal) return null;
    
    try {
      // First try to get from on-chain canister
      const ravenAiCanisterId = getCanisterId('raven_ai');
      
      const idlFactory = ({ IDL }: any) => IDL.Service({
        check_subscription: IDL.Func(
          [IDL.Principal],
          [IDL.Opt(IDL.Record({
            user: IDL.Principal,
            plan: IDL.Variant({
              Demo: IDL.Null,
              Monthly: IDL.Null,
              Yearly: IDL.Null,
              Lifetime: IDL.Null,
              NFTHolder: IDL.Null,
            }),
            started_at: IDL.Nat64,
            expires_at: IDL.Opt(IDL.Nat64),
            is_active: IDL.Bool,
            payment_history: IDL.Vec(IDL.Record({
              amount: IDL.Nat64,
              token: IDL.Variant({
                ICP: IDL.Null,
                RAVEN: IDL.Null,
                CkBTC: IDL.Null,
                CkETH: IDL.Null,
                CkUSDC: IDL.Null,
                CkUSDT: IDL.Null,
                CkSOL: IDL.Null,
                SOL: IDL.Null,
                SUI: IDL.Null,
              }),
              paid_at: IDL.Nat64,
              tx_hash: IDL.Opt(IDL.Text),
            })),
          }))],
          ['query'],
        ),
      });
      
      const actor = Actor.createActor(idlFactory, {
        agent: this.agent,
        canisterId: Principal.fromText(ravenAiCanisterId),
      });
      
      const result = await (actor as any).check_subscription(principal);
      
      if (result && result.length > 0) {
        const sub = result[0];
        const planKey = Object.keys(sub.plan)[0] as SubscriptionPlan;
        
        return {
          user: sub.user.toString(),
          plan: planKey,
          startedAt: sub.started_at,
          expiresAt: sub.expires_at.length > 0 ? sub.expires_at[0] : undefined,
          isActive: sub.is_active,
          paymentHistory: sub.payment_history.map((p: any) => ({
            amount: p.amount,
            token: Object.keys(p.token)[0],
            paidAt: p.paid_at,
            txHash: p.tx_hash.length > 0 ? p.tx_hash[0] : undefined,
          })),
        };
      }
    } catch (error) {
      console.warn('Failed to check on-chain subscription, falling back to localStorage:', error);
    }
    
    // Fallback to localStorage
    const storedSub = localStorage.getItem(`subscription_${principal.toString()}`);
    
    if (storedSub) {
      const sub = JSON.parse(storedSub);
      return {
        ...sub,
        startedAt: BigInt(sub.startedAt),
        expiresAt: sub.expiresAt ? BigInt(sub.expiresAt) : undefined,
      };
    }
    
    return null;
  }
  
  /**
   * Start free 3-day demo
   */
  async startDemo(): Promise<Subscription> {
    if (!this.identity) {
      throw new Error('Authentication required');
    }
    
    const principal = this.identity.getPrincipal?.();
    if (!principal) {
      throw new Error('Invalid identity');
    }
    
    // Check if already used demo
    const existing = await this.checkSubscription();
    if (existing?.plan === 'Demo') {
      throw new Error('Demo already used');
    }
    
    const now = Date.now() * 1_000_000; // Convert to nanoseconds
    const expiresAt = now + (DEMO_DURATION_MS * 1_000_000);
    
    const subscription: Subscription = {
      user: principal.toString(),
      plan: 'Demo',
      startedAt: BigInt(now),
      expiresAt: BigInt(expiresAt),
      isActive: true,
      paymentHistory: [],
    };
    
    // Store in localStorage (in production, this would be on-chain)
    localStorage.setItem(`subscription_${principal.toString()}`, JSON.stringify({
      ...subscription,
      startedAt: subscription.startedAt.toString(),
      expiresAt: subscription.expiresAt?.toString(),
    }));
    
    return subscription;
  }
  
  /**
   * Get subscription pricing
   */
  getPricing(): SubscriptionPricing[] {
    return [
      {
        plan: 'monthly',
        priceICP: 2,
        priceUSD: 25,
        duration: '30 days',
        features: SUBSCRIPTION_PRICES.monthly.features,
      },
      {
        plan: 'yearly',
        priceICP: 10,
        priceUSD: 125,
        duration: '365 days',
        features: SUBSCRIPTION_PRICES.yearly.features,
      },
      {
        plan: 'lifetime',
        priceICP: 25,
        priceUSD: 312.50,
        duration: 'Forever',
        features: SUBSCRIPTION_PRICES.lifetime.features,
      },
    ];
  }
  
  /**
   * Purchase subscription - stores on-chain
   */
  async purchaseSubscription(
    plan: 'monthly' | 'yearly' | 'lifetime',
    txHash: string
  ): Promise<Subscription> {
    if (!this.identity) {
      throw new Error('Authentication required');
    }
    
    const principal = this.identity.getPrincipal?.();
    if (!principal) {
      throw new Error('Invalid identity');
    }
    
    const now = Date.now() * 1_000_000;
    const price = SUBSCRIPTION_PRICES[plan];
    
    let expiresAt: bigint | undefined;
    let subscriptionPlan: SubscriptionPlan;
    
    switch (plan) {
      case 'monthly':
        expiresAt = BigInt(now + (30 * 24 * 60 * 60 * 1000 * 1_000_000));
        subscriptionPlan = 'Monthly';
        break;
      case 'yearly':
        expiresAt = BigInt(now + (365 * 24 * 60 * 60 * 1000 * 1_000_000));
        subscriptionPlan = 'Yearly';
        break;
      case 'lifetime':
        expiresAt = undefined;
        subscriptionPlan = 'Lifetime';
        break;
    }
    
    // Try to store on-chain
    try {
      const ravenAiCanisterId = getCanisterId('raven_ai');
      
      const idlFactory = ({ IDL }: any) => IDL.Service({
        purchase_subscription: IDL.Func(
          [IDL.Text, IDL.Text],
          [IDL.Variant({
            Ok: IDL.Record({
              user: IDL.Principal,
              plan: IDL.Variant({
                Demo: IDL.Null,
                Monthly: IDL.Null,
                Yearly: IDL.Null,
                Lifetime: IDL.Null,
                NFTHolder: IDL.Null,
              }),
              started_at: IDL.Nat64,
              expires_at: IDL.Opt(IDL.Nat64),
              is_active: IDL.Bool,
              payment_history: IDL.Vec(IDL.Record({
                amount: IDL.Nat64,
                token: IDL.Variant({ ICP: IDL.Null }),
                paid_at: IDL.Nat64,
                tx_hash: IDL.Opt(IDL.Text),
              })),
            }),
            Err: IDL.Text,
          })],
          [],
        ),
      });
      
      const actor = Actor.createActor(idlFactory, {
        agent: this.agent,
        canisterId: Principal.fromText(ravenAiCanisterId),
      });
      
      const result = await (actor as any).purchase_subscription(plan, txHash);
      
      if ('Ok' in result) {
        const sub = result.Ok;
        const planKey = Object.keys(sub.plan)[0] as SubscriptionPlan;
        
        const subscription: Subscription = {
          user: sub.user.toString(),
          plan: planKey,
          startedAt: sub.started_at,
          expiresAt: sub.expires_at.length > 0 ? sub.expires_at[0] : undefined,
          isActive: sub.is_active,
          paymentHistory: sub.payment_history.map((p: any) => ({
            amount: p.amount,
            token: Object.keys(p.token)[0],
            paidAt: p.paid_at,
            txHash: p.tx_hash.length > 0 ? p.tx_hash[0] : undefined,
          })),
        };
        
        // Also store locally as backup
        localStorage.setItem(`subscription_${principal.toString()}`, JSON.stringify({
          ...subscription,
          startedAt: subscription.startedAt.toString(),
          expiresAt: subscription.expiresAt?.toString(),
          paymentHistory: subscription.paymentHistory.map(p => ({
            ...p,
            amount: p.amount.toString(),
            paidAt: p.paidAt.toString(),
          })),
        }));
        
        return subscription;
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.warn('Failed to store subscription on-chain, using localStorage:', error);
    }
    
    // Fallback to localStorage
    const subscription: Subscription = {
      user: principal.toString(),
      plan: subscriptionPlan,
      startedAt: BigInt(now),
      expiresAt,
      isActive: true,
      paymentHistory: [{
        amount: price.icp,
        token: 'ICP',
        paidAt: BigInt(now),
        txHash,
      }],
    };
    
    localStorage.setItem(`subscription_${principal.toString()}`, JSON.stringify({
      ...subscription,
      startedAt: subscription.startedAt.toString(),
      expiresAt: subscription.expiresAt?.toString(),
      paymentHistory: subscription.paymentHistory.map(p => ({
        ...p,
        amount: p.amount.toString(),
        paidAt: p.paidAt.toString(),
      })),
    }));
    
    return subscription;
  }
  
  /**
   * Renew subscription
   */
  async renewSubscription(txHash: string): Promise<Subscription> {
    const existing = await this.checkSubscription();
    
    if (!existing) {
      throw new Error('No existing subscription to renew');
    }
    
    if (existing.plan === 'Lifetime' || existing.plan === 'NFTHolder') {
      throw new Error('Lifetime subscriptions do not need renewal');
    }
    
    const principal = this.identity?.getPrincipal?.();
    if (!principal) {
      throw new Error('Invalid identity');
    }
    
    const now = Date.now() * 1_000_000;
    let newExpiresAt: bigint;
    let price: bigint;
    
    // Calculate new expiration from current expiration or now
    const baseTime = existing.isActive && existing.expiresAt 
      ? Number(existing.expiresAt)
      : now;
    
    if (existing.plan === 'Monthly') {
      newExpiresAt = BigInt(baseTime + (30 * 24 * 60 * 60 * 1000 * 1_000_000));
      price = SUBSCRIPTION_PRICES.monthly.icp;
    } else if (existing.plan === 'Yearly') {
      newExpiresAt = BigInt(baseTime + (365 * 24 * 60 * 60 * 1000 * 1_000_000));
      price = SUBSCRIPTION_PRICES.yearly.icp;
    } else {
      throw new Error('Cannot renew this subscription type');
    }
    
    const payment: SubscriptionPayment = {
      amount: price,
      token: 'ICP',
      paidAt: BigInt(now),
      txHash,
    };
    
    const subscription: Subscription = {
      ...existing,
      expiresAt: newExpiresAt,
      isActive: true,
      paymentHistory: [...existing.paymentHistory, payment],
    };
    
    // Store in localStorage
    localStorage.setItem(`subscription_${principal.toString()}`, JSON.stringify({
      ...subscription,
      startedAt: subscription.startedAt.toString(),
      expiresAt: subscription.expiresAt?.toString(),
      paymentHistory: subscription.paymentHistory.map(p => ({
        ...p,
        amount: p.amount.toString(),
        paidAt: p.paidAt.toString(),
      })),
    }));
    
    return subscription;
  }
}

// Export singleton
export const subscriptionService = new SubscriptionService();

