# Multi-Chain Authentication Deployment Guide

## Overview

This document provides complete instructions for deploying the multi-chain authentication system to mainnet. The system supports:

- **ICP Wallets**: Internet Identity, Plug, OISY, NFID
- **Ethereum**: MetaMask (SIWE)
- **Solana**: Phantom (SIWS)
- **Bitcoin**: Unisat, Xverse (SIWB)
- **Sui**: Sui Wallet (SIS)
- **Bitcoin Ordinals**: Full inscription support

## Prerequisites

1. **DFX CLI** installed and configured
2. **Rust** toolchain (latest stable)
3. **Node.js** and npm
4. **Mainnet wallet** with cycles
5. **Canister IDs** for all new canisters

## Phase 1: Backend Canister Deployment

### Step 1: Build All Canisters

```bash
cd raven-unified-ecosystem/backend

# Build SIWE canister
cd siwe_canister
cargo build --target wasm32-unknown-unknown --release
cd ..

# Build SIWS canister
cd siws_canister
cargo build --target wasm32-unknown-unknown --release
cd ..

# Build SIWB canister
cd siwb_canister
cargo build --target wasm32-unknown-unknown --release
cd ..

# Build SIS canister
cd sis_canister
cargo build --target wasm32-unknown-unknown --release
cd ..

# Build Ordinals canister
cd ordinals_canister
cargo build --target wasm32-unknown-unknown --release
cd ..
```

### Step 2: Create Canisters

```bash
cd ../.. # Back to project root

# Create canisters (if they don't exist)
dfx canister create siwe_canister --network ic --no-wallet --yes
dfx canister create siws_canister --network ic --no-wallet --yes
dfx canister create siwb_canister --network ic --no-wallet --yes
dfx canister create sis_canister --network ic --no-wallet --yes
dfx canister create ordinals_canister --network ic --no-wallet --yes
```

### Step 3: Deploy Canisters

```bash
# Deploy all canisters
dfx deploy siwe_canister --network ic --no-wallet --yes
dfx deploy siws_canister --network ic --no-wallet --yes
dfx deploy siwb_canister --network ic --no-wallet --yes
dfx deploy sis_canister --network ic --no-wallet --yes
dfx deploy ordinals_canister --network ic --no-wallet --yes
```

### Step 4: Get Canister IDs

```bash
# Record all canister IDs
echo "SIWE Canister: $(dfx canister id siwe_canister --network ic)"
echo "SIWS Canister: $(dfx canister id siws_canister --network ic)"
echo "SIWB Canister: $(dfx canister id siwb_canister --network ic)"
echo "SIS Canister: $(dfx canister id sis_canister --network ic)"
echo "Ordinals Canister: $(dfx canister id ordinals_canister --network ic)"
```

## Phase 2: Frontend Configuration

### Step 1: Update Canister Config

Edit `frontend/src/services/canisterConfig.ts` and update the canister IDs:

```typescript
export const CANISTER_IDS = {
  // ... existing canisters ...
  siwe_canister: 'YOUR_SIWE_CANISTER_ID',
  siws_canister: 'YOUR_SIWS_CANISTER_ID',
  siwb_canister: 'YOUR_SIWB_CANISTER_ID',
  sis_canister: 'YOUR_SIS_CANISTER_ID',
  ordinals_canister: 'YOUR_ORDINALS_CANISTER_ID',
} as const;
```

### Step 2: Build Frontend

```bash
cd frontend
npm run build
```

### Step 3: Deploy Frontend

```bash
cd ..
dfx deploy assets --network ic --no-wallet --yes
```

## Phase 3: Testing

### Test Each Wallet Type

1. **Internet Identity**
   - Click "Connect Wallet"
   - Select "Internet Identity"
   - Complete authentication

2. **MetaMask (Ethereum)**
   - Ensure MetaMask is installed
   - Click "Connect Wallet"
   - Select "MetaMask"
   - Approve connection and sign message

3. **Phantom (Solana)**
   - Ensure Phantom is installed
   - Click "Connect Wallet"
   - Select "Phantom"
   - Approve connection and sign message

4. **Unisat (Bitcoin)**
   - Ensure Unisat is installed
   - Click "Connect Wallet"
   - Select "Unisat"
   - Approve connection and sign message

5. **Sui Wallet**
   - Ensure Sui Wallet is installed
   - Click "Connect Wallet"
   - Select "Sui Wallet"
   - Approve connection and sign message

## Phase 4: Verification

### Check Canister Status

```bash
# Check all canisters are running
dfx canister status siwe_canister --network ic
dfx canister status siws_canister --network ic
dfx canister status siwb_canister --network ic
dfx canister status sis_canister --network ic
dfx canister status ordinals_canister --network ic
```

### Verify Frontend

1. Open the deployed frontend URL
2. Test wallet connection for each chain
3. Verify principal mapping works correctly
4. Test session persistence

## Troubleshooting

### Common Issues

1. **Canister deployment fails**
   - Check cycles balance
   - Verify dfx.json configuration
   - Check Rust compilation errors

2. **Frontend can't connect to canisters**
   - Verify canister IDs in config
   - Check CORS settings
   - Verify canisters are deployed

3. **Wallet connection fails**
   - Check wallet extension is installed
   - Verify wallet is unlocked
   - Check browser console for errors

4. **Signature verification fails**
   - Verify canister is running
   - Check message formatting
   - Verify signature format

## Security Considerations

1. **Signature Verification**: All signature verification is done on-chain for security
2. **Session Expiration**: Sessions expire after 7 days
3. **Principal Mapping**: Deterministic mapping from addresses to principals
4. **Rate Limiting**: Consider adding rate limiting for production

## Next Steps

1. Monitor canister cycles
2. Set up monitoring and alerts
3. Document API endpoints
4. Create user documentation
5. Set up analytics

## Support

For issues or questions:
- Check canister logs: `dfx canister call siwe_canister get_logs --network ic`
- Review frontend console errors
- Check network status on IC dashboard

