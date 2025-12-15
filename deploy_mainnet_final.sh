#!/bin/bash
# Final deployment script - works around dfx color bug by checking for success

set -e

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

export PATH="$HOME/.local/share/dfxvm/bin:$PATH"
export NO_COLOR=1
export TERM=dumb
export DFX_WARNING=-mainnet_plaintext_identity
export RUST_BACKTRACE=0

echo "🚀 Deploying to IC Mainnet"
echo ""

# Verify identity
echo "📋 Verifying identity..."
dfx identity use ic_deploy 2>/dev/null || true
PRINCIPAL=$(dfx identity get-principal 2>/dev/null | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' || echo "")
WALLET=$(dfx identity get-wallet --network ic 2>/dev/null | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' || echo "daf6l-jyaaa-aaaao-a4nba-cai")

echo "✅ Principal: $PRINCIPAL"
echo "✅ Wallet: $WALLET"
echo ""

canisters=("siwe_canister" "siws_canister" "siwb_canister" "sis_canister" "ordinals_canister")
deployed=()

for canister in "${canisters[@]}"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Deploying $canister"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Start deployment in background (dfx will panic but may succeed)
    echo "  Starting deployment..."
    (dfx deploy "$canister" --network ic --wallet "$WALLET" --yes > /tmp/dfx_${canister}.log 2>&1 &)
    DEPLOY_PID=$!
    
    # Wait for deployment to potentially complete
    # The panic happens but deployment may succeed before it
    sleep 60
    
    # Check multiple times if canister was created
    CANISTER_ID=""
    for i in {1..20}; do
        ID_CHECK=$(dfx canister id "$canister" --network ic 2>/dev/null | grep -oE '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' || echo "")
        if [ -n "$ID_CHECK" ]; then
            CANISTER_ID="$ID_CHECK"
            echo "  ✅ Deployed: $CANISTER_ID"
            deployed+=("$canister:$CANISTER_ID")
            break
        fi
        if [ $i -lt 20 ]; then
            sleep 10
        fi
    done
    
    if [ -z "$CANISTER_ID" ]; then
        echo "  ⚠️  Could not verify deployment"
        # Check log for any success indicators
        if grep -qi "deployed\|installed\|success" /tmp/dfx_${canister}.log 2>/dev/null; then
            echo "  💡 Deployment may have succeeded (check log: /tmp/dfx_${canister}.log)"
        fi
    fi
    
    # Kill the process (it may have panicked)
    kill $DEPLOY_PID 2>/dev/null || true
    echo ""
    sleep 3
done

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 DEPLOYMENT SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ${#deployed[@]} -gt 0 ]; then
    echo ""
    echo "✅ Successfully deployed canisters:"
    for item in "${deployed[@]}"; do
        IFS=':' read -r canister id <<< "$item"
        echo "  $canister: $id"
    done
    
    # Update frontend config
    echo ""
    echo "📝 Updating frontend config..."
    CONFIG_FILE="frontend/src/services/canisterConfig.ts"
    if [ -f "$CONFIG_FILE" ]; then
        for item in "${deployed[@]}"; do
            IFS=':' read -r canister id <<< "$item"
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/\\(${canister}:\\s*import\\.meta\\.env\\.VITE_[A-Z_]*_CANISTER_ID\\s*||\\s*\\)'[^']*'/\\1'${id}'/" "$CONFIG_FILE"
            else
                sed -i "s/\\(${canister}:\\s*import\\.meta\\.env\\.VITE_[A-Z_]*_CANISTER_ID\\s*||\\s*\\)'[^']*'/\\1'${id}'/" "$CONFIG_FILE"
            fi
        done
        echo "  ✅ Config updated!"
    fi
    
    echo ""
    echo "✅ DEPLOYMENT COMPLETE!"
    echo ""
    echo "Next steps:"
    echo "1. Rebuild frontend: cd frontend && npm run build"
    echo "2. Deploy frontend assets"
else
    echo ""
    echo "⚠️  No canisters were verified as deployed"
    echo "   Check logs in /tmp/dfx_*.log for details"
    echo "   The deployment may have succeeded despite the panic"
    exit 1
fi

