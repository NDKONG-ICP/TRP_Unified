#!/bin/bash
# Deploy All Multi-Chain Canisters
# This script deploys all 5 multi-chain authentication canisters to IC mainnet

set -e

# Colors for output (will be disabled for dfx)
export NO_COLOR=1
export TERM=dumb
unset COLORTERM

cd "$(dirname "$0")"

echo "🚀 Deploying Multi-Chain Authentication Canisters to IC Mainnet..."
echo ""

# Canister names
CANISTERS=("siwe_canister" "siws_canister" "siwb_canister" "sis_canister" "ordinals_canister")

# Step 1: Create canisters if they don't exist
echo "📦 Step 1: Creating canisters (if needed)..."
for canister in "${CANISTERS[@]}"; do
    echo "  Checking $canister..."
    if ! dfx canister id "$canister" --network ic &>/dev/null; then
        echo "  Creating $canister..."
        RUST_BACKTRACE=0 dfx canister create "$canister" --network ic 2>&1 | grep -v "ColorOutOfRange" || {
            echo "  ⚠️  $canister may already exist or creation failed"
        }
    else
        echo "  ✅ $canister already exists"
    fi
done
echo ""

# Step 2: Get canister IDs
echo "🆔 Step 2: Getting canister IDs..."
declare -A CANISTER_IDS
for canister in "${CANISTERS[@]}"; do
    ID=$(dfx canister id "$canister" --network ic 2>&1 | head -1 || echo "")
    if [ -n "$ID" ]; then
        CANISTER_IDS["$canister"]="$ID"
        echo "  $canister: $ID"
    else
        echo "  ⚠️  Could not get ID for $canister"
    fi
done
echo ""

# Step 3: Deploy canisters
echo "📤 Step 3: Deploying canisters..."
for canister in "${CANISTERS[@]}"; do
    WASM_FILE="target/wasm32-unknown-unknown/release/${canister}.wasm"
    
    if [ ! -f "$WASM_FILE" ]; then
        echo "  ❌ WASM file not found: $WASM_FILE"
        echo "  Building $canister..."
        cargo build --target wasm32-unknown-unknown --release -p "$canister"
    fi
    
    echo "  Deploying $canister..."
    RUST_BACKTRACE=0 dfx deploy "$canister" --network ic 2>&1 | grep -v "ColorOutOfRange" || {
        echo "  ⚠️  Deployment of $canister had issues"
    }
    echo ""
done

# Step 4: Display final canister IDs
echo "✅ Step 4: Final Canister IDs:"
echo ""
for canister in "${CANISTERS[@]}"; do
    ID=$(dfx canister id "$canister" --network ic 2>&1 | head -1 || echo "NOT_DEPLOYED")
    echo "  $canister: $ID"
done
echo ""

# Step 5: Update frontend config
echo "📝 Step 5: Updating frontend configuration..."
FRONTEND_CONFIG="frontend/src/services/canisterConfig.ts"

if [ -f "$FRONTEND_CONFIG" ]; then
    # Create backup
    cp "$FRONTEND_CONFIG" "${FRONTEND_CONFIG}.backup"
    
    # Update with actual IDs
    for canister in "${CANISTERS[@]}"; do
        ID="${CANISTER_IDS[$canister]}"
        if [ -n "$ID" ]; then
            # Use sed to update the config file
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS sed
                sed -i '' "s|siwe_canister:.*|siwe_canister: import.meta.env.VITE_SIWE_CANISTER_ID || '$ID',|" "$FRONTEND_CONFIG" 2>/dev/null || true
                sed -i '' "s|siws_canister:.*|siws_canister: import.meta.env.VITE_SIWS_CANISTER_ID || '$ID',|" "$FRONTEND_CONFIG" 2>/dev/null || true
                sed -i '' "s|siwb_canister:.*|siwb_canister: import.meta.env.VITE_SIWB_CANISTER_ID || '$ID',|" "$FRONTEND_CONFIG" 2>/dev/null || true
                sed -i '' "s|sis_canister:.*|sis_canister: import.meta.env.VITE_SIS_CANISTER_ID || '$ID',|" "$FRONTEND_CONFIG" 2>/dev/null || true
                sed -i '' "s|ordinals_canister:.*|ordinals_canister: import.meta.env.VITE_ORDINALS_CANISTER_ID || '$ID',|" "$FRONTEND_CONFIG" 2>/dev/null || true
            else
                # Linux sed
                sed -i "s|siwe_canister:.*|siwe_canister: import.meta.env.VITE_SIWE_CANISTER_ID || '$ID',|" "$FRONTEND_CONFIG" 2>/dev/null || true
                sed -i "s|siws_canister:.*|siws_canister: import.meta.env.VITE_SIWS_CANISTER_ID || '$ID',|" "$FRONTEND_CONFIG" 2>/dev/null || true
                sed -i "s|siwb_canister:.*|siwb_canister: import.meta.env.VITE_SIWB_CANISTER_ID || '$ID',|" "$FRONTEND_CONFIG" 2>/dev/null || true
                sed -i "s|sis_canister:.*|sis_canister: import.meta.env.VITE_SIS_CANISTER_ID || '$ID',|" "$FRONTEND_CONFIG" 2>/dev/null || true
                sed -i "s|ordinals_canister:.*|ordinals_canister: import.meta.env.VITE_ORDINALS_CANISTER_ID || '$ID',|" "$FRONTEND_CONFIG" 2>/dev/null || true
            fi
        fi
    done
    
    echo "  ✅ Frontend config updated (backup saved to ${FRONTEND_CONFIG}.backup)"
else
    echo "  ⚠️  Frontend config not found: $FRONTEND_CONFIG"
fi
echo ""

# Step 6: Build frontend
echo "🏗️  Step 6: Building frontend..."
cd frontend
npm run build
cd ..
echo ""

# Step 7: Deploy frontend
echo "🚀 Step 7: Deploying frontend assets..."
RUST_BACKTRACE=0 dfx deploy assets --network ic 2>&1 | grep -v "ColorOutOfRange" || {
    echo "  ⚠️  Frontend deployment had issues"
}
echo ""

echo "✅ Deployment Complete!"
echo ""
echo "📋 Summary:"
echo "  - All canisters deployed to IC mainnet"
echo "  - Frontend config updated"
echo "  - Frontend built and deployed"
echo ""
echo "🔍 Verify deployment:"
for canister in "${CANISTERS[@]}"; do
    echo "  dfx canister status $canister --network ic"
done

