//! Queen Bee AI Pipeline Orchestrator
//! 
//! This canister orchestrates the entire AI pipeline:
//! 1. Receives requests from NFT canisters (the "bees")
//! 2. Coordinates on-chain DeepSeek R1 inference via model shards
//! 3. Performs parallel HTTP outcalls to external LLMs
//! 4. Synthesizes consensus responses
//! 5. Processes voice synthesis
//! 6. Stores memories in sharded vector database
//! 
//! Architecture:
//! - Queen Bee: Main orchestrator (this canister)
//! - Model Shards: deepseek_model canisters storing model weights
//! - Vector DB Shards: vector_db canisters storing embeddings
//! - NFT Canisters: Individual "bees" that call the queen

use candid::{CandidType, Decode, Encode, Principal};
use ic_cdk::{api::call::call, init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    DefaultMemoryImpl, StableBTreeMap, Storable,
};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;

// Memory IDs
const MODEL_CANISTERS_MEM_ID: MemoryId = MemoryId::new(0);
const VECTOR_DB_CANISTERS_MEM_ID: MemoryId = MemoryId::new(1);

type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    // Store canister IDs for model shards
    static MODEL_CANISTERS: RefCell<StableBTreeMap<StorableU32, StorablePrincipal, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MODEL_CANISTERS_MEM_ID))
        ));

    // Store canister IDs for vector DB shards
    static VECTOR_DB_CANISTERS: RefCell<StableBTreeMap<StorableU32, StorablePrincipal, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(VECTOR_DB_CANISTERS_MEM_ID))
        ));
}

// ============================================================================
// Types
// ============================================================================

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub timestamp: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AIRequest {
    #[serde(rename = "query_text")]
    pub query: String,
    pub system_prompt: Option<String>,
    pub context: Vec<ChatMessage>,
    pub token_id: Option<u64>,
    pub use_onchain: bool,
    pub use_http_parallel: bool,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AIResponse {
    pub response: String,
    pub confidence_score: f32,
    pub inference_method: String,
    pub tokens_used: u32,
    pub latency_ms: u64,
    pub model_responses: Vec<(String, String, f32)>, // (model_name, response, confidence)
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct VoiceRequest {
    pub text: String,
    pub voice_id: Option<String>,
    pub stability: Option<f32>,
    pub similarity_boost: Option<f32>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct VoiceResponse {
    pub audio_base64: String,
    pub duration_ms: u64,
    pub characters_used: u32,
}

// Storable types
#[derive(Clone, Copy, Ord, PartialOrd, Eq, PartialEq)]
struct StorableU32(u32);

impl Storable for StorableU32 {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.to_le_bytes().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let mut arr = [0u8; 4];
        arr.copy_from_slice(&bytes[..4]);
        StorableU32(u32::from_le_bytes(arr))
    }

    const BOUND: ic_stable_structures::storable::Bound =
        ic_stable_structures::storable::Bound::Bounded {
            max_size: 4,
            is_fixed_size: true,
        };
}

// Wrapper for Principal to make it Storable
#[derive(Clone, Ord, PartialOrd, Eq, PartialEq)]
struct StorablePrincipal(Principal);

impl Storable for StorablePrincipal {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_slice().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        StorablePrincipal(Principal::from_slice(&bytes))
    }

    const BOUND: ic_stable_structures::storable::Bound =
        ic_stable_structures::storable::Bound::Bounded {
            max_size: 29,
            is_fixed_size: false,
        };
}

// ============================================================================
// Canister Lifecycle
// ============================================================================

#[init]
fn init() {
    ic_cdk::println!("Queen Bee AI Pipeline Orchestrator initialized");
}

#[pre_upgrade]
fn pre_upgrade() {
    // Stable structures handle their own persistence
}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("Queen Bee AI Pipeline Orchestrator upgraded");
}

// ============================================================================
// Canister Registration
// ============================================================================

/// Register a model shard canister
#[update]
fn register_model_canister(shard_id: u32, canister_id: Principal) -> Result<(), String> {
    let caller = ic_cdk::caller();
    if !ic_cdk::api::is_controller(&caller) {
        return Err("Only controllers can register canisters".to_string());
    }
    
    MODEL_CANISTERS.with(|m| {
        m.borrow_mut()
            .insert(StorableU32(shard_id), StorablePrincipal(canister_id));
    });
    
    ic_cdk::println!("Registered model canister {} for shard {}", canister_id, shard_id);
    Ok(())
}

/// Register a vector DB shard canister
#[update]
fn register_vector_db_canister(shard_id: u32, canister_id: Principal) -> Result<(), String> {
    let caller = ic_cdk::caller();
    if !ic_cdk::api::is_controller(&caller) {
        return Err("Only controllers can register canisters".to_string());
    }
    
    VECTOR_DB_CANISTERS.with(|v| {
        v.borrow_mut()
            .insert(StorableU32(shard_id), StorablePrincipal(canister_id));
    });
    
    ic_cdk::println!("Registered vector DB canister {} for shard {}", canister_id, shard_id);
    Ok(())
}

// ============================================================================
// Main AI Pipeline
// ============================================================================

/// Analyze query and route to the best specialist in the swarm
fn analyze_specialist_routing(query: &str) -> u8 {
    let q = query.to_lowercase();
    
    // 1. Blockchain & Bitcoin Expert
    if q.contains("bitcoin") || q.contains("btc") || q.contains("ordinal") || q.contains("blockchain") || q.contains("consensus") || q.contains("ledger") {
        1 
    } 
    // 2. Creative Mind / Art & Culinary / RWA Specialist
    else if q.contains("pepper") || q.contains("spicy") || q.contains("farm") || q.contains("nursery") || q.contains("recipe") || q.contains("art") || q.contains("nft") || q.contains("creative") || q.contains("design") {
        2
    } 
    // 3. DeFi Sage / Finance & Trading
    else if q.contains("finance") || q.contains("defi") || q.contains("trading") || q.contains("token") || q.contains("yield") || q.contains("liquidity") || q.contains("dex") || q.contains("price") {
        3
    } 
    // 4. Tech Architect / Smart Contracts
    else if q.contains("code") || q.contains("contract") || q.contains("rust") || q.contains("develop") || q.contains("backend") || q.contains("api") || q.contains("candid") || q.contains("canister") {
        4
    } 
    // 5. Community Builder / Marketing / Engagement
    else if q.contains("community") || q.contains("twitter") || q.contains("social") || q.contains("marketing") || q.contains("discord") || q.contains("telegram") || q.contains("growth") {
        5
    } 
    // Default to the first specialist (Lead Oracle)
    else {
        1
    }
}

/// Process AI request - coordinates on-chain inference and HTTP outcalls
#[update]
async fn process_ai_request(request: AIRequest) -> Result<AIResponse, String> {
    let start_time = ic_cdk::api::time();
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    let mut model_responses: Vec<(String, String, f32)> = Vec::new();
    let mut inference_method = "none".to_string();

    // 1. Task Orchestration & Specialist Routing
    // Analyze query to find the best specialist in the swarm
    let specialist_id = analyze_specialist_routing(&request.query);
    ic_cdk::println!("Routing request to specialist AXIOM #{}", specialist_id);

    // 2. On-chain DeepSeek R1 inference (if enabled)
    if request.use_onchain {
        inference_method = "onchain".to_string();
        
        // Route to the specific model shard or specialist canister
        let model_canister = MODEL_CANISTERS.with(|m| {
            m.borrow().get(&StorableU32(specialist_id as u32)).map(|p| p.0)
                .or_else(|| m.borrow().iter().next().map(|(_, p)| p.0))
        });
        
        if let Some(model_canister_id) = model_canister {
            // Define InferenceRequest inline (can't import from other canister)
            #[derive(CandidType)]
            struct InferenceRequest {
                prompt: String,
                max_tokens: u32,
                temperature: f32,
                top_p: f32,
                context: Vec<ChatMessage>,
                system_prompt: Option<String>,
            }
            
            #[derive(CandidType, Deserialize)]
            struct InferenceResponse {
                response: String,
                tokens_generated: u32,
                inference_time_ms: u64,
                shards_used: Vec<u32>,
            }
            
            let inference_request = InferenceRequest {
                prompt: request.query.clone(),
                max_tokens: 512,
                temperature: 0.7,
                top_p: 0.95,
                context: request.context.clone(),
                system_prompt: request.system_prompt.clone(),
            };
            
            type CallResult = Result<(Result<InferenceResponse, String>,), (ic_cdk::api::call::RejectionCode, String)>;
            let call_result: CallResult = call(model_canister_id, "infer", (inference_request,)).await;
            
            match call_result {
                Ok((Ok(response),)) => {
                    model_responses.push((
                        "DeepSeek-R1-7B-OnChain".to_string(),
                        response.response,
                        0.85,
                    ));
                }
                Ok((Err(e),)) => {
                    ic_cdk::println!("On-chain inference error: {}", e);
                }
                Err(e) => {
                    ic_cdk::println!("On-chain inference call failed: {:?}", e);
                }
            }
        }
    }

    // 2. Parallel HTTP outcalls to external LLMs (if enabled)
    if request.use_http_parallel {
        if inference_method == "onchain" {
            inference_method = "hybrid".to_string();
        } else {
            inference_method = "http_parallel".to_string();
        }
        
        // Call raven_ai's query_ai_council for parallel HTTP outcalls
        let raven_ai_id = Principal::from_text("3noas-jyaaa-aaaao-a4xda-cai")
            .unwrap_or(Principal::anonymous());
        
        if raven_ai_id != Principal::anonymous() {
            // Define types for raven_ai inter-canister call
            #[derive(CandidType, Deserialize)]
            struct CouncilResponse {
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
            struct AICouncilSession {
                session_id: String,
                user: Principal,
                query: String,
                system_prompt: Option<String>,
                context: Vec<ChatMessage>,
                responses: Vec<CouncilResponse>,
                consensus: Option<ConsensusResult>,
                created_at: u64,
                completed_at: Option<u64>,
                total_tokens_used: u64,
                total_cost_usd: f64,
            }
            
            type RavenAICallResult = Result<(Result<AICouncilSession, String>,), (ic_cdk::api::call::RejectionCode, String)>;
            let raven_call_result: RavenAICallResult = call(
                raven_ai_id,
                "query_ai_council",
                (
                    request.query.clone(),
                    request.system_prompt.clone(),
                    request.context.clone(),
                    request.token_id,
                ),
            ).await;
            
            match raven_call_result {
                Ok((Ok(session),)) => {
                    // Extract responses from AI Council session
                    for council_response in session.responses {
                        if council_response.error.is_none() {
                            model_responses.push((
                                council_response.llm_name,
                                council_response.response,
                                council_response.confidence,
                            ));
                        }
                    }
                }
                Ok((Err(e),)) => {
                    ic_cdk::println!("HTTP parallel inference error: {}", e);
                }
                Err(e) => {
                    ic_cdk::println!("HTTP parallel inference call failed: {:?}", e);
                }
            }
        }
    }

    // 3. Synthesize consensus from all responses
    let consensus = if model_responses.is_empty() {
        "The Hive Mind could not reach a consensus. Please check your connectivity or try a different query.".to_string()
    } else if model_responses.len() == 1 {
        model_responses[0].1.clone()
    } else {
        // Multi-agent consensus synthesis
        // We use the highest confidence response as the base
        model_responses
            .iter()
            .max_by(|a, b| a.2.partial_cmp(&b.2).unwrap())
            .map(|(_, response, _)| response.clone())
            .unwrap_or_default()
    };

    let confidence_score = if model_responses.is_empty() {
        0.0
    } else {
        model_responses.iter().map(|(_, _, conf)| conf).sum::<f32>() / model_responses.len() as f32
    };

    let latency_ms = (ic_cdk::api::time() - start_time) / 1_000_000;

    Ok(AIResponse {
        response: consensus,
        confidence_score,
        inference_method,
        tokens_used: 0, 
        latency_ms,
        model_responses,
    })
}

// ============================================================================
// Voice Processing
// ============================================================================

/// Synthesize voice using Eleven Labs (via raven_ai canister)
#[update]
async fn synthesize_voice(request: VoiceRequest) -> Result<VoiceResponse, String> {
    // Call raven_ai canister for voice synthesis
    let raven_ai_id = Principal::from_text("3noas-jyaaa-aaaao-a4xda-cai")
        .unwrap_or(Principal::anonymous());
    
    if raven_ai_id == Principal::anonymous() {
        return Err("Raven AI canister not configured".to_string());
    }
    
    #[derive(CandidType, Deserialize)]
    struct VoiceSynthesisResponse {
        audio_data: Vec<u8>,
        content_type: String,
    }
    
    type VoiceCallResult = Result<(Result<VoiceSynthesisResponse, String>,), (ic_cdk::api::call::RejectionCode, String)>;
    let call_result: VoiceCallResult = call(
        raven_ai_id,
        "synthesize_voice",
        (
            request.text.clone(),
            request.voice_id.clone(),
            None::<String>, // model_id
            request.stability,
            request.similarity_boost,
        ),
    ).await;
    
    match call_result {
        Ok((Ok(response),)) => {
            // Convert audio bytes to base64
            use base64::{Engine as _, engine::general_purpose};
            let audio_base64 = general_purpose::STANDARD.encode(&response.audio_data);
            
            Ok(VoiceResponse {
                audio_base64,
                duration_ms: (request.text.len() as u64) * 100, // Estimate 100ms per character
                characters_used: request.text.len() as u32,
            })
        }
        Ok((Err(e),)) => Err(format!("Voice synthesis error: {}", e)),
        Err(e) => Err(format!("Voice synthesis call failed: {:?}", e)),
    }
}

// ============================================================================
// Memory Management
// ============================================================================

/// Store memory in vector database shards
#[update]
async fn store_memory(
    content: String,
    embedding: Vec<f32>,
    metadata: Vec<(String, String)>,
    importance: f32,
) -> Result<String, String> {
    // Get first vector DB canister (in production, would hash to determine shard)
    let vector_db_canister = VECTOR_DB_CANISTERS.with(|v| {
        v.borrow().iter().next().map(|(shard_id, p)| (shard_id.0, p.0))
    });
    
    if let Some((shard_id, vector_db_id)) = vector_db_canister {
        #[derive(CandidType)]
        struct VectorEmbedding {
            id: String,
            vector: Vec<f32>,
            metadata: Vec<(String, String)>,
            timestamp: u64,
            importance: f32,
            shard_id: u32,
        }
        
        let memory_id = format!("memory-{}-{}", ic_cdk::api::time(), shard_id);
        let now = ic_cdk::api::time();
        
        let vector_embedding = VectorEmbedding {
            id: memory_id.clone(),
            vector: embedding,
            metadata,
            timestamp: now,
            importance,
            shard_id,
        };
        
        type VectorCallResult = Result<(Result<(), String>,), (ic_cdk::api::call::RejectionCode, String)>;
        let call_result: VectorCallResult = call(vector_db_id, "store_vector", (vector_embedding,)).await;
        
        match call_result {
            Ok((Ok(_),)) => Ok(memory_id),
            Ok((Err(e),)) => Err(format!("Vector storage error: {}", e)),
            Err(e) => Err(format!("Vector storage call failed: {:?}", e)),
        }
    } else {
        Err("No vector DB canisters registered".to_string())
    }
}

/// Query memories from vector database shards
#[query]
async fn query_memory(
    query_text: String,
    top_k: u32,
) -> Result<Vec<(String, Vec<f32>, f32, Vec<(String, String)>)>, String> {
    // For now, query first vector DB canister
    // In production, would query all shards and aggregate results
    let vector_db_canister = VECTOR_DB_CANISTERS.with(|v| {
        v.borrow().iter().next().map(|(_, p)| p.0)
    });
    
    if let Some(vector_db_id) = vector_db_canister {
        // Generate embedding for query text (simplified - in production would use actual embedding model)
        // For now, create a simple embedding based on text hash
        let query_embedding: Vec<f32> = (0..384)
            .map(|i| {
                let hash = (query_text.len() as u64).wrapping_mul(i as u64);
                ((hash % 1000) as f32 / 1000.0) - 0.5
            })
            .collect();
        
        #[derive(CandidType)]
        struct QueryRequest {
            query_vector: Vec<f32>,
            top_k: u32,
            min_similarity: f32,
            filter_metadata: Option<Vec<(String, String)>>,
        }
        
        #[derive(CandidType, Deserialize)]
        struct QueryResult {
            id: String,
            vector: Vec<f32>,
            similarity: f32,
            metadata: Vec<(String, String)>,
            timestamp: u64,
        }
        
        let query_request = QueryRequest {
            query_vector: query_embedding,
            top_k,
            min_similarity: 0.0,
            filter_metadata: None,
        };
        
        type QueryCallResult = Result<(Result<Vec<QueryResult>, String>,), (ic_cdk::api::call::RejectionCode, String)>;
        let call_result: QueryCallResult = call(vector_db_id, "query_vectors", (query_request,)).await;
        
        match call_result {
            Ok((Ok(results),)) => {
                Ok(results.into_iter().map(|r| (r.id, r.vector, r.similarity, r.metadata)).collect())
            }
            Ok((Err(e),)) => Err(format!("Vector query error: {}", e)),
            Err(e) => Err(format!("Vector query call failed: {:?}", e)),
        }
    } else {
        Ok(Vec::new()) // Return empty if no vector DB canisters
    }
}

// ============================================================================
// Health & Status
// ============================================================================

/// Get canister status
#[query]
fn get_status() -> (bool, u64, u32, u32) {
    let model_shards = MODEL_CANISTERS.with(|m| m.borrow().len() as u32);
    let vector_shards = VECTOR_DB_CANISTERS.with(|v| v.borrow().len() as u32);
    let ready = model_shards > 0 && vector_shards > 0;
    let cycles_available = ic_cdk::api::canister_balance();
    
    (ready, cycles_available, model_shards, vector_shards)
}

// Export Candid interface
ic_cdk::export_candid!();

