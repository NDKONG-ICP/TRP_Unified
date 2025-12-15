/**
 * Token Service - Real ICRC Ledger Integration
 * Supports ICP, $HARLEE, ckBTC, ckETH, and other ICRC tokens
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// Token Canister IDs
export const TOKEN_CANISTERS = {
  // $HARLEE Token - Used for Sk8Punks, Crossword, News rewards
  HARLEE: {
    index: '5ipsq-2iaaa-aaaae-qffka-cai',
    ledger: 'tlm4l-kaaaa-aaaah-qqeha-cai',
    symbol: 'HARLEE',
    name: 'Harlee Token',
    decimals: 8,
    fee: BigInt(10000), // 0.0001 HARLEE
  },
  // ICP Ledger
  ICP: {
    index: 'qhbym-qaaaa-aaaaa-aaafq-cai',
    ledger: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
    symbol: 'ICP',
    name: 'Internet Computer',
    decimals: 8,
    fee: BigInt(10000), // 0.0001 ICP
  },
  // ckBTC
  CKBTC: {
    index: 'n5wcd-faaaa-aaaar-qaaea-cai',
    ledger: 'mxzaz-hqaaa-aaaar-qaada-cai',
    symbol: 'ckBTC',
    name: 'Chain-Key Bitcoin',
    decimals: 8,
    fee: BigInt(10), // 0.0000001 ckBTC
  },
  // ckETH
  CKETH: {
    index: 's3zol-vqaaa-aaaar-qacpa-cai',
    ledger: 'ss2fx-dyaaa-aaaar-qacoq-cai',
    symbol: 'ckETH',
    name: 'Chain-Key Ethereum',
    decimals: 18,
    fee: BigInt(2000000000000), // 0.000002 ckETH
  },
  // RAVEN Token (if deployed)
  RAVEN: {
    index: '4k7jk-vyaaa-aaaam-qcyaa-cai', // Placeholder
    ledger: '4k7jk-vyaaa-aaaam-qcyaa-cai',
    symbol: 'RAVEN',
    name: 'Raven Token',
    decimals: 8,
    fee: BigInt(10000),
  },
};

// ICRC-1 IDL Factory
const icrc1IdlFactory = ({ IDL }: { IDL: any }) => {
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  
  const TransferArg = IDL.Record({
    to: Account,
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
    amount: IDL.Nat,
  });
  
  const TransferError = IDL.Variant({
    GenericError: IDL.Record({ message: IDL.Text, error_code: IDL.Nat }),
    TemporarilyUnavailable: IDL.Null,
    BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    TooOld: IDL.Null,
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
  });
  
  return IDL.Service({
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
    icrc1_transfer: IDL.Func([TransferArg], [IDL.Variant({ Ok: IDL.Nat, Err: TransferError })], []),
    icrc1_fee: IDL.Func([], [IDL.Nat], ['query']),
    icrc1_symbol: IDL.Func([], [IDL.Text], ['query']),
    icrc1_name: IDL.Func([], [IDL.Text], ['query']),
    icrc1_decimals: IDL.Func([], [IDL.Nat8], ['query']),
    icrc1_total_supply: IDL.Func([], [IDL.Nat], ['query']),
  });
};

export interface TokenBalance {
  token: keyof typeof TOKEN_CANISTERS;
  balance: bigint;
  symbol: string;
  decimals: number;
  formatted: string;
}

export interface TransferResult {
  success: boolean;
  blockHeight?: bigint;
  error?: string;
}

// Determine if we're on mainnet
const isMainnet = typeof window !== 'undefined' && 
  (window.location.hostname.endsWith('.ic0.app') || 
   window.location.hostname.endsWith('.icp0.io') ||
   window.location.hostname.endsWith('.raw.ic0.app'));

const IC_HOST = isMainnet ? 'https://ic0.app' : 'http://localhost:4943';

/**
 * Token Service Class
 */
export class TokenService {
  private identity: Identity | undefined;
  private agent: HttpAgent | null = null;
  private actors: Map<string, any> = new Map();

  constructor(identity?: Identity) {
    this.identity = identity;
    this.initAgent();
  }

  private async initAgent() {
    this.agent = new HttpAgent({ 
      identity: this.identity, 
      host: IC_HOST 
    });
    
    if (!isMainnet) {
      await this.agent.fetchRootKey();
    }
  }

  private async getActor(ledgerCanisterId: string): Promise<any> {
    if (!this.agent) {
      await this.initAgent();
    }

    if (this.actors.has(ledgerCanisterId)) {
      return this.actors.get(ledgerCanisterId);
    }

    const actor = Actor.createActor(icrc1IdlFactory, {
      agent: this.agent!,
      canisterId: Principal.fromText(ledgerCanisterId),
    });

    this.actors.set(ledgerCanisterId, actor);
    return actor;
  }

  /**
   * Get balance for a specific token
   */
  async getBalance(token: keyof typeof TOKEN_CANISTERS, owner: Principal): Promise<TokenBalance> {
    const tokenConfig = TOKEN_CANISTERS[token];
    
    try {
      const actor = await this.getActor(tokenConfig.ledger);
      const balance = await actor.icrc1_balance_of({
        owner,
        subaccount: [],
      });

      const divisor = Math.pow(10, tokenConfig.decimals);
      const formatted = (Number(balance) / divisor).toFixed(4);

      return {
        token,
        balance,
        symbol: tokenConfig.symbol,
        decimals: tokenConfig.decimals,
        formatted,
      };
    } catch (error) {
      console.error(`Failed to get ${token} balance:`, error);
      return {
        token,
        balance: BigInt(0),
        symbol: tokenConfig.symbol,
        decimals: tokenConfig.decimals,
        formatted: '0.0000',
      };
    }
  }

  /**
   * Get all token balances
   */
  async getAllBalances(owner: Principal): Promise<TokenBalance[]> {
    const tokens = Object.keys(TOKEN_CANISTERS) as (keyof typeof TOKEN_CANISTERS)[];
    const balances = await Promise.all(
      tokens.map(token => this.getBalance(token, owner))
    );
    return balances;
  }

  /**
   * Get $HARLEE balance specifically
   */
  async getHarleeBalance(owner: Principal): Promise<TokenBalance> {
    return this.getBalance('HARLEE', owner);
  }

  /**
   * Transfer tokens
   */
  async transfer(
    token: keyof typeof TOKEN_CANISTERS,
    to: Principal,
    amount: bigint,
    memo?: Uint8Array
  ): Promise<TransferResult> {
    const tokenConfig = TOKEN_CANISTERS[token];
    
    try {
      const actor = await this.getActor(tokenConfig.ledger);
      const result = await actor.icrc1_transfer({
        to: { owner: to, subaccount: [] },
        amount,
        fee: [],
        memo: memo ? [Array.from(memo)] : [],
        from_subaccount: [],
        created_at_time: [],
      });

      if ('Ok' in result) {
        return { success: true, blockHeight: result.Ok };
      } else {
        const errorKey = Object.keys(result.Err)[0];
        return { success: false, error: `Transfer failed: ${errorKey}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Transfer $HARLEE tokens
   */
  async transferHarlee(to: Principal, amount: bigint): Promise<TransferResult> {
    return this.transfer('HARLEE', to, amount);
  }

  /**
   * Get $HARLEE token info
   */
  getHarleeInfo() {
    return TOKEN_CANISTERS.HARLEE;
  }

  /**
   * Format token amount
   */
  formatAmount(amount: bigint, decimals: number): string {
    const divisor = Math.pow(10, decimals);
    return (Number(amount) / divisor).toFixed(4);
  }

  /**
   * Parse token amount from string
   */
  parseAmount(amountStr: string, decimals: number): bigint {
    const multiplier = Math.pow(10, decimals);
    return BigInt(Math.floor(parseFloat(amountStr) * multiplier));
  }
}

// Export singleton for convenience
export const tokenService = new TokenService();

// Export $HARLEE specific helpers
export const HARLEE_TOKEN = TOKEN_CANISTERS.HARLEE;

export function formatHarlee(amount: bigint): string {
  const divisor = Math.pow(10, HARLEE_TOKEN.decimals);
  return (Number(amount) / divisor).toFixed(4);
}

export function parseHarlee(amountStr: string): bigint {
  const multiplier = Math.pow(10, HARLEE_TOKEN.decimals);
  return BigInt(Math.floor(parseFloat(amountStr) * multiplier));
}



