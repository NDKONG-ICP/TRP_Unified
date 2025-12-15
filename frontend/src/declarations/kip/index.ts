// KIP (Know Your Principal) canister declarations
import type { Principal } from '@dfinity/principal';

// Types
export type VerificationStatus = 
  | { 'Pending': null }
  | { 'Approved': null }
  | { 'Rejected': null }
  | { 'Expired': null };

export type DocumentType = 
  | { 'DriversLicense': null }
  | { 'Insurance': null }
  | { 'MCNumber': null }
  | { 'DOTNumber': null }
  | { 'VehicleRegistration': null }
  | { 'ProofOfAddress': null }
  | { 'Other': string };

export interface KIPProfile {
  principal: Principal;
  display_name: string;
  email: [] | [string];
  phone: [] | [string];
  address: [] | [string];
  oisy_wallet_principal: [] | [Principal];
  verification_status: VerificationStatus;
  verified_at: [] | [bigint];
  created_at: bigint;
  updated_at: bigint;
  preferences: Array<[string, string]>;
}

export interface Document {
  id: string;
  owner: Principal;
  doc_type: DocumentType;
  hash: string;
  status: VerificationStatus;
  uploaded_at: bigint;
  reviewed_at: [] | [bigint];
  reviewer: [] | [Principal];
  rejection_reason: [] | [string];
  expires_at: [] | [bigint];
}

export interface KIPConfig {
  admin: Principal;
  verification_required_docs: DocumentType[];
  auto_expire_days: bigint;
}

export type Result = { 'Ok': KIPProfile } | { 'Err': string };
export type Result_1 = { 'Ok': null } | { 'Err': string };
export type Result_2 = { 'Ok': Document } | { 'Err': string };

export interface _SERVICE {
  // Profile Management
  create_profile: (arg_0: string, arg_1: [] | [string]) => Promise<Result>;
  update_profile: (arg_0: [] | [string], arg_1: [] | [string], arg_2: [] | [string], arg_3: [] | [string]) => Promise<Result>;
  set_oisy_wallet: (arg_0: Principal) => Promise<Result_1>;
  set_preference: (arg_0: string, arg_1: string) => Promise<Result_1>;
  get_profile: (arg_0: Principal) => Promise<[] | [KIPProfile]>;
  get_my_profile: () => Promise<[] | [KIPProfile]>;
  
  // Document Management
  upload_document: (arg_0: DocumentType, arg_1: string) => Promise<Result_2>;
  get_document: (arg_0: string) => Promise<[] | [Document]>;
  get_my_documents: () => Promise<Document[]>;
  
  // Admin Functions
  review_document: (arg_0: string, arg_1: boolean, arg_2: [] | [string]) => Promise<Result_2>;
  set_verification_status: (arg_0: Principal, arg_1: VerificationStatus) => Promise<Result_1>;
  get_pending_documents: () => Promise<Document[]>;
  get_config: () => Promise<KIPConfig>;
  
  // Verification
  is_verified: (arg_0: Principal) => Promise<boolean>;
  health: () => Promise<string>;
}

// IDL Factory
export const idlFactory = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => {
  const VerificationStatus = IDL.Variant({
    'Pending': IDL.Null,
    'Approved': IDL.Null,
    'Rejected': IDL.Null,
    'Expired': IDL.Null,
  });
  const DocumentType = IDL.Variant({
    'DriversLicense': IDL.Null,
    'Insurance': IDL.Null,
    'MCNumber': IDL.Null,
    'DOTNumber': IDL.Null,
    'VehicleRegistration': IDL.Null,
    'ProofOfAddress': IDL.Null,
    'Other': IDL.Text,
  });
  const KIPProfile = IDL.Record({
    'principal': IDL.Principal,
    'display_name': IDL.Text,
    'email': IDL.Opt(IDL.Text),
    'phone': IDL.Opt(IDL.Text),
    'address': IDL.Opt(IDL.Text),
    'oisy_wallet_principal': IDL.Opt(IDL.Principal),
    'verification_status': VerificationStatus,
    'verified_at': IDL.Opt(IDL.Nat64),
    'created_at': IDL.Nat64,
    'updated_at': IDL.Nat64,
    'preferences': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
  });
  const Document = IDL.Record({
    'id': IDL.Text,
    'owner': IDL.Principal,
    'doc_type': DocumentType,
    'hash': IDL.Text,
    'status': VerificationStatus,
    'uploaded_at': IDL.Nat64,
    'reviewed_at': IDL.Opt(IDL.Nat64),
    'reviewer': IDL.Opt(IDL.Principal),
    'rejection_reason': IDL.Opt(IDL.Text),
    'expires_at': IDL.Opt(IDL.Nat64),
  });
  const KIPConfig = IDL.Record({
    'admin': IDL.Principal,
    'verification_required_docs': IDL.Vec(DocumentType),
    'auto_expire_days': IDL.Nat64,
  });
  const Result = IDL.Variant({ 'Ok': KIPProfile, 'Err': IDL.Text });
  const Result_1 = IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text });
  const Result_2 = IDL.Variant({ 'Ok': Document, 'Err': IDL.Text });

  return IDL.Service({
    'create_profile': IDL.Func([IDL.Text, IDL.Opt(IDL.Text)], [Result], []),
    'update_profile': IDL.Func([IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)], [Result], []),
    'set_oisy_wallet': IDL.Func([IDL.Principal], [Result_1], []),
    'set_preference': IDL.Func([IDL.Text, IDL.Text], [Result_1], []),
    'get_profile': IDL.Func([IDL.Principal], [IDL.Opt(KIPProfile)], ['query']),
    'get_my_profile': IDL.Func([], [IDL.Opt(KIPProfile)], ['query']),
    'upload_document': IDL.Func([DocumentType, IDL.Text], [Result_2], []),
    'get_document': IDL.Func([IDL.Text], [IDL.Opt(Document)], ['query']),
    'get_my_documents': IDL.Func([], [IDL.Vec(Document)], ['query']),
    'review_document': IDL.Func([IDL.Text, IDL.Bool, IDL.Opt(IDL.Text)], [Result_2], []),
    'set_verification_status': IDL.Func([IDL.Principal, VerificationStatus], [Result_1], []),
    'get_pending_documents': IDL.Func([], [IDL.Vec(Document)], ['query']),
    'get_config': IDL.Func([], [KIPConfig], ['query']),
    'is_verified': IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'health': IDL.Func([], [IDL.Text], ['query']),
  });
};

export const init = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => { return []; };





