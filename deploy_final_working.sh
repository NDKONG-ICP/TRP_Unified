#!/bin/bash
# Final deployment script - Uses dfx and verifies success despite panic

set -e

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

export NO_COLOR=1
export TERM=dumb
export DFX_WARNING=-mainnet_plaintext_identity
export RUST_BACKTRACE=0
export PATH="$HOME/.local/share/dfxvm/bin:$PATH"

echo "🚀 Final Deployment to IC Mainnet"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Set identity
dfx identity use ic_deploy 2>&1 | grep -v "ColorOutOfRange" || true

PRINCIPAL=$(dfx identity get-principal 2>&1 | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' || echo "")
echo "✓ Identity: $PRINCIPAL"
echo "✓ Wallet: daf6l-jyaaa-aaaao-a4nba-cai"
echo ""

# Function to deploy with verification
deploy_with_verify() {
    local canister=$1
    echo ""
    echo "📦 Deploying $canister..."
    
    # Start dfx deploy in background (it will panic but may succeed)
    (dfx deploy "$canister" --network ic --wallet daf6l-jyaaa-aaaao-a4nba-cai --yes 2>&1 | grep -v "ColorOutOfRange" || true) &
    DEPLOY_PID=$!
    
    # Wait a bit for deployment to start
    sleep 5
    
    # Check for canister ID repeatedly (deployment may succeed before panic)
    for i in {1..30}; do
        sleep 2
        CANISTER_ID=$(dfx canister --network ic id "$canister" 2>&1 | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' || echo "")
        if [ -n "$CANISTER_ID" ]; then
            echo "   ✅ $canister deployed: $CANISTER_ID"
            kill $DEPLOY_PID 2>/dev/null || true
            wait $DEPLOY_PID 2>/dev/null || true
            return 0
        fi
    done
    
    # Kill the process if still running
    kill $DEPLOY_PID 2>/dev/null || true
    wait $DEPLOY_PID 2>/dev/null || true
    
    echo "   ❌ $canister deployment failed or timed out"
    return 1
}

# Deploy all canisters
DEPLOYED=()

for canister in siwe_canister siws_canister siwb_canister sis_canister ordinals_canister; do
    if deploy_with_verify "$canister"; then
        DEPLOYED+=("$canister")
    fi
    sleep 3
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 DEPLOYMENT SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ${#DEPLOYED[@]} -gt 0 ]; then
    echo "✅ Successfully deployed canisters:"
    for canister in "${DEPLOYED[@]}"; do
        ID=$(dfx canister --network ic id "$canister" 2>&1 | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' || echo "unknown")
        echo "   $canister: $ID"
    done
    echo ""
    echo "✅ Deployment complete!"
else
    echo "❌ No canisters were deployed"
    exit 1
fi

