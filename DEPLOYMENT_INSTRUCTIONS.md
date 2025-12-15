# Multi-Chain Canister Deployment Instructions

## Status

✅ **All canisters compiled successfully!**

All 5 canisters are ready for deployment:
- `siwe_canister` ✅
- `siws_canister` ✅
- `siwb_canister` ✅
- `sis_canister` ✅
- `ordinals_canister` ✅

## Deployment Method

Due to dfx color output issues on macOS, use one of these methods:

### Method 1: Manual Deployment (Recommended)

1. **Create canisters** (if they don't exist):
   ```bash
   cd raven-unified-ecosystem
   export NO_COLOR=1 TERM=dumb
   unset COLORTERM
   
   dfx canister create siwe_canister --network ic --no-wallet
   dfx canister create siws_canister --network ic --no-wallet
   dfx canister create siwb_canister --network ic --no-wallet
   dfx canister create sis_canister --network ic --no-wallet
   dfx canister create ordinals_canister --network ic --no-wallet
   ```

2. **Get canister IDs**:
   ```bash
   dfx canister id siwe_canister --network ic
   dfx canister id siws_canister --network ic
   dfx canister id siwb_canister --network ic
   dfx canister id sis_canister --network ic
   dfx canister id ordinals_canister --network ic
   ```

3. **Deploy using dfx canister install** (bypasses color issues):
   ```bash
   # Build WASM files are in: target/wasm32-unknown-unknown/release/
   # Deploy each canister:
   
   dfx canister install siwe_canister \
     --wasm target/wasm32-unknown-unknown/release/siwe_canister.wasm \
     --network ic \
     --no-wallet
   
   dfx canister install siws_canister \
     --wasm target/wasm32-unknown-unknown/release/siws_canister.wasm \
     --network ic \
     --no-wallet
   
   dfx canister install siwb_canister \
     --wasm target/wasm32-unknown-unknown/release/siwb_canister.wasm \
     --network ic \
     --no-wallet
   
   dfx canister install sis_canister \
     --wasm target/wasm32-unknown-unknown/release/sis_canister.wasm \
     --network ic \
     --no-wallet
   
   dfx canister install ordinals_canister \
     --wasm target/wasm32-unknown-unknown/release/ordinals_canister.wasm \
     --network ic \
     --no-wallet
   ```

### Method 2: Use dfx deploy (if color issues resolved)

```bash
export NO_COLOR=1 TERM=dumb
unset COLORTERM
RUST_BACKTRACE=0

dfx deploy siwe_canister --network ic --no-wallet
dfx deploy siws_canister --network ic --no-wallet
dfx deploy siwb_canister --network ic --no-wallet
dfx deploy sis_canister --network ic --no-wallet
dfx deploy ordinals_canister --network ic --no-wallet
```

## After Deployment

1. **Record canister IDs** from the deployment output
2. **Update frontend config** in `frontend/src/services/canisterConfig.ts`
3. **Build and deploy frontend**:
   ```bash
   cd frontend
   npm run build
   cd ..
   dfx deploy assets --network ic --no-wallet
   ```

## Canister IDs Template

After deployment, update `frontend/src/services/canisterConfig.ts`:

```typescript
export const CANISTER_IDS = {
  // ... existing canisters ...
  siwe_canister: 'YOUR_SIWE_CANISTER_ID_HERE',
  siws_canister: 'YOUR_SIWS_CANISTER_ID_HERE',
  siwb_canister: 'YOUR_SIWB_CANISTER_ID_HERE',
  sis_canister: 'YOUR_SIS_CANISTER_ID_HERE',
  ordinals_canister: 'YOUR_ORDINALS_CANISTER_ID_HERE',
} as const;
```

## Verification

After deployment, verify canisters are running:

```bash
dfx canister status siwe_canister --network ic
dfx canister status siws_canister --network ic
dfx canister status siwb_canister --network ic
dfx canister status sis_canister --network ic
dfx canister status ordinals_canister --network ic
```

