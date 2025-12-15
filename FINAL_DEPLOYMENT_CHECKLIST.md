# Final Deployment Checklist - DeepSeek R1 Architecture

## ✅ Completed

- [x] Created `deepseek_model` canister (model weight sharding)
- [x] Created `vector_db` canister (vector database sharding)
- [x] Created `queen_bee` canister (AI pipeline orchestrator)
- [x] Implemented DeepSeek R1 inference via HTTP outcalls
- [x] Implemented vector storage and query functions
- [x] Implemented voice synthesis integration
- [x] Updated `axiom_nft` to call `queen_bee`
- [x] All canisters compile successfully
- [x] Deployment scripts created

## 🚧 In Progress

- [ ] Deploy `deepseek_model` to mainnet (running in background)
- [ ] Deploy `vector_db` to mainnet (running in background)
- [ ] Deploy `queen_bee` to mainnet (running in background)

## 📋 Remaining Steps

### 1. Wait for Deployments to Complete

Check deployment status:
```bash
# Check logs
tail -f /tmp/deepseek_deploy.log
tail -f /tmp/vector_db_deploy.log
tail -f /tmp/queen_bee_deploy.log

# Check canister IDs
dfx canister id deepseek_model --network ic
dfx canister id vector_db --network ic
dfx canister id queen_bee --network ic
```

### 2. Register Canisters

Run the registration script:
```bash
./scripts/register_canisters.sh
```

Or manually:
```bash
DEEPSEEK_ID=$(dfx canister id deepseek_model --network ic)
VECTOR_DB_ID=$(dfx canister id vector_db --network ic)
QUEEN_BEE_ID=$(dfx canister id queen_bee --network ic)

dfx canister call queen_bee register_model_canister "(1, principal \"$DEEPSEEK_ID\")" --network ic
dfx canister call queen_bee register_vector_db_canister "(1, principal \"$VECTOR_DB_ID\")" --network ic
```

### 3. Update AXIOM NFT Canisters

Update `backend/axiom_nft/src/lib.rs`:
```rust
const QUEEN_BEE_CANISTER: &str = "<queen_bee_canister_id>";
const USE_QUEEN_BEE: bool = true;
```

Or run the script:
```bash
./scripts/update_queen_bee_config.sh
```

### 4. Deploy Updated AXIOM NFT Canisters

```bash
# Deploy all AXIOM NFTs
nohup dfx deploy axiom_1 --network ic > /tmp/axiom_1_deploy.log 2>&1 &
nohup dfx deploy axiom_2 --network ic > /tmp/axiom_2_deploy.log 2>&1 &
nohup dfx deploy axiom_3 --network ic > /tmp/axiom_3_deploy.log 2>&1 &
nohup dfx deploy axiom_4 --network ic > /tmp/axiom_4_deploy.log 2>&1 &
nohup dfx deploy axiom_5 --network ic > /tmp/axiom_5_deploy.log 2>&1 &
```

### 5. Test Integration

Test queen_bee AI pipeline:
```bash
QUEEN_BEE_ID=$(dfx canister id queen_bee --network ic)

dfx canister call queen_bee process_ai_request '(
  record {
    query = "What is the Raven Ecosystem?";
    system_prompt = opt "You are a helpful AI assistant.";
    context = vec {};
    token_id = null;
    use_onchain = true;
    use_http_parallel = true;
  }
)' --network ic
```

### 6. Verify Everything Works

- [ ] Test AI queries from AXIOM NFTs
- [ ] Verify DeepSeek R1 inference is working
- [ ] Verify HTTP parallel calls are working
- [ ] Verify voice synthesis is working
- [ ] Verify memory storage is working
- [ ] Check canister cycles and top up if needed

## Architecture Summary

```
AXIOM NFTs (Bees)
    ↓
Queen Bee Orchestrator
    ├─→ DeepSeek R1 (via deepseek_model canister)
    ├─→ HTTP Parallel (via raven_ai canister)
    ├─→ Voice Synthesis (via raven_ai canister)
    └─→ Memory Storage (via vector_db canister)
```

## Troubleshooting

### If deployments fail:
1. Check cycles balance: `dfx wallet balance --network ic`
2. Check logs: `tail -f /tmp/*_deploy.log`
3. Retry deployment: `dfx deploy <canister> --network ic`

### If canister calls fail:
1. Verify canister IDs are correct
2. Check canister status: `dfx canister status <canister> --network ic`
3. Verify cycles: `dfx canister status <canister> --network ic | grep cycles`

### If inference doesn't work:
1. Check deepseek_model has shards loaded
2. Verify Hugging Face API key is valid
3. Check HTTP outcall cycles are sufficient




