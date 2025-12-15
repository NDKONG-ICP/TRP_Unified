#!/bin/bash
# Comprehensive Canister Audit
# Checks: WASM installation, status, cycles, frontend wiring

set -e

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

export NO_COLOR=1
export TERM=dumb
unset COLORTERM

echo "🔍 COMPREHENSIVE CANISTER AUDIT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get canister names from dfx.json using Python
CANISTERS=$(python3 -c "import json; data = json.load(open('dfx.json')); print('\n'.join(data['canisters'].keys()))")

echo "📋 Found canisters:"
echo "$CANISTERS" | while read canister; do
  echo "  - $canister"
done
echo ""

# Initialize counters
TOTAL=0
WITH_WASM=0
WITHOUT_WASM=0
NOT_CREATED=0
WIRED=0
NOT_WIRED=0
NEEDS_INSTALL=0

# Arrays to track issues
MISSING_WASM=()
NOT_WIRED_LIST=()
NOT_CREATED_LIST=()

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 DETAILED STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for canister in $CANISTERS; do
  TOTAL=$((TOTAL + 1))
  echo "🔍 Checking $canister..."
  
  # Get canister ID (suppress errors)
  CANISTER_ID=$(dfx canister --network ic id $canister 2>&1 | grep -v "ColorOutOfRange\|panic\|backtrace\|Error\|error" | grep -E "^[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}$" | head -1 || echo "")
  
  if [ -z "$CANISTER_ID" ]; then
    echo "   ❌ Not created on mainnet"
    NOT_CREATED=$((NOT_CREATED + 1))
    NOT_CREATED_LIST+=("$canister")
    echo ""
    continue
  fi
  
  echo "   ID: $CANISTER_ID"
  
  # Check status (suppress dfx panic)
  STATUS_OUTPUT=$(dfx canister --network ic status $canister 2>&1 | grep -v "ColorOutOfRange\|panic\|backtrace" || echo "")
  
  if [ -z "$STATUS_OUTPUT" ]; then
    echo "   ⚠️  Could not get status (dfx may have panicked)"
    echo ""
    continue
  fi
  
  # Extract key info
  HAS_MODULE=$(echo "$STATUS_OUTPUT" | grep -i "Module hash" | grep -v "None" || echo "")
  STATUS=$(echo "$STATUS_OUTPUT" | grep -i "^Status:" | head -1 || echo "")
  BALANCE=$(echo "$STATUS_OUTPUT" | grep -i "^Balance:" | head -1 || echo "")
  
  if [ -n "$HAS_MODULE" ]; then
    echo "   ✅ WASM: Installed"
    WITH_WASM=$((WITH_WASM + 1))
  else
    echo "   ❌ WASM: Not installed"
    WITHOUT_WASM=$((WITHOUT_WASM + 1))
    MISSING_WASM+=("$canister:$CANISTER_ID")
  fi
  
  if [ -n "$STATUS" ]; then
    echo "   $STATUS"
  fi
  
  if [ -n "$BALANCE" ]; then
    CYCLES_NUM=$(echo "$BALANCE" | grep -oE "[0-9_]+" | tr -d '_' | head -1)
    if [ -n "$CYCLES_NUM" ]; then
      CYCLES_TC=$(echo "scale=2; $CYCLES_NUM / 1000000000000" | bc 2>/dev/null || echo "N/A")
      echo "   💰 Cycles: ${CYCLES_TC} TC"
    else
      echo "   $BALANCE"
    fi
  fi
  
  # Check frontend wiring
  if grep -q "$CANISTER_ID" frontend/src/services/canisterConfig.ts 2>/dev/null; then
    echo "   ✅ Frontend: Wired"
    WIRED=$((WIRED + 1))
  else
    echo "   ❌ Frontend: Not wired"
    NOT_WIRED=$((NOT_WIRED + 1))
    NOT_WIRED_LIST+=("$canister:$CANISTER_ID")
  fi
  
  # Check if WASM file exists
  WASM_FOUND=false
  if [ -f "target/wasm32-unknown-unknown/release/${canister}.wasm" ]; then
    WASM_SIZE=$(ls -lh "target/wasm32-unknown-unknown/release/${canister}.wasm" | awk '{print $5}')
    echo "   ✅ WASM File: target/.../${canister}.wasm ($WASM_SIZE)"
    WASM_FOUND=true
  elif [ -f "backend/${canister}/target/wasm32-unknown-unknown/release/${canister}.wasm" ]; then
    WASM_SIZE=$(ls -lh "backend/${canister}/target/wasm32-unknown-unknown/release/${canister}.wasm" | awk '{print $5}')
    echo "   ✅ WASM File: backend/${canister}/.../${canister}.wasm ($WASM_SIZE)"
    WASM_FOUND=true
  else
    echo "   ⚠️  WASM File: Not found"
  fi
  
  # Track if needs installation
  if [ -z "$HAS_MODULE" ] && [ "$WASM_FOUND" = true ]; then
    NEEDS_INSTALL=$((NEEDS_INSTALL + 1))
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
echo "📦 Ready to Install: $NEEDS_INSTALL"
echo ""

# Detailed issues
if [ ${#MISSING_WASM[@]} -gt 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ CANISTERS MISSING WASM (${#MISSING_WASM[@]})"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  for item in "${MISSING_WASM[@]}"; do
    CANISTER_NAME=$(echo "$item" | cut -d: -f1)
    CANISTER_ID=$(echo "$item" | cut -d: -f2)
    echo "  - $CANISTER_NAME ($CANISTER_ID)"
    
    # Check if WASM file exists
    if [ -f "target/wasm32-unknown-unknown/release/${CANISTER_NAME}.wasm" ]; then
      echo "    ✅ WASM file exists - Ready to install"
      echo "    💡 Run: node install_code_only.mjs $CANISTER_NAME $CANISTER_ID"
    elif [ -f "backend/${CANISTER_NAME}/target/wasm32-unknown-unknown/release/${CANISTER_NAME}.wasm" ]; then
      echo "    ✅ WASM file exists - Ready to install"
      echo "    💡 Run: node install_code_only.mjs $CANISTER_NAME $CANISTER_ID"
    else
      echo "    ⚠️  WASM file not found - Needs build"
      echo "    💡 Run: dfx build $CANISTER_NAME --network ic"
    fi
    echo ""
  done
fi

if [ ${#NOT_WIRED_LIST[@]} -gt 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ CANISTERS NOT WIRED IN FRONTEND (${#NOT_WIRED_LIST[@]})"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  for item in "${NOT_WIRED_LIST[@]}"; do
    CANISTER_NAME=$(echo "$item" | cut -d: -f1)
    CANISTER_ID=$(echo "$item" | cut -d: -f2)
    echo "  - $CANISTER_NAME: $CANISTER_ID"
    echo "    💡 Add to frontend/src/services/canisterConfig.ts"
    echo ""
  done
fi

if [ ${#NOT_CREATED_LIST[@]} -gt 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  CANISTERS NOT CREATED ON MAINNET (${#NOT_CREATED_LIST[@]})"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  for canister in "${NOT_CREATED_LIST[@]}"; do
    echo "  - $canister"
    echo "    💡 Create with: dfx canister create $canister --network ic"
    echo ""
  done
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Audit complete!"
echo ""
