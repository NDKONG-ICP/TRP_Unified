# Manual Deployment Guide - Multi-Chain Canisters

## ⚠️ Important Note

Due to a dfx color output issue on macOS, automatic deployment is currently blocked. Use this manual guide to deploy.

## Prerequisites

✅ All canisters are compiled and ready:
- `target/wasm32-unknown-unknown/release/siwe_canister.wasm`
- `target/wasm32-unknown-unknown/release/siws_canister.wasm`
- `target/wasm32-unknown-unknown/release/siwb_canister.wasm`
- `target/wasm32-unknown-unknown/release/sis_canister.wasm`
- `target/wasm32-unknown-unknown/release/ordinals_canister.wasm`

✅ Frontend is built and ready in `frontend/dist/`

## Deployment Steps

### Option 1: Use IC Dashboard (Recommended)

1. Go to https://dashboard.internetcomputer.org/
2. Navigate to "Canisters"
3. For each canister:
   - Click "Create Canister"
   - Upload the WASM file from `target/wasm32-unknown-unknown/release/`
   - Upload the Candid file from `backend/[canister_name]/[canister_name].did`
   - Deploy

### Option 2: Use dfx in a Different Terminal/Environment

If you have access to a Linux machine or a different terminal:

```bash
cd raven-unified-ecosystem

# Create canisters
dfx canister create siwe_canister --network ic --no-wallet
dfx canister create siws_canister --network ic --no-wallet
dfx canister create siwb_canister --network ic --no-wallet
dfx canister create sis_canister --network ic --no-wallet
dfx canister create ordinals_canister --network ic --no-wallet

# Deploy
dfx deploy siwe_canister --network ic --no-wallet
dfx deploy siws_canister --network ic --no-wallet
dfx deploy siwb_canister --network ic --no-wallet
dfx deploy sis_canister --network ic --no-wallet
dfx deploy ordinals_canister --network ic --no-wallet

# Get IDs
dfx canister id siwe_canister --network ic
dfx canister id siws_canister --network ic
dfx canister id siwb_canister --network ic
dfx canister id sis_canister --network ic
dfx canister id ordinals_canister --network ic
```

### Option 3: Use ic-repl or Other Tools

You can use alternative IC deployment tools that don't have the color issue.

## After Deployment

1. **Get Canister IDs** from the deployment output
2. **Update `frontend/src/services/canisterConfig.ts`** with the IDs:

```typescript
siwe_canister: import.meta.env.VITE_SIWE_CANISTER_ID || 'YOUR_SIWE_ID_HERE',
siws_canister: import.meta.env.VITE_SIWS_CANISTER_ID || 'YOUR_SIWS_ID_HERE',
siwb_canister: import.meta.env.VITE_SIWB_CANISTER_ID || 'YOUR_SIWB_ID_HERE',
sis_canister: import.meta.env.VITE_SIS_CANISTER_ID || 'YOUR_SIS_ID_HERE',
ordinals_canister: import.meta.env.VITE_ORDINALS_CANISTER_ID || 'YOUR_ORDINALS_ID_HERE',
```

3. **Rebuild frontend**:
```bash
cd frontend
npm run build
cd ..
```

4. **Deploy frontend**:
```bash
dfx deploy assets --network ic --no-wallet
```

## Canister Candid Files

All Candid files are ready:
- `backend/siwe_canister/siwe_canister.did`
- `backend/siws_canister/siws_canister.did`
- `backend/siwb_canister/siwb_canister.did`
- `backend/sis_canister/sis_canister.did`
- `backend/ordinals_canister/ordinals_canister.did`

## Verification

After deployment, verify each canister:
```bash
dfx canister status siwe_canister --network ic
dfx canister status siws_canister --network ic
dfx canister status siwb_canister --network ic
dfx canister status sis_canister --network ic
dfx canister status ordinals_canister --network ic
```

## Troubleshooting

If dfx continues to have issues:
1. Try updating dfx: `dfx upgrade`
2. Use IC Dashboard for deployment
3. Use a different terminal environment (Linux VM, Docker, etc.)
4. Check dfx GitHub issues for color output fixes

