# 🚀 START HERE - Deploy with IC SDK

## ✅ Everything is Ready!

- ✅ All 5 canisters compiled
- ✅ WASM files ready (536-579 KB each)
- ✅ You have 3.520 TC cycles
- ✅ Deployment script created

## 🎯 Deploy Now

**One command:**

```bash
node deploy_with_ic_sdk.js
```

The script will:
1. ✅ Find your identity automatically (or guide you)
2. ✅ Deploy all 5 canisters to IC mainnet
3. ✅ Update frontend config with canister IDs
4. ✅ Show you the results

## 📋 What You Need

1. **dfx identity** (usually already set up)
   - The script will find it automatically
   - Or you can export it: `dfx identity export ic_deploy`

2. **Cycles** (you have 3.520 TC ✅)

3. **WASM files** (all compiled ✅)

## 🔐 Identity Setup

When you run the script, it will ask:

**Option 1 (Recommended)**: Automatic
- Searches for your dfx identity automatically
- Usually finds it in `~/.config/dfx/identity/ic_deploy/identity.pem`

**Option 2**: Manual Private Key
- Export: `dfx identity export ic_deploy`
- Copy the private key (hex, 64 chars)
- Paste when prompted

**Option 3**: PEM Content
- Export: `dfx identity export ic_deploy`
- Copy the entire PEM content
- Paste when prompted

## ⚡ Quick Start

```bash
# Navigate to project root
cd /Users/williambeck/The\ Forge\ NFT\ Minter/raven-unified-ecosystem

# Deploy!
node deploy_with_ic_sdk.js

# Follow prompts (usually just press Enter for option 1)
# Wait 5-10 minutes for all deployments
# Done! Config is updated automatically
```

## 📦 What Gets Deployed

1. siwe_canister (Sign-In with Ethereum)
2. siws_canister (Sign-In with Solana)
3. siwb_canister (Sign-In with Bitcoin)
4. sis_canister (Sign-In with Sui)
5. ordinals_canister (Bitcoin Ordinals)

## ✅ After Deployment

The script automatically:
- ✅ Updates `frontend/src/services/canisterConfig.ts` with all IDs
- ✅ Shows you all deployed canister IDs
- ✅ Displays next steps

Then rebuild frontend:
```bash
cd frontend
npm run build
```

## 🆘 Troubleshooting

**"Could not load identity"**
- Make sure you have a dfx identity: `dfx identity whoami`
- Try option 2 or 3 to manually enter identity

**"Insufficient cycles"**
- You have 3.520 TC, which is plenty
- If error, check: `dfx wallet balance --network ic`

**"WASM file not found"**
- All files are compiled ✅
- Check: `ls target/wasm32-unknown-unknown/release/*.wasm`

**Packages not found**
- Frontend already has them ✅
- Script will use frontend's packages automatically

## 📚 More Info

- **Detailed guide**: `DEPLOY_WITH_SDK_GUIDE.md`
- **Quick reference**: `QUICK_DEPLOY_SDK.md`
- **Script location**: `deploy_with_ic_sdk.js`

## 🎉 Ready to Deploy!

Everything is set up. Just run:

```bash
node deploy_with_ic_sdk.js
```

And follow the prompts!

