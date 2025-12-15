# Quick Deploy Instructions

## Current Status: ✅ ALL READY

Everything is compiled, built, and ready. The only blocker is dfx color output issue on macOS.

## Fastest Deployment Method

### Use IC Dashboard (Easiest)

1. **Go to**: https://dashboard.internetcomputer.org/
2. **For each canister** (siwe, siws, siwb, sis, ordinals):
   - Click "Create Canister"
   - Upload WASM: `target/wasm32-unknown-unknown/release/[canister].wasm`
   - Upload Candid: `backend/[canister]/[canister].did`
   - Click Deploy
   - Copy the canister ID

3. **Update frontend config**:
   ```bash
   # Edit frontend/src/services/canisterConfig.ts
   # Replace empty strings with actual canister IDs
   ```

4. **Rebuild and deploy frontend**:
   ```bash
   cd frontend
   npm run build
   cd ..
   # Then deploy via dashboard or when dfx is fixed
   ```

## Canister IDs Template

After deployment, update this in `frontend/src/services/canisterConfig.ts`:

```typescript
siwe_canister: import.meta.env.VITE_SIWE_CANISTER_ID || 'PASTE_ID_HERE',
siws_canister: import.meta.env.VITE_SIWS_CANISTER_ID || 'PASTE_ID_HERE',
siwb_canister: import.meta.env.VITE_SIWB_CANISTER_ID || 'PASTE_ID_HERE',
sis_canister: import.meta.env.VITE_SIS_CANISTER_ID || 'PASTE_ID_HERE',
ordinals_canister: import.meta.env.VITE_ORDINALS_CANISTER_ID || 'PASTE_ID_HERE',
```

## All Files Ready ✅

- ✅ WASM files compiled
- ✅ Candid files ready
- ✅ Frontend built
- ✅ Configuration files updated
- ✅ All code implemented

**Just deploy and update IDs!**

