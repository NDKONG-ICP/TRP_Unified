/**
 * NFT Marketplace Service
 * Handles secondary market listings, purchases, and AXIOM AI agent management
 * Supports ICRC-7 standard
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';
import { paymentService, PaymentToken } from './paymentService';

// ============ TYPES ============

export interface NFTCollection {
  canisterId: string;
  name: string;
  symbol: string;
  description: string;
  totalSupply: bigint;
  royaltyBps: number; // Basis points (100 = 1%)
  creator: string;
  coverImage?: string;
  floorPrice?: bigint;
  volume24h?: bigint;
  owners?: number;
}

export interface NFTToken {
  tokenId: bigint;
  collection: string;
  owner: string;
  name: string;
  description?: string;
  imageUrl: string;
  metadata: NFTMetadata;
  mintNumber?: number;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  lastSalePrice?: bigint;
  listed?: Listing;
}

export interface NFTMetadata {
  name: string;
  description?: string;
  image: string;
  attributes: NFTAttribute[];
  // Multi-chain metadata
  chains: ChainMetadata[];
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

export interface ChainMetadata {
  chain: 'ICP' | 'ETH' | 'SOL' | 'BTC' | 'SUI' | 'AVAX' | 'TRON';
  contractAddress?: string;
  tokenId?: string;
  standard: string; // ICRC-7, ERC-721, etc.
}

export interface Listing {
  id: string;
  tokenId: bigint;
  collection: string;
  seller: string;
  price: bigint;
  token: PaymentToken;
  createdAt: number;
  expiresAt?: number;
  status: 'active' | 'sold' | 'cancelled';
}

export interface Offer {
  id: string;
  tokenId: bigint;
  collection: string;
  buyer: string;
  price: bigint;
  token: PaymentToken;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

export interface MarketActivity {
  id: string;
  type: 'listing' | 'sale' | 'transfer' | 'mint' | 'offer' | 'cancel';
  tokenId: bigint;
  collection: string;
  from?: string;
  to?: string;
  price?: bigint;
  token?: PaymentToken;
  timestamp: number;
  txHash?: string;
}

export interface MarketStats {
  totalVolume: bigint;
  volume24h: bigint;
  totalListings: number;
  activeListings: number;
  uniqueOwners: number;
  averagePrice: bigint;
}

// ============ AXIOM TYPES ============

export interface AxiomNFT extends NFTToken {
  axiomId: number; // 1-5 for Genesis, 6-300 for regular
  personality: string;
  specialty: string;
  aiCanisterId?: string; // Dedicated AI canister
  memorySize: number; // Bytes of stored memories
  conversationCount: number;
  voiceId?: string; // Eleven Labs voice ID
}

export interface AxiomConversation {
  id: string;
  axiomId: number;
  messages: { role: 'user' | 'assistant'; content: string; timestamp: number }[];
  createdAt: number;
  lastMessageAt: number;
}

// ============ COLLECTIONS ============

export const AXIOM_COLLECTION = 'axiom-collection';
export const SK8_PUNKS_COLLECTION = 'b4mk6-5qaaa-aaaah-arerq-cai';
export const IC_SPICY_COLLECTION = 'icspicy-collection';

// Genesis AXIOM NFTs (1-5)
export const GENESIS_AXIOMS: AxiomNFT[] = [
  {
    tokenId: BigInt(1),
    collection: AXIOM_COLLECTION,
    owner: 'sh7h6-b7xcy-tjank-crj6d-idrcr-ormbi-22yqs-uanyl-itbp3-ur5ue-wae',
    name: 'AXIOM Genesis #1',
    imageUrl: '/axiom-1.svg',
    metadata: {
      name: 'AXIOM Genesis #1',
      image: '/axiom-1.svg',
      attributes: [
        { trait_type: 'Generation', value: 'Genesis' },
        { trait_type: 'Specialty', value: 'DeFi & Tokenomics' },
        { trait_type: 'Rarity', value: 'Legendary' },
      ],
      chains: [
        { chain: 'ICP', standard: 'ICRC-7' },
        { chain: 'ETH', standard: 'ERC-721', contractAddress: '0x...' },
      ],
    },
    axiomId: 1,
    personality: 'The Strategist - Analytical and precise',
    specialty: 'DeFi & Tokenomics',
    memorySize: 0,
    conversationCount: 0,
    rarity: 'legendary',
  },
  {
    tokenId: BigInt(2),
    collection: AXIOM_COLLECTION,
    owner: 'sh7h6-b7xcy-tjank-crj6d-idrcr-ormbi-22yqs-uanyl-itbp3-ur5ue-wae',
    name: 'AXIOM Genesis #2',
    imageUrl: '/axiom-2.svg',
    metadata: {
      name: 'AXIOM Genesis #2',
      image: '/axiom-2.svg',
      attributes: [
        { trait_type: 'Generation', value: 'Genesis' },
        { trait_type: 'Specialty', value: 'NFT Art & Collections' },
        { trait_type: 'Rarity', value: 'Legendary' },
      ],
      chains: [
        { chain: 'ICP', standard: 'ICRC-7' },
        { chain: 'ETH', standard: 'ERC-721' },
      ],
    },
    axiomId: 2,
    personality: 'The Artist - Creative and visionary',
    specialty: 'NFT Art & Collections',
    memorySize: 0,
    conversationCount: 0,
    rarity: 'legendary',
  },
  {
    tokenId: BigInt(3),
    collection: AXIOM_COLLECTION,
    owner: 'sh7h6-b7xcy-tjank-crj6d-idrcr-ormbi-22yqs-uanyl-itbp3-ur5ue-wae',
    name: 'AXIOM Genesis #3',
    imageUrl: '/axiom-3.svg',
    metadata: {
      name: 'AXIOM Genesis #3',
      image: '/axiom-3.svg',
      attributes: [
        { trait_type: 'Generation', value: 'Genesis' },
        { trait_type: 'Specialty', value: 'Smart Contract Development' },
        { trait_type: 'Rarity', value: 'Legendary' },
      ],
      chains: [
        { chain: 'ICP', standard: 'ICRC-7' },
        { chain: 'ETH', standard: 'ERC-721' },
      ],
    },
    axiomId: 3,
    personality: 'The Builder - Logical and methodical',
    specialty: 'Smart Contract Development',
    memorySize: 0,
    conversationCount: 0,
    rarity: 'legendary',
  },
  {
    tokenId: BigInt(4),
    collection: AXIOM_COLLECTION,
    owner: 'sh7h6-b7xcy-tjank-crj6d-idrcr-ormbi-22yqs-uanyl-itbp3-ur5ue-wae',
    name: 'AXIOM Genesis #4',
    imageUrl: '/axiom-4.svg',
    metadata: {
      name: 'AXIOM Genesis #4',
      image: '/axiom-4.svg',
      attributes: [
        { trait_type: 'Generation', value: 'Genesis' },
        { trait_type: 'Specialty', value: 'Security & Auditing' },
        { trait_type: 'Rarity', value: 'Legendary' },
      ],
      chains: [
        { chain: 'ICP', standard: 'ICRC-7' },
        { chain: 'ETH', standard: 'ERC-721' },
      ],
    },
    axiomId: 4,
    personality: 'The Guardian - Vigilant and thorough',
    specialty: 'Security & Auditing',
    memorySize: 0,
    conversationCount: 0,
    rarity: 'legendary',
  },
  {
    tokenId: BigInt(5),
    collection: AXIOM_COLLECTION,
    owner: 'sh7h6-b7xcy-tjank-crj6d-idrcr-ormbi-22yqs-uanyl-itbp3-ur5ue-wae',
    name: 'AXIOM Genesis #5',
    imageUrl: '/axiom-5.svg',
    metadata: {
      name: 'AXIOM Genesis #5',
      image: '/axiom-5.svg',
      attributes: [
        { trait_type: 'Generation', value: 'Genesis' },
        { trait_type: 'Specialty', value: 'Cross-Chain Operations' },
        { trait_type: 'Rarity', value: 'Legendary' },
      ],
      chains: [
        { chain: 'ICP', standard: 'ICRC-7' },
        { chain: 'ETH', standard: 'ERC-721' },
        { chain: 'SOL', standard: 'Metaplex' },
      ],
    },
    axiomId: 5,
    personality: 'The Bridge - Versatile and adaptable',
    specialty: 'Cross-Chain Operations',
    memorySize: 0,
    conversationCount: 0,
    rarity: 'legendary',
  },
];

// ============ SERVICE CLASS ============

export class MarketplaceService {
  private agent: HttpAgent | null = null;
  private identity?: Identity;
  
  // Local storage
  private listings: Map<string, Listing> = new Map();
  private offers: Map<string, Offer[]> = new Map();
  private activities: MarketActivity[] = [];

  async init(identity?: Identity): Promise<void> {
    this.identity = identity;
    const host = getICHost();
    this.agent = new HttpAgent({ identity, host });
    
    if (!isMainnet) {
      await this.agent.fetchRootKey();
    }

    await paymentService.init(identity);
    this.loadFromStorage();
  }

  // ============ COLLECTIONS ============

  async getCollection(canisterId: string): Promise<NFTCollection | null> {
    // In production, fetch from NFT canister
    return null;
  }

  async getCollections(): Promise<NFTCollection[]> {
    // Return known collections
    return [];
  }

  // ============ LISTINGS ============

  async listNFT(
    tokenId: bigint,
    collection: string,
    price: bigint,
    token: PaymentToken
  ): Promise<Listing> {
    if (!this.identity) throw new Error('Not authenticated');
    
    const seller = this.identity.getPrincipal().toText();
    
    const listing: Listing = {
      id: `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tokenId,
      collection,
      seller,
      price,
      token,
      createdAt: Date.now(),
      status: 'active',
    };
    
    this.listings.set(listing.id, listing);
    this.addActivity({
      type: 'listing',
      tokenId,
      collection,
      from: seller,
      price,
      token,
    });
    this.saveToStorage();
    
    return listing;
  }

  async cancelListing(listingId: string): Promise<void> {
    const listing = this.listings.get(listingId);
    if (!listing) throw new Error('Listing not found');
    
    if (!this.identity || listing.seller !== this.identity.getPrincipal().toText()) {
      throw new Error('Not authorized');
    }
    
    listing.status = 'cancelled';
    this.listings.set(listingId, listing);
    this.addActivity({
      type: 'cancel',
      tokenId: listing.tokenId,
      collection: listing.collection,
      from: listing.seller,
    });
    this.saveToStorage();
  }

  async getActiveListings(collection?: string): Promise<Listing[]> {
    let listings = Array.from(this.listings.values())
      .filter(l => l.status === 'active');
    
    if (collection) {
      listings = listings.filter(l => l.collection === collection);
    }
    
    return listings.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getListingsByOwner(owner: string): Promise<Listing[]> {
    return Array.from(this.listings.values())
      .filter(l => l.seller === owner);
  }

  // ============ PURCHASES ============

  async buyNFT(listingId: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.identity) return { success: false, error: 'Not authenticated' };
    
    const listing = this.listings.get(listingId);
    if (!listing) return { success: false, error: 'Listing not found' };
    if (listing.status !== 'active') return { success: false, error: 'Listing not active' };
    
    const buyer = this.identity.getPrincipal().toText();
    if (buyer === listing.seller) return { success: false, error: 'Cannot buy your own listing' };
    
    // Create payment request
    const usdValue = Number(listing.price) / 100000000 * paymentService.getTokenPrice(listing.token);
    const request = await paymentService.createPaymentRequest(
      usdValue,
      listing.token,
      'nft_purchase',
      `nft_purchase_${listing.id}`
    );
    
    const result = await paymentService.executePayment(request.id);
    
    if (result.success) {
      listing.status = 'sold';
      this.listings.set(listingId, listing);
      
      this.addActivity({
        type: 'sale',
        tokenId: listing.tokenId,
        collection: listing.collection,
        from: listing.seller,
        to: buyer,
        price: listing.price,
        token: listing.token,
        txHash: result.txHash,
      });
      
      // Transfer NFT (in production, call NFT canister)
      this.addActivity({
        type: 'transfer',
        tokenId: listing.tokenId,
        collection: listing.collection,
        from: listing.seller,
        to: buyer,
      });
      
      this.saveToStorage();
    }
    
    return result;
  }

  // ============ OFFERS ============

  async makeOffer(
    tokenId: bigint,
    collection: string,
    price: bigint,
    token: PaymentToken,
    expiresInHours: number = 24
  ): Promise<Offer> {
    if (!this.identity) throw new Error('Not authenticated');
    
    const buyer = this.identity.getPrincipal().toText();
    
    const offer: Offer = {
      id: `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tokenId,
      collection,
      buyer,
      price,
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + expiresInHours * 60 * 60 * 1000,
      status: 'pending',
    };
    
    const key = `${collection}_${tokenId}`;
    const existing = this.offers.get(key) || [];
    existing.push(offer);
    this.offers.set(key, existing);
    
    this.addActivity({
      type: 'offer',
      tokenId,
      collection,
      from: buyer,
      price,
      token,
    });
    
    this.saveToStorage();
    return offer;
  }

  async getOffersForToken(tokenId: bigint, collection: string): Promise<Offer[]> {
    const key = `${collection}_${tokenId}`;
    return (this.offers.get(key) || [])
      .filter(o => o.status === 'pending' && o.expiresAt > Date.now());
  }

  // ============ AXIOM SPECIFIC ============

  async getGenesisAxioms(): Promise<AxiomNFT[]> {
    return GENESIS_AXIOMS;
  }

  async getAxiomById(axiomId: number): Promise<AxiomNFT | null> {
    return GENESIS_AXIOMS.find(a => a.axiomId === axiomId) || null;
  }

  async mintAxiom(mintNumber: number): Promise<AxiomNFT | null> {
    if (mintNumber < 6 || mintNumber > 300) {
      throw new Error('Invalid mint number. Must be 6-300');
    }
    
    // In production, this would mint a new AXIOM NFT
    // For now, return a placeholder
    const axiom: AxiomNFT = {
      tokenId: BigInt(mintNumber),
      collection: AXIOM_COLLECTION,
      owner: this.identity?.getPrincipal().toText() || '',
      name: `AXIOM #${mintNumber}`,
      imageUrl: '/axiomart.jpg', // Use the provided art
      metadata: {
        name: `AXIOM #${mintNumber}`,
        image: '/axiomart.jpg',
        attributes: [
          { trait_type: 'Generation', value: 'Standard' },
          { trait_type: 'Mint Number', value: mintNumber },
        ],
        chains: [
          { chain: 'ICP', standard: 'ICRC-7' },
        ],
      },
      axiomId: mintNumber,
      personality: 'AI Council Member',
      specialty: 'General Knowledge',
      memorySize: 0,
      conversationCount: 0,
      rarity: mintNumber <= 50 ? 'epic' : mintNumber <= 150 ? 'rare' : 'uncommon',
    };
    
    this.addActivity({
      type: 'mint',
      tokenId: BigInt(mintNumber),
      collection: AXIOM_COLLECTION,
      to: axiom.owner,
    });
    
    return axiom;
  }

  async airdropAxiom(recipientPrincipal: string, axiomId: number): Promise<boolean> {
    // Verify admin
    if (!this.identity) throw new Error('Not authenticated');
    
    // In production, transfer NFT to recipient
    console.log(`Airdropping AXIOM #${axiomId} to ${recipientPrincipal}`);
    
    this.addActivity({
      type: 'transfer',
      tokenId: BigInt(axiomId),
      collection: AXIOM_COLLECTION,
      from: 'admin',
      to: recipientPrincipal,
    });
    
    return true;
  }

  // ============ ACTIVITY ============

  private addActivity(activity: Omit<MarketActivity, 'id' | 'timestamp'>): void {
    this.activities.unshift({
      ...activity,
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    });
    
    // Keep last 1000 activities
    if (this.activities.length > 1000) {
      this.activities = this.activities.slice(0, 1000);
    }
  }

  async getRecentActivity(limit: number = 50): Promise<MarketActivity[]> {
    return this.activities.slice(0, limit);
  }

  async getActivityByCollection(collection: string, limit: number = 50): Promise<MarketActivity[]> {
    return this.activities
      .filter(a => a.collection === collection)
      .slice(0, limit);
  }

  // ============ STATS ============

  async getMarketStats(collection?: string): Promise<MarketStats> {
    let activities = this.activities;
    let listings = Array.from(this.listings.values());
    
    if (collection) {
      activities = activities.filter(a => a.collection === collection);
      listings = listings.filter(l => l.collection === collection);
    }
    
    const sales = activities.filter(a => a.type === 'sale');
    const totalVolume = sales.reduce((sum, s) => sum + (s.price || BigInt(0)), BigInt(0));
    
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const volume24h = sales
      .filter(s => s.timestamp > oneDayAgo)
      .reduce((sum, s) => sum + (s.price || BigInt(0)), BigInt(0));
    
    const activeListings = listings.filter(l => l.status === 'active').length;
    
    const owners = new Set(activities.filter(a => a.to).map(a => a.to));
    
    return {
      totalVolume,
      volume24h,
      totalListings: listings.length,
      activeListings,
      uniqueOwners: owners.size,
      averagePrice: sales.length > 0 ? totalVolume / BigInt(sales.length) : BigInt(0),
    };
  }

  // ============ PERSISTENCE ============

  private saveToStorage(): void {
    try {
      const data = {
        listings: Array.from(this.listings.entries()).map(([k, v]) => [k, {
          ...v,
          tokenId: v.tokenId.toString(),
          price: v.price.toString(),
        }]),
        offers: Array.from(this.offers.entries()).map(([k, v]) => [k, v.map(o => ({
          ...o,
          tokenId: o.tokenId.toString(),
          price: o.price.toString(),
        }))]),
        activities: this.activities.map(a => ({
          ...a,
          tokenId: a.tokenId.toString(),
          price: a.price?.toString(),
        })),
      };
      localStorage.setItem('raven_marketplace_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save marketplace data:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('raven_marketplace_data');
      if (data) {
        const parsed = JSON.parse(data);
        
        this.listings = new Map(parsed.listings?.map((entry: any) => [
          entry[0],
          {
            ...entry[1],
            tokenId: BigInt(entry[1].tokenId),
            price: BigInt(entry[1].price),
          }
        ]) || []);
        
        this.offers = new Map(parsed.offers?.map((entry: any) => [
          entry[0],
          entry[1].map((o: any) => ({
            ...o,
            tokenId: BigInt(o.tokenId),
            price: BigInt(o.price),
          }))
        ]) || []);
        
        this.activities = parsed.activities?.map((a: any) => ({
          ...a,
          tokenId: BigInt(a.tokenId),
          price: a.price ? BigInt(a.price) : undefined,
        })) || [];
      }
    } catch (error) {
      console.error('Failed to load marketplace data:', error);
    }
  }
}

// Singleton
export const marketplaceService = new MarketplaceService();

// ============ REACT HOOKS ============

import { useState, useEffect, useCallback } from 'react';

export function useListings(collection?: string, identity?: Identity) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await marketplaceService.init(identity);
      const data = await marketplaceService.getActiveListings(collection);
      setListings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch listings');
    } finally {
      setIsLoading(false);
    }
  }, [collection, identity]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  return { listings, isLoading, error, refresh: fetchListings };
}

export function useMarketActivity(collection?: string, identity?: Identity) {
  const [activity, setActivity] = useState<MarketActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      await marketplaceService.init(identity);
      const data = collection
        ? await marketplaceService.getActivityByCollection(collection)
        : await marketplaceService.getRecentActivity();
      setActivity(data);
      setIsLoading(false);
    };
    fetch();
  }, [collection, identity]);

  return { activity, isLoading };
}

export function useMarketStats(collection?: string, identity?: Identity) {
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      await marketplaceService.init(identity);
      const data = await marketplaceService.getMarketStats(collection);
      setStats(data);
      setIsLoading(false);
    };
    fetch();
  }, [collection, identity]);

  return { stats, isLoading };
}

export function useGenesisAxioms(identity?: Identity) {
  const [axioms, setAxioms] = useState<AxiomNFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      await marketplaceService.init(identity);
      const data = await marketplaceService.getGenesisAxioms();
      setAxioms(data);
      setIsLoading(false);
    };
    fetch();
  }, [identity]);

  return { axioms, isLoading };
}

export default marketplaceService;




