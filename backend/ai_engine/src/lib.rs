//! AI Engine Canister - Route optimization, LLM Council, and AI Memory features
//! Handles HTTPS outcalls for AI services, multi-LLM consensus, and persistent memory

pub mod llm_council;
pub mod memory;

use candid::{CandidType, Decode, Encode, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::HashMap;

// Re-export LLM Council and Memory types
pub use llm_council::*;
pub use memory::*;

type MemoryType = VirtualMemory<DefaultMemoryImpl>;

const CACHE_MEM_ID: MemoryId = MemoryId::new(0);
const CONFIG_MEM_ID: MemoryId = MemoryId::new(1);
const LLM_SESSIONS_MEM_ID: MemoryId = MemoryId::new(2);
const AGENT_MEMORY_MEM_ID: MemoryId = MemoryId::new(3);

// Route optimization result
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct RouteOptimization {
    pub origin: String,
    pub destination: String,
    pub distance_miles: f64,
    pub duration_hours: f64,
    pub fuel_cost_estimate: f64,
    pub toll_cost_estimate: f64,
    pub weather_conditions: String,
    pub traffic_level: String,
    pub recommended_stops: Vec<String>,
    pub alternative_routes: Vec<AlternativeRoute>,
    pub cached_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AlternativeRoute {
    pub name: String,
    pub distance_miles: f64,
    pub duration_hours: f64,
    pub notes: String,
}

impl Storable for RouteOptimization {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// LLM Council Session wrapper for stable storage
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct StorableCouncilSession {
    pub session: llm_council::CouncilSession,
}

impl Storable for StorableCouncilSession {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// Agent Memory wrapper for stable storage
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct StorableAgentMemory {
    pub memory: memory::KIPMemoryLink,
}

impl Storable for StorableAgentMemory {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// AI Config
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AIConfig {
    pub admin: Principal,
    pub cache_duration_ns: u64,
    pub max_requests_per_minute: u32,
}

impl Default for AIConfig {
    fn default() -> Self {
        Self {
            admin: Principal::anonymous(),
            cache_duration_ns: 3600_000_000_000, // 1 hour
            max_requests_per_minute: 60,
        }
    }
}

impl Storable for AIConfig {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 100,
        is_fixed_size: false,
    };
}

// Storable wrapper for String
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct StorableString(String);

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

// Thread-local storage
thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static ROUTE_CACHE: RefCell<StableBTreeMap<StorableString, RouteOptimization, MemoryType>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(CACHE_MEM_ID))
        ));

    static CONFIG: RefCell<StableCell<AIConfig, MemoryType>> =
        RefCell::new(StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(CONFIG_MEM_ID)),
            AIConfig::default()
        ).unwrap());

    // LLM Council sessions storage
    static LLM_SESSIONS: RefCell<StableBTreeMap<StorableString, StorableCouncilSession, MemoryType>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(LLM_SESSIONS_MEM_ID))
        ));

    // Agent memory storage (principal -> memory)
    static AGENT_MEMORIES: RefCell<StableBTreeMap<StorableString, StorableAgentMemory, MemoryType>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(AGENT_MEMORY_MEM_ID))
        ));

    // In-memory LLM Council for active operations
    static LLM_COUNCIL: RefCell<llm_council::LLMCouncil> =
        RefCell::new(llm_council::LLMCouncil::new(llm_council::CouncilConfig::default()));
}

const ADMIN_PRINCIPAL: &str = "lgd5r-y4x7q-lbrfa-mabgw-xurgu-4h3at-sw4sl-yyr3k-5kwgt-vlkao-jae";

fn is_admin(caller: Principal) -> bool {
    CONFIG.with(|c| c.borrow().get().admin == caller)
        || caller.to_text() == ADMIN_PRINCIPAL
}

fn generate_cache_key(origin: &str, destination: &str) -> String {
    format!("{}|{}", origin.to_lowercase(), destination.to_lowercase())
}

// Initialization
#[init]
fn init() {
    let caller = ic_cdk::caller();
    
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        config.admin = if caller != Principal::anonymous() {
            caller
        } else {
            Principal::from_text(ADMIN_PRINCIPAL).unwrap()
        };
        c.borrow_mut().set(config).unwrap();
    });
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {}

// === Route Optimization ===

#[update]
async fn optimize_route(origin: String, destination: String) -> Result<RouteOptimization, String> {
    let now = ic_cdk::api::time();
    let cache_key = generate_cache_key(&origin, &destination);
    let config = CONFIG.with(|c| c.borrow().get().clone());
    
    // Check cache
    let cached = ROUTE_CACHE.with(|r| r.borrow().get(&StorableString(cache_key.clone())));
    
    if let Some(route) = cached {
        if now - route.cached_at < config.cache_duration_ns {
            return Ok(route);
        }
    }
    
    // In production, this would make HTTPS outcalls to:
    // - Google Maps API for routing
    // - Weather API for conditions
    // - Traffic API for real-time data
    
    // For now, generate simulated optimization
    let route = generate_simulated_route(&origin, &destination, now);
    
    // Cache result
    ROUTE_CACHE.with(|r| {
        r.borrow_mut().insert(StorableString(cache_key), route.clone());
    });
    
    Ok(route)
}

fn generate_simulated_route(origin: &str, destination: &str, now: u64) -> RouteOptimization {
    // Simulated route data
    let base_distance = 300.0 + (now % 500) as f64;
    let base_duration = base_distance / 55.0; // ~55 mph average
    
    RouteOptimization {
        origin: origin.to_string(),
        destination: destination.to_string(),
        distance_miles: base_distance,
        duration_hours: base_duration,
        fuel_cost_estimate: base_distance * 0.45, // ~$0.45/mile
        toll_cost_estimate: base_distance * 0.02, // ~$0.02/mile
        weather_conditions: "Clear".to_string(),
        traffic_level: "Moderate".to_string(),
        recommended_stops: vec![
            "Rest Stop - Mile 100".to_string(),
            "Fuel Station - Mile 200".to_string(),
        ],
        alternative_routes: vec![
            AlternativeRoute {
                name: "Scenic Route".to_string(),
                distance_miles: base_distance * 1.15,
                duration_hours: base_duration * 1.25,
                notes: "More scenic, fewer trucks".to_string(),
            },
            AlternativeRoute {
                name: "Toll-Free Route".to_string(),
                distance_miles: base_distance * 1.1,
                duration_hours: base_duration * 1.2,
                notes: "No tolls, slightly longer".to_string(),
            },
        ],
        cached_at: now,
    }
}

// === ETA Prediction ===

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ETAPrediction {
    pub origin: String,
    pub destination: String,
    pub current_location: Option<String>,
    pub estimated_arrival: String,
    pub confidence: f64,
    pub factors: Vec<String>,
}

#[query]
fn predict_eta(
    origin: String,
    destination: String,
    current_location: Option<String>,
) -> ETAPrediction {
    // Simulated ETA prediction
    let now = ic_cdk::api::time();
    let hours = 5 + (now % 10) as u64;
    
    ETAPrediction {
        origin,
        destination,
        current_location,
        estimated_arrival: format!("{} hours", hours),
        confidence: 0.85,
        factors: vec![
            "Current traffic conditions".to_string(),
            "Weather forecast".to_string(),
            "Historical data".to_string(),
        ],
    }
}

// === Fuel Optimization ===

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct FuelOptimization {
    pub route: String,
    pub total_fuel_gallons: f64,
    pub estimated_cost: f64,
    pub recommended_stops: Vec<FuelStop>,
    pub potential_savings: f64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct FuelStop {
    pub location: String,
    pub price_per_gallon: f64,
    pub distance_from_start: f64,
}

#[query]
fn optimize_fuel(origin: String, destination: String, mpg: f64) -> FuelOptimization {
    let distance = 300.0; // Simulated
    let gallons_needed = distance / mpg;
    
    FuelOptimization {
        route: format!("{} to {}", origin, destination),
        total_fuel_gallons: gallons_needed,
        estimated_cost: gallons_needed * 3.50,
        recommended_stops: vec![
            FuelStop {
                location: "Truck Stop A - Mile 150".to_string(),
                price_per_gallon: 3.45,
                distance_from_start: 150.0,
            },
        ],
        potential_savings: gallons_needed * 0.10, // ~$0.10/gallon savings
    }
}

// === Cache Management ===

#[update]
fn clear_cache() -> Result<u64, String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Only admin can clear cache".to_string());
    }
    
    let count = ROUTE_CACHE.with(|r| {
        let len = r.borrow().len();
        // Clear by reinitializing
        r.replace(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(CACHE_MEM_ID))
        ));
        len
    });
    
    Ok(count)
}

#[query]
fn get_cache_stats() -> (u64, u64) {
    let count = ROUTE_CACHE.with(|r| r.borrow().len());
    let config = CONFIG.with(|c| c.borrow().get().clone());
    (count, config.cache_duration_ns / 1_000_000_000) // count, cache_duration_seconds
}

#[query]
fn get_cached_route(origin: String, destination: String) -> Option<RouteOptimization> {
    let cache_key = generate_cache_key(&origin, &destination);
    ROUTE_CACHE.with(|r| r.borrow().get(&StorableString(cache_key)))
}

#[query]
fn get_config() -> AIConfig {
    CONFIG.with(|c| c.borrow().get().clone())
}

#[query]
fn health() -> String {
    "OK".to_string()
}

// === LLM Council API ===

/// Create a new council query session
#[update]
fn create_council_query(query: String, priority: String) -> Result<String, String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    let query_priority = match priority.as_str() {
        "low" => llm_council::QueryPriority::Low,
        "high" => llm_council::QueryPriority::High,
        "critical" => llm_council::QueryPriority::Critical,
        _ => llm_council::QueryPriority::Normal,
    };

    let council_query = llm_council::CouncilQuery {
        query_id: format!("{}-{}", caller.to_text(), ic_cdk::api::time()),
        user_query: query,
        context: None,
        requested_at: ic_cdk::api::time(),
        priority: query_priority,
    };

    let session_id = LLM_COUNCIL.with(|c| {
        c.borrow_mut().create_session(council_query)
    });

    Ok(session_id)
}

/// Add an LLM response to a council session
#[update]
fn add_council_response(
    session_id: String,
    provider_id: String,
    provider_name: String,
    response: String,
    tokens_used: u32,
    latency_ms: u64,
) -> Result<String, String> {
    let llm_response = llm_council::LLMResponse {
        provider_id,
        provider_name,
        response,
        tokens_used,
        latency_ms,
        timestamp: ic_cdk::api::time(),
    };

    LLM_COUNCIL.with(|c| {
        c.borrow_mut().add_response(&session_id, llm_response)
    })?;

    Ok("Response added".to_string())
}

/// Add a review to a council session
#[update]
fn add_council_review(
    session_id: String,
    reviewer_id: String,
    reviewed_response_id: String,
    accuracy_score: u8,
    insight_score: u8,
    completeness_score: u8,
    overall_rank: u8,
    feedback: String,
) -> Result<String, String> {
    let review = llm_council::ResponseReview {
        reviewer_id,
        reviewed_response_id,
        accuracy_score,
        insight_score,
        completeness_score,
        overall_rank,
        feedback,
    };

    LLM_COUNCIL.with(|c| {
        c.borrow_mut().add_review(&session_id, review)
    })?;

    Ok("Review added".to_string())
}

/// Set the final consensus response from chairman
#[update]
fn finalize_council_response(
    session_id: String,
    final_response: String,
    summary: String,
) -> Result<llm_council::CouncilResult, String> {
    LLM_COUNCIL.with(|c| {
        c.borrow_mut().set_final_response(&session_id, final_response, summary)
    })
}

/// Get council session status
#[query]
fn get_council_session(session_id: String) -> Option<llm_council::CouncilSession> {
    LLM_COUNCIL.with(|c| {
        c.borrow().get_session(&session_id).cloned()
    })
}

/// Get chairman prompt for synthesizing responses
#[query]
fn get_chairman_prompt(session_id: String) -> Result<String, String> {
    LLM_COUNCIL.with(|c| {
        c.borrow().generate_chairman_prompt(&session_id)
    })
}

/// Get council configuration
#[query]
fn get_council_config() -> llm_council::CouncilConfig {
    LLM_COUNCIL.with(|c| c.borrow().config.clone())
}

// === Agent Memory API ===

/// Get or create agent memory for a user
#[update]
fn get_agent_memory(agent_id: String) -> memory::AgentMemory {
    let caller = ic_cdk::caller();
    let principal_str = caller.to_text();

    AGENT_MEMORIES.with(|m| {
        let mut memories = m.borrow_mut();
        
        if let Some(stored) = memories.get(&StorableString(principal_str.clone())) {
            let mut link = stored.memory.clone();
            link.get_agent_memory(&agent_id).clone()
        } else {
            let mut link = memory::KIPMemoryLink::new(principal_str.clone());
            let agent_mem = link.get_agent_memory(&agent_id).clone();
            memories.insert(
                StorableString(principal_str),
                StorableAgentMemory { memory: link }
            );
            agent_mem
        }
    })
}

/// Add a memory for an agent
#[update]
fn remember(
    agent_id: String,
    content: String,
    memory_type: String,
    importance: f32,
    tags: Vec<String>,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    let mem_type = match memory_type.as_str() {
        "short_term" => memory::MemoryType::ShortTerm,
        "long_term" => memory::MemoryType::LongTerm,
        "episodic" => memory::MemoryType::Episodic,
        "semantic" => memory::MemoryType::Semantic,
        "procedural" => memory::MemoryType::Procedural,
        _ => memory::MemoryType::ShortTerm,
    };

    let principal_str = caller.to_text();

    AGENT_MEMORIES.with(|m| {
        let mut memories = m.borrow_mut();
        
        let mut link = if let Some(stored) = memories.get(&StorableString(principal_str.clone())) {
            stored.memory.clone()
        } else {
            memory::KIPMemoryLink::new(principal_str.clone())
        };

        let agent_mem = link.get_agent_memory(&agent_id);
        let memory_id = agent_mem.remember(content, mem_type, importance, tags);

        memories.insert(
            StorableString(principal_str),
            StorableAgentMemory { memory: link }
        );

        Ok(memory_id)
    })
}

/// Recall memories relevant to a query
#[query]
fn recall(agent_id: String, query: String, max_results: u32) -> Vec<memory::Memory> {
    let caller = ic_cdk::caller();
    let principal_str = caller.to_text();

    AGENT_MEMORIES.with(|m| {
        if let Some(stored) = m.borrow().get(&StorableString(principal_str)) {
            let mut link = stored.memory.clone();
            let agent_mem = link.get_agent_memory(&agent_id);
            agent_mem.recall(&query, max_results as usize)
                .into_iter()
                .cloned()
                .collect()
        } else {
            Vec::new()
        }
    })
}

/// Add context to agent conversation
#[update]
fn add_context(agent_id: String, message: String) -> Result<String, String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    let principal_str = caller.to_text();

    AGENT_MEMORIES.with(|m| {
        let mut memories = m.borrow_mut();
        
        let mut link = if let Some(stored) = memories.get(&StorableString(principal_str.clone())) {
            stored.memory.clone()
        } else {
            memory::KIPMemoryLink::new(principal_str.clone())
        };

        let agent_mem = link.get_agent_memory(&agent_id);
        agent_mem.add_context(message);

        memories.insert(
            StorableString(principal_str),
            StorableAgentMemory { memory: link }
        );

        Ok("Context added".to_string())
    })
}

/// Get current conversation context
#[query]
fn get_context(agent_id: String) -> String {
    let caller = ic_cdk::caller();
    let principal_str = caller.to_text();

    AGENT_MEMORIES.with(|m| {
        if let Some(stored) = m.borrow().get(&StorableString(principal_str)) {
            let mut link = stored.memory.clone();
            link.get_agent_memory(&agent_id).get_context()
        } else {
            String::new()
        }
    })
}

/// Add a knowledge node to agent's knowledge graph
#[update]
fn add_knowledge_node(
    agent_id: String,
    node_type: String,
    label: String,
    properties: Vec<(String, String)>,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    let n_type = match node_type.as_str() {
        "entity" => memory::NodeType::Entity,
        "concept" => memory::NodeType::Concept,
        "event" => memory::NodeType::Event,
        "action" => memory::NodeType::Action,
        "attribute" => memory::NodeType::Attribute,
        _ => memory::NodeType::Entity,
    };

    let principal_str = caller.to_text();

    AGENT_MEMORIES.with(|m| {
        let mut memories = m.borrow_mut();
        
        let mut link = if let Some(stored) = memories.get(&StorableString(principal_str.clone())) {
            stored.memory.clone()
        } else {
            memory::KIPMemoryLink::new(principal_str.clone())
        };

        let agent_mem = link.get_agent_memory(&agent_id);
        
        let node = memory::KnowledgeNode {
            id: format!("node-{}", ic_cdk::api::time()),
            node_type: n_type,
            label,
            properties: properties.into_iter().collect(),
            embedding: None,
            created_at: ic_cdk::api::time(),
            updated_at: ic_cdk::api::time(),
        };

        let node_id = agent_mem.knowledge_graph.add_node(node);

        memories.insert(
            StorableString(principal_str),
            StorableAgentMemory { memory: link }
        );

        Ok(node_id)
    })
}

/// Add a knowledge edge between nodes
#[update]
fn add_knowledge_edge(
    agent_id: String,
    source_id: String,
    target_id: String,
    relationship: String,
    weight: f32,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    let principal_str = caller.to_text();

    AGENT_MEMORIES.with(|m| {
        let mut memories = m.borrow_mut();
        
        let mut link = if let Some(stored) = memories.get(&StorableString(principal_str.clone())) {
            stored.memory.clone()
        } else {
            memory::KIPMemoryLink::new(principal_str.clone())
        };

        let agent_mem = link.get_agent_memory(&agent_id);
        
        let edge = memory::KnowledgeEdge {
            id: format!("edge-{}", ic_cdk::api::time()),
            source_id,
            target_id,
            relationship,
            weight,
            properties: HashMap::new(),
            created_at: ic_cdk::api::time(),
        };

        let result = agent_mem.knowledge_graph.add_edge(edge)?;

        memories.insert(
            StorableString(principal_str),
            StorableAgentMemory { memory: link }
        );

        Ok(result)
    })
}

/// Find knowledge node by label
#[query]
fn find_knowledge_node(agent_id: String, label: String) -> Option<memory::KnowledgeNode> {
    let caller = ic_cdk::caller();
    let principal_str = caller.to_text();

    AGENT_MEMORIES.with(|m| {
        if let Some(stored) = m.borrow().get(&StorableString(principal_str)) {
            let mut link = stored.memory.clone();
            let agent_mem = link.get_agent_memory(&agent_id);
            agent_mem.knowledge_graph.find_by_label(&label).cloned()
        } else {
            None
        }
    })
}

/// Perform memory maintenance (consolidation, decay, forgetting)
#[update]
fn maintain_memory(agent_id: String) -> Result<String, String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    let principal_str = caller.to_text();

    AGENT_MEMORIES.with(|m| {
        let mut memories = m.borrow_mut();
        
        if let Some(stored) = memories.get(&StorableString(principal_str.clone())) {
            let mut link = stored.memory.clone();
            let agent_mem = link.get_agent_memory(&agent_id);
            agent_mem.maintain();

            memories.insert(
                StorableString(principal_str),
                StorableAgentMemory { memory: link }
            );

            Ok("Memory maintenance completed".to_string())
        } else {
            Err("No memory found for user".to_string())
        }
    })
}

/// Get memory statistics for an agent
#[query]
fn get_memory_stats(agent_id: String) -> (u64, u64, u64) {
    let caller = ic_cdk::caller();
    let principal_str = caller.to_text();

    AGENT_MEMORIES.with(|m| {
        if let Some(stored) = m.borrow().get(&StorableString(principal_str)) {
            let mut link = stored.memory.clone();
            let agent_mem = link.get_agent_memory(&agent_id);
            
            let memory_count = agent_mem.memory_store.memories.len() as u64;
            let node_count = agent_mem.knowledge_graph.nodes.len() as u64;
            let edge_count = agent_mem.knowledge_graph.edges.len() as u64;
            
            (memory_count, node_count, edge_count)
        } else {
            (0, 0, 0)
        }
    })
}

// Generate Candid
ic_cdk::export_candid!();

