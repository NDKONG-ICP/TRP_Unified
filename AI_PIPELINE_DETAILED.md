# AI Pipeline Architecture - Detailed Technical Documentation

## Overview

The Raven Ecosystem uses a sophisticated **multi-LLM consensus AI pipeline** that works for both the main application and individual AXIOM NFT canisters. The system queries multiple Large Language Models (LLMs) in parallel, synthesizes their responses into a consensus answer, and optionally generates voice output using Eleven Labs.

---

## 🏗️ Architecture Components

### Core Components:
1. **Frontend Services** (`frontend/src/services/`)
   - `backendAIService.ts` - Main app AI service
   - `ravenAICompanion.ts` - Conversational AI wrapper
   - `aiCouncil.ts` - Local fallback AI Council (browser-based)

2. **Backend Canisters** (`backend/`)
   - `raven_ai` canister (`3noas-jyaaa-aaaao-a4xda-cai`) - Central AI orchestrator
   - `axiom_nft` canisters (5 Genesis + future) - Individual NFT AI agents
   - `queen_bee` canister (`k6lqw-bqaaa-aaaao-a4yhq-cai`) - Optional AI orchestrator

3. **External APIs**:
   - **Hugging Face Inference API** - 7 open-source LLM models
   - **Perplexity AI** - Real-time search-augmented LLM
   - **Eleven Labs** - Text-to-speech voice synthesis

---

## 📱 AI Pipeline for Main Application

### Flow Diagram:
```
User Input (Frontend)
    ↓
RavenAICompanion.chat()
    ↓
BackendAIService.queryAICouncil()
    ↓
[HTTP Request via IC Agent]
    ↓
raven_ai::query_ai_council()
    ↓
[Parallel HTTP Outcalls]
    ├─→ Hugging Face (7 models)
    └─→ Perplexity Sonar Pro
    ↓
[Consensus Algorithm]
    ↓
Response + Voice Synthesis
    ↓
Frontend Display
```

### Step-by-Step Process:

#### 1. **User Input** (`frontend/src/pages/raven-ai/RavenAIPage.tsx`)
```typescript
// User types message in chat interface
const message = "What is the Internet Computer?";
```

#### 2. **RavenAI Companion** (`frontend/src/services/ravenAICompanion.ts`)
```typescript
// RavenAICompanion wraps the AI service with conversational features
const companion = new RavenAICompanion({
  systemPrompt: "You are RavenAI, a helpful AI assistant...",
  voiceEnabled: true,
  agentId: undefined // Main app, not an AXIOM NFT
});

const response = await companion.chat(message);
```

**What happens:**
- Builds conversation context from recent messages (last 10)
- Formats context string: `"user: message1\nassistant: response1\n..."`
- Initializes backend service with user's identity
- Calls `backendAIService.queryAICouncil()`

#### 3. **Backend AI Service** (`frontend/src/services/backendAIService.ts`)
```typescript
// Creates actor for raven_ai canister
const actor = Actor.createActor(ravenAIIdlFactory, {
  agent: new HttpAgent({ identity, host: 'https://icp-api.io' }),
  canisterId: '3noas-jyaaa-aaaao-a4xda-cai'
});

// Calls query_ai_council on the canister
const result = await actor.query_ai_council(
  query,
  systemPrompt ? [systemPrompt] : [],
  contextMessages, // Array of {role, content, timestamp}
  [] // token_id (empty for main app)
);
```

**What happens:**
- Converts context string to `ChatMessage[]` array
- Creates IC Agent with user's identity (Plug, II, etc.)
- Makes inter-canister call to `raven_ai::query_ai_council()`
- Handles subscription checks (users need active subscription)

#### 4. **Raven AI Canister** (`backend/raven_ai/src/lib.rs`)

**Function: `query_ai_council()`** (line 1745)

```rust
#[update]
async fn query_ai_council(
    query: String, 
    system_prompt: Option<String>,
    context: Vec<ChatMessage>,
    token_id: Option<u64>,
) -> Result<AICouncilSession, String>
```

**Authentication & Authorization:**
```rust
let caller = ic_cdk::caller();

// Check if caller is AXIOM NFT canister (bypasses subscription)
let is_axiom = is_axiom_canister(&caller);

if !is_axiom {
    // Regular users need active subscription
    let sub = check_subscription(caller);
    if sub.is_none() || !sub.as_ref().unwrap().is_active {
        return Err("Active subscription required for AI Council".to_string());
    }
}
```

**AI Council Session Creation:**
```rust
// Creates session with unique ID
let session_id = format!("council-{}-{}", caller.to_text(), now);

let mut session = AICouncilSession {
    session_id: session_id.clone(),
    user: caller,
    query: query.clone(),
    system_prompt: Some(final_system_prompt.clone()),
    context: context.clone(),
    responses: vec![], // Will be populated with LLM responses
    consensus: None,   // Will be calculated after all responses
    created_at: now,
    completed_at: None,
    total_tokens_used: 0,
    total_cost_usd: 0.0,
};
```

**Parallel LLM Queries:**
```rust
// Get configured LLM providers (default: 8 models)
let providers = if config.llm_providers.is_empty() {
    get_default_providers() // Returns 8 providers
} else {
    config.llm_providers
};

// Query each provider in sequence (can be parallelized)
for provider in providers.iter().filter(|p| p.enabled && !p.api_key.is_empty()) {
    match call_llm_provider(provider, &query, &final_system_prompt, &context).await {
        Ok((response, tokens)) => {
            session.responses.push(CouncilResponse {
                llm_name: provider.name.clone(),
                response,
                confidence: 0.9,
                tokens_used: tokens,
                latency_ms: latency,
                timestamp: ic_cdk::api::time(),
                error: None,
            });
        }
        Err(e) => {
            // Log error but continue with other providers
            session.responses.push(CouncilResponse {
                error: Some(e),
                // ... other fields empty
            });
        }
    }
}
```

#### 5. **LLM Provider Calls** (`backend/raven_ai/src/lib.rs`)

**Function: `call_llm_provider()`** (line 1882)

**For Hugging Face Models:**
```rust
async fn call_llm_provider(
    provider: &LLMProviderConfig,
    query: &str,
    system_prompt: &str,
    context: &[ChatMessage],
) -> Result<(String, u64), String>
{
    // Build formatted prompt
    let mut full_prompt = format!("<|system|>\n{}\n<|end|>\n", system_prompt);
    
    // Add context messages
    for msg in context {
        full_prompt.push_str(&format!("<|{}|>\n{}\n<|end|>\n", msg.role, msg.content));
    }
    
    // Add user query
    full_prompt.push_str(&format!("<|user|>\n{}\n<|end|>\n<|assistant|>\n", query));
    
    // HTTP Outcall to Hugging Face
    let request = CanisterHttpRequestArgument {
        url: format!("https://api-inference.huggingface.co/models/{}", provider.model),
        method: HttpMethod::POST,
        body: Some(json_body.into_bytes()),
        headers: vec![
            HttpHeader { name: "Content-Type".to_string(), value: "application/json".to_string() },
            HttpHeader { name: "Authorization".to_string(), value: format!("Bearer {}", provider.api_key) },
        ],
        max_response_bytes: Some(50_000),
        // ... other fields
    };
    
    // Make HTTP outcall (uses IC's management canister)
    let (response,) = ic_cdk::api::management_canister::http_request::http_request(request)
        .await
        .map_err(|e| format!("HTTP outcall failed: {:?}", e))?;
    
    // Parse response and extract generated text
    let (content, tokens) = parse_llm_response(&provider.name, &response.body)?;
    
    Ok((content, tokens))
}
```

**For Perplexity (Special Handling):**
```rust
async fn call_perplexity(
    provider: &LLMProviderConfig,
    query: &str,
    system_prompt: &str,
    context: &[ChatMessage],
) -> Result<(String, u64), String>
{
    // Perplexity uses OpenAI-compatible API format
    let messages = vec![
        json!({"role": "system", "content": system_prompt}),
        // ... context messages
        json!({"role": "user", "content": query}),
    ];
    
    let body = json!({
        "model": "sonar-pro",
        "messages": messages,
        "max_tokens": 512,
        "temperature": 0.7,
        "return_citations": true,
        "search_recency_filter": "month"
    });
    
    // HTTP outcall to Perplexity
    // ... similar to Hugging Face
}
```

**Default LLM Providers** (8 models):
1. **Perplexity-Sonar** - Real-time search-augmented (weight: 1.2)
2. **Qwen/Qwen2.5-72B-Instruct** - Alibaba's model (weight: 1.0)
3. **meta-llama/Llama-3.3-70B-Instruct** - Meta's model (weight: 1.0)
4. **deepseek-ai/DeepSeek-V2.5** - DeepSeek model (weight: 1.0)
5. **mistralai/Mixtral-8x22B-Instruct-v0.1** - Mistral model (weight: 0.9)
6. **THUDM/glm-4-9b-chat** - GLM model (weight: 0.8)
7. **google/gemma-2-27b-it** - Google's model (weight: 0.9)
8. **mistralai/Mistral-7B-Instruct-v0.3** - Smaller Mistral (weight: 0.7)

#### 6. **Consensus Algorithm** (`backend/raven_ai/src/lib.rs`)

**Function: `synthesize_consensus()`** (line ~1840)

```rust
fn synthesize_consensus(responses: &[CouncilResponse]) -> ConsensusResult {
    // Filter successful responses
    let successful: Vec<_> = responses.iter()
        .filter(|r| r.error.is_none() && !r.response.is_empty())
        .collect();
    
    if successful.is_empty() {
        return ConsensusResult {
            final_response: "No valid responses from AI Council.".to_string(),
            confidence_score: 0.0,
            // ...
        };
    }
    
    // Calculate agreement level
    let agreement = calculate_agreement(&successful);
    
    // Weighted voting based on provider weights
    let weighted_responses: Vec<_> = successful.iter()
        .map(|r| {
            let weight = get_provider_weight(&r.llm_name);
            (r.response.clone(), weight)
        })
        .collect();
    
    // Select best response (longest + highest weight)
    let best_response = select_best_response(&weighted_responses);
    
    // Extract key points that appear in multiple responses
    let key_points = extract_key_points(&successful);
    
    // Find dissenting views (responses with low similarity)
    let dissenting = find_dissenting_views(&successful);
    
    ConsensusResult {
        final_response: best_response,
        confidence_score: agreement,
        agreement_level: agreement,
        key_points,
        dissenting_views: dissenting,
        synthesis_method: "weighted_consensus".to_string(),
    }
}
```

#### 7. **Response Return**

The `AICouncilSession` is returned to the frontend:
```rust
Ok(session) // Contains:
// - session_id
// - responses: Vec<CouncilResponse> (individual LLM responses)
// - consensus: Option<ConsensusResult> (final synthesized response)
// - total_tokens_used
// - total_cost_usd
```

#### 8. **Voice Synthesis** (Optional)

If voice is enabled:
```typescript
// Frontend calls synthesize_voice
const voiceResult = await backendAIService.synthesizeVoice(
  response.finalResponse,
  voiceId,
  modelId
);
```

**Backend: `raven_ai::synthesize_voice()`** (line 2437)
```rust
#[update]
async fn synthesize_voice(request: VoiceSynthesisRequest) -> Result<VoiceSynthesisResponse, String> {
    // Check authentication (AXIOM canisters bypass subscription)
    let is_axiom = is_axiom_canister(&caller);
    if !is_axiom {
        // Check subscription for regular users
    }
    
    // HTTP outcall to Eleven Labs
    let request = CanisterHttpRequestArgument {
        url: format!("https://api.elevenlabs.io/v1/text-to-speech/{}/stream", voice_id),
        method: HttpMethod::POST,
        body: Some(json_body.into_bytes()),
        headers: vec![
            HttpHeader { name: "xi-api-key".to_string(), value: ELEVEN_LABS_API_KEY.to_string() },
            HttpHeader { name: "Accept".to_string(), value: "audio/mpeg".to_string() },
        ],
        // ...
    };
    
    let (response,) = ic_cdk::api::management_canister::http_request::http_request(request)
        .await?;
    
    // Return audio data
    Ok(VoiceSynthesisResponse {
        audio_data: response.body,
        format: "mp3".to_string(),
    })
}
```

---

## 🎨 AI Pipeline for AXIOM NFTs

### Flow Diagram:
```
User Input (AXIOM NFT Frontend)
    ↓
POST /api/chat
    ↓
AXIOM NFT Canister::http_update()
    ↓
AXIOM NFT Canister::chat()
    ↓
[INTER-CANISTER CALL]
    ↓
raven_ai::query_ai_council()
    ↓
[Parallel HTTP Outcalls]
    ├─→ Hugging Face (7 models)
    └─→ Perplexity Sonar Pro
    ↓
[Consensus Algorithm]
    ↓
Response → AXIOM NFT
    ↓
[INTER-CANISTER CALL]
    ↓
raven_ai::synthesize_voice()
    ↓
[HTTP OUTCALL]
    ↓
Eleven Labs API
    ↓
Audio → AXIOM NFT → Frontend
```

### Step-by-Step Process:

#### 1. **User Input** (AXIOM NFT Frontend)

User visits AXIOM NFT canister URL (e.g., `46odg-5iaaa-aaaao-a4xqa-cai.ic0.app`) and types a message.

#### 2. **HTTP Request** (`backend/axiom_nft/src/lib.rs`)

**Function: `http_update()`** (line ~1704)

```rust
#[update]
async fn http_update(req: HttpRequest) -> HttpResponse {
    // Parse POST request body
    if req.method == "POST" && req.url == "/api/chat" {
        let body_str = String::from_utf8(req.body).unwrap_or_default();
        let json: serde_json::Value = serde_json::from_str(&body_str).unwrap_or_default();
        
        let message = json["message"].as_str().unwrap_or("");
        
        // Call chat function
        match chat(Some(metadata.token_id), message.to_string()).await {
            Ok(response) => {
                // Optionally synthesize voice
                let audio_base64 = if let Ok(audio) = synthesize_voice_via_main_canister(&response, None, None, None).await {
                    general_purpose::STANDARD.encode(&audio)
                } else {
                    String::new()
                };
                
                // Return JSON response
                HttpResponse {
                    status_code: 200,
                    headers: vec![("Content-Type".to_string(), "application/json".to_string())],
                    body: json!({
                        "response": response,
                        "voice": audio_base64
                    }).to_string().into_bytes(),
                    upgrade: None,
                }
            }
            Err(e) => {
                // Error response
            }
        }
    }
}
```

#### 3. **AXIOM NFT Chat Function** (`backend/axiom_nft/src/lib.rs`)

**Function: `chat()`** (line ~1784)

```rust
#[update]
async fn chat(
    token_id: Option<u64>,
    message: String,
) -> Result<String, String> {
    // Get agent config and conversation history
    let (system_prompt, context, council_enabled) = if let Some(tid) = token_id {
        AGENTS.with(|a| {
            a.borrow().get(&StorableU64(tid))
                .map(|agent| {
                    let recent_history: Vec<ChatMessage> = agent.conversation_history
                        .iter()
                        .rev()
                        .take(10)
                        .cloned()
                        .collect::<Vec<_>>()
                        .into_iter()
                        .rev()
                        .collect();
                    
                    (
                        agent.config.system_prompt.clone(),
                        recent_history,
                        agent.config.council_enabled,
                    )
                })
        })
    } else {
        (AgentConfig::default().system_prompt, vec![], true)
    };
    
    // Try AI Council first if enabled
    if council_enabled {
        match query_ai_via_main_canister(&message, &format_context(&context), &system_prompt).await {
            Ok(response) => {
                // Update conversation history
                update_conversation_history(token_id, &message, &response);
                return Ok(response);
            }
            Err(e) => {
                // Fallback to pattern matching
            }
        }
    }
    
    // Pattern matching fallback
    // ...
}
```

#### 4. **Inter-Canister Call** (`backend/axiom_nft/src/lib.rs`)

**Function: `query_ai_via_main_canister()`** (line 737)

```rust
async fn query_ai_via_main_canister(
    query: &str, 
    context: &str, 
    system_prompt: &str
) -> Result<String, String> {
    // Try Queen Bee first (if enabled)
    if USE_QUEEN_BEE && !QUEEN_BEE_CANISTER.is_empty() {
        if let Ok(queen_bee) = Principal::from_text(QUEEN_BEE_CANISTER) {
            return query_ai_via_queen_bee(query, context, system_prompt, queen_bee).await;
        }
    }
    
    // Fallback to raven_ai canister
    let raven_ai = Principal::from_text(RAVEN_AI_CANISTER)
        .map_err(|_| "Invalid raven_ai canister ID")?;
    
    // Convert context string to ChatMessage vec
    let context_messages: Vec<ChatMessage> = parse_context_string(context);
    
    // Get token_id from metadata
    let token_id = METADATA.with(|m| Some(m.borrow().get().token_id));
    
    // INTER-CANISTER CALL
    let result: Result<(Result<AICouncilSessionResponse, String>,), _> = ic_cdk::call(
        raven_ai,                    // Target canister
        "query_ai_council",          // Function name
        (                            // Arguments
            query.to_string(),
            Some(system_prompt.to_string()),
            context_messages,
            token_id,
        )
    ).await;
    
    match result {
        Ok((Ok(session),)) => {
            // Extract final response from consensus
            if let Some(consensus) = session.consensus {
                Ok(consensus.final_response)
            } else if !session.responses.is_empty() {
                Ok(session.responses[0].response.clone())
            } else {
                // Fallback to direct HTTP outcall
                direct_llm_query(query, context, system_prompt).await
            }
        }
        Ok((Err(e),)) => {
            // Fallback on error
            direct_llm_query(query, context, system_prompt).await
        }
        Err((code, msg)) => {
            // Fallback on call failure
            direct_llm_query(query, context, system_prompt).await
        }
    }
}
```

**Key Points:**
- Uses `ic_cdk::call()` for inter-canister communication
- AXIOM canister principal is automatically recognized (bypasses subscription)
- Falls back to direct HTTP outcall if inter-canister call fails
- Passes `token_id` so raven_ai can track which AXIOM made the request

#### 5. **Raven AI Processing** (Same as Main App)

The `raven_ai::query_ai_council()` function processes the request identically:
- Recognizes AXIOM canister (no subscription check)
- Queries all 8 LLM providers in parallel
- Synthesizes consensus
- Returns `AICouncilSession`

#### 6. **Voice Synthesis** (`backend/axiom_nft/src/lib.rs`)

**Function: `synthesize_voice_via_main_canister()`** (line ~1683)

```rust
async fn synthesize_voice_via_main_canister(
    text: &str,
    voice_id: Option<&str>,
    stability: Option<f32>,
    similarity_boost: Option<f32>,
) -> Result<Vec<u8>, String> {
    let raven_ai = Principal::from_text(RAVEN_AI_CANISTER)?;
    
    // INTER-CANISTER CALL to raven_ai
    let result: Result<(Result<VoiceSynthesisResponse, String>,), _> = ic_cdk::call(
        raven_ai,
        "synthesize_voice",
        (VoiceSynthesisRequest {
            text: text.to_string(),
            voice_id: voice_id.map(|s| s.to_string()),
            stability,
            similarity_boost,
        },)
    ).await;
    
    match result {
        Ok((Ok(response),)) => Ok(response.audio_data),
        Ok((Err(e),)) => Err(e),
        Err((code, msg)) => Err(format!("Call failed: {:?}", code)),
    }
}
```

#### 7. **Response to Frontend**

The AXIOM NFT canister returns:
```json
{
  "response": "The consensus answer from AI Council...",
  "voice": "base64_encoded_audio_data..."
}
```

The frontend:
- Displays the text response
- Plays the audio from base64 data

---

## 🔑 Key Differences: App vs AXIOM NFTs

| Aspect | Main Application | AXIOM NFTs |
|--------|------------------|------------|
| **Entry Point** | `RavenAICompanion.chat()` | `AXIOM NFT::http_update()` → `chat()` |
| **Authentication** | User identity (Plug, II, etc.) | AXIOM canister principal |
| **Subscription** | Required (or demo) | Bypassed (AXIOM canisters whitelisted) |
| **Context Source** | Frontend conversation history | Canister's persistent memory |
| **System Prompt** | Generic "RavenAI" prompt | AXIOM-specific personality prompt |
| **Voice Synthesis** | Optional, via `backendAIService` | Automatic, via inter-canister call |
| **Memory** | Session-based (frontend) | Persistent (canister storage) |
| **Token ID** | `None` | AXIOM's `token_id` (1-300) |

---

## 🧠 Consensus Algorithm Details

### Weighted Voting:
- Each LLM provider has a weight (Perplexity: 1.2, others: 0.7-1.0)
- Responses are scored based on:
  - Length (moderate length preferred)
  - Quality indicators (words like "because", "therefore")
  - Provider weight
  - Agreement with other responses

### Agreement Calculation:
```rust
fn calculate_agreement(responses: &[CouncilResponse]) -> f32 {
    // Calculate word-based similarity between responses
    let similarities: Vec<f32> = responses.iter()
        .enumerate()
        .map(|(i, r1)| {
            responses.iter()
                .enumerate()
                .filter(|(j, _)| i != *j)
                .map(|(_, r2)| word_similarity(&r1.response, &r2.response))
                .sum::<f32>() / (responses.len() - 1) as f32
        })
        .collect();
    
    // Average similarity = agreement level
    similarities.iter().sum::<f32>() / similarities.len() as f32
}
```

### Key Points Extraction:
- Finds sentences that appear in multiple responses
- Ranks by frequency across responses
- Includes top 5 key points in consensus

### Dissenting Views:
- Identifies responses with low similarity (< 50% of average)
- Includes in consensus for transparency

---

## 🔒 Security & Authentication

### Main Application:
- Requires user authentication (Internet Identity, Plug, etc.)
- Checks subscription status
- API keys never exposed to frontend

### AXIOM NFTs:
- Canister principal automatically recognized
- No subscription required (whitelisted)
- Same API key security (stored in backend)

### API Keys:
- **Hugging Face**: Stored in backend canister stable storage (not exposed)
- **Perplexity**: Stored in backend canister stable storage (not exposed)
- **Eleven Labs**: Stored in backend canister stable storage (not exposed)
- **Eleven Labs Voice ID**: `kPzsL2i3teMYv0FxEYQ6` (public identifier, safe to expose)

All keys stored in backend canisters, never in frontend code.

---

## 💾 Memory & Persistence

### Main Application:
- Conversation history stored in frontend (session-based)
- Lost on page refresh (unless saved to localStorage)

### AXIOM NFTs:
- **Conversation History**: Stored in canister's `CONVERSATIONS` stable storage
- **Long-term Memory**: Stored in `MEMORY_STORE` (knowledge base)
- **Short-term Memory**: Recent interactions (last 100 messages)
- **Persistent**: Survives canister upgrades, persists forever

### Memory Types:
1. **Conversation History**: Full chat logs with timestamps
2. **Short-term Memory**: Recent important facts
3. **Long-term Memory**: Permanent knowledge (documents, facts)
4. **Knowledge Nodes**: Graph-based knowledge representation

---

## 🚀 Performance Characteristics

### Latency:
- **Inter-canister calls**: ~100-500ms
- **HTTP outcalls**: ~1-5 seconds per LLM
- **Total (8 LLMs)**: ~5-15 seconds (parallel)
- **Consensus calculation**: ~10-50ms

### Cycles Cost:
- **HTTP outcall**: ~50-100B cycles per request
- **8 LLM queries**: ~400-800B cycles total
- **Voice synthesis**: ~100B cycles
- **Total per request**: ~500-900B cycles

### Optimization:
- LLM queries can be parallelized (future improvement)
- Responses cached in session (can be reused)
- Failed providers don't block consensus

---

## 📊 Monitoring & Debugging

### Session Tracking:
- Each AI Council query creates a `AICouncilSession`
- Stored in `COUNCIL_SESSIONS` stable storage
- Can be retrieved via `get_council_session(session_id)`

### Metrics:
- `total_tokens_used`: Sum of all LLM tokens
- `total_cost_usd`: Estimated cost (for tracking)
- `latency_ms`: Per-provider latency
- `confidence_score`: Consensus confidence (0.0-1.0)

### Error Handling:
- Failed LLM providers logged but don't block consensus
- Falls back to direct HTTP outcall if inter-canister fails
- Frontend falls back to local AI Council if backend unavailable

---

## 🔮 Future Enhancements

1. **Parallel LLM Queries**: Currently sequential, can be parallelized
2. **Response Caching**: Cache similar queries to reduce API calls
3. **Dynamic Provider Selection**: Choose providers based on query type
4. **Embedding-based Similarity**: Use vector embeddings for better consensus
5. **Streaming Responses**: Stream LLM responses as they arrive
6. **Multi-modal Support**: Image, audio input processing

---

## 📝 Summary

The AI pipeline is a sophisticated multi-LLM consensus system that:

1. **Queries 8 LLM providers** in parallel (7 Hugging Face + 1 Perplexity)
2. **Synthesizes consensus** using weighted voting and agreement detection
3. **Works identically** for main app and AXIOM NFTs (different entry points)
4. **Bypasses CORS** by using backend canisters for HTTP outcalls
5. **Secures API keys** in backend (never exposed to frontend)
6. **Provides voice synthesis** via Eleven Labs
7. **Maintains persistent memory** for AXIOM NFTs

The system is designed for reliability, with multiple fallbacks and error handling at every level.

