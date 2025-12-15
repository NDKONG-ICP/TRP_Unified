# DeepSeek R1 7B Integration Guide

## ✅ Completed Infrastructure

### Canisters Created

1. **`deepseek_model`** - Model weight sharding canister
   - Stores and serves sharded DeepSeek R1 7B model weights
   - Supports on-chain inference coordination
   - Location: `backend/deepseek_model/`

2. **`vector_db`** - Vector database sharding canister
   - Stores vector embeddings for persistent memory
   - Cosine similarity search
   - Location: `backend/vector_db/`

3. **`queen_bee`** - AI pipeline orchestrator
   - Coordinates on-chain inference + HTTP parallel calls
   - Voice synthesis coordination
   - Memory storage coordination
   - Location: `backend/queen_bee/`

### Integration Points

- ✅ `axiom_nft` canister updated to optionally call `queen_bee`
- ✅ `dfx.json` updated with new canisters
- ✅ Workspace Cargo.toml updated
- ✅ Architecture documentation created

## 🚧 Next Steps for Full Implementation

### 1. Download DeepSeek R1 7B Model

```bash
# DeepSeek R1 7B is based on Qwen architecture
# Download GGUF format model from Hugging Face

# Option 1: Direct download
curl -LO https://huggingface.co/deepseek-ai/DeepSeek-R1-7B/resolve/main/model.gguf

# Option 2: Use huggingface-cli
huggingface-cli download deepseek-ai/DeepSeek-R1-7B --local-dir ./models/deepseek-r1-7b

# Note: Model size is ~4-7GB depending on quantization
# Recommended: Q4_K_M or Q5_K_M quantization for balance of quality/size
```

### 2. Integrate llama_cpp_canister

Reference: https://github.com/onicai/llama_cpp_canister

```rust
// Add to deepseek_model/Cargo.toml
[dependencies]
llama_cpp_canister = { git = "https://github.com/onicai/llama_cpp_canister" }

// Update deepseek_model/src/lib.rs to use actual inference
use llama_cpp_canister::*;

#[update]
async fn infer(request: InferenceRequest) -> Result<InferenceResponse, String> {
    // Load model shards
    // Call llama_cpp_canister for inference
    // Return response
}
```

### 3. Shard Model Weights

```rust
// Create a script to split GGUF model into shards
// Each shard should be < 2GB (IC canister limit)
// Store shards in deepseek_model canisters

fn shard_model(model_path: &str, num_shards: u32) -> Vec<Vec<u8>> {
    // Read GGUF file
    // Split into shards based on layer boundaries
    // Return vector of shard bytes
}
```

### 4. Deploy Canisters

```bash
# Deploy to mainnet
dfx deploy deepseek_model --network ic
dfx deploy vector_db --network ic  
dfx deploy queen_bee --network ic

# Get canister IDs
dfx canister id deepseek_model --network ic
dfx canister id vector_db --network ic
dfx canister id queen_bee --network ic
```

### 5. Register Canisters with Queen Bee

```bash
# Register model shards
dfx canister call queen_bee register_model_canister "(1, principal \"<deepseek_model_canister_id>\")" --network ic

# Register vector DB shards
dfx canister call queen_bee register_vector_db_canister "(1, principal \"<vector_db_canister_id>\")" --network ic
```

### 6. Update NFT Canisters

```rust
// In axiom_nft/src/lib.rs, update:
const QUEEN_BEE_CANISTER: &str = "<queen_bee_canister_id>";
const USE_QUEEN_BEE: bool = true; // Enable Queen Bee
```

### 7. Update raven_ai Integration

```rust
// In raven_ai/src/lib.rs, add:
async fn query_ai_council(...) -> Result<AICouncilSession, String> {
    // Option 1: Call queen_bee for hybrid inference
    // Option 2: Keep existing HTTP outcalls as fallback
    // Option 3: Use both in parallel
}
```

## Architecture Flow

```
User Query
    ↓
AXIOM NFT Canister (Bee)
    ↓
Queen Bee Orchestrator
    ├─→ On-chain DeepSeek R1 (via model shards)
    ├─→ HTTP Parallel Calls (Hugging Face, Perplexity)
    └─→ Consensus Synthesis
    ↓
Response + Voice Synthesis
    ↓
Store Memory (vector DB shards)
    ↓
Return to User
```

## Model Information

### DeepSeek R1 7B Specifications

- **Architecture**: Based on Qwen (similar to Qwen2.5)
- **Parameters**: 7 Billion
- **Format**: GGUF (quantized)
- **Recommended Quantization**: Q4_K_M or Q5_K_M
- **Size**: ~4-7GB (depending on quantization)
- **Context Window**: 32K tokens
- **Special Features**: 
  - Reasoning capabilities (R1 = Reasoning model)
  - Chain-of-thought reasoning
  - Better at complex problem solving

### Model Download Links

- **Hugging Face**: https://huggingface.co/deepseek-ai/DeepSeek-R1-7B
- **GGUF Models**: Check Hugging Face for quantized versions
- **Alternative**: Use Qwen2.5-7B-Instruct as fallback (similar architecture)

## Testing

### Local Testing

```bash
# Build all canisters
dfx build

# Deploy locally
dfx deploy deepseek_model
dfx deploy vector_db
dfx deploy queen_bee

# Test inference
dfx canister call queen_bee process_ai_request '(
  record {
    query = "Hello, what is the Raven Ecosystem?";
    system_prompt = null;
    context = vec {};
    token_id = null;
    use_onchain = true;
    use_http_parallel = true;
  }
)'
```

## Performance Considerations

### Cycles Usage

- **Model Storage**: ~1-2T cycles per GB of model weights
- **Inference**: ~10-50B cycles per inference call
- **Vector Storage**: ~1B cycles per vector embedding
- **HTTP Outcalls**: ~50B cycles per outcall

### Optimization Strategies

1. **Model Quantization**: Use Q4_K_M for smaller size
2. **Shard Distribution**: Distribute shards across multiple canisters
3. **Caching**: Cache frequent queries
4. **Batch Processing**: Process multiple queries together

## Troubleshooting

### Model Loading Issues

- Ensure GGUF file is valid
- Check canister has enough cycles
- Verify shard integrity

### Inference Errors

- Check llama_cpp_canister integration
- Verify model shards are loaded
- Check cycles balance

### Vector DB Issues

- Ensure embeddings are properly generated
- Check shard distribution
- Verify cosine similarity calculation

## References

- [LlamaEdge](https://github.com/second-state/LlamaEdge) - Rust LLM inference
- [llama_cpp_canister](https://github.com/onicai/llama_cpp_canister) - IC on-chain inference
- [DeepSeek R1](https://huggingface.co/deepseek-ai/DeepSeek-R1-7B) - Model source
- [Qwen Architecture](https://huggingface.co/Qwen) - Base architecture




