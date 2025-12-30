/**
 * Staking Service - Raven Sk8 Punks NFT Staking
 * Connects to the staking canister for NFT staking and $HARLEE rewards
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';

// Types matching the backend
export interface StakedNFT {
  token_id: bigint;
  collection: string;
  owner: Principal;
  staked_at: bigint;
  last_claim_at: bigint;
  pending_rewards: bigint;
  rarity: string;
  multiplier: number;
}

export interface LeaderboardEntry {
  principal: Principal;
  total_staked: number;
  total_rewards_earned: bigint;
  rank: number;
}

// Staking canister IDL
const stakingIdlFactory = ({ IDL }: { IDL: any }) => {
  const StakedNFT = IDL.Record({
    token_id: IDL.Nat64,
    collection: IDL.Text,
    owner: IDL.Principal,
    staked_at: IDL.Nat64,
    last_claim_at: IDL.Nat64,
    pending_rewards: IDL.Nat64,
    rarity: IDL.Text,
    multiplier: IDL.Float32,
  });

  const LeaderboardEntry = IDL.Record({
    principal: IDL.Principal,
    total_staked: IDL.Nat32,
    total_rewards_earned: IDL.Nat64,
    rank: IDL.Nat32,
  });

  return IDL.Service({
    stake_nft: IDL.Func([IDL.Nat64, IDL.Text], [IDL.Variant({ Ok: StakedNFT, Err: IDL.Text })], []),
    unstake_nft: IDL.Func([IDL.Nat64, IDL.Text], [IDL.Variant({ Ok: IDL.Nat64, Err: IDL.Text })], []),
    claim_rewards: IDL.Func([IDL.Nat64, IDL.Text], [IDL.Variant({ Ok: IDL.Nat64, Err: IDL.Text })], []),
    get_staked_nfts: IDL.Func([IDL.Principal], [IDL.Vec(StakedNFT)], ['query']),
    get_pending_rewards: IDL.Func([IDL.Principal], [IDL.Nat64], ['query']),
    get_leaderboard: IDL.Func([IDL.Nat32], [IDL.Vec(LeaderboardEntry)], ['query']),
    set_harlee_ledger: IDL.Func([IDL.Principal], [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })], []),
    distribute_rewards: IDL.Func([], [IDL.Variant({ Ok: IDL.Nat32, Err: IDL.Text })], []),
  });
};

// Create actor for staking canister
async function createStakingActor(identity: Identity | null): Promise<any> {
  const isLocal = !isMainnet();
  const agent = new HttpAgent({
    identity: identity || undefined,
    host: getICHost(),
  });

  if (isLocal) {
    await agent.fetchRootKey();
  }

  const canisterId = getCanisterId('staking');
  return Actor.createActor(stakingIdlFactory, {
    agent,
    canisterId: Principal.fromText(canisterId),
  });
}

export class StakingService {
  /**
   * Stake an NFT
   */
  static async stakeNFT(tokenId: bigint, collection: string, identity: Identity | null): Promise<StakedNFT> {
    const actor = await createStakingActor(identity);
    const result = await actor.stake_nft(tokenId, collection);
    
    if ('Ok' in result) {
      return result.Ok;
    } else {
      throw new Error(result.Err);
    }
  }

  /**
   * Unstake an NFT
   */
  static async unstakeNFT(tokenId: bigint, collection: string, identity: Identity | null): Promise<bigint> {
    const actor = await createStakingActor(identity);
    const result = await actor.unstake_nft(tokenId, collection);
    
    if ('Ok' in result) {
      return result.Ok;
    } else {
      throw new Error(result.Err);
    }
  }

  /**
   * Claim rewards for a staked NFT
   */
  static async claimRewards(tokenId: bigint, collection: string, identity: Identity | null): Promise<bigint> {
    const actor = await createStakingActor(identity);
    const result = await actor.claim_rewards(tokenId, collection);
    
    if ('Ok' in result) {
      return result.Ok;
    } else {
      throw new Error(result.Err);
    }
  }

  /**
   * Get all staked NFTs for a user
   */
  static async getStakedNFTs(owner: Principal, identity: Identity | null = null): Promise<StakedNFT[]> {
    const actor = await createStakingActor(identity);
    return await actor.get_staked_nfts(owner);
  }

  /**
   * Get pending rewards for a user
   */
  static async getPendingRewards(owner: Principal, identity: Identity | null = null): Promise<bigint> {
    const actor = await createStakingActor(identity);
    return await actor.get_pending_rewards(owner);
  }

  /**
   * Get leaderboard
   */
  static async getLeaderboard(limit: number = 100, identity: Identity | null = null): Promise<LeaderboardEntry[]> {
    const actor = await createStakingActor(identity);
    return await actor.get_leaderboard(limit);
  }
}
