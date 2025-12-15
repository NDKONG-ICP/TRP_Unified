import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface CreateEscrowArgs {
  'load_id' : string,
  'metadata' : string,
  'warehouse' : [] | [Principal],
  'amount' : bigint,
  'driver' : Principal,
}
export interface Escrow {
  'id' : string,
  'shipper' : Principal,
  'status' : EscrowStatus,
  'load_id' : string,
  'updated_at' : bigint,
  'delivery_qr' : string,
  'nft_token_id' : [] | [bigint],
  'metadata' : string,
  'pickup_qr' : string,
  'created_at' : bigint,
  'delivery_confirmed_at' : [] | [bigint],
  'pickup_confirmed_at' : [] | [bigint],
  'warehouse' : [] | [Principal],
  'amount' : bigint,
  'driver' : Principal,
  'platform_fee' : bigint,
}
export interface EscrowConfig {
  'auto_release_delay' : bigint,
  'admin' : Principal,
  'treasury_canister' : Principal,
  'platform_fee_bps' : number,
  'nft_canister' : Principal,
}
export type EscrowStatus = { 'Disputed' : null } |
  { 'InTransit' : null } |
  { 'Refunded' : null } |
  { 'PickupConfirmed' : null } |
  { 'Released' : null } |
  { 'Funded' : null } |
  { 'Cancelled' : null } |
  { 'DeliveryConfirmed' : null } |
  { 'Created' : null };
export interface QRVerification {
  'verified_at' : [] | [bigint],
  'verified_by' : [] | [Principal],
  'verification_type' : string,
  'escrow_id' : string,
  'qr_code' : string,
  'location' : [] | [string],
}
export interface _SERVICE {
  /**
   * Escrow Management
   */
  'create_escrow' : ActorMethod<
    [CreateEscrowArgs],
    { 'Ok' : Escrow } |
      { 'Err' : string }
  >,
  'dispute_escrow' : ActorMethod<
    [string, string],
    { 'Ok' : Escrow } |
      { 'Err' : string }
  >,
  'fund_escrow' : ActorMethod<[string], { 'Ok' : Escrow } | { 'Err' : string }>,
  'get_config' : ActorMethod<[], EscrowConfig>,
  /**
   * Queries
   */
  'get_escrow' : ActorMethod<[string], [] | [Escrow]>,
  'get_escrows_by_status' : ActorMethod<[EscrowStatus], Array<Escrow>>,
  'get_my_escrows' : ActorMethod<[], Array<Escrow>>,
  'health' : ActorMethod<[], string>,
  'release_payment' : ActorMethod<
    [string],
    { 'Ok' : Escrow } |
      { 'Err' : string }
  >,
  /**
   * Admin
   */
  'resolve_dispute' : ActorMethod<
    [string, boolean],
    { 'Ok' : Escrow } |
      { 'Err' : string }
  >,
  'update_config' : ActorMethod<
    [number, Principal, Principal],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'verify_qr' : ActorMethod<
    [string, [] | [string]],
    { 'Ok' : Escrow } |
      { 'Err' : string }
  >,
  'verify_qr_code' : ActorMethod<[string], [] | [QRVerification]>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
