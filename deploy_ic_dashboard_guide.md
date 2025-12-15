# IC Dashboard Deployment Guide

Since the wallet IDL encoding issue is blocking programmatic deployment, use the IC Dashboard:

## Steps

1. **Go to IC Dashboard**: https://dashboard.internetcomputer.org
2. **Connect Wallet**: Use Plug Wallet or other wallet that has access to `daf6l-jyaaa-aaaao-a4nba-cai`
3. **Navigate to Wallet**: Find wallet `daf6l-jyaaa-aaaao-a4nba-cai`
4. **Deploy Canisters**:
   - Click "Create Canister"
   - Upload WASM file: `./target/wasm32-unknown-unknown/release/siwe_canister.wasm`
   - Set cycles: 100B (0.1 TC)
   - Deploy
   - Repeat for: siws_canister, siwb_canister, sis_canister, ordinals_canister

## Canister WASM Files

- `./target/wasm32-unknown-unknown/release/siwe_canister.wasm`
- `./target/wasm32-unknown-unknown/release/siws_canister.wasm`
- `./target/wasm32-unknown-unknown/release/siwb_canister.wasm`
- `./target/wasm32-unknown-unknown/release/sis_canister.wasm`
- `./target/wasm32-unknown-unknown/release/ordinals_canister.wasm`

## After Deployment

Update `frontend/src/services/canisterConfig.ts` with the deployed canister IDs.

