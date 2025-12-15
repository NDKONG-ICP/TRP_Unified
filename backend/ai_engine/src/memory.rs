//! AI Memory System - Short-term and Long-term Memory with Knowledge Graph
//! Based on https://github.com/GibsonAI/memori-typescript
//! and https://github.com/topoteretes/cognee

use candid::{CandidType, Decode, Encode};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Memory types for AI agents
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum MemoryType {
    ShortTerm,      // Session-based, temporary
    LongTerm,       // Persistent, important memories
    Episodic,       // Event-based memories
    Semantic,       // Facts and knowledge
    Procedural,     // How-to knowledge
}

/// A single memory entry
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Memory {
    pub id: String,
    pub memory_type: MemoryType,
    pub content: String,
    pub summary: Option<String>,
    pub embedding: Option<Vec<f32>>,  // Vector embedding for similarity search
    pub importance: f32,              // 0.0 - 1.0
    pub access_count: u32,
    pub last_accessed: u64,
    pub created_at: u64,
    pub metadata: HashMap<String, String>,
    pub related_memories: Vec<String>, // IDs of related memories
    pub tags: Vec<String>,
}

/// Knowledge Graph Node
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct KnowledgeNode {
    pub id: String,
    pub node_type: NodeType,
    pub label: String,
    pub properties: HashMap<String, String>,
    pub embedding: Option<Vec<f32>>,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum NodeType {
    Entity,      // Person, Place, Thing
    Concept,     // Abstract idea
    Event,       // Something that happened
    Action,      // Something that can be done
    Attribute,   // Property of something
}

/// Knowledge Graph Edge (Relationship)
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct KnowledgeEdge {
    pub id: String,
    pub source_id: String,
    pub target_id: String,
    pub relationship: String,
    pub weight: f32,
    pub properties: HashMap<String, String>,
    pub created_at: u64,
}

/// Vector Store Entry for similarity search
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct VectorEntry {
    pub id: String,
    pub vector: Vec<f32>,
    pub content: String,
    pub metadata: HashMap<String, String>,
    pub created_at: u64,
}

/// Memory Store - Main storage for AI memories
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default)]
pub struct MemoryStore {
    pub memories: HashMap<String, Memory>,
    pub short_term_buffer: Vec<String>,  // IDs of recent memories
    pub buffer_size: usize,
}

impl MemoryStore {
    pub fn new(buffer_size: usize) -> Self {
        Self {
            memories: HashMap::new(),
            short_term_buffer: Vec::new(),
            buffer_size,
        }
    }

    /// Add a new memory
    pub fn add_memory(&mut self, memory: Memory) -> String {
        let id = memory.id.clone();
        
        // Add to short-term buffer
        self.short_term_buffer.push(id.clone());
        
        // Maintain buffer size
        while self.short_term_buffer.len() > self.buffer_size {
            let oldest = self.short_term_buffer.remove(0);
            // Move to long-term if important enough
            if let Some(mem) = self.memories.get(&oldest) {
                if mem.importance < 0.5 && mem.memory_type == MemoryType::ShortTerm {
                    // Low importance short-term memories can be forgotten
                    self.memories.remove(&oldest);
                }
            }
        }

        self.memories.insert(id.clone(), memory);
        id
    }

    /// Retrieve a memory by ID
    pub fn get_memory(&mut self, id: &str) -> Option<&Memory> {
        if let Some(memory) = self.memories.get_mut(id) {
            memory.access_count += 1;
            memory.last_accessed = ic_cdk::api::time();
        }
        self.memories.get(id)
    }

    /// Search memories by tags
    pub fn search_by_tags(&self, tags: &[String]) -> Vec<&Memory> {
        self.memories.values()
            .filter(|m| tags.iter().any(|t| m.tags.contains(t)))
            .collect()
    }

    /// Get recent memories from short-term buffer
    pub fn get_recent_memories(&self, count: usize) -> Vec<&Memory> {
        self.short_term_buffer.iter()
            .rev()
            .take(count)
            .filter_map(|id| self.memories.get(id))
            .collect()
    }

    /// Consolidate memories (move important short-term to long-term)
    pub fn consolidate(&mut self) {
        for id in &self.short_term_buffer.clone() {
            if let Some(memory) = self.memories.get_mut(id) {
                if memory.importance >= 0.7 && memory.memory_type == MemoryType::ShortTerm {
                    memory.memory_type = MemoryType::LongTerm;
                }
            }
        }
    }

    /// Decay old memories (reduce importance over time)
    pub fn decay_memories(&mut self, decay_rate: f32) {
        let now = ic_cdk::api::time();
        let day_ns = 24 * 60 * 60 * 1_000_000_000u64;

        for memory in self.memories.values_mut() {
            if memory.memory_type == MemoryType::ShortTerm {
                let age_days = (now - memory.last_accessed) / day_ns;
                let decay = decay_rate * age_days as f32;
                memory.importance = (memory.importance - decay).max(0.0);
            }
        }
    }

    /// Remove forgotten memories (importance = 0)
    pub fn forget(&mut self) {
        self.memories.retain(|_, m| m.importance > 0.0);
        self.short_term_buffer.retain(|id| self.memories.contains_key(id));
    }
}

/// Knowledge Graph for structured knowledge representation
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default)]
pub struct KnowledgeGraph {
    pub nodes: HashMap<String, KnowledgeNode>,
    pub edges: HashMap<String, KnowledgeEdge>,
    pub node_by_label: HashMap<String, String>,  // label -> node_id
}

impl KnowledgeGraph {
    pub fn new() -> Self {
        Self {
            nodes: HashMap::new(),
            edges: HashMap::new(),
            node_by_label: HashMap::new(),
        }
    }

    /// Add a node to the graph
    pub fn add_node(&mut self, node: KnowledgeNode) -> String {
        let id = node.id.clone();
        self.node_by_label.insert(node.label.clone().to_lowercase(), id.clone());
        self.nodes.insert(id.clone(), node);
        id
    }

    /// Add an edge (relationship) between nodes
    pub fn add_edge(&mut self, edge: KnowledgeEdge) -> Result<String, String> {
        // Verify both nodes exist
        if !self.nodes.contains_key(&edge.source_id) {
            return Err(format!("Source node {} not found", edge.source_id));
        }
        if !self.nodes.contains_key(&edge.target_id) {
            return Err(format!("Target node {} not found", edge.target_id));
        }

        let id = edge.id.clone();
        self.edges.insert(id.clone(), edge);
        Ok(id)
    }

    /// Find node by label
    pub fn find_by_label(&self, label: &str) -> Option<&KnowledgeNode> {
        self.node_by_label.get(&label.to_lowercase())
            .and_then(|id| self.nodes.get(id))
    }

    /// Get all edges for a node
    pub fn get_edges(&self, node_id: &str) -> Vec<&KnowledgeEdge> {
        self.edges.values()
            .filter(|e| e.source_id == node_id || e.target_id == node_id)
            .collect()
    }

    /// Get connected nodes (neighbors)
    pub fn get_neighbors(&self, node_id: &str) -> Vec<&KnowledgeNode> {
        self.get_edges(node_id)
            .iter()
            .filter_map(|e| {
                let neighbor_id = if e.source_id == node_id {
                    &e.target_id
                } else {
                    &e.source_id
                };
                self.nodes.get(neighbor_id)
            })
            .collect()
    }

    /// Find path between two nodes (BFS)
    pub fn find_path(&self, start_id: &str, end_id: &str) -> Option<Vec<String>> {
        use std::collections::{VecDeque, HashSet};

        if !self.nodes.contains_key(start_id) || !self.nodes.contains_key(end_id) {
            return None;
        }

        let mut visited: HashSet<String> = HashSet::new();
        let mut queue: VecDeque<(String, Vec<String>)> = VecDeque::new();
        
        queue.push_back((start_id.to_string(), vec![start_id.to_string()]));
        visited.insert(start_id.to_string());

        while let Some((current, path)) = queue.pop_front() {
            if current == end_id {
                return Some(path);
            }

            for edge in self.get_edges(&current) {
                let neighbor = if edge.source_id == current {
                    &edge.target_id
                } else {
                    &edge.source_id
                };

                if !visited.contains(neighbor) {
                    visited.insert(neighbor.clone());
                    let mut new_path = path.clone();
                    new_path.push(neighbor.clone());
                    queue.push_back((neighbor.clone(), new_path));
                }
            }
        }

        None
    }

    /// Extract subgraph around a node (N hops)
    pub fn extract_subgraph(&self, center_id: &str, hops: usize) -> (Vec<&KnowledgeNode>, Vec<&KnowledgeEdge>) {
        use std::collections::HashSet;

        let mut node_ids: HashSet<String> = HashSet::new();
        let mut frontier: HashSet<String> = HashSet::new();
        
        node_ids.insert(center_id.to_string());
        frontier.insert(center_id.to_string());

        for _ in 0..hops {
            let mut new_frontier: HashSet<String> = HashSet::new();
            for node_id in &frontier {
                for neighbor in self.get_neighbors(node_id) {
                    if !node_ids.contains(&neighbor.id) {
                        node_ids.insert(neighbor.id.clone());
                        new_frontier.insert(neighbor.id.clone());
                    }
                }
            }
            frontier = new_frontier;
        }

        let nodes: Vec<&KnowledgeNode> = node_ids.iter()
            .filter_map(|id| self.nodes.get(id))
            .collect();

        let edges: Vec<&KnowledgeEdge> = self.edges.values()
            .filter(|e| node_ids.contains(&e.source_id) && node_ids.contains(&e.target_id))
            .collect();

        (nodes, edges)
    }
}

/// Vector Store for similarity search
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default)]
pub struct VectorStore {
    pub entries: HashMap<String, VectorEntry>,
    pub dimension: usize,
}

impl VectorStore {
    pub fn new(dimension: usize) -> Self {
        Self {
            entries: HashMap::new(),
            dimension,
        }
    }

    /// Add a vector entry
    pub fn add(&mut self, entry: VectorEntry) -> Result<String, String> {
        if entry.vector.len() != self.dimension {
            return Err(format!(
                "Vector dimension mismatch: expected {}, got {}",
                self.dimension,
                entry.vector.len()
            ));
        }

        let id = entry.id.clone();
        self.entries.insert(id.clone(), entry);
        Ok(id)
    }

    /// Cosine similarity between two vectors
    fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
        if a.len() != b.len() {
            return 0.0;
        }

        let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let mag_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let mag_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

        if mag_a == 0.0 || mag_b == 0.0 {
            return 0.0;
        }

        dot / (mag_a * mag_b)
    }

    /// Search for similar vectors
    pub fn search(&self, query: &[f32], top_k: usize) -> Vec<(&VectorEntry, f32)> {
        let mut results: Vec<(&VectorEntry, f32)> = self.entries.values()
            .map(|e| (e, Self::cosine_similarity(query, &e.vector)))
            .collect();

        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        results.into_iter().take(top_k).collect()
    }

    /// Remove a vector entry
    pub fn remove(&mut self, id: &str) -> Option<VectorEntry> {
        self.entries.remove(id)
    }
}

/// Agent Memory - Complete memory system for an AI agent
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AgentMemory {
    pub agent_id: String,
    pub memory_store: MemoryStore,
    pub knowledge_graph: KnowledgeGraph,
    pub vector_store: VectorStore,
    pub context_window: Vec<String>,  // Recent conversation context
    pub context_size: usize,
}

impl AgentMemory {
    pub fn new(agent_id: String, buffer_size: usize, vector_dim: usize, context_size: usize) -> Self {
        Self {
            agent_id,
            memory_store: MemoryStore::new(buffer_size),
            knowledge_graph: KnowledgeGraph::new(),
            vector_store: VectorStore::new(vector_dim),
            context_window: Vec::new(),
            context_size,
        }
    }

    /// Add to conversation context
    pub fn add_context(&mut self, message: String) {
        self.context_window.push(message);
        while self.context_window.len() > self.context_size {
            self.context_window.remove(0);
        }
    }

    /// Get current context as string
    pub fn get_context(&self) -> String {
        self.context_window.join("\n")
    }

    /// Store a memory with automatic knowledge extraction
    pub fn remember(&mut self, content: String, memory_type: MemoryType, importance: f32, tags: Vec<String>) -> String {
        let memory = Memory {
            id: format!("{}-mem-{}", self.agent_id, ic_cdk::api::time()),
            memory_type,
            content: content.clone(),
            summary: None,
            embedding: None,
            importance,
            access_count: 0,
            last_accessed: ic_cdk::api::time(),
            created_at: ic_cdk::api::time(),
            metadata: HashMap::new(),
            related_memories: Vec::new(),
            tags,
        };

        self.memory_store.add_memory(memory)
    }

    /// Recall memories relevant to a query
    pub fn recall(&mut self, query: &str, max_results: usize) -> Vec<&Memory> {
        // For now, simple tag-based search
        // In production, would use vector similarity
        let query_words: Vec<String> = query.to_lowercase()
            .split_whitespace()
            .map(|s| s.to_string())
            .collect();

        let mut results: Vec<(&Memory, usize)> = self.memory_store.memories.values()
            .map(|m| {
                let content_lower = m.content.to_lowercase();
                let matches = query_words.iter()
                    .filter(|w| content_lower.contains(w.as_str()))
                    .count();
                (m, matches)
            })
            .filter(|(_, matches)| *matches > 0)
            .collect();

        results.sort_by(|a, b| b.1.cmp(&a.1));
        results.into_iter()
            .take(max_results)
            .map(|(m, _)| m)
            .collect()
    }

    /// Perform memory maintenance (consolidation, decay, forgetting)
    pub fn maintain(&mut self) {
        self.memory_store.consolidate();
        self.memory_store.decay_memories(0.01);
        self.memory_store.forget();
    }
}

/// KIP Integration - Link agent memory to user profile
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct KIPMemoryLink {
    pub principal_id: String,
    pub agent_memories: HashMap<String, AgentMemory>,  // agent_id -> memory
    pub shared_knowledge: KnowledgeGraph,
    pub preferences: HashMap<String, String>,
    pub created_at: u64,
    pub updated_at: u64,
}

impl KIPMemoryLink {
    pub fn new(principal_id: String) -> Self {
        Self {
            principal_id,
            agent_memories: HashMap::new(),
            shared_knowledge: KnowledgeGraph::new(),
            preferences: HashMap::new(),
            created_at: ic_cdk::api::time(),
            updated_at: ic_cdk::api::time(),
        }
    }

    /// Get or create agent memory
    pub fn get_agent_memory(&mut self, agent_id: &str) -> &mut AgentMemory {
        self.updated_at = ic_cdk::api::time();
        self.agent_memories.entry(agent_id.to_string())
            .or_insert_with(|| AgentMemory::new(
                agent_id.to_string(),
                100,   // buffer size
                768,   // vector dimension
                20,    // context size
            ))
    }

    /// Share knowledge between agents
    pub fn share_knowledge(&mut self, from_agent: &str, to_agent: &str, node_ids: Vec<String>) {
        let from_memory = match self.agent_memories.get(from_agent) {
            Some(m) => m,
            None => return,
        };

        let nodes_to_share: Vec<KnowledgeNode> = node_ids.iter()
            .filter_map(|id| from_memory.knowledge_graph.nodes.get(id).cloned())
            .collect();

        let edges_to_share: Vec<KnowledgeEdge> = from_memory.knowledge_graph.edges.values()
            .filter(|e| node_ids.contains(&e.source_id) && node_ids.contains(&e.target_id))
            .cloned()
            .collect();

        if let Some(to_memory) = self.agent_memories.get_mut(to_agent) {
            for node in nodes_to_share {
                to_memory.knowledge_graph.add_node(node);
            }
            for edge in edges_to_share {
                let _ = to_memory.knowledge_graph.add_edge(edge);
            }
        }

        self.updated_at = ic_cdk::api::time();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_memory_store() {
        let mut store = MemoryStore::new(10);
        
        let memory = Memory {
            id: "test-1".to_string(),
            memory_type: MemoryType::ShortTerm,
            content: "Test memory content".to_string(),
            summary: None,
            embedding: None,
            importance: 0.5,
            access_count: 0,
            last_accessed: 0,
            created_at: 0,
            metadata: HashMap::new(),
            related_memories: Vec::new(),
            tags: vec!["test".to_string()],
        };

        let id = store.add_memory(memory);
        assert_eq!(id, "test-1");
        assert!(store.memories.contains_key("test-1"));
    }

    #[test]
    fn test_knowledge_graph() {
        let mut graph = KnowledgeGraph::new();
        
        let node1 = KnowledgeNode {
            id: "node-1".to_string(),
            node_type: NodeType::Entity,
            label: "Raven".to_string(),
            properties: HashMap::new(),
            embedding: None,
            created_at: 0,
            updated_at: 0,
        };

        let node2 = KnowledgeNode {
            id: "node-2".to_string(),
            node_type: NodeType::Concept,
            label: "AI".to_string(),
            properties: HashMap::new(),
            embedding: None,
            created_at: 0,
            updated_at: 0,
        };

        graph.add_node(node1);
        graph.add_node(node2);

        let edge = KnowledgeEdge {
            id: "edge-1".to_string(),
            source_id: "node-1".to_string(),
            target_id: "node-2".to_string(),
            relationship: "uses".to_string(),
            weight: 1.0,
            properties: HashMap::new(),
            created_at: 0,
        };

        assert!(graph.add_edge(edge).is_ok());
        assert_eq!(graph.get_neighbors("node-1").len(), 1);
    }

    #[test]
    fn test_vector_store() {
        let mut store = VectorStore::new(3);
        
        let entry = VectorEntry {
            id: "vec-1".to_string(),
            vector: vec![1.0, 0.0, 0.0],
            content: "Test content".to_string(),
            metadata: HashMap::new(),
            created_at: 0,
        };

        assert!(store.add(entry).is_ok());

        let results = store.search(&[1.0, 0.0, 0.0], 1);
        assert_eq!(results.len(), 1);
        assert!(results[0].1 > 0.99); // Should be very similar
    }
}






