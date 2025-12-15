//! Vector Database Sharding Canister
//! 
//! This canister stores and queries sharded vector embeddings for persistent memory.
//! Vectors are distributed across multiple canisters for scalability.
//! 
//! Architecture:
//! - Each canister stores a subset of vectors based on shard_id
//! - Cosine similarity search for memory retrieval
//! - Metadata filtering for advanced queries

use candid::{CandidType, Decode, Encode, Principal};
use ic_cdk::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    DefaultMemoryImpl, StableBTreeMap, Storable,
};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;

// Memory IDs
const VECTORS_MEM_ID: MemoryId = MemoryId::new(0);
const SHARD_ID_MEM_ID: MemoryId = MemoryId::new(1);

type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static VECTORS: RefCell<StableBTreeMap<StorableString, VectorEmbedding, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(VECTORS_MEM_ID))
        ));

    static SHARD_ID: RefCell<ic_stable_structures::StableCell<u32, Memory>> =
        RefCell::new(ic_stable_structures::StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(SHARD_ID_MEM_ID)),
            0
        ).unwrap());
}

// ============================================================================
// Types
// ============================================================================

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct VectorEmbedding {
    pub id: String,
    pub vector: Vec<f32>,
    pub metadata: Vec<(String, String)>,
    pub timestamp: u64,
    pub importance: f32,
    pub shard_id: u32,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct QueryRequest {
    pub query_vector: Vec<f32>,
    pub top_k: u32,
    pub min_similarity: f32,
    pub filter_metadata: Option<Vec<(String, String)>>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct QueryResult {
    pub id: String,
    pub vector: Vec<f32>,
    pub similarity: f32,
    pub metadata: Vec<(String, String)>,
    pub timestamp: u64,
}

// Storable types
#[derive(Clone, Ord, PartialOrd, Eq, PartialEq)]
struct StorableString(String);

impl Storable for StorableString {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_bytes().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        StorableString(String::from_utf8(bytes.to_vec()).unwrap_or_default())
    }

    const BOUND: ic_stable_structures::storable::Bound =
        ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for VectorEmbedding {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound =
        ic_stable_structures::storable::Bound::Unbounded;
}

// ============================================================================
// Canister Lifecycle
// ============================================================================

#[init]
fn init() {
    ic_cdk::println!("Vector DB Canister initialized");
}

#[pre_upgrade]
fn pre_upgrade() {
    // Stable structures handle their own persistence
}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("Vector DB Canister upgraded");
}

// ============================================================================
// Vector Storage
// ============================================================================

/// Store a vector embedding
#[update]
fn store_vector(embedding: VectorEmbedding) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Anonymous callers not allowed".to_string());
    }

    // Ensure shard_id matches this canister's shard
    let this_shard_id = SHARD_ID.with(|s| s.borrow().get().clone());
    if embedding.shard_id != this_shard_id {
        return Err(format!(
            "Shard ID mismatch: expected {}, got {}",
            this_shard_id, embedding.shard_id
        ));
    }

    VECTORS.with(|v| {
        v.borrow_mut()
            .insert(StorableString(embedding.id.clone()), embedding.clone());
    });

    ic_cdk::println!("Stored vector: {}", embedding.id);
    Ok(())
}

/// Get a specific vector
#[query]
fn get_vector(id: String) -> Result<VectorEmbedding, String> {
    VECTORS.with(|v| {
        v.borrow()
            .get(&StorableString(id))
            .ok_or_else(|| "Vector not found".to_string())
    })
}

/// Delete a vector
#[update]
fn delete_vector(id: String) -> Result<(), String> {
    VECTORS.with(|v| {
        v.borrow_mut()
            .remove(&StorableString(id))
            .ok_or_else(|| "Vector not found".to_string())
            .map(|_| ())
    })
}

// ============================================================================
// Vector Search
// ============================================================================

/// Calculate cosine similarity between two vectors
fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return 0.0;
    }

    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }

    dot_product / (norm_a * norm_b)
}

/// Query vectors by similarity
#[query]
fn query_vectors(request: QueryRequest) -> Result<Vec<QueryResult>, String> {
    let mut results: Vec<(QueryResult, f32)> = Vec::new();

    VECTORS.with(|v| {
        for (_, embedding) in v.borrow().iter() {
            // Check metadata filter if provided
            if let Some(ref filter) = request.filter_metadata {
                let mut matches = true;
                for (key, value) in filter {
                    let found = embedding.metadata.iter().any(|(k, v)| k == key && v == value);
                    if !found {
                        matches = false;
                        break;
                    }
                }
                if !matches {
                    continue;
                }
            }

            let similarity = cosine_similarity(&request.query_vector, &embedding.vector);
            
            if similarity >= request.min_similarity {
                results.push((
                    QueryResult {
                        id: embedding.id.clone(),
                        vector: embedding.vector.clone(),
                        similarity,
                        metadata: embedding.metadata.clone(),
                        timestamp: embedding.timestamp,
                    },
                    similarity * embedding.importance, // Weight by importance
                ));
            }
        }
    });

    // Sort by weighted similarity and take top_k
    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
    results.truncate(request.top_k as usize);

    Ok(results.into_iter().map(|(result, _)| result).collect())
}

/// Query similar vectors (simplified interface)
#[query]
fn query_similar(query_vector: Vec<f32>, top_k: u32) -> Result<Vec<QueryResult>, String> {
    query_vectors(QueryRequest {
        query_vector,
        top_k,
        min_similarity: 0.0,
        filter_metadata: None,
    })
}

// ============================================================================
// Shard Management
// ============================================================================

/// Get shard information
#[query]
fn get_shard_info() -> (u32, u64) {
    let shard_id = SHARD_ID.with(|s| s.borrow().get().clone());
    let vector_count = VECTORS.with(|v| v.borrow().len() as u64);
    (shard_id, vector_count)
}

/// Get all vector IDs in this shard
#[query]
fn get_all_vector_ids() -> Vec<String> {
    VECTORS.with(|v| {
        v.borrow()
            .iter()
            .map(|(k, _)| k.0.clone())
            .collect()
    })
}

// ============================================================================
// Health & Status
// ============================================================================

/// Get canister status
#[query]
fn get_status() -> (bool, u64, u64) {
    let vector_count = VECTORS.with(|v| v.borrow().len() as u64);
    let ready = vector_count > 0;
    let cycles_available = ic_cdk::api::canister_balance();
    
    (ready, cycles_available, vector_count)
}

// Export Candid interface
ic_cdk::export_candid!();




