# Deploying Without Automatic Cycle Top-Ups

## Issue

`dfx deploy` may automatically try to add cycles to canisters, even when they already have sufficient cycles. This wastes cycles unnecessarily.

## Solution: Use `--no-wallet` Flag

The `--no-wallet` flag prevents dfx from automatically managing cycles during deployment.

### Correct Deployment Command

```bash
dfx deploy raven_ai --network ic --no-wallet --yes
```

**Flags explained:**
- `--network ic` - Deploy to mainnet
- `--no-wallet` - **Prevents automatic cycle top-ups** (important!)
- `--yes` - Skip confirmation prompts

### Alternative: Direct WASM Install

If you want even more control, install the WASM directly:

```bash
dfx canister install raven_ai \
  --network ic \
  --wasm backend/raven_ai/target/wasm32-unknown-unknown/release/raven_ai.wasm \
  --mode upgrade \
  --yes
```

This completely bypasses dfx's cycle management.

## Current Canister Status

Your `raven_ai` canister currently has:
- **310+ billion cycles** (more than sufficient)
- **Status**: Running

No additional cycles are needed for deployment.

## Updated Deployment Scripts

All deployment scripts now use `--no-wallet` to prevent unnecessary cycle additions:
- `scripts/deploy_mainnet_complete.sh` ✅
- `deploy_raven_ai_mainnet.sh` ✅
- `scripts/deploy_mainnet.sh` ✅

## Manual Deployment (Recommended)

```bash
cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

# Build first
cd backend/raven_ai
cargo build --target wasm32-unknown-unknown --release
cd ../..

# Deploy without wallet (no automatic cycles)
export DFX_WARNING=-mainnet_plaintext_identity
dfx deploy raven_ai --network ic --no-wallet --yes
```

## Why This Happens

dfx checks canister balance and may try to "top up" cycles if it thinks the canister is low. However:
- Your canister has 310B cycles (plenty for operations)
- Deployment only needs cycles for the upgrade itself
- The automatic top-up is unnecessary

Using `--no-wallet` tells dfx: "Don't manage cycles, just deploy the code."

## Verification

After deployment, verify cycles weren't unnecessarily added:

```bash
dfx canister --network ic status raven_ai | grep Balance
```

The balance should remain around 310B cycles (minus the small amount used for the upgrade operation itself).

