import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Bid {
  'id' : string,
  'eta' : string,
  'status' : string,
  'load_id' : string,
  'created_at' : bigint,
  'message' : string,
  'amount' : bigint,
  'driver' : Principal,
}
export interface Load {
  'id' : string,
  'weight' : string,
  'shipper' : Principal,
  'status' : LoadStatus,
  'updated_at' : bigint,
  'destination' : string,
  'delivery_date' : string,
  'origin' : string,
  'rate' : bigint,
  'description' : string,
  'created_at' : bigint,
  'distance' : string,
  'pickup_date' : string,
  'load_type' : LoadType,
  'assigned_driver' : [] | [Principal],
  'escrow_id' : [] | [string],
}
export type LoadStatus = { 'InTransit' : null } |
  { 'Posted' : null } |
  { 'Delivered' : null } |
  { 'PickedUp' : null } |
  { 'Bidding' : null } |
  { 'Cancelled' : null } |
  { 'Assigned' : null } |
  { 'Completed' : null };
export type LoadType = { 'DryVan' : null } |
  { 'Container' : null } |
  { 'Flatbed' : null } |
  { 'Tanker' : null } |
  { 'Other' : string } |
  { 'Refrigerated' : null };
export interface LogisticsConfig {
  'admin' : Principal,
  'kip_canister' : Principal,
  'escrow_canister' : Principal,
}
export interface PostLoadArgs {
  'weight' : string,
  'destination' : string,
  'delivery_date' : string,
  'origin' : string,
  'rate' : bigint,
  'description' : string,
  'distance' : string,
  'pickup_date' : string,
  'load_type' : LoadType,
}
export interface _SERVICE {
  'accept_bid' : ActorMethod<[string], { 'Ok' : Load } | { 'Err' : string }>,
  'get_available_loads' : ActorMethod<[], Array<Load>>,
  'get_bids_for_load' : ActorMethod<[string], Array<Bid>>,
  'get_config' : ActorMethod<[], LogisticsConfig>,
  /**
   * Queries
   */
  'get_load' : ActorMethod<[string], [] | [Load]>,
  'get_my_bids' : ActorMethod<[], Array<Bid>>,
  'get_my_loads' : ActorMethod<[], Array<Load>>,
  'get_total_loads' : ActorMethod<[], bigint>,
  'health' : ActorMethod<[], string>,
  'place_bid' : ActorMethod<
    [string, bigint, string, string],
    { 'Ok' : Bid } |
      { 'Err' : string }
  >,
  /**
   * Load Management
   */
  'post_load' : ActorMethod<
    [PostLoadArgs],
    { 'Ok' : Load } |
      { 'Err' : string }
  >,
  'update_load_status' : ActorMethod<
    [string, LoadStatus],
    { 'Ok' : Load } |
      { 'Err' : string }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
