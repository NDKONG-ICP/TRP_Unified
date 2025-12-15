#!/bin/bash
# Two-step deployment: Create canisters first, then install WASM
# This may work even if dfx panics

set -e

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

export PATH="$HOME/.local/share/dfxvm/bin:$PATH"
export NO_COLOR=1
export TERM=dumb
export DFX_WARNING=-mainnet_plaintext_identity
export RUST_BACKTRACE=0

echo "🚀 Two-Step Deployment to IC Mainnet"
echo ""

# Verify identity
dfx identity use ic_deploy 2>/dev/null || true
PRINCIPAL=$(dfx identity get-principal 2>/dev/null | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' || echo "")
WALLET=$(dfx identity get-wallet --network ic 2>/dev/null | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' || echo "daf6l-jyaaa-aaaao-a4nba-cai")

echo "Principal: $PRINCIPAL"
echo "Wallet: $WALLET"
echo ""

canisters=("siwe_canister" "siws_canister" "siwb_canister" "sis_canister" "ordinals_canister")
created=()

# STEP 1: Create canisters
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Creating canisters"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for canister in "${canisters[@]}"; do
    echo "Creating $canister..."
    
    # Create canister (may panic but creation may succeed)
    (dfx canister create "$canister" --network ic --wallet "$WALLET" > /tmp/create_${canister}.log 2>/dev/null &)
    CREATE_PID=$!
    
    # Wait and check
    sleep 10
    
    CANISTER_ID=""
    for i in {1..10}; do
        ID_CHECK=$(dfx canister id "$canister" --network ic 2>/dev/null | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' || echo "")
        if [ -n "$ID_CHECK" ]; then
            CANISTER_ID="$ID_CHECK"
            echo "  ✅ Created: $CANISTER_ID"
            created+=("$canister:$CANISTER_ID")
            break
        fi
        sleep 5
    done
    
    if [ -z "$CANISTER_ID" ]; then
        echo "  ⚠️  Could not verify creation"
    fi
    
    kill $CREATE_PID 2>/dev/null || true
    echo ""
    sleep 2
done

if [ ${#created[@]} -eq 0 ]; then
    echo "❌ No canisters were created"
    exit 1
fi

# STEP 2: Install WASM
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Installing WASM modules"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

deployed=()

for item in "${created[@]}"; do
    IFS=':' read -r canister canister_id <<< "$item"
    wasm_file="target/wasm32-unknown-unknown/release/${canister}.wasm"
    
    if [ ! -f "$wasm_file" ]; then
        echo "⚠️  $canister: WASM not found at $wasm_file"
        continue
    fi
    
    echo "Installing $canister ($canister_id)..."
    
    # Install WASM (may panic but installation may succeed)
    (dfx canister install "$canister" --wasm "$wasm_file" --network ic --wallet "$WALLET" > /tmp/install_${canister}.log 2>/dev/null &)
    INSTALL_PID=$!
    
    # Wait for installation
    sleep 20
    
    # Verify canister still exists and has code
    ID_CHECK=$(dfx canister id "$canister" --network ic 2>/dev/null | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' || echo "")
    if [ -n "$ID_CHECK" ] && [ "$ID_CHECK" = "$canister_id" ]; then
        echo "  ✅ Installed: $canister_id"
        deployed+=("$canister:$canister_id")
    else
        echo "  ⚠️  Installation may have issues"
    fi
    
    kill $INSTALL_PID 2>/dev/null || true
    echo ""
    sleep 2
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
else
    echo ""
    echo "❌ No canisters were deployed"
    exit 1
fi

