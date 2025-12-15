#!/bin/bash
# Comprehensive Health Check for Raven Ecosystem
# Run this to verify all canisters are healthy

set -e

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 RAVEN ECOSYSTEM - COMPREHENSIVE HEALTH CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⏰ $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Canisters to check
CANISTERS=(
  "raven_ai:3noas-jyaaa-aaaao-a4xda-cai"
  "axiom_1:qj5v5-3aaaa-aaaao-a4xca-cai"
  "axiom_2:qj5v5-3aaaa-aaaao-a4xca-cai"
  "axiom_3:qj5v5-3aaaa-aaaao-a4xca-cai"
  "axiom_4:qj5v5-3aaaa-aaaao-a4xca-cai"
  "axiom_5:qj5v5-3aaaa-aaaao-a4xca-cai"
  "assets:3kpgg-eaaaa-aaaao-a4xdq-cai"
  "nft:37ixl-fiaaa-aaaao-a4xaa-cai"
  "core:qb6fv-6aaaa-aaaao-a4w7q-cai"
  "treasury:3rk2d-6yaaa-aaaao-a4xba-cai"
)

echo "📊 CANISTER STATUS REPORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for canister_info in "${CANISTERS[@]}"; do
  IFS=':' read -r name id <<< "$canister_info"
  
  echo "=== $name ($id) ==="
  
  # Get status (suppress color errors)
  STATUS_OUTPUT=$(NO_COLOR=1 TERM=dumb dfx canister --network ic status "$id" 2>&1 | grep -v "ColorOutOfRange" | grep -v "stderr output color" || true)
  
  # Extract status
  STATUS=$(echo "$STATUS_OUTPUT" | grep "Status:" | awk '{print $2}' || echo "Unknown")
  
  # Extract balance
  BALANCE=$(echo "$STATUS_OUTPUT" | grep "Balance:" | awk '{print $2, $3}' || echo "Unknown")
  
  # Check if running
  if [[ "$STATUS" == "Running" ]]; then
    echo -e "   Status: ${GREEN}✅ Running${NC}"
  else
    echo -e "   Status: ${RED}❌ $STATUS${NC}"
  fi
  
  # Check cycles (convert to number for comparison)
  BALANCE_NUM=$(echo "$BALANCE" | tr -d ',' | tr -d 'Cycles' | awk '{print $1}' || echo "0")
  
  if [[ "$BALANCE_NUM" =~ ^[0-9]+$ ]]; then
    # Convert to trillions for readability
    BALANCE_TC=$(echo "scale=2; $BALANCE_NUM / 1000000000000" | bc 2>/dev/null || echo "0")
    
    if (( $(echo "$BALANCE_TC > 1.0" | bc -l 2>/dev/null || echo 0) )); then
      echo -e "   Cycles: ${GREEN}✅ ${BALANCE_TC}T cycles${NC}"
    elif (( $(echo "$BALANCE_TC > 0.1" | bc -l 2>/dev/null || echo 0) )); then
      echo -e "   Cycles: ${YELLOW}⚠️  ${BALANCE_TC}T cycles (Low)${NC}"
    else
      echo -e "   Cycles: ${RED}❌ ${BALANCE_TC}T cycles (CRITICAL)${NC}"
    fi
  else
    echo -e "   Cycles: ${YELLOW}⚠️  $BALANCE${NC}"
  fi
  
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 FRONTEND CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FRONTEND_ID="3kpgg-eaaaa-aaaao-a4xdq-cai"
FRONTEND_URL="https://${FRONTEND_ID}.icp0.io"

echo "Frontend URL: $FRONTEND_URL"
echo ""

# Test if frontend loads
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>&1 || echo "000")
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$FRONTEND_URL" 2>&1 || echo "0")

if [[ "$HTTP_CODE" == "200" ]]; then
  echo -e "   Status: ${GREEN}✅ Online (HTTP $HTTP_CODE)${NC}"
  echo -e "   Response Time: ${GREEN}${RESPONSE_TIME}s${NC}"
else
  echo -e "   Status: ${RED}❌ HTTP $HTTP_CODE${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ HEALTH CHECK COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

