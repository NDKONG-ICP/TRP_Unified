# DeepSeek R1 7B Sharded Architecture - Implementation Summary

## ✅ Completed

### Infrastructure Created

1. **`deepseek_model` Canister** (`backend/deepseek_model/`)
   - ✅ Model weight sharding storage
   - ✅ Shard management (store, retrieve, list)
   - ✅ Inference interface (placeholder for llama_cpp_canister integration)
   - ✅ Candid interface defined
   - ✅ Compiles successfully

2. **`vector_db` Canister** (`backend/vector_db/`)
   - ✅ Vector embedding storage
   - ✅ Cosine similarity search
   - ✅ Metadata filtering
   - ✅ Shard management
   - ✅ Candid interface defined
   - ✅ Compiles successfully

3. **`queen_bee` Canister** (`backend/queen_bee/`)
   - ✅ AI pipeline orchestration
   - ✅ Coordinates on-chain + HTTP parallel inference
   - ✅ Voice synthesis coordination
   - ✅ Memory storage coordination
   - ✅ Canister registration system
   - ✅ Candid interface defined
   - ✅ Compiles successfully

### Integration Points

- ✅ `axiom_nft` canister updated with `query_ai_via_queen_bee()` function
- ✅ `dfx.json` updated with all new canisters
- ✅ Workspace `Cargo.toml` updated
- ✅ Architecture documentation created

## 📋 Architecture Overview

### Queen Bee & Hive Model

```
┌─────────────────────────────────────────┐
│     300 AXIOM NFT Canisters (Bees)      │
│  Each with individual AI agent         │
│  Calls Queen Bee for AI processing     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Queen Bee (Orchestrator)           │
│  • On-chain DeepSeek R1 inference      │
│  • Parallel HTTP outcalls (8 LLMs)     │
│  • Consensus synthesis                 │
│  • Voice processing                    │
│  • Memory storage                       │
└──────┬──────────────┬───────────────────┘
       │              │
       ▼              ▼
┌─────────────┐  ┌─────────────┐
│ Model       │  │ Vector DB   │
│ Shards      │  │ Shards      │
│ (N canisters)│  │ (N canisters)│
└─────────────┘  └─────────────┘
```

### Current AI Council (8 Models via HTTP Outcalls)

1. **Perplexity-Sonar** (weight: 1.2) - Real-time search
2. **Qwen2.5-72B** (weight: 1.0)
3. **Llama-3.3-70B** (weight: 1.0)
4. **Mixtral-8x22B** (weight: 0.9)
5. **Gemma-2-27B** (weight: 0.9)
6. **Mistral-7B** (weight: 0.8)
7. **GLM-4-9B** (weight: 0.8)
8. **DeepSeek-V2.5** (weight: 1.0)

### New Architecture (Hybrid)

- **On-chain**: DeepSeek R1 7B (via sharded model weights)
- **HTTP Outcalls**: All 8 existing models (still used)
- **Hybrid Mode**: Both on-chain and HTTP in parallel for maximum accuracy

## 🚧 Next Steps

### 1. Model Acquisition

```bash
# Download DeepSeek R1 7B GGUF model
# Source: https://huggingface.co/deepseek-ai/DeepSeek-R1-7B

# Recommended: Q4_K_M or Q5_K_M quantization
# Size: ~4-7GB depending on quantization
```

### 2. llama_cpp_canister Integration

Reference: https://github.com/onicai/llama_cpp_canister

- Add as dependency to `deepseek_model/Cargo.toml`
- Implement actual inference in `infer()` function
- Handle model loading from shards

### 3. Model Sharding

- Split GGUF file into shards (< 2GB per shard)
- Upload shards to `deepseek_model` canisters
- Implement shard coordination for inference

### 4. Vector Embedding Generation

- Generate embeddings for memories (on-chain or HTTP outcall)
- Store in `vector_db` shards
- Implement cross-shard search

### 5. Deployment

```bash
# Deploy to mainnet
dfx deploy deepseek_model --network ic
dfx deploy vector_db --network ic
dfx deploy queen_bee --network ic

# Register canisters
dfx canister call queen_bee register_model_canister "(1, principal \"<id>\")" --network ic
dfx canister call queen_bee register_vector_db_canister "(1, principal \"<id>\")" --network ic
```

### 6. Enable Queen Bee in NFT Canisters

```rust
// In axiom_nft/src/lib.rs
const QUEEN_BEE_CANISTER: &str = "<deployed_canister_id>";
const USE_QUEEN_BEE: bool = true;
```

## 📊 Current Status

- ✅ **Infrastructure**: 100% Complete
- 🚧 **Model Integration**: 0% (needs llama_cpp_canister)
- 🚧 **Deployment**: 0% (needs model sharding)
- ✅ **Documentation**: 100% Complete

## 🔗 Key Files

- `backend/deepseek_model/` - Model weight sharding
- `backend/vector_db/` - Vector database sharding
- `backend/queen_bee/` - AI pipeline orchestrator
- `DEEPSEEK_R1_ARCHITECTURE.md` - Architecture details
- `DEEPSEEK_R1_INTEGRATION_GUIDE.md` - Integration guide

## 🎯 Benefits of This Architecture

1. **Scalability**: Model weights and memories distributed across canisters
2. **Performance**: Parallel on-chain + HTTP inference
3. **Persistence**: All memories stored on-chain forever
4. **Decentralization**: No single point of failure
5. **Cost Efficiency**: Sharding reduces individual canister size

## 📝 Notes

- DeepSeek R1 7B is based on Qwen architecture (similar to Qwen2.5)
- Model supports chain-of-thought reasoning (R1 = Reasoning model)
- Recommended quantization: Q4_K_M or Q5_K_M for balance
- Each NFT canister acts as a "bee" that communicates with the "queen"




