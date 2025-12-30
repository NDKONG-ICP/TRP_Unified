/**
 * IC SPICY Minting Service
 * Connects to the NFT canister for NFT minting (Forge uses the main NFT canister)
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { CANISTER_IDS, getICHost, isMainnet } from './canisterConfig';
import { getActiveIdentity, getOrCreateAgent } from './session';

// Use the main NFT canister for Forge minting
const getNFTCanisterId = (): string => {
  return CANISTER_IDS.nft;
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

// Create actor for NFT canister
async function createNFTActor(identity: Identity | null): Promise<any> {
  // Import NFT canister declarations (same pattern as NFTService)
  const { idlFactory } = await import('../declarations/nft');
  const isLocal = !isMainnet();
  
  const agent = await getOrCreateAgent(identity);

  const canisterId = getNFTCanisterId();
  
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
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('Please connect a wallet before minting.');
    }
    const actor = await createNFTActor(identity);
    const caller = identity.getPrincipal();
    const mintTo = recipient || caller;
    
    try {
      // Use NFT canister's mint method
      const mintArgs = {
        to: mintTo,
        name: `Forge Genesis NFT #${Date.now()}`,
        description: 'Exclusive Genesis NFT minted from The Forge NFT Minter.',
        image: 'https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io/forge-genesis.png', // Main assets canister
        attributes: [
          {
            trait_type: 'Collection',
            value: 'The Forge Genesis',
            rarity_score: 1,
          },
          {
            trait_type: 'Platform',
            value: 'Internet Computer',
            rarity_score: 1,
          }
        ],
      };
      
      const result = await actor.mint(mintArgs);
      
      if ('Ok' in result) {
        return {
          token_ids: [BigInt(result.Ok)],
          success: true,
        };
      } else {
        throw new Error(result.Err || 'Minting failed');
      }
    } catch (error) {
      console.error('Forge NFT mint error:', error);
      throw error;
    }
  }

  /**
   * Batch mint NFTs
   */
  static async batchMint(request: MintRequest): Promise<MintResponse> {
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('Please connect a wallet before minting.');
    }
    const actor = await createNFTActor(identity);
    const caller = identity.getPrincipal();
    const mintTo = request.recipient || caller;
    
    try {
      // Create batch mint requests
      const mintArgs = Array.from({ length: Number(request.quantity) }, (_, i) => ({
        to: mintTo,
        name: `Forge Genesis NFT #${Date.now()}-${i}`,
        description: 'Exclusive Genesis NFT minted from The Forge NFT Minter.',
        image: 'https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io/forge-genesis.png',
        attributes: [
          {
            trait_type: 'Collection',
            value: 'The Forge Genesis',
            rarity_score: 1,
          },
        ],
      }));
      
      const results = await actor.batch_mint(mintArgs);
      
      const tokenIds: bigint[] = [];
      for (const result of results) {
        if ('Ok' in result) {
          tokenIds.push(BigInt(result.Ok));
        }
      }
      
      return {
        token_ids: tokenIds,
        success: tokenIds.length > 0,
      };
    } catch (error) {
      console.error('Forge NFT batch mint error:', error);
      throw error;
    }
  }

  /**
   * Get user's NFTs
   */
  static async getUserTokens(principal: Principal): Promise<bigint[]> {
    // Query can be anonymous, but if we have an active identity, use it.
    const actor = await createNFTActor(getActiveIdentity());
    
    try {
      const tokens = await actor.icrc7_tokens_of(principal);
      return tokens.map((id: any) => BigInt(id));
    } catch (error) {
      console.error('Forge NFT get user tokens error:', error);
      throw error;
    }
  }

  /**
   * Get NFT metadata by token ID
   */
  static async getNFTMetadata(tokenId: bigint): Promise<{ metadata?: string; rarity?: string } | null> {
    // Query can be anonymous, but if we have an active identity, use it.
    const actor = await createNFTActor(getActiveIdentity());
    
    try {
      const metadata = await actor.get_nft_metadata(Number(tokenId));
      if (!metadata) {
        return null;
      }
      
      // Convert metadata to JSON string
      const metadataStr = JSON.stringify(metadata);
      const rarity = metadata.rarity 
        ? metadata.rarity.toLowerCase().replace('common', 'common').replace('uncommon', 'rare').replace('rare', 'rare').replace('epic', 'epic').replace('legendary', 'legendary')
        : 'common';
      
      return {
        metadata: metadataStr,
        rarity: rarity as 'common' | 'rare' | 'epic' | 'legendary',
      };
    } catch (error) {
      console.error('Forge NFT get metadata error:', error);
      return null;
    }
  }

  /**
   * Get transaction history for a user
   * Note: NFT canister doesn't have transaction history, so we return empty array
   * In production, you'd query a separate transaction ledger canister
   */
  static async getUserTransactions(principal: Principal): Promise<Transaction[]> {
    // NFT canister doesn't track transaction history
    // Return empty array - in production, integrate with a transaction ledger
    return [];
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

