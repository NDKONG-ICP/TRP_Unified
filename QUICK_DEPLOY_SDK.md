# Quick Deploy with IC SDK

## 🚀 One Command Deployment

```bash
node deploy_with_ic_sdk.js
```

That's it! The script will:
1. ✅ Find your identity automatically
2. ✅ Deploy all 5 canisters
3. ✅ Update frontend config with IDs

## 📋 Prerequisites

- ✅ You have cycles: 3.520 TC
- ✅ All WASM files compiled
- ✅ dfx identity set up (for automatic identity loading)

## 🔐 Identity Setup

The script will automatically look for your dfx identity. If it can't find it:

1. **Export your identity**:
   ```bash
   dfx identity export ic_deploy > identity.pem
   ```

2. **Run the script** and choose option 3 to paste the PEM content

## ⚡ Quick Start

```bash
# Make sure you're in the project root
cd /Users/williambeck/The\ Forge\ NFT\ Minter/raven-unified-ecosystem

# Run deployment
node deploy_with_ic_sdk.js

# Follow the prompts:
# 1. Choose identity option (usually option 1 for automatic)
# 2. Wait for deployment (takes a few minutes)
# 3. Script updates config automatically
```

## ✅ After Deployment

The script will:
- ✅ Show all deployed canister IDs
- ✅ Update `frontend/src/services/canisterConfig.ts` automatically
- ✅ Display next steps

Then rebuild frontend:
```bash
cd frontend
npm run build
```

## 🎯 What Gets Deployed

- siwe_canister
- siws_canister  
- siwb_canister
- sis_canister
- ordinals_canister

All 5 canisters deployed in one run!

## 💡 Tips

- **First time?** The script will guide you through identity setup
- **Already have identity?** Option 1 will find it automatically
- **Need help?** See `DEPLOY_WITH_SDK_GUIDE.md` for detailed instructions

