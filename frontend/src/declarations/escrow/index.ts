// Escrow canister declarations
import type { Principal } from '@dfinity/principal';

// Types
export type EscrowStatus = 
  | { 'Created': null }
  | { 'Funded': null }
  | { 'PickupConfirmed': null }
  | { 'InTransit': null }
  | { 'DeliveryConfirmed': null }
  | { 'Released': null }
  | { 'Disputed': null }
  | { 'Refunded': null }
  | { 'Cancelled': null };

export interface Escrow {
  id: string;
  load_id: string;
  nft_token_id: [] | [bigint];
  shipper: Principal;
  driver: Principal;
  warehouse: [] | [Principal];
  amount: bigint;
  platform_fee: bigint;
  status: EscrowStatus;
  pickup_qr: string;
  delivery_qr: string;
  pickup_confirmed_at: [] | [bigint];
  delivery_confirmed_at: [] | [bigint];
  created_at: bigint;
  updated_at: bigint;
  metadata: string;
}

export interface QRVerification {
  qr_code: string;
  escrow_id: string;
  verification_type: string;
  verified_by: [] | [Principal];
  verified_at: [] | [bigint];
  location: [] | [string];
}

export interface CreateEscrowArgs {
  load_id: string;
  driver: Principal;
  warehouse: [] | [Principal];
  amount: bigint;
  metadata: string;
}

export interface EscrowConfig {
  admin: Principal;
  platform_fee_bps: number;
  treasury_canister: Principal;
  nft_canister: Principal;
  auto_release_delay: bigint;
}

export type Result = { 'Ok': Escrow } | { 'Err': string };
export type Result_1 = { 'Ok': null } | { 'Err': string };

export interface _SERVICE {
  // Escrow Management
  create_escrow: (arg_0: CreateEscrowArgs) => Promise<Result>;
  fund_escrow: (arg_0: string) => Promise<Result>;
  verify_qr: (arg_0: string, arg_1: [] | [string]) => Promise<Result>;
  release_payment: (arg_0: string) => Promise<Result>;
  dispute_escrow: (arg_0: string, arg_1: string) => Promise<Result>;
  
  // Queries
  get_escrow: (arg_0: string) => Promise<[] | [Escrow]>;
  get_my_escrows: () => Promise<Escrow[]>;
  get_escrows_by_status: (arg_0: EscrowStatus) => Promise<Escrow[]>;
  verify_qr_code: (arg_0: string) => Promise<[] | [QRVerification]>;
  get_config: () => Promise<EscrowConfig>;
  
  // Admin
  resolve_dispute: (arg_0: string, arg_1: boolean) => Promise<Result>;
  update_config: (arg_0: number, arg_1: Principal, arg_2: Principal) => Promise<Result_1>;
  health: () => Promise<string>;
}

// IDL Factory
export const idlFactory = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => {
  const EscrowStatus = IDL.Variant({
    'Created': IDL.Null,
    'Funded': IDL.Null,
    'PickupConfirmed': IDL.Null,
    'InTransit': IDL.Null,
    'DeliveryConfirmed': IDL.Null,
    'Released': IDL.Null,
    'Disputed': IDL.Null,
    'Refunded': IDL.Null,
    'Cancelled': IDL.Null,
  });
  const Escrow = IDL.Record({
    'id': IDL.Text,
    'load_id': IDL.Text,
    'nft_token_id': IDL.Opt(IDL.Nat64),
    'shipper': IDL.Principal,
    'driver': IDL.Principal,
    'warehouse': IDL.Opt(IDL.Principal),
    'amount': IDL.Nat64,
    'platform_fee': IDL.Nat64,
    'status': EscrowStatus,
    'pickup_qr': IDL.Text,
    'delivery_qr': IDL.Text,
    'pickup_confirmed_at': IDL.Opt(IDL.Nat64),
    'delivery_confirmed_at': IDL.Opt(IDL.Nat64),
    'created_at': IDL.Nat64,
    'updated_at': IDL.Nat64,
    'metadata': IDL.Text,
  });
  const QRVerification = IDL.Record({
    'qr_code': IDL.Text,
    'escrow_id': IDL.Text,
    'verification_type': IDL.Text,
    'verified_by': IDL.Opt(IDL.Principal),
    'verified_at': IDL.Opt(IDL.Nat64),
    'location': IDL.Opt(IDL.Text),
  });
  const CreateEscrowArgs = IDL.Record({
    'load_id': IDL.Text,
    'driver': IDL.Principal,
    'warehouse': IDL.Opt(IDL.Principal),
    'amount': IDL.Nat64,
    'metadata': IDL.Text,
  });
  const EscrowConfig = IDL.Record({
    'admin': IDL.Principal,
    'platform_fee_bps': IDL.Nat16,
    'treasury_canister': IDL.Principal,
    'nft_canister': IDL.Principal,
    'auto_release_delay': IDL.Nat64,
  });
  const Result = IDL.Variant({ 'Ok': Escrow, 'Err': IDL.Text });
  const Result_1 = IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text });

  return IDL.Service({
    'create_escrow': IDL.Func([CreateEscrowArgs], [Result], []),
    'fund_escrow': IDL.Func([IDL.Text], [Result], []),
    'verify_qr': IDL.Func([IDL.Text, IDL.Opt(IDL.Text)], [Result], []),
    'release_payment': IDL.Func([IDL.Text], [Result], []),
    'dispute_escrow': IDL.Func([IDL.Text, IDL.Text], [Result], []),
    'get_escrow': IDL.Func([IDL.Text], [IDL.Opt(Escrow)], ['query']),
    'get_my_escrows': IDL.Func([], [IDL.Vec(Escrow)], ['query']),
    'get_escrows_by_status': IDL.Func([EscrowStatus], [IDL.Vec(Escrow)], ['query']),
    'verify_qr_code': IDL.Func([IDL.Text], [IDL.Opt(QRVerification)], ['query']),
    'get_config': IDL.Func([], [EscrowConfig], ['query']),
    'resolve_dispute': IDL.Func([IDL.Text, IDL.Bool], [Result], []),
    'update_config': IDL.Func([IDL.Nat16, IDL.Principal, IDL.Principal], [Result_1], []),
    'health': IDL.Func([], [IDL.Text], ['query']),
  });
};

export const init = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => { return []; };





