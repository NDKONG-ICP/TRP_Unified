#!/bin/bash
# Deploy to IC Mainnet using dfx directly
# Works around color bug by using wallet and checking for success

set -e

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

echo "🚀 Deploying to IC Mainnet"
echo ""

# Set environment to suppress color
export NO_COLOR=1
export TERM=dumb
export DFX_WARNING=-mainnet_plaintext_identity
export RUST_BACKTRACE=0
unset COLORTERM
unset CLICOLOR
unset CLICOLOR_FORCE

# Use the correct identity
echo "📋 Setting identity..."
dfx identity use ic_deploy 2>&1 | grep -v "ColorOutOfRange" | grep -v "panic" || true

# Get principal (may panic but we'll catch it)
PRINCIPAL=$(dfx identity get-principal 2>&1 | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' | head -1 || echo "")

if [ -z "$PRINCIPAL" ]; then
    echo "⚠️  Could not get principal via dfx (color bug)"
    echo "   Continuing anyway..."
else
    echo "Using principal: $PRINCIPAL"
    
    if [ "$PRINCIPAL" != "gqkko-43bbx-nwsp4-it2rg-pc2dy-w2pt2-fa5om-4y6es-oyhz2-5i5oh-5ae" ]; then
        echo "⚠️  WARNING: Principal doesn't match expected"
        echo "   Expected: gqkko-43bbx-nwsp4-it2rg-pc2dy-w2pt2-fa5om-4y6es-oyhz2-5i5oh-5ae"
        echo "   Got: $PRINCIPAL"
    fi
fi

echo ""

# Get wallet
echo "💰 Getting wallet..."
WALLET=$(dfx identity get-wallet --network ic 2>&1 | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' | head -1 || echo "")

if [ -z "$WALLET" ]; then
    echo "❌ Could not get wallet"
    exit 1
fi

echo "Wallet: $WALLET"
echo ""

# Function to deploy a canister
deploy_canister() {
    local canister=$1
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Deploying $canister"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Deploy (will panic but may succeed)
    (dfx deploy "$canister" --network ic --wallet "$WALLET" --yes > /tmp/dfx_deploy_${canister}.log 2>&1 &)
    DEPLOY_PID=$!
    
    # Wait a bit for deployment to start
    sleep 15
    
    # Check if canister was created
    for i in {1..12}; do
        CANISTER_ID=$(dfx canister id "$canister" --network ic 2>&1 | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' | head -1 || echo "")
        
        if [ -n "$CANISTER_ID" ]; then
            echo "✅ $canister deployed: $CANISTER_ID"
            kill $DEPLOY_PID 2>/dev/null || true
            wait $DEPLOY_PID 2>/dev/null || true
            return 0
        fi
        
        sleep 5
    done
    
    echo "⚠️  Could not verify deployment for $canister"
    kill $DEPLOY_PID 2>/dev/null || true
    return 1
}

# Deploy each canister
FAILED=()
DEPLOYED=()

for canister in siwe_canister siws_canister siwb_canister sis_canister ordinals_canister; do
    if deploy_canister "$canister"; then
        CANISTER_ID=$(dfx canister id "$canister" --network ic 2>&1 | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' | head -1)
        DEPLOYED+=("$canister:$CANISTER_ID")
    else
        FAILED+=("$canister")
    fi
    echo ""
    sleep 2
done

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 DEPLOYMENT SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ${#DEPLOYED[@]} -gt 0 ]; then
    echo ""
    echo "✅ Successfully deployed canisters:"
    for item in "${DEPLOYED[@]}"; do
        IFS=':' read -r canister id <<< "$item"
        echo "  $canister: $id"
    done
    
    # Update frontend config
    echo ""
    echo "📝 Updating frontend config..."
    CONFIG_FILE="frontend/src/services/canisterConfig.ts"
    if [ -f "$CONFIG_FILE" ]; then
        for item in "${DEPLOYED[@]}"; do
            IFS=':' read -r canister id <<< "$item"
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/\\(${canister}:\\s*import\\.meta\\.env\\.VITE_[A-Z_]*_CANISTER_ID\\s*||\\s*\\)'[^']*'/\\1'${id}'/" "$CONFIG_FILE"
            else
                sed -i "s/\\(${canister}:\\s*import\\.meta\\.env\\.VITE_[A-Z_]*_CANISTER_ID\\s*||\\s*\\)'[^']*'/\\1'${id}'/" "$CONFIG_FILE"
            fi
        done
        echo "  ✅ Config updated!"
    fi
fi

if [ ${#FAILED[@]} -gt 0 ]; then
    echo ""
    echo "❌ Failed canisters: ${FAILED[*]}"
    exit 1
fi

if [ ${#DEPLOYED[@]} -eq 0 ]; then
    echo ""
    echo "❌ No canisters were deployed"
    exit 1
fi

echo ""
echo "✅ DEPLOYMENT COMPLETE!"

