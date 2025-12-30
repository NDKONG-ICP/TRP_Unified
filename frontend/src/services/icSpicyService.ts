/**
 * IC SPICY Service - Real-World Asset Co-op Data
 * Manages farm dashboard, inventory, shop products, and NFT generation
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';

// ============ TYPES ============

export interface MultichainMetadata {
  icp_canister: string;
  eth_contract: [] | [string];
  eth_token_id: [] | [string];
  evm_chain_id: [] | [bigint];
  sol_mint: [] | [string];
  btc_inscription: [] | [string];
  standards: string[];
}

export interface GeneratedNFT {
  token_id: bigint;
  layers: string[];
  rarity_score: number;
  metadata: string;
  composite_image: [] | [Uint8Array | number[]];
  owner: Principal;
  is_og: boolean;
  price_usd: [] | [number];
  multichain_metadata: MultichainMetadata;
}

export interface FarmStats {
  totalPlants: number;
  members: number;
  harvestYield: string;
  co2Offset: string;
  lastUpdated: number;
}

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  price_usd: number;
  category: { Pods: null } | { Plants: null } | { Seeds: null } | { Blends: null } | { Merch: null };
  inventory: number;
  in_stock: boolean;
  image_url: [] | [string];
}

// ============ SERVICE CLASS ============

export class ICSpicyService {
  private agent: HttpAgent | null = null;

  async init(identity?: Identity): Promise<void> {
    const host = getICHost();
    this.agent = new HttpAgent({ identity, host });
    if (!isMainnet()) {
      await this.agent.fetchRootKey();
    }
  }

  private async getActor<T>(idlFactory: any): Promise<T> {
    if (!this.agent) await this.init();
    const canisterId = getCanisterId('icspicy');
    return Actor.createActor(idlFactory, {
      agent: this.agent!,
      canisterId,
    }) as unknown as T;
  }

  // ============ FARM & SHOP ============

  async getFarmStats(): Promise<FarmStats> {
    const idl = ({ IDL }: any) => IDL.Service({
      'get_farm_stats': IDL.Func([], [IDL.Record({
        'total_plants': IDL.Nat64,
          'members': IDL.Nat64,
          'harvest_yield': IDL.Text,
          'co2_offset': IDL.Text,
          'last_updated': IDL.Nat64,
      })], ['query']),
        });
    const actor = await this.getActor<any>(idl);
      const stats = await actor.get_farm_stats();
      return {
      totalPlants: Number(stats.total_plants),
        members: Number(stats.members),
        harvestYield: stats.harvest_yield,
        co2Offset: stats.co2_offset,
      lastUpdated: Number(stats.last_updated),
      };
  }

  async getShopProducts(): Promise<ShopProduct[]> {
    const idl = ({ IDL }: any) => IDL.Service({
      'get_shop_products': IDL.Func([], [IDL.Vec(IDL.Record({
        'id': IDL.Text,
        'name': IDL.Text,
        'description': IDL.Text,
        'price_usd': IDL.Float64,
        'category': IDL.Variant({ 'Pods': IDL.Null, 'Plants': IDL.Null, 'Seeds': IDL.Null, 'Blends': IDL.Null, 'Merch': IDL.Null }),
        'inventory': IDL.Nat32,
        'in_stock': IDL.Bool,
        'image_url': IDL.Opt(IDL.Text),
      }))], ['query']),
    });
    const actor = await this.getActor<any>(idl);
    return await actor.get_shop_products();
  }

  async placeOrder(items: [string, number][], address: string, totalUsd: number): Promise<{ Ok: bigint } | { Err: string }> {
    const idl = ({ IDL }: any) => IDL.Service({
      'place_rwa_order': IDL.Func([IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat32)), IDL.Text, IDL.Float64], [IDL.Variant({ 'Ok': IDL.Nat64, 'Err': IDL.Text })], []),
    });
    const actor = await this.getActor<any>(idl);
    return await actor.place_rwa_order(items, address, totalUsd);
  }

  // ============ NFT GENERATOR ============

  async generateNFT(): Promise<{ Ok: GeneratedNFT } | { Err: string }> {
    const idl = ({ IDL }: any) => {
      const MultichainMetadata = IDL.Record({
        'icp_canister': IDL.Text,
        'eth_contract': IDL.Opt(IDL.Text),
        'eth_token_id': IDL.Opt(IDL.Text),
        'evm_chain_id': IDL.Opt(IDL.Nat64),
        'sol_mint': IDL.Opt(IDL.Text),
        'btc_inscription': IDL.Opt(IDL.Text),
        'standards': IDL.Vec(IDL.Text),
      });
      const GeneratedNFT = IDL.Record({
        'token_id': IDL.Nat,
        'owner': IDL.Principal,
        'metadata': IDL.Text,
        'layers': IDL.Vec(IDL.Text),
        'rarity_score': IDL.Float64,
        'composite_image': IDL.Opt(IDL.Vec(IDL.Nat8)),
        'is_og': IDL.Bool,
        'price_usd': IDL.Opt(IDL.Float64),
        'multichain_metadata': MultichainMetadata,
      });
      return IDL.Service({
        'generate_nft': IDL.Func([], [IDL.Variant({ 'Ok': GeneratedNFT, 'Err': IDL.Text })], []),
      });
    };
    const actor = await this.getActor<any>(idl);
    return await actor.generate_nft();
  }

  async getCollectionNFTs(): Promise<GeneratedNFT[]> {
    const idl = ({ IDL }: any) => {
      const MultichainMetadata = IDL.Record({
        'icp_canister': IDL.Text,
        'eth_contract': IDL.Opt(IDL.Text),
        'eth_token_id': IDL.Opt(IDL.Text),
        'evm_chain_id': IDL.Opt(IDL.Nat64),
        'sol_mint': IDL.Opt(IDL.Text),
        'btc_inscription': IDL.Opt(IDL.Text),
        'standards': IDL.Vec(IDL.Text),
      });
      const GeneratedNFT = IDL.Record({
        'token_id': IDL.Nat,
        'owner': IDL.Principal,
        'metadata': IDL.Text,
        'layers': IDL.Vec(IDL.Text),
        'rarity_score': IDL.Float64,
        'composite_image': IDL.Opt(IDL.Vec(IDL.Nat8)),
        'is_og': IDL.Bool,
        'price_usd': IDL.Opt(IDL.Float64),
        'multichain_metadata': MultichainMetadata,
      });
      return IDL.Service({
        'get_collection_nfts': IDL.Func([], [IDL.Vec(GeneratedNFT)], ['query']),
      });
    };
    const actor = await this.getActor<any>(idl);
    return await actor.get_collection_nfts();
  }

  async buyCollectionNFT(tokenId: bigint, fromToken: any, paymentAmount: bigint, txHash?: string): Promise<{ Ok: boolean } | { Err: string }> {
    const idl = ({ IDL }: any) => {
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
      return IDL.Service({
        'buy_collection_nft': IDL.Func([IDL.Nat64, TokenType, IDL.Nat64, IDL.Opt(IDL.Text)], [IDL.Variant({ 'Ok': IDL.Bool, 'Err': IDL.Text })], []),
      });
    };
    const actor = await this.getActor<any>(idl);
    return await actor.buy_collection_nft(tokenId, fromToken, paymentAmount, txHash ? [txHash] : []);
  }

  async preMintCollection(start: bigint, count: bigint): Promise<{ Ok: string } | { Err: string }> {
    const idl = ({ IDL }: any) => IDL.Service({
      'pre_mint_collection': IDL.Func([IDL.Nat64, IDL.Nat64], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    });
    const actor = await this.getActor<any>(idl);
    return await actor.pre_mint_collection(start, count);
  }

  async mintNFT(recipient?: Principal): Promise<{ Ok: { token_ids: bigint[], success: boolean } } | { Err: string }> {
    const idl = ({ IDL }: any) => {
      const MintResponse = IDL.Record({ 'token_ids': IDL.Vec(IDL.Nat64), 'success': IDL.Bool });
      return IDL.Service({
        'mint': IDL.Func([IDL.Opt(IDL.Principal)], [IDL.Variant({ 'Ok': MintResponse, 'Err': IDL.Text })], []),
      });
    };
    const actor = await this.getActor<any>(idl);
    return await actor.mint(recipient ? [recipient] : []);
  }

  async getVotingPower(principal: Principal): Promise<bigint> {
    const idl = ({ IDL }: any) => IDL.Service({
      'get_voting_power': IDL.Func([IDL.Principal], [IDL.Nat64], ['query']),
    });
    const actor = await this.getActor<any>(idl);
    return await actor.get_voting_power(principal);
  }

  async isAdmin(principal: Principal): Promise<boolean> {
    const idl = ({ IDL }: any) => IDL.Service({
      'is_admin_query': IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    });
    const actor = await this.getActor<any>(idl);
    return await actor.is_admin_query(principal);
  }

  async getUserTokens(principal: Principal): Promise<bigint[]> {
    const idl = ({ IDL }: any) => IDL.Service({
      'get_user_tokens': IDL.Func([IDL.Principal], [IDL.Vec(IDL.Nat64)], ['query']),
    });
    const actor = await this.getActor<any>(idl);
    return await actor.get_user_tokens(principal);
  }

  async getNFTInfo(tokenId: bigint): Promise<GeneratedNFT | null> {
    const idl = ({ IDL }: any) => {
      const MultichainMetadata = IDL.Record({
        'icp_canister': IDL.Text,
        'eth_contract': IDL.Opt(IDL.Text),
        'eth_token_id': IDL.Opt(IDL.Text),
        'evm_chain_id': IDL.Opt(IDL.Nat64),
        'sol_mint': IDL.Opt(IDL.Text),
        'btc_inscription': IDL.Opt(IDL.Text),
        'standards': IDL.Vec(IDL.Text),
      });
      const GeneratedNFT = IDL.Record({
        'token_id': IDL.Nat,
        'owner': IDL.Principal,
        'metadata': IDL.Text,
        'layers': IDL.Vec(IDL.Text),
        'rarity_score': IDL.Float64,
        'composite_image': IDL.Opt(IDL.Vec(IDL.Nat8)),
        'is_og': IDL.Bool,
        'price_usd': IDL.Opt(IDL.Float64),
        'multichain_metadata': MultichainMetadata,
      });
      return IDL.Service({
        'get_nft_info': IDL.Func([IDL.Nat64], [IDL.Opt(GeneratedNFT)], ['query']),
      });
    };
    const actor = await this.getActor<any>(idl);
    const result = await actor.get_nft_info(tokenId);
    return result[0] || null;
  }
}

export const icSpicyService = new ICSpicyService();

// ============ REACT HOOKS ============

import { useState, useEffect, useCallback } from 'react';

export function useFarmStats(identity?: Identity) {
  const [stats, setStats] = useState<FarmStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      await icSpicyService.init(identity);
      const data = await icSpicyService.getFarmStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stats');
    } finally {
      setIsLoading(false);
    }
  }, [identity]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  return { stats, isLoading, error, refresh: fetchStats };
}

export function useShopProducts(category?: string, identity?: Identity) {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      await icSpicyService.init(identity);
      let data = await icSpicyService.getShopProducts();
      if (category && category !== 'all') {
        data = data.filter(p => Object.keys(p.category)[0] === category);
      }
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  }, [identity, category]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  return { products, isLoading, error, refresh: fetchProducts };
}

export function useCollectionNFTs(identity?: Identity) {
  const [nfts, setNfts] = useState<GeneratedNFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNfts = useCallback(async () => {
    setIsLoading(true);
    try {
      await icSpicyService.init(identity);
      const data = await icSpicyService.getCollectionNFTs();
      setNfts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch collection');
    } finally {
      setIsLoading(false);
    }
  }, [identity]);

  useEffect(() => { fetchNfts(); }, [fetchNfts]);
  return { nfts, isLoading, error, refresh: fetchNfts };
  }
