#!/bin/bash
# Install raven_ai canister WASM
# This script handles the dfx color panic issue

set -e

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

source "./scripts/dfx_safe_env.sh"

echo "🚀 Installing raven_ai canister..."
echo ""

# Check if WASM exists
if [ ! -f "target/wasm32-unknown-unknown/release/raven_ai.wasm" ]; then
    echo "❌ WASM file not found. Building..."
    ./scripts/dfx_safe.sh build raven_ai --network ic
fi

echo "📦 Installing WASM module..."
echo "   (You will be prompted to confirm - type 'yes')"
echo ""

# Install with reinstall mode
./scripts/dfx_safe.sh canister install --network ic raven_ai \
    --wasm target/wasm32-unknown-unknown/release/raven_ai.wasm \
    --mode=reinstall

echo ""
echo "✅ Installation command completed!"
echo ""
echo "⚠️  Note: If you see a panic message, it may have occurred AFTER installation."
echo "   Check if it worked by refreshing your browser and testing article generation."
echo ""

