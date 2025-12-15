# Deploy with IC SDK - Complete Guide

## 🚀 Quick Start

```bash
# Install dependencies (if not already installed)
npm install @dfinity/agent @dfinity/identity @dfinity/principal @dfinity/candid

# Run deployment script
node deploy_with_ic_sdk.js
```

## 📋 Prerequisites

1. **Identity Setup**: You need an IC identity with cycles
2. **Cycles**: Your wallet needs cycles (you have 3.520 TC ✅)
3. **WASM Files**: All compiled (ready ✅)

## 🔐 Identity Options

The script will ask you to choose how to load your identity:

### Option 1: Automatic (Recommended)
- Automatically searches for dfx identity files
- Looks in common locations:
  - `~/.config/dfx/identity/ic_deploy/identity.pem`
  - `~/.config/dfx/identity/default/identity.pem`
  - `.dfx/ic/identity/ic_deploy/identity.pem`

### Option 2: Manual Private Key
1. Export your identity:
   ```bash
   dfx identity export ic_deploy
   ```
2. Copy the private key (hex format, 64 characters)
3. Paste when prompted

### Option 3: PEM Content
1. Export your identity:
   ```bash
   dfx identity export ic_deploy
   ```
2. Copy the entire PEM content
3. Paste when prompted

## 📦 What Gets Deployed

The script will deploy all 5 canisters:
- ✅ siwe_canister
- ✅ siws_canister
- ✅ siwb_canister
- ✅ sis_canister
- ✅ ordinals_canister

## 🔄 Process

1. **Load Identity**: Choose how to load your IC identity
2. **Connect to IC**: Creates HttpAgent connected to mainnet
3. **Create Canisters**: Uses management canister to create each canister
4. **Install WASM**: Installs compiled WASM modules
5. **Update Config**: Automatically updates `frontend/src/services/canisterConfig.ts` with canister IDs

## ⚠️ Troubleshooting

### "Could not load identity"
- Make sure you have a dfx identity set up
- Try option 2 or 3 to manually enter your identity

### "Insufficient cycles"
- Check your wallet balance: `dfx wallet balance --network ic`
- You have 3.520 TC, which should be plenty
- If needed, add more cycles via IC Dashboard

### "WASM file not found"
- Make sure canisters are compiled:
  ```bash
  cargo build --target wasm32-unknown-unknown --release
  ```

### "Permission denied"
- Make sure your identity has permission to create canisters
- Check that you're using the correct identity

## ✅ After Deployment

1. **Canister IDs**: The script will display all deployed canister IDs
2. **Config Updated**: `frontend/src/services/canisterConfig.ts` is automatically updated
3. **Rebuild Frontend**:
   ```bash
   cd frontend
   npm run build
   ```
4. **Deploy Frontend Assets**: Deploy the built frontend to your assets canister

## 🎯 Example Output

```
🚀 IC SDK Programmatic Deployment

🔐 Identity Setup
✅ Loaded identity from: ~/.config/dfx/identity/ic_deploy/identity.pem
   Principal: xxxxx-xxxxx-xxxxx-xxxxx-xxx

🌐 Connecting to IC...
✅ Connected to IC

📦 Deploying siwe_canister...
  Creating canister...
  ✅ Canister created: abcde-fghij-klmno-pqrst-uvw
  Reading WASM file...
  Installing WASM module...
  ✅ WASM installed successfully

[... repeats for all 5 canisters ...]

📝 Updating frontend config...
  ✅ Updated siwe_canister: abcde-fghij-klmno-pqrst-uvw
  ✅ Updated siws_canister: ...
  ✅ Config file updated

============================================================
✅ DEPLOYMENT COMPLETE
============================================================

Deployed canisters:
  siwe_canister: abcde-fghij-klmno-pqrst-uvw
  siws_canister: ...
  siwb_canister: ...
  sis_canister: ...
  ordinals_canister: ...

Next steps:
1. Rebuild frontend: cd frontend && npm run build
2. Deploy frontend assets
```

## 💡 Tips

- **Test First**: The script will check if WASM files exist before deploying
- **Identity Safety**: Never share your private key or PEM content
- **Backup**: Save the canister IDs after deployment
- **Verification**: You can verify deployment by checking canister status

## 🔗 Related Files

- `deploy_with_ic_sdk.js` - Main deployment script
- `deployment_package/` - All WASM and Candid files
- `frontend/src/services/canisterConfig.ts` - Config file (auto-updated)

