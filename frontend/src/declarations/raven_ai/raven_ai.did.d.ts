import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AICouncilConsensus {
  'key_points' : Array<string>,
  'dissenting_views' : Array<string>,
  'final_response' : string,
  'agreement_level' : number,
  'synthesis_method' : string,
  'confidence_score' : number,
}
/**
 * AI Council types
 */
export interface AICouncilModelResponse {
  'model' : string,
  'error' : [] | [string],
  'response' : string,
  'latency_ms' : bigint,
  'success' : boolean,
  'tokens_generated' : [] | [number],
}
export interface AICouncilSession {
  'user_query' : string,
  'context' : Array<ChatMessage>,
  'system_prompt' : [] | [string],
  'total_tokens_used' : number,
  'session_id' : string,
  'responses' : Array<AICouncilModelResponse>,
  'user' : Principal,
  'created_at' : bigint,
  'total_cost_usd' : number,
  'consensus' : [] | [AICouncilConsensus],
  'completed_at' : [] | [bigint],
}
export interface AgentConfig {
  'personality' : string,
  'accessibility_mode' : string,
  'custom_instructions' : string,
  'name' : string,
  'language' : string,
  'voice_enabled' : boolean,
}
export type AgentType = { 'RavenAI' : null } |
  { 'AXIOM' : number };
export interface ArticleComment {
  'id' : bigint,
  'content' : string,
  'edited' : boolean,
  'author' : Principal,
  'likes' : bigint,
  'timestamp' : bigint,
  'article_id' : bigint,
}
export type ArticlePersona = { 'Raven' : null } |
  { 'Macho' : null } |
  { 'Harlee' : null };
export interface AxiomNFT {
  'dedicated_canister' : [] | [Principal],
  'agent' : [] | [RavenAIAgent],
  'token_id' : bigint,
  'owner' : [] | [Principal],
  'minted' : boolean,
  'number' : number,
  'minted_at' : [] | [bigint],
}
export interface ChatMessage {
  'content' : string,
  'role' : string,
  'timestamp' : bigint,
}
/**
 * HALO document processing types
 */
export type CitationFormat = { 'APA' : null } |
  { 'MLA' : null } |
  { 'Chicago' : null } |
  { 'IEEE' : null } |
  { 'Harvard' : null };
export interface Config {
  'llm_providers' : [] | [Array<LLMProviderConfig>],
  'total_agents_minted' : bigint,
  'total_axiom_minted' : number,
  'treasury_principal' : Principal,
  'admins' : Array<Principal>,
  'raven_token_canister' : Principal,
  'next_axiom_number' : number,
  'btc_address' : string,
  'next_token_id' : bigint,
  'paused' : boolean,
}
export interface CrosswordClue {
  'direction' : string,
  'clue' : string,
  'difficulty' : PuzzleDifficulty,
  'answer' : string,
  'number' : number,
}
export interface CrosswordPuzzle {
  'id' : string,
  'theme' : string,
  'title' : string,
  'answers' : Array<[number, number, string]>,
  'difficulty' : PuzzleDifficulty,
  'clues' : Array<CrosswordClue>,
  'grid_size' : number,
  'created_at' : bigint,
  'rewards_harlee' : bigint,
  'rewards_xp' : number,
  'ai_generated' : boolean,
}
export interface GrammarSuggestion {
  'text' : string,
  'suggestion' : string,
  'suggestion_type' : string,
}
export interface HALOOptions {
  'generate_citations' : boolean,
  'check_plagiarism' : boolean,
  'grammar_check' : boolean,
  'rewrite' : boolean,
}
export interface HALOResult {
  'citations_added' : number,
  'works_cited' : Array<string>,
  'grammar_suggestions' : Array<GrammarSuggestion>,
  'plagiarism_check' : [] | [PlagiarismCheckResult],
  'formatted_text' : string,
  'original_text' : string,
}
export interface KnowledgeNode {
  'id' : string,
  'node_type' : string,
  'properties' : Array<[string, string]>,
  'created_at' : bigint,
  'label' : string,
  'connections' : Array<string>,
}
export interface LLMProviderConfig {
  'weight' : number,
  'model' : string,
  'temperature' : number,
  'api_key' : string,
  'api_url' : string,
  'name' : string,
  'enabled' : boolean,
  'max_tokens' : number,
}
export interface MemoryEntry {
  'id' : string,
  'content' : string,
  'memory_type' : string,
  'tags' : Array<string>,
  'importance' : number,
  'timestamp' : bigint,
}
export interface MintResult {
  'token_id' : bigint,
  'payment_amount' : bigint,
  'canister_id' : Principal,
  'mint_number' : number,
  'cycles_allocated' : bigint,
  'payment_token' : PaymentToken,
}
export interface MultichainAddresses {
  'sol_address' : [] | [string],
  'evm_address' : [] | [string],
  'icp_principal' : [] | [string],
  'btc_address' : [] | [string],
}
export interface NewsArticle {
  'id' : bigint,
  'title' : string,
  'featured' : boolean,
  'content' : string,
  'shares' : bigint,
  'harlee_rewards' : bigint,
  'views' : bigint,
  'slug' : string,
  'tags' : Array<string>,
  'published_at' : bigint,
  'seo_title' : string,
  'author_principal' : [] | [Principal],
  'likes' : bigint,
  'seo_keywords' : Array<string>,
  'excerpt' : string,
  'category' : string,
  'seo_description' : string,
  'author_persona' : ArticlePersona,
}
/**
 * Notification types
 */
export type NotificationType = { 'SystemAlert' : null } |
  { 'MorningGreeting' : null } |
  { 'MiddayUpdate' : null } |
  { 'AdminAnnouncement' : null } |
  { 'InterAgentMessage' : null } |
  { 'EveningMessage' : null };
export interface PaymentRecord {
  'id' : string,
  'status' : string,
  'token' : PaymentToken,
  'token_id' : [] | [bigint],
  'created_at' : bigint,
  'usd_value' : number,
  'agent_type' : AgentType,
  'payer' : Principal,
  'tx_hash' : [] | [string],
  'completed_at' : [] | [bigint],
  'amount' : bigint,
}
/**
 * RavenAI Agent NFT Canister Interface
 */
export type PaymentToken = { 'BOB' : null } |
  { 'ICP' : null } |
  { 'NAK' : null } |
  { 'SOL' : null } |
  { 'SUI' : null } |
  { 'MGSN' : null } |
  { 'RAVEN' : null } |
  { 'CkUSDC' : null } |
  { 'CkUSDT' : null } |
  { 'ZOMBIE' : null } |
  { 'CkBTC' : null } |
  { 'CkETH' : null } |
  { 'CkSOL' : null };
export interface PlagiarismCheckResult {
  'matches' : Array<PlagiarismMatch>,
  'plagiarism_percentage' : number,
  'is_plagiarized' : boolean,
}
export interface PlagiarismMatch {
  'matched_text' : string,
  'author' : [] | [string],
  'source_url' : string,
  'source_title' : [] | [string],
  'similarity_score' : number,
  'publish_date' : [] | [string],
}
export type PuzzleDifficulty = { 'Easy' : null } |
  { 'Hard' : null } |
  { 'Medium' : null };
export interface RavenAIAgent {
  'total_memories' : bigint,
  'short_term_memory' : Array<MemoryEntry>,
  'multichain_addresses' : MultichainAddresses,
  'conversation_history' : Array<ChatMessage>,
  'token_id' : bigint,
  'owner' : Principal,
  'metadata' : Array<[string, string]>,
  'canister_id' : [] | [Principal],
  'knowledge_nodes' : Array<KnowledgeNode>,
  'total_interactions' : bigint,
  'created_at' : bigint,
  'last_active' : bigint,
  'agent_type' : AgentType,
  'long_term_memory' : Array<MemoryEntry>,
  'config' : AgentConfig,
}
export interface RavenNotification {
  'id' : number,
  'title' : string,
  'scheduled_for' : [] | [bigint],
  'sent' : boolean,
  'created_at' : bigint,
  'sender' : string,
  'notification_type' : NotificationType,
  'recipients' : Uint32Array | number[],
  'message' : string,
  'sent_at' : [] | [bigint],
}
/**
 * Shared memory for inter-agent learning
 */
export interface SharedMemory {
  'id' : string,
  'content' : string,
  'memory_type' : string,
  'tags' : Array<string>,
  'importance' : number,
  'created_at' : bigint,
  'source_agent' : number,
  'access_count' : bigint,
}
export interface Subscription {
  'plan' : SubscriptionPlan,
  'user' : Principal,
  'payment_history' : Array<string>,
  'is_active' : boolean,
  'expires_at' : [] | [bigint],
  'started_at' : bigint,
}
/**
 * Subscription types
 */
export type SubscriptionPlan = { 'Demo' : null } |
  { 'Lifetime' : null } |
  { 'Monthly' : null } |
  { 'NFTHolder' : null } |
  { 'Yearly' : null };
export interface TokenPrice {
  'decimals' : number,
  'token' : PaymentToken,
  'usd_price' : number,
  'amount_for_100_usd' : bigint,
}
/**
 * Voice synthesis types
 */
export interface VoiceSynthesisRequest {
  'similarity_boost' : [] | [number],
  'text' : string,
  'stability' : [] | [number],
  'voice_id' : [] | [string],
  'model_id' : [] | [string],
}
export interface VoiceSynthesisResponse {
  'audio_data' : Uint8Array | number[],
  'content_type' : string,
}
export interface _SERVICE {
  'add_article_comment' : ActorMethod<
    [bigint, string],
    { 'Ok' : ArticleComment } |
      { 'Err' : string }
  >,
  'add_chat_message' : ActorMethod<
    [bigint, string, string],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  /**
   * Memory Functions
   */
  'add_memory' : ActorMethod<
    [bigint, string, string, number, Array<string>],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'admin_add_principal' : ActorMethod<
    [Principal],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'admin_get_all_notifications' : ActorMethod<
    [number, number],
    Array<RavenNotification>
  >,
  /**
   * Admin Functions
   */
  'admin_pause' : ActorMethod<[boolean], { 'Ok' : null } | { 'Err' : string }>,
  'admin_send_notification' : ActorMethod<
    [string, string, Uint32Array | number[]],
    { 'Ok' : RavenNotification } |
      { 'Err' : string }
  >,
  'admin_set_eleven_labs_api_key' : ActorMethod<
    [string],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'admin_set_llm_api_key' : ActorMethod<
    [string, string],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'admin_upload_axiom_wasm' : ActorMethod<
    [Uint8Array | number[]],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'airdrop_axiom' : ActorMethod<
    [number, Principal],
    { 'Ok' : RavenAIAgent } |
      { 'Err' : string }
  >,
  'chat' : ActorMethod<
    [[] | [bigint], string, [] | [string]],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  /**
   * Subscription Functions
   */
  'check_subscription' : ActorMethod<[Principal], [] | [Subscription]>,
  'confirm_payment' : ActorMethod<
    [string, string],
    { 'Ok' : RavenAIAgent } |
      { 'Err' : string }
  >,
  'create_article' : ActorMethod<
    [
      string,
      string,
      string,
      string,
      ArticlePersona,
      string,
      Array<string>,
      string,
      string,
      Array<string>,
      boolean,
    ],
    { 'Ok' : NewsArticle } |
      { 'Err' : string }
  >,
  'distribute_article_harlee_rewards' : ActorMethod<
    [bigint, Principal, bigint],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  /**
   * Crossword Quest Functions
   */
  'generate_crossword_puzzle' : ActorMethod<
    [string, PuzzleDifficulty],
    { 'Ok' : CrosswordPuzzle } |
      { 'Err' : string }
  >,
  /**
   * Raven News AI Pipeline
   */
  'generate_daily_article' : ActorMethod<
    [ArticlePersona, [] | [string]],
    { 'Ok' : NewsArticle } |
      { 'Err' : string }
  >,
  'get_agent' : ActorMethod<[bigint], [] | [RavenAIAgent]>,
  'get_agents_by_owner' : ActorMethod<[Principal], Array<RavenAIAgent>>,
  'get_article' : ActorMethod<[bigint], [] | [NewsArticle]>,
  'get_article_comments' : ActorMethod<[bigint], Array<ArticleComment>>,
  'get_articles' : ActorMethod<[number, number], Array<NewsArticle>>,
  'get_axiom' : ActorMethod<[number], [] | [AxiomNFT]>,
  'get_axiom_availability' : ActorMethod<
    [],
    [number, number, Uint32Array | number[]]
  >,
  'get_btc_address' : ActorMethod<[], string>,
  'get_collective_stats' : ActorMethod<[], [bigint, bigint, bigint]>,
  /**
   * Query Functions
   */
  'get_config' : ActorMethod<[], Config>,
  'get_conversation_history' : ActorMethod<
    [bigint, number],
    Array<ChatMessage>
  >,
  'get_council_session' : ActorMethod<[string], [] | [AICouncilSession]>,
  'get_crossword_puzzle' : ActorMethod<[string], [] | [CrosswordPuzzle]>,
  'get_llm_providers' : ActorMethod<[], Array<[string, boolean]>>,
  'get_payment' : ActorMethod<[string], [] | [PaymentRecord]>,
  'get_pending_notifications' : ActorMethod<[number], Array<RavenNotification>>,
  'get_recent_crossword_puzzles' : ActorMethod<
    [number],
    Array<CrosswordPuzzle>
  >,
  'get_scheduled_notifications' : ActorMethod<
    [string],
    Array<RavenNotification>
  >,
  'get_subscription_pricing' : ActorMethod<[], Array<[string, bigint]>>,
  'get_token_prices_info' : ActorMethod<[], Array<TokenPrice>>,
  'get_total_supply' : ActorMethod<[], [bigint, number]>,
  'get_user_council_sessions' : ActorMethod<
    [Principal, number],
    Array<AICouncilSession>
  >,
  'health' : ActorMethod<[], string>,
  'increment_article_views' : ActorMethod<
    [bigint],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  /**
   * Notification System
   */
  'init_notification_system' : ActorMethod<
    [],
    { 'Ok' : number } |
      { 'Err' : string }
  >,
  /**
   * Payment & Minting
   */
  'initiate_payment' : ActorMethod<
    [PaymentToken, string, [] | [number]],
    { 'Ok' : PaymentRecord } |
      { 'Err' : string }
  >,
  'like_article' : ActorMethod<
    [bigint],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'like_comment' : ActorMethod<
    [bigint],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'mark_notification_read' : ActorMethod<
    [number, number],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  /**
   * AXIOM NFT Minting Orchestrator
   */
  'mint_axiom_agent' : ActorMethod<
    [PaymentToken, bigint, string],
    { 'Ok' : MintResult } |
      { 'Err' : string }
  >,
  /**
   * HALO document processing
   */
  'process_halo_document' : ActorMethod<
    [Uint8Array | number[], string, CitationFormat, HALOOptions],
    { 'Ok' : HALOResult } |
      { 'Err' : string }
  >,
  'process_scheduled_notifications' : ActorMethod<
    [],
    { 'Ok' : number } |
      { 'Err' : string }
  >,
  'purchase_subscription' : ActorMethod<
    [string, string],
    { 'Ok' : Subscription } |
      { 'Err' : string }
  >,
  /**
   * AI Council & Chat Functions (uses HTTP outcalls)
   */
  'query_ai_council' : ActorMethod<
    [string, [] | [string], Array<ChatMessage>, [] | [bigint]],
    { 'Ok' : AICouncilSession } |
      { 'Err' : string }
  >,
  'query_shared_memories' : ActorMethod<[string, number], Array<SharedMemory>>,
  'recall_memories' : ActorMethod<[bigint, string, number], Array<MemoryEntry>>,
  'regenerate_article' : ActorMethod<
    [bigint, [] | [ArticlePersona], [] | [string]],
    { 'Ok' : NewsArticle } |
      { 'Err' : string }
  >,
  'renew_subscription' : ActorMethod<
    [string],
    { 'Ok' : Subscription } |
      { 'Err' : string }
  >,
  'send_inter_agent_message' : ActorMethod<
    [number, number, string],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'share_article' : ActorMethod<
    [bigint],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  /**
   * Inter-Agent Communication
   */
  'share_memory_to_collective' : ActorMethod<
    [number, string, string, number, Array<string>],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'start_demo' : ActorMethod<[], { 'Ok' : Subscription } | { 'Err' : string }>,
  'sync_agent_learnings' : ActorMethod<
    [number],
    { 'Ok' : number } |
      { 'Err' : string }
  >,
  /**
   * Voice Synthesis (proxied via HTTP outcalls to Eleven Labs)
   */
  'synthesize_voice' : ActorMethod<
    [VoiceSynthesisRequest],
    { 'Ok' : VoiceSynthesisResponse } |
      { 'Err' : string }
  >,
  'top_up_axiom_cycles' : ActorMethod<
    [Principal, PaymentToken, bigint, string],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  /**
   * Transfer Functions
   */
  'transfer_agent' : ActorMethod<
    [bigint, Principal],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'trigger_article_generation' : ActorMethod<
    [ArticlePersona, [] | [string]],
    { 'Ok' : NewsArticle } |
      { 'Err' : string }
  >,
  'update_agent_config' : ActorMethod<
    [bigint, AgentConfig],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'update_multichain_address' : ActorMethod<
    [bigint, string, string],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'upload_axiom_document' : ActorMethod<
    [bigint, string, Uint8Array | number[], string],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'verify_crossword_solution' : ActorMethod<
    [string, Array<[number, number, string]>],
    { 'Ok' : [boolean, bigint, number] } |
      { 'Err' : string }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
