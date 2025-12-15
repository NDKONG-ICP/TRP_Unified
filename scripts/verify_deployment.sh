#!/bin/bash

# Deployment Verification Script
# Verifies all canisters are deployed and responding on mainnet

set -euo pipefail

export DFX_WARNING=-mainnet_plaintext_identity

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NETWORK="ic"
PROJECT_ROOT="/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"
cd "$PROJECT_ROOT"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deployment Verification - Mainnet${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Canisters to verify
declare -A CANISTERS=(
  ["core"]="qb6fv-6aaaa-aaaao-a4w7q-cai"
  ["nft"]="37ixl-fiaaa-aaaao-a4xaa-cai"
  ["kip"]="3yjr7-iqaaa-aaaao-a4xaq-cai"
  ["treasury"]="3rk2d-6yaaa-aaaao-a4xba-cai"
  ["escrow"]="3wl4x-taaaa-aaaao-a4xbq-cai"
  ["logistics"]="3dmn2-siaaa-aaaao-a4xca-cai"
  ["ai_engine"]="3enlo-7qaaa-aaaao-a4xcq-cai"
  ["raven_ai"]="3noas-jyaaa-aaaao-a4xda-cai"
  ["assets"]="3kpgg-eaaaa-aaaao-a4xdq-cai"
  ["deepseek_model"]="kqj56-2aaaa-aaaao-a4ygq-cai"
  ["vector_db"]="kzkwc-miaaa-aaaao-a4yha-cai"
  ["queen_bee"]="k6lqw-bqaaa-aaaao-a4yhq-cai"
  ["staking"]="inutw-jiaaa-aaaao-a4yja-cai"
  ["axiom_1"]="46odg-5iaaa-aaaao-a4xqa-cai"
  ["axiom_2"]="4zpfs-qqaaa-aaaao-a4xqq-cai"
  ["axiom_3"]="4ckzx-kiaaa-aaaao-a4xsa-cai"
  ["axiom_4"]="4fl7d-hqaaa-aaaao-a4xsq-cai"
  ["axiom_5"]="4miu7-ryaaa-aaaao-a4xta-cai"
)

# Function to check canister status
check_canister() {
  local name=$1
  local canister_id=$2
  
  echo -n "Checking $name ($canister_id)... "
  
  # Check if canister exists and is running
  if dfx canister status "$canister_id" --network "$NETWORK" &>/dev/null; then
    local status=$(dfx canister status "$canister_id" --network "$NETWORK" 2>/dev/null | grep "Status" || echo "")
    if echo "$status" | grep -q "running"; then
      echo -e "${GREEN}✓ Running${NC}"
      return 0
    else
      echo -e "${YELLOW}⚠ Not running${NC}"
      return 1
    fi
  else
    echo -e "${RED}✗ Not found${NC}"
    return 1
  fi
}

# Function to test canister query
test_canister_query() {
  local name=$1
  local canister_id=$2
  local method=$3
  
  echo -n "  Testing $method()... "
  
  if dfx canister call "$canister_id" "$method" --network "$NETWORK" --query &>/dev/null; then
    echo -e "${GREEN}✓${NC}"
    return 0
  else
    echo -e "${RED}✗${NC}"
    return 1
  fi
}

# Verify all canisters
echo -e "${BLUE}Verifying Canister Status...${NC}"
echo ""

PASSED=0
FAILED=0

for canister_name in "${!CANISTERS[@]}"; do
  canister_id="${CANISTERS[$canister_name]}"
  
  if check_canister "$canister_name" "$canister_id"; then
    ((PASSED++))
    
    # Test specific queries based on canister type
    case "$canister_name" in
      "raven_ai")
        test_canister_query "$canister_name" "$canister_id" "get_config"
        ;;
      "kip")
        test_canister_query "$canister_name" "$canister_id" "get_config"
        ;;
      "staking")
        test_canister_query "$canister_name" "$canister_id" "get_leaderboard"
        ;;
      "axiom_1"|"axiom_2"|"axiom_3"|"axiom_4"|"axiom_5")
        test_canister_query "$canister_name" "$canister_id" "get_metadata"
        ;;
      *)
        # Generic health check
        test_canister_query "$canister_name" "$canister_id" "get_config" || true
        ;;
    esac
  else
    ((FAILED++))
  fi
  echo ""
done

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}Failed: $FAILED${NC}"
else
  echo -e "${GREEN}Failed: $FAILED${NC}"
fi
echo ""

# Check cycles
echo -e "${BLUE}Checking Canister Cycles...${NC}"
for canister_name in "${!CANISTERS[@]}"; do
  canister_id="${CANISTERS[$canister_name]}"
  cycles=$(dfx canister status "$canister_id" --network "$NETWORK" 2>/dev/null | grep "Balance" | awk '{print $2}' || echo "unknown")
  echo "  $canister_name: $cycles cycles"
done

echo ""
echo -e "${GREEN}Verification complete!${NC}"



