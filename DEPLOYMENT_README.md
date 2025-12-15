# Mainnet Deployment Guide

## Overview

This guide covers deploying the Raven Unified Ecosystem to IC mainnet, including all new canisters and integrations.

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

3. **Sufficient cycles** for all canisters

## Deployment Steps

### Option 1: Automated Deployment (Recommended)

Run the automated deployment script:

```bash
cd /Users/williambeck/The\ Forge\ NFT\ Minter/raven-unified-ecosystem
./scripts/deploy_mainnet.sh
```

This script will:
1. Check authentication
2. Create any missing canisters
3. Build all backend canisters
4. Deploy all canisters sequentially
5. Register canisters with queen_bee
6. Update AXIOM NFT canisters
7. Display deployment summary

### Option 2: Manual Deployment

#### Step 1: Create New Canisters

```bash
dfx canister create deepseek_model --network ic
dfx canister create vector_db --network ic
dfx canister create queen_bee --network ic
dfx canister create staking --network ic
```

#### Step 2: Build Backend

```bash
cd backend
cargo build --target wasm32-unknown-unknown --release
cd ..
```

#### Step 3: Deploy Canisters

```bash
# New canisters
TERM=xterm-256color dfx deploy deepseek_model --network ic
TERM=xterm-256color dfx deploy vector_db --network ic
TERM=xterm-256color dfx deploy queen_bee --network ic
TERM=xterm-256color dfx deploy staking --network ic

# Existing canisters
TERM=xterm-256color dfx deploy raven_ai --network ic
TERM=xterm-256color dfx deploy core --network ic
TERM=xterm-256color dfx deploy nft --network ic
TERM=xterm-256color dfx deploy kip --network ic
TERM=xterm-256color dfx deploy treasury --network ic
TERM=xterm-256color dfx deploy escrow --network ic
TERM=xterm-256color dfx deploy logistics --network ic
TERM=xterm-256color dfx deploy ai_engine --network ic

# Frontend
TERM=xterm-256color dfx deploy assets --network ic
```

#### Step 4: Register Canisters with Queen Bee

```bash
QUEEN_BEE_ID=$(dfx canister id queen_bee --network ic)
DEEPSEEK_MODEL_ID=$(dfx canister id deepseek_model --network ic)
VECTOR_DB_ID=$(dfx canister id vector_db --network ic)

dfx canister call queen_bee register_model_canister "(\"$DEEPSEEK_MODEL_ID\")" --network ic
dfx canister call queen_bee register_vector_db_canister "(\"$VECTOR_DB_ID\")" --network ic
```

#### Step 5: Update AXIOM NFT Canisters

```bash
QUEEN_BEE_ID=$(dfx canister id queen_bee --network ic)

for i in {1..5}; do
  dfx canister call axiom_$i set_queen_bee_canister "(\"$QUEEN_BEE_ID\")" --network ic
  dfx canister call axiom_$i set_use_queen_bee "(true)" --network ic
done
```

## New Canister IDs

After deployment, update these in your configuration:

- `deepseek_model`: `dfx canister id deepseek_model --network ic`
- `vector_db`: `dfx canister id vector_db --network ic`
- `queen_bee`: `dfx canister id queen_bee --network ic`
- `staking`: `dfx canister id staking --network ic`

## Frontend Configuration

Update frontend environment variables:

```bash
# .env.production
VITE_STAKING_CANISTER_ID=<staking-canister-id>
VITE_ICSPICY_CANISTER_ID=<icspicy-canister-id>
VITE_QUEEN_BEE_CANISTER_ID=<queen-bee-canister-id>
```

## Verification

After deployment, verify all canisters:

```bash
# Check canister status
dfx canister status <canister-name> --network ic

# Test a query call
dfx canister call <canister-name> <method> --network ic
```

## Troubleshooting

### ColorOutOfRange Error

If you encounter `ColorOutOfRange` errors, use:
```bash
TERM=xterm-256color dfx deploy <canister> --network ic
```

### Canister Already Exists

If a canister already exists, skip creation and proceed with deployment.

### Registration Errors

If registration fails, canisters may already be registered. Check with:
```bash
dfx canister call queen_bee get_status --network ic
```

## Post-Deployment Checklist

- [ ] All canisters deployed successfully
- [ ] Canister IDs updated in configuration
- [ ] Frontend environment variables updated
- [ ] Queen bee canisters registered
- [ ] AXIOM NFT canisters updated
- [ ] Test staking functionality
- [ ] Test IC SPICY minting
- [ ] Test game score persistence
- [ ] Test crossword puzzle generation
- [ ] Verify all integrations working

## Support

For issues or questions, refer to:
- IC Documentation: https://internetcomputer.org/docs
- DFX Documentation: https://internetcomputer.org/docs/current/developer-docs/setup/install/



