# DeepSeek R1 Inference Latency Optimization

## Overview

This document explains how we handle inference latency and instruction limits for the DeepSeek R1 7B model on the Internet Computer.

## Latency Optimization Strategy

### 1. **4-Bit Quantization (Q4_K_M)**

**Why 4-bit?**
- **Size Reduction**: ~75% reduction (14GB → 4GB)
- **Speed**: ~2-3x faster inference
- **Quality**: ~98-99% of FP16 accuracy
- **IC Compatibility**: Fits within canister storage limits

**Quantization Format:**
```rust
pub struct ModelShard {
    // ... other fields ...
    pub quantization: Option<String>,  // "Q4_K_M", "Q8_0", "F16", etc.
    pub compression_ratio: Option<f32>, // 0.25 for 4-bit (75% reduction)
}
```

**Supported Formats:**
- `Q4_K_M`: 4-bit medium (recommended) - 75% reduction
- `Q8_0`: 8-bit - 50% reduction, higher quality
- `Q5_K_M`: 5-bit medium - 69% reduction
- `Q4_K_S`: 4-bit small - 75% reduction, slightly lower quality
- `F16`: Half precision - 50% reduction
- `F32`: Full precision - no reduction

### 2. **Instruction Limit Management**

**IC Constraints:**
- ~20M instructions per message execution
- With 4-bit quantization: ~2000 input + 512 output tokens per round
- Safety margin: ~2-5M instructions for overhead

**Token Limits:**
```rust
// Hard limit to fit instruction budget
let max_tokens = request.max_tokens.min(512).max(64);

// Prompt truncation to prevent overflow
let context_limit = request.context.len().min(10); // Max 10 context messages
let truncated_prompt = if prompt_len > 8000 {
    format!("{}...", &prompt[..8000])  // ~2000 tokens
} else {
    prompt.to_string()
};
```

**Per-Round Budget:**
- **Input**: ~2000 tokens max (safety limit)
- **Output**: 512 tokens max (instruction budget)
- **Total**: ~2500 tokens per round

### 3. **Async-Safe State Management Pattern**

Following IC best practices to avoid holding mutable borrows across `.await`:

```rust
#[update]
async fn infer(request: InferenceRequest) -> Result<InferenceResponse, String> {
    // 1. Extract everything FIRST (before any .await)
    let shard_ids = get_all_shard_ids();  // Vec<u32>, no borrows held
    let full_prompt = build_prompt(&request);  // Local computation
    
    // 2. Drop all borrows - shard_ids is owned Vec
    // No thread_local borrows held across .await
    
    // 3. Do async work with only local variables
    let inference_result = call_deepseek_r1_api(
        &full_prompt, 
        max_tokens, 
        temperature, 
        top_p
    ).await?;
    
    // 4. Return result (no need to put anything back)
    Ok(InferenceResponse { ... })
}
```

**Key Principles:**
1. Extract all needed data from `thread_local!` before any `.await`
2. Use owned types (`Vec`, `String`) instead of references
3. Drop all borrows explicitly or let them go out of scope
4. Only use local variables in async operations

**For Complex State:**
```rust
// If you need to modify state:
let mut temp = std::mem::take(&mut self.storage);
let result = external_call(&mut temp).await;
self.storage = temp;  // put it back
```

### 4. **HTTP Outcall Optimizations**

**Request Optimization:**
```rust
let request_body = serde_json::json!({
    "inputs": truncated_prompt,
    "parameters": {
        "max_new_tokens": max_tokens.min(512),
        "temperature": temperature,
        "top_p": top_p,
        "top_k": 40,  // Reduce search space for faster inference
        "repetition_penalty": 1.1,  // Prevent loops
    },
    "options": {
        "wait_for_model": true,
        "use_cache": true,  // Enable caching for faster responses
    }
});
```

**Response Handling:**
- Limit `max_response_bytes` to 8192
- Parse JSON efficiently
- Estimate tokens accurately for quantized models

### 5. **Performance Characteristics**

| Metric | FP16 (Full) | Q4_K_M (4-bit) | Improvement |
|--------|-------------|----------------|-------------|
| Model Size | ~14GB | ~4GB | 75% reduction |
| Inference Speed | Baseline | 2-3x faster | 2-3x |
| Memory Usage | ~14GB | ~4GB | 75% reduction |
| Quality | 100% | 98-99% | -1-2% |
| Tokens/Round | ~256 | ~512 | 2x |

### 6. **Latency Breakdown**

**Current Implementation (HTTP Outcall):**
- Network latency: ~500ms-2s
- Model loading: ~0ms (pre-loaded on HF)
- Inference (512 tokens): ~2-5s
- **Total**: ~2.5-7s per request

**Future (On-Chain with llama_cpp_canister):**
- Model loading: ~100-200ms (from stable memory)
- Inference (512 tokens): ~500ms-1s
- **Total**: ~600ms-1.2s per request

### 7. **Best Practices**

1. **Always use 4-bit quantization** for production
2. **Limit max_tokens to 512** to stay within instruction budget
3. **Truncate long prompts** to prevent overflow
4. **Use async-safe patterns** - extract data before `.await`
5. **Enable caching** for repeated queries
6. **Monitor instruction usage** and adjust limits accordingly

## Implementation Status

✅ **Completed:**
- 4-bit quantization support added
- Instruction limit management implemented
- Async-safe state management pattern applied
- Token limits enforced (512 max)
- Prompt truncation implemented
- Candid interface updated (backward compatible)

⏳ **In Progress:**
- Deployment to mainnet
- Integration with llama_cpp_canister for on-chain inference

📋 **Future:**
- Streaming responses
- Response caching
- Batch processing
- Multi-round inference for long responses



