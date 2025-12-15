// RavenAI canister declarations
import type { Principal } from '@dfinity/principal';

// Types
export type PaymentToken = 
  | { 'ICP': null }
  | { 'RAVEN': null }
  | { 'CkBTC': null }
  | { 'CkETH': null }
  | { 'CkUSDC': null }
  | { 'CkSOL': null };

export type AgentType = { 'RavenAI': null } | { 'AXIOM': number };

export interface MultichainAddresses {
  icp_principal: [] | [string];
  evm_address: [] | [string];
  btc_address: [] | [string];
  sol_address: [] | [string];
}

export interface MemoryEntry {
  id: string;
  memory_type: string;
  content: string;
  importance: number;
  timestamp: bigint;
  tags: string[];
}

export interface KnowledgeNode {
  id: string;
  label: string;
  node_type: string;
  properties: Array<[string, string]>;
  connections: string[];
  created_at: bigint;
}

export interface ChatMessage {
  role: string;
  content: string;
  timestamp: bigint;
}

export interface AgentConfig {
  name: string;
  personality: string;
  language: string;
  voice_enabled: boolean;
  accessibility_mode: string;
  custom_instructions: string;
}

export interface RavenAIAgent {
  token_id: bigint;
  agent_type: AgentType;
  owner: Principal;
  canister_id: [] | [Principal];
  multichain_addresses: MultichainAddresses;
  config: AgentConfig;
  short_term_memory: MemoryEntry[];
  long_term_memory: MemoryEntry[];
  conversation_history: ChatMessage[];
  knowledge_nodes: KnowledgeNode[];
  total_interactions: bigint;
  total_memories: bigint;
  created_at: bigint;
  last_active: bigint;
  metadata: Array<[string, string]>;
}

export interface AxiomNFT {
  number: number;
  token_id: bigint;
  owner: [] | [Principal];
  minted: boolean;
  minted_at: [] | [bigint];
  dedicated_canister: [] | [Principal];
  agent: [] | [RavenAIAgent];
}

export interface PaymentRecord {
  id: string;
  payer: Principal;
  token: PaymentToken;
  amount: bigint;
  usd_value: number;
  agent_type: AgentType;
  token_id: [] | [bigint];
  status: string;
  tx_hash: [] | [string];
  created_at: bigint;
  completed_at: [] | [bigint];
}

export interface Config {
  admins: Principal[];
  treasury_principal: Principal;
  btc_address: string;
  raven_token_canister: Principal;
  next_token_id: bigint;
  next_axiom_number: number;
  total_agents_minted: bigint;
  total_axiom_minted: number;
  paused: boolean;
}

export interface TokenPrice {
  token: PaymentToken;
  usd_price: number;
  amount_for_100_usd: bigint;
  decimals: number;
}

export type Result = { 'Ok': string } | { 'Err': string };
export type Result_1 = { 'Ok': null } | { 'Err': string };
export type Result_2 = { 'Ok': PaymentRecord } | { 'Err': string };
export type Result_3 = { 'Ok': RavenAIAgent } | { 'Err': string };

export interface _SERVICE {
  // Query Functions
  get_config: () => Promise<Config>;
  get_token_prices_info: () => Promise<TokenPrice[]>;
  get_axiom_availability: () => Promise<[number, number, number[]]>;
  get_agent: (arg_0: bigint) => Promise<[] | [RavenAIAgent]>;
  get_axiom: (arg_0: number) => Promise<[] | [AxiomNFT]>;
  get_agents_by_owner: (arg_0: Principal) => Promise<RavenAIAgent[]>;
  get_payment: (arg_0: string) => Promise<[] | [PaymentRecord]>;
  get_total_supply: () => Promise<[bigint, number]>;
  get_btc_address: () => Promise<string>;
  health: () => Promise<string>;
  
  // Memory Functions
  add_memory: (arg_0: bigint, arg_1: string, arg_2: string, arg_3: number, arg_4: string[]) => Promise<Result>;
  add_chat_message: (arg_0: bigint, arg_1: string, arg_2: string) => Promise<Result_1>;
  update_agent_config: (arg_0: bigint, arg_1: AgentConfig) => Promise<Result_1>;
  get_conversation_history: (arg_0: bigint, arg_1: number) => Promise<ChatMessage[]>;
  recall_memories: (arg_0: bigint, arg_1: string, arg_2: number) => Promise<MemoryEntry[]>;
  
  // Payment & Minting
  initiate_payment: (arg_0: PaymentToken, arg_1: string, arg_2: [] | [number]) => Promise<Result_2>;
  confirm_payment: (arg_0: string, arg_1: string) => Promise<Result_3>;
  
  // Transfer Functions
  transfer_agent: (arg_0: bigint, arg_1: Principal) => Promise<Result_1>;
  update_multichain_address: (arg_0: bigint, arg_1: string, arg_2: string) => Promise<Result_1>;
  
  // Admin Functions
  admin_pause: (arg_0: boolean) => Promise<Result_1>;
  admin_add_principal: (arg_0: Principal) => Promise<Result_1>;
  admin_withdraw_to_treasury: (arg_0: PaymentToken, arg_1: bigint) => Promise<Result>;
}

// IDL Factory
export const idlFactory = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => {
  const PaymentToken = IDL.Variant({
    'ICP': IDL.Null,
    'RAVEN': IDL.Null,
    'CkBTC': IDL.Null,
    'CkETH': IDL.Null,
    'CkUSDC': IDL.Null,
    'CkSOL': IDL.Null,
  });
  const AgentType = IDL.Variant({
    'RavenAI': IDL.Null,
    'AXIOM': IDL.Nat32,
  });
  const MultichainAddresses = IDL.Record({
    'icp_principal': IDL.Opt(IDL.Text),
    'evm_address': IDL.Opt(IDL.Text),
    'btc_address': IDL.Opt(IDL.Text),
    'sol_address': IDL.Opt(IDL.Text),
  });
  const MemoryEntry = IDL.Record({
    'id': IDL.Text,
    'memory_type': IDL.Text,
    'content': IDL.Text,
    'importance': IDL.Float32,
    'timestamp': IDL.Nat64,
    'tags': IDL.Vec(IDL.Text),
  });
  const KnowledgeNode = IDL.Record({
    'id': IDL.Text,
    'label': IDL.Text,
    'node_type': IDL.Text,
    'properties': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'connections': IDL.Vec(IDL.Text),
    'created_at': IDL.Nat64,
  });
  const ChatMessage = IDL.Record({
    'role': IDL.Text,
    'content': IDL.Text,
    'timestamp': IDL.Nat64,
  });
  const AgentConfig = IDL.Record({
    'name': IDL.Text,
    'personality': IDL.Text,
    'language': IDL.Text,
    'voice_enabled': IDL.Bool,
    'accessibility_mode': IDL.Text,
    'custom_instructions': IDL.Text,
  });
  const RavenAIAgent = IDL.Record({
    'token_id': IDL.Nat64,
    'agent_type': AgentType,
    'owner': IDL.Principal,
    'canister_id': IDL.Opt(IDL.Principal),
    'multichain_addresses': MultichainAddresses,
    'config': AgentConfig,
    'short_term_memory': IDL.Vec(MemoryEntry),
    'long_term_memory': IDL.Vec(MemoryEntry),
    'conversation_history': IDL.Vec(ChatMessage),
    'knowledge_nodes': IDL.Vec(KnowledgeNode),
    'total_interactions': IDL.Nat64,
    'total_memories': IDL.Nat64,
    'created_at': IDL.Nat64,
    'last_active': IDL.Nat64,
    'metadata': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
  });
  const AxiomNFT = IDL.Record({
    'number': IDL.Nat32,
    'token_id': IDL.Nat64,
    'owner': IDL.Opt(IDL.Principal),
    'minted': IDL.Bool,
    'minted_at': IDL.Opt(IDL.Nat64),
    'dedicated_canister': IDL.Opt(IDL.Principal),
    'agent': IDL.Opt(RavenAIAgent),
  });
  const PaymentRecord = IDL.Record({
    'id': IDL.Text,
    'payer': IDL.Principal,
    'token': PaymentToken,
    'amount': IDL.Nat64,
    'usd_value': IDL.Float64,
    'agent_type': AgentType,
    'token_id': IDL.Opt(IDL.Nat64),
    'status': IDL.Text,
    'tx_hash': IDL.Opt(IDL.Text),
    'created_at': IDL.Nat64,
    'completed_at': IDL.Opt(IDL.Nat64),
  });
  const Config = IDL.Record({
    'admins': IDL.Vec(IDL.Principal),
    'treasury_principal': IDL.Principal,
    'btc_address': IDL.Text,
    'raven_token_canister': IDL.Principal,
    'next_token_id': IDL.Nat64,
    'next_axiom_number': IDL.Nat32,
    'total_agents_minted': IDL.Nat64,
    'total_axiom_minted': IDL.Nat32,
    'paused': IDL.Bool,
  });
  const TokenPrice = IDL.Record({
    'token': PaymentToken,
    'usd_price': IDL.Float64,
    'amount_for_100_usd': IDL.Nat64,
    'decimals': IDL.Nat8,
  });
  const Result = IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text });
  const Result_1 = IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text });
  const Result_2 = IDL.Variant({ 'Ok': PaymentRecord, 'Err': IDL.Text });
  const Result_3 = IDL.Variant({ 'Ok': RavenAIAgent, 'Err': IDL.Text });

  return IDL.Service({
    'get_config': IDL.Func([], [Config], ['query']),
    'get_token_prices_info': IDL.Func([], [IDL.Vec(TokenPrice)], ['query']),
    'get_axiom_availability': IDL.Func([], [IDL.Nat32, IDL.Nat32, IDL.Vec(IDL.Nat32)], ['query']),
    'get_agent': IDL.Func([IDL.Nat64], [IDL.Opt(RavenAIAgent)], ['query']),
    'get_axiom': IDL.Func([IDL.Nat32], [IDL.Opt(AxiomNFT)], ['query']),
    'get_agents_by_owner': IDL.Func([IDL.Principal], [IDL.Vec(RavenAIAgent)], ['query']),
    'get_payment': IDL.Func([IDL.Text], [IDL.Opt(PaymentRecord)], ['query']),
    'get_total_supply': IDL.Func([], [IDL.Nat64, IDL.Nat32], ['query']),
    'get_btc_address': IDL.Func([], [IDL.Text], ['query']),
    'health': IDL.Func([], [IDL.Text], ['query']),
    'add_memory': IDL.Func([IDL.Nat64, IDL.Text, IDL.Text, IDL.Float32, IDL.Vec(IDL.Text)], [Result], []),
    'add_chat_message': IDL.Func([IDL.Nat64, IDL.Text, IDL.Text], [Result_1], []),
    'update_agent_config': IDL.Func([IDL.Nat64, AgentConfig], [Result_1], []),
    'get_conversation_history': IDL.Func([IDL.Nat64, IDL.Nat32], [IDL.Vec(ChatMessage)], ['query']),
    'recall_memories': IDL.Func([IDL.Nat64, IDL.Text, IDL.Nat32], [IDL.Vec(MemoryEntry)], ['query']),
    'initiate_payment': IDL.Func([PaymentToken, IDL.Text, IDL.Opt(IDL.Nat32)], [Result_2], []),
    'confirm_payment': IDL.Func([IDL.Text, IDL.Text], [Result_3], []),
    'transfer_agent': IDL.Func([IDL.Nat64, IDL.Principal], [Result_1], []),
    'update_multichain_address': IDL.Func([IDL.Nat64, IDL.Text, IDL.Text], [Result_1], []),
    'admin_pause': IDL.Func([IDL.Bool], [Result_1], []),
    'admin_add_principal': IDL.Func([IDL.Principal], [Result_1], []),
    'admin_withdraw_to_treasury': IDL.Func([PaymentToken, IDL.Nat64], [Result], []),
  });
};

export const init = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => { return []; };





