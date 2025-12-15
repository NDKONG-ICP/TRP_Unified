# Install raven_ai Canister - Manual Steps

## Problem
The `dfx` tool has a color panic bug that prevents automated installation. The WASM file is built and ready, but needs manual installation.

## Solution

Run these commands in your terminal:

```bash
cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"
export NO_COLOR=1
export TERM=dumb
unset COLORTERM
dfx canister install --network ic raven_ai --wasm target/wasm32-unknown-unknown/release/raven_ai.wasm --mode=reinstall
```

**When prompted, type:** `yes`

## Note
The `dfx` tool may panic AFTER the installation completes. This is a known bug in dfx 0.28.0. The installation itself should succeed despite the panic.

## Verify Installation

After running the command, verify it worked by:

1. **Refresh your browser** - The frontend should now be able to call the canister
2. **Try generating an article** - Should work without "no wasm module" error
3. **Check canister status:**
   ```bash
   dfx canister --network ic status raven_ai
   ```

## Alternative: Use IC Dashboard

If the command-line approach doesn't work, you can install via the IC Dashboard:

1. Go to https://dashboard.internetcomputer.org
2. Connect with your wallet
3. Navigate to canister: `3noas-jyaaa-aaaao-a4xda-cai`
4. Upload WASM file: `target/wasm32-unknown-unknown/release/raven_ai.wasm`
5. Install with mode: `reinstall`

## Current Status

- ✅ WASM file built: `target/wasm32-unknown-unknown/release/raven_ai.wasm` (2.4MB)
- ✅ Canister exists: `3noas-jyaaa-aaaao-a4xda-cai`
- ❌ WASM not installed (needs manual installation)

