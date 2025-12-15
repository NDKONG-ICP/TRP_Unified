// Logistics canister declarations
import type { Principal } from '@dfinity/principal';

// Types
export type LoadStatus = 
  | { 'Posted': null }
  | { 'Bidding': null }
  | { 'Assigned': null }
  | { 'PickedUp': null }
  | { 'InTransit': null }
  | { 'Delivered': null }
  | { 'Completed': null }
  | { 'Cancelled': null };

export type LoadType = 
  | { 'DryVan': null }
  | { 'Refrigerated': null }
  | { 'Flatbed': null }
  | { 'Tanker': null }
  | { 'Container': null }
  | { 'Other': string };

export interface Load {
  id: string;
  shipper: Principal;
  origin: string;
  destination: string;
  pickup_date: string;
  delivery_date: string;
  weight: string;
  load_type: LoadType;
  rate: bigint;
  distance: string;
  description: string;
  status: LoadStatus;
  assigned_driver: [] | [Principal];
  escrow_id: [] | [string];
  created_at: bigint;
  updated_at: bigint;
}

export interface Bid {
  id: string;
  load_id: string;
  driver: Principal;
  amount: bigint;
  message: string;
  eta: string;
  status: string;
  created_at: bigint;
}

export interface PostLoadArgs {
  origin: string;
  destination: string;
  pickup_date: string;
  delivery_date: string;
  weight: string;
  load_type: LoadType;
  rate: bigint;
  distance: string;
  description: string;
}

export interface LogisticsConfig {
  admin: Principal;
  escrow_canister: Principal;
  kip_canister: Principal;
}

export type Result = { 'Ok': Load } | { 'Err': string };
export type Result_1 = { 'Ok': Bid } | { 'Err': string };

export interface _SERVICE {
  // Load Management
  post_load: (arg_0: PostLoadArgs) => Promise<Result>;
  place_bid: (arg_0: string, arg_1: bigint, arg_2: string, arg_3: string) => Promise<Result_1>;
  accept_bid: (arg_0: string) => Promise<Result>;
  update_load_status: (arg_0: string, arg_1: LoadStatus) => Promise<Result>;
  
  // Queries
  get_load: (arg_0: string) => Promise<[] | [Load]>;
  get_available_loads: () => Promise<Load[]>;
  get_my_loads: () => Promise<Load[]>;
  get_bids_for_load: (arg_0: string) => Promise<Bid[]>;
  get_my_bids: () => Promise<Bid[]>;
  get_total_loads: () => Promise<bigint>;
  get_config: () => Promise<LogisticsConfig>;
  health: () => Promise<string>;
}

// IDL Factory
export const idlFactory = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => {
  const LoadStatus = IDL.Variant({
    'Posted': IDL.Null,
    'Bidding': IDL.Null,
    'Assigned': IDL.Null,
    'PickedUp': IDL.Null,
    'InTransit': IDL.Null,
    'Delivered': IDL.Null,
    'Completed': IDL.Null,
    'Cancelled': IDL.Null,
  });
  const LoadType = IDL.Variant({
    'DryVan': IDL.Null,
    'Refrigerated': IDL.Null,
    'Flatbed': IDL.Null,
    'Tanker': IDL.Null,
    'Container': IDL.Null,
    'Other': IDL.Text,
  });
  const Load = IDL.Record({
    'id': IDL.Text,
    'shipper': IDL.Principal,
    'origin': IDL.Text,
    'destination': IDL.Text,
    'pickup_date': IDL.Text,
    'delivery_date': IDL.Text,
    'weight': IDL.Text,
    'load_type': LoadType,
    'rate': IDL.Nat64,
    'distance': IDL.Text,
    'description': IDL.Text,
    'status': LoadStatus,
    'assigned_driver': IDL.Opt(IDL.Principal),
    'escrow_id': IDL.Opt(IDL.Text),
    'created_at': IDL.Nat64,
    'updated_at': IDL.Nat64,
  });
  const Bid = IDL.Record({
    'id': IDL.Text,
    'load_id': IDL.Text,
    'driver': IDL.Principal,
    'amount': IDL.Nat64,
    'message': IDL.Text,
    'eta': IDL.Text,
    'status': IDL.Text,
    'created_at': IDL.Nat64,
  });
  const PostLoadArgs = IDL.Record({
    'origin': IDL.Text,
    'destination': IDL.Text,
    'pickup_date': IDL.Text,
    'delivery_date': IDL.Text,
    'weight': IDL.Text,
    'load_type': LoadType,
    'rate': IDL.Nat64,
    'distance': IDL.Text,
    'description': IDL.Text,
  });
  const LogisticsConfig = IDL.Record({
    'admin': IDL.Principal,
    'escrow_canister': IDL.Principal,
    'kip_canister': IDL.Principal,
  });
  const Result = IDL.Variant({ 'Ok': Load, 'Err': IDL.Text });
  const Result_1 = IDL.Variant({ 'Ok': Bid, 'Err': IDL.Text });

  return IDL.Service({
    'post_load': IDL.Func([PostLoadArgs], [Result], []),
    'place_bid': IDL.Func([IDL.Text, IDL.Nat64, IDL.Text, IDL.Text], [Result_1], []),
    'accept_bid': IDL.Func([IDL.Text], [Result], []),
    'update_load_status': IDL.Func([IDL.Text, LoadStatus], [Result], []),
    'get_load': IDL.Func([IDL.Text], [IDL.Opt(Load)], ['query']),
    'get_available_loads': IDL.Func([], [IDL.Vec(Load)], ['query']),
    'get_my_loads': IDL.Func([], [IDL.Vec(Load)], ['query']),
    'get_bids_for_load': IDL.Func([IDL.Text], [IDL.Vec(Bid)], ['query']),
    'get_my_bids': IDL.Func([], [IDL.Vec(Bid)], ['query']),
    'get_total_loads': IDL.Func([], [IDL.Nat64], ['query']),
    'get_config': IDL.Func([], [LogisticsConfig], ['query']),
    'health': IDL.Func([], [IDL.Text], ['query']),
  });
};

export const init = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => { return []; };





