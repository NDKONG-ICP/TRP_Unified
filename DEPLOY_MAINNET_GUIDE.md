# Mainnet Deployment Guide

## Complete End-to-End Deployment

This guide covers deploying the entire Raven Unified Ecosystem to IC mainnet using TypeScript + Vite build system.

## Prerequisites

1. **DFX installed and configured**
   ```bash
   dfx --version
   ```

2. **Authenticated with IC mainnet**
   ```bash
   dfx identity use <your-identity>
   dfx identity whoami --network ic
   ```

3. **Sufficient cycles** (recommended: 10+ ICP)
   - Canister creation: ~800B cycles
   - Code installation: ~1.6T cycles
   - Frontend assets: ~500B cycles
   - Operations buffer: ~500B cycles
   - **Total: ~3.5T cycles (~4-5 ICP minimum, 10 ICP recommended)**

4. **Rust toolchain** (for building canisters)
   ```bash
   cargo --version
   ```

5. **Node.js and npm** (for frontend build)
   ```bash
   node --version
   npm --version
   ```

## Quick Deploy

Run the complete deployment script:

```bash
cd /Users/williambeck/The\ Forge\ NFT\ Minter/raven-unified-ecosystem
./scripts/deploy_mainnet_complete.sh
```

## What the Script Does

### Step 1: Generate TypeScript Declarations
- Runs `dfx generate` to create TypeScript interfaces from CANDID files
- Syncs declarations to frontend directory

### Step 2: Build Frontend with Vite
- Installs npm dependencies (if needed)
- Type-checks TypeScript code
- Builds frontend with Vite for production
- Output: `frontend/dist/`

### Step 3: Build Rust Canisters
- Compiles all Rust canisters to WebAssembly
- Target: `wasm32-unknown-unknown`
- Build mode: `--release`

### Step 4: Create Canisters
- Creates all canisters on mainnet (if they don't exist)
- Handles both new and existing canisters

### Step 5: Deploy Backend Canisters
Deploys in dependency order:
1. Core infrastructure (core, treasury, escrow)
2. NFT & tokens (nft, kip)
3. Logistics
4. AI infrastructure (ai_engine, deepseek_model, vector_db, queen_bee, raven_ai)
5. Staking

### Step 6: Deploy AXIOM Genesis NFTs
- Deploys axiom_nft base canister
- Deploys 5 AXIOM Genesis NFTs with initialization arguments
- Each NFT gets unique personality and specialization

### Step 7: Deploy Frontend Assets
- Deploys built frontend to assets canister
- Makes frontend accessible at `https://<canister-id>.ic0.app`

### Step 8: Register Canisters
- Registers AI infrastructure with queen_bee
- Updates AXIOM NFTs with queen_bee configuration

### Step 9: Deployment Summary
- Displays all deployed canister IDs
- Shows frontend URL
- Provides next steps

## Manual Deployment (Alternative)

If you prefer to deploy manually:

### 1. Generate Declarations
```bash
dfx generate --network ic
```

### 2. Build Frontend
```bash
cd frontend
npm install
npm run build
cd ..
```

### 3. Build Rust Canisters
```bash
cd backend
cargo build --target wasm32-unknown-unknown --release
cd ..
```

### 4. Create Canisters
```bash
dfx canister create core --network ic
dfx canister create nft --network ic
# ... (repeat for all canisters)
```

### 5. Deploy Canisters
```bash
dfx deploy core --network ic --no-wallet --yes
dfx deploy nft --network ic --no-wallet --yes
# ... (repeat for all canisters)
```

### 6. Deploy AXIOM NFTs
```bash
# Deploy with init arguments (see dfx.json for exact args)
dfx deploy axiom_1 --network ic --argument "(record { ... })" --no-wallet --yes
# ... (repeat for axiom_2 through axiom_5)
```

### 7. Deploy Frontend
```bash
dfx deploy assets --network ic --no-wallet --yes
```

## Deployment Order

**Critical**: Deploy in this order to handle dependencies:

1. **Core Infrastructure**
   - core
   - treasury
   - escrow

2. **NFT & Tokens**
   - nft
   - kip

3. **Logistics**
   - logistics

4. **AI Infrastructure**
   - ai_engine
   - deepseek_model
   - vector_db
   - queen_bee
   - raven_ai

5. **Staking**
   - staking

6. **AXIOM NFTs**
   - axiom_nft (base)
   - axiom_1 through axiom_5 (with init args)

7. **Frontend**
   - assets

## Verification

After deployment, verify canisters:

```bash
# Check canister status
dfx canister status <canister-name> --network ic

# Test canister calls
dfx canister call <canister-name> health --network ic

# View canister IDs
dfx canister id <canister-name> --network ic
```

## Frontend Access

After deployment, access your frontend at:

```
https://<assets-canister-id>.ic0.app
```

Get the canister ID:
```bash
dfx canister id assets --network ic
```

## Troubleshooting

### "Not authenticated"
```bash
dfx identity use <your-identity>
dfx identity whoami --network ic
```

### "Insufficient cycles"
- Top up canisters with cycles
- Check cycle balance: `dfx wallet balance --network ic`

### "Canister already exists"
- This is normal for updates
- The script handles existing canisters

### "Build failed"
- Check Rust toolchain: `rustc --version`
- Check Node.js: `node --version`
- Ensure dependencies are installed

### "Deployment timeout"
- Mainnet deployments can take time
- Retry the deployment
- Check canister status

## Post-Deployment

1. **Update Frontend Configuration**
   - Update `frontend/src/services/canisterConfig.ts` with new canister IDs if needed
   - Rebuild and redeploy frontend if IDs changed

2. **Test Functionality**
   - Test NFT minting
   - Test AXIOM NFT interactions
   - Test AI features
   - Test payment flows

3. **Monitor Canisters**
   - Check canister status regularly
   - Monitor cycle usage
   - Review logs for errors

## Cost Estimation

- **Canister Creation**: ~100B cycles per canister
- **Code Installation**: ~200B cycles per canister
- **Frontend Assets**: ~500B cycles
- **Operations**: ~500B cycles buffer
- **Total**: ~3.5T cycles (~4-5 ICP minimum)

**Recommendation**: Have 10+ ICP available for safety.

## Support

For issues or questions:
1. Check canister logs: `dfx canister logs <canister-name> --network ic`
2. Verify canister status: `dfx canister status <canister-name> --network ic`
3. Review deployment script output for errors

---

**Last Updated**: After TypeScript + Vite integration
**Script**: `scripts/deploy_mainnet_complete.sh`

