import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface LeaderboardEntry {
  'total_rewards_earned' : bigint,
  'rank' : number,
  'user' : Principal,
  'total_staked' : number,
}
export interface StakedNFT {
  'multiplier' : number,
  'token_id' : bigint,
  'collection' : string,
  'owner' : Principal,
  'staked_at' : bigint,
  'rarity' : string,
  'last_claim_at' : bigint,
  'pending_rewards' : bigint,
}
export interface _SERVICE {
  'claim_rewards' : ActorMethod<
    [bigint, string],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'distribute_rewards' : ActorMethod<
    [],
    { 'Ok' : number } |
      { 'Err' : string }
  >,
  'get_leaderboard' : ActorMethod<[number], Array<LeaderboardEntry>>,
  'get_pending_rewards' : ActorMethod<[Principal], bigint>,
  'get_staked_nfts' : ActorMethod<[Principal], Array<StakedNFT>>,
  'set_harlee_ledger' : ActorMethod<
    [Principal],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'stake_nft' : ActorMethod<
    [bigint, string],
    { 'Ok' : StakedNFT } |
      { 'Err' : string }
  >,
  'unstake_nft' : ActorMethod<
    [bigint, string],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
