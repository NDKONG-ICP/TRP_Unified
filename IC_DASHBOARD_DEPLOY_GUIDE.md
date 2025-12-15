# IC Dashboard Deployment Guide - Step by Step

## ✅ You Have Cycles!

Your wallet has **3.520 TC (trillion cycles)** - more than enough to deploy all canisters!

The only issue is the dfx command-line bug. **IC Dashboard works perfectly** and is actually easier.

## 🚀 Step-by-Step IC Dashboard Deployment

### Step 1: Open IC Dashboard

1. Go to: **https://dashboard.internetcomputer.org/**
2. Connect your wallet (the one with 3.520 TC)
3. Navigate to **"Canisters"** section

### Step 2: Deploy Each Canister

For each of the 5 canisters, follow these steps:

#### Canister 1: siwe_canister

1. Click **"Create Canister"** or **"Deploy"**
2. **Upload WASM**: Select `deployment_package/siwe_canister.wasm` (579 KB)
3. **Upload Candid**: Select `deployment_package/siwe_canister.did`
4. Click **"Deploy"** or **"Install"**
5. **Copy the canister ID** (looks like: `xxxxx-xxxxx-xxxxx-xxxxx-xxx`)
6. Save it somewhere - you'll need it for the config

#### Canister 2: siws_canister
- WASM: `deployment_package/siws_canister.wasm` (575 KB)
- Candid: `deployment_package/siws_canister.did`

#### Canister 3: siwb_canister
- WASM: `deployment_package/siwb_canister.wasm` (574 KB)
- Candid: `deployment_package/siwb_canister.did`

#### Canister 4: sis_canister
- WASM: `deployment_package/sis_canister.wasm` (574 KB)
- Candid: `deployment_package/sis_canister.did`

#### Canister 5: ordinals_canister
- WASM: `deployment_package/ordinals_canister.wasm` (536 KB)
- Candid: `deployment_package/ordinals_canister.did`

### Step 3: Update Frontend Config

After you have all 5 canister IDs, update the config:

**File**: `frontend/src/services/canisterConfig.ts`

Replace the empty strings with your actual IDs:

```typescript
siwe_canister: import.meta.env.VITE_SIWE_CANISTER_ID || 'YOUR_SIWE_ID_HERE',
siws_canister: import.meta.env.VITE_SIWS_CANISTER_ID || 'YOUR_SIWS_ID_HERE',
siwb_canister: import.meta.env.VITE_SIWB_CANISTER_ID || 'YOUR_SIWB_ID_HERE',
sis_canister: import.meta.env.VITE_SIS_CANISTER_ID || 'YOUR_SIS_ID_HERE',
ordinals_canister: import.meta.env.VITE_ORDINALS_CANISTER_ID || 'YOUR_ORDINALS_ID_HERE',
```

### Step 4: Rebuild Frontend

```bash
cd frontend
npm run build
cd ..
```

### Step 5: Deploy Frontend

1. Go back to IC Dashboard
2. Find your **assets canister** (ID: `3kpgg-eaaaa-aaaao-a4xdq-cai`)
3. Upload the contents of `frontend/dist/` to the assets canister
4. Or wait for dfx fix and run: `dfx deploy assets --network ic`

## 📁 File Locations

All files are in:
```
/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem/deployment_package/
```

## ⏱️ Estimated Time

- Deploy 5 canisters: ~10-15 minutes
- Update config: ~2 minutes
- Rebuild frontend: ~2 minutes
- Deploy frontend: ~5 minutes

**Total: ~20-25 minutes**

## 💡 Why IC Dashboard?

- ✅ Works around dfx bug
- ✅ Visual interface (easier)
- ✅ Shows deployment progress
- ✅ Easy to verify canister IDs
- ✅ You already have cycles!

## 🎯 Quick Checklist

- [ ] Open IC Dashboard
- [ ] Deploy siwe_canister (copy ID)
- [ ] Deploy siws_canister (copy ID)
- [ ] Deploy siwb_canister (copy ID)
- [ ] Deploy sis_canister (copy ID)
- [ ] Deploy ordinals_canister (copy ID)
- [ ] Update `frontend/src/services/canisterConfig.ts` with IDs
- [ ] Rebuild frontend: `cd frontend && npm run build`
- [ ] Deploy frontend assets

**Everything is ready - just deploy via dashboard!**

