# Deploying Optional Canisters to Mainnet

## Issue
The `dfx` tool (version 0.28.0) has a known bug that causes it to panic with "ColorOutOfRange" errors when deploying canisters. This prevents automatic deployment of the optional canisters.

## Canisters to Deploy
- `siwe_canister` - Ethereum Sign-In
- `siws_canister` - Solana Sign-In  
- `siwb_canister` - Bitcoin Sign-In
- `sis_canister` - Solana Sign-In (alternative)
- `ordinals_canister` - Bitcoin Ordinals

## Status
✅ All canisters have been **created** on mainnet (created-at-time messages confirm this)
❌ Deployment is **incomplete** due to dfx color output bug

## Manual Deployment Instructions

### Option 1: Wait for dfx Update
The dfx team is aware of this issue. You can wait for an updated version.

### Option 2: Manual Deployment (Recommended)

1. **Build the canisters** (already done):
```bash
cd raven-unified-ecosystem
cd backend/siwe_canister && cargo build --target wasm32-unknown-unknown --release
cd ../siws_canister && cargo build --target wasm32-unknown-unknown --release
cd ../siwb_canister && cargo build --target wasm32-unknown-unknown --release
cd ../sis_canister && cargo build --target wasm32-unknown-unknown --release
cd ../ordinals_canister && cargo build --target wasm32-unknown-unknown --release
cd ../..
```

2. **Get canister IDs** (they were created, but IDs weren't saved due to panic):
```bash
# Try to get IDs (may still panic, but canister exists)
export NO_COLOR=1
export TERM=dumb
unset COLORTERM

# The canisters exist, but we need to find their IDs
# Check your wallet canister for controlled canisters
```

3. **Install WASM manually**:
```bash
# Once you have the canister ID, install the WASM
dfx canister --network ic install <CANISTER_ID> \
  --wasm target/wasm32-unknown-unknown/release/<canister_name>.wasm \
  --no-wallet
```

### Option 3: Use IC Dashboard
1. Go to https://dashboard.internetcomputer.org
2. Navigate to your canisters
3. Find the newly created canisters (siwe_canister, etc.)
4. Upload the WASM files manually through the dashboard

### Option 4: Query IC Directly
The canisters were created and should be visible in your wallet's controlled canisters list. You can:
1. Check your wallet canister: `daf6l-jyaaa-aaaao-a4nba-cai`
2. List controlled canisters
3. Find the new canister IDs
4. Install WASM using those IDs

## Current Status
- ✅ Source code exists for all 5 canisters
- ✅ Canisters built successfully
- ✅ Canisters created on IC mainnet
- ⚠️  WASM installation incomplete (dfx bug)
- ⚠️  Canister IDs not saved locally (dfx bug)

## Next Steps
1. **Immediate**: Check if canisters are actually deployed by querying IC directly
2. **Short-term**: Manually complete WASM installation using one of the methods above
3. **Long-term**: Update dfx when fix is available, or use alternative deployment tool

## Verification
Once deployed, verify with:
```bash
dfx canister --network ic status <canister_name>
```

## Frontend Configuration
Once you have the canister IDs, update:
- `frontend/src/services/canisterConfig.ts` with the actual canister IDs

The frontend already has placeholder IDs that can be replaced once the actual IDs are known.

