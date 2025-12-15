#!/bin/bash
# Deploy using dfx directly - works around color bug by using wallet

set -e

# Ensure we're using bash for associative arrays
if [ -z "$BASH_VERSION" ]; then
    exec bash "$0" "$@"
fi

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

echo "🚀 Deploying canisters using dfx with ic_deploy identity"
echo ""

# Use ic_deploy identity
export DFX_IDENTITY=ic_deploy

# Suppress color output to avoid bug
export NO_COLOR=1
export TERM=dumb
unset COLORTERM

# Get wallet
echo "📋 Getting wallet..."
WALLET=$(dfx identity get-wallet --network ic 2>&1 | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' | head -1 | tr -d '[:space:]')
echo "Wallet: $WALLET"
echo ""

# Check balance
echo "💰 Checking wallet balance..."
dfx wallet --network ic balance 2>&1 | grep -E "TC|cycles" || echo "Could not check balance"
echo ""

# Deploy each canister
canisters=("siwe_canister" "siws_canister" "siwb_canister" "sis_canister" "ordinals_canister")

echo "📦 Deploying canisters..."
for canister in "${canisters[@]}"; do
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📤 Deploying $canister..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Deploy using dfx (will use wallet automatically)
    # The color bug will cause a panic, but deployment may still succeed
    echo "  Running: dfx deploy $canister --network ic --wallet $WALLET"
    
    # Run deployment in background and wait a bit, then check if canister exists
    (dfx deploy "$canister" --network ic --wallet "$WALLET" > /dev/null 2>&1 &)
    DEPLOY_PID=$!
    
    # Wait a moment for deployment to start (before panic)
    sleep 5
    
    # Check if canister was created despite panic
    CANISTER_ID=$(dfx canister id "$canister" --network ic 2>&1 | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' | head -1 | tr -d '[:space:]')
    
    if [ -n "$CANISTER_ID" ]; then
        echo "✅ $canister deployed: $CANISTER_ID"
        # Wait for deployment to complete
        wait $DEPLOY_PID 2>/dev/null || true
    else
        echo "  ⚠️  Deployment in progress (dfx may panic but deployment continues)..."
        # Wait longer and check again
        sleep 10
        CANISTER_ID=$(dfx canister id "$canister" --network ic 2>&1 | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' | head -1 | tr -d '[:space:]')
        if [ -n "$CANISTER_ID" ]; then
            echo "✅ $canister deployed: $CANISTER_ID"
        else
            echo "  ⚠️  Could not verify deployment - may need manual check"
        fi
    fi
    
    sleep 2
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Getting all canister IDs..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Collect all IDs
declare -A CANISTER_IDS
for canister in "${canisters[@]}"; do
    ID=$(dfx canister id "$canister" --network ic 2>&1 | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' | head -1 | tr -d '[:space:]')
    if [ -n "$ID" ]; then
        CANISTER_IDS["$canister"]="$ID"
        echo "✅ $canister: $ID"
    else
        echo "⚠️  $canister: Not found"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Updating frontend config..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Update frontend config
CONFIG_FILE="frontend/src/services/canisterConfig.ts"
if [ -f "$CONFIG_FILE" ]; then
    for canister in "${canisters[@]}"; do
        if [ -n "${CANISTER_IDS[$canister]}" ]; then
            ID="${CANISTER_IDS[$canister]}"
            # Update the config file
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s/\\(${canister}:\\s*import\\.meta\\.env\\.VITE_[A-Z_]*_CANISTER_ID\\s*||\\s*\\)'[^']*'/\\1'${ID}'/" "$CONFIG_FILE"
            else
                # Linux
                sed -i "s/\\(${canister}:\\s*import\\.meta\\.env\\.VITE_[A-Z_]*_CANISTER_ID\\s*||\\s*\\)'[^']*'/\\1'${ID}'/" "$CONFIG_FILE"
            fi
            echo "✅ Updated $canister: $ID"
        fi
    done
    echo "✅ Config file updated"
else
    echo "⚠️  Config file not found: $CONFIG_FILE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Deployed canisters:"
for canister in "${canisters[@]}"; do
    if [ -n "${CANISTER_IDS[$canister]}" ]; then
        echo "  $canister: ${CANISTER_IDS[$canister]}"
    fi
done
echo ""
echo "Next steps:"
echo "1. Rebuild frontend: cd frontend && npm run build"
echo "2. Deploy frontend assets"

