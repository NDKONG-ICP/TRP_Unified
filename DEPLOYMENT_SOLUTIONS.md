# Deployment Solutions - When IC Doesn't Allow Deployment

## Common Issues & Solutions

### Issue 1: Insufficient Cycles

**Problem**: Canisters need cycles to be deployed and run.

**Solution**:
```bash
# Check wallet balance
dfx wallet balance --network ic

# If low, add cycles:
# Option A: Transfer ICP to wallet and convert to cycles
# Option B: Use IC Dashboard to add cycles
# Option C: Get cycles from a faucet (for testnet)
```

### Issue 2: Wallet Permissions

**Problem**: Wallet doesn't have permission to create canisters.

**Solution**:
```bash
# Check which identity you're using
dfx identity whoami --network ic

# Switch to an identity with permissions
dfx identity use <identity-name>

# Or use a wallet that has deployment permissions
```

### Issue 3: No Wallet Configured

**Problem**: Using `--no-wallet` but no wallet is set up.

**Solution**:
```bash
# Set up a wallet
dfx wallet create --network ic

# Or use an existing wallet
dfx wallet --network ic
```

## Alternative Deployment Methods

### Method 1: Use IC Dashboard with Cycles

1. **Get Cycles**:
   - Transfer ICP to your wallet
   - Convert ICP to cycles via IC Dashboard
   - Or use a cycles faucet

2. **Deploy via Dashboard**:
   - Go to https://dashboard.internetcomputer.org/
   - Ensure your wallet has cycles
   - Deploy canisters using the files in `deployment_package/`

### Method 2: Use a Different Wallet/Identity

```bash
# List identities
dfx identity list

# Switch identity
dfx identity use <identity-with-cycles>

# Try deployment again
dfx deploy siwe_canister --network ic
```

### Method 3: Deploy to Local Network First

Test locally before mainnet:

```bash
# Start local replica
dfx start --background

# Deploy locally
dfx deploy siwe_canister

# Test everything works
# Then deploy to mainnet when ready
```

### Method 4: Use Cycles Faucet (Testnet)

If testing, use testnet with free cycles:

```bash
# Switch to testnet
dfx deploy siwe_canister --network ic_testnet
```

## Quick Fix: Add Cycles

If you have ICP but need cycles:

1. **Via IC Dashboard**:
   - Go to https://dashboard.internetcomputer.org/
   - Navigate to your wallet
   - Convert ICP to cycles

2. **Via Command Line**:
   ```bash
   # Check current balance
   dfx wallet balance --network ic
   
   # The wallet should auto-convert ICP to cycles when needed
   # If not, use IC Dashboard to convert
   ```

## Recommended Approach

1. **Check your situation**:
   ```bash
   dfx wallet balance --network ic
   dfx identity whoami --network ic
   ```

2. **If you have cycles**: Use IC Dashboard to deploy (easiest)

3. **If you need cycles**: 
   - Add ICP to wallet via IC Dashboard
   - Convert to cycles
   - Then deploy

4. **If permissions issue**: Switch to an identity with proper permissions

## Files Ready

All deployment files are in `deployment_package/`:
- 5 WASM files (536-579 KB each)
- 5 Candid files
- Ready for upload once you have cycles/permissions

## Next Steps

1. **Check cycles**: `dfx wallet balance --network ic`
2. **If low**: Add cycles via IC Dashboard
3. **Deploy**: Use IC Dashboard or dfx once cycles are available
4. **Update config**: Add canister IDs to `frontend/src/services/canisterConfig.ts`
5. **Deploy frontend**: Rebuild and deploy assets

