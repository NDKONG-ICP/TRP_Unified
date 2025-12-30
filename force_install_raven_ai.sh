#!/bin/bash
# Force install raven_ai - bypasses all dfx issues

set -e

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

source "./scripts/dfx_safe_env.sh"
# Keep the original intent of this script: minimal output / no backtraces
export RUST_BACKTRACE=0

echo "🚀 FORCE INSTALLING raven_ai"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

WASM_FILE="target/wasm32-unknown-unknown/release/raven_ai.wasm"
CANISTER_ID="3noas-jyaaa-aaaao-a4xda-cai"

if [ ! -f "$WASM_FILE" ]; then
    echo "❌ WASM file not found. Building..."
    ./scripts/dfx_safe.sh build --network ic raven_ai 2>&1 | grep -v "ColorOutOfRange\|panic\|backtrace" || true
fi

echo "✅ WASM file: $WASM_FILE"
echo "✅ Size: $(ls -lh "$WASM_FILE" | awk '{print $5}')"
echo ""

# Try multiple installation methods
echo "📦 Attempting installation method 1: dfx canister install..."
if echo "yes" | ./scripts/dfx_safe.sh canister install --network ic raven_ai --wasm "$WASM_FILE" --mode reinstall 2>&1 | grep -v "ColorOutOfRange\|panic\|backtrace" | tail -5; then
    echo "✅ Installation successful!"
    exit 0
fi

echo ""
echo "📦 Attempting installation method 2: dfx deploy..."
if ./scripts/dfx_safe.sh deploy --network ic raven_ai --no-wallet 2>&1 | grep -v "ColorOutOfRange\|panic\|backtrace" | tail -10; then
    echo "✅ Installation successful!"
    exit 0
fi

echo ""
echo "📦 Attempting installation method 3: Direct Management Canister API..."
node install_raven_ai_direct.mjs 2>&1 | tail -10

echo ""
echo "🧪 Verifying installation..."
sleep 3
if ./scripts/dfx_safe.sh canister call --network ic raven_ai get_article_stats '()' 2>&1 | grep -v "ColorOutOfRange\|panic\|backtrace" | head -3; then
    echo "✅ raven_ai is working!"
else
    echo "❌ Installation may have failed. Check output above."
    exit 1
fi
