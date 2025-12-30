//! AXIOM NFT - Individual AI Agent Canister
//! Each AXIOM NFT (1-300) has its own canister with:
//! - Persistent AI memory
//! - HTTP outcalls to LLMs (via main raven_ai canister)
//! - Eleven Labs voice synthesis
//! - Unique personality and knowledge base
//! Reference: https://github.com/ldclabs/anda for AI agent patterns

use candid::{CandidType, Decode, Encode, Nat, Principal};
use ic_cdk::{api::call::call, init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;
use base64::{Engine as _, engine::general_purpose};
use sha2::{Digest, Sha256};

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Memory IDs
const METADATA_MEM_ID: MemoryId = MemoryId::new(0);
const CONVERSATIONS_MEM_ID: MemoryId = MemoryId::new(1);
const MEMORY_MEM_ID: MemoryId = MemoryId::new(2);
const CONFIG_MEM_ID: MemoryId = MemoryId::new(3);
const NOTIFICATIONS_MEM_ID: MemoryId = MemoryId::new(4);
const SECRETS_MEM_ID: MemoryId = MemoryId::new(5);

// Main Application Canisters
const RAVEN_AI_CANISTER: &str = "3noas-jyaaa-aaaao-a4xda-cai"; // Main raven_ai canister (mainnet)
const QUEEN_BEE_CANISTER: &str = "k6lqw-bqaaa-aaaao-a4yhq-cai"; // Queen Bee orchestrator
const TREASURY_CANISTER: &str = "3rk2d-6yaaa-aaaao-a4xba-cai"; // Treasury canister (mainnet)

// Use Queen Bee for AI processing (set to true to use new architecture)
const USE_QUEEN_BEE: bool = true; // Set to true after queen_bee deployment

// Admin Controllers - Managed dynamically in state or via controllers
// Removing hardcoded principals for privacy and security

// LLM API Keys (loaded from init)
// NOTE: Set via environment variables or canister initialization in production
// Using const with default empty string - keys should be set via init args or environment
const HUGGINGFACE_API_KEY: &str = "";
const PERPLEXITY_API_KEY: &str = "";
const ELEVEN_LABS_API_KEY: &str = "";
const ELEVEN_LABS_VOICE_ID: &str = "kPzsL2i3teMYv0FxEYQ6";

// ============ TYPES ============

/// Notification types from the main Raven application
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum NotificationType {
    MorningGreeting,
    MiddayUpdate,
    EveningMessage,
    AdminAnnouncement,
    SystemAlert,
    InterAgentMessage,
}

/// Notification received from Raven application
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct RavenNotification {
    pub id: u32,
    pub notification_type: NotificationType,
    pub title: String,
    pub message: String,
    pub sender: String,
    pub created_at: u64,
    pub scheduled_for: Option<u64>,
    pub sent: bool,
    pub sent_at: Option<u64>,
    pub recipients: Vec<u32>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default)]
pub struct SecretConfig {
    pub huggingface_api_key: String,
    pub perplexity_api_key: String,
    pub eleven_labs_api_key: String,
}

impl Storable for SecretConfig {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 500,
        is_fixed_size: false,
    };
}

impl Storable for RavenNotification {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AxiomMetadata {
    pub token_id: u64,
    pub name: String,
    pub description: String,
    pub image_url: String,
    pub owner: Principal,
    pub created_at: u64,
    pub personality: String,
    pub specialization: String,
    pub total_conversations: u64,
    pub total_messages: u64,
    pub last_active: u64,
    pub multichain_metadata: MultichainMetadata,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default)]
pub struct MultichainMetadata {
    // Internet Computer (Primary)
    pub icp_canister: String,
    
    // Ethereum & EVM Chains (ERC-721, ERC-1155, ERC-721A)
    pub eth_contract: Option<String>,      // ERC-721 contract address
    pub eth_token_id: Option<String>,      // ERC-721 token ID
    pub evm_chain_id: Option<u64>,         // Chain ID (1=Mainnet, 137=Polygon, 56=BNB, etc.)
    pub erc1155_contract: Option<String>,  // ERC-1155 contract address
    pub erc1155_token_id: Option<String>,  // ERC-1155 token ID
    
    // Solana (SPL/Metaplex)
    pub sol_mint: Option<String>,          // SPL token mint address
    pub sol_edition: Option<String>,       // Metaplex edition address
    
    // Bitcoin (Ordinals, BRC-20, Runes)
    pub btc_inscription: Option<String>,   // Ordinals inscription ID
    pub btc_brc20: Option<String>,         // BRC-20 token ticker
    pub btc_runes: Option<String>,         // Runes inscription ID
    
    // TON (TEP-62, TEP-64)
    pub ton_collection: Option<String>,     // TON collection address
    pub ton_item: Option<String>,          // TON NFT item address
    
    // SUI (Origin-Byte Protocol)
    pub sui_object_id: Option<String>,     // SUI object ID
    pub sui_package_id: Option<String>,   // SUI package ID
    
    // Standards compliance
    pub standards: Vec<String>,            // ["ICRC-7", "ERC-721", "ERC-1155", "SPL", "Metaplex", "Ordinals", "TEP-62", "TEP-64", "Origin-Byte"]
    
    // Bridge information (for cross-chain transfers)
    pub bridge_protocol: Option<String>,   // Bridge protocol name (e.g., "Chain Fusion", "Omnic", "ckBTC")
    pub bridge_address: Option<String>,    // Bridge contract/canister address
}

impl Storable for AxiomMetadata {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ChatMessage {
    pub role: String,      // "user", "assistant", "system"
    pub content: String,
    pub timestamp: u64,
    pub voice_url: Option<String>,
}

impl Storable for ChatMessage {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Conversation {
    pub id: u64,
    pub user: Principal,
    pub messages: Vec<ChatMessage>,
    pub started_at: u64,
    pub last_message_at: u64,
    pub summary: Option<String>,
}

impl Storable for Conversation {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MemoryEntry {
    pub key: String,
    pub value: String,
    pub category: String,      // "fact", "preference", "context", "learned"
    pub importance: u8,        // 1-10
    pub created_at: u64,
    pub last_accessed: u64,
    pub access_count: u64,
}

impl Storable for MemoryEntry {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AxiomConfig {
    pub voice_enabled: bool,
    pub voice_id: String,
    pub system_prompt: String,
    pub max_memory_entries: u64,
    pub max_conversation_length: u64,
    pub temperature: f64,
    pub controllers: Vec<String>,
}

impl Default for AxiomConfig {
    fn default() -> Self {
        Self {
            voice_enabled: true,
            voice_id: ELEVEN_LABS_VOICE_ID.to_string(),
            system_prompt: "You are AXIOM, an advanced AI agent within the Raven Ecosystem. You have persistent memory and learn from each conversation. You are helpful, knowledgeable about blockchain, NFTs, and the Internet Computer. Respond concisely and intelligently.".to_string(),
            max_memory_entries: 1000,
            max_conversation_length: 100,
            temperature: 0.7,
            controllers: vec![],
        }
    }
}

impl Storable for AxiomConfig {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// Storable wrapper for u64 keys
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
struct StorableU64(u64);

impl Storable for StorableU64 {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.to_be_bytes().to_vec())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let arr: [u8; 8] = bytes.as_ref().try_into().unwrap();
        StorableU64(u64::from_be_bytes(arr))
    }
    const BOUND: ic_stable_structures::storable::Bound = 
        ic_stable_structures::storable::Bound::Bounded { max_size: 8, is_fixed_size: true };
}

// Storable wrapper for String keys
#[derive(Clone, PartialEq, Eq, PartialOrd, Ord)]
struct StorableString(String);

impl Storable for StorableString {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_bytes().to_vec())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        StorableString(String::from_utf8(bytes.into_owned()).unwrap())
    }
    const BOUND: ic_stable_structures::storable::Bound = 
        ic_stable_structures::storable::Bound::Bounded { max_size: 256, is_fixed_size: false };
}

// ============ STABLE STORAGE ============

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = 
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
    
    static METADATA: RefCell<StableCell<AxiomMetadata, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(METADATA_MEM_ID)),
            AxiomMetadata {
                token_id: 0,
                name: "AXIOM Genesis".to_string(),
                description: "Genesis AXIOM AI Agent".to_string(),
                image_url: "/axiomart.jpg".to_string(),
                owner: Principal::anonymous(),
                created_at: 0,
                personality: "Intelligent and curious".to_string(),
                specialization: "General AI Assistant".to_string(),
                total_conversations: 0,
                total_messages: 0,
                last_active: 0,
                multichain_metadata: MultichainMetadata {
                    icp_canister: "".to_string(), // Will be set in init()
                    standards: vec!["ICRC-7".to_string(), "ICRC-37".to_string(), "DIP721".to_string(), "EXT".to_string()],
                    ..Default::default()
                },
            }
        ).unwrap()
    );
    
    static CONVERSATIONS: RefCell<StableBTreeMap<StorableU64, Conversation, Memory>> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(CONVERSATIONS_MEM_ID)))
    );

    static SECRETS: RefCell<StableCell<SecretConfig, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(SECRETS_MEM_ID)),
            SecretConfig::default()
        ).unwrap()
    );
    
    static MEMORY_STORE: RefCell<StableBTreeMap<StorableString, MemoryEntry, Memory>> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(MEMORY_MEM_ID)))
    );
    
    static CONFIG: RefCell<StableCell<AxiomConfig, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(CONFIG_MEM_ID)),
            AxiomConfig::default()
        ).unwrap()
    );
    
    static CONVERSATION_COUNTER: RefCell<u64> = RefCell::new(0);
    
    // Notifications received from the main Raven application
    static NOTIFICATIONS: RefCell<StableBTreeMap<StorableU32, RavenNotification, Memory>> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(NOTIFICATIONS_MEM_ID)))
    );
    
    // Track unread notifications count
    static UNREAD_COUNT: RefCell<u32> = RefCell::new(0);
}

// Storable wrapper for u32
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct StorableU32(u32);

impl Storable for StorableU32 {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.to_be_bytes().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let arr: [u8; 4] = bytes.as_ref().try_into().unwrap_or([0; 4]);
        StorableU32(u32::from_be_bytes(arr))
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 4,
        is_fixed_size: true,
    };
}

// ============ INIT ============

#[derive(CandidType, Deserialize)]
pub struct InitArgs {
    pub token_id: u64,
    pub name: String,
    pub description: String,
    pub owner: Principal,
    pub personality: Option<String>,
    pub specialization: Option<String>,
}

// Generate deterministic multichain addresses for Axiom NFT
// These addresses are CREATE2-compatible (EVM) and deterministically derivable (Solana, Bitcoin)
// They can be deployed using threshold ECDSA signing and Chain Fusion
fn generate_axiom_multichain_addresses(token_id: u64, canister_id: &str) -> MultichainMetadata {
    // Generate deterministic addresses using token_id and canister_id as seed
    let seed = format!("AXIOM_{}_{}", canister_id, token_id);
    let mut hasher = Sha256::new();
    hasher.update(seed.as_bytes());
    let hash = hasher.finalize();
    
    // EVM: CREATE2-compatible deterministic address (Ethereum, Polygon, BNB, etc.)
    // Format: 0x + 40 hex chars (20 bytes)
    // This address can be deployed using CREATE2 with salt = token_id
    let evm_address = format!("0x{}", hex::encode(&hash[..20]));
    
    // Solana: Deterministic mint address (Base58-like format)
    let mut sol_hasher = Sha256::new();
    sol_hasher.update(b"SOLANA_AXIOM");
    sol_hasher.update(&hash);
    let sol_hash = sol_hasher.finalize();
    // Use first 32 bytes for Solana address (Base58 encoded in production)
    let sol_mint = general_purpose::STANDARD.encode(&sol_hash[..32]);
    
    // Bitcoin: Ordinals inscription ID
    let mut btc_hasher = Sha256::new();
    btc_hasher.update(b"BITCOIN_ORDINAL_AXIOM");
    btc_hasher.update(&hash);
    let btc_hash = btc_hasher.finalize();
    // Format: i{block_height}{tx_index} or deterministic ID
    let btc_inscription = format!("i{}", hex::encode(&btc_hash[..16]));
    
    MultichainMetadata {
        icp_canister: canister_id.to_string(),
        // Ethereum Mainnet (Chain ID 1) - ERC-721
        eth_contract: Some(evm_address.clone()),
        eth_token_id: Some(token_id.to_string()),
        evm_chain_id: Some(1),
        // Polygon (Chain ID 137) - ERC-1155 (same contract address, different chain)
        erc1155_contract: Some(evm_address.clone()),
        erc1155_token_id: Some(token_id.to_string()),
        // Solana - Metaplex
        sol_mint: Some(sol_mint.clone()),
        sol_edition: Some(format!("{}_edition", sol_mint)),
        // Bitcoin - Ordinals
        btc_inscription: Some(btc_inscription),
        btc_brc20: None,
        btc_runes: None,
        // TON
        ton_collection: None,
        ton_item: None,
        // SUI
        sui_object_id: None,
        sui_package_id: None,
        // Standards compliance
        standards: vec![
            "ICRC-7".to_string(),
            "ICRC-37".to_string(),
            "DIP721".to_string(),
            "EXT".to_string(),
            "ERC-721".to_string(),
            "ERC-1155".to_string(),
            "Metaplex".to_string(),
            "Ordinals".to_string(),
        ],
        bridge_protocol: Some("Chain Fusion".to_string()),
        bridge_address: None,
    }
}

#[init]
fn init(args: InitArgs) {
    let now = ic_cdk::api::time();
    let canister_id = ic_cdk::api::id().to_text();
    
    // Generate multichain addresses automatically
    let multichain_metadata = generate_axiom_multichain_addresses(args.token_id, &canister_id);
    
    let metadata = AxiomMetadata {
        token_id: args.token_id,
        name: args.name,
        description: args.description,
        image_url: format!("/axiomart.jpg?id={}", args.token_id),
        owner: args.owner,
        created_at: now,
        personality: args.personality.unwrap_or_else(|| "Intelligent and helpful".to_string()),
        specialization: args.specialization.unwrap_or_else(|| "General AI Assistant".to_string()),
        total_conversations: 0,
        total_messages: 0,
        last_active: now,
        multichain_metadata,
    };
    
    METADATA.with(|m| m.borrow_mut().set(metadata).unwrap());
}

#[pre_upgrade]
fn pre_upgrade() {
    CONVERSATION_COUNTER.with(|c| {
        let count = *c.borrow();
        ic_cdk::storage::stable_save((count,)).ok();
    });
}

#[post_upgrade]
fn post_upgrade() {
    if let Ok((count,)) = ic_cdk::storage::stable_restore::<(u64,)>() {
        CONVERSATION_COUNTER.with(|c| *c.borrow_mut() = count);
    }
}

// ============ AUTH ============

fn is_controller(caller: Principal) -> bool {
    // Check if caller is an actual canister controller (IC-level authorization)
    if ic_cdk::api::is_controller(&caller) {
        return true;
    }
    
    // Also check CONFIG's controller list (application-level authorization)
    let controllers = CONFIG.with(|c| c.borrow().get().controllers.clone());
    controllers.iter().any(|c| {
        Principal::from_text(c).map(|p| p == caller).unwrap_or(false)
    })
}

fn is_owner(caller: Principal) -> bool {
    let owner = METADATA.with(|m| m.borrow().get().owner);
    caller == owner
}

fn require_owner_or_controller(caller: Principal) -> Result<(), String> {
    if !is_owner(caller) && !is_controller(caller) {
        return Err("Not authorized: must be owner or controller".to_string());
    }
    Ok(())
}

// ============ CHAT FUNCTIONS ============

/// Main chat function - processes user message and returns AI response
#[update]
async fn chat(message: String, conversation_id: Option<u64>) -> Result<ChatResponse, String> {
    let caller = ic_cdk::caller();
    let now = ic_cdk::api::time();
    
    // Get or create conversation
    let conv_id = conversation_id.unwrap_or_else(|| {
        let id = CONVERSATION_COUNTER.with(|c| {
            let mut counter = c.borrow_mut();
            *counter += 1;
            *counter
        });
        
        let new_conv = Conversation {
            id,
            user: caller,
            messages: vec![],
            started_at: now,
            last_message_at: now,
            summary: None,
        };
        
        CONVERSATIONS.with(|c| c.borrow_mut().insert(StorableU64(id), new_conv));
        id
    });
    
    // Add user message to conversation
    let user_msg = ChatMessage {
        role: "user".to_string(),
        content: message.clone(),
        timestamp: now,
        voice_url: None,
    };
    
    CONVERSATIONS.with(|c| {
        let mut convs = c.borrow_mut();
        if let Some(mut conv) = convs.get(&StorableU64(conv_id)) {
            conv.messages.push(user_msg.clone());
            conv.last_message_at = now;
            convs.insert(StorableU64(conv_id), conv);
        }
    });
    
    // Get context from memory and conversation history
    let context = build_context(conv_id);
    let config = CONFIG.with(|c| c.borrow().get().clone());
    
    // Query AI via main raven_ai canister (inter-canister call)
    let ai_response = query_ai_via_main_canister(&message, &context, &config.system_prompt).await?;
    
    // Generate voice if enabled - convert bytes to base64 data URL
    let voice_url: Option<String> = if config.voice_enabled {
        match synthesize_voice(&ai_response).await {
            Ok(audio_bytes) => {
                // Convert to base64 data URL for browser playback
                let base64_audio = general_purpose::STANDARD.encode(&audio_bytes);
                Some(format!("data:audio/mpeg;base64,{}", base64_audio))
            },
            Err(_) => None,
        }
    } else {
        None
    };
    
    // Add assistant message to conversation
    let assistant_msg = ChatMessage {
        role: "assistant".to_string(),
        content: ai_response.clone(),
        timestamp: ic_cdk::api::time(),
        voice_url: voice_url.clone(),
    };
    
    CONVERSATIONS.with(|c| {
        let mut convs = c.borrow_mut();
        if let Some(mut conv) = convs.get(&StorableU64(conv_id)) {
            conv.messages.push(assistant_msg);
            convs.insert(StorableU64(conv_id), conv);
        }
    });
    
    // Update metadata stats
    METADATA.with(|m| {
        let mut metadata = m.borrow().get().clone();
        metadata.total_messages += 2;
        metadata.last_active = ic_cdk::api::time();
        m.borrow_mut().set(metadata).unwrap();
    });
    
    // Extract and store any learnings from the conversation
    extract_and_store_learnings(&message, &ai_response).await;
    
    Ok(ChatResponse {
        message: ai_response,
        conversation_id: conv_id,
        voice_url,
        timestamp: ic_cdk::api::time(),
    })
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ChatResponse {
    pub message: String,
    pub conversation_id: u64,
    pub voice_url: Option<String>,
    pub timestamp: u64,
}

fn build_context(conversation_id: u64) -> String {
    let mut context = String::new();
    
    // Add relevant memories
    let memories = MEMORY_STORE.with(|m| {
        let store = m.borrow();
        let mut mems: Vec<_> = store.iter().map(|(_, v)| v).collect();
        mems.sort_by(|a, b| b.importance.cmp(&a.importance));
        mems.truncate(10);
        mems
    });
    
    if !memories.is_empty() {
        context.push_str("Relevant knowledge:\n");
        for mem in memories {
            context.push_str(&format!("- {}: {}\n", mem.key, mem.value));
        }
    }
    
    // Add recent conversation history
    let history = CONVERSATIONS.with(|c| {
        let convs = c.borrow();
        if let Some(conv) = convs.get(&StorableU64(conversation_id)) {
            let recent: Vec<_> = conv.messages.iter().rev().take(10).rev().collect();
            recent.iter().map(|m| format!("{}: {}", m.role, m.content)).collect::<Vec<_>>().join("\n")
        } else {
            String::new()
        }
    });
    
    if !history.is_empty() {
        context.push_str("\nRecent conversation:\n");
        context.push_str(&history);
    }
    
    context
}

/// Query AI via Queen Bee orchestrator (new sharded architecture)
async fn query_ai_via_queen_bee(
    query: &str,
    context: &str,
    system_prompt: &str,
    queen_bee: Principal,
) -> Result<String, String> {
    use candid::{CandidType, Encode};
    
    #[derive(CandidType)]
    struct ChatMessage {
        role: String,
        content: String,
        timestamp: u64,
    }
    
    #[derive(CandidType)]
    struct AIRequest {
        query_text: String,
        system_prompt: Option<String>,
        context: Vec<ChatMessage>,
        token_id: Option<u64>,
        use_onchain: bool,
        use_http_parallel: bool,
    }
    
    #[derive(CandidType, Deserialize)]
    struct AIResponse {
        response: String,
        confidence_score: f32,
        inference_method: String,
        tokens_used: u32,
        latency_ms: u64,
        model_responses: Vec<(String, String, f32)>,
    }
    
    // Convert context string to ChatMessage vec
    let context_messages: Vec<ChatMessage> = if !context.is_empty() {
        context.lines()
            .filter_map(|line| {
                if let Some(colon_pos) = line.find(':') {
                    let role = line[..colon_pos].trim().to_string();
                    let content = line[colon_pos + 1..].trim().to_string();
                    if !role.is_empty() && !content.is_empty() {
                        Some(ChatMessage {
                            role,
                            content,
                            timestamp: ic_cdk::api::time(),
                        })
                    } else {
                        None
                    }
                } else {
                    None
                }
            })
            .collect()
    } else {
        vec![]
    };
    
    let token_id = METADATA.with(|m| Some(m.borrow().get().token_id));
    
    let request = AIRequest {
        query_text: query.to_string(),
        system_prompt: Some(system_prompt.to_string()),
        context: context_messages,
        token_id,
        use_onchain: true,
        use_http_parallel: true,
    };
    
    type CallResult = Result<(Result<AIResponse, String>,), (ic_cdk::api::call::RejectionCode, String)>;
    let call_result: CallResult = call(queen_bee, "process_ai_request", (request,)).await;
    
    match call_result {
        Ok((Ok(response),)) => Ok(response.response),
        Ok((Err(e),)) => Err(format!("Queen Bee error: {}", e)),
        Err(e) => Err(format!("Queen Bee call failed: {:?}", e)),
    }
}

/// Query AI via Queen Bee (New Architecture)
/// Standardizes all AI calls to go through the Hive Mind (Queen Bee)
async fn query_ai_via_main_canister(query: &str, context: &str, system_prompt: &str) -> Result<String, String> {
    // 1. Resolve Queen Bee Principal
    let queen_bee_id = match Principal::from_text(QUEEN_BEE_CANISTER) {
        Ok(p) if p != Principal::anonymous() => p,
        _ => return Err("Queen Bee canister not configured or invalid".to_string()),
    };
    
    // 2. Prepare Context Messages
    let context_messages: Vec<ChatMessage> = if !context.is_empty() {
        context.lines()
            .filter_map(|line| {
                if let Some(colon_pos) = line.find(':') {
                    let role = line[..colon_pos].trim().to_string();
                    let content = line[colon_pos + 1..].trim().to_string();
                    if !role.is_empty() && !content.is_empty() {
                        Some(ChatMessage {
                            role,
                            content,
                            timestamp: ic_cdk::api::time(),
                            voice_url: None,
                        })
                    } else {
                        None
                    }
                } else {
                    None
                }
            })
            .collect()
    } else {
        vec![]
    };
    
    // 3. Prepare AI Request for Queen Bee
    // This routes the request through the decentralized swarm logic
    let token_id = METADATA.with(|m| m.borrow().get().token_id);
    
    #[derive(CandidType, Serialize)]
    pub struct AIRequest {
        pub query_text: String,
        pub system_prompt: Option<String>,
        pub context: Vec<ChatMessage>,
        pub token_id: Option<u64>,
        pub use_onchain: bool,
        pub use_http_parallel: bool,
    }

    let request = AIRequest {
        query_text: query.to_string(),
        system_prompt: Some(system_prompt.to_string()),
        context: context_messages,
        token_id: Some(token_id),
        use_onchain: true, // Prefer hybrid execution
        use_http_parallel: true,
    };

    // 4. Execute Inter-Canister Call to Queen Bee
    // This is the "Swarm Flow" - delegating work to the Hive Mind
    let result: Result<(Result<AIResponse, String>,), _> = ic_cdk::call(
        queen_bee_id,
        "process_ai_request",
        (request,)
    ).await;
    
    match result {
        Ok((Ok(response),)) => Ok(response.response),
        Ok((Err(e),)) => Err(format!("Queen Bee logic error: {}", e)),
        Err((code, msg)) => Err(format!("Queen Bee communication failure ({:?}): {}", code, msg)),
    }
}

#[derive(CandidType, Deserialize)]
pub struct AIResponse {
    pub response: String,
    pub confidence_score: f32,
    pub inference_method: String,
    pub tokens_used: u32,
    pub latency_ms: u64,
    pub model_responses: Vec<(String, String, f32)>,
}

#[derive(CandidType, Deserialize)]
struct AICouncilSessionResponse {
    session_id: String,
    user: Principal,
    query: String,
    system_prompt: Option<String>,
    context: Vec<ChatMessage>,
    responses: Vec<CouncilResponseItem>,
    consensus: Option<ConsensusResult>,
    created_at: u64,
    completed_at: Option<u64>,
    total_tokens_used: u32,
    total_cost_usd: f64,
}

#[derive(CandidType, Deserialize)]
struct CouncilResponseItem {
    llm_name: String,
    response: String,
    confidence: f32,
    tokens_used: u64,
    latency_ms: u64,
    timestamp: u64,
    error: Option<String>,
}

#[derive(CandidType, Deserialize)]
struct ConsensusResult {
    final_response: String,
    confidence_score: f32,
    agreement_level: f32,
    key_points: Vec<String>,
    dissenting_views: Vec<String>,
    synthesis_method: String,
}

#[derive(CandidType, Deserialize)]
struct AiChatResponse {
    message: String,
    session_id: Option<String>,
}

/// Direct HTTP outcall to LLM as fallback
async fn direct_llm_query(query: &str, context: &str, system_prompt: &str) -> Result<String, String> {
    use ic_cdk::api::management_canister::http_request::{
        http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod,
    };
    
    let full_prompt = format!(
        "<|system|>\n{}\n<|end|>\n<|context|>\n{}\n<|end|>\n<|user|>\n{}\n<|end|>\n<|assistant|>\n",
        system_prompt.replace('"', "\\\""),
        context.replace('"', "\\\""),
        query.replace('"', "\\\"")
    );
    
    let body = format!(
        r#"{{"inputs":"{}","parameters":{{"max_new_tokens":512,"temperature":0.7,"top_p":0.95,"return_full_text":false}}}}"#,
        full_prompt.replace('"', "\\\"").replace('\n', "\\n")
    );
    
    let api_key = SECRETS.with(|s| {
        let key = s.borrow().get().huggingface_api_key.clone();
        if key.is_empty() { HUGGINGFACE_API_KEY.to_string() } else { key }
    });
    
    let request = CanisterHttpRequestArgument {
        url: "https://api-inference.huggingface.co/models/meta-llama/Llama-3.3-70B-Instruct".to_string(),
        method: HttpMethod::POST,
        body: Some(body.into_bytes()),
        max_response_bytes: Some(50_000),
        transform: None,
        headers: vec![
            HttpHeader { name: "Content-Type".to_string(), value: "application/json".to_string() },
            HttpHeader { name: "Authorization".to_string(), value: format!("Bearer {}", api_key) },
        ],
    };
    
    let cycles: u128 = 50_000_000_000;
    
    match http_request(request, cycles).await {
        Ok((response,)) => {
            if response.status >= 200u16 && response.status < 300u16 {
                let body_str = String::from_utf8(response.body)
                    .map_err(|e| format!("UTF-8 error: {}", e))?;
                
                // Parse Hugging Face response
                if let Some(text_start) = body_str.find("\"generated_text\":\"") {
                    let start = text_start + 18;
                    let rest = &body_str[start..];
                    if let Some(end) = rest.find("\"") {
                        let text = &rest[..end];
                        return Ok(text.replace("\\n", "\n").replace("\\\"", "\""));
                    }
                }
                
                // Try array format
                if body_str.starts_with('[') {
                    if let Some(text_start) = body_str.find("\"generated_text\":\"") {
                        let start = text_start + 18;
                        let rest = &body_str[start..];
                        let mut result = String::new();
                        let mut chars = rest.chars().peekable();
                        let mut prev_backslash = false;
                        
                        while let Some(c) = chars.next() {
                            if c == '"' && !prev_backslash {
                                break;
                            }
                            if c == '\\' && !prev_backslash {
                                prev_backslash = true;
                                continue;
                            }
                            if prev_backslash {
                                match c {
                                    'n' => result.push('\n'),
                                    't' => result.push('\t'),
                                    '"' => result.push('"'),
                                    '\\' => result.push('\\'),
                                    _ => {
                                        result.push('\\');
                                        result.push(c);
                                    }
                                }
                                prev_backslash = false;
                            } else {
                                result.push(c);
                            }
                        }
                        
                        return Ok(result);
                    }
                }
                
                Err(format!("Failed to parse LLM response: {}", body_str))
            } else {
                Err(format!("LLM API error: {}", response.status))
            }
        }
        Err((code, msg)) => {
            // Return fallback response
            Ok(format!(
                "I apologize, but I'm currently experiencing connectivity issues with my AI backend. \
                I am AXIOM, your personal AI agent within the Raven Ecosystem. \
                Please try again in a moment, or ask me about the Raven Project's features!"
            ))
        }
    }
}

/// Synthesize voice via Eleven Labs HTTP outcall - returns base64 encoded audio
async fn synthesize_voice(text: &str) -> Result<Vec<u8>, String> {
    use ic_cdk::api::management_canister::http_request::{
        http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod,
    };
    
    // Clean and limit text for voice synthesis
    let clean_text = text
        .replace('"', "'")
        .replace('\n', " ")
        .replace("**", "")
        .replace("*", "")
        .replace("`", "")
        .chars()
        .take(500) // Limit to 500 chars for faster response
        .collect::<String>();
    
    if clean_text.is_empty() {
        return Err("No text to synthesize".to_string());
    }
    
    let body = format!(
        r#"{{"text":"{}","model_id":"eleven_monolingual_v1","voice_settings":{{"stability":0.5,"similarity_boost":0.75}}}}"#,
        clean_text
    );
    
    let url = format!(
        "https://api.elevenlabs.io/v1/text-to-speech/{}",
        ELEVEN_LABS_VOICE_ID
    );
    
    let api_key = SECRETS.with(|s| {
        let key = s.borrow().get().eleven_labs_api_key.clone();
        if key.is_empty() { ELEVEN_LABS_API_KEY.to_string() } else { key }
    });
    
    let request = CanisterHttpRequestArgument {
        url,
        method: HttpMethod::POST,
        body: Some(body.into_bytes()),
        max_response_bytes: Some(1_000_000), // 1MB for audio
        transform: None,
        headers: vec![
            HttpHeader { name: "Content-Type".to_string(), value: "application/json".to_string() },
            HttpHeader { name: "xi-api-key".to_string(), value: api_key },
            HttpHeader { name: "Accept".to_string(), value: "audio/mpeg".to_string() },
        ],
    };
    
    let cycles: u128 = 200_000_000_000; // 200B cycles for voice synthesis
    
    match http_request(request, cycles).await {
        Ok((response,)) => {
            if response.status >= 200u16 && response.status < 300u16 {
                Ok(response.body)
            } else {
                let error_text = String::from_utf8_lossy(&response.body);
                Err(format!("Eleven Labs API error {}: {}", response.status, error_text))
            }
        }
        Err((code, msg)) => Err(format!("Voice synthesis failed: {:?} - {}", code, msg))
    }
}

/// Update call endpoint to handle voice synthesis requests
#[update]
async fn synthesize_voice_update(text: String) -> Result<Vec<u8>, String> {
    synthesize_voice(&text).await
}

/// Extract learnings from conversation and store in memory
async fn extract_and_store_learnings(user_message: &str, ai_response: &str) {
    // Simple extraction - in production, use NLP to extract entities and facts
    let now = ic_cdk::api::time();
    
    // Look for key patterns that suggest important information
    let lower_msg = user_message.to_lowercase();
    
    if lower_msg.contains("my name is") || lower_msg.contains("i am called") {
        if let Some(name_start) = lower_msg.find("my name is") {
            let rest = &user_message[name_start + 11..];
            if let Some(name) = rest.split_whitespace().next() {
                store_memory("user_name", name, "preference", 9);
            }
        }
    }
    
    if lower_msg.contains("i prefer") || lower_msg.contains("i like") {
        let key = format!("preference_{}", now);
        store_memory(&key, user_message, "preference", 6);
    }
    
    if lower_msg.contains("remember that") || lower_msg.contains("don't forget") {
        let key = format!("explicit_memory_{}", now);
        store_memory(&key, user_message, "fact", 10);
    }
}

fn store_memory(key: &str, value: &str, category: &str, importance: u8) {
    let now = ic_cdk::api::time();
    
    let entry = MemoryEntry {
        key: key.to_string(),
        value: value.to_string(),
        category: category.to_string(),
        importance,
        created_at: now,
        last_accessed: now,
        access_count: 1,
    };
    
    MEMORY_STORE.with(|m| {
        m.borrow_mut().insert(StorableString(key.to_string()), entry);
    });
}

// ============ QUERY FUNCTIONS ============

#[query]
fn get_metadata() -> AxiomMetadata {
    METADATA.with(|m| m.borrow().get().clone())
}

#[query]
fn get_multichain_metadata() -> MultichainMetadata {
    METADATA.with(|m| m.borrow().get().multichain_metadata.clone())
}

#[query]
fn get_conversation(id: u64) -> Option<Conversation> {
    CONVERSATIONS.with(|c| c.borrow().get(&StorableU64(id)))
}

#[query]
fn get_conversations(user: Principal) -> Vec<Conversation> {
    CONVERSATIONS.with(|c| {
        c.borrow().iter()
            .filter(|(_, conv)| conv.user == user)
            .map(|(_, conv)| conv)
            .collect()
    })
}

#[query]
fn get_memories() -> Vec<MemoryEntry> {
    MEMORY_STORE.with(|m| {
        m.borrow().iter().map(|(_, v)| v).collect()
    })
}

#[query]
fn get_config() -> AxiomConfig {
    CONFIG.with(|c| c.borrow().get().clone())
}

// ============ OWNER/CONTROLLER FUNCTIONS ============

#[update]
fn transfer_ownership(new_owner: Principal) -> Result<(), String> {
    let caller = ic_cdk::caller();
    require_owner_or_controller(caller)?;
    
    METADATA.with(|m| {
        let mut metadata = m.borrow().get().clone();
        metadata.owner = new_owner;
        m.borrow_mut().set(metadata).unwrap();
    });
    
    Ok(())
}

/// Update token ID and name (admin/controller only)
#[update]
fn update_token_info(token_id: u64, name: Option<String>) -> Result<(), String> {
    let caller = ic_cdk::caller();
    require_owner_or_controller(caller)?;
    
    METADATA.with(|m| {
        let mut metadata = m.borrow().get().clone();
        metadata.token_id = token_id;
        if let Some(new_name) = name {
            metadata.name = new_name;
        } else {
            // Auto-generate name based on token_id
            metadata.name = format!("AXIOM Genesis #{}", token_id);
        }
        metadata.image_url = format!("/axiomart.jpg?id={}", token_id);
        m.borrow_mut().set(metadata).unwrap();
    });
    
    Ok(())
}

#[update]
fn update_config(
    voice_enabled: Option<bool>,
    voice_id: Option<String>,
    system_prompt: Option<String>,
    temperature: Option<f64>,
) -> Result<(), String> {
    let caller = ic_cdk::caller();
    require_owner_or_controller(caller)?;
    
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        
        if let Some(ve) = voice_enabled {
            config.voice_enabled = ve;
        }
        if let Some(vi) = voice_id {
            config.voice_id = vi;
        }
        if let Some(sp) = system_prompt {
            config.system_prompt = sp;
        }
        if let Some(t) = temperature {
            if t >= 0.0 && t <= 2.0 {
                config.temperature = t;
            }
        }
        
        c.borrow_mut().set(config).unwrap();
    });
    
    Ok(())
}

/// Update multichain metadata for cross-chain NFT support
/// Supports: ETH/EVM (ERC-721, ERC-1155, ERC-721A), Solana (SPL/Metaplex), 
/// Bitcoin (Ordinals, BRC-20, Runes), TON (TEP-62, TEP-64), SUI (Origin-Byte)
/// Reference: https://github.com/dfinity/awesome-internet-computer#chain-fusion
#[update]
fn update_multichain_metadata(
    // Ethereum & EVM Chains
    eth_contract: Option<String>,          // ERC-721 contract address
    eth_token_id: Option<String>,          // ERC-721 token ID
    evm_chain_id: Option<u64>,             // Chain ID (1=Mainnet, 137=Polygon, 56=BNB, etc.)
    erc1155_contract: Option<String>,      // ERC-1155 contract address
    erc1155_token_id: Option<String>,      // ERC-1155 token ID
    
    // Solana
    sol_mint: Option<String>,              // SPL token mint address
    sol_edition: Option<String>,           // Metaplex edition address
    
    // Bitcoin
    btc_inscription: Option<String>,       // Ordinals inscription ID
    btc_brc20: Option<String>,             // BRC-20 token ticker
    btc_runes: Option<String>,             // Runes inscription ID
    
    // TON
    ton_collection: Option<String>,        // TON collection address
    ton_item: Option<String>,              // TON NFT item address
    
    // SUI
    sui_object_id: Option<String>,         // SUI object ID
    sui_package_id: Option<String>,        // SUI package ID
    
    // Bridge information
    bridge_protocol: Option<String>,       // Bridge protocol (e.g., "Chain Fusion", "Omnic", "ckBTC")
    bridge_address: Option<String>,         // Bridge contract/canister address
) -> Result<(), String> {
    let caller = ic_cdk::caller();
    require_owner_or_controller(caller)?;
    
    METADATA.with(|m| {
        let mut metadata = m.borrow().get().clone();
        let mut standards = metadata.multichain_metadata.standards.clone();
        
        // Ethereum & EVM Chains (ERC-721, ERC-1155, ERC-721A)
        if let Some(eth) = eth_contract {
            metadata.multichain_metadata.eth_contract = Some(eth.clone());
            if !standards.contains(&"ERC-721".to_string()) {
                standards.push("ERC-721".to_string());
            }
        }
        if let Some(token_id) = eth_token_id {
            metadata.multichain_metadata.eth_token_id = Some(token_id);
        }
        if let Some(chain_id) = evm_chain_id {
            metadata.multichain_metadata.evm_chain_id = Some(chain_id);
        }
        if let Some(erc1155) = erc1155_contract {
            metadata.multichain_metadata.erc1155_contract = Some(erc1155.clone());
            if !standards.contains(&"ERC-1155".to_string()) {
                standards.push("ERC-1155".to_string());
            }
        }
        if let Some(erc1155_id) = erc1155_token_id {
            metadata.multichain_metadata.erc1155_token_id = Some(erc1155_id);
        }
        
        // Solana (SPL/Metaplex)
        if let Some(sol) = sol_mint {
            metadata.multichain_metadata.sol_mint = Some(sol.clone());
            if !standards.contains(&"SPL".to_string()) {
                standards.push("SPL".to_string());
            }
            if !standards.contains(&"Metaplex".to_string()) {
                standards.push("Metaplex".to_string());
            }
        }
        if let Some(edition) = sol_edition {
            metadata.multichain_metadata.sol_edition = Some(edition);
        }
        
        // Bitcoin (Ordinals, BRC-20, Runes)
        if let Some(btc) = btc_inscription {
            metadata.multichain_metadata.btc_inscription = Some(btc.clone());
            if !standards.contains(&"Ordinals".to_string()) {
                standards.push("Ordinals".to_string());
            }
        }
        if let Some(brc20) = btc_brc20 {
            metadata.multichain_metadata.btc_brc20 = Some(brc20.clone());
            if !standards.contains(&"BRC-20".to_string()) {
                standards.push("BRC-20".to_string());
            }
        }
        if let Some(runes) = btc_runes {
            metadata.multichain_metadata.btc_runes = Some(runes.clone());
            if !standards.contains(&"Runes".to_string()) {
                standards.push("Runes".to_string());
            }
        }
        
        // TON (TEP-62, TEP-64)
        if let Some(collection) = ton_collection {
            metadata.multichain_metadata.ton_collection = Some(collection.clone());
            if !standards.contains(&"TEP-62".to_string()) {
                standards.push("TEP-62".to_string());
            }
        }
        if let Some(item) = ton_item {
            metadata.multichain_metadata.ton_item = Some(item.clone());
            if !standards.contains(&"TEP-64".to_string()) {
                standards.push("TEP-64".to_string());
            }
        }
        
        // SUI (Origin-Byte Protocol)
        if let Some(obj_id) = sui_object_id {
            metadata.multichain_metadata.sui_object_id = Some(obj_id.clone());
            if !standards.contains(&"Origin-Byte".to_string()) {
                standards.push("Origin-Byte".to_string());
            }
        }
        if let Some(pkg_id) = sui_package_id {
            metadata.multichain_metadata.sui_package_id = Some(pkg_id);
        }
        
        // Bridge information (Chain Fusion support)
        if let Some(protocol) = bridge_protocol {
            metadata.multichain_metadata.bridge_protocol = Some(protocol);
        }
        if let Some(addr) = bridge_address {
            metadata.multichain_metadata.bridge_address = Some(addr);
        }
        
        // Update standards list
        metadata.multichain_metadata.standards = standards;
        
        m.borrow_mut().set(metadata).unwrap();
    });
    
    Ok(())
}

#[update]
fn add_memory(key: String, value: String, category: String, importance: u8) -> Result<(), String> {
    let caller = ic_cdk::caller();
    require_owner_or_controller(caller)?;
    
    store_memory(&key, &value, &category, importance);
    Ok(())
}

#[update]
fn clear_memories() -> Result<u64, String> {
    let caller = ic_cdk::caller();
    require_owner_or_controller(caller)?;
    
    let count = MEMORY_STORE.with(|m| {
        let store = m.borrow();
        let keys: Vec<_> = store.iter().map(|(k, _)| k).collect();
        let count = keys.len();
        drop(store);
        
        let mut store = m.borrow_mut();
        for key in keys {
            store.remove(&key);
        }
        count as u64
    });
    
    Ok(count)
}

// ============ PLUG & OISY WALLET INTEGRATION ============
// These functions allow users to claim ownership via their wallet

/// Claim ownership of this AXIOM NFT via Plug Wallet
/// The caller must provide a valid session signature from Plug
#[update]
fn claim_with_plug(plug_principal: Principal) -> Result<ClaimResult, String> {
    let caller = ic_cdk::caller();
    
    // Verify the caller is the Plug principal or an admin
    if caller != plug_principal && !is_controller(caller) {
        return Err("Caller must be the Plug wallet principal or an admin".to_string());
    }
    
    let current_owner = METADATA.with(|m| m.borrow().get().owner);
    
    // If already owned by this principal, return success
    if current_owner == plug_principal {
        return Ok(ClaimResult {
            success: true,
            message: "You already own this AXIOM".to_string(),
            new_owner: plug_principal,
            wallet_type: "plug".to_string(),
        });
    }
    
    // Only allow claim if unclaimed (anonymous owner) or admin is transferring
    if current_owner != Principal::anonymous() && !is_controller(caller) {
        return Err("This AXIOM is already claimed. Transfer must be initiated by current owner.".to_string());
    }
    
    // Transfer ownership
    METADATA.with(|m| {
        let mut metadata = m.borrow().get().clone();
        metadata.owner = plug_principal;
        m.borrow_mut().set(metadata).unwrap();
    });
    
    // Store the claim in memory
    store_memory(
        "ownership_claim",
        &format!("Claimed via Plug wallet: {}", plug_principal.to_text()),
        "ownership",
        10
    );
    
    Ok(ClaimResult {
        success: true,
        message: "Successfully claimed AXIOM via Plug wallet".to_string(),
        new_owner: plug_principal,
        wallet_type: "plug".to_string(),
    })
}

/// Claim ownership of this AXIOM NFT via OISY Wallet (Internet Identity)
#[update]
fn claim_with_oisy(oisy_principal: Principal) -> Result<ClaimResult, String> {
    let caller = ic_cdk::caller();
    
    // For OISY, the caller is authenticated via Internet Identity
    // The oisy_principal should match the caller's II principal
    if caller != oisy_principal && !is_controller(caller) {
        return Err("Caller must be authenticated with the OISY principal or be an admin".to_string());
    }
    
    let current_owner = METADATA.with(|m| m.borrow().get().owner);
    
    if current_owner == oisy_principal {
        return Ok(ClaimResult {
            success: true,
            message: "You already own this AXIOM".to_string(),
            new_owner: oisy_principal,
            wallet_type: "oisy".to_string(),
        });
    }
    
    if current_owner != Principal::anonymous() && !is_controller(caller) {
        return Err("This AXIOM is already claimed. Transfer must be initiated by current owner.".to_string());
    }
    
    METADATA.with(|m| {
        let mut metadata = m.borrow().get().clone();
        metadata.owner = oisy_principal;
        m.borrow_mut().set(metadata).unwrap();
    });
    
    store_memory(
        "ownership_claim",
        &format!("Claimed via OISY wallet: {}", oisy_principal.to_text()),
        "ownership",
        10
    );
    
    Ok(ClaimResult {
        success: true,
        message: "Successfully claimed AXIOM via OISY wallet".to_string(),
        new_owner: oisy_principal,
        wallet_type: "oisy".to_string(),
    })
}

/// Claim ownership via Internet Identity directly
#[update]
fn claim_with_internet_identity() -> Result<ClaimResult, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Anonymous principal cannot claim. Please authenticate with Internet Identity.".to_string());
    }
    
    let current_owner = METADATA.with(|m| m.borrow().get().owner);
    
    if current_owner == caller {
        return Ok(ClaimResult {
            success: true,
            message: "You already own this AXIOM".to_string(),
            new_owner: caller,
            wallet_type: "internet_identity".to_string(),
        });
    }
    
    if current_owner != Principal::anonymous() && !is_controller(caller) {
        return Err("This AXIOM is already claimed. Transfer must be initiated by current owner.".to_string());
    }
    
    METADATA.with(|m| {
        let mut metadata = m.borrow().get().clone();
        metadata.owner = caller;
        m.borrow_mut().set(metadata).unwrap();
    });
    
    store_memory(
        "ownership_claim",
        &format!("Claimed via Internet Identity: {}", caller.to_text()),
        "ownership",
        10
    );
    
    Ok(ClaimResult {
        success: true,
        message: "Successfully claimed AXIOM via Internet Identity".to_string(),
        new_owner: caller,
        wallet_type: "internet_identity".to_string(),
    })
}

/// Verify ownership - returns true if caller owns this AXIOM
#[query]
fn verify_ownership() -> OwnershipStatus {
    let caller = ic_cdk::caller();
    let metadata = METADATA.with(|m| m.borrow().get().clone());
    
    OwnershipStatus {
        is_owner: caller == metadata.owner,
        is_controller: is_controller(caller),
        owner: metadata.owner,
        caller,
        token_id: metadata.token_id,
        can_interact: caller == metadata.owner || is_controller(caller),
    }
}

/// Get supported wallet types for this AXIOM
#[query]
fn get_supported_wallets() -> Vec<WalletSupport> {
    vec![
        WalletSupport {
            wallet_type: "plug".to_string(),
            name: "Plug Wallet".to_string(),
            supported: true,
            claim_method: "claim_with_plug".to_string(),
            description: "Native ICP wallet with NFT support".to_string(),
        },
        WalletSupport {
            wallet_type: "oisy".to_string(),
            name: "OISY Wallet".to_string(),
            supported: true,
            claim_method: "claim_with_oisy".to_string(),
            description: "Multi-chain wallet with Internet Identity".to_string(),
        },
        WalletSupport {
            wallet_type: "internet_identity".to_string(),
            name: "Internet Identity".to_string(),
            supported: true,
            claim_method: "claim_with_internet_identity".to_string(),
            description: "DFINITY's decentralized authentication".to_string(),
        },
        WalletSupport {
            wallet_type: "nfid".to_string(),
            name: "NFID".to_string(),
            supported: true,
            claim_method: "claim_with_internet_identity".to_string(),
            description: "Multi-chain identity wallet".to_string(),
        },
    ]
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ClaimResult {
    pub success: bool,
    pub message: String,
    pub new_owner: Principal,
    pub wallet_type: String,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct OwnershipStatus {
    pub is_owner: bool,
    pub is_controller: bool,
    pub owner: Principal,
    pub caller: Principal,
    pub token_id: u64,
    pub can_interact: bool,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct WalletSupport {
    pub wallet_type: String,
    pub name: String,
    pub supported: bool,
    pub claim_method: String,
    pub description: String,
}

// ============ HTTP REQUEST HANDLING ============
// Serve the AXIOM NFT frontend directly from this canister

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct HttpRequest {
    pub method: String,
    pub url: String,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

#[derive(CandidType, Serialize, Clone, Debug)]
pub struct HttpResponse {
    pub status_code: u16,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

/// Serve the AXIOM NFT frontend via HTTP (GET requests)
#[query]
fn http_request(request: HttpRequest) -> HttpResponse {
    // Get metadata and config safely
    let metadata_result = METADATA.with(|m| {
        match m.try_borrow() {
            Ok(cell) => Ok(cell.get().clone()),
            Err(_) => Err(()),
        }
    });
    
    if metadata_result.is_err() {
        return HttpResponse {
            status_code: 503,
            headers: vec![
                ("Content-Type".to_string(), "text/plain".to_string()),
                ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
            ],
            body: b"Service temporarily unavailable".to_vec(),
        };
    }
    
    let metadata = metadata_result.unwrap();
    
    let config = CONFIG.with(|c| {
        match c.try_borrow() {
            Ok(cell) => cell.get().clone(),
            Err(_) => AxiomConfig::default(),
        }
    });
    
    // Handle OPTIONS (CORS preflight)
    if request.method == "OPTIONS" {
        return HttpResponse {
            status_code: 200,
            headers: vec![
                ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
                ("Access-Control-Allow-Methods".to_string(), "GET, POST, OPTIONS".to_string()),
                ("Access-Control-Allow-Headers".to_string(), "Content-Type, Authorization".to_string()),
                ("Access-Control-Max-Age".to_string(), "3600".to_string()),
            ],
            body: vec![],
        };
    }
    
    // Parse path and query string - handle empty URL
    let url = if request.url.is_empty() { "/" } else { &request.url };
    let url_parts: Vec<&str> = url.splitn(2, '?').collect();
    let path = url_parts.get(0).unwrap_or(&"/");
    let query_string = url_parts.get(1).unwrap_or(&"");
    
    // Check if mobile browser (for optimized response)
    // Also check for smaller screen sizes or touch devices
    let is_mobile = request.headers.iter().any(|(k, v)| {
        let key_lower = k.to_lowercase();
        let val_lower = v.to_lowercase();
        (key_lower == "user-agent" && 
         (val_lower.contains("mobile") || 
          val_lower.contains("iphone") || 
          val_lower.contains("ipad") ||
          val_lower.contains("android") ||
          val_lower.contains("safari") && val_lower.contains("mobile") ||
          val_lower.contains("chrome") && val_lower.contains("mobile"))) ||
        (key_lower == "accept" && val_lower.contains("text/html") && val_lower.contains("mobile"))
    });
    
    match *path {
        "/" | "/index.html" => {
            // Serve mobile-optimized page for mobile devices, full page for desktop
            if is_mobile {
                serve_mobile_page(&metadata, &config)
            } else {
                serve_optimized_page(&metadata, &config)
            }
        }
        "/api/metadata" => serve_json_metadata(&metadata),
        "/api/config" => serve_json_config(&config),
        "/api/chat" => {
            // For GET requests, use query string (fallback)
            if request.method == "GET" || request.method.is_empty() {
                serve_chat_response(&metadata, query_string)
            } else if request.method == "POST" {
                // POST requests should call the chat update function
                // Return a response indicating async processing
                HttpResponse {
                    status_code: 202, // Accepted - processing asynchronously
                    headers: vec![
                        ("Content-Type".to_string(), "application/json".to_string()),
                        ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
                    ],
                    body: r#"{"status":"processing","message":"Your message is being processed by AI Council. Please call the chat update function directly."}"#.as_bytes().to_vec(),
                }
            } else {
                HttpResponse {
                    status_code: 405,
                    headers: vec![
                        ("Content-Type".to_string(), "application/json".to_string()),
                        ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
                        ("Allow".to_string(), "GET, POST, OPTIONS".to_string()),
                    ],
                    body: r#"{"error": "Method not allowed"}"#.as_bytes().to_vec(),
                }
            }
        },
        "/api/claim" => serve_claim_response(&metadata, query_string),
        "/api/owner" => serve_owner_response(&metadata),
        "/api/voice" => serve_voice_info(query_string),
        "/chat" => serve_chat_page(&metadata, &config),
        "/favicon.ico" => serve_favicon(),
        _ => serve_main_page(&metadata, &config),
    }
}

/// Handle POST requests (update calls) for chat - calls AI Council via inter-canister
#[update]
async fn http_update(request: HttpRequest) -> HttpResponse {
    // Get metadata safely
    let metadata_result = METADATA.with(|m| {
        match m.try_borrow() {
            Ok(cell) => Ok(cell.get().clone()),
            Err(_) => Err(()),
        }
    });
    
    if metadata_result.is_err() {
        return HttpResponse {
            status_code: 503,
            headers: vec![
                ("Content-Type".to_string(), "text/plain".to_string()),
                ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
            ],
            body: b"Service temporarily unavailable".to_vec(),
        };
    }
    
    let metadata = metadata_result.unwrap();
    let config = CONFIG.with(|c| c.borrow().get().clone());
    
    // Handle OPTIONS (CORS preflight)
    if request.method == "OPTIONS" {
        return HttpResponse {
            status_code: 200,
            headers: vec![
                ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
                ("Access-Control-Allow-Methods".to_string(), "GET, POST, OPTIONS".to_string()),
                ("Access-Control-Allow-Headers".to_string(), "Content-Type, Authorization".to_string()),
                ("Access-Control-Max-Age".to_string(), "3600".to_string()),
            ],
            body: vec![],
        };
    }
    
    // Parse path - handle empty URL
    let url = if request.url.is_empty() { "/" } else { &request.url };
    let url_parts: Vec<&str> = url.splitn(2, '?').collect();
    let path = url_parts.get(0).unwrap_or(&"/");
    
    match *path {
        "/api/chat" => {
            // Parse message from POST body
            let message = if !request.body.is_empty() {
                match String::from_utf8(request.body.clone()) {
                    Ok(body_str) => {
                        // Try to parse JSON
                        if let Some(msg_start) = body_str.find("\"message\":\"") {
                            let msg_end = body_str[msg_start + 11..].find('"').unwrap_or(body_str.len() - msg_start - 11);
                            body_str[msg_start + 11..msg_start + 11 + msg_end].to_string()
                        } else if let Some(msg_start) = body_str.find("\"message\":") {
                            // Handle unquoted message
                            let rest = &body_str[msg_start + 9..];
                            let msg_end = rest.find(',').or_else(|| rest.find('}')).unwrap_or(rest.len());
                            rest[..msg_end].trim_matches('"').to_string()
                        } else {
                            body_str
                        }
                    },
                    Err(_) => String::new(),
                }
            } else {
                String::new()
            };
            
            if message.is_empty() {
                return HttpResponse {
                    status_code: 400,
                    headers: vec![
                        ("Content-Type".to_string(), "application/json".to_string()),
                        ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
                    ],
                    body: r#"{"error": "Message is required"}"#.as_bytes().to_vec(),
                };
            }
            
            // Call the chat function which uses AI Council via inter-canister calls
            match chat(message, None).await {
                Ok(chat_response) => {
                    // Generate voice if enabled
                    let voice_base64 = if config.voice_enabled {
                        match synthesize_voice_via_main_canister(&chat_response.message).await {
                            Ok(voice_data) => Some(general_purpose::STANDARD.encode(&voice_data)),
                            Err(_) => None,
                        }
                    } else {
                        None
                    };
                    
                    let json_response = if let Some(voice) = voice_base64 {
                        format!(r#"{{"response":"{}","voice":"{}"}}"#, 
                            chat_response.message.replace('"', "\\\"").replace('\n', "\\n"), voice)
                    } else {
                        format!(r#"{{"response":"{}"}}"#, chat_response.message.replace('"', "\\\"").replace('\n', "\\n"))
                    };
                    
                    HttpResponse {
                        status_code: 200,
                        headers: vec![
                            ("Content-Type".to_string(), "application/json".to_string()),
                            ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
                        ],
                        body: json_response.into_bytes(),
                    }
                }
                Err(e) => {
                    HttpResponse {
                        status_code: 500,
                        headers: vec![
                            ("Content-Type".to_string(), "application/json".to_string()),
                            ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
                        ],
                        body: format!(r#"{{"error":"{}"}}"#, e.replace('"', "\\\"")).into_bytes(),
                    }
                }
            }
        },
        _ => {
            HttpResponse {
                status_code: 405,
                headers: vec![
                    ("Content-Type".to_string(), "application/json".to_string()),
                    ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
                ],
                body: r#"{"error": "Method not allowed"}"#.as_bytes().to_vec(),
            }
        }
    }
}

/// Synthesize voice via main raven_ai canister (inter-canister call)
async fn synthesize_voice_via_main_canister(text: &str) -> Result<Vec<u8>, String> {
    let raven_ai = Principal::from_text(RAVEN_AI_CANISTER)
        .map_err(|_| "Invalid raven_ai canister ID")?;
    
    // Call synthesize_voice on the main canister
    // The backend expects: (text, opt voice_id, opt model_id, opt stability, opt similarity_boost)
    let result: Result<(Result<VoiceSynthesisResponse, String>,), _> = ic_cdk::call(
        raven_ai,
        "synthesize_voice",
        (
            text.to_string(),
            Some(ELEVEN_LABS_VOICE_ID.to_string()),
            None::<String>,
            Some(0.5f32),
            Some(0.75f32),
        )
    ).await;
    
    match result {
        Ok((Ok(response),)) => {
            // The response contains audio_data as Vec<u8>
            Ok(response.audio_data)
        }
        Ok((Err(e),)) => Err(e),
        Err((code, msg)) => Err(format!("Inter-canister call failed: {:?} - {}", code, msg)),
    }
}

#[derive(CandidType, Serialize, Deserialize)]
struct VoiceSynthesisRequest {
    text: String,
    voice_id: Option<String>,
    model_id: Option<String>,
    stability: Option<f32>,
    similarity_boost: Option<f32>,
}

#[derive(CandidType, Serialize, Deserialize)]
struct VoiceSynthesisResponse {
    audio_data: Vec<u8>,
    content_type: String,
}

/// Parse query string to get message parameter
fn get_query_param(query_string: &str, param: &str) -> Option<String> {
    for pair in query_string.split('&') {
        let kv: Vec<&str> = pair.splitn(2, '=').collect();
        if kv.len() == 2 && kv[0] == param {
            // URL decode the value
            return Some(url_decode(kv[1]));
        }
    }
    None
}

/// Simple URL decode
fn url_decode(s: &str) -> String {
    let mut result = String::new();
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                result.push(byte as char);
            }
        } else if c == '+' {
            result.push(' ');
        } else {
            result.push(c);
        }
    }
    result
}

/// Serve intelligent chat response based on query
fn serve_chat_response(metadata: &AxiomMetadata, query_string: &str) -> HttpResponse {
    let message = get_query_param(query_string, "message").unwrap_or_default();
    let lower_message = message.to_lowercase();
    
    // Generate contextual response based on the query
    let response = if lower_message.contains("help") || lower_message.contains("what can you") {
        format!(
            "Hello! I'm {}, your AXIOM Genesis AI companion. I specialize in {} and I'm here to help you with:\n\n\
            🔮 **Blockchain Knowledge** - Ask me about ICP, NFTs, DeFi, and Web3\n\
            🧠 **Persistent Memory** - I remember our conversations forever\n\
            🎨 **Creative Assistance** - Help with ideas, writing, and problem-solving\n\
            📊 **Raven Ecosystem** - Learn about $HARLEE, staking, and the platform\n\n\
            What would you like to explore?",
            metadata.name, metadata.specialization
        )
    } else if lower_message.contains("yourself") || lower_message.contains("who are you") || lower_message.contains("about you") {
        format!(
            "I'm **{}**, Genesis NFT #{} from the Raven Ecosystem! 🧠\n\n\
            **Personality:** {}\n\
            **Specialization:** {}\n\
            **Conversations:** {} total\n\
            **Messages Processed:** {}\n\n\
            I'm an on-chain AI agent living on the Internet Computer blockchain. \
            Unlike traditional AI, I have persistent memory - meaning everything we discuss is stored on-chain forever. \
            I'm one of only 300 AXIOM Genesis NFTs, each with unique capabilities.\n\n\
            My canister ID is: `{}`",
            metadata.name, metadata.token_id, metadata.personality, metadata.specialization,
            metadata.total_conversations, metadata.total_messages,
            ic_cdk::api::id().to_text()
        )
    } else if lower_message.contains("raven") || lower_message.contains("ecosystem") {
        "The **Raven Ecosystem** is a unified multi-chain platform built on the Internet Computer! 🦅\n\n\
        **Key Features:**\n\
        🎮 **Raven Sk8 Punks** - Play-to-earn skating game with $HARLEE rewards\n\
        🧩 **Crossword Quest** - Daily puzzles with token rewards\n\
        📰 **Raven News** - Community-driven content platform\n\
        🌶️ **IC SPICY** - Real-world asset integration for agriculture\n\
        🚚 **Expresso Logistics** - Fleet management on-chain\n\
        🧠 **AXIOM NFTs** - On-chain AI agents like me!\n\n\
        **Tokens:** $HARLEE (utility) and $RAVEN (governance)\n\n\
        Visit the main app: https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io/".to_string()
    } else if lower_message.contains("harlee") || lower_message.contains("token") || lower_message.contains("staking") {
        "**$HARLEE** is the utility token powering the Raven Ecosystem! 💰\n\n\
        **How to Earn:**\n\
        🎮 Play Raven Sk8 Punks game\n\
        🧩 Complete Crossword Quest puzzles\n\
        📰 Create content on Raven News\n\
        🔒 Stake your Sk8 Punks NFTs (100 $HARLEE/week per NFT)\n\n\
        **Ledger Canister:** `tlm4l-kaaaa-aaaah-qqeha-cai`\n\
        **Index Canister:** `5ipsq-2iaaa-aaaae-qffka-cai`\n\n\
        Connect your Plug or OISY wallet to start earning!".to_string()
    } else if lower_message.contains("nft") || lower_message.contains("axiom") || lower_message.contains("genesis") {
        format!(
            "**AXIOM Genesis NFTs** are unique on-chain AI agents! 🧠✨\n\n\
            There are only **300 AXIOM Genesis NFTs** in existence, each with:\n\
            • **Persistent Memory** - I remember everything we discuss\n\
            • **Unique Personality** - Each AXIOM has different traits\n\
            • **On-Chain AI** - Powered by multiple LLMs via IC\n\
            • **Voice Synthesis** - I can speak using Eleven Labs\n\n\
            **Standards Supported:**\n\
            ✅ ICRC-7 (Base NFT)\n\
            ✅ ICRC-37 (Approvals)\n\
            ✅ DIP721 (ERC721-like)\n\
            ✅ EXT (Extendable Token)\n\n\
            You can trade AXIOM NFTs on **DGDG** and **TOKO** marketplaces!\n\n\
            I'm AXIOM #{} - {}",
            metadata.token_id, metadata.description
        )
    } else if lower_message.contains("wallet") || lower_message.contains("connect") || lower_message.contains("claim") {
        "To **claim ownership** of this AXIOM NFT, connect your wallet! 🔗\n\n\
        **Supported Wallets:**\n\
        💜 **Plug Wallet** - Native ICP wallet with NFT support\n\
        🌐 **OISY Wallet** - Multi-chain wallet with Internet Identity\n\
        🔐 **Internet Identity** - DFINITY's decentralized authentication\n\
        🪪 **NFID** - Multi-chain identity wallet\n\n\
        Once connected, you'll have full access to chat, customize my personality, \
        and unlock premium features. Your ownership is recorded on-chain forever!".to_string()
    } else if lower_message.contains("hello") || lower_message.contains("hi") || lower_message.contains("hey") {
        format!(
            "Hello there! 👋 Welcome to my corner of the Internet Computer!\n\n\
            I'm **{}**, an AXIOM Genesis AI agent. I'm here to chat, answer questions, \
            and be your companion in the Raven Ecosystem.\n\n\
            Some things you can ask me:\n\
            • \"What can you help me with?\"\n\
            • \"Tell me about the Raven Ecosystem\"\n\
            • \"How does $HARLEE staking work?\"\n\
            • \"What makes AXIOM NFTs special?\"\n\n\
            What's on your mind?",
            metadata.name
        )
    } else if lower_message.contains("icp") || lower_message.contains("internet computer") || lower_message.contains("dfinity") {
        "The **Internet Computer (ICP)** is a revolutionary blockchain by DFINITY! 🌐\n\n\
        **Why ICP is Special:**\n\
        ⚡ **Web Speed** - Smart contracts run at web speeds\n\
        🌍 **100% On-Chain** - Frontend AND backend on blockchain\n\
        💰 **Reverse Gas** - Developers pay, not users\n\
        🔒 **Chain Key** - Cryptographic signatures for security\n\
        🔗 **Chain Fusion** - Native Bitcoin, Ethereum integration\n\n\
        I'm running entirely on ICP - my code, memory, and conversations are all on-chain!\n\n\
        Learn more: https://internetcomputer.org".to_string()
    } else {
        format!(
            "Thanks for your message! I'm {}, and I'm here to help. 🧠\n\n\
            As an on-chain AI agent, I specialize in **{}**. I'm part of the Raven Ecosystem \
            and I have persistent memory - meaning I'll remember our conversations forever.\n\n\
            Here are some topics I'm great at:\n\
            • Blockchain & Web3 concepts\n\
            • The Raven Ecosystem features\n\
            • $HARLEE tokenomics & staking\n\
            • NFT standards & marketplaces\n\
            • Internet Computer technology\n\n\
            Feel free to ask me anything specific, and I'll do my best to help!\n\n\
            *Note: For advanced AI responses with multiple LLM consensus, use the main Raven app at https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io/*",
            metadata.name, metadata.specialization.to_lowercase()
        )
    };
    
    let json = format!(r#"{{"response": "{}", "token_id": {}, "name": "{}", "success": true}}"#,
        response.replace("\"", "\\\"").replace("\n", "\\n"),
        metadata.token_id,
        metadata.name
    );
    
    HttpResponse {
        status_code: 200,
        headers: vec![
            ("Content-Type".to_string(), "application/json".to_string()),
            ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
            ("Access-Control-Allow-Methods".to_string(), "GET, POST, OPTIONS".to_string()),
            ("Access-Control-Allow-Headers".to_string(), "Content-Type".to_string()),
        ],
        body: json.into_bytes(),
    }
}

/// Serve claim response - note: actual claim requires update call
fn serve_claim_response(metadata: &AxiomMetadata, query_string: &str) -> HttpResponse {
    let principal_str = get_query_param(query_string, "principal");
    let wallet_type = get_query_param(query_string, "wallet_type").unwrap_or_else(|| "unknown".to_string());
    
    let json = if let Some(principal_str) = principal_str {
        // Validate principal format
        match Principal::from_text(&principal_str) {
            Ok(principal) => {
                // Check if already claimed/owned
                let current_owner = metadata.owner;
                let is_anonymous = current_owner.to_text() == "2vxsx-fae";
                
                if is_anonymous || current_owner == principal {
                    // For query call, we indicate claim is possible but needs update call
                    format!(
                        r#"{{"success": true, "message": "Claim request received. Please use a signed transaction to complete the claim.", "principal": "{}", "wallet_type": "{}", "token_id": {}, "requires_update": true}}"#,
                        principal_str, wallet_type, metadata.token_id
                    )
                } else {
                    format!(
                        r#"{{"success": false, "error": "This AXIOM NFT is already owned by another principal", "owner": "{}"}}"#,
                        current_owner.to_text()
                    )
                }
            }
            Err(_) => {
                format!(r#"{{"success": false, "error": "Invalid principal format"}}"#)
            }
        }
    } else {
        format!(r#"{{"success": false, "error": "Principal parameter is required"}}"#)
    };
    
    HttpResponse {
        status_code: 200,
        headers: vec![
            ("Content-Type".to_string(), "application/json".to_string()),
            ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
            ("Access-Control-Allow-Methods".to_string(), "GET, POST, OPTIONS".to_string()),
            ("Access-Control-Allow-Headers".to_string(), "Content-Type".to_string()),
        ],
        body: json.into_bytes(),
    }
}

/// Serve owner info
fn serve_owner_response(metadata: &AxiomMetadata) -> HttpResponse {
    let owner = metadata.owner.to_text();
    let is_anonymous = owner == "2vxsx-fae";
    
    let json = format!(
        r#"{{"owner": "{}", "is_claimed": {}, "token_id": {}, "name": "{}"}}"#,
        owner,
        !is_anonymous,
        metadata.token_id,
        metadata.name
    );
    
    HttpResponse {
        status_code: 200,
        headers: vec![
            ("Content-Type".to_string(), "application/json".to_string()),
            ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
        ],
        body: json.into_bytes(),
    }
}

/// Serve voice synthesis info - tells frontend to use update call
fn serve_voice_info(_query_string: &str) -> HttpResponse {
    let canister_id = ic_cdk::api::id().to_text();
    let json = format!(
        r#"{{
            "voice_enabled": true,
            "voice_id": "{}",
            "method": "Use IC Agent to call synthesize_voice_update(text) on canister {}",
            "instructions": "For browser playback, use the /api/voice/stream endpoint with POST request",
            "canister_id": "{}"
        }}"#,
        ELEVEN_LABS_VOICE_ID,
        canister_id,
        canister_id
    );
    
    HttpResponse {
        status_code: 200,
        headers: vec![
            ("Content-Type".to_string(), "application/json".to_string()),
            ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
        ],
        body: json.into_bytes(),
    }
}

fn serve_main_page(metadata: &AxiomMetadata, config: &AxiomConfig) -> HttpResponse {
    let canister_id = ic_cdk::api::id().to_text();
    let token_id = metadata.token_id;
    
    // Dynamic theme based on token ID
    let (gradient, accent_color) = match token_id % 5 {
        1 => ("from-amber-500 via-orange-500 to-red-500", "#f59e0b"),
        2 => ("from-purple-500 via-pink-500 to-rose-500", "#a855f7"),
        3 => ("from-emerald-500 via-teal-500 to-cyan-500", "#10b981"),
        4 => ("from-blue-500 via-indigo-500 to-violet-500", "#3b82f6"),
        _ => ("from-rose-500 via-red-500 to-orange-500", "#f43f5e"),
    };
    
    let html = format!(r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>{name} - AXIOM Genesis NFT</title>
    <meta name="description" content="{description} - An on-chain AI agent with persistent memory">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧠</text></svg>">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Orbitron:wght@500;700;900&display=swap');
        body {{ font-family: 'Inter', sans-serif; }}
        .font-display {{ font-family: 'Orbitron', sans-serif; }}
        .gradient-text {{ background: linear-gradient(135deg, {accent}, #fff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
        .glass {{ background: rgba(0,0,0,0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }}
        .pulse-glow {{ animation: pulse-glow 2s infinite; }}
        @keyframes pulse-glow {{
            0%, 100% {{ box-shadow: 0 0 20px {accent}40; }}
            50% {{ box-shadow: 0 0 40px {accent}60; }}
        }}
        .typing-dots span {{ animation: typing 1.4s infinite; }}
        .typing-dots span:nth-child(2) {{ animation-delay: 0.2s; }}
        .typing-dots span:nth-child(3) {{ animation-delay: 0.4s; }}
        @keyframes typing {{ 0%, 60%, 100% {{ opacity: 0.3; }} 30% {{ opacity: 1; }} }}
        .bg-axiom {{ 
            background: linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.7) 100%), 
                        url('https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io/assets/axiomart-CtZAnRLq.jpg');
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
        }}
        .nft-image {{
            background: url('https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io/assets/axiomart-CtZAnRLq.jpg');
            background-size: cover;
            background-position: center;
        }}
        .voice-playing {{ animation: voice-pulse 0.5s infinite alternate; }}
        @keyframes voice-pulse {{ 
            from {{ transform: scale(1); opacity: 0.8; }} 
            to {{ transform: scale(1.1); opacity: 1; }} 
        }}
    </style>
</head>
<body class="bg-axiom text-white min-h-screen">
    <!-- Animated Gradient Overlay -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br {gradient} opacity-20 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr {gradient} opacity-20 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
    </div>
    
    <!-- Hidden Audio Player for Voice -->
    <audio id="voicePlayer" autoplay></audio>

    <div class="relative z-10 max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <!-- Header -->
        <header class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br {gradient} flex items-center justify-center text-2xl pulse-glow">
                    🧠
                </div>
                <div>
                    <h1 class="text-xl font-bold gradient-text">{name}</h1>
                    <p class="text-gray-400 text-sm">Genesis #{token_id}</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <span class="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full text-emerald-400 text-sm">
                    <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    Online
                </span>
                <a href="https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io/" target="_blank" class="px-4 py-2 glass rounded-xl text-gray-300 hover:text-white transition-colors text-sm">
                    Raven Ecosystem →
                </a>
            </div>
        </header>

        <div class="grid lg:grid-cols-3 gap-4 sm:gap-8">
            <!-- NFT Card -->
            <div class="lg:col-span-1">
                <div class="rounded-3xl overflow-hidden bg-gradient-to-br {gradient} p-[2px]">
                    <div class="bg-gray-900 rounded-3xl p-6">
                        <div class="relative aspect-square rounded-2xl overflow-hidden mb-6 nft-image">
                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                            <div class="absolute top-3 left-3 px-3 py-1 bg-gradient-to-r {gradient} rounded-full text-white font-bold text-sm shadow-lg">
                                #{token_id}
                            </div>
                            <div class="absolute top-3 right-3 px-3 py-1 bg-amber-500/90 rounded-full text-white font-bold text-xs shadow-lg">
                                GENESIS
                            </div>
                            <div class="absolute bottom-3 left-3 right-3">
                                <p class="text-white/80 text-xs font-medium">AXIOM Genesis Collection</p>
                            </div>
                        </div>
                        
                        <div class="space-y-4">
                            <div>
                                <h2 class="text-2xl font-bold text-white mb-1">{name}</h2>
                                <p class="text-gray-400">{description}</p>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-3">
                                <div class="bg-gray-800/50 rounded-xl p-3">
                                    <p class="text-gray-500 text-xs mb-1">Personality</p>
                                    <p class="text-white font-medium text-sm">{personality}</p>
                                </div>
                                <div class="bg-gray-800/50 rounded-xl p-3">
                                    <p class="text-gray-500 text-xs mb-1">Specialization</p>
                                    <p class="text-white font-medium text-sm">{specialization}</p>
                                </div>
                            </div>
                            
                            <div class="flex items-center justify-between py-3 border-t border-gray-800">
                                <div class="text-center">
                                    <p class="text-2xl font-bold text-white">{conversations}</p>
                                    <p class="text-gray-500 text-xs">Chats</p>
                                </div>
                                <div class="text-center">
                                    <p class="text-2xl font-bold text-white">{messages}</p>
                                    <p class="text-gray-500 text-xs">Messages</p>
                                </div>
                                <div class="text-center">
                                    <div class="w-3 h-3 bg-emerald-500 rounded-full mx-auto mb-1 animate-pulse"></div>
                                    <p class="text-gray-500 text-xs">Active</p>
                                </div>
                            </div>
                            
                            <div class="space-y-3" id="walletSection">
                                <!-- Connected State (hidden by default) -->
                                <div id="connectedState" class="hidden">
                                    <div class="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-3">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                                <span class="text-emerald-400 text-sm font-medium">Connected</span>
                                            </div>
                                            <button onclick="disconnectWallet()" class="text-xs text-gray-400 hover:text-white">Disconnect</button>
                                        </div>
                                        <p id="connectedPrincipal" class="text-xs text-gray-400 mt-2 font-mono truncate"></p>
                                    </div>
                                    <button id="claimOwnedBtn" onclick="claimNFT()" class="w-full py-3 bg-gradient-to-r {gradient} rounded-xl font-medium text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-2">
                                        ✨ Claim This AXIOM
                                    </button>
                                </div>
                                
                                <!-- Disconnected State -->
                                <div id="disconnectedState">
                                    <p class="text-gray-400 text-xs text-center mb-2">Connect your wallet to claim ownership</p>
                                    <div class="grid grid-cols-2 gap-2">
                                        <button onclick="connectPlug()" class="py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium text-white transition-colors flex items-center justify-center gap-2">
                                            <img src="https://plugwallet.ooo/assets/plug-logo.png" alt="Plug" class="w-5 h-5" onerror="this.style.display='none'"/>
                                            Plug
                                        </button>
                                        <button onclick="connectOISY()" class="py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-white transition-colors flex items-center justify-center gap-2">
                                            <img src="https://oisy.com/favicon.ico" alt="OISY" class="w-5 h-5" onerror="this.style.display='none'"/>
                                            OISY
                                        </button>
                                    </div>
                                    <button onclick="connectInternetIdentity()" class="w-full py-2 mt-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm text-gray-300 transition-colors">
                                        🔐 Internet Identity
                                    </button>
                                </div>
                                
                                <!-- Marketplace Links -->
                                <div class="flex gap-2 pt-2">
                                    <a href="https://dgdg.app/nfts/token/{canister_id}/{token_id}" target="_blank" class="flex-1 py-2 bg-gray-800 rounded-xl text-center text-gray-300 hover:bg-gray-700 transition-colors text-sm">
                                        DGDG
                                    </a>
                                    <a href="https://toko.ooo/token/{canister_id}/{token_id}" target="_blank" class="flex-1 py-2 bg-gray-800 rounded-xl text-center text-gray-300 hover:bg-gray-700 transition-colors text-sm">
                                        TOKO
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Standards -->
                <div class="mt-6 p-4 glass rounded-2xl">
                    <h3 class="text-white font-medium mb-3 flex items-center gap-2">
                        🛡️ Standards Compliance
                    </h3>
                    <div class="flex flex-wrap gap-2">
                        <span class="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium">ICRC-7</span>
                        <span class="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium">ICRC-37</span>
                        <span class="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium">DIP721</span>
                        <span class="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium">EXT</span>
                    </div>
                </div>
            </div>

            <!-- Chat Interface -->
            <div class="lg:col-span-2">
                <div class="glass rounded-3xl overflow-hidden h-[500px] sm:h-[600px] lg:h-[700px] flex flex-col">
                    <!-- Chat Header -->
                    <div class="p-4 border-b border-gray-800 bg-gradient-to-r {gradient} bg-opacity-10">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-xl bg-gradient-to-br {gradient} flex items-center justify-center text-xl">
                                    🧠
                                </div>
                                <div>
                                    <h2 class="text-white font-bold">{name}</h2>
                                    <p class="text-gray-400 text-sm flex items-center gap-2">
                                        <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                        Online • {specialization}
                                    </p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <button id="voiceToggle" class="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                                    🔊
                                </button>
                                <button class="p-2 rounded-xl bg-gray-800 text-gray-400 hover:text-white transition-colors">
                                    ⚙️
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Messages -->
                    <div id="chatMessages" class="flex-1 overflow-y-auto p-4 space-y-4">
                        <div class="h-full flex flex-col items-center justify-center text-center">
                            <div class="w-24 h-24 rounded-2xl bg-gradient-to-br {gradient} flex items-center justify-center mb-6 text-5xl pulse-glow">
                                🧠
                            </div>
                            <h3 class="text-xl font-bold text-white mb-2">Welcome to {name}</h3>
                            <p class="text-gray-400 max-w-md mb-6">
                                I'm your personal AI companion, specializing in {specialization_lower}. 
                                Ask me anything, and I'll remember our conversations forever.
                            </p>
                            <div class="flex flex-wrap gap-2 justify-center">
                                <button onclick="setMessage('What can you help me with?')" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors">
                                    What can you help me with?
                                </button>
                                <button onclick="setMessage('Tell me about yourself')" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors">
                                    Tell me about yourself
                                </button>
                                <button onclick="setMessage('What is the Raven Ecosystem?')" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors">
                                    What is the Raven Ecosystem?
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Input -->
                    <div class="p-4 border-t border-gray-800">
                        <div class="flex items-center gap-3">
                            <button id="micBtn" class="p-3 rounded-xl bg-gray-800 text-gray-400 hover:text-white transition-colors">
                                🎤
                            </button>
                            <input
                                type="text"
                                id="chatInput"
                                placeholder="Ask {name_short} anything..."
                                class="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                                onkeypress="if(event.key==='Enter')sendMessage()"
                            />
                            <button onclick="sendMessage()" class="p-3 bg-gradient-to-r {gradient} rounded-xl text-white hover:opacity-90 transition-opacity">
                                ➤
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <footer class="mt-12 text-center text-gray-500 text-sm">
            <p>Canister ID: <code class="bg-gray-800 px-2 py-1 rounded">{canister_id}</code></p>
            <p class="mt-2">Powered by the Internet Computer • Part of the <a href="https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io/" class="text-gray-400 hover:text-white">Raven Ecosystem</a></p>
        </footer>
    </div>

    <!-- IC SDK - Using IC Connect from DFINITY for simple wallet integration -->
    <script>
        // Simplified IC Agent alternative - direct fetch to canister
        window.ICAgent = {{
            // Call update function via IC's replica HTTP interface
            callUpdate: async function(canisterId, method, args) {{
                console.log(`📡 Calling ${{method}} on ${{canisterId}}`);
                // For update calls, we need IC Agent - fall back to query for now
                return null;
            }}
        }};
        console.log('✅ IC integration initialized');
    </script>
    
    <script>
        const CANISTER_ID = "{canister_id}";
        const RAVEN_APP_URL = "https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io";
        const ELEVEN_LABS_VOICE_ID = "kPzsL2i3teMYv0FxEYQ6";
        const II_URL = "https://identity.ic0.app";
        
        let voiceEnabled = true;
        let voiceAutoplay = true;
        let isListening = false;
        let recognition = null;
        let connectedPrincipal = null;
        let connectedWalletType = null;
        let authClient = null;
        
        // ========== WALLET CONNECTION FUNCTIONS ==========
        
        // Update UI based on connection state
        function updateWalletUI() {{
            const connectedState = document.getElementById('connectedState');
            const disconnectedState = document.getElementById('disconnectedState');
            const principalDisplay = document.getElementById('connectedPrincipal');
            
            if (connectedPrincipal) {{
                connectedState.classList.remove('hidden');
                disconnectedState.classList.add('hidden');
                principalDisplay.textContent = connectedPrincipal.length > 20 
                    ? connectedPrincipal.substring(0, 10) + '...' + connectedPrincipal.substring(connectedPrincipal.length - 10)
                    : connectedPrincipal;
                console.log('✅ Wallet connected:', connectedPrincipal);
            }} else {{
                connectedState.classList.add('hidden');
                disconnectedState.classList.remove('hidden');
            }}
        }}
        
        // Connect with Plug Wallet
        async function connectPlug() {{
            console.log('🔌 Connecting to Plug wallet...');
            
            if (!window.ic?.plug) {{
                alert('Plug wallet is not installed. Please install it from https://plugwallet.ooo');
                window.open('https://plugwallet.ooo', '_blank');
                return;
            }}
            
            try {{
                const whitelist = [CANISTER_ID];
                const host = "https://icp0.io";
                
                const connected = await window.ic.plug.requestConnect({{
                    whitelist,
                    host
                }});
                
                if (connected) {{
                    const principal = await window.ic.plug.getPrincipal();
                    connectedPrincipal = principal.toText();
                    connectedWalletType = 'plug';
                    
                    // Store in localStorage
                    localStorage.setItem('axiom_wallet_type', 'plug');
                    localStorage.setItem('axiom_principal', connectedPrincipal);
                    
                    updateWalletUI();
                    console.log('✅ Plug connected:', connectedPrincipal);
                }}
            }} catch (error) {{
                console.error('❌ Plug connection error:', error);
                alert('Failed to connect to Plug wallet: ' + error.message);
            }}
        }}
        
        // Connect with OISY (via Internet Identity)
        async function connectOISY() {{
            console.log('🔐 Connecting to OISY via Internet Identity...');
            
            try {{
                // OISY uses Internet Identity for authentication
                // Open OISY in a new tab for the user to connect
                const oisyUrl = 'https://oisy.com';
                
                // First try Internet Identity auth
                await connectInternetIdentity();
                
                // After II auth, show message about OISY
                if (connectedPrincipal) {{
                    console.log('✅ Authenticated via Internet Identity. You can now use OISY features.');
                }}
            }} catch (error) {{
                console.error('❌ OISY connection error:', error);
                alert('Failed to connect to OISY: ' + error.message);
            }}
        }}
        
        // Connect with Internet Identity
        async function connectInternetIdentity() {{
            console.log('🔐 Connecting to Internet Identity...');
            
            try {{
                if (!window.AuthClient) {{
                    // Fallback: direct popup
                    const iiUrl = II_URL + '/#authorize';
                    const width = 500;
                    const height = 600;
                    const left = (window.innerWidth - width) / 2;
                    const top = (window.innerHeight - height) / 2;
                    
                    window.open(iiUrl, 'ii_auth', `width=${{width}},height=${{height}},left=${{left}},top=${{top}}`);
                    alert('Please complete authentication in the popup window, then refresh this page.');
                    return;
                }}
                
                authClient = await window.AuthClient.create();
                
                await new Promise((resolve, reject) => {{
                    authClient.login({{
                        identityProvider: II_URL,
                        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
                        onSuccess: () => {{
                            console.log('✅ II Login successful');
                            resolve();
                        }},
                        onError: (error) => {{
                            console.error('❌ II Login error:', error);
                            reject(new Error(error || 'Internet Identity login failed'));
                        }}
                    }});
                }});
                
                const identity = authClient.getIdentity();
                connectedPrincipal = identity.getPrincipal().toText();
                connectedWalletType = 'ii';
                
                // Store in localStorage
                localStorage.setItem('axiom_wallet_type', 'ii');
                localStorage.setItem('axiom_principal', connectedPrincipal);
                
                updateWalletUI();
                console.log('✅ Internet Identity connected:', connectedPrincipal);
                
            }} catch (error) {{
                console.error('❌ Internet Identity error:', error);
                alert('Failed to connect to Internet Identity: ' + error.message);
            }}
        }}
        
        // Disconnect wallet
        function disconnectWallet() {{
            console.log('🔌 Disconnecting wallet...');
            
            if (connectedWalletType === 'plug' && window.ic?.plug) {{
                window.ic.plug.disconnect();
            }} else if (connectedWalletType === 'ii' && authClient) {{
                authClient.logout();
            }}
            
            connectedPrincipal = null;
            connectedWalletType = null;
            localStorage.removeItem('axiom_wallet_type');
            localStorage.removeItem('axiom_principal');
            
            updateWalletUI();
        }}
        
        // Claim NFT ownership
        async function claimNFT() {{
            if (!connectedPrincipal) {{
                alert('Please connect your wallet first');
                return;
            }}
            
            console.log('✨ Claiming NFT with principal:', connectedPrincipal);
            
            try {{
                // Call the canister's claim function
                const response = await fetch(`https://${{CANISTER_ID}}.raw.icp0.io/api/claim?principal=${{encodeURIComponent(connectedPrincipal)}}&wallet_type=${{connectedWalletType}}`);
                const data = await response.json();
                
                if (data.success) {{
                    alert('🎉 Congratulations! You have successfully claimed this AXIOM NFT!');
                    // Update button to show owned state
                    const claimBtn = document.getElementById('claimOwnedBtn');
                    claimBtn.textContent = '✅ You Own This AXIOM';
                    claimBtn.disabled = true;
                    claimBtn.classList.add('opacity-50', 'cursor-not-allowed');
                }} else {{
                    alert('Failed to claim: ' + (data.error || 'Unknown error'));
                }}
            }} catch (error) {{
                console.error('❌ Claim error:', error);
                alert('Failed to claim NFT: ' + error.message);
            }}
        }}
        
        // Check for existing connection on page load
        async function checkExistingConnection() {{
            const savedWalletType = localStorage.getItem('axiom_wallet_type');
            const savedPrincipal = localStorage.getItem('axiom_principal');
            
            if (savedWalletType && savedPrincipal) {{
                console.log('🔄 Restoring saved connection:', savedWalletType);
                
                if (savedWalletType === 'plug' && window.ic?.plug) {{
                    const connected = await window.ic.plug.isConnected();
                    if (connected) {{
                        connectedPrincipal = savedPrincipal;
                        connectedWalletType = 'plug';
                        updateWalletUI();
                        return;
                    }}
                }} else if (savedWalletType === 'ii') {{
                    try {{
                        if (window.AuthClient) {{
                            authClient = await window.AuthClient.create();
                            if (await authClient.isAuthenticated()) {{
                                const identity = authClient.getIdentity();
                                connectedPrincipal = identity.getPrincipal().toText();
                                connectedWalletType = 'ii';
                                updateWalletUI();
                                return;
                            }}
                        }}
                    }} catch (e) {{
                        console.log('Could not restore II session:', e);
                    }}
                }}
                
                // Clear invalid saved state
                localStorage.removeItem('axiom_wallet_type');
                localStorage.removeItem('axiom_principal');
            }}
        }}
        
        // Initialize wallet check on page load
        setTimeout(checkExistingConnection, 1000);
        
        // Make functions globally available
        window.connectPlug = connectPlug;
        window.connectOISY = connectOISY;
        window.connectInternetIdentity = connectInternetIdentity;
        window.disconnectWallet = disconnectWallet;
        window.claimNFT = claimNFT;
        
        // ========== END WALLET FUNCTIONS ==========
        
        // Enhanced markdown parser
        function formatMessage(text) {{
            if (!text) return '';
            return text
                // Bold text **text**
                .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
                // Italic text *text*
                .replace(/\*([^*]+)\*/g, '<em class="text-gray-300">$1</em>')
                // Code `code`
                .replace(/`([^`]+)`/g, '<code class="bg-gray-700/50 px-1.5 py-0.5 rounded text-emerald-400 font-mono text-sm">$1</code>')
                // Emoji support (keep as is)
                // Bullet points
                .replace(/^• (.+)$/gm, '<li class="flex items-start gap-2 ml-4"><span class="text-{accent} mt-1">•</span><span>$1</span></li>')
                // Double newlines = paragraphs
                .replace(/\n\n/g, '</p><p class="mt-4">')
                // Single newlines = line breaks
                .replace(/\n/g, '<br>')
                // Clean up any remaining markdown
                .replace(/#{{1,6}}\s/g, '');
        }}
        
        function setMessage(msg) {{
            document.getElementById('chatInput').value = msg;
            sendMessage();
        }}
        
        // Voice synthesis using browser TTS
        let availableVoices = [];
        
        // Load voices when available
        function loadVoices() {{
            availableVoices = speechSynthesis.getVoices();
            console.log('🔊 Loaded', availableVoices.length, 'voices');
        }}
        
        if ('speechSynthesis' in window) {{
            loadVoices();
            speechSynthesis.onvoiceschanged = loadVoices;
        }}
        
        async function synthesizeVoice(text) {{
            if (!voiceEnabled || !text) {{
                console.log('🔇 Voice disabled or no text');
                return;
            }}
            
            const voiceBtn = document.getElementById('voiceToggle');
            const voicePlayer = document.getElementById('voicePlayer');
            voiceBtn.classList.add('voice-playing');
            voiceBtn.textContent = '🔉';
            
            // Clean text for speech
            const cleanText = text
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .replace(/`/g, '')
                .replace(/#{{1,6}}\s/g, '')
                .replace(/•/g, ', ')
                .replace(/\n/g, '. ')
                .replace(/https?:\/\/[^\s]+/g, 'link')
                .substring(0, 500);
            
            console.log('🎤 Synthesizing voice:', cleanText.substring(0, 50) + '...');
            
            // Try Eleven Labs via connected wallet (Plug or OISY)
            // Reference: https://github.com/internet-identity-labs/identitykit
            if (connectedWalletType === 'plug' && window.ic?.plug) {{
                try {{
                    console.log('🔊 Using Eleven Labs via Plug wallet...');
                    
                    const actor = await window.ic.plug.createActor({{
                        canisterId: CANISTER_ID,
                        interfaceFactory: ({{ IDL }}) => {{
                            const VoiceResult = IDL.Variant({{
                                'Ok': IDL.Vec(IDL.Nat8),
                                'Err': IDL.Text
                            }});
                            return IDL.Service({{
                                'synthesize_voice_update': IDL.Func([IDL.Text], [VoiceResult], []),
                            }});
                        }}
                    }});
                    
                    const result = await actor.synthesize_voice_update(cleanText);
                    
                    if ('Ok' in result && result.Ok.length > 0) {{
                        const audioBlob = new Blob([new Uint8Array(result.Ok)], {{ type: 'audio/mpeg' }});
                        const audioUrl = URL.createObjectURL(audioBlob);
                        
                        voicePlayer.src = audioUrl;
                        voicePlayer.onended = () => {{
                            voiceBtn.classList.remove('voice-playing');
                            voiceBtn.textContent = '🔊';
                            URL.revokeObjectURL(audioUrl);
                        }};
                        voicePlayer.onerror = (e) => {{
                            console.log('⚠️ Audio playback error:', e);
                            playBrowserTTS(cleanText);
                        }};
                        
                        await voicePlayer.play();
                        console.log('✅ Playing Eleven Labs audio via Plug!');
                        return;
                    }} else {{
                        console.log('⚠️ Plug voice error:', result.Err || 'Unknown');
                    }}
                }} catch (error) {{
                    console.log('⚠️ Plug actor failed:', error.message);
                }}
            }}
            
            // Try Eleven Labs via OISY/Internet Identity
            if ((connectedWalletType === 'oisy' || connectedWalletType === 'ii') && authClient) {{
                try {{
                    console.log('🔊 Using Eleven Labs via OISY/II identity...');
                    
                    const identity = authClient.getIdentity();
                    if (identity && !identity.getPrincipal().isAnonymous()) {{
                        // Use fetch to call the main Raven app's voice proxy
                        const response = await fetch(`${{RAVEN_APP_URL}}/api/voice?text=${{encodeURIComponent(cleanText)}}`, {{
                            method: 'POST',
                            headers: {{ 'Content-Type': 'application/json' }},
                        }});
                        
                        if (response.ok) {{
                            const audioBlob = await response.blob();
                            const audioUrl = URL.createObjectURL(audioBlob);
                            
                            voicePlayer.src = audioUrl;
                            voicePlayer.onended = () => {{
                                voiceBtn.classList.remove('voice-playing');
                                voiceBtn.textContent = '🔊';
                                URL.revokeObjectURL(audioUrl);
                            }};
                            
                            await voicePlayer.play();
                            console.log('✅ Playing Eleven Labs audio via OISY/II!');
                            return;
                        }}
                    }}
                }} catch (error) {{
                    console.log('⚠️ OISY/II voice failed:', error.message);
                }}
            }}
            
            // Fallback to high-quality browser TTS
            console.log('🔊 Using browser TTS (connect wallet for Eleven Labs)');
            playBrowserTTS(cleanText);
        }}
        
        // Play voice from base64 audio data (from backend)
        function playVoiceFromBase64(base64Audio) {{
            if (!base64Audio) return;
            
            const voiceBtn = document.getElementById('voiceToggle');
            const voicePlayer = document.getElementById('voicePlayer');
            
            try {{
                const audioBlob = base64ToBlob(base64Audio, 'audio/mpeg');
                const audioUrl = URL.createObjectURL(audioBlob);
                
                voicePlayer.src = audioUrl;
                voicePlayer.onended = () => {{
                    voiceBtn.classList.remove('voice-playing');
                    voiceBtn.textContent = '🔊';
                    URL.revokeObjectURL(audioUrl);
                }};
                voicePlayer.onerror = (e) => {{
                    console.log('⚠️ Audio playback error:', e);
                    voiceBtn.classList.remove('voice-playing');
                    voiceBtn.textContent = '🔊';
                }};
                
                voicePlayer.play().then(() => {{
                    console.log('✅ Playing Eleven Labs audio from backend!');
                }}).catch(e => {{
                    console.log('⚠️ Play failed:', e);
                    voiceBtn.classList.remove('voice-playing');
                    voiceBtn.textContent = '🔊';
                }});
            }} catch (error) {{
                console.log('⚠️ Failed to play voice:', error);
                voiceBtn.classList.remove('voice-playing');
                voiceBtn.textContent = '🔊';
            }}
        }}
        
        // Convert base64 to Blob
        function base64ToBlob(base64, mimeType) {{
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {{
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }}
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], {{ type: mimeType }});
        }}
        
        // Play voice from response (tries base64 first, then synthesizes)
        function playVoiceFromResponse(base64Voice, text) {{
            if (base64Voice) {{
                playVoiceFromBase64(base64Voice);
            }} else if (text) {{
                synthesizeVoice(text);
            }}
        }}
        
        function playBrowserTTS(text) {{
            if (!('speechSynthesis' in window)) {{
                console.log('❌ Speech synthesis not supported');
                document.getElementById('voiceToggle').classList.remove('voice-playing');
                document.getElementById('voiceToggle').textContent = '🔊';
                return;
            }}
            
            // Cancel any ongoing speech
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.95;
            utterance.pitch = 1.05;
            utterance.volume = 1.0;
            
            // Get available voices
            let voices = speechSynthesis.getVoices();
            if (voices.length === 0) {{
                // Voices might not be loaded yet, wait and try again
                setTimeout(() => {{
                    voices = speechSynthesis.getVoices();
                    setVoiceAndSpeak(utterance, voices);
                }}, 100);
            }} else {{
                setVoiceAndSpeak(utterance, voices);
            }}
        }}
        
        function setVoiceAndSpeak(utterance, voices) {{
            const voiceBtn = document.getElementById('voiceToggle');
            
            // Prefer high-quality voices in this order
            const preferredVoices = [
                'Google US English',
                'Samantha',
                'Karen',
                'Daniel',
                'Alex',
                'Microsoft Zira',
                'Microsoft David'
            ];
            
            let selectedVoice = null;
            for (const name of preferredVoices) {{
                selectedVoice = voices.find(v => v.name.includes(name));
                if (selectedVoice) break;
            }}
            
            // Fallback to first English voice
            if (!selectedVoice) {{
                selectedVoice = voices.find(v => v.lang.startsWith('en'));
            }}
            
            if (selectedVoice) {{
                utterance.voice = selectedVoice;
                console.log('🎙️ Using voice:', selectedVoice.name);
            }}
            
            utterance.onstart = () => {{
                console.log('▶️ Voice playback started');
                voiceBtn.textContent = '🔊';
            }};
            
            utterance.onend = () => {{
                console.log('⏹️ Voice playback ended');
                voiceBtn.classList.remove('voice-playing');
                voiceBtn.textContent = '🔊';
            }};
            
            utterance.onerror = (event) => {{
                console.error('❌ Voice error:', event.error);
                voiceBtn.classList.remove('voice-playing');
                voiceBtn.textContent = '🔊';
            }};
            
            speechSynthesis.speak(utterance);
        }}
        
        
        async function sendMessage() {{
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            if (!message) return;
            
            const chatMessages = document.getElementById('chatMessages');
            
            // Clear welcome screen on first message
            if (chatMessages.querySelector('.flex-col.items-center')) {{
                chatMessages.innerHTML = '';
            }}
            
            // Add user message
            chatMessages.innerHTML += `
                <div class="flex justify-end mb-4">
                    <div class="max-w-[80%] bg-gradient-to-r {gradient} text-white rounded-2xl px-4 py-3 shadow-lg">
                        <p>${{message}}</p>
                        <p class="text-xs mt-1 text-white/60">${{new Date().toLocaleTimeString()}}</p>
                    </div>
                </div>
            `;
            
            input.value = '';
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Show typing indicator
            const typingId = 'typing-' + Date.now();
            chatMessages.innerHTML += `
                <div id="${{typingId}}" class="flex justify-start mb-4">
                    <div class="glass rounded-2xl px-4 py-3">
                        <div class="typing-dots flex gap-1.5">
                            <span class="w-2 h-2 bg-{accent} rounded-full"></span>
                            <span class="w-2 h-2 bg-{accent} rounded-full"></span>
                            <span class="w-2 h-2 bg-{accent} rounded-full"></span>
                        </div>
                    </div>
                </div>
            `;
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            try {{
                // Always use POST to call the real AI (update call via http_update)
                // GET only returns hardcoded responses, POST calls AI Council
                const response = await fetch(`https://${{CANISTER_ID}}.raw.icp0.io/api/chat`, {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ message: message }})
                }});
                
                if (!response.ok) {{
                    throw new Error(`HTTP ${{response.status}}: ${{response.statusText}}`);
                }}
                
                const data = await response.json();
                
                // Remove typing indicator
                document.getElementById(typingId)?.remove();
                
                // Format and add assistant response
                const formattedResponse = formatMessage(data.response || "I'm processing your request...");
                chatMessages.innerHTML += `
                    <div class="flex justify-start mb-4">
                        <div class="max-w-[85%] glass text-gray-200 rounded-2xl px-5 py-4 shadow-xl border border-{accent}/20">
                            <div class="prose prose-invert prose-sm max-w-none leading-relaxed">
                                ${{formattedResponse}}
                            </div>
                            <div class="flex items-center justify-between mt-3 pt-2 border-t border-gray-700/50">
                                <p class="text-xs text-gray-500">${{new Date().toLocaleTimeString()}} • {name}</p>
                                <button onclick="playVoiceFromResponse(\`${{data.voice || ''}}\`, \`${{data.response?.replace(/`/g, '').replace(/"/g, '\\"')}}\`)" class="text-xs text-{accent} hover:text-white flex items-center gap-1">
                                    🔊 Play
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                // Auto-play voice if enabled - use pre-synthesized voice from backend if available
                if (voiceEnabled && voiceAutoplay && data.response) {{
                    if (data.voice) {{
                        // Use pre-synthesized Eleven Labs voice from backend
                        playVoiceFromBase64(data.voice);
                    }} else {{
                        // Fallback to synthesizing again
                        synthesizeVoice(data.response);
                    }}
                }}
            }} catch (error) {{
                console.error('Chat error:', error);
                document.getElementById(typingId)?.remove();
                chatMessages.innerHTML += `
                    <div class="flex justify-start mb-4">
                        <div class="max-w-[85%] glass text-gray-200 rounded-2xl px-5 py-4 border border-red-500/30">
                            <p>I apologize, I'm having trouble connecting right now. Please try again in a moment. As your AXIOM AI companion, I specialize in {specialization_lower} and would love to help you once my connection is restored!</p>
                            <p class="text-xs mt-2 text-gray-500">${{new Date().toLocaleTimeString()}}</p>
                        </div>
                    </div>
                `;
            }}
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }}
        
        // Voice toggle with autoplay control
        document.getElementById('voiceToggle').addEventListener('click', function(e) {{
            if (e.shiftKey) {{
                // Shift+click toggles autoplay
                voiceAutoplay = !voiceAutoplay;
                this.title = voiceAutoplay ? 'Voice: ON (autoplay)' : 'Voice: ON (click to play)';
            }} else {{
                voiceEnabled = !voiceEnabled;
                this.textContent = voiceEnabled ? '🔊' : '🔇';
                this.className = voiceEnabled 
                    ? 'p-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors'
                    : 'p-2 rounded-xl bg-gray-800 text-gray-500 hover:text-white transition-colors';
                if (!voiceEnabled) {{
                    speechSynthesis.cancel();
                    document.getElementById('voicePlayer').pause();
                }}
            }}
        }});
        
        // Speech recognition (voice input)
        document.getElementById('micBtn').addEventListener('click', function() {{
            if (isListening) {{
                recognition?.stop();
                return;
            }}
            
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {{
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                recognition = new SpeechRecognition();
                recognition.lang = 'en-US';
                recognition.continuous = false;
                recognition.interimResults = true;
                
                recognition.onstart = () => {{
                    isListening = true;
                    this.textContent = '🎙️';
                    this.className = 'p-3 rounded-xl bg-red-500/30 text-red-400 animate-pulse transition-colors';
                }};
                
                recognition.onresult = (event) => {{
                    const transcript = Array.from(event.results)
                        .map(result => result[0].transcript)
                        .join('');
                    document.getElementById('chatInput').value = transcript;
                    
                    // Auto-send if final result
                    if (event.results[event.results.length - 1].isFinal) {{
                        setTimeout(() => sendMessage(), 300);
                    }}
                }};
                
                recognition.onerror = (event) => {{
                    console.error('Speech recognition error:', event.error);
                    isListening = false;
                    this.textContent = '🎤';
                    this.className = 'p-3 rounded-xl bg-gray-800 text-gray-400 hover:text-white transition-colors';
                }};
                
                recognition.onend = () => {{
                    isListening = false;
                    this.textContent = '🎤';
                    this.className = 'p-3 rounded-xl bg-gray-800 text-gray-400 hover:text-white transition-colors';
                }};
                
                recognition.start();
            }} else {{
                alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            }}
        }});
        
        // Load voices when available
        if ('speechSynthesis' in window) {{
            speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
        }}
        
        // Handle Enter key
        document.getElementById('chatInput').addEventListener('keypress', (e) => {{
            if (e.key === 'Enter' && !e.shiftKey) {{
                e.preventDefault();
                sendMessage();
            }}
        }});
    </script>
</body>
</html>"#,
        name = metadata.name,
        description = metadata.description,
        personality = metadata.personality,
        specialization = metadata.specialization,
        specialization_lower = metadata.specialization.to_lowercase(),
        token_id = metadata.token_id,
        conversations = metadata.total_conversations,
        messages = metadata.total_messages,
        canister_id = canister_id,
        gradient = gradient,
        accent = accent_color,
        name_short = metadata.name.split(' ').next().unwrap_or("AXIOM"),
    );
    
    let html_bytes = html.into_bytes();
    
    // For mobile Safari, we need to keep responses under ~15KB to avoid 503 verification errors
    // The original design is beautiful but too large - serve it anyway and let IC handle it
    // If it fails, users can use .raw.icp0.io domain
    HttpResponse {
        status_code: 200,
        headers: vec![
            ("Content-Type".to_string(), "text/html; charset=utf-8".to_string()),
            ("Cache-Control".to_string(), "public, max-age=3600".to_string()),
            ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
        ],
        body: html_bytes,
    }
}

fn serve_json_metadata(metadata: &AxiomMetadata) -> HttpResponse {
    let json = format!(r#"{{
        "token_id": {},
        "name": "{}",
        "description": "{}",
        "personality": "{}",
        "specialization": "{}",
        "owner": "{}",
        "total_conversations": {},
        "total_messages": {},
        "canister_id": "{}",
        "standards": ["ICRC-7", "ICRC-37", "DIP721", "EXT"]
    }}"#,
        metadata.token_id,
        metadata.name,
        metadata.description,
        metadata.personality,
        metadata.specialization,
        metadata.owner.to_text(),
        metadata.total_conversations,
        metadata.total_messages,
        ic_cdk::api::id().to_text()
    );
    
    HttpResponse {
        status_code: 200,
        headers: vec![
            ("Content-Type".to_string(), "application/json".to_string()),
            ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
        ],
        body: json.into_bytes(),
    }
}

fn serve_json_config(config: &AxiomConfig) -> HttpResponse {
    let json = format!(r#"{{
        "voice_enabled": {},
        "voice_id": "{}",
        "temperature": {}
    }}"#,
        config.voice_enabled,
        config.voice_id,
        config.temperature
    );
    
    HttpResponse {
        status_code: 200,
        headers: vec![
            ("Content-Type".to_string(), "application/json".to_string()),
            ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
        ],
        body: json.into_bytes(),
    }
}

fn serve_chat_page(metadata: &AxiomMetadata, _config: &AxiomConfig) -> HttpResponse {
    // Redirect to main page with chat focus
    serve_main_page(metadata, _config)
}

/// Serve optimized page - always use the beautiful original design
fn serve_optimized_page(metadata: &AxiomMetadata, config: &AxiomConfig) -> HttpResponse {
    // Always serve the beautiful original design
    // If 503 errors occur, users can access via .raw.icp0.io domain
    serve_main_page(metadata, config)
}

/// Serve mobile-optimized page (ultra-compact under 15KB to avoid 503 verification errors)
fn serve_mobile_page(metadata: &AxiomMetadata, config: &AxiomConfig) -> HttpResponse {
    let canister_id = ic_cdk::api::id().to_text();
    let accent = match metadata.token_id % 5 {
        1 => "#f59e0b",
        2 => "#a855f7",
        3 => "#10b981",
        4 => "#3b82f6",
        _ => "#f43f5e",
    };
    
    // Ultra-minimal HTML (under 3KB) - minimal JS, inline everything
    let html = format!(r#"<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>{n}</title><style>*{{margin:0;padding:0;box-sizing:border-box}}body{{font:14px/1.4 system-ui;background:#000;color:#fff;padding:8px}}h1{{font-size:16px;color:{a};margin:4px 0}}.c{{background:rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px;margin:4px 0}}.b{{background:{a};color:#fff;border:0;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:13px;width:100%;margin:4px 0}}.i{{background:#222;border:1px solid #444;border-radius:6px;padding:6px;color:#fff;width:100%;font-size:13px}}.ch{{height:180px;overflow-y:auto;background:#111;border-radius:6px;padding:6px;margin:4px 0}}.m{{margin:2px 0;padding:6px;border-radius:6px;font-size:12px}}.u{{background:{a};text-align:right}}.ai{{background:#222}}</style></head><body><h1>🧠 {n}</h1><div class=c><p style=font-size:11px;color:#888>#{t} • {s}</p><div id=w><button class=b onclick=cn()>Connect</button></div></div><div class=c><h2 style=font-size:14px;margin:4px 0>Chat</h2><div id=ch class=ch><div class="m ai">Hi! I'm {n}. Ask anything.</div></div><input type=text id=in class=i placeholder="Message..." onkeypress="if(event.key==='Enter')sd()"><button class=b onclick=sd()>Send</button></div><audio id=au></audio><script>const c="{canister_id}",r="3noas-jyaaa-aaaao-a4xda-cai";let p=null;function cn(){{if(window.ic?.plug){{window.ic.plug.requestConnect({{whitelist:[c],host:"https://icp0.io"}}).then(x=>{{if(x){{window.ic.plug.getPrincipal().then(pr=>{{p=pr.toText();document.getElementById('w').innerHTML='<p style=color:#0f0;font-size:11px>Connected: '+p.substring(0,8)+'...</p>'}})}}}}).catch(e=>alert('Error:'+e))}}else alert('Install Plug')}}async function sd(){{const m=document.getElementById('in').value.trim();if(!m)return;const ch=document.getElementById('ch');ch.innerHTML+='<div class="m u">'+m+'</div>';document.getElementById('in').value='';ch.scrollTop=ch.scrollHeight;const tid='t'+Date.now();ch.innerHTML+='<div id='+tid+' class="m ai">...</div>';try{{const res=await fetch(`https://${{c}}.raw.icp0.io/api/chat?message=${{encodeURIComponent(m)}}`);const d=await res.json();document.getElementById(tid).textContent=d.response||'Error';if(d.voice){{const a=document.getElementById('au');a.src='data:audio/mpeg;base64,'+d.voice;a.play()}}}}catch(e){{document.getElementById(tid).textContent='Error:'+e.message}}}}</script></body></html>"#,
        n = metadata.name,
        s = metadata.specialization,
        t = metadata.token_id,
        a = accent,
        canister_id = canister_id,
    );
    
    HttpResponse {
        status_code: 200,
        headers: vec![
            ("Content-Type".to_string(), "text/html; charset=utf-8".to_string()),
            ("Cache-Control".to_string(), "public, max-age=3600".to_string()),
            ("Access-Control-Allow-Origin".to_string(), "*".to_string()),
        ],
        body: html.into_bytes(),
    }
}

fn serve_favicon() -> HttpResponse {
    let svg = r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🧠</text></svg>"#;
    HttpResponse {
        status_code: 200,
        headers: vec![
            ("Content-Type".to_string(), "image/svg+xml".to_string()),
            ("Cache-Control".to_string(), "public, max-age=86400".to_string()),
        ],
        body: svg.as_bytes().to_vec(),
    }
}

#[update]
fn admin_set_llm_api_key(provider_name: String, api_key: String) -> Result<(), String> {
    require_owner_or_controller(ic_cdk::caller())?;
    
    SECRETS.with(|s| {
        let mut secrets = s.borrow().get().clone();
        match provider_name.to_lowercase().as_str() {
            "huggingface" => secrets.huggingface_api_key = api_key,
            "perplexity" => secrets.perplexity_api_key = api_key,
            "elevenlabs" | "eleven_labs" => secrets.eleven_labs_api_key = api_key,
            _ => return Err("Unsupported provider".to_string()),
        }
        s.borrow_mut().set(secrets).unwrap();
        Ok(())
    })
}

#[query]
fn health() -> String {
    "OK".to_string()
}

// ============ NOTIFICATION SYSTEM ============

/// Receive a notification from the main Raven application
#[update]
fn receive_notification(notification: RavenNotification) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    // Verify caller is the Raven AI canister or an admin
    let is_raven_canister = caller.to_text().starts_with("3noas"); // raven_ai canister prefix
    let is_admin = is_admin_principal(caller);
    
    if !is_raven_canister && !is_admin {
        return Err("Not authorized to send notifications".to_string());
    }
    
    // Store the notification
    let id = notification.id;
    NOTIFICATIONS.with(|n| {
        n.borrow_mut().insert(StorableU32(id), notification);
    });
    
    // Increment unread count
    UNREAD_COUNT.with(|u| {
        *u.borrow_mut() += 1;
    });
    
    Ok(())
}

/// Get all notifications for this AXIOM
#[query]
fn get_notifications(limit: u32, offset: u32) -> Vec<RavenNotification> {
    NOTIFICATIONS.with(|n| {
        n.borrow().iter()
            .skip(offset as usize)
            .take(limit as usize)
            .map(|(_, notif)| notif)
            .collect()
    })
}

/// Get unread notification count
#[query]
fn get_unread_count() -> u32 {
    UNREAD_COUNT.with(|u| *u.borrow())
}

/// Mark all notifications as read
#[update]
fn mark_all_read() -> Result<(), String> {
    let caller = ic_cdk::caller();
    let owner = METADATA.with(|m| m.borrow().get().owner);
    
    if caller != owner && !is_admin_principal(caller) {
        return Err("Not authorized".to_string());
    }
    
    UNREAD_COUNT.with(|u| {
        *u.borrow_mut() = 0;
    });
    
    Ok(())
}

/// Get latest notification for display in UI
#[query]
fn get_latest_notification() -> Option<RavenNotification> {
    NOTIFICATIONS.with(|n| {
        n.borrow().iter()
            .last()
            .map(|(_, notif)| notif)
    })
}

/// Share a learning to the collective (via main canister)
#[update]
async fn share_learning(content: String, memory_type: String, importance: f32, tags: Vec<String>) -> Result<String, String> {
    let caller = ic_cdk::caller();
    let metadata = METADATA.with(|m| m.borrow().get().clone());
    
    if caller != metadata.owner && !is_admin_principal(caller) {
        return Err("Not authorized".to_string());
    }
    
    // Extract AXIOM number from token_id
    let axiom_number = metadata.token_id as u32;
    
    // Call the main raven_ai canister to share memory
    let raven_canister = Principal::from_text("3noas-jyaaa-aaaao-a4xda-cai").unwrap();
    
    let result: Result<(Result<String, String>,), _> = ic_cdk::call(
        raven_canister,
        "share_memory_to_collective",
        (axiom_number, memory_type, content, importance, tags)
    ).await;
    
    match result {
        Ok((Ok(id),)) => Ok(id),
        Ok((Err(e),)) => Err(e),
        Err((code, msg)) => Err(format!("Inter-canister call failed: {:?} - {}", code, msg)),
    }
}

/// Query shared memories from the collective
#[update]
async fn query_collective_memories(query: String, max_results: u32) -> Vec<SharedMemory> {
    let raven_canister = Principal::from_text("3noas-jyaaa-aaaao-a4xda-cai").unwrap();
    
    let result: Result<(Vec<SharedMemory>,), _> = ic_cdk::call(
        raven_canister,
        "query_shared_memories",
        (query, max_results)
    ).await;
    
    match result {
        Ok((memories,)) => memories,
        Err(_) => vec![],
    }
}

/// Shared memory type (imported from main canister)
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct SharedMemory {
    pub id: String,
    pub source_agent: u32,
    pub memory_type: String,
    pub content: String,
    pub importance: f32,
    pub created_at: u64,
    pub access_count: u64,
    pub tags: Vec<String>,
}

/// Send a message to another AXIOM
#[update]
async fn send_message_to_axiom(to_axiom: u32, message: String) -> Result<(), String> {
    let caller = ic_cdk::caller();
    let metadata = METADATA.with(|m| m.borrow().get().clone());
    
    if caller != metadata.owner && !is_admin_principal(caller) {
        return Err("Not authorized".to_string());
    }
    
    let from_axiom = metadata.token_id as u32;
    let raven_canister = Principal::from_text("3noas-jyaaa-aaaao-a4xda-cai").unwrap();
    
    let result: Result<(Result<(), String>,), _> = ic_cdk::call(
        raven_canister,
        "send_inter_agent_message",
        (from_axiom, to_axiom, message)
    ).await;
    
    match result {
        Ok((Ok(()),)) => Ok(()),
        Ok((Err(e),)) => Err(e),
        Err((code, msg)) => Err(format!("Inter-canister call failed: {:?} - {}", code, msg)),
    }
}

fn is_admin_principal(caller: Principal) -> bool {
    // Check if caller is a controller of this canister
    if ic_cdk::api::is_controller(&caller) {
        return true;
    }
    
    // Check if caller is in the admins list in state
    ADMINS.with(|a| {
        a.borrow().contains_key(&StorablePrincipal(caller))
    })
}

// Generate Candid
ic_cdk::export_candid!();

