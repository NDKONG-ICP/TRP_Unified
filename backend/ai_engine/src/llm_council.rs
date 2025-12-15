//! LLM Council - On-Chain Multi-LLM Consensus System
//! Based on https://github.com/karpathy/llm-council
//! 
//! Groups multiple LLMs into a "council" that:
//! 1. Gets individual responses from each LLM
//! 2. Has each LLM review and rank others' responses
//! 3. Chairman LLM produces final consensus response

use candid::CandidType;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// LLM Provider configuration
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct LLMProvider {
    pub id: String,
    pub name: String,
    pub model: String,
    pub api_endpoint: String,
    pub max_tokens: u32,
    pub temperature: f32,
    pub is_chairman: bool,
}

/// Council configuration
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct CouncilConfig {
    pub council_id: String,
    pub name: String,
    pub members: Vec<LLMProvider>,
    pub chairman: String, // ID of chairman LLM
    pub review_enabled: bool,
    pub anonymize_reviews: bool,
    pub max_rounds: u8,
}

impl Default for CouncilConfig {
    fn default() -> Self {
        Self {
            council_id: "default".to_string(),
            name: "Raven AI Council".to_string(),
            members: vec![
                LLMProvider {
                    id: "gpt4".to_string(),
                    name: "GPT-4".to_string(),
                    model: "gpt-4-turbo".to_string(),
                    api_endpoint: "https://api.openai.com/v1/chat/completions".to_string(),
                    max_tokens: 4096,
                    temperature: 0.7,
                    is_chairman: false,
                },
                LLMProvider {
                    id: "claude".to_string(),
                    name: "Claude".to_string(),
                    model: "claude-3-opus".to_string(),
                    api_endpoint: "https://api.anthropic.com/v1/messages".to_string(),
                    max_tokens: 4096,
                    temperature: 0.7,
                    is_chairman: true,
                },
                LLMProvider {
                    id: "gemini".to_string(),
                    name: "Gemini".to_string(),
                    model: "gemini-pro".to_string(),
                    api_endpoint: "https://generativelanguage.googleapis.com/v1/models".to_string(),
                    max_tokens: 4096,
                    temperature: 0.7,
                    is_chairman: false,
                },
            ],
            chairman: "claude".to_string(),
            review_enabled: true,
            anonymize_reviews: true,
            max_rounds: 1,
        }
    }
}

/// Individual LLM response
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct LLMResponse {
    pub provider_id: String,
    pub provider_name: String,
    pub response: String,
    pub tokens_used: u32,
    pub latency_ms: u64,
    pub timestamp: u64,
}

/// Review of a response by another LLM
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ResponseReview {
    pub reviewer_id: String,
    pub reviewed_response_id: String,
    pub accuracy_score: u8,      // 1-10
    pub insight_score: u8,       // 1-10
    pub completeness_score: u8,  // 1-10
    pub overall_rank: u8,        // Rank among all responses
    pub feedback: String,
}

/// Council query request
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct CouncilQuery {
    pub query_id: String,
    pub user_query: String,
    pub context: Option<String>,
    pub requested_at: u64,
    pub priority: QueryPriority,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum QueryPriority {
    Low,
    Normal,
    High,
    Critical,
}

/// Council session - full conversation with council
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct CouncilSession {
    pub session_id: String,
    pub config: CouncilConfig,
    #[serde(rename = "council_query")]
    pub query: CouncilQuery,
    pub stage: CouncilStage,
    
    // Stage 1: Individual responses
    pub individual_responses: Vec<LLMResponse>,
    
    // Stage 2: Reviews
    pub reviews: Vec<ResponseReview>,
    pub rankings: HashMap<String, u8>, // provider_id -> final rank
    
    // Stage 3: Final response
    pub final_response: Option<String>,
    pub chairman_summary: Option<String>,
    
    // Metadata
    pub total_tokens: u32,
    pub total_latency_ms: u64,
    pub created_at: u64,
    pub completed_at: Option<u64>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum CouncilStage {
    Pending,
    CollectingResponses,
    ReviewingResponses,
    GeneratingConsensus,
    Completed,
    Failed(String),
}

/// Result of council deliberation
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct CouncilResult {
    pub session_id: String,
    #[serde(rename = "user_query")]
    pub query: String,
    pub final_response: String,
    pub individual_responses: Vec<LLMResponse>,
    pub rankings: HashMap<String, u8>,
    pub confidence_score: f32,
    pub dissent_notes: Option<String>,
    pub processing_time_ms: u64,
}

/// LLM Council Manager
pub struct LLMCouncil {
    pub config: CouncilConfig,
    pub sessions: HashMap<String, CouncilSession>,
}

impl LLMCouncil {
    pub fn new(config: CouncilConfig) -> Self {
        Self {
            config,
            sessions: HashMap::new(),
        }
    }

    /// Create a new council query session
    pub fn create_session(&mut self, query: CouncilQuery) -> String {
        let session_id = format!("session-{}", query.query_id);
        
        let session = CouncilSession {
            session_id: session_id.clone(),
            config: self.config.clone(),
            query,
            stage: CouncilStage::Pending,
            individual_responses: Vec::new(),
            reviews: Vec::new(),
            rankings: HashMap::new(),
            final_response: None,
            chairman_summary: None,
            total_tokens: 0,
            total_latency_ms: 0,
            created_at: ic_cdk::api::time(),
            completed_at: None,
        };

        self.sessions.insert(session_id.clone(), session);
        session_id
    }

    /// Add an individual LLM response
    pub fn add_response(&mut self, session_id: &str, response: LLMResponse) -> Result<(), String> {
        let session = self.sessions.get_mut(session_id)
            .ok_or("Session not found")?;
        
        session.individual_responses.push(response.clone());
        session.total_tokens += response.tokens_used;
        session.total_latency_ms += response.latency_ms;

        // Check if all responses collected
        if session.individual_responses.len() >= session.config.members.len() {
            session.stage = CouncilStage::ReviewingResponses;
        } else {
            session.stage = CouncilStage::CollectingResponses;
        }

        Ok(())
    }

    /// Add a review from one LLM about another's response
    pub fn add_review(&mut self, session_id: &str, review: ResponseReview) -> Result<(), String> {
        // 1. Extract data we need FIRST (before any method calls on self)
        let expected_reviews = {
            let session = self.sessions.get(session_id)
                .ok_or("Session not found")?;
            session.config.members.len() * (session.config.members.len() - 1)
        };
        
        // 2. Add the review
        let should_calculate_rankings = {
            let session = self.sessions.get_mut(session_id)
                .ok_or("Session not found")?;
            session.reviews.push(review);
            session.reviews.len() >= expected_reviews
        };

        // 3. Calculate rankings if needed (no borrows held)
        if should_calculate_rankings {
            self.calculate_rankings(session_id)?;
            
            // 4. Update stage (separate borrow)
            let session = self.sessions.get_mut(session_id)
                .ok_or("Session not found")?;
            session.stage = CouncilStage::GeneratingConsensus;
        }

        Ok(())
    }

    /// Calculate final rankings based on reviews
    fn calculate_rankings(&mut self, session_id: &str) -> Result<(), String> {
        let session = self.sessions.get_mut(session_id)
            .ok_or("Session not found")?;

        // Aggregate scores for each provider
        let mut scores: HashMap<String, Vec<u8>> = HashMap::new();
        
        for review in &session.reviews {
            let total_score = review.accuracy_score + review.insight_score + review.completeness_score;
            scores.entry(review.reviewed_response_id.clone())
                .or_insert_with(Vec::new)
                .push(total_score);
        }

        // Calculate average scores and rank
        let mut avg_scores: Vec<(String, f32)> = scores.iter()
            .map(|(id, s)| {
                let avg = s.iter().map(|&x| x as f32).sum::<f32>() / s.len() as f32;
                (id.clone(), avg)
            })
            .collect();

        avg_scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        for (rank, (provider_id, _)) in avg_scores.iter().enumerate() {
            session.rankings.insert(provider_id.clone(), (rank + 1) as u8);
        }

        Ok(())
    }

    /// Set the final consensus response from chairman
    pub fn set_final_response(
        &mut self, 
        session_id: &str, 
        response: String,
        summary: String
    ) -> Result<CouncilResult, String> {
        // 1. Extract data we need FIRST (before calling calculate_confidence)
        let (query, individual_responses, rankings, total_latency_ms) = {
            let session = self.sessions.get(session_id)
                .ok_or("Session not found")?;
            (
                session.query.user_query.clone(),
                session.individual_responses.clone(),
                session.rankings.clone(),
                session.total_latency_ms,
            )
        };
        
        // 2. Calculate confidence BEFORE mutating session
        let confidence = {
            let session = self.sessions.get(session_id)
                .ok_or("Session not found")?;
            self.calculate_confidence(session)
        };

        // 3. Now update the session (no borrows held)
        {
            let session = self.sessions.get_mut(session_id)
                .ok_or("Session not found")?;
            session.final_response = Some(response.clone());
            session.chairman_summary = Some(summary);
            session.stage = CouncilStage::Completed;
            session.completed_at = Some(ic_cdk::api::time());
        }

        // 4. Return result (using extracted data)
        Ok(CouncilResult {
            session_id: session_id.to_string(),
            query,
            final_response: response,
            individual_responses,
            rankings,
            confidence_score: confidence,
            dissent_notes: None,
            processing_time_ms: total_latency_ms,
        })
    }

    /// Calculate confidence score based on response agreement
    fn calculate_confidence(&self, session: &CouncilSession) -> f32 {
        if session.individual_responses.is_empty() {
            return 0.0;
        }

        // Simple confidence calculation based on ranking spread
        let rankings: Vec<u8> = session.rankings.values().cloned().collect();
        if rankings.is_empty() {
            return 0.5;
        }

        let avg_rank: f32 = rankings.iter().map(|&r| r as f32).sum::<f32>() / rankings.len() as f32;
        let variance: f32 = rankings.iter()
            .map(|&r| (r as f32 - avg_rank).powi(2))
            .sum::<f32>() / rankings.len() as f32;

        // Lower variance = higher confidence
        let confidence = 1.0 - (variance / 10.0).min(1.0);
        confidence.max(0.0).min(1.0)
    }

    /// Get session status
    pub fn get_session(&self, session_id: &str) -> Option<&CouncilSession> {
        self.sessions.get(session_id)
    }

    /// Generate prompt for chairman to synthesize responses
    pub fn generate_chairman_prompt(&self, session_id: &str) -> Result<String, String> {
        let session = self.sessions.get(session_id)
            .ok_or("Session not found")?;

        let mut prompt = format!(
            "You are the Chairman of an AI Council. Your task is to synthesize the following responses \
            from different AI models into a single, comprehensive answer.\n\n\
            Original Question: {}\n\n",
            session.query.user_query
        );

        for (i, response) in session.individual_responses.iter().enumerate() {
            let rank = session.rankings.get(&response.provider_id).unwrap_or(&0);
            prompt.push_str(&format!(
                "Response {} (Ranked #{}):\n{}\n\n",
                i + 1,
                rank,
                response.response
            ));
        }

        prompt.push_str(
            "Based on these responses and their rankings, provide:\n\
            1. A comprehensive final answer that incorporates the best insights from all responses\n\
            2. Note any significant disagreements or areas of uncertainty\n\
            3. Provide your confidence level in the final answer\n\n\
            Final Answer:"
        );

        Ok(prompt)
    }

    /// Generate review prompt for LLM to review another's response
    pub fn generate_review_prompt(
        &self,
        session_id: &str,
        response_to_review: &LLMResponse,
        anonymize: bool
    ) -> Result<String, String> {
        let session = self.sessions.get(session_id)
            .ok_or("Session not found")?;

        let provider_label = if anonymize {
            "Anonymous AI".to_string()
        } else {
            response_to_review.provider_name.clone()
        };

        let prompt = format!(
            "You are reviewing a response from {} to the following question:\n\n\
            Question: {}\n\n\
            Response to review:\n{}\n\n\
            Please rate this response on a scale of 1-10 for:\n\
            1. Accuracy: How factually correct is the response?\n\
            2. Insight: How insightful and helpful is the response?\n\
            3. Completeness: How thoroughly does it address the question?\n\n\
            Provide your ratings and brief feedback.",
            provider_label,
            session.query.user_query,
            response_to_review.response
        );

        Ok(prompt)
    }
}

/// HTTP outcall request for LLM API
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct LLMApiRequest {
    pub provider: LLMProvider,
    pub messages: Vec<ChatMessage>,
    pub max_tokens: u32,
    pub temperature: f32,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ChatMessage {
    pub role: String,  // "system", "user", "assistant"
    pub content: String,
}

/// HTTP outcall response from LLM API
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct LLMApiResponse {
    pub content: String,
    pub tokens_used: u32,
    pub finish_reason: String,
}

/// Build request body for OpenAI-compatible API
pub fn build_openai_request(request: &LLMApiRequest) -> String {
    serde_json::json!({
        "model": request.provider.model,
        "messages": request.messages.iter().map(|m| {
            serde_json::json!({
                "role": m.role,
                "content": m.content
            })
        }).collect::<Vec<_>>(),
        "max_tokens": request.max_tokens,
        "temperature": request.temperature
    }).to_string()
}

/// Build request body for Anthropic Claude API
pub fn build_anthropic_request(request: &LLMApiRequest) -> String {
    let system_message = request.messages.iter()
        .find(|m| m.role == "system")
        .map(|m| m.content.clone())
        .unwrap_or_default();

    let user_messages: Vec<_> = request.messages.iter()
        .filter(|m| m.role != "system")
        .map(|m| {
            serde_json::json!({
                "role": m.role,
                "content": m.content
            })
        })
        .collect();

    serde_json::json!({
        "model": request.provider.model,
        "system": system_message,
        "messages": user_messages,
        "max_tokens": request.max_tokens
    }).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_council_creation() {
        let config = CouncilConfig::default();
        let mut council = LLMCouncil::new(config);
        
        let query = CouncilQuery {
            query_id: "test-1".to_string(),
            user_query: "What is the meaning of life?".to_string(),
            context: None,
            requested_at: 0,
            priority: QueryPriority::Normal,
        };

        let session_id = council.create_session(query);
        assert!(!session_id.is_empty());

        let session = council.get_session(&session_id);
        assert!(session.is_some());
        assert_eq!(session.unwrap().stage, CouncilStage::Pending);
    }
}




