# AI Pipeline Confirmation - Inter-Canister Calls & HTTP Outcalls

## ✅ Confirmed: Complete AI Pipeline Architecture

### **Flow Overview:**

```
User Message → AXIOM NFT Frontend → POST /api/chat → http_update() 
→ chat() → query_ai_via_main_canister() → [INTER-CANISTER CALL]
→ raven_ai::query_ai_council() → call_llm_provider() → [HTTP OUTCALLS]
→ Multiple LLMs (Hugging Face, Perplexity) → Consensus → Response
→ synthesize_voice_via_main_canister() → [INTER-CANISTER CALL]
→ raven_ai::synthesize_voice() → [HTTP OUTCALL] → Eleven Labs API
→ Audio Response → Frontend
```

---

## **1. AXIOM NFT → raven_ai (Inter-Canister Calls)**

### **AI Query Flow:**
- **File:** `backend/axiom_nft/src/lib.rs`
- **Function:** `query_ai_via_main_canister()` (line 597)
- **Method:** `ic_cdk::call()` - Inter-canister call
- **Target:** `raven_ai` canister (`3noas-jyaaa-aaaao-a4xda-cai`)
- **Function Called:** `query_ai_council`
- **Parameters:**
  - `query: String`
  - `system_prompt: Option<String>`
  - `context: Vec<ChatMessage>`
  - `token_id: Option<u64>`

### **Voice Synthesis Flow:**
- **File:** `backend/axiom_nft/src/lib.rs`
- **Function:** `synthesize_voice_via_main_canister()` (line 1683)
- **Method:** `ic_cdk::call()` - Inter-canister call
- **Target:** `raven_ai` canister
- **Function Called:** `synthesize_voice`
- **Parameters:**
  - `text: String`
  - `voice_id: Option<String>` (defaults to `kPzsL2i3teMYv0FxEYQ6`)
  - `stability: Option<f32>`
  - `similarity_boost: Option<f32>`

---

## **2. raven_ai → External APIs (HTTP Outcalls)**

### **AI Council - Multiple LLM Providers:**

#### **A. Hugging Face Models (HTTP Outcalls)**
- **File:** `backend/raven_ai/src/lib.rs`
- **Function:** `call_llm_provider()` (line 1615)
- **Method:** `ic_cdk::api::management_canister::http_request::http_request()`
- **API Endpoint:** `https://api-inference.huggingface.co/models/{model}`
- **Models Used:**
  1. `Qwen/Qwen2.5-72B-Instruct`
  2. `Qwen/Qwen3-235B-Instruct`
  3. `meta-llama/Llama-4-Scout`
  4. `deepseek-ai/DeepSeek-V3`
  5. `mistral-ai/Mixtral-8x22B-Instruct-v0.1`
  6. `THUDM/GLM-4.6`
  7. `google/gemma-2-27b-it`
  8. `meta-llama/Llama-3.3-70B-Instruct`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer {HUGGING_FACE_API_KEY}`
- **Request Body:** JSON with prompt, max_tokens, temperature, top_p
- **Cycles:** 50B cycles per request

#### **B. Perplexity API (HTTP Outcalls)**
- **File:** `backend/raven_ai/src/lib.rs`
- **Function:** `call_perplexity()` (line 1694)
- **Method:** `ic_cdk::api::management_canister::http_request::http_request()`
- **API Endpoint:** `https://api.perplexity.ai/chat/completions`
- **Model:** `sonar-pro` (real-time search-augmented)
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer {PERPLEXITY_API_KEY}`
- **Request Body:** OpenAI-compatible format with:
  - `model: "sonar-pro"`
  - `messages: [...]`
  - `max_tokens: 512`
  - `temperature: 0.7`
  - `return_citations: true`
  - `search_recency_filter: "month"`
- **Cycles:** 50B cycles per request

#### **C. Eleven Labs Voice Synthesis (HTTP Outcalls)**
- **File:** `backend/raven_ai/src/lib.rs`
- **Function:** `synthesize_voice()` (line 2187)
- **Method:** `ic_cdk::api::management_canister::http_request::http_request()`
- **API Endpoint:** `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream`
- **Voice ID:** `kPzsL2i3teMYv0FxEYQ6` (custom voice)
- **Model:** `eleven_monolingual_v1`
- **Headers:**
  - `Content-Type: application/json`
  - `Accept: audio/mpeg`
  - `xi-api-key: {ELEVEN_LABS_API_KEY}`
- **Request Body:** JSON with text, model_id, voice_settings
- **Response:** Audio/mpeg binary data
- **Cycles:** 100B cycles per request

---

## **3. AI Council Consensus System**

### **Query Flow:**
1. **`query_ai_council()`** receives query from AXIOM NFT
2. **Loops through enabled LLM providers** (8 models)
3. **Parallel HTTP outcalls** to each provider:
   - Hugging Face Inference API (7 models)
   - Perplexity Sonar Pro (1 model with search)
4. **Collects responses** with metadata:
   - Response text
   - Tokens used
   - Latency (ms)
   - Confidence score
5. **Consensus Algorithm:**
   - Weighted voting based on provider weights
   - Agreement/disagreement detection
   - Final response synthesis
6. **Returns:** `AICouncilSession` with:
   - Individual provider responses
   - Consensus final response
   - Confidence score
   - Total tokens used

---

## **4. Complete Request Flow Example**

### **User asks: "What day is it?"**

1. **Frontend:** POST to `/api/chat` with `{"message": "What day is it?"}`
2. **AXIOM NFT `http_update()`:**
   - Parses message from POST body
   - Calls `chat(message, None)`
3. **AXIOM NFT `chat()`:**
   - Builds conversation context
   - Calls `query_ai_via_main_canister()` **[INTER-CANISTER]**
4. **raven_ai `query_ai_council()`:**
   - Checks subscription (or allows AXIOM canisters)
   - Creates AI Council session
   - Loops through 8 LLM providers
   - For each provider:
     - Calls `call_llm_provider()` **[HTTP OUTCALL]**
     - Hugging Face: `POST https://api-inference.huggingface.co/models/...`
     - Perplexity: `POST https://api.perplexity.ai/chat/completions`
   - Collects all responses
   - Calculates consensus
   - Returns final response
5. **AXIOM NFT receives response:**
   - Updates conversation history
   - Calls `synthesize_voice_via_main_canister()` **[INTER-CANISTER]**
6. **raven_ai `synthesize_voice()`:**
   - Calls Eleven Labs API **[HTTP OUTCALL]**
   - `POST https://api.elevenlabs.io/v1/text-to-speech/kPzsL2i3teMYv0FxEYQ6/stream`
   - Returns audio/mpeg binary
7. **AXIOM NFT `http_update()`:**
   - Encodes audio as base64
   - Returns JSON: `{"response": "...", "voice": "base64..."}`
8. **Frontend:**
   - Displays response
   - Plays Eleven Labs audio from base64

---

## **5. Security & Authentication**

### **Inter-Canister Calls:**
- ✅ AXIOM NFT canisters are whitelisted in `raven_ai::synthesize_voice()`
- ✅ AXIOM canisters can call voice synthesis without subscription
- ✅ Other callers require active subscription

### **HTTP Outcalls:**
- ✅ All API keys stored in backend canisters (not exposed to frontend)
- ✅ CORS issues avoided (backend makes calls, not browser)
- ✅ API keys:
  - Hugging Face: Set via `HUGGINGFACE_API_KEY` environment variable
  - Perplexity: Set via `PERPLEXITY_API_KEY` environment variable
  - Eleven Labs: Set via `ELEVEN_LABS_API_KEY` environment variable
  - Eleven Labs Voice ID: Set via `ELEVEN_LABS_VOICE_ID` environment variable
  - **Note**: Never commit actual API keys to version control. Use environment variables or secure storage.

---

## **6. Verification Checklist**

✅ **Inter-Canister Calls:**
- [x] AXIOM NFT → raven_ai for AI queries (`query_ai_council`)
- [x] AXIOM NFT → raven_ai for voice synthesis (`synthesize_voice`)

✅ **HTTP Outcalls from raven_ai:**
- [x] Hugging Face Inference API (7 models)
- [x] Perplexity API (1 model with search)
- [x] Eleven Labs API (voice synthesis)

✅ **No Direct Browser API Calls:**
- [x] All API calls go through backend canisters
- [x] No CORS issues
- [x] API keys never exposed to frontend

✅ **Consensus System:**
- [x] Multiple LLM providers queried in parallel
- [x] Responses aggregated with consensus algorithm
- [x] Final response synthesized from multiple sources

---

## **7. Canister IDs**

- **raven_ai:** `3noas-jyaaa-aaaao-a4xda-cai`
- **AXIOM #1:** `46odg-5iaaa-aaaao-a4xqa-cai`
- **AXIOM #2:** `4zpfs-qqaaa-aaaao-a4xqq-cai`
- **AXIOM #3:** `4ckzx-kiaaa-aaaao-a4xsa-cai`
- **AXIOM #4:** `4fl7d-hqaaa-aaaao-a4xsq-cai`
- **AXIOM #5:** `4miu7-ryaaa-aaaao-a4xta-cai`

---

## **Conclusion**

✅ **CONFIRMED:** The entire AI pipeline uses:
1. **Inter-canister calls** from AXIOM NFTs to raven_ai canister
2. **HTTP outcalls** from raven_ai canister to external APIs:
   - Hugging Face (7 models)
   - Perplexity (1 model)
   - Eleven Labs (voice synthesis)

All API keys are secure in backend canisters, and no direct browser calls are made to external APIs, eliminating CORS issues.




