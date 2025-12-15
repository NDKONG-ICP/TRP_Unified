import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AxiomConfig {
  'controllers' : Array<string>,
  'system_prompt' : string,
  'temperature' : number,
  'max_memory_entries' : bigint,
  'voice_id' : string,
  'voice_enabled' : boolean,
  'max_conversation_length' : bigint,
}
export interface AxiomMetadata {
  'personality' : string,
  'token_id' : bigint,
  'image_url' : string,
  'owner' : Principal,
  'name' : string,
  'description' : string,
  'created_at' : bigint,
  'last_active' : bigint,
  'specialization' : string,
  'total_messages' : bigint,
  'multichain_metadata' : MultichainMetadata,
  'total_conversations' : bigint,
}
export interface ChatMessage {
  'voice_url' : [] | [string],
  'content' : string,
  'role' : string,
  'timestamp' : bigint,
}
export interface ChatResponse {
  'voice_url' : [] | [string],
  'conversation_id' : bigint,
  'message' : string,
  'timestamp' : bigint,
}
export interface ClaimResult {
  'message' : string,
  'wallet_type' : string,
  'success' : boolean,
  'new_owner' : Principal,
}
export interface Conversation {
  'id' : bigint,
  'messages' : Array<ChatMessage>,
  'user' : Principal,
  'last_message_at' : bigint,
  'summary' : [] | [string],
  'started_at' : bigint,
}
/**
 * HTTP Request/Response types for serving frontend
 */
export interface HttpRequest {
  'url' : string,
  'method' : string,
  'body' : Uint8Array | number[],
  'headers' : Array<[string, string]>,
}
export interface HttpResponse {
  'body' : Uint8Array | number[],
  'headers' : Array<[string, string]>,
  'status_code' : number,
}
export interface InitArgs {
  'personality' : [] | [string],
  'token_id' : bigint,
  'owner' : Principal,
  'name' : string,
  'description' : string,
  'specialization' : [] | [string],
}
export interface MemoryEntry {
  'key' : string,
  'value' : string,
  'importance' : number,
  'created_at' : bigint,
  'last_accessed' : bigint,
  'category' : string,
  'access_count' : bigint,
}
export interface MultichainMetadata {
  /**
   * ["ICRC-7", "ERC-721", "ERC-1155", "SPL", "Metaplex", "Ordinals", "TEP-62", "TEP-64", "Origin-Byte"]
   * Bridge information (for cross-chain transfers via Chain Fusion)
   */
  'bridge_protocol' : [] | [string],
  /**
   * SUI object ID
   */
  'sui_package_id' : [] | [string],
  /**
   * ERC-721 token ID
   */
  'evm_chain_id' : [] | [bigint],
  /**
   * ERC-1155 contract address
   */
  'erc1155_token_id' : [] | [string],
  /**
   * Chain ID (1=Mainnet, 137=Polygon, 56=BNB, etc.)
   */
  'erc1155_contract' : [] | [string],
  /**
   * SUI package ID
   * Standards compliance
   */
  'standards' : Array<string>,
  /**
   * Metaplex edition address
   * Bitcoin (Ordinals, BRC-20, Runes)
   */
  'btc_inscription' : [] | [string],
  /**
   * Bridge protocol name (e.g., "Chain Fusion", "Omnic", "ckBTC")
   */
  'bridge_address' : [] | [string],
  /**
   * Ordinals inscription ID
   */
  'btc_brc20' : [] | [string],
  /**
   * SPL token mint address
   */
  'sol_edition' : [] | [string],
  /**
   * BRC-20 token ticker
   */
  'btc_runes' : [] | [string],
  /**
   * Runes inscription ID
   * TON (TEP-62, TEP-64)
   */
  'ton_collection' : [] | [string],
  /**
   * Internet Computer (Primary)
   */
  'icp_canister' : string,
  /**
   * TON NFT item address
   * SUI (Origin-Byte Protocol)
   */
  'sui_object_id' : [] | [string],
  /**
   * ERC-1155 token ID
   * Solana (SPL/Metaplex)
   */
  'sol_mint' : [] | [string],
  /**
   * ERC-721 contract address
   */
  'eth_token_id' : [] | [string],
  /**
   * TON collection address
   */
  'ton_item' : [] | [string],
  /**
   * Ethereum & EVM Chains (ERC-721, ERC-1155, ERC-721A)
   */
  'eth_contract' : [] | [string],
}
export interface OwnershipStatus {
  'token_id' : bigint,
  'owner' : Principal,
  'can_interact' : boolean,
  'is_owner' : boolean,
  'caller' : Principal,
  'is_controller' : boolean,
}
export interface WalletSupport {
  'supported' : boolean,
  'name' : string,
  'description' : string,
  'wallet_type' : string,
  'claim_method' : string,
}
export interface _SERVICE {
  'add_memory' : ActorMethod<
    [string, string, string, number],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  /**
   * Chat functions
   */
  'chat' : ActorMethod<
    [string, [] | [bigint]],
    { 'Ok' : ChatResponse } |
      { 'Err' : string }
  >,
  'claim_with_internet_identity' : ActorMethod<
    [],
    { 'Ok' : ClaimResult } |
      { 'Err' : string }
  >,
  'claim_with_oisy' : ActorMethod<
    [Principal],
    { 'Ok' : ClaimResult } |
      { 'Err' : string }
  >,
  /**
   * Plug & OISY Wallet Integration
   */
  'claim_with_plug' : ActorMethod<
    [Principal],
    { 'Ok' : ClaimResult } |
      { 'Err' : string }
  >,
  'clear_memories' : ActorMethod<[], { 'Ok' : bigint } | { 'Err' : string }>,
  'get_config' : ActorMethod<[], AxiomConfig>,
  'get_conversation' : ActorMethod<[bigint], [] | [Conversation]>,
  'get_conversations' : ActorMethod<[Principal], Array<Conversation>>,
  'get_memories' : ActorMethod<[], Array<MemoryEntry>>,
  /**
   * Query functions
   */
  'get_metadata' : ActorMethod<[], AxiomMetadata>,
  'get_multichain_metadata' : ActorMethod<[], MultichainMetadata>,
  'get_supported_wallets' : ActorMethod<[], Array<WalletSupport>>,
  /**
   * Health check
   */
  'health' : ActorMethod<[], string>,
  /**
   * HTTP Request handling for serving frontend
   */
  'http_request' : ActorMethod<[HttpRequest], HttpResponse>,
  'http_update' : ActorMethod<[HttpRequest], HttpResponse>,
  /**
   * Owner/Controller functions
   */
  'transfer_ownership' : ActorMethod<
    [Principal],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'update_config' : ActorMethod<
    [[] | [boolean], [] | [string], [] | [string], [] | [number]],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  /**
   * Update multichain metadata for cross-chain NFT support
   * Supports: ETH/EVM (ERC-721, ERC-1155, ERC-721A), Solana (SPL/Metaplex),
   * Bitcoin (Ordinals, BRC-20, Runes), TON (TEP-62, TEP-64), SUI (Origin-Byte)
   * Reference: https://github.com/dfinity/awesome-internet-computer#chain-fusion
   */
  'update_multichain_metadata' : ActorMethod<
    [
      [] | [string],
      [] | [string],
      [] | [bigint],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
    ],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'update_token_info' : ActorMethod<
    [bigint, [] | [string]],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'verify_ownership' : ActorMethod<[], OwnershipStatus>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
