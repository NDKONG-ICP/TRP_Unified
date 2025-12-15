# raven_ai WASM Installation Issue

## Problem

The `raven_ai` canister (ID: `3noas-jyaaa-aaaao-a4xda-cai`) is showing "no Wasm module" errors in the frontend, but installation attempts are failing with "canister_not_found" from the Management Canister API.

## Root Cause

The error "canister_not_found" from the Management Canister API typically means:
1. **The identity being used is not a controller** of the canister
2. The canister exists, but the Management Canister API can't verify it for this identity

## Current Status

- ✅ Canister ID exists: `3noas-jyaaa-aaaao-a4xda-cai`
- ✅ WASM file exists: `target/wasm32-unknown-unknown/release/raven_ai.wasm` (2.39 MB)
- ❌ Installation failing: "canister_not_found" error
- ❌ Frontend error: "no Wasm module"

## Solution Options

### Option 1: Use IC Dashboard (Recommended)

1. Go to https://dashboard.internetcomputer.org
2. Navigate to your canister: `3noas-jyaaa-aaaao-a4xda-cai`
3. Click "Install Wasm"
4. Upload: `target/wasm32-unknown-unknown/release/raven_ai.wasm`
5. Select mode: **Reinstall** (this will clear state but install WASM)
6. Click "Install"

### Option 2: Add Identity as Controller

If you need to use the command line, first add your identity as a controller:

1. Get your identity principal:
   ```bash
   dfx identity get-principal --identity ic_deploy
   ```

2. Add it as a controller via IC Dashboard:
   - Go to https://dashboard.internetcomputer.org
   - Select canister `3noas-jyaaa-aaaao-a4xda-cai`
   - Go to "Settings" → "Controllers"
   - Add your principal as a controller

3. Then retry installation:
   ```bash
   node install_raven_ai_direct.mjs
   ```

### Option 3: Use dfx with Wallet (If Available)

If you have a wallet canister configured:

```bash
dfx canister install --network ic raven_ai \
  --wasm target/wasm32-unknown-unknown/release/raven_ai.wasm \
  --mode reinstall \
  --wallet <your-wallet-canister-id>
```

### Option 4: Create New Canister (Last Resort)

If the canister truly doesn't exist or is corrupted:

```bash
# Create new canister
dfx canister create --network ic raven_ai

# Install WASM
dfx canister install --network ic raven_ai \
  --wasm target/wasm32-unknown-unknown/release/raven_ai.wasm \
  --mode install
```

**Note**: This will create a NEW canister with a different ID, so you'll need to update `frontend/src/services/canisterConfig.ts` with the new ID.

## Verification

After installation, verify it works:

```bash
dfx canister call --network ic raven_ai get_article_stats '()'
```

Or test in your frontend - the "Generate Article" button should work.

## Files Available

- `install_raven_ai_direct.mjs` - Direct installation script (requires controller permission)
- `install_code_only.mjs` - General installation script
- WASM file: `target/wasm32-unknown-unknown/release/raven_ai.wasm`

## Next Steps

1. **Try Option 1 (IC Dashboard)** - This is the most reliable method
2. If that doesn't work, try **Option 2** (add identity as controller)
3. Verify installation works by testing the frontend

The canister exists and has an ID, but the current identity doesn't have permission to install code. Using the IC Dashboard will work regardless of controller permissions (as long as you're logged in with the right account).
