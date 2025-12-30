/**
 * Bitcoin Ordinals Indexer Service
 * Queries and indexes Bitcoin Ordinals inscriptions
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from '../canisterConfig';

export interface InscriptionIndex {
  id: string;
  sat: number;
  blockHeight: number;
  txId: string;
  owner: string;
  contentType: string;
  size: number;
}

export interface SearchFilters {
  owner?: string;
  contentType?: string;
  minSat?: number;
  maxSat?: number;
  limit?: number;
  offset?: number;
}

// IDL Factory for Ordinals Indexer canister
const indexerIdlFactory = ({ IDL }: any) => {
  const InscriptionIndex = IDL.Record({
    id: IDL.Text,
    sat: IDL.Nat64,
    block_height: IDL.Nat32,
    tx_id: IDL.Text,
    owner: IDL.Text,
    content_type: IDL.Text,
    size: IDL.Nat64,
  });
  
  const SearchFilters = IDL.Record({
    owner: IDL.Opt(IDL.Text),
    content_type: IDL.Opt(IDL.Text),
    min_sat: IDL.Opt(IDL.Nat64),
    max_sat: IDL.Opt(IDL.Nat64),
    limit: IDL.Opt(IDL.Nat32),
    offset: IDL.Opt(IDL.Nat32),
  });
  
  return IDL.Service({
    search_inscriptions: IDL.Func([SearchFilters], [IDL.Vec(InscriptionIndex)], ['query']),
    get_inscription_by_sat: IDL.Func([IDL.Nat64], [IDL.Opt(InscriptionIndex)], ['query']),
    get_latest_inscriptions: IDL.Func([IDL.Nat32], [IDL.Vec(InscriptionIndex)], ['query']),
    get_inscription_count: IDL.Func([], [IDL.Nat64], ['query']),
  });
};

/**
 * Create Indexer canister actor
 */
async function createIndexerActor() {
  const host = getICHost();
  const agent = new HttpAgent({ host });
  
  if (!isMainnet()) {
    await agent.fetchRootKey();
  }
  
  const canisterId = getCanisterId('ordinals_canister');
  return Actor.createActor(indexerIdlFactory, {
    agent,
    canisterId: Principal.fromText(canisterId),
  });
}

/**
 * Search inscriptions with filters
 */
export async function searchInscriptions(filters: SearchFilters): Promise<InscriptionIndex[]> {
  try {
    const actor = await createIndexerActor();
    const backendFilters = {
      owner: filters.owner ? [filters.owner] : [],
      content_type: filters.contentType ? [filters.contentType] : [],
      min_sat: filters.minSat ? [BigInt(filters.minSat)] : [],
      max_sat: filters.maxSat ? [BigInt(filters.maxSat)] : [],
      limit: filters.limit ? [filters.limit] : [],
      offset: filters.offset ? [filters.offset] : [],
    };
    
    const results = await (actor as any).search_inscriptions(backendFilters);
    
    return results.map((index: any) => ({
      id: index.id,
      sat: Number(index.sat),
      blockHeight: index.block_height,
      txId: index.tx_id,
      owner: index.owner,
      contentType: index.content_type,
      size: Number(index.size),
    }));
  } catch (error: any) {
    console.error('Error searching inscriptions:', error);
    return [];
  }
}

/**
 * Get inscription by sat number
 */
export async function getInscriptionBySat(sat: number): Promise<InscriptionIndex | null> {
  try {
    const actor = await createIndexerActor();
    const index = await (actor as any).get_inscription_by_sat(BigInt(sat));
    
    if (!index) {
      return null;
    }
    
    return {
      id: index.id,
      sat: Number(index.sat),
      blockHeight: index.block_height,
      txId: index.tx_id,
      owner: index.owner,
      contentType: index.content_type,
      size: Number(index.size),
    };
  } catch (error: any) {
    console.error('Error getting inscription by sat:', error);
    return null;
  }
}

/**
 * Get latest inscriptions
 */
export async function getLatestInscriptions(limit: number = 50): Promise<InscriptionIndex[]> {
  try {
    const actor = await createIndexerActor();
    const results = await (actor as any).get_latest_inscriptions(limit);
    
    return results.map((index: any) => ({
      id: index.id,
      sat: Number(index.sat),
      blockHeight: index.block_height,
      txId: index.tx_id,
      owner: index.owner,
      contentType: index.content_type,
      size: Number(index.size),
    }));
  } catch (error: any) {
    console.error('Error getting latest inscriptions:', error);
    return [];
  }
}

/**
 * Get total inscription count
 */
export async function getInscriptionCount(): Promise<number> {
  try {
    const actor = await createIndexerActor();
    const count = await (actor as any).get_inscription_count();
    return Number(count);
  } catch (error: any) {
    console.error('Error getting inscription count:', error);
    return 0;
  }
}

