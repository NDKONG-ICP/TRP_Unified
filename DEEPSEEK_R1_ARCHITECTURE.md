# DeepSeek R1 7B Sharded On-Chain Architecture

## Overview

The Raven Project implements a **Queen Bee and Hive** architecture where:
- **Queen Bee**: Main AI pipeline orchestrator (`queen_bee` canister)
- **Model Shards**: Distributed storage of DeepSeek R1 7B model weights (`deepseek_model` canisters)
- **Vector DB Shards**: Distributed storage of embeddings/memories (`vector_db` canisters)
- **NFT Canisters (Bees)**: 300 individual AI agents that communicate with the queen

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    NFT Canisters (Bees)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ AXIOM #1 │  │ AXIOM #2 │  │ AXIOM #3 │  │   ...    │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │           │
│       └─────────────┴─────────────┴─────────────┘           │
│                          │                                    │
│                          ▼                                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Queen Bee (AI Pipeline Orchestrator)            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • Receives requests from NFT canisters              │  │
│  │  • Coordinates on-chain DeepSeek R1 inference        │  │
│  │  • Performs parallel HTTP outcalls to external LLMs │  │
│  │  • Synthesizes consensus responses                  │  │
│  │  • Processes voice synthesis                        │  │
│  │  • Stores memories in vector DB shards              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Model Shard #1  │  │ Model Shard #2  │  │ Model Shard #N  │
│ (deepseek_model)│  │ (deepseek_model)│  │ (deepseek_model)│
│                 │  │                 │  │                 │
│ • Stores model  │  │ • Stores model  │  │ • Stores model  │
│   weight shards│  │   weight shards│  │   weight shards│
│ • On-chain      │  │ • On-chain      │  │ • On-chain      │
│   inference     │  │   inference     │  │   inference     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Vector DB #1    │  │ Vector DB #2    │  │ Vector DB #N   │
│ (vector_db)     │  │ (vector_db)     │  │ (vector_db)    │
│                 │  │                 │  │                │
│ • Stores        │  │ • Stores        │  │ • Stores       │
│   embeddings    │  │   embeddings    │  │   embeddings   │
│ • Cosine        │  │ • Cosine        │  │ • Cosine       │
│   similarity    │  │   similarity    │  │   similarity   │
│   search        │  │   search        │  │   search       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Model Sharding Strategy

### DeepSeek R1 7B Model Weights

The model weights are split across multiple `deepseek_model` canisters:

1. **Download Model**: DeepSeek R1 7B in GGUF format
   - Source: Hugging Face (Qwen-based architecture)
   - Format: GGUF (quantized for efficiency)
   - Size: ~4-7GB (depending on quantization)

2. **Shard Distribution**:
   - Each `deepseek_model` canister stores a subset of weight shards
   - Shards are distributed based on model layer boundaries
   - Inference requires coordination across multiple shards

3. **Inference Flow**:
   ```
   Query → Queen Bee → Distribute to Model Shards → Aggregate Results → Response
   ```

## Vector Database Sharding

### Persistent Memory Storage

Memories are stored as vector embeddings across `vector_db` canisters:

1. **Embedding Generation**:
   - Text content → Embedding vector (via on-chain or HTTP outcall)
   - Metadata (timestamp, importance, tags)
   - Shard assignment based on hash or round-robin

2. **Query Flow**:
   ```
   Query Text → Embedding → Query All Vector DB Shards → Aggregate Results → Top-K
   ```

3. **Shard Distribution**:
   - Each `vector_db` canister handles a subset of vectors
   - Cosine similarity search within each shard
   - Results aggregated and ranked globally

## Integration with Existing System

### Current Architecture (HTTP Outcalls)
- `raven_ai` canister queries external LLMs (Hugging Face, Perplexity)
- Parallel HTTP outcalls to 8 models
- Consensus synthesis

### New Architecture (Hybrid)
- **On-chain**: DeepSeek R1 7B via model shards
- **HTTP Outcalls**: External LLMs (Hugging Face, Perplexity) - still used
- **Hybrid Mode**: Both on-chain and HTTP in parallel for maximum accuracy

### Integration Points

1. **raven_ai → queen_bee**:
   - `raven_ai::query_ai_council()` calls `queen_bee::process_ai_request()`
   - Queen Bee coordinates on-chain + HTTP parallel inference

2. **axiom_nft → queen_bee**:
   - NFT canisters call `queen_bee::process_ai_request()` directly
   - Queen Bee handles all AI processing

3. **Memory Storage**:
   - All canisters store memories via `queen_bee::store_memory()`
   - Queen Bee distributes to vector DB shards

## Implementation Status

### ✅ Completed
- [x] `deepseek_model` canister structure
- [x] `vector_db` canister structure
- [x] `queen_bee` orchestrator canister
- [x] Candid interfaces defined
- [x] dfx.json updated

### 🚧 In Progress
- [ ] llama_cpp_canister integration for actual inference
- [ ] Model weight sharding logic
- [ ] Vector embedding generation
- [ ] Integration with raven_ai
- [ ] Integration with axiom_nft canisters

### 📋 TODO
- [ ] Download DeepSeek R1 7B GGUF model
- [ ] Implement model weight sharding
- [ ] Implement on-chain inference via llama_cpp_canister
- [ ] Implement vector embedding generation
- [ ] Wire queen_bee to all NFT canisters
- [ ] Deploy to mainnet

## References

- [LlamaEdge](https://github.com/second-state/LlamaEdge) - Rust-based LLM inference
- [llama_cpp_canister](https://github.com/onicai/llama_cpp_canister) - On-chain LLM inference for IC
- [DeepSeek R1](https://huggingface.co/deepseek-ai) - Model source

## Next Steps

1. **Model Acquisition**:
   ```bash
   # Download DeepSeek R1 7B GGUF model
   curl -LO https://huggingface.co/deepseek-ai/DeepSeek-R1-7B/resolve/main/model.gguf
   ```

2. **Shard Model Weights**:
   - Split GGUF file into shards
   - Upload shards to `deepseek_model` canisters

3. **Integrate llama_cpp_canister**:
   - Add llama_cpp_canister as dependency
   - Implement actual inference calls

4. **Deploy and Test**:
   - Deploy all canisters to mainnet
   - Test inference pipeline
   - Monitor performance and cycles




