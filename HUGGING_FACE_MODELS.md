# AI Council - Hugging Face Models

## Exact Models Called via HTTP Outcalls

The Raven AI Council queries **7 Hugging Face models** via HTTP outcalls to the Hugging Face Inference API:

### **1. Qwen2.5-72B**
- **Model Path:** `Qwen/Qwen2.5-72B-Instruct`
- **API URL:** `https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct`
- **Weight:** 1.0
- **Max Tokens:** 512
- **Temperature:** 0.7

### **2. Llama-3.3-70B**
- **Model Path:** `meta-llama/Llama-3.3-70B-Instruct`
- **API URL:** `https://api-inference.huggingface.co/models/meta-llama/Llama-3.3-70B-Instruct`
- **Weight:** 1.0
- **Max Tokens:** 512
- **Temperature:** 0.7

### **3. Mixtral-8x22B**
- **Model Path:** `mistralai/Mixtral-8x22B-Instruct-v0.1`
- **API URL:** `https://api-inference.huggingface.co/models/mistralai/Mixtral-8x22B-Instruct-v0.1`
- **Weight:** 0.9
- **Max Tokens:** 512
- **Temperature:** 0.7

### **4. Gemma-2-27B**
- **Model Path:** `google/gemma-2-27b-it`
- **API URL:** `https://api-inference.huggingface.co/models/google/gemma-2-27b-it`
- **Weight:** 0.9
- **Max Tokens:** 512
- **Temperature:** 0.7

### **5. Mistral-7B**
- **Model Path:** `mistralai/Mistral-7B-Instruct-v0.3`
- **API URL:** `https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3`
- **Weight:** 0.8
- **Max Tokens:** 512
- **Temperature:** 0.7

### **6. GLM-4-9B**
- **Model Path:** `THUDM/glm-4-9b-chat`
- **API URL:** `https://api-inference.huggingface.co/models/THUDM/glm-4-9b-chat`
- **Weight:** 0.8
- **Max Tokens:** 512
- **Temperature:** 0.7

### **7. DeepSeek-V2.5**
- **Model Path:** `deepseek-ai/DeepSeek-V2.5`
- **API URL:** `https://api-inference.huggingface.co/models/deepseek-ai/DeepSeek-V2.5`
- **Weight:** 1.0
- **Max Tokens:** 512
- **Temperature:** 0.7

---

## Additional Model (Not Hugging Face)

### **8. Perplexity-Sonar**
- **Provider:** Perplexity API (not Hugging Face)
- **Model:** `sonar-pro`
- **API URL:** `https://api.perplexity.ai/chat/completions`
- **Weight:** 1.2 (highest weight - search-augmented responses)
- **Max Tokens:** 512
- **Temperature:** 0.7
- **Special Features:** Real-time web search, citations, search_recency_filter: "month"

---

## Total AI Council Configuration

- **Total Models:** 8
- **Hugging Face Models:** 7
- **Perplexity Models:** 1
- **All models are queried in parallel** via HTTP outcalls
- **Consensus algorithm** synthesizes responses from all models
- **Weighted voting** based on model weights

---

## HTTP Outcall Details

**Base URL:** `https://api-inference.huggingface.co/models/`

**Request Method:** POST

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer {HUGGING_FACE_API_KEY}`

**Request Body Format:**
```json
{
  "inputs": "<|system|>\n{system_prompt}\n<|end|>\n<|user|>\n{query}\n<|end|>\n<|assistant|>\n",
  "parameters": {
    "max_new_tokens": 512,
    "temperature": 0.7,
    "top_p": 0.95,
    "return_full_text": false,
    "do_sample": true
  },
  "options": {
    "wait_for_model": true,
    "use_cache": false
  }
}
```

**Cycles per Request:** 50,000,000,000 (50B cycles)

---

## Code Location

**File:** `backend/raven_ai/src/lib.rs`
**Function:** `get_default_providers()` (line 90)
**HTTP Outcall Function:** `call_llm_provider()` (line 1615)




