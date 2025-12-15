# IC Dashboard Deployment Instructions

## Files Ready in: deployment_package/

## Deployment Steps:

1. Go to https://dashboard.internetcomputer.org/
2. Navigate to "Canisters" section
3. For each canister below, click "Create Canister" or "Deploy":


### siwe_canister
- **WASM File**: `deployment_package/siwe_canister.wasm` (578.6 KB)
- **Candid File**: `deployment_package/siwe_canister.did`
- Upload both files
- Click Deploy
- **Copy the canister ID** and update `frontend/src/services/canisterConfig.ts`


### siws_canister
- **WASM File**: `deployment_package/siws_canister.wasm` (574.7 KB)
- **Candid File**: `deployment_package/siws_canister.did`
- Upload both files
- Click Deploy
- **Copy the canister ID** and update `frontend/src/services/canisterConfig.ts`


### siwb_canister
- **WASM File**: `deployment_package/siwb_canister.wasm` (574.2 KB)
- **Candid File**: `deployment_package/siwb_canister.did`
- Upload both files
- Click Deploy
- **Copy the canister ID** and update `frontend/src/services/canisterConfig.ts`


### sis_canister
- **WASM File**: `deployment_package/sis_canister.wasm` (574.1 KB)
- **Candid File**: `deployment_package/sis_canister.did`
- Upload both files
- Click Deploy
- **Copy the canister ID** and update `frontend/src/services/canisterConfig.ts`


### ordinals_canister
- **WASM File**: `deployment_package/ordinals_canister.wasm` (536.3 KB)
- **Candid File**: `deployment_package/ordinals_canister.did`
- Upload both files
- Click Deploy
- **Copy the canister ID** and update `frontend/src/services/canisterConfig.ts`


## After Deployment:

1. Update `frontend/src/services/canisterConfig.ts` with canister IDs:
   ```typescript
   siwe_canister: import.meta.env.VITE_SIWE_CANISTER_ID || 'YOUR_ID_HERE',
   siws_canister: import.meta.env.VITE_SIWS_CANISTER_ID || 'YOUR_ID_HERE',
   siwb_canister: import.meta.env.VITE_SIWB_CANISTER_ID || 'YOUR_ID_HERE',
   sis_canister: import.meta.env.VITE_SIS_CANISTER_ID || 'YOUR_ID_HERE',
   ordinals_canister: import.meta.env.VITE_ORDINALS_CANISTER_ID || 'YOUR_ID_HERE',
   ```

2. Rebuild frontend:
   ```bash
   cd frontend
   npm run build
   ```

3. Deploy frontend assets via IC Dashboard or when dfx is fixed.
