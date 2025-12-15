# raven_ai Reset and Installation - Complete Solution

## ✅ Diagnosis Confirmed

**The canister `3noas-jyaaa-aaaao-a4xda-cai` does NOT exist on mainnet.**

The boundary node error "canister_not_found" confirms this. The canister was never created or was deleted.

## Current Status

- ✅ **WASM file ready**: `target/wasm32-unknown-unknown/release/raven_ai.wasm` (2.39 MB)
- ✅ **Identity is controller**: `gqkko-43bbx-nwsp4-it2rg-pc2dy-w2pt2-fa5om-4y6es-oyhz2-5i5oh-5ae`
- ❌ **Old canister doesn't exist**: `3noas-jyaaa-aaaao-a4xda-cai`
- ❌ **Wallet low on cycles**: 0.151 TC (needs 0.6 TC minimum)
- ❌ **dfx broken**: Color panic bug (all versions)

## Solution: Create New Canister

### Step 1: Top Up Wallet (REQUIRED)

The wallet `daf6l-jyaaa-aaaao-a4nba-cai` needs at least 1 TC to create a canister.

**Transfer cycles to wallet:**
- Wallet ID: `daf6l-jyaaa-aaaao-a4nba-cai`
- Amount: At least 1 TC (1,000,000,000,000 cycles)
- Method: Use IC Dashboard or `dfx ledger` command

### Step 2: Create and Install

After wallet is topped up, run:

```bash
cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"
node reset_and_install_raven_ai.mjs
```

This script will:
1. ✅ Check wallet balance
2. ✅ Create new canister via wallet
3. ✅ Install WASM to new canister
4. ✅ Update frontend config automatically
5. ✅ Verify installation works

### Step 3: Update dfx.json (if needed)

If `dfx.json` has the old canister ID hardcoded, update it:

```json
"raven_ai": {
  "candid": "backend/raven_ai/raven_ai.did",
  "package": "raven_ai",
  "type": "rust",
  "source": ["backend/raven_ai"]
}
```

The new ID will be in `frontend/src/services/canisterConfig.ts` after the script runs.

## Alternative: Fix dfx and Use It

If you can fix the dfx color panic:

```bash
# Create canister
dfx canister create --network ic raven_ai

# Install WASM
dfx canister install --network ic raven_ai \
  --wasm target/wasm32-unknown-unknown/release/raven_ai.wasm \
  --mode install

# Get new ID
dfx canister --network ic id raven_ai

# Update frontend config with new ID
```

## Files Ready

- ✅ `reset_and_install_raven_ai.mjs` - Automated script (needs wallet cycles)
- ✅ `target/wasm32-unknown-unknown/release/raven_ai.wasm` - WASM file
- ✅ `verify_raven_ai_working.mjs` - Verification script

## Next Steps

1. **Top up wallet**: Transfer 1+ TC to `daf6l-jyaaa-aaaao-a4nba-cai`
2. **Run script**: `node reset_and_install_raven_ai.mjs`
3. **Verify**: Script will auto-verify, or run `node verify_raven_ai_working.mjs`
4. **Test frontend**: Visit `/news` and click "Generate Article"

The script handles everything automatically once the wallet has cycles.
