# AXIOM NFT Requirements & AI Pipeline Configuration

## Overview
All AXIOM NFTs (Genesis #1-5 and future #6-300) must have:
1. ✅ **AI Pipeline Access** - Can call `raven_ai::query_ai_council` without subscription
2. ✅ **Multichain Metadata** - Proper addresses for all supported chains
3. ✅ **Voice Synthesis** - Can call `raven_ai::synthesize_voice` without subscription
4. ✅ **Persistent Memory** - Conversation history and learning capabilities

---

## AI Pipeline Access

### Current Implementation
The `raven_ai` canister now allows AXIOM NFT canisters to bypass subscription checks for:
- `query_ai_council()` - Multi-LLM consensus AI responses
- `synthesize_voice()` - Eleven Labs text-to-speech

### How It Works
```rust
// In raven_ai/src/lib.rs
fn is_axiom_canister(caller: &Principal) -> bool {
    let caller_text = caller.to_text();
    caller_text.starts_with("46odg") || // axiom_1
    caller_text.starts_with("4zpfs") || // axiom_2
    caller_text.starts_with("4ckzx") || // axiom_3
    caller_text.starts_with("4fl7d") || // axiom_4
    caller_text.starts_with("4miu7")    // axiom_5
    // Future AXIOMs will be added here
}
```

### Adding New AXIOM NFTs
When deploying AXIOM #6-300, add the canister ID prefix to `is_axiom_canister()` in:
- `backend/raven_ai/src/lib.rs` (lines ~1733 and ~2441)

---

## Multichain Metadata

### Required Fields
Every AXIOM NFT must have `MultichainMetadata` with:

```rust
pub struct MultichainMetadata {
    pub icp_canister: String,           // ✅ Required - Canister ID
    pub eth_contract: Option<String>,   // ✅ Ethereum ERC-721
    pub eth_token_id: Option<String>,   // ✅ Token ID
    pub evm_chain_id: Option<u64>,      // ✅ Chain ID (1=Mainnet)
    pub sol_mint: Option<String>,       // ✅ Solana SPL token
    pub btc_inscription: Option<String>, // ✅ Bitcoin Ordinals
    pub sui_object_id: Option<String>,  // ✅ Sui object ID
    pub standards: Vec<String>,         // ✅ ["ICRC-7", "ERC-721", "SPL", ...]
    pub bridge_protocol: Option<String>, // ✅ "Chain Fusion"
    pub bridge_address: Option<String>,  // ✅ Bridge canister ID
}
```

### Initialization
Multichain metadata is automatically generated in `axiom_nft/src/lib.rs::init()`:
```rust
let multichain_metadata = generate_axiom_multichain_addresses(args.token_id, &canister_id);
```

### Updating Metadata
Use the `update_multichain_metadata` function:
```bash
dfx canister --network ic call <axiom_canister_id> update_multichain_metadata \
  '(opt "0x...", opt "1", opt 1 : nat64, ...)'
```

---

## AI Pipeline Flow

### For AXIOM NFTs:
```
User → AXIOM NFT Canister → raven_ai::query_ai_council()
                              ↓
                         HTTP Outcalls to:
                         - Hugging Face (7 models)
                         - Perplexity Sonar Pro
                              ↓
                         Consensus Algorithm
                              ↓
                         Response → AXIOM NFT → User
```

### For Main App:
```
User → Frontend → backendAIService → raven_ai::query_ai_council()
                                        ↓
                                   (Same flow as above)
```

---

## Verification Checklist

For each AXIOM NFT, verify:

- [ ] Canister is deployed and running
- [ ] Metadata accessible via `get_metadata()`
- [ ] Multichain metadata has all required fields
- [ ] Can call `raven_ai::query_ai_council` (test with inter-canister call)
- [ ] Can call `raven_ai::synthesize_voice` (test with inter-canister call)
- [ ] Conversation history persists (`get_conversations()`)
- [ ] Memory store works (`get_memory()`)

### Test Commands:
```bash
# Check metadata
dfx canister --network ic call <canister_id> get_metadata

# Test AI pipeline (via HTTP)
dfx canister --network ic call <canister_id> http_request \
  '(record {method="POST"; url="/api/chat"; body="{\"message\":\"Hello\"}"; headers=vec{};})'

# Check multichain metadata
dfx canister --network ic call <canister_id> get_metadata | grep multichain
```

---

## Future AXIOM NFTs (6-300)

### Deployment Checklist:
1. ✅ Deploy canister with `axiom_nft` code
2. ✅ Initialize with `init()` including token_id
3. ✅ Add canister ID prefix to `is_axiom_canister()` in `raven_ai`
4. ✅ Verify multichain metadata is generated
5. ✅ Test AI pipeline access
6. ✅ Test voice synthesis
7. ✅ Update frontend `canisterConfig.ts` if needed
8. ✅ Add to `canister_ids.json`

### Code Updates Required:
- `backend/raven_ai/src/lib.rs` - Add new canister ID prefix
- `frontend/src/services/canisterConfig.ts` - Add canister ID (if needed)
- `canister_ids.json` - Add entry

---

## Troubleshooting

### AI Pipeline Fails
**Error:** "Active subscription required for AI Council"
- ✅ Check if AXIOM canister ID is in `is_axiom_canister()`
- ✅ Verify canister is calling from correct principal
- ✅ Check `raven_ai` canister is deployed and accessible

### Multichain Metadata Missing
**Error:** Empty or null multichain fields
- ✅ Run `update_multichain_metadata` with proper values
- ✅ Check `init()` was called with correct parameters
- ✅ Verify metadata storage is working

### Voice Synthesis Fails
**Error:** "Active subscription required"
- ✅ Check if AXIOM canister ID is in `is_axiom_canister()`
- ✅ Verify Eleven Labs API key is set in `raven_ai`
- ✅ Check canister has cycles for HTTP outcalls

---

## Related Files
- `backend/axiom_nft/src/lib.rs` - AXIOM NFT implementation
- `backend/raven_ai/src/lib.rs` - AI Council and voice synthesis
- `frontend/src/services/backendAIService.ts` - Frontend AI service
- `frontend/src/services/axiomService.ts` - AXIOM service
- `scripts/verify_axiom_nfts.sh` - Verification script

---

## Last Updated
December 2024 - After fixing AI pipeline subscription checks

