#!/bin/bash
# Comprehensive Canister Audit using dfx
# Checks: WASM installation, status, cycles, frontend wiring

set -e

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

export NO_COLOR=1
export TERM=dumb
unset COLORTERM

echo "🔍 COMPREHENSIVE CANISTER AUDIT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get all canister names from dfx.json
CANISTERS=$(cat dfx.json | grep -o '"[^"]*":' | grep -v 'canisters' | sed 's/"//g' | sed 's/://g' | grep -v '^$')

echo "📋 Found canisters:"
echo "$CANISTERS" | while read canister; do
  echo "  - $canister"
done
echo ""

# Check each canister
TOTAL=0
WITH_WASM=0
WITHOUT_WASM=0
NOT_CREATED=0
WIRED=0
NOT_WIRED=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 DETAILED STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for canister in $CANISTERS; do
  TOTAL=$((TOTAL + 1))
  echo "🔍 Checking $canister..."
  
  # Get canister ID
  CANISTER_ID=$(dfx canister --network ic id $canister 2>&1 | grep -v "ColorOutOfRange\|panic\|backtrace" | head -1 || echo "")
  
  if [ -z "$CANISTER_ID" ] || [[ "$CANISTER_ID" == *"Error"* ]] || [[ "$CANISTER_ID" == *"not found"* ]]; then
    echo "   ❌ Not created on mainnet"
    NOT_CREATED=$((NOT_CREATED + 1))
    echo ""
    continue
  fi
  
  echo "   ID: $CANISTER_ID"
  
  # Check status
  STATUS_OUTPUT=$(dfx canister --network ic status $canister 2>&1 | grep -v "ColorOutOfRange\|panic\|backtrace" || echo "")
  
  if [ -z "$STATUS_OUTPUT" ] || [[ "$STATUS_OUTPUT" == *"Error"* ]]; then
    echo "   ⚠️  Could not get status"
    echo ""
    continue
  fi
  
  # Extract key info
  HAS_MODULE=$(echo "$STATUS_OUTPUT" | grep -i "Module hash" | grep -v "None" || echo "")
  STATUS=$(echo "$STATUS_OUTPUT" | grep -i "Status" | head -1 || echo "")
  BALANCE=$(echo "$STATUS_OUTPUT" | grep -i "Balance" | head -1 || echo "")
  
  if [ -n "$HAS_MODULE" ]; then
    echo "   ✅ WASM: Installed"
    WITH_WASM=$((WITH_WASM + 1))
  else
    echo "   ❌ WASM: Not installed"
    WITHOUT_WASM=$((WITHOUT_WASM + 1))
  fi
  
  if [ -n "$STATUS" ]; then
    echo "   $STATUS"
  fi
  
  if [ -n "$BALANCE" ]; then
    echo "   $BALANCE"
  fi
  
  # Check frontend wiring
  if grep -q "$CANISTER_ID" frontend/src/services/canisterConfig.ts 2>/dev/null; then
    echo "   ✅ Frontend: Wired"
    WIRED=$((WIRED + 1))
  else
    echo "   ❌ Frontend: Not wired"
    NOT_WIRED=$((NOT_WIRED + 1))
  fi
  
  # Check if WASM file exists
  if [ -f "target/wasm32-unknown-unknown/release/${canister}.wasm" ] || [ -f "backend/${canister}/target/wasm32-unknown-unknown/release/${canister}.wasm" ]; then
    echo "   ✅ WASM File: Exists"
  else
    echo "   ⚠️  WASM File: Not found"
  fi
  
  echo ""
done

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Canisters: $TOTAL"
echo "✅ With WASM: $WITH_WASM"
echo "❌ Without WASM: $WITHOUT_WASM"
echo "⚠️  Not Created: $NOT_CREATED"
echo "✅ Frontend Wired: $WIRED"
echo "❌ Frontend Not Wired: $NOT_WIRED"
echo ""

if [ $WITHOUT_WASM -gt 0 ]; then
  echo "⚠️  $WITHOUT_WASM canister(s) need WASM installation"
  echo ""
  echo "To install WASM for missing canisters, run:"
  echo "  node install_code_only.mjs <canister_name> <canister_id>"
  echo ""
fi

if [ $NOT_WIRED -gt 0 ]; then
  echo "⚠️  $NOT_WIRED canister(s) need frontend wiring"
  echo ""
  echo "Update frontend/src/services/canisterConfig.ts with missing canister IDs"
  echo ""
fi

echo "✅ Audit complete!"
echo ""
