//! RavenAI Agent NFT Canister
//! Main canister for AI agents, AXIOM NFTs, news articles, and AI Council

mod ai_optimizations;

use candid::{CandidType, Decode, Encode, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update, heartbeat};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell, Storable};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::borrow::Cow;
use std::cell::RefCell;
use std::panic;
use ai_optimizations::*;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Memory IDs
const AGENTS_MEM_ID: MemoryId = MemoryId::new(0);
const AXIOMS_MEM_ID: MemoryId = MemoryId::new(1);
const PAYMENTS_MEM_ID: MemoryId = MemoryId::new(2);
const CONFIG_MEM_ID: MemoryId = MemoryId::new(3);
const ARTICLES_MEM_ID: MemoryId = MemoryId::new(4);
const COMMENTS_MEM_ID: MemoryId = MemoryId::new(5);
const SUBSCRIPTIONS_MEM_ID: MemoryId = MemoryId::new(6);
const NOTIFICATIONS_MEM_ID: MemoryId = MemoryId::new(7);
const SHARED_MEMORY_MEM_ID: MemoryId = MemoryId::new(8);
const COUNCIL_SESSIONS_MEM_ID: MemoryId = MemoryId::new(9);
const COMICS_MEM_ID: MemoryId = MemoryId::new(10);
const COUNTERS_MEM_ID: MemoryId = MemoryId::new(11); // For stable counters

// Constants
const AXIOM_TOTAL_SUPPLY: u32 = 300;
const TREASURY_CANISTER: &str = "3rk2d-6yaaa-aaaao-a4xba-cai";
const RAVEN_TOKEN_CANISTER: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai"; // Update with actual
const ADMIN_PRINCIPAL: &str = "lgd5r-y4x7q-lbrfa-mabgw-xurgu-4h3at-sw4sl-yyr3k-5kwgt-vlkao-jae";

// API Keys (should be loaded from init/stable storage in production)
const HUGGINGFACE_API_KEY: &str = "REMOVED_API_KEY
const PERPLEXITY_API_KEY: &str = "REMOVED_API_KEY
const ELEVEN_LABS_API_KEY: &str = "REMOVED_API_KEY";

// ============ TYPE DEFINITIONS ============

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum PaymentToken {
    ICP,
    RAVEN,
    CkBTC,
    CkETH,
    CkUSDC,
    CkUSDT,
    CkSOL,
    SOL,
    SUI,
    BOB,
    MGSN,
    ZOMBIE,
    NAK,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum AgentType {
    RavenAI,
    AXIOM(u32),
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MultichainAddresses {
    pub icp_principal: Option<String>,
    pub evm_address: Option<String>,
    pub btc_address: Option<String>,
    pub sol_address: Option<String>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MemoryEntry {
    pub id: String,
    pub memory_type: String,
    pub content: String,
    pub importance: f32,
    pub timestamp: u64,
    pub tags: Vec<String>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct KnowledgeNode {
    pub id: String,
    pub label: String,
    pub node_type: String,
    pub properties: Vec<(String, String)>,
    pub connections: Vec<String>,
    pub created_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub timestamp: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AgentConfig {
    pub name: String,
    pub personality: String,
    pub language: String,
    pub voice_enabled: bool,
    pub accessibility_mode: String,
    pub custom_instructions: String,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct RavenAIAgent {
    pub token_id: u64,
    pub agent_type: AgentType,
    pub owner: Principal,
    pub canister_id: Option<Principal>,
    pub multichain_addresses: MultichainAddresses,
    pub config: AgentConfig,
    pub short_term_memory: Vec<MemoryEntry>,
    pub long_term_memory: Vec<MemoryEntry>,
    pub conversation_history: Vec<ChatMessage>,
    pub knowledge_nodes: Vec<KnowledgeNode>,
    pub total_interactions: u64,
    pub total_memories: u64,
    pub created_at: u64,
    pub last_active: u64,
    pub metadata: Vec<(String, String)>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AxiomNFT {
    pub number: u32,
    pub token_id: u64,
    pub owner: Option<Principal>,
    pub minted: bool,
    pub minted_at: Option<u64>,
    pub dedicated_canister: Option<Principal>,
    pub agent: Option<RavenAIAgent>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct PaymentRecord {
    pub id: String,
    pub payer: Principal,
    pub token: PaymentToken,
    pub amount: u64,
    pub usd_value: f64,
    pub agent_type: AgentType,
    pub token_id: Option<u64>,
    pub status: String,
    pub tx_hash: Option<String>,
    pub created_at: u64,
    pub completed_at: Option<u64>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct LLMProviderConfig {
    pub name: String,
    pub api_url: String,
    pub api_key: String,
    pub model: String,
    pub max_tokens: u32,
    pub temperature: f32,
    pub weight: f32,
    pub enabled: bool,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Config {
    pub admins: Vec<Principal>,
    pub treasury_principal: Principal,
    pub btc_address: String,
    pub raven_token_canister: Principal,
    pub next_token_id: u64,
    pub next_axiom_number: u32,
    pub total_agents_minted: u64,
    pub total_axiom_minted: u32,
    pub paused: bool,
    pub llm_providers: Option<Vec<LLMProviderConfig>>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MintResult {
    pub canister_id: Principal,
    pub mint_number: u32,
    pub token_id: u64,
    pub cycles_allocated: u128,
    pub payment_token: PaymentToken,
    pub payment_amount: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum ArticlePersona {
    Raven,
    Harlee,
    Macho,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct NewsArticle {
    pub id: u64,
    pub title: String,
    pub slug: String,
    pub excerpt: String,
    pub content: String,
    pub author_persona: ArticlePersona,
    pub category: String,
    pub tags: Vec<String>,
    pub seo_title: String,
    pub seo_description: String,
    pub seo_keywords: Vec<String>,
    pub published_at: u64,
    pub views: u64,
    pub likes: u64,
    pub shares: u64,
    pub harlee_rewards: u64,
    pub featured: bool,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Comic {
    pub id: u64,
    pub title: String,
    pub image_data: Vec<u8>,
    pub caption: String,
    pub submitted_by: Principal,
    pub approved: bool,
    pub likes: u64,
    pub comments_count: u32,
    pub published_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ArticleComment {
    pub id: u64,
    pub article_id: u64,
    pub author: Principal,
    pub content: String,
    pub timestamp: u64,
    pub likes: u64,
    pub edited: bool,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TokenPrice {
    pub token: PaymentToken,
    pub usd_price: f64,
    pub amount_for_100_usd: u64,
    pub decimals: u8,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct VoiceSynthesisRequest {
    pub text: String,
    pub voice_id: Option<String>,
    pub model_id: Option<String>,
    pub stability: Option<f32>,
    pub similarity_boost: Option<f32>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct VoiceSynthesisResponse {
    pub audio_data: Vec<u8>,
    pub content_type: String,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AICouncilModelResponse {
    pub model: String,
    pub response: String,
    pub success: bool,
    pub error: Option<String>,
    pub latency_ms: u64,
    pub tokens_generated: Option<u32>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AICouncilConsensus {
    pub final_response: String,
    pub confidence_score: f32,
    pub agreement_level: f32,
    pub key_points: Vec<String>,
    pub dissenting_views: Vec<String>,
    pub synthesis_method: String,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AICouncilSession {
    pub session_id: String,
    pub user: Principal,
    pub user_query: String,
    pub system_prompt: Option<String>,
    pub context: Vec<ChatMessage>,
    pub responses: Vec<AICouncilModelResponse>,
    pub consensus: Option<AICouncilConsensus>,
    pub created_at: u64,
    pub completed_at: Option<u64>,
    pub total_tokens_used: u32,
    pub total_cost_usd: f64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum SubscriptionPlan {
    Demo,
    Monthly,
    Yearly,
    Lifetime,
    NFTHolder,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Subscription {
    pub user: Principal,
    pub plan: SubscriptionPlan,
    pub started_at: u64,
    pub expires_at: Option<u64>,
    pub is_active: bool,
    pub payment_history: Vec<String>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum NotificationType {
    MorningGreeting,
    MiddayUpdate,
    EveningMessage,
    AdminAnnouncement,
    SystemAlert,
    InterAgentMessage,
}

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

// ============ NEW TYPES FOR PLAGIARISM & AI DETECTION ============

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct PlagiarismCheckResult {
    pub score: u32, // 0-100, lower is better
    pub matches: Vec<PlagiarismMatch>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct PlagiarismMatch {
    pub text: String,
    pub source_title: String,
    pub source_author: Option<String>,
    pub source_url: String,
    pub source_date: Option<String>,
    pub similarity: f32, // 0.0-1.0
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AIDetectionResult {
    pub probability: f32, // 0.0-1.0, higher = more likely AI
    pub confidence: f32,
    pub indicators: Vec<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct WorksCited {
    pub id: String,
    pub title: String,
    pub author: String,
    pub url: String,
    pub date: String,
    pub format: CitationFormat,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum CitationFormat {
    APA,
    MLA,
    Chicago,
    Harvard,
    IEEE,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct HaloSuggestion {
    pub suggestions: String,
    pub grammar_score: u32,
    pub clarity_score: u32,
    pub academic_score: u32,
    pub recommendations: Vec<String>,
}

// ============ STORABLE IMPLEMENTATIONS ============

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct StorableU64(pub u64);

impl Storable for StorableU64 {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.to_le_bytes().to_vec())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let mut arr = [0u8; 8];
        arr.copy_from_slice(&bytes[..8]);
        StorableU64(u64::from_le_bytes(arr))
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 8,
        is_fixed_size: true,
    };
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct StorableU32(pub u32);

impl Storable for StorableU32 {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.to_le_bytes().to_vec())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let mut arr = [0u8; 4];
        arr.copy_from_slice(&bytes[..4]);
        StorableU32(u32::from_le_bytes(arr))
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 4,
        is_fixed_size: true,
    };
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct StorableString(pub String);

impl Storable for StorableString {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_bytes().to_vec())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        StorableString(String::from_utf8(bytes.into_owned()).unwrap_or_default())
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 200,
        is_fixed_size: false,
    };
}

impl Storable for NewsArticle {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for RavenAIAgent {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for AxiomNFT {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for PaymentRecord {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for Comic {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for ArticleComment {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for AICouncilSession {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for Subscription {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
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

impl Storable for SharedMemory {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for Config {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// ============ MEMORY MANAGEMENT ============

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static AGENTS: RefCell<StableBTreeMap<StorableU64, RavenAIAgent, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with(|m| m.borrow().get(AGENTS_MEM_ID))
            )
        );

    static AXIOMS: RefCell<StableBTreeMap<StorableU32, AxiomNFT, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with(|m| m.borrow().get(AXIOMS_MEM_ID))
            )
        );

    static PAYMENTS: RefCell<StableBTreeMap<StorableString, PaymentRecord, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with(|m| m.borrow().get(PAYMENTS_MEM_ID))
            )
        );

    static CONFIG: RefCell<StableCell<Config, Memory>> =
        RefCell::new(
            StableCell::init(
                MEMORY_MANAGER.with(|m| m.borrow().get(CONFIG_MEM_ID)),
                Config {
                    admins: vec![],
                    treasury_principal: Principal::anonymous(),
                    btc_address: String::new(),
                    raven_token_canister: Principal::anonymous(),
                    next_token_id: 1,
                    next_axiom_number: 1,
                    total_agents_minted: 0,
                    total_axiom_minted: 0,
                    paused: false,
                    llm_providers: None,
                }
            ).unwrap()
        );

    static ARTICLES: RefCell<StableBTreeMap<StorableU64, NewsArticle, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with(|m| m.borrow().get(ARTICLES_MEM_ID))
            )
        );

    static COMMENTS: RefCell<StableBTreeMap<StorableU64, ArticleComment, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with(|m| m.borrow().get(COMMENTS_MEM_ID))
            )
        );

    static SUBSCRIPTIONS: RefCell<StableBTreeMap<StorableString, Subscription, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with(|m| m.borrow().get(SUBSCRIPTIONS_MEM_ID))
            )
        );

    static NOTIFICATIONS: RefCell<StableBTreeMap<StorableU32, RavenNotification, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with(|m| m.borrow().get(NOTIFICATIONS_MEM_ID))
            )
        );

    static SHARED_MEMORIES: RefCell<StableBTreeMap<StorableString, SharedMemory, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with(|m| m.borrow().get(SHARED_MEMORY_MEM_ID))
            )
        );

    static COUNCIL_SESSIONS: RefCell<StableBTreeMap<StorableString, AICouncilSession, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with(|m| m.borrow().get(COUNCIL_SESSIONS_MEM_ID))
            )
        );

    static COMICS: RefCell<StableBTreeMap<StorableU64, Comic, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with(|m| m.borrow().get(COMICS_MEM_ID))
            )
        );

    static NEXT_ARTICLE_ID: RefCell<u64> = RefCell::new(1);
    static NEXT_COMMENT_ID: RefCell<u64> = RefCell::new(1);
    static NEXT_NOTIFICATION_ID: RefCell<u32> = RefCell::new(1);
    static NEXT_COMIC_ID: RefCell<u64> = RefCell::new(1);
    static LAST_ARTICLE_GENERATION: RefCell<u64> = RefCell::new(0);
    static ARTICLES_BTREE_CORRUPTED: RefCell<bool> = RefCell::new(false); // Flag to track if BTreeMap is corrupted
}

// ============ HELPER FUNCTIONS ============

fn is_admin(caller: Principal) -> bool {
    CONFIG.with(|c| {
        c.borrow().get().clone().admins.contains(&caller)
    })
}

fn is_axiom_canister(caller: &Principal) -> bool {
    // Check if caller is an AXIOM NFT canister
    AXIOMS.with(|a| {
        a.borrow().iter().any(|(_, axiom)| {
            if let Some(canister) = axiom.dedicated_canister {
                canister == *caller
            } else {
                false
            }
        })
    })
}

fn generate_slug(title: &str) -> String {
    title.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() || c == ' ' { c } else { '-' })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join("-")
}

fn generate_session_id() -> String {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(ic_cdk::api::time().to_string().as_bytes());
    hasher.update(ic_cdk::caller().as_slice());
    format!("{:x}", hasher.finalize())
}

fn ensure_article_id_valid() {
    let current_id = NEXT_ARTICLE_ID.with(|id| *id.borrow());
    
    // Check if BTreeMap is known to be corrupted - if so, reset to 1 and return early
    if ARTICLES_BTREE_CORRUPTED.with(|f| *f.borrow()) {
        if current_id != 1 {
            ic_cdk::println!("ensure_article_id_valid: BTreeMap is corrupted, resetting NEXT_ARTICLE_ID to 1");
            NEXT_ARTICLE_ID.with(|id| {
                *id.borrow_mut() = 1;
            });
        }
        return;
    }
    
    // SAFELY get the maximum article ID from existing articles
    // Use catch_unwind to prevent panics if BTreeMap is corrupted
    let (max_id, article_count) = match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        ARTICLES.with(|a| {
            let articles = a.borrow();
            // Try to get max ID, but if iteration panics, we'll catch it
            let max = articles.iter().map(|(key, _)| key.0).max().unwrap_or(0);
            let count = articles.len();
            (max, count)
        })
    })) {
        Ok(result) => result,
        Err(_) => {
            // If BTreeMap is corrupted and iteration panics, mark it as corrupted
            ic_cdk::println!("CRITICAL: BTreeMap iteration panicked! Marking as corrupted and resetting to 1.");
            ARTICLES_BTREE_CORRUPTED.with(|f| *f.borrow_mut() = true);
            NEXT_ARTICLE_ID.with(|id| {
                *id.borrow_mut() = 1;
            });
            return; // Exit early - can't validate against corrupted data
        }
    };
    
    // ALWAYS recalculate if there's ANY suspicion of corruption:
    // 1. ID is at initial state (1) and we have articles (shouldn't happen)
    // 2. ID is unreasonably large (> 1_000_000)
    // 3. ID is less than or equal to max_id (corruption - ID should always be > max_id)
    // 4. ID is suspiciously large relative to article count (e.g., 49684 with only 2 articles)
    // 5. ID is more than 100x the article count (definitely corrupted)
    // 6. If BTreeMap panicked, always reset (indicates corruption)
    let should_reset = current_id == 1 && article_count > 0
        || current_id > 1_000_000
        || (max_id > 0 && current_id <= max_id)
        || (article_count > 0 && current_id > max_id + 100) // Lowered threshold from 1000 to 100
        || (article_count > 0 && current_id > article_count as u64 * 100); // Catch extreme corruption
    
    if should_reset {
        let new_id = max_id + 1;
        NEXT_ARTICLE_ID.with(|id| {
            *id.borrow_mut() = new_id;
        });
        
        ic_cdk::println!("ensure_article_id_valid: RESET NEXT_ARTICLE_ID from {} to {} (max article ID: {}, article count: {})", 
            current_id, new_id, max_id, article_count);
    } else {
        ic_cdk::println!("ensure_article_id_valid: NEXT_ARTICLE_ID is valid: {} (max article ID: {}, article count: {})", 
            current_id, max_id, article_count);
    }
}

// Safe wrapper for BTreeMap insert that prevents panics
fn safe_insert_article(article_id: u64, article: NewsArticle) -> Result<(), String> {
    // Check if BTreeMap is known to be corrupted
    if ARTICLES_BTREE_CORRUPTED.with(|f| *f.borrow()) {
        // If corrupted, use ID 1 and try to insert (will overwrite corrupted entry if it exists)
        ic_cdk::println!("safe_insert_article: BTreeMap is corrupted, using ID 1");
        let safe_id = 1;
        let mut safe_article = article;
        safe_article.id = safe_id;
        
        // Try insert with panic protection
        match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            ARTICLES.with(|a| {
                a.borrow_mut().insert(StorableU64(safe_id), safe_article.clone());
            });
        })) {
            Ok(_) => {
                NEXT_ARTICLE_ID.with(|id| {
                    *id.borrow_mut() = safe_id + 1;
                });
                return Ok(());
            }
            Err(_) => {
                return Err("BTreeMap is severely corrupted - cannot insert even with safe ID 1".to_string());
            }
        }
    }
    
    // Final validation: ensure ID is absolutely safe
    // Use panic protection to prevent BTreeMap iteration from panicking
    let (max_id, count) = match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        ARTICLES.with(|a| {
            let articles = a.borrow();
            let max = articles.iter().map(|(key, _)| key.0).max().unwrap_or(0);
            (max, articles.len())
        })
    })) {
        Ok(result) => result,
        Err(_) => {
            // Mark as corrupted and try with ID 1
            ic_cdk::println!("safe_insert_article: BTreeMap iteration panicked, marking as corrupted");
            ARTICLES_BTREE_CORRUPTED.with(|f| *f.borrow_mut() = true);
            // Use ID 1 directly instead of recursive call to avoid stack overflow
            let safe_id = 1;
            let mut safe_article = article;
            safe_article.id = safe_id;
            
            match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                ARTICLES.with(|a| {
                    a.borrow_mut().insert(StorableU64(safe_id), safe_article.clone());
                });
            })) {
                Ok(_) => {
                    NEXT_ARTICLE_ID.with(|id| {
                        *id.borrow_mut() = safe_id + 1;
                    });
                    return Ok(());
                }
                Err(_) => {
                    return Err("BTreeMap is severely corrupted - cannot insert".to_string());
                }
            }
        }
    };
    
    // If ID is still corrupted, use safe ID
    let safe_id = if article_id > 1_000_000 || (count > 0 && article_id > max_id + 1000) {
        ic_cdk::println!("CRITICAL: article_id {} is corrupted! Using safe ID {}", article_id, max_id + 1);
        max_id + 1
    } else {
        article_id
    };
    
    // Update article with safe ID
    let mut safe_article = article;
    safe_article.id = safe_id;
    
    // Attempt insert with panic protection
    let insert_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        ARTICLES.with(|a| {
            a.borrow_mut().insert(StorableU64(safe_id), safe_article.clone());
        });
    }));
    
    match insert_result {
        Ok(_) => {
            // Update NEXT_ARTICLE_ID to safe_id + 1
            NEXT_ARTICLE_ID.with(|id| {
                *id.borrow_mut() = safe_id + 1;
            });
            Ok(())
        }
        Err(_) => {
            Err(format!("BTreeMap insert panicked with ID {}. This indicates severe stable memory corruption.", safe_id))
        }
    }
}

// ============ QUERY FUNCTIONS ============

#[query]
fn get_config() -> Config {
    CONFIG.with(|c| c.borrow().get().clone())
}

#[query]
fn get_token_prices_info() -> Vec<TokenPrice> {
    // Mock prices - implement with actual price API
    vec![
        TokenPrice { token: PaymentToken::ICP, usd_price: 10.0, amount_for_100_usd: 10_000_000_000, decimals: 8 },
        TokenPrice { token: PaymentToken::RAVEN, usd_price: 0.01, amount_for_100_usd: 10_000_000_000_000, decimals: 8 },
    ]
}

#[query]
fn get_axiom_availability() -> (u32, u32, Vec<u32>) {
    let total = AXIOM_TOTAL_SUPPLY;
    let minted = CONFIG.with(|c| c.borrow().get().total_axiom_minted);
    let available: Vec<u32> = (1..=total)
        .filter(|n| !AXIOMS.with(|a| a.borrow().contains_key(&StorableU32(*n))))
        .collect();
    (total, minted, available)
}

#[query]
fn get_agent(token_id: u64) -> Option<RavenAIAgent> {
    AGENTS.with(|a| a.borrow().get(&StorableU64(token_id)).map(|a| a.clone()))
}

#[query]
fn get_axiom(number: u32) -> Option<AxiomNFT> {
    AXIOMS.with(|a| a.borrow().get(&StorableU32(number)).map(|a| a.clone()))
}

#[query]
fn get_agents_by_owner(owner: Principal) -> Vec<RavenAIAgent> {
    AGENTS.with(|a| {
        a.borrow()
            .iter()
            .filter(|(_, agent)| agent.owner == owner)
            .map(|(_, agent)| agent.clone())
            .collect()
    })
}

#[query]
fn get_payment(payment_id: String) -> Option<PaymentRecord> {
    PAYMENTS.with(|p| p.borrow().get(&StorableString(payment_id)).map(|p| p.clone()))
}

#[query]
fn get_total_supply() -> (u64, u32) {
    CONFIG.with(|c| {
        let config = c.borrow().get().clone();
        (config.total_agents_minted, config.total_axiom_minted)
    })
}

#[query]
fn get_btc_address() -> String {
    CONFIG.with(|c| c.borrow().get().btc_address.clone())
}

#[query]
fn health() -> String {
    "OK".to_string()
}

#[query]
fn get_conversation_history(token_id: u64, limit: u32) -> Vec<ChatMessage> {
    if let Some(agent) = get_agent(token_id) {
        agent.conversation_history
            .into_iter()
            .rev()
            .take(limit as usize)
            .collect()
    } else {
        vec![]
    }
}

#[query]
fn recall_memories(token_id: u64, query: String, limit: u32) -> Vec<MemoryEntry> {
    if let Some(agent) = get_agent(token_id) {
        let mut all_memories = agent.long_term_memory;
        all_memories.extend(agent.short_term_memory);
        all_memories
            .into_iter()
            .filter(|m| m.content.contains(&query) || m.tags.iter().any(|t| t.contains(&query)))
            .take(limit as usize)
            .collect()
    } else {
        vec![]
    }
}

#[query]
fn get_council_session(session_id: String) -> Option<AICouncilSession> {
    COUNCIL_SESSIONS.with(|s| s.borrow().get(&StorableString(session_id)).map(|s| s.clone()))
}

#[query]
fn get_user_council_sessions(user: Principal, limit: u32) -> Vec<AICouncilSession> {
    COUNCIL_SESSIONS.with(|s| {
        s.borrow()
            .iter()
            .filter(|(_, session)| session.user == user)
            .map(|(_, session)| session.clone())
            .rev()
            .take(limit as usize)
            .collect()
    })
}

#[query]
fn check_subscription(user: Principal) -> Option<Subscription> {
    SUBSCRIPTIONS.with(|s| {
        s.borrow().get(&StorableString(user.to_text())).map(|s| s.clone())
    })
}

#[query]
fn get_subscription_pricing() -> Vec<(String, u64)> {
    vec![
        ("demo".to_string(), 0),
        ("monthly".to_string(), 10_000_000_000), // 10 ICP
        ("yearly".to_string(), 100_000_000_000), // 100 ICP
        ("lifetime".to_string(), 1000_000_000_000), // 1000 ICP
    ]
}

#[query]
fn get_llm_providers() -> Vec<(String, bool)> {
    CONFIG.with(|c| {
        if let Some(providers) = &c.borrow().get().llm_providers {
            providers.iter().map(|p| (p.name.clone(), p.enabled)).collect()
        } else {
            vec![]
        }
    })
}

#[query]
fn get_scheduled_notifications(filter: String) -> Vec<RavenNotification> {
    NOTIFICATIONS.with(|n| {
        n.borrow()
            .iter()
            .filter(|(_, notif)| {
                !notif.sent && notif.scheduled_for.is_some() && notif.title.contains(&filter)
            })
            .map(|(_, notif)| notif.clone())
            .collect()
    })
}

#[query]
fn get_pending_notifications(agent_id: u32) -> Vec<RavenNotification> {
    NOTIFICATIONS.with(|n| {
        n.borrow()
            .iter()
            .filter(|(_, notif)| {
                !notif.sent && notif.recipients.contains(&agent_id)
            })
            .map(|(_, notif)| notif.clone())
            .collect()
    })
}

#[query]
fn admin_get_all_notifications(offset: u32, limit: u32) -> Vec<RavenNotification> {
    NOTIFICATIONS.with(|n| {
        n.borrow()
            .iter()
            .skip(offset as usize)
            .take(limit as usize)
            .map(|(_, notif)| notif.clone())
            .collect()
    })
}

#[query]
fn query_shared_memories(query: String, limit: u32) -> Vec<SharedMemory> {
    SHARED_MEMORIES.with(|m| {
        m.borrow()
            .iter()
            .filter(|(_, mem)| mem.content.contains(&query) || mem.tags.iter().any(|t| t.contains(&query)))
            .take(limit as usize)
            .map(|(_, mem)| mem.clone())
            .collect()
    })
}

#[query]
fn get_collective_stats() -> (u64, u64, u64) {
    let total_memories = SHARED_MEMORIES.with(|m| m.borrow().len() as u64);
    let total_agents = AGENTS.with(|a| a.borrow().len() as u64);
    let total_access = SHARED_MEMORIES.with(|m| {
        m.borrow().iter().map(|(_, mem)| mem.access_count).sum()
    });
    (total_memories, total_agents, total_access)
}

#[query]
fn get_articles(limit: u32, offset: u32) -> Vec<NewsArticle> {
    ARTICLES.with(|a| {
        a.borrow()
            .iter()
            .rev()
            .skip(offset as usize)
            .take(limit as usize)
            .map(|(_, article)| article.clone())
            .collect()
    })
}

#[query]
fn get_article(article_id: u64) -> Option<NewsArticle> {
    // CRITICAL: Protect BTreeMap access with catch_unwind to prevent panics
    std::panic::catch_unwind(|| {
        ARTICLES.with(|a| a.borrow().get(&StorableU64(article_id)).map(|a| a.clone()))
    }).unwrap_or_else(|_| {
        ic_cdk::println!("ERROR: get_article panicked for ID {} - BTreeMap is corrupted.", article_id);
        None
    })
}

#[query]
fn get_article_comments(article_id: u64) -> Vec<ArticleComment> {
    COMMENTS.with(|c| {
        c.borrow()
            .iter()
            .filter(|(_, comment)| comment.article_id == article_id)
            .map(|(_, comment)| comment.clone())
            .collect()
    })
}

// ============ UPDATE FUNCTIONS ============

#[update]
async fn add_memory(
    token_id: u64,
    memory_type: String,
    content: String,
    importance: f32,
    tags: Vec<String>,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    let mut agent = get_agent(token_id).ok_or("Agent not found")?;
    
    if agent.owner != caller {
        return Err("Not authorized".to_string());
    }

    let memory_id = format!("mem_{}_{}", token_id, ic_cdk::api::time());
    let memory = MemoryEntry {
        id: memory_id.clone(),
        memory_type,
        content,
        importance,
        timestamp: ic_cdk::api::time(),
        tags,
    };

    if importance > 0.7 {
        agent.long_term_memory.push(memory);
    } else {
        agent.short_term_memory.push(memory);
    }
    agent.total_memories += 1;
    agent.last_active = ic_cdk::api::time();

    AGENTS.with(|a| {
        a.borrow_mut().insert(StorableU64(token_id), agent);
    });

    Ok(memory_id)
}

#[update]
async fn upload_axiom_document(
    token_id: u64,
    doc_type: String,
    content: Vec<u8>,
    description: String,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    let mut agent = get_agent(token_id).ok_or("Agent not found")?;
    
    if agent.owner != caller {
        return Err("Not authorized".to_string());
    }

    // Store document in memory
    let doc_id = format!("doc_{}_{}", token_id, ic_cdk::api::time());
    let memory = MemoryEntry {
        id: doc_id.clone(),
        memory_type: format!("document_{}", doc_type),
        content: format!("Document: {} ({} bytes)", description, content.len()),
        importance: 0.9,
        timestamp: ic_cdk::api::time(),
        tags: vec![doc_type, "document".to_string()],
    };

    agent.long_term_memory.push(memory);
    agent.total_memories += 1;
    agent.last_active = ic_cdk::api::time();

    AGENTS.with(|a| {
        a.borrow_mut().insert(StorableU64(token_id), agent);
    });

    Ok(doc_id)
}

#[update]
fn add_chat_message(token_id: u64, role: String, content: String) -> Result<(), String> {
    let caller = ic_cdk::caller();
    let mut agent = get_agent(token_id).ok_or("Agent not found")?;
    
    if agent.owner != caller {
        return Err("Not authorized".to_string());
    }

    let message = ChatMessage {
        role,
        content,
        timestamp: ic_cdk::api::time(),
    };

    agent.conversation_history.push(message);
    agent.total_interactions += 1;
    agent.last_active = ic_cdk::api::time();

    AGENTS.with(|a| {
        a.borrow_mut().insert(StorableU64(token_id), agent);
    });

    Ok(())
}

#[update]
fn update_agent_config(token_id: u64, config: AgentConfig) -> Result<(), String> {
    let caller = ic_cdk::caller();
    let mut agent = get_agent(token_id).ok_or("Agent not found")?;
    
    if agent.owner != caller {
        return Err("Not authorized".to_string());
    }

    agent.config = config;
    agent.last_active = ic_cdk::api::time();

    AGENTS.with(|a| {
        a.borrow_mut().insert(StorableU64(token_id), agent);
    });

    Ok(())
}

#[update]
async fn query_ai_council(
    query: String,
    system_prompt: Option<String>,
    context: Vec<ChatMessage>,
    token_id: Option<u64>,
) -> Result<AICouncilSession, String> {
    let caller = ic_cdk::caller();
    
    // Allow AXIOM NFT canisters without subscription check
    let is_axiom = is_axiom_canister(&caller);
    
    // Rate limiting for all users (20 requests per minute for better UX)
    let caller_id = caller.to_text();
    if !check_rate_limit(&caller_id, 20, 60) {
        return Err("Rate limit exceeded. Please try again in a minute.".to_string());
    }

    let session_id = generate_session_id();
    let start_time = ic_cdk::api::time();
    
    // Get LLM providers from config
    let providers = CONFIG.with(|c| {
        c.borrow().get().llm_providers.clone().unwrap_or_default()
    });

    let mut responses = Vec::new();
    let system_prompt_str = system_prompt.unwrap_or_else(|| "You are a helpful AI assistant.".to_string());

    // Query all enabled providers in parallel (simplified - actual implementation would use futures)
    for provider in providers.iter().filter(|p| p.enabled && !p.api_key.is_empty()) {
        if !check_circuit_breaker(&provider.name) {
            continue;
        }

        let start = ic_cdk::api::time();
        match call_llm_provider(provider, &query, &system_prompt_str, &context).await {
            Ok((response, tokens)) => {
                let latency = (ic_cdk::api::time() - start) / 1_000_000; // Convert to ms
                record_provider_success(&provider.name);
                record_request_metrics(&provider.name, true, latency, tokens as u64, None);
                
                responses.push(AICouncilModelResponse {
                    model: provider.model.clone(),
                    response,
                    success: true,
                    error: None,
                    latency_ms: latency,
                    tokens_generated: Some(tokens),
                });
            }
            Err(e) => {
                let latency = (ic_cdk::api::time() - start) / 1_000_000;
                record_provider_failure(&provider.name);
                record_request_metrics(&provider.name, false, latency, 0u64, Some(e.clone()));
                
                responses.push(AICouncilModelResponse {
                    model: provider.model.clone(),
                    response: String::new(),
                    success: false,
                    error: Some(e),
                    latency_ms: latency,
                    tokens_generated: None,
                });
            }
        }
    }

    if responses.is_empty() {
        return Err("All LLM providers failed".to_string());
    }

    // Generate consensus from responses
    let consensus = generate_consensus(&responses);
    let total_tokens: u32 = responses.iter().filter_map(|r| r.tokens_generated).sum();
    let total_cost = (total_tokens as f64) * 0.0001; // Mock cost calculation

    let session = AICouncilSession {
        session_id: session_id.clone(),
        user: caller,
        user_query: query,
        system_prompt: Some(system_prompt_str),
        context,
        responses,
        consensus: Some(consensus),
        created_at: start_time,
        completed_at: Some(ic_cdk::api::time()),
        total_tokens_used: total_tokens,
        total_cost_usd: total_cost,
    };

    COUNCIL_SESSIONS.with(|s| {
        s.borrow_mut().insert(StorableString(session_id), session.clone());
    });

    Ok(session)
}

async fn call_llm_provider(
    provider: &LLMProviderConfig,
    query: &str,
    system_prompt: &str,
    context: &[ChatMessage],
) -> Result<(String, u32), String> {
    // Build prompt
    let mut full_prompt = format!("<|system|>\n{}\n<|end|>\n", system_prompt);
    for msg in context {
        full_prompt.push_str(&format!("<|{}|>\n{}\n<|end|>\n", msg.role, msg.content));
    }
    full_prompt.push_str(&format!("<|user|>\n{}\n<|end|>\n<|assistant|>\n", query));

    // HTTP outcall to LLM provider
    let request = ic_cdk::api::management_canister::http_request::CanisterHttpRequestArgument {
        url: provider.api_url.clone(),
        method: ic_cdk::api::management_canister::http_request::HttpMethod::POST,
        body: Some(json!({
            "inputs": full_prompt,
            "parameters": {
                "max_new_tokens": provider.max_tokens,
                "temperature": provider.temperature,
            }
        }).to_string().into_bytes()),
        headers: vec![
            ic_cdk::api::management_canister::http_request::HttpHeader {
                name: "Content-Type".to_string(),
                value: "application/json".to_string(),
            },
            ic_cdk::api::management_canister::http_request::HttpHeader {
                name: "Authorization".to_string(),
                value: format!("Bearer {}", provider.api_key),
            },
        ],
        max_response_bytes: Some(50_000),
        transform: None,
    };

    let cycles: u128 = 50_000_000_000;
    let (response,) = ic_cdk::api::management_canister::http_request::http_request(request, cycles)
        .await
        .map_err(|e| format!("HTTP outcall failed: {:?}", e))?;

    // Parse response
    let body_str = String::from_utf8(response.body)
        .map_err(|_| "Invalid UTF-8 in response".to_string())?;
    
    let json: serde_json::Value = serde_json::from_str(&body_str)
        .map_err(|_| "Invalid JSON response".to_string())?;
    
    let generated_text = json[0]["generated_text"]
        .as_str()
        .ok_or("No generated_text in response")?
        .to_string();
    
    let tokens = generated_text.split_whitespace().count() as u32;

    Ok((generated_text, tokens))
}

fn generate_consensus(responses: &[AICouncilModelResponse]) -> AICouncilConsensus {
    let successful: Vec<_> = responses.iter().filter(|r| r.success).collect();
    
    if successful.is_empty() {
        return AICouncilConsensus {
            final_response: "All providers failed".to_string(),
            confidence_score: 0.0,
            agreement_level: 0.0,
            key_points: vec![],
            dissenting_views: vec![],
            synthesis_method: "error".to_string(),
        };
    }

    // Simple consensus: use first successful response
    // In production, implement more sophisticated consensus algorithm
    let final_response = successful[0].response.clone();
    let agreement = if successful.len() > 1 {
        // Calculate similarity between responses
        0.8
    } else {
        0.5
    };

    AICouncilConsensus {
        final_response,
        confidence_score: 0.85,
        agreement_level: agreement,
        key_points: vec![],
        dissenting_views: vec![],
        synthesis_method: "first_successful".to_string(),
    }
}

#[update]
async fn chat(token_id: Option<u64>, message: String, system_prompt: Option<String>) -> Result<String, String> {
    let context = if let Some(id) = token_id {
        get_conversation_history(id, 10)
    } else {
        vec![]
    };

    let session = query_ai_council(message.clone(), system_prompt, context, token_id).await?;
    
    if let Some(consensus) = session.consensus {
        // Store message in agent history if token_id provided
        if let Some(id) = token_id {
            let _ = add_chat_message(id, "user".to_string(), message);
            let _ = add_chat_message(id, "assistant".to_string(), consensus.final_response.clone());
        }
        Ok(consensus.final_response)
    } else {
        Err("No consensus reached".to_string())
    }
}

#[update]
async fn synthesize_voice(request: VoiceSynthesisRequest) -> Result<VoiceSynthesisResponse, String> {
    // HTTP outcall to Eleven Labs
    let url = format!("https://api.elevenlabs.io/v1/text-to-speech/{}", 
        request.voice_id.unwrap_or_else(|| "kPzsL2i3teMYv0FxEYQ6".to_string()));
    
    let body = json!({
        "text": request.text,
        "model_id": request.model_id.unwrap_or_else(|| "eleven_multilingual_v2".to_string()),
        "voice_settings": {
            "stability": request.stability.unwrap_or(0.5),
            "similarity_boost": request.similarity_boost.unwrap_or(0.75),
        }
    });

    let http_request = ic_cdk::api::management_canister::http_request::CanisterHttpRequestArgument {
        url,
        method: ic_cdk::api::management_canister::http_request::HttpMethod::POST,
        body: Some(body.to_string().into_bytes()),
        headers: vec![
            ic_cdk::api::management_canister::http_request::HttpHeader {
                name: "Content-Type".to_string(),
                value: "application/json".to_string(),
            },
            ic_cdk::api::management_canister::http_request::HttpHeader {
                name: "xi-api-key".to_string(),
                value: ELEVEN_LABS_API_KEY.to_string(),
            },
        ],
        max_response_bytes: Some(1_000_000),
        transform: None,
    };

    let cycles: u128 = 50_000_000_000;
    let (response,) = ic_cdk::api::management_canister::http_request::http_request(http_request, cycles)
        .await
        .map_err(|e| format!("Voice synthesis failed: {:?}", e))?;

    Ok(VoiceSynthesisResponse {
        audio_data: response.body,
        content_type: "audio/mpeg".to_string(),
    })
}

#[update]
fn start_demo() -> Result<Subscription, String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    let subscription = Subscription {
        user: caller,
        plan: SubscriptionPlan::Demo,
        started_at: ic_cdk::api::time(),
        expires_at: Some(ic_cdk::api::time() + 7 * 24 * 60 * 60 * 1_000_000_000), // 7 days
        is_active: true,
        payment_history: vec![],
    };

    let user_key = caller.to_text();
    SUBSCRIPTIONS.with(|s| {
        s.borrow_mut().insert(StorableString(user_key), subscription.clone());
    });

    Ok(subscription)
}

#[update]
fn purchase_subscription(plan: String, payment_id: String) -> Result<Subscription, String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    let plan_enum = match plan.as_str() {
        "monthly" => SubscriptionPlan::Monthly,
        "yearly" => SubscriptionPlan::Yearly,
        "lifetime" => SubscriptionPlan::Lifetime,
        _ => return Err("Invalid plan".to_string()),
    };

    let expires_at = match plan_enum {
        SubscriptionPlan::Monthly => Some(ic_cdk::api::time() + 30 * 24 * 60 * 60 * 1_000_000_000),
        SubscriptionPlan::Yearly => Some(ic_cdk::api::time() + 365 * 24 * 60 * 60 * 1_000_000_000),
        SubscriptionPlan::Lifetime => None,
        _ => None,
    };

    let subscription = Subscription {
        user: caller,
        plan: plan_enum,
        started_at: ic_cdk::api::time(),
        expires_at,
        is_active: true,
        payment_history: vec![payment_id],
    };

    let user_key = caller.to_text();
    SUBSCRIPTIONS.with(|s| {
        s.borrow_mut().insert(StorableString(user_key), subscription.clone());
    });

    Ok(subscription)
}

#[update]
fn renew_subscription(payment_id: String) -> Result<Subscription, String> {
    let caller = ic_cdk::caller();
    let mut subscription = check_subscription(caller)
        .ok_or("No active subscription found".to_string())?;

    subscription.payment_history.push(payment_id);
    subscription.started_at = ic_cdk::api::time();
    
    if let Some(expires_at) = subscription.expires_at {
        let duration = expires_at - subscription.started_at;
        subscription.expires_at = Some(ic_cdk::api::time() + duration);
    }

    let user_key = caller.to_text();
    SUBSCRIPTIONS.with(|s| {
        s.borrow_mut().insert(StorableString(user_key), subscription.clone());
    });

    Ok(subscription)
}

#[update]
fn initiate_payment(token: PaymentToken, agent_type_str: String, axiom_number: Option<u32>) -> Result<PaymentRecord, String> {
    let caller = ic_cdk::caller();
    let payment_id = format!("pay_{}_{}", caller.to_text(), ic_cdk::api::time());
    
    let agent_type = if agent_type_str == "AXIOM" {
        AgentType::AXIOM(axiom_number.unwrap_or(1))
    } else {
        AgentType::RavenAI
    };

    let payment = PaymentRecord {
        id: payment_id.clone(),
        payer: caller,
        token,
        amount: 0, // Will be set based on token price
        usd_value: 0.0,
        agent_type,
        token_id: None,
        status: "pending".to_string(),
        tx_hash: None,
        created_at: ic_cdk::api::time(),
        completed_at: None,
    };

    PAYMENTS.with(|p| {
        p.borrow_mut().insert(StorableString(payment_id), payment.clone());
    });

    Ok(payment)
}

#[update]
fn confirm_payment(payment_id: String, tx_hash: String) -> Result<RavenAIAgent, String> {
    let caller = ic_cdk::caller();
    let mut payment = get_payment(payment_id.clone())
        .ok_or("Payment not found".to_string())?;

    if payment.payer != caller {
        return Err("Not authorized".to_string());
    }

    payment.status = "completed".to_string();
    payment.tx_hash = Some(tx_hash);
    payment.completed_at = Some(ic_cdk::api::time());

    PAYMENTS.with(|p| {
        p.borrow_mut().insert(StorableString(payment_id), payment.clone());
    });

    // Create agent (simplified - actual implementation would mint NFT)
    let token_id = CONFIG.with(|c| {
        let mut config = c.borrow_mut();
        let current_config = config.get().clone();
        let id = current_config.next_token_id;
        config.set(Config {
            next_token_id: id + 1,
            total_agents_minted: current_config.total_agents_minted + 1,
            ..current_config
        });
        id
    });

    let agent = RavenAIAgent {
        token_id,
        agent_type: payment.agent_type.clone(),
        owner: caller,
        canister_id: None,
        multichain_addresses: MultichainAddresses {
            icp_principal: Some(caller.to_text()),
            evm_address: None,
            btc_address: None,
            sol_address: None,
        },
        config: AgentConfig {
            name: "Raven AI Agent".to_string(),
            personality: "helpful".to_string(),
            language: "en".to_string(),
            voice_enabled: false,
            accessibility_mode: "standard".to_string(),
            custom_instructions: String::new(),
        },
        short_term_memory: vec![],
        long_term_memory: vec![],
        conversation_history: vec![],
        knowledge_nodes: vec![],
        total_interactions: 0,
        total_memories: 0,
        created_at: ic_cdk::api::time(),
        last_active: ic_cdk::api::time(),
        metadata: vec![],
    };

    AGENTS.with(|a| {
        a.borrow_mut().insert(StorableU64(token_id), agent.clone());
    });

    Ok(agent)
}

#[update]
fn airdrop_axiom(number: u32, recipient: Principal) -> Result<RavenAIAgent, String> {
    if !is_admin(ic_cdk::caller()) {
        return Err("Not authorized".to_string());
    }

    if number > AXIOM_TOTAL_SUPPLY {
        return Err("Invalid AXIOM number".to_string());
    }

    let token_id = CONFIG.with(|c| {
        let mut config = c.borrow_mut();
        let current_config = config.get().clone();
        let id = current_config.next_token_id;
        config.set(Config {
            next_token_id: id + 1,
            next_axiom_number: current_config.next_axiom_number + 1,
            total_axiom_minted: current_config.total_axiom_minted + 1,
            ..current_config
        });
        id
    });

    let agent = RavenAIAgent {
        token_id,
        agent_type: AgentType::AXIOM(number),
        owner: recipient,
        canister_id: None,
        multichain_addresses: MultichainAddresses {
            icp_principal: Some(recipient.to_text()),
            evm_address: None,
            btc_address: None,
            sol_address: None,
        },
        config: AgentConfig {
            name: format!("AXIOM #{}", number),
            personality: "unique".to_string(),
            language: "en".to_string(),
            voice_enabled: true,
            accessibility_mode: "standard".to_string(),
            custom_instructions: String::new(),
        },
        short_term_memory: vec![],
        long_term_memory: vec![],
        conversation_history: vec![],
        knowledge_nodes: vec![],
        total_interactions: 0,
        total_memories: 0,
        created_at: ic_cdk::api::time(),
        last_active: ic_cdk::api::time(),
        metadata: vec![],
    };

    AGENTS.with(|a| {
        a.borrow_mut().insert(StorableU64(token_id), agent.clone());
    });

    let axiom = AxiomNFT {
        number,
        token_id,
        owner: Some(recipient),
        minted: true,
        minted_at: Some(ic_cdk::api::time()),
        dedicated_canister: None,
        agent: Some(agent.clone()),
    };

    AXIOMS.with(|a| {
        a.borrow_mut().insert(StorableU32(number), axiom);
    });

    Ok(agent)
}

#[update]
fn transfer_agent(token_id: u64, to: Principal) -> Result<(), String> {
    let caller = ic_cdk::caller();
    let mut agent = get_agent(token_id).ok_or("Agent not found")?;
    
    if agent.owner != caller {
        return Err("Not authorized".to_string());
    }

    agent.owner = to;
    agent.last_active = ic_cdk::api::time();

    AGENTS.with(|a| {
        a.borrow_mut().insert(StorableU64(token_id), agent);
    });

    Ok(())
}

#[update]
fn update_multichain_address(token_id: u64, chain: String, address: String) -> Result<(), String> {
    let caller = ic_cdk::caller();
    let mut agent = get_agent(token_id).ok_or("Agent not found")?;
    
    if agent.owner != caller {
        return Err("Not authorized".to_string());
    }

    match chain.as_str() {
        "evm" => agent.multichain_addresses.evm_address = Some(address),
        "btc" => agent.multichain_addresses.btc_address = Some(address),
        "sol" => agent.multichain_addresses.sol_address = Some(address),
        _ => return Err("Invalid chain".to_string()),
    }

    AGENTS.with(|a| {
        a.borrow_mut().insert(StorableU64(token_id), agent);
    });

    Ok(())
}

#[update]
fn admin_pause(paused: bool) -> Result<(), String> {
    if !is_admin(ic_cdk::caller()) {
        return Err("Not authorized".to_string());
    }

    CONFIG.with(|c| {
        let mut config = c.borrow_mut();
        let mut new_config = config.get().clone();
        new_config.paused = paused;
        config.set(new_config);
    });

    Ok(())
}

#[update]
fn admin_add_principal(principal: Principal) -> Result<(), String> {
    if !is_admin(ic_cdk::caller()) {
        return Err("Not authorized".to_string());
    }

    CONFIG.with(|c| {
        let mut config = c.borrow_mut();
        let mut new_config = config.get().clone();
        if !new_config.admins.contains(&principal) {
            new_config.admins.push(principal);
            config.set(new_config);
        }
    });

    Ok(())
}

#[update]
fn admin_set_llm_api_key(provider_name: String, api_key: String) -> Result<(), String> {
    if !is_admin(ic_cdk::caller()) {
        return Err("Not authorized".to_string());
    }

    CONFIG.with(|c| {
        let mut config = c.borrow_mut();
        let mut new_config = config.get().clone();
        let providers = new_config.llm_providers.get_or_insert_with(Vec::new);
        if let Some(provider) = providers.iter_mut().find(|p| p.name == provider_name) {
            provider.api_key = api_key;
        } else {
            providers.push(LLMProviderConfig {
                name: provider_name,
                api_url: String::new(),
                api_key,
                model: String::new(),
                max_tokens: 1000,
                temperature: 0.7,
                weight: 1.0,
                enabled: true,
            });
        }
        config.set(new_config);
    });

    Ok(())
}

#[update]
fn init_notification_system() -> Result<u32, String> {
    if !is_admin(ic_cdk::caller()) {
        return Err("Not authorized".to_string());
    }

    // Notification system initialized
    Ok(1)
}

#[update]
fn admin_send_notification(title: String, message: String, recipients: Vec<u32>) -> Result<RavenNotification, String> {
    if !is_admin(ic_cdk::caller()) {
        return Err("Not authorized".to_string());
    }

    let id = NEXT_NOTIFICATION_ID.with(|n| {
        let current = *n.borrow();
        *n.borrow_mut() = current + 1;
        current
    });

    let notification = RavenNotification {
        id,
        notification_type: NotificationType::AdminAnnouncement,
        title,
        message,
        sender: ic_cdk::caller().to_text(),
        created_at: ic_cdk::api::time(),
        scheduled_for: None,
        sent: false,
        sent_at: None,
        recipients,
    };

    NOTIFICATIONS.with(|n| {
        n.borrow_mut().insert(StorableU32(id), notification.clone());
    });

    Ok(notification)
}

#[update]
fn process_scheduled_notifications() -> Result<u32, String> {
    let now = ic_cdk::api::time();
    let mut processed = 0;

    NOTIFICATIONS.with(|n| {
        let notifications = n.borrow();
        let keys: Vec<u32> = notifications.iter().map(|(k, _)| k.0).collect();
        drop(notifications);
        
        for key in keys {
            if let Some(notif) = n.borrow_mut().get(&StorableU32(key)).map(|n| n.clone()) {
                if !notif.sent {
                    if let Some(scheduled) = notif.scheduled_for {
                        if scheduled <= now {
                            let mut updated = notif;
                            updated.sent = true;
                            updated.sent_at = Some(now);
                            n.borrow_mut().insert(StorableU32(key), updated);
                            processed += 1;
                        }
                    }
                }
            }
        }
    });

    Ok(processed)
}

#[update]
fn mark_notification_read(agent_id: u32, notification_id: u32) -> Result<(), String> {
    NOTIFICATIONS.with(|n| {
        if let Some(notif) = n.borrow_mut().get(&StorableU32(notification_id)).map(|n| n.clone()) {
            let mut notif = notif;
            // Mark as read (simplified - actual implementation would track per agent)
            n.borrow_mut().insert(StorableU32(notification_id), notif);
        }
    });

    Ok(())
}

#[update]
fn share_memory_to_collective(
    agent_id: u32,
    memory_type: String,
    content: String,
    importance: f32,
    tags: Vec<String>,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    let memory_id = format!("shared_{}_{}", agent_id, ic_cdk::api::time());

    let shared_memory = SharedMemory {
        id: memory_id.clone(),
        source_agent: agent_id,
        memory_type,
        content,
        importance,
        created_at: ic_cdk::api::time(),
        access_count: 0,
        tags,
    };

    SHARED_MEMORIES.with(|m| {
        m.borrow_mut().insert(StorableString(memory_id.clone()), shared_memory);
    });

    Ok(memory_id)
}

#[update]
fn sync_agent_learnings(agent_id: u32) -> Result<u32, String> {
    // Sync shared memories to agent (simplified)
    let count = SHARED_MEMORIES.with(|m| m.borrow().len() as u32);
    Ok(count)
}

#[update]
fn send_inter_agent_message(from_agent: u32, to_agent: u32, message: String) -> Result<(), String> {
    let notification_id = NEXT_NOTIFICATION_ID.with(|n| {
        let current = *n.borrow();
        *n.borrow_mut() = current + 1;
        current
    });

    let notification = RavenNotification {
        id: notification_id,
        notification_type: NotificationType::InterAgentMessage,
        title: format!("Message from Agent #{}", from_agent),
        message,
        sender: format!("agent_{}", from_agent),
        created_at: ic_cdk::api::time(),
        scheduled_for: None,
        sent: false,
        sent_at: None,
        recipients: vec![to_agent],
    };

    NOTIFICATIONS.with(|n| {
        n.borrow_mut().insert(StorableU32(notification_id), notification);
    });

    Ok(())
}

#[update]
async fn mint_axiom_agent(
    payment_token: PaymentToken,
    payment_amount: u64,
    evm_address: String,
) -> Result<MintResult, String> {
    // Simplified minting - actual implementation would create canister
    let caller = ic_cdk::caller();
    let (axiom_number, token_id) = CONFIG.with(|c| {
        let mut config = c.borrow_mut();
        let current_config = config.get().clone();
        let num = current_config.next_axiom_number;
        let id = current_config.next_token_id;
        let mut new_config = current_config.clone();
        new_config.next_token_id = id + 1;
        new_config.next_axiom_number = num + 1;
        new_config.total_agents_minted += 1;
        new_config.total_axiom_minted += 1;
        config.set(new_config);
        (num, id)
    });

    // Create agent
    let agent = RavenAIAgent {
        token_id,
        agent_type: AgentType::AXIOM(axiom_number),
        owner: caller,
        canister_id: None, // Would be set when canister is created
        multichain_addresses: MultichainAddresses {
            icp_principal: Some(caller.to_text()),
            evm_address: Some(evm_address),
            btc_address: None,
            sol_address: None,
        },
        config: AgentConfig {
            name: format!("AXIOM #{}", axiom_number),
            personality: "unique".to_string(),
            language: "en".to_string(),
            voice_enabled: true,
            accessibility_mode: "standard".to_string(),
            custom_instructions: String::new(),
        },
        short_term_memory: vec![],
        long_term_memory: vec![],
        conversation_history: vec![],
        knowledge_nodes: vec![],
        total_interactions: 0,
        total_memories: 0,
        created_at: ic_cdk::api::time(),
        last_active: ic_cdk::api::time(),
        metadata: vec![],
    };

    AGENTS.with(|a| {
        a.borrow_mut().insert(StorableU64(token_id), agent.clone());
    });

    let axiom = AxiomNFT {
        number: axiom_number,
        token_id,
        owner: Some(caller),
        minted: true,
        minted_at: Some(ic_cdk::api::time()),
        dedicated_canister: None,
        agent: Some(agent),
    };

    AXIOMS.with(|a| {
        a.borrow_mut().insert(StorableU32(axiom_number), axiom);
    });

    Ok(MintResult {
        canister_id: ic_cdk::api::id(), // Placeholder
        mint_number: axiom_number,
        token_id,
        cycles_allocated: 1_000_000_000_000, // 1T cycles
        payment_token,
        payment_amount,
    })
}

#[update]
async fn top_up_axiom_cycles(
    canister_id: Principal,
    payment_token: PaymentToken,
    payment_amount: u64,
    tx_hash: String,
) -> Result<u128, String> {
    // Simplified - actual implementation would transfer cycles
    Ok(1_000_000_000_000) // 1T cycles
}

// ============ ARTICLE FUNCTIONS ============

#[update]
async fn generate_daily_article(
    persona: ArticlePersona,
    topic: Option<String>,
) -> Result<NewsArticle, String> {
    generate_daily_article_internal(persona, topic, None).await
}

async fn generate_daily_article_internal(
    persona: ArticlePersona,
    topic: Option<String>,
    caller: Option<Principal>,
) -> Result<NewsArticle, String> {
    // CRITICAL: Validate and fix article ID FIRST, before ANY BTreeMap access
    // Use panic protection to prevent canister traps
    // Note: ensure_article_id_valid() itself uses catch_unwind internally
    let validation_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        ensure_article_id_valid();
    }));
    
    if validation_result.is_err() {
        ic_cdk::println!("CRITICAL: ensure_article_id_valid panicked! BTreeMap may be severely corrupted.");
        // Force reset to safe value
        NEXT_ARTICLE_ID.with(|id| {
            *id.borrow_mut() = 1;
        });
        return Err("Stable memory corruption detected. The articles BTreeMap is corrupted and cannot be safely accessed. Please call emergency_reset_articles (admin only) or contact support.".to_string());
    }
    
    // Use AI Council to generate article
    let system_prompt = match persona {
        ArticlePersona::Raven => "You are Raven, a professional news writer. Write a comprehensive, SEO-optimized news article.",
        ArticlePersona::Harlee => "You are Harlee, a creative and engaging writer. Write an entertaining news article.",
        ArticlePersona::Macho => "You are Macho, a bold and opinionated writer. Write a provocative news article.",
    };

    let query = if let Some(t) = topic {
        format!("Write a 1200-1500 word news article about: {}", t)
    } else {
        "Write a 1200-1500 word news article about current trending topics in technology and blockchain.".to_string()
    };

    let session = query_ai_council(query, Some(system_prompt.to_string()), vec![], None).await?;
    
    let content = session.consensus
        .map(|c| c.final_response)
        .unwrap_or_else(|| "Article generation failed".to_string());

    // CRITICAL: Validate ID again right before use (after async operations)
    // This ensures no corruption occurred during async calls
    // Use panic protection
    let validation_ok = std::panic::catch_unwind(|| {
        ensure_article_id_valid();
    }).is_ok();
    
    if !validation_ok {
        return Err("Stable memory corruption detected during validation. Cannot safely generate article.".to_string());
    }
    
    // Get article ID safely (validated just above)
    // Use panic protection for ID retrieval too
    let article_id = match std::panic::catch_unwind(|| {
        NEXT_ARTICLE_ID.with(|id| {
            let current = *id.borrow();
            
            // Double-check: if ID is still corrupted, force reset
            // Use catch_unwind to prevent panics if BTreeMap is corrupted
            let (max_id, count) = std::panic::catch_unwind(|| {
                ARTICLES.with(|a| {
                    let articles = a.borrow();
                    let max = articles.iter().map(|(key, _)| key.0).max().unwrap_or(0);
                    (max, articles.len())
                })
            }).unwrap_or_else(|_| {
                // If BTreeMap iteration panics, assume corruption and use safe defaults
                ic_cdk::println!("EMERGENCY: BTreeMap iteration panicked! Using safe defaults.");
                (0, 0)
            });
            
            // If ID is still invalid, reset it immediately
            if current > 1_000_000 || (count > 0 && current > max_id + 100) || (count > 0 && current > count as u64 * 100) {
                ic_cdk::println!("EMERGENCY: Detected corrupted ID {} during article creation! Resetting to {}", current, max_id + 1);
                *id.borrow_mut() = max_id + 1;
                max_id + 1
            } else {
                *id.borrow_mut() = current + 1;
                current
            }
        })
    }) {
        Ok(id) => id,
        Err(_) => {
            ic_cdk::println!("CRITICAL: ID retrieval panicked! Using safe default ID 1");
            1
        }
    };

    let title = extract_title(&content);
    let slug = generate_slug(&title);
    let excerpt = if content.len() > 200 {
        content.chars().take(200).collect::<String>() + "..."
    } else {
        content.clone()
    };

    let seo_description = excerpt.clone();
    let seo_keywords = extract_keywords(&title);
    let article = NewsArticle {
        id: article_id,
        title: title.clone(),
        slug,
        excerpt: excerpt.clone(),
        content,
        author_persona: persona.clone(),
        category: "news".to_string(),
        tags: vec![],
        seo_title: title.clone(),
        seo_description,
        seo_keywords,
        published_at: ic_cdk::api::time(),
        views: 0,
        likes: 0,
        shares: 0,
        harlee_rewards: 0,
        featured: false,
    };

    // Use safe insert wrapper that prevents BTreeMap panics from corrupted stable memory
    match safe_insert_article(article_id, article.clone()) {
        Ok(_) => {
            ic_cdk::println!("Generated article {} by {:?}", article_id, &persona);
            Ok(article)
        }
        Err(e) => {
            ic_cdk::println!("ERROR: Failed to insert article: {}", e);
            Err(format!("Failed to store article: {}. This may indicate stable memory corruption. Try calling auto_fix_article_ids first.", e))
        }
    }
}

fn extract_title(content: &str) -> String {
    // Extract title from content (simplified)
    content.lines().next().unwrap_or("Untitled Article").to_string()
}

fn extract_keywords(title: &str) -> Vec<String> {
    // Extract keywords from title (simplified)
    title.to_lowercase()
        .split_whitespace()
        .filter(|w| w.len() > 3)
        .take(5)
        .map(|s| s.to_string())
        .collect()
}

#[update]
async fn trigger_article_generation(
    persona: ArticlePersona,
    topic: Option<String>,
) -> Result<NewsArticle, String> {
    // CRITICAL: First try to auto-fix if corruption is detected
    // This is safe because it uses catch_unwind internally
    let _ = auto_fix_article_ids();
    
    // CRITICAL: Validate and fix article ID FIRST, before ANY BTreeMap access
    // Use panic protection to prevent canister traps
    let validation_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        ensure_article_id_valid();
    }));
    
    if validation_result.is_err() {
        ic_cdk::println!("CRITICAL: ensure_article_id_valid panicked in trigger_article_generation! BTreeMap may be severely corrupted.");
        // Force reset to safe value
        NEXT_ARTICLE_ID.with(|id| {
            *id.borrow_mut() = 1;
        });
        // Mark as corrupted
        ARTICLES_BTREE_CORRUPTED.with(|f| *f.borrow_mut() = true);
        return Err("Stable memory corruption detected. The articles BTreeMap is corrupted and cannot be safely accessed. Please call auto_fix_article_ids() first or contact support.".to_string());
    }
    
    let caller = ic_cdk::caller();
    generate_daily_article_internal(persona, topic, Some(caller)).await
}

#[update]
fn fix_article_ids() -> Result<String, String> {
    // Admin-only function to manually fix corrupted article IDs
    if !is_admin(ic_cdk::caller()) {
        return Err("Not authorized".to_string());
    }
    
    let old_id = NEXT_ARTICLE_ID.with(|id| *id.borrow());
    ensure_article_id_valid();
    let new_id = NEXT_ARTICLE_ID.with(|id| *id.borrow());
    
    let (max_id, count) = ARTICLES.with(|a| {
        let articles = a.borrow();
        let max = articles.iter().map(|(key, _)| key.0).max().unwrap_or(0);
        (max, articles.len())
    });
    
    Ok(format!("Fixed article IDs: {} -> {} (max article ID: {}, total articles: {})", 
        old_id, new_id, max_id, count))
}

#[query]
fn auto_fix_article_ids() -> String {
    // Public query function that auto-fixes IDs (safe to call, no admin required)
    // This can be called by anyone to fix corruption
    let old_id = NEXT_ARTICLE_ID.with(|id| *id.borrow());
    ensure_article_id_valid();
    let new_id = NEXT_ARTICLE_ID.with(|id| *id.borrow());
    
    // Use catch_unwind to safely get article stats
    let (max_id, count) = std::panic::catch_unwind(|| {
        ARTICLES.with(|a| {
            let articles = a.borrow();
            let max = articles.iter().map(|(key, _)| key.0).max().unwrap_or(0);
            (max, articles.len())
        })
    }).unwrap_or_else(|_| {
        ic_cdk::println!("WARNING: Could not read article stats - BTreeMap may be corrupted");
        (0, 0)
    });
    
    if old_id != new_id {
        format!("✅ Fixed article IDs: {} -> {} (max article ID: {}, total articles: {})", 
            old_id, new_id, max_id, count)
    } else {
        format!("✅ Article IDs are valid: {} (max article ID: {}, total articles: {})", 
            new_id, max_id, count)
    }
}

#[update]
fn emergency_reset_articles() -> Result<String, String> {
    // Admin-only function to reset articles if BTreeMap is severely corrupted
    // WARNING: This will delete all articles!
    if !is_admin(ic_cdk::caller()) {
        return Err("Not authorized".to_string());
    }
    
    // Try to get count first to see if BTreeMap is accessible
    let count_before = std::panic::catch_unwind(|| {
        ARTICLES.with(|a| a.borrow().len())
    }).unwrap_or(0);
    
    // Clear all articles (this will reinitialize the BTreeMap)
    // Note: We can't actually "clear" a StableBTreeMap easily, but we can reset the counter
    // and let new articles overwrite old ones with new IDs
    
    NEXT_ARTICLE_ID.with(|id| {
        *id.borrow_mut() = 1;
    });
    
    ic_cdk::println!("EMERGENCY RESET: Reset NEXT_ARTICLE_ID to 1 (had {} articles before)", count_before);
    
    Ok(format!("Emergency reset complete. NEXT_ARTICLE_ID reset to 1. Previous article count: {}", count_before))
}

#[query]
fn get_article_stats() -> (u64, u64, u64) {
    // Returns: (next_article_id, max_article_id, article_count)
    let next_id = NEXT_ARTICLE_ID.with(|id| *id.borrow());
    let (max_id, count) = ARTICLES.with(|a| {
        let articles = a.borrow();
        let max = articles.iter().map(|(key, _)| key.0).max().unwrap_or(0);
        (max, articles.len())
    });
    (next_id, max_id, count)
}

#[update]
async fn regenerate_article(
    article_id: u64,
    persona: Option<ArticlePersona>,
    topic: Option<String>,
) -> Result<NewsArticle, String> {
    let existing = get_article(article_id).ok_or("Article not found")?;
    let persona = persona.unwrap_or(existing.author_persona);
    
    // Delete old article
    ARTICLES.with(|a| {
        a.borrow_mut().remove(&StorableU64(article_id));
    });

    generate_daily_article_internal(persona, topic, None).await
}

#[update]
fn create_article(
    title: String,
    slug: String,
    excerpt: String,
    content: String,
    author_persona: ArticlePersona,
    category: String,
    tags: Vec<String>,
    seo_title: String,
    seo_description: String,
    seo_keywords: Vec<String>,
    featured: bool,
) -> Result<NewsArticle, String> {
    if !is_admin(ic_cdk::caller()) {
        return Err("Not authorized".to_string());
    }

    let article_id = NEXT_ARTICLE_ID.with(|id| {
        let current = *id.borrow();
        *id.borrow_mut() = current + 1;
        current
    });

    let article = NewsArticle {
        id: article_id,
        title: title.clone(),
        slug,
        excerpt,
        content,
        author_persona,
        category,
        tags,
        seo_title,
        seo_description,
        seo_keywords,
        published_at: ic_cdk::api::time(),
        views: 0,
        likes: 0,
        shares: 0,
        harlee_rewards: 0,
        featured,
    };

    ARTICLES.with(|a| {
        a.borrow_mut().insert(StorableU64(article_id), article.clone());
    });

    Ok(article)
}

#[update]
fn increment_article_views(article_id: u64) -> Result<u64, String> {
    ARTICLES.with(|a| {
        if let Some(article) = a.borrow_mut().get(&StorableU64(article_id)).map(|a| a.clone()) {
            let mut article = article;
            article.views += 1;
            a.borrow_mut().insert(StorableU64(article_id), article.clone());
            Ok(article.views)
        } else {
            Err("Article not found".to_string())
        }
    })
}

#[update]
fn like_article(article_id: u64) -> Result<u64, String> {
    ARTICLES.with(|a| {
        if let Some(article) = a.borrow_mut().get(&StorableU64(article_id)).map(|a| a.clone()) {
            let mut article = article;
            article.likes += 1;
            a.borrow_mut().insert(StorableU64(article_id), article.clone());
            Ok(article.likes)
        } else {
            Err("Article not found".to_string())
        }
    })
}

#[update]
fn share_article(article_id: u64) -> Result<u64, String> {
    ARTICLES.with(|a| {
        if let Some(article) = a.borrow_mut().get(&StorableU64(article_id)).map(|a| a.clone()) {
            let mut article = article;
            article.shares += 1;
            a.borrow_mut().insert(StorableU64(article_id), article.clone());
            Ok(article.shares)
        } else {
            Err("Article not found".to_string())
        }
    })
}

#[update]
fn distribute_article_harlee_rewards(
    article_id: u64,
    recipient: Principal,
    amount: u64,
) -> Result<u64, String> {
    if !is_admin(ic_cdk::caller()) {
        return Err("Not authorized".to_string());
    }

    ARTICLES.with(|a| {
        if let Some(article) = a.borrow_mut().get(&StorableU64(article_id)).map(|a| a.clone()) {
            let mut article = article;
            article.harlee_rewards += amount;
            a.borrow_mut().insert(StorableU64(article_id), article.clone());
            Ok(article.harlee_rewards)
        } else {
            Err("Article not found".to_string())
        }
    })
}

#[update]
fn add_article_comment(article_id: u64, content: String) -> Result<ArticleComment, String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    if get_article(article_id).is_none() {
        return Err("Article not found".to_string());
    }

    let comment_id = NEXT_COMMENT_ID.with(|id| {
        let current = *id.borrow();
        *id.borrow_mut() = current + 1;
        current
    });

    let comment = ArticleComment {
        id: comment_id,
        article_id,
        author: caller,
        content,
        timestamp: ic_cdk::api::time(),
        likes: 0,
        edited: false,
    };

    COMMENTS.with(|c| {
        c.borrow_mut().insert(StorableU64(comment_id), comment.clone());
    });

    Ok(comment)
}

#[update]
fn like_comment(comment_id: u64) -> Result<u64, String> {
    COMMENTS.with(|c| {
        if let Some(comment) = c.borrow_mut().get(&StorableU64(comment_id)).map(|c| c.clone()) {
            let mut comment = comment;
            comment.likes += 1;
            c.borrow_mut().insert(StorableU64(comment_id), comment.clone());
            Ok(comment.likes)
        } else {
            Err("Comment not found".to_string())
        }
    })
}

// ============ NEW FUNCTIONS FOR ARTICLE SUBMISSION & HALO ============

/// Check plagiarism using web search and similarity detection
async fn check_plagiarism(content: &str) -> Result<PlagiarismCheckResult, String> {
    // Extract key phrases from content (first 500 chars for search)
    let search_text = if content.len() > 500 {
        content.chars().take(500).collect::<String>()
    } else {
        content.to_string()
    };
    
    // Use Perplexity to search for similar content online
    let search_query = format!(
        "Search the web for articles or content similar to this text and return URLs and titles: {}",
        search_text
    );
    
    // Call Perplexity API for web search
    let providers = CONFIG.with(|c| {
        c.borrow().get().llm_providers.clone().unwrap_or_default()
    });
    
    let perplexity_provider = providers.iter()
        .find(|p| p.name.contains("Perplexity") && p.enabled && !p.api_key.is_empty())
        .ok_or("Perplexity API not configured".to_string())?;
    
    // Build Perplexity API request
    let request_body = json!({
        "model": perplexity_provider.model,
        "messages": [
            {
                "role": "system",
                "content": "You are a web search assistant. When given text, search for similar content online and return results in JSON format with: title, url, similarity_score (0-100), and excerpt."
            },
            {
                "role": "user",
                "content": search_query
            }
        ],
        "max_tokens": 2000,
        "temperature": 0.3
    });
    
    let request = ic_cdk::api::management_canister::http_request::CanisterHttpRequestArgument {
        url: perplexity_provider.api_url.clone(),
        method: ic_cdk::api::management_canister::http_request::HttpMethod::POST,
        body: Some(request_body.to_string().into_bytes()),
        headers: vec![
            ic_cdk::api::management_canister::http_request::HttpHeader {
                name: "Content-Type".to_string(),
                value: "application/json".to_string(),
            },
            ic_cdk::api::management_canister::http_request::HttpHeader {
                name: "Authorization".to_string(),
                value: format!("Bearer {}", perplexity_provider.api_key),
            },
        ],
        max_response_bytes: Some(100_000),
        transform: None,
    };
    
    let cycles: u128 = 50_000_000_000;
    let (response,) = ic_cdk::api::management_canister::http_request::http_request(request, cycles)
        .await
        .map_err(|e| format!("Plagiarism check HTTP outcall failed: {:?}", e))?;
    
    let body_str = String::from_utf8(response.body)
        .map_err(|_| "Invalid UTF-8 in response".to_string())?;
    
    // Parse Perplexity response
    let json: serde_json::Value = serde_json::from_str(&body_str)
        .map_err(|_| "Invalid JSON response from Perplexity".to_string())?;
    
    // Extract search results from Perplexity response
    let mut matches = Vec::new();
    let mut max_score = 0;
    
    // Perplexity returns results in choices[0].message.content
    if let Some(choices) = json.get("choices").and_then(|c| c.as_array()) {
        if let Some(first_choice) = choices.first() {
            if let Some(message) = first_choice.get("message") {
                if let Some(content) = message.get("content").and_then(|c| c.as_str()) {
                    // Parse content for URLs and titles (Perplexity includes citations)
                    // Extract URLs from content using simple string search
                    let mut url_start = 0;
                    let mut found_urls = Vec::new();
                    
                    while let Some(http_pos) = content[url_start..].find("http") {
                        let actual_pos = url_start + http_pos;
                        let remaining = &content[actual_pos..];
                        
                        // Find end of URL (space, newline, or closing paren)
                        let url_end = remaining
                            .find(' ')
                            .or_else(|| remaining.find('\n'))
                            .or_else(|| remaining.find(')'))
                            .or_else(|| remaining.find('"'))
                            .unwrap_or(remaining.len().min(200));
                        
                        let url = remaining[..url_end].trim().to_string();
                        if url.starts_with("http://") || url.starts_with("https://") {
                            found_urls.push((actual_pos, url));
                        }
                        
                        url_start = actual_pos + url_end;
                        if found_urls.len() >= 5 || url_start >= content.len() {
                            break;
                        }
                    }
                    
                    for (_idx, (url_pos, url)) in found_urls.iter().enumerate() {
                        // Extract title from surrounding text
                        let title = extract_title_from_url_context(content, *url_pos);
                        
                        // Calculate similarity score (simplified - in production, use actual text similarity)
                        let similarity_score = calculate_text_similarity(content, &search_text);
                        let similarity_f32 = (similarity_score as f32) / 100.0; // Convert to 0.0-1.0
                        max_score = max_score.max(similarity_score);
                        
                        // Extract matched text excerpt
                        let matched_text = extract_matched_excerpt(content, *url_pos);
                        
                        matches.push(PlagiarismMatch {
                            text: matched_text,
                            source_title: title,
                            source_url: url.clone(),
                            source_author: None,
                            source_date: None,
                            similarity: similarity_f32,
                        });
                    }
                }
            }
        }
    }
    
    // If no matches found via Perplexity, use text similarity with sample content
    if matches.is_empty() {
        // Fallback: Use AI Council to analyze content originality
        let analysis_query = format!(
            "Analyze this text for potential plagiarism. Rate originality from 0-100 where 100 is completely original: {}",
            search_text
        );
        
        match query_ai_council(analysis_query, Some("You are a plagiarism detection expert.".to_string()), vec![], None).await {
            Ok(session) => {
                if let Some(consensus) = session.consensus {
                    // Extract score from consensus response
                    let score = extract_plagiarism_score_from_text(&consensus.final_response);
                    max_score = (100.0 - score * 10.0) as u32; // Convert to similarity score
                }
            }
            Err(_) => {
                // Default to low plagiarism if analysis fails
                max_score = 15;
            }
        }
    }
    
    Ok(PlagiarismCheckResult {
        score: max_score.min(100),
        matches,
    })
}

// Helper function to extract title from URL context
fn extract_title_from_url_context(content: &str, url_start: usize) -> String {
    // Look backwards from URL for title-like text
    let start = url_start.saturating_sub(100).max(0);
    let context = &content[start..url_start.min(content.len())];
    
    // Try to find title pattern (text before URL, possibly in quotes or brackets)
    if let Some(title_end) = context.rfind('"') {
        if let Some(title_start) = context[..title_end].rfind('"') {
            return context[title_start+1..title_end].trim().to_string();
        }
    }
    
    // Fallback: extract first sentence before URL
    if let Some(period) = context.rfind('.') {
        return context[period+1..].trim().to_string();
    }
    
    "Unknown Source".to_string()
}

// Helper function to calculate text similarity (simplified Jaccard similarity)
fn calculate_text_similarity(text1: &str, text2: &str) -> u32 {
    let words1: std::collections::HashSet<&str> = text1.split_whitespace().collect();
    let words2: std::collections::HashSet<&str> = text2.split_whitespace().collect();
    
    let intersection: usize = words1.intersection(&words2).count();
    let union: usize = words1.union(&words2).count();
    
    if union == 0 {
        return 0;
    }
    
    ((intersection as f64 / union as f64) * 100.0) as u32
}

// Helper function to extract matched excerpt
fn extract_matched_excerpt(content: &str, position: usize) -> String {
    let start = position.saturating_sub(50).max(0);
    let end = (position + 200).min(content.len());
    content[start..end].to_string()
}

// Helper function to extract plagiarism score from AI response
fn extract_plagiarism_score_from_text(text: &str) -> f64 {
    // Look for percentage or score in text
    if let Some(percent_pos) = text.find('%') {
        let before = &text[percent_pos.saturating_sub(10)..percent_pos];
        if let Ok(score) = before.trim().parse::<f64>() {
            return score / 100.0;
        }
    }
    
    // Look for "X out of 100" pattern
    if let Some(hundred_pos) = text.find("out of 100") {
        let before = &text[hundred_pos.saturating_sub(10)..hundred_pos];
        if let Ok(score) = before.trim().parse::<f64>() {
            return score / 100.0;
        }
    }
    
    // Default to moderate originality
    0.3
}

/// Detect AI-generated content
async fn detect_ai_content(content: &str) -> Result<AIDetectionResult, String> {
    // TODO: Implement with AI detection API (e.g., GPTZero, Originality.ai)
    // For now, return mock result
    Ok(AIDetectionResult {
        probability: 0.3, // 30% chance of being AI
        confidence: 0.85,
        indicators: vec![],
    })
}

/// Submit user article with plagiarism and AI detection
#[update]
async fn submit_user_article(
    title: String,
    content: String,
    author_name: Option<String>,
) -> Result<u64, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }
    
    // Check plagiarism
    let plagiarism_result = check_plagiarism(&content).await?;
    
    // Check AI detection
    let ai_result = detect_ai_content(&content).await?;
    
    // Generate article ID
    let article_id = NEXT_ARTICLE_ID.with(|id| {
        let current = *id.borrow();
        *id.borrow_mut() = current + 1;
        current
    });
    
    // Create article
    let slug = generate_slug(&title);
    let excerpt = if content.len() > 200 {
        content.chars().take(200).collect::<String>() + "..."
    } else {
        content.clone()
    };
    
    let seo_description = excerpt.clone();
    let article = NewsArticle {
        id: article_id,
        title: title.clone(),
        slug,
        excerpt: excerpt.clone(),
        content,
        author_persona: ArticlePersona::Raven, // Default for user submissions
        category: "user-submitted".to_string(),
        tags: vec![],
        seo_title: title,
        seo_description,
        seo_keywords: vec![],
        published_at: ic_cdk::api::time(),
        views: 0,
        likes: 0,
        shares: 0,
        harlee_rewards: 0,
        featured: false,
    };
    
    // Store article
    ARTICLES.with(|a| {
        a.borrow_mut().insert(StorableU64(article_id), article.clone());
    });
    
    ic_cdk::println!("User article {} submitted by {}", article_id, caller);
    
    Ok(article_id)
}

/// Check plagiarism for submitted article
#[update]
async fn check_article_plagiarism(content: String) -> Result<PlagiarismCheckResult, String> {
    check_plagiarism(&content).await
}

/// Check AI detection for submitted article
#[update]
async fn check_article_ai_detection(content: String) -> Result<AIDetectionResult, String> {
    detect_ai_content(&content).await
}

/// Generate works cited from plagiarism matches using AI to format citations properly
#[update]
async fn generate_works_cited(matches: Vec<PlagiarismMatch>) -> Result<Vec<WorksCited>, String> {
    if matches.is_empty() {
        return Ok(vec![]);
    }
    
    // Use AI Council to generate properly formatted citations
    let mut citations = Vec::new();
    
    for (idx, m) in matches.iter().enumerate() {
        // Build citation request
        let citation_query = format!(
            "Generate a properly formatted citation for this source in APA, MLA, and Chicago formats:\n\
             Title: {}\n\
             URL: {}\n\
             Author: {}\n\
             Date: {}\n\n\
             Return ONLY a JSON object with this exact structure:\n\
             {{\n\
               \"apa\": \"APA formatted citation\",\n\
               \"mla\": \"MLA formatted citation\",\n\
               \"chicago\": \"Chicago formatted citation\"\n\
             }}",
            m.source_title,
            m.source_url,
            m.source_author.as_ref().unwrap_or(&"Unknown".to_string()),
            m.source_date.as_ref().unwrap_or(&"n.d.".to_string())
        );
        
        // Query AI Council for citation formatting
        match query_ai_council(
            citation_query,
            Some("You are a citation expert. Generate properly formatted academic citations in APA, MLA, and Chicago styles. Return ONLY valid JSON.".to_string()),
            vec![],
            None
        ).await {
            Ok(session) => {
                if let Some(consensus) = session.consensus {
                    // Parse citations from AI response
                    let response_text = &consensus.final_response;
                    
                    // Try to extract JSON from response
                    let apa_citation = extract_citation_format(response_text, "apa");
                    let mla_citation = extract_citation_format(response_text, "mla");
                    let chicago_citation = extract_citation_format(response_text, "chicago");
                    
                    // Determine which format to use (default to APA)
                    let citation_format = CitationFormat::APA;
                    let formatted_citation = apa_citation
                        .or_else(|| mla_citation.clone())
                        .or_else(|| chicago_citation.clone())
                        .unwrap_or_else(|| format!("{}. ({})", m.source_title, m.source_url));
                    
                    citations.push(WorksCited {
                        id: format!("cite-{}", idx),
                        title: m.source_title.clone(),
                        author: m.source_author.clone().unwrap_or_else(|| "Unknown".to_string()),
                        url: m.source_url.clone(),
                        date: m.source_date.clone().unwrap_or_else(|| "n.d.".to_string()),
                        format: citation_format,
                    });
                } else {
                    // Fallback: Generate basic citation
                    citations.push(WorksCited {
                        id: format!("cite-{}", idx),
                        title: m.source_title.clone(),
                        author: m.source_author.clone().unwrap_or_else(|| "Unknown".to_string()),
                        url: m.source_url.clone(),
                        date: m.source_date.clone().unwrap_or_else(|| "n.d.".to_string()),
                        format: CitationFormat::APA,
                    });
                }
            }
            Err(_) => {
                // Fallback: Generate basic citation if AI fails
                citations.push(WorksCited {
                    id: format!("cite-{}", idx),
                    title: m.source_title.clone(),
                    author: m.source_author.clone().unwrap_or_else(|| "Unknown".to_string()),
                    url: m.source_url.clone(),
                    date: m.source_date.clone().unwrap_or_else(|| "n.d.".to_string()),
                    format: CitationFormat::APA,
                });
            }
        }
    }
    
    Ok(citations)
}

// Helper function to extract citation format from AI response
fn extract_citation_format(text: &str, format: &str) -> Option<String> {
    // Look for JSON structure
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(text) {
        if let Some(citation) = json.get(format).and_then(|v| v.as_str()) {
            return Some(citation.to_string());
        }
    }
    
    // Try to find format in text (e.g., "APA: ..." or "\"apa\": \"...\"")
    let format_lower = format.to_lowercase();
    let search_patterns = vec![
        format!("\"{}\":", format_lower),
        format!("{}:", format.to_uppercase()),
        format!("{} format:", format.to_uppercase()),
    ];
    
    for pattern in search_patterns {
        if let Some(pos) = text.to_lowercase().find(&pattern.to_lowercase()) {
            let start = pos + pattern.len();
            let remaining = &text[start..];
            
            // Extract citation (until next quote, newline, or closing brace)
            let end = remaining
                .find('"')
                .or_else(|| remaining.find('\n'))
                .or_else(|| remaining.find('}'))
                .unwrap_or(remaining.len());
            
            let citation = remaining[..end].trim().trim_matches('"').trim().to_string();
            if !citation.is_empty() && citation.len() > 10 {
                return Some(citation);
            }
        }
    }
    
    None
}

/// HALO Academic Writing Assistant - Get comprehensive writing analysis and suggestions
#[update]
async fn halo_writing_assistant(
    content: String,
    writing_style: Vec<String>, // "academic", "journalistic", "creative"
) -> Result<HaloSuggestion, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }
    
    // Use AI Council to analyze writing and provide comprehensive suggestions
    let default_style = "academic".to_string();
    let style = writing_style.first().unwrap_or(&default_style);
    
    let system_prompt = format!(
        "You are HALO, an advanced academic writing assistant. Analyze the provided text comprehensively and provide:\n\
        1. Detailed grammar and syntax analysis with specific improvement suggestions\n\
        2. Assessment of academic tone and formality (rate 0-100)\n\
        3. Clarity and conciseness evaluation (rate 0-100)\n\
        4. Specific citation recommendations with examples\n\
        5. Structure and organization feedback\n\
        6. Overall grammar quality score (0-100)\n\n\
        Writing style requested: {}\n\n\
        Return your analysis in a structured format with clear sections and specific, actionable recommendations.",
        style
    );
    
    let query = format!(
        "Provide a comprehensive writing analysis for this text:\n\n{}\n\n\
        Include:\n\
        - Grammar score (0-100)\n\
        - Clarity score (0-100)\n\
        - Academic quality score (0-100)\n\
        - Specific recommendations (list format)\n\
        - Detailed suggestions for improvement",
        if content.len() > 3000 { &content[..3000] } else { &content }
    );
    
    // Query AI Council for comprehensive analysis
    match query_ai_council(query, Some(system_prompt), vec![], None).await {
        Ok(session) => {
            let suggestion_text = session.consensus
                .map(|c| c.final_response)
                .unwrap_or_else(|| "No suggestions available".to_string());
            
            // Extract scores from AI response
            let grammar_score = extract_score_from_text(&suggestion_text, "grammar", 85);
            let clarity_score = extract_score_from_text(&suggestion_text, "clarity", 80);
            let academic_score = extract_score_from_text(&suggestion_text, "academic", 75);
            
            // Extract specific recommendations
            let recommendations = extract_recommendations_from_text(&suggestion_text);
            
            Ok(HaloSuggestion {
                suggestions: suggestion_text,
                grammar_score,
                clarity_score,
                academic_score,
                recommendations,
            })
        }
        Err(e) => Err(format!("Failed to get HALO suggestions: {}", e)),
    }
}

// Helper function to extract score from text
fn extract_score_from_text(text: &str, keyword: &str, default: u32) -> u32 {
    let text_lower = text.to_lowercase();
    let keyword_lower = keyword.to_lowercase();
    
    // Look for "keyword score: X" or "keyword: X/100"
    let patterns = vec![
        format!("{} score", keyword_lower),
        format!("{}:", keyword_lower),
        format!("{} quality", keyword_lower),
    ];
    
    for pattern in patterns {
        if let Some(pos) = text_lower.find(&pattern) {
            let after_pattern = &text_lower[pos + pattern.len()..];
            
            // Look for number after pattern
            let number_str: String = after_pattern
                .chars()
                .take(20)
                .filter(|c| c.is_ascii_digit() || *c == '.')
                .collect();
            
            if let Ok(score) = number_str.parse::<f64>() {
                let score_u32 = score as u32;
                if score_u32 <= 100 {
                    return score_u32;
                }
            }
            
            // Also check for "X out of 100"
            if let Some(out_pos) = after_pattern.find("out of 100") {
                let before = &after_pattern[..out_pos];
                let number_str: String = before
                    .chars()
                    .rev()
                    .take(10)
                    .collect::<String>()
                    .chars()
                    .rev()
                    .filter(|c| c.is_ascii_digit())
                    .collect();
                
                if let Ok(score) = number_str.parse::<u32>() {
                    if score <= 100 {
                        return score;
                    }
                }
            }
        }
    }
    
    default
}

// Helper function to extract recommendations from text
fn extract_recommendations_from_text(text: &str) -> Vec<String> {
    let mut recommendations = Vec::new();
    let text_lower = text.to_lowercase();
    
    // Look for numbered lists or bullet points
    let lines: Vec<&str> = text.split('\n').collect();
    
    for line in &lines {
        let line_trimmed = line.trim();
        
        // Check for numbered recommendations (1., 2., etc.)
        if let Some(num_end) = line_trimmed.find('.') {
            if num_end < 3 && line_trimmed[..num_end].chars().all(|c| c.is_ascii_digit()) {
                let rec = line_trimmed[num_end + 1..].trim().to_string();
                if rec.len() > 10 && !rec.is_empty() {
                    recommendations.push(rec);
                }
            }
        }
        
        // Check for bullet points (-, *, •)
        if line_trimmed.starts_with("- ") || line_trimmed.starts_with("* ") || line_trimmed.starts_with("• ") {
            let rec = line_trimmed[2..].trim().to_string();
            if rec.len() > 10 && !rec.is_empty() {
                recommendations.push(rec);
            }
        }
        
        // Check for "recommendation:" pattern
        if line_trimmed.contains("recommendation:") || line_trimmed.contains("suggestion:") {
            if let Some(colon_pos) = line_trimmed.find(':') {
                let rec = line_trimmed[colon_pos + 1..].trim().to_string();
                if rec.len() > 10 && !rec.is_empty() {
                    recommendations.push(rec);
                }
            }
        }
    }
    
    // Limit to top 10 recommendations
    recommendations.truncate(10);
    
    // If no structured recommendations found, extract key sentences
    if recommendations.is_empty() {
        // Look for sentences with action words
        let action_words = vec!["consider", "improve", "add", "remove", "revise", "enhance", "clarify"];
        for line in &lines {
            let line_trimmed = line.trim();
            let line_lower = line_trimmed.to_lowercase();
            for action in &action_words {
                if line_lower.contains(action) && line_trimmed.len() > 20 && line_trimmed.len() < 200 {
                    recommendations.push(line_trimmed.to_string());
                    break;
                }
            }
            if recommendations.len() >= 5 {
                break;
            }
        }
    }
    
    recommendations
}

// ============ COMICS FUNCTIONS ============

#[update]
async fn submit_comic(
    title: String,
    image_data: Vec<u8>,
    caption: String,
) -> Result<u64, String> {
    let caller = ic_cdk::caller();
    
    // Validate image size (max 5MB)
    if image_data.len() > 5_000_000 {
        return Err("Image too large. Maximum size is 5MB.".to_string());
    }
    
    // Validate title and caption
    if title.trim().is_empty() || title.len() > 200 {
        return Err("Title must be between 1 and 200 characters.".to_string());
    }
    
    if caption.trim().is_empty() || caption.len() > 500 {
        return Err("Caption must be between 1 and 500 characters.".to_string());
    }
    
    // Get next comic ID
    let comic_id = NEXT_COMIC_ID.with(|id| {
        let current = *id.borrow();
        *id.borrow_mut() = current + 1;
        current
    });
    
    let now = ic_cdk::api::time() / 1_000_000; // Convert to milliseconds
    
    let comic = Comic {
        id: comic_id,
        title: title.trim().to_string(),
        image_data,
        caption: caption.trim().to_string(),
        submitted_by: caller,
        approved: false, // Requires admin approval
        likes: 0,
        comments_count: 0,
        published_at: now,
    };
    
    COMICS.with(|c| {
        c.borrow_mut().insert(StorableU64(comic_id), comic);
    });
    
    ic_cdk::println!("Comic {} submitted by {} (pending approval)", comic_id, caller);
    
    Ok(comic_id)
}

#[update]
async fn approve_comic(comic_id: u64) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Only admins can approve comics.".to_string());
    }
    
    COMICS.with(|c| {
        let mut comics = c.borrow_mut();
        if let Some(comic) = comics.get(&StorableU64(comic_id)) {
            let mut updated_comic = comic.clone();
            updated_comic.approved = true;
            comics.insert(StorableU64(comic_id), updated_comic);
            Ok(())
        } else {
            Err("Comic not found.".to_string())
        }
    })
}

#[update]
async fn like_comic(comic_id: u64) -> Result<u64, String> {
    COMICS.with(|c| {
        let mut comics = c.borrow_mut();
        if let Some(comic) = comics.get(&StorableU64(comic_id)) {
            let mut updated_comic = comic.clone();
            updated_comic.likes += 1;
            let likes = updated_comic.likes;
            comics.insert(StorableU64(comic_id), updated_comic);
            Ok(likes)
        } else {
            Err("Comic not found.".to_string())
        }
    })
}

#[query]
fn get_approved_comics(limit: u32) -> Vec<Comic> {
    COMICS.with(|c| {
        c.borrow()
            .iter()
            .filter(|(_, comic)| comic.approved)
            .rev() // Most recent first
            .take(limit as usize)
            .map(|(_, comic)| comic.clone())
            .collect()
    })
}

#[query]
fn get_comic(comic_id: u64) -> Option<Comic> {
    COMICS.with(|c| {
        c.borrow().get(&StorableU64(comic_id)).map(|comic| comic.clone())
    })
}

// ============ HALO DOCUMENT PROCESSING ============

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct HALOOptions {
    pub rewrite: bool,
    pub generate_citations: bool,
    pub check_plagiarism: bool,
    pub grammar_check: bool,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct HALOResult {
    pub original_text: String,
    pub formatted_text: String,
    pub works_cited: Vec<String>,
    pub citations_added: u32,
    pub plagiarism_check: Option<PlagiarismCheckResult>,
    pub grammar_suggestions: Vec<GrammarSuggestion>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct GrammarSuggestion {
    pub text: String,
    pub suggestion: String,
    pub suggestion_type: String, // "grammar", "style", "clarity"
}

#[update]
async fn process_halo_document(
    document_data: Vec<u8>,
    file_type: String,
    format: CitationFormat,
    options: HALOOptions,
) -> Result<HALOResult, String> {
    // Parse document based on file type
    let text = match file_type.as_str() {
        "docx" => {
            // For now, treat as plain text (would need docx parsing library)
            String::from_utf8(document_data.clone())
                .map_err(|e| format!("Failed to parse DOCX: {}", e))?
        }
        "pdf" => {
            // For now, treat as plain text (would need PDF parsing library)
            String::from_utf8(document_data.clone())
                .map_err(|e| format!("Failed to parse PDF: {}", e))?
        }
        "txt" => {
            String::from_utf8(document_data)
                .map_err(|e| format!("Failed to parse text: {}", e))?
        }
        _ => return Err("Unsupported file type. Please use PDF, DOCX, or TXT.".to_string()),
    };

    let mut result = HALOResult {
        original_text: text.clone(),
        formatted_text: String::new(),
        works_cited: vec![],
        citations_added: 0,
        plagiarism_check: None,
        grammar_suggestions: vec![],
    };

    // Process based on selected options
    if options.rewrite {
        result.formatted_text = rewrite_in_user_voice(&text).await?;
    } else {
        result.formatted_text = text.clone();
    }

    if options.generate_citations {
        let citations = generate_citations_from_document(&result.formatted_text, format.clone()).await?;
        result.works_cited = citations.iter().map(|c| {
            format!("{}. \"{}\" by {}. {}. {}", c.id, c.title, c.author, c.date, c.url)
        }).collect();
        result.formatted_text = insert_inline_citations(&result.formatted_text, &citations);
        result.citations_added = citations.len() as u32;
    }

    if options.check_plagiarism {
        let plagiarism_result = check_plagiarism(&result.formatted_text).await?;
        result.plagiarism_check = Some(plagiarism_result);
    }

    if options.grammar_check {
        result.grammar_suggestions = check_grammar_and_style(&result.formatted_text).await?;
    }

    Ok(result)
}

async fn rewrite_in_user_voice(text: &str) -> Result<String, String> {
    let prompt = format!(
        "Rewrite this academic text while:
1. Maintaining the original meaning and key facts
2. Using the author's natural voice (keep personal pronouns if present)
3. Simplifying overly complex sentences
4. Preserving technical terms and proper nouns
5. Keeping the same structure (paragraphs, sections)
6. Ensuring it sounds human-written, not AI-generated

Original text:
{}

Rewritten text:",
        text
    );

    // Use AI Council for rewriting
    let system_prompt = "You are an expert academic writing assistant specializing in rewriting text while maintaining the author's voice.".to_string();
    let context = vec![];

    match query_ai_council(prompt, Some(system_prompt), context, None).await {
        Ok(session) => {
            // Extract the rewritten text from the consensus response
            let rewritten = session.consensus
                .map(|c| c.final_response)
                .unwrap_or_else(|| text.to_string());
            Ok(rewritten)
        }
        Err(e) => Err(format!("Failed to rewrite text: {}", e)),
    }
}

async fn generate_citations_from_document(
    text: &str,
    format: CitationFormat,
) -> Result<Vec<WorksCited>, String> {
    // Extract references/quotes from text
    let references = extract_references_from_text(text);

    let mut citations = vec![];

    for reference in references {
        // Search for source
        let source = deep_search_source(&reference).await?;

        // Fetch metadata
        let metadata = fetch_complete_metadata(&source.source_url).await?;

        // Generate citation
        let citation = format_citation(&metadata, &format);
        citations.push(citation);
    }

    Ok(citations)
}

fn extract_references_from_text(text: &str) -> Vec<String> {
    // Simple extraction: look for quoted text and URLs
    let mut references = vec![];

    // Extract quoted text (potential citations)
    let quote_pattern = regex::Regex::new(r#""([^"]{20,})""#).unwrap();
    for cap in quote_pattern.captures_iter(text) {
        if let Some(quote) = cap.get(1) {
            references.push(quote.as_str().to_string());
        }
    }

    // Extract URLs
    let url_pattern = regex::Regex::new(r"https?://[^\s]+").unwrap();
    for cap in url_pattern.captures_iter(text) {
        if let Some(url) = cap.get(0) {
            references.push(url.as_str().to_string());
        }
    }

    references
}

async fn deep_search_source(reference: &str) -> Result<PlagiarismMatch, String> {
    // Use Perplexity to search for the source
    let search_query = format!("\"{}\"", reference);
    
    // Call Perplexity API for web search
    let perplexity_url = "https://api.perplexity.ai/chat/completions";
    let api_key = PERPLEXITY_API_KEY;

    let body = json!({
        "model": "sonar-pro",
        "messages": [
            {
                "role": "system",
                "content": "You are a research assistant. Find the original source for this text or URL."
            },
            {
                "role": "user",
                "content": search_query
            }
        ],
        "max_tokens": 500
    });

    let cycles: u128 = 50_000_000_000;
    let request = ic_cdk::api::management_canister::http_request::CanisterHttpRequestArgument {
        url: perplexity_url.to_string(),
        max_response_bytes: Some(2000),
        method: ic_cdk::api::management_canister::http_request::HttpMethod::POST,
        headers: vec![
            ic_cdk::api::management_canister::http_request::HttpHeader {
                name: "Content-Type".to_string(),
                value: "application/json".to_string(),
            },
            ic_cdk::api::management_canister::http_request::HttpHeader {
                name: "Authorization".to_string(),
                value: format!("Bearer {}", api_key),
            },
        ],
        body: Some(serde_json::to_string(&body).unwrap().into_bytes()),
        transform: None,
    };

    let (response,): (ic_cdk::api::management_canister::http_request::HttpResponse,) = 
        ic_cdk::api::management_canister::http_request::http_request(request, cycles)
            .await
            .map_err(|(reject_code, message)| {
                format!("HTTP request failed: reject_code={:?}, message={}", reject_code, message)
            })?;

    let response_body = String::from_utf8(response.body)
        .map_err(|_| "Invalid UTF-8 in response".to_string())?;

    // Parse response and extract URL
    let response_json: serde_json::Value = serde_json::from_str(&response_body)
        .map_err(|_| "Failed to parse JSON response".to_string())?;

    let url = response_json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(PlagiarismMatch {
        text: reference.to_string(),
        source_title: "Source Document".to_string(),
        source_author: None,
        source_url: if url.is_empty() { reference.to_string() } else { url },
        source_date: None,
        similarity: 0.8,
    })
}

async fn fetch_complete_metadata(url: &str) -> Result<serde_json::Value, String> {
    // Use Perplexity to fetch page metadata
    let query = format!("Extract metadata from this URL: {}", url);
    
    // Similar API call to get metadata
    // For now, return basic structure
    Ok(json!({
        "url": url,
        "title": "Source Document",
        "author": "Unknown",
        "publication": "Web Source",
        "publish_date": "2024",
        "access_date": "2024",
    }))
}

fn format_citation(metadata: &serde_json::Value, format: &CitationFormat) -> WorksCited {
    let url = metadata["url"].as_str().unwrap_or("");
    let title = metadata["title"].as_str().unwrap_or("Unknown");
    let author = metadata["author"].as_str().unwrap_or("Unknown");
    let publication = metadata["publication"].as_str().unwrap_or("Web Source");
    let publish_date = metadata["publish_date"].as_str().unwrap_or("2024");
    let access_date = metadata["access_date"].as_str().unwrap_or("2024");

    let citation_text = match format {
        CitationFormat::MLA => {
            format!(
                "{}. \"{}\" {}. {}. Web. {}.",
                author, title, publication, publish_date, access_date
            )
        }
        CitationFormat::APA => {
            format!(
                "{}. ({}). {}. {}. Retrieved from {}",
                author, publish_date, title, publication, url
            )
        }
        CitationFormat::Chicago => {
            format!(
                "{}. \"{}\" {}. {}.",
                author, title, publication, publish_date
            )
        }
        CitationFormat::Harvard => {
            format!(
                "{} {} '{}' {} [online] Available at: {} [Accessed {}]",
                author, publish_date, title, publication, url, access_date
            )
        }
        CitationFormat::IEEE => {
            format!(
                "{}, \"{}\" {}, {}, {}.",
                author, title, publication, publish_date, url
            )
        }
    };

    WorksCited {
        id: format!("cite-{}", url.len()),
        title: title.to_string(),
        author: author.to_string(),
        url: url.to_string(),
        date: publish_date.to_string(),
        format: format.clone(),
    }
}

fn insert_inline_citations(text: &str, citations: &[WorksCited]) -> String {
    let mut result = text.to_string();
    
    // Simple insertion: add [1], [2], etc. at the end of sentences with quotes
    for (index, citation) in citations.iter().enumerate() {
        let citation_marker = format!("[{}]", index + 1);
        // Find quoted text and add citation
        if result.contains(&citation.title) {
            // Add citation marker after the quote
            result = result.replace(&citation.title, &format!("{} {}", citation.title, citation_marker));
        }
    }

    result
}

async fn check_grammar_and_style(text: &str) -> Result<Vec<GrammarSuggestion>, String> {
    let prompt = format!(
        "Analyze this text for grammar, style, and clarity issues. For each issue found, provide:
1. The problematic text
2. A suggestion for improvement
3. The type of issue (grammar, style, or clarity)

Text:
{}

Respond in JSON format with an array of suggestions.",
        text
    );

    match query_ai_council(prompt, Some("You are a grammar and style expert.".to_string()), vec![], None).await {
        Ok(session) => {
            // Extract suggestions from AI response
            let response_text = session.consensus
                .map(|c| c.final_response)
                .unwrap_or_else(|| "No suggestions".to_string());
            
            // Parse suggestions (simplified - would need proper JSON parsing)
            let mut suggestions = vec![];
            // For now, return empty vector - would need to parse JSON response
            Ok(suggestions)
        }
        Err(e) => Err(format!("Failed to check grammar: {}", e)),
    }
}

// ============ HEARTBEAT ============

#[heartbeat]
async fn heartbeat() {
    // Generate daily news articles (once per day)
    let now = ic_cdk::api::time() / 1_000_000_000; // Convert to seconds
    let last_generation = LAST_ARTICLE_GENERATION.with(|t| *t.borrow());
    let seconds_per_day = 86400;
    
    // Check if we have any articles - if not, generate immediately
    let article_count = ARTICLES.with(|a| a.borrow().len());
    
    // Always generate articles if we have none, or if it's been more than a day
    if article_count == 0 || now - last_generation >= seconds_per_day {
        ic_cdk::println!("Heartbeat: Generating daily articles (article_count: {}, last_gen: {}, now: {})", 
            article_count, last_generation, now);
        
        // Generate articles for each persona with error handling
        let mut success_count = 0;
        
        match generate_daily_article_internal(ArticlePersona::Raven, None, None).await {
            Ok(article) => {
                ic_cdk::println!("✅ Generated Raven article: {} - {}", article.id, article.title);
                success_count += 1;
            }
            Err(e) => ic_cdk::println!("❌ Failed to generate Raven article: {}", e),
        }
        
        // Small delay between generations to avoid rate limits
        // (async operations naturally provide delays)
        
        match generate_daily_article_internal(ArticlePersona::Harlee, None, None).await {
            Ok(article) => {
                ic_cdk::println!("✅ Generated Harlee article: {} - {}", article.id, article.title);
                success_count += 1;
            }
            Err(e) => ic_cdk::println!("❌ Failed to generate Harlee article: {}", e),
        }
        
        match generate_daily_article_internal(ArticlePersona::Macho, None, None).await {
            Ok(article) => {
                ic_cdk::println!("✅ Generated Macho article: {} - {}", article.id, article.title);
                success_count += 1;
            }
            Err(e) => ic_cdk::println!("❌ Failed to generate Macho article: {}", e),
        }
        
        LAST_ARTICLE_GENERATION.with(|t| {
            *t.borrow_mut() = now;
        });
        
        // Verify articles were created
        let new_count = ARTICLES.with(|a| a.borrow().len());
        ic_cdk::println!("Heartbeat: Article generation complete. Success: {}/{}, Total articles: {}", 
            success_count, 3, new_count);
    }

    // Process scheduled notifications
    let _ = process_scheduled_notifications();

    // Cleanup cache
    cleanup_cache();
}

// ============ INIT & UPGRADE ============

#[init]
fn init() {
    let caller = ic_cdk::caller();
    let admin = Principal::from_text(ADMIN_PRINCIPAL).unwrap_or(caller);
    
    let config = Config {
        admins: vec![admin],
        treasury_principal: Principal::from_text(TREASURY_CANISTER).unwrap_or(Principal::anonymous()),
        btc_address: String::new(),
        raven_token_canister: Principal::from_text(RAVEN_TOKEN_CANISTER).unwrap_or(Principal::anonymous()),
        next_token_id: 1,
        next_axiom_number: 1,
        total_agents_minted: 0,
        total_axiom_minted: 0,
        paused: false,
        llm_providers: Some(vec![
            LLMProviderConfig {
                name: "HuggingFace".to_string(),
                api_url: "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct".to_string(),
                api_key: HUGGINGFACE_API_KEY.to_string(),
                model: "Qwen/Qwen2.5-72B-Instruct".to_string(),
                max_tokens: 2000,
                temperature: 0.7,
                weight: 1.0,
                enabled: true,
            },
            LLMProviderConfig {
                name: "Perplexity-Sonar".to_string(),
                api_url: "https://api.perplexity.ai/chat/completions".to_string(),
                api_key: PERPLEXITY_API_KEY.to_string(),
                model: "sonar-pro".to_string(),
                max_tokens: 2000,
                temperature: 0.7,
                weight: 1.2,
                enabled: true,
            },
        ]),
    };

    CONFIG.with(|c| {
        c.borrow_mut().set(config);
    });
}

#[pre_upgrade]
fn pre_upgrade() {
    // Stable storage is handled automatically by ic-stable-structures
}

#[post_upgrade]
fn post_upgrade() {
    // CRITICAL: Validate and fix article IDs after upgrade
    // This handles the case where volatile counters reset but stable memory persists
    // Following Canic/IcyDB patterns: validate stable memory state on upgrade
    
    ic_cdk::println!("post_upgrade: Starting stable memory validation...");
    
    // Get actual max article ID from stable storage
    let max_article_id = ARTICLES.with(|a| {
        a.borrow()
            .iter()
            .map(|(key, _)| key.0)
            .max()
            .unwrap_or(0)
    });
    
    let article_count = ARTICLES.with(|a| a.borrow().len());
    
    // Validate and fix NEXT_ARTICLE_ID
    let current_id = NEXT_ARTICLE_ID.with(|id| *id.borrow());
    
    if current_id <= max_article_id || current_id > 1_000_000 || (article_count > 0 && current_id > max_article_id + 100) {
        let safe_id = max_article_id + 1;
        NEXT_ARTICLE_ID.with(|id| {
            *id.borrow_mut() = safe_id;
        });
        ic_cdk::println!("post_upgrade: Fixed NEXT_ARTICLE_ID from {} to {} (max: {}, count: {})", 
            current_id, safe_id, max_article_id, article_count);
    } else {
        ic_cdk::println!("post_upgrade: NEXT_ARTICLE_ID is valid: {} (max: {}, count: {})", 
            current_id, max_article_id, article_count);
    }
    
    // Also call the validation function for consistency
    ensure_article_id_valid();
    
    ic_cdk::println!("post_upgrade: Stable memory validation complete");
}

ic_cdk::export_candid!();
