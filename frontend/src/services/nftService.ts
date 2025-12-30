/**
 * NFT Service - Collection data fetching from NFT canister
 * Uses TypeScript declarations generated from CANDID files via dfx generate
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';
// Import generated TypeScript declarations and IDL factory
import { idlFactory } from '../declarations/nft';
import type { _SERVICE as NFTCanisterService, NFTMetadata as BackendNFTMetadata, CollectionConfig as BackendCollectionConfig, Rarity as BackendRarity } from '../declarations/nft/nft.did';

// Types
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface Trait {
  traitType: string;
  value: string;
  rarityScore: number;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  externalUrl?: string;
  attributes: Trait[];
  rarity: Rarity;
  rarityScore: number;
  collection: string;
  createdAt: number;
  creator: string;
}

export interface CollectionConfig {
  name: string;
  symbol: string;
  description: string;
  maxSupply: number;
  minted: number;
  royaltyBps: number;
  admin: string;
  paused: boolean;
}

export interface NFT {
  tokenId: bigint;
  owner: string;
  metadata: NFTMetadata;
}

export interface CollectionStats {
  name: string;
  symbol: string;
  description: string;
  totalSupply: number;
  maxSupply?: number;
  minted: number;
  royaltyBps: number;
}

export class NFTService {
  private actor: NFTCanisterService | null = null;
  private agent: HttpAgent | null = null;

  async init(identity?: Identity): Promise<void> {
    const host = getICHost();
    this.agent = new HttpAgent({ identity, host });
    
    if (!isMainnet()) {
      await this.agent.fetchRootKey();
    }
    
    const canisterId = getCanisterId('nft');
    // Use generated IDL factory from TypeScript declarations
    this.actor = Actor.createActor<NFTCanisterService>(idlFactory as any, {
      agent: this.agent,
      canisterId: Principal.fromText(canisterId),
    });
  }

  private ensureActor(): void {
    if (!this.actor) {
      throw new Error('NFTService not initialized. Call init() first.');
    }
  }
  
  private getActor(): NFTCanisterService {
    this.ensureActor();
    return this.actor!;
  }

  private parseRarity(rarity: BackendRarity): Rarity {
    // Convert backend Rarity variant to string
    if ('Common' in rarity && rarity.Common === null) return 'Common';
    if ('Uncommon' in rarity && rarity.Uncommon === null) return 'Uncommon';
    if ('Rare' in rarity && rarity.Rare === null) return 'Rare';
    if ('Epic' in rarity && rarity.Epic === null) return 'Epic';
    if ('Legendary' in rarity && rarity.Legendary === null) return 'Legendary';
    return 'Common'; // Default fallback
  }

  private parseMetadata(raw: BackendNFTMetadata): NFTMetadata {
    return {
      name: raw.name,
      description: raw.description,
      image: raw.image,
      externalUrl: raw.external_url[0] || undefined,
      attributes: raw.attributes.map((attr) => ({
        traitType: attr.trait_type,
        value: attr.value,
        rarityScore: Number(attr.rarity_score),
      })),
      rarity: this.parseRarity(raw.rarity),
      rarityScore: Number(raw.rarity_score),
      collection: raw.collection,
      createdAt: Number(raw.created_at),
      creator: raw.creator.toText(),
    };
  }

  async getCollectionConfig(): Promise<CollectionConfig> {
    const actor = this.getActor();
    try {
      // Use typed service interface from declarations
      const result: BackendCollectionConfig = await actor.get_collection_config();
      return {
        name: result.name,
        symbol: result.symbol,
        description: result.description,
        maxSupply: Number(result.max_supply),
        minted: Number(result.minted),
        royaltyBps: Number(result.royalty_bps),
        admin: result.admin.toText(),
        paused: result.paused,
      };
    } catch (error) {
      console.error('Failed to fetch collection config:', error);
      throw error;
    }
  }

  async getCollectionStats(): Promise<CollectionStats> {
    const actor = this.getActor();
    try {
      const [config, totalSupply, supplyCap] = await Promise.all([
        actor.get_collection_config(),
        actor.icrc7_total_supply(),
        actor.icrc7_supply_cap(),
      ]);

      return {
        name: config.name,
        symbol: config.symbol,
        description: config.description,
        totalSupply: Number(totalSupply),
        maxSupply: supplyCap[0] ? Number(supplyCap[0]) : undefined,
        minted: Number(config.minted),
        royaltyBps: Number(config.royalty_bps),
      };
    } catch (error) {
      console.error('Failed to fetch collection stats:', error);
      throw error;
    }
  }

  async getTotalSupply(): Promise<number> {
    const actor = this.getActor();
    try {
      const result = await actor.icrc7_total_supply();
      return Number(result);
    } catch (error) {
      console.error('Failed to fetch total supply:', error);
      throw error;
    }
  }

  async getOwnerOf(tokenId: bigint): Promise<string | null> {
    const actor = this.getActor();
    try {
      const result = await actor.icrc7_owner_of(tokenId);
      return result[0] ? result[0].toText() : null;
    } catch (error) {
      console.error('Failed to fetch owner:', error);
      throw error;
    }
  }

  async getBalanceOf(owner: string): Promise<number> {
    const actor = this.getActor();
    try {
      const result = await actor.icrc7_balance_of(Principal.fromText(owner));
      return Number(result);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      throw error;
    }
  }

  async getTokensOf(owner: string): Promise<bigint[]> {
    const actor = this.getActor();
    try {
      const result = await actor.icrc7_tokens_of(Principal.fromText(owner));
      return result.map((id: any) => BigInt(id));
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
      throw error;
    }
  }

  async getNFTMetadata(tokenId: bigint): Promise<NFTMetadata | null> {
    const actor = this.getActor();
    try {
      const result = await actor.get_nft_metadata(tokenId);
      if (result[0]) {
        return this.parseMetadata(result[0]);
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch NFT metadata:', error);
      throw error;
    }
  }

  async getNFT(tokenId: bigint): Promise<NFT | null> {
    this.ensureActor();
    try {
      const [owner, metadata] = await Promise.all([
        this.getOwnerOf(tokenId),
        this.getNFTMetadata(tokenId),
      ]);

      if (owner && metadata) {
        return {
          tokenId,
          owner,
          metadata,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch NFT:', error);
      throw error;
    }
  }

  async getUserNFTs(owner: string): Promise<NFT[]> {
    this.ensureActor();
    try {
      const tokenIds = await this.getTokensOf(owner);
      const nfts = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const metadata = await this.getNFTMetadata(tokenId);
          if (metadata) {
            return {
              tokenId,
              owner,
              metadata,
            };
          }
          return null;
        })
      );
      return nfts.filter((nft): nft is NFT => nft !== null);
    } catch (error) {
      console.error('Failed to fetch user NFTs:', error);
      throw error;
    }
  }

  async getAllNFTs(limit: number = 100): Promise<NFT[]> {
    this.ensureActor();
    try {
      const totalSupply = await this.getTotalSupply();
      const count = Math.min(totalSupply, limit);
      
      const nfts: NFT[] = [];
      for (let i = 1; i <= count; i++) {
        try {
          const nft = await this.getNFT(BigInt(i));
          if (nft) {
            nfts.push(nft);
          }
        } catch (e) {
          // Token might not exist, skip
        }
      }
      
      return nfts;
    } catch (error) {
      console.error('Failed to fetch all NFTs:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<string> {
    const actor = this.getActor();
    return await actor.health();
  }
}

// Singleton instance
export const nftService = new NFTService();

// React hooks
import { useState, useEffect, useCallback } from 'react';

export function useCollection(identity?: Identity) {
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [config, setConfig] = useState<CollectionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await nftService.init(identity);
      
      const [statsData, configData] = await Promise.all([
        nftService.getCollectionStats(),
        nftService.getCollectionConfig(),
      ]);
      
      setStats(statsData);
      setConfig(configData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch collection data');
      console.error('Collection fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [identity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    stats,
    config,
    isLoading,
    error,
    refresh: fetchData,
  };
}

export function useUserNFTs(owner: string | undefined, identity?: Identity) {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNFTs = useCallback(async () => {
    if (!owner) {
      setNfts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await nftService.init(identity);
      const nftsData = await nftService.getUserNFTs(owner);
      setNfts(nftsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch NFTs');
      console.error('NFT fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [owner, identity]);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  return {
    nfts,
    isLoading,
    error,
    refresh: fetchNFTs,
  };
}

export default nftService;



