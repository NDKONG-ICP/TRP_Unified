/**
 * IC SPICY Minting Service
 * Connects to the IC SPICY canister for NFT minting
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { AuthClient } from '@dfinity/auth-client';

// IC SPICY canister ID - get from canisterConfig
const getICSpicyCanisterId = (): string => {
  // Check environment variable first
  if (import.meta.env.VITE_ICSPICY_CANISTER_ID) {
    return import.meta.env.VITE_ICSPICY_CANISTER_ID;
  }
  
  // Try to get from canisterConfig
  try {
    const { CANISTER_IDS } = require('./canisterConfig');
    if (CANISTER_IDS.icspicy) {
      return CANISTER_IDS.icspicy;
    }
  } catch (e) {
    // Fall through to error
  }
  
  throw new Error('IC SPICY canister ID not configured. Set VITE_ICSPICY_CANISTER_ID in .env or add to canisterConfig.ts');
};

// Simplified interface for IC SPICY minting
export interface MintRequest {
  recipient?: Principal;
  quantity: number;
}

export interface MintResponse {
  token_ids: bigint[];
  success: boolean;
}

// Create actor for IC SPICY canister
async function createICSpicyActor(authClient: AuthClient | null): Promise<any> {
  // Use canisterConfig for consistent mainnet detection
  const { getICHost, isMainnet } = await import('./canisterConfig');
  const { idlFactory } = await import('../declarations/icspicy');
  const isLocal = !isMainnet();
  
  let agent: HttpAgent;
  if (authClient) {
    const identity = authClient.getIdentity();
    agent = new HttpAgent({
      identity,
      host: getICHost(),
    });
  } else {
    agent = new HttpAgent({
      host: getICHost(),
    });
  }

  if (isLocal) {
    await agent.fetchRootKey();
  }

  const canisterId = getICSpicyCanisterId();
  
  return Actor.createActor(idlFactory, {
    agent,
    canisterId: Principal.fromText(canisterId),
  });
}

export class ICSpicyMintService {
  /**
   * Mint a single NFT
   */
  static async mint(recipient?: Principal): Promise<MintResponse> {
    const authClient = await AuthClient.create();
    const actor = await createICSpicyActor(authClient);
    
    try {
      const result = await actor.mint(recipient ? [recipient] : []);
      return {
        token_ids: result.token_ids.map((id: any) => BigInt(id)),
        success: result.success,
      };
    } catch (error) {
      console.error('IC SPICY mint error:', error);
      throw error;
    }
  }

  /**
   * Batch mint NFTs
   */
  static async batchMint(request: MintRequest): Promise<MintResponse> {
    const authClient = await AuthClient.create();
    const actor = await createICSpicyActor(authClient);
    
    try {
      const mintRequest = {
        recipient: request.recipient ? [request.recipient] : [],
        quantity: request.quantity,
      };
      
      const result = await actor.batch_mint(mintRequest);
      return {
        token_ids: result.token_ids.map((id: any) => BigInt(id)),
        success: result.success,
      };
    } catch (error) {
      console.error('IC SPICY batch mint error:', error);
      throw error;
    }
  }

  /**
   * Get user's NFTs
   */
  static async getUserTokens(principal: Principal): Promise<bigint[]> {
    const authClient = await AuthClient.create();
    const actor = await createICSpicyActor(authClient);
    
    try {
      const tokens = await actor.get_user_tokens(principal);
      return tokens.map((id: any) => BigInt(id));
    } catch (error) {
      console.error('IC SPICY get user tokens error:', error);
      throw error;
    }
  }

  /**
   * Get NFT metadata by token ID
   */
  static async getNFTMetadata(tokenId: bigint): Promise<{ metadata?: string; rarity?: string } | null> {
    const authClient = await AuthClient.create();
    const actor = await createICSpicyActor(authClient);
    
    try {
      const metadata = await actor.get_nft_metadata(Number(tokenId));
      if (!metadata || metadata.length === 0) {
        return null;
      }
      
      // Parse metadata JSON if available
      let parsedMetadata: any = {};
      let rarity = 'common';
      
      try {
        parsedMetadata = JSON.parse(metadata);
        rarity = parsedMetadata.rarity || parsedMetadata.traits?.rarity || 'common';
      } catch (e) {
        // If not JSON, try to extract rarity from metadata string
        if (metadata.toLowerCase().includes('legendary')) rarity = 'legendary';
        else if (metadata.toLowerCase().includes('epic')) rarity = 'epic';
        else if (metadata.toLowerCase().includes('rare')) rarity = 'rare';
      }
      
      return {
        metadata,
        rarity: rarity.toLowerCase() as 'common' | 'rare' | 'epic' | 'legendary',
      };
    } catch (error) {
      console.error('IC SPICY get NFT metadata error:', error);
      return null;
    }
  }

  /**
   * Get transaction history for a user
   */
  static async getUserTransactions(principal: Principal): Promise<Transaction[]> {
    const authClient = await AuthClient.create();
    const actor = await createICSpicyActor(authClient);
    
    try {
      const backendTxs = await actor.get_user_transactions(principal) as any[];
      
      return backendTxs.map((tx: any) => ({
        id: tx.id.toString(),
        type: tx.transaction_type.Mint !== undefined ? 'mint' as const :
              tx.transaction_type.Transfer !== undefined ? 'transfer' as const : 'claim' as const,
        tokenId: tx.token_id.toString(),
        from: tx.from?.[0] ? Principal.fromText(tx.from[0]).toString() : undefined,
        to: typeof tx.to === 'object' && 'toText' in tx.to ? tx.to.toText() : String(tx.to),
        timestamp: Number(tx.timestamp) / 1_000_000, // Convert nanoseconds to milliseconds
        memo: tx.memo?.[0] || undefined,
      }));
    } catch (error) {
      console.error('IC SPICY get user transactions error:', error);
      throw error;
    }
  }
}

// Transaction type for frontend
export interface Transaction {
  id: string;
  type: 'mint' | 'transfer' | 'claim';
  tokenId: string;
  from?: string;
  to: string;
  timestamp: number;
  memo?: string;
}

