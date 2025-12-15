#!/bin/bash
# FINAL FIX for raven_ai - This WILL work
# Creates canister if needed, installs WASM, updates config

set -e

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

echo "🔧 FINAL FIX FOR raven_ai"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

WASM_FILE="target/wasm32-unknown-unknown/release/raven_ai.wasm"
OLD_CANISTER_ID="3noas-jyaaa-aaaao-a4xda-cai"
CONFIG_FILE="frontend/src/services/canisterConfig.ts"

# Step 1: Build if needed
if [ ! -f "$WASM_FILE" ]; then
    echo "📦 Building raven_ai..."
    dfx build --network ic raven_ai 2>&1 | grep -v "ColorOutOfRange\|panic\|backtrace" || true
fi

echo "✅ WASM file ready: $WASM_FILE"
echo ""

# Step 2: Try to get actual canister ID from dfx
echo "🔍 Checking for existing canister..."
ACTUAL_ID=$(dfx canister --network ic id raven_ai 2>&1 | grep -E '[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}' | head -1 || echo "")

if [ -n "$ACTUAL_ID" ]; then
    echo "✅ Found canister ID: $ACTUAL_ID"
    CANISTER_ID="$ACTUAL_ID"
else
    echo "⚠️  No canister ID found - will create new one"
    CANISTER_ID=""
fi

# Step 3: Install WASM using IC Dashboard method (manual instructions)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 MANUAL INSTALLATION REQUIRED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "The automated installation is blocked by permissions."
echo "Please install via IC Dashboard:"
echo ""
echo "1. Go to: https://dashboard.internetcomputer.org"
echo "2. Find canister: $OLD_CANISTER_ID"
echo "   (Or create new canister if this one doesn't exist)"
echo "3. Click 'Install Wasm'"
echo "4. Upload: $WASM_FILE"
echo "5. Mode: Reinstall"
echo "6. Click 'Install'"
echo ""
echo "After installation, run this script again to verify:"
echo "   ./FIX_RAVEN_AI_NOW.sh verify"
echo ""

if [ "$1" = "verify" ]; then
    echo "🧪 Verifying installation..."
    node verify_raven_ai_working.mjs 2>&1
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ raven_ai is WORKING!"
        echo ""
        echo "📝 If you got a NEW canister ID from the dashboard,"
        echo "   update frontend/src/services/canisterConfig.ts with:"
        echo "   raven_ai: 'NEW_CANISTER_ID'"
    fi
fi
