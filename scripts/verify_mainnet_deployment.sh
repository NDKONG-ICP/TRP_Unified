#!/bin/bash

# Comprehensive Mainnet Deployment Verification Script
# Verifies all canisters are running, have cycles, and are properly configured

set -e

# Disable color output to prevent ColorOutOfRange panic
export NO_COLOR=1
export DFX_WARNING=-mainnet_plaintext_identity
export TERM=dumb
unset COLORTERM

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Network
NETWORK="ic"

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}========================================${NC}"
echo -e "${CYAN}🔍 Raven Ecosystem - Mainnet Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# List of all canisters that should be deployed
MAIN_CANISTERS=(
    "raven_ai"
    "axiom_1"
    "axiom_2"
    "axiom_3"
    "axiom_4"
    "axiom_5"
    "assets"
    "nft"
    "core"
    "treasury"
    "escrow"
    "logistics"
    "staking"
    "queen_bee"
    "kip"
    "deepseek_model"
    "ai_engine"
    "vector_db"
    "axiom_nft"
)

OPTIONAL_CANISTERS=(
    "siwe_canister"
    "siws_canister"
    "siwb_canister"
    "sis_canister"
    "ordinals_canister"
)

# Minimum cycles threshold (1T cycles)
MIN_CYCLES=1000000000000

echo -e "${CYAN}📊 Checking canister status...${NC}"
echo ""

# Track results
RUNNING=0
STOPPED=0
LOW_CYCLES=0
NOT_FOUND=0

# Check main canisters
echo -e "${YELLOW}Main Canisters:${NC}"
for canister in "${MAIN_CANISTERS[@]}"; do
    STATUS_OUTPUT=$(dfx canister --network "$NETWORK" status "$canister" 2>&1 || echo "NOT_FOUND")
    
    if echo "$STATUS_OUTPUT" | grep -q "NOT_FOUND\|not found\|Error"; then
        echo -e "  ${RED}❌ $canister: NOT DEPLOYED${NC}"
        NOT_FOUND=$((NOT_FOUND + 1))
    else
        STATUS=$(echo "$STATUS_OUTPUT" | grep "Status:" | awk '{print $2}' || echo "Unknown")
        CYCLES_STR=$(echo "$STATUS_OUTPUT" | grep "Balance" | awk '{print $2, $3}' || echo "0 Cycles")
        CYCLES_NUM=$(echo "$CYCLES_STR" | tr -d ',' | tr -d 'Cycles' | tr -d ' ' | awk '{print $1}' | head -1)
        
        if [ "$STATUS" = "Running" ]; then
            # Check if cycles are sufficient
            if [ -n "$CYCLES_NUM" ] && [ "$CYCLES_NUM" -lt "$MIN_CYCLES" ]; then
                echo -e "  ${YELLOW}⚠️  $canister: $STATUS | Cycles: $CYCLES_STR (LOW)${NC}"
                LOW_CYCLES=$((LOW_CYCLES + 1))
            else
                echo -e "  ${GREEN}✅ $canister: $STATUS | Cycles: $CYCLES_STR${NC}"
                RUNNING=$((RUNNING + 1))
            fi
        else
            echo -e "  ${RED}❌ $canister: $STATUS${NC}"
            STOPPED=$((STOPPED + 1))
        fi
    fi
done

echo ""

# Check optional canisters
echo -e "${YELLOW}Optional Canisters:${NC}"
for canister in "${OPTIONAL_CANISTERS[@]}"; do
    STATUS_OUTPUT=$(dfx canister --network "$NETWORK" status "$canister" 2>&1 || echo "NOT_FOUND")
    
    if echo "$STATUS_OUTPUT" | grep -q "NOT_FOUND\|not found\|Error"; then
        echo -e "  ${YELLOW}○ $canister: Not deployed (optional)${NC}"
    else
        STATUS=$(echo "$STATUS_OUTPUT" | grep "Status:" | awk '{print $2}' || echo "Unknown")
        CYCLES_STR=$(echo "$STATUS_OUTPUT" | grep "Balance" | awk '{print $2, $3}' || echo "0 Cycles")
        if [ "$STATUS" = "Running" ]; then
            echo -e "  ${GREEN}✅ $canister: $STATUS | Cycles: $CYCLES_STR${NC}"
        else
            echo -e "  ${YELLOW}○ $canister: $STATUS${NC}"
        fi
    fi
done

echo ""

# Get frontend URL
echo -e "${CYAN}🌐 Frontend Information:${NC}"
FRONTEND_ID=$(dfx canister --network "$NETWORK" id assets 2>&1 | grep -v "Warning" | head -1 || echo "")
if [ -n "$FRONTEND_ID" ]; then
    echo -e "  ${GREEN}Frontend Canister ID: $FRONTEND_ID${NC}"
    echo -e "  ${GREEN}Frontend URL: https://$FRONTEND_ID.icp0.io${NC}"
    echo -e "  ${GREEN}Alternative URL: https://$FRONTEND_ID.raw.icp0.io${NC}"
else
    echo -e "  ${RED}❌ Frontend canister not found${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${CYAN}📋 Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "  ${GREEN}✅ Running: $RUNNING${NC}"
if [ "$STOPPED" -gt 0 ]; then
    echo -e "  ${RED}❌ Stopped: $STOPPED${NC}"
fi
if [ "$LOW_CYCLES" -gt 0 ]; then
    echo -e "  ${YELLOW}⚠️  Low Cycles: $LOW_CYCLES${NC}"
fi
if [ "$NOT_FOUND" -gt 0 ]; then
    echo -e "  ${RED}❌ Not Deployed: $NOT_FOUND${NC}"
fi
echo ""

# Recommendations
if [ "$LOW_CYCLES" -gt 0 ] || [ "$STOPPED" -gt 0 ] || [ "$NOT_FOUND" -gt 0 ]; then
    echo -e "${YELLOW}💡 Recommendations:${NC}"
    if [ "$LOW_CYCLES" -gt 0 ]; then
        echo -e "  - Top up canisters with low cycles using: dfx canister --network ic deposit-cycles <amount> <canister>"
    fi
    if [ "$STOPPED" -gt 0 ] || [ "$NOT_FOUND" -gt 0 ]; then
        echo -e "  - Deploy missing/stopped canisters using: ./scripts/deploy_mainnet_complete.sh"
    fi
    echo ""
fi

if [ "$RUNNING" -eq "${#MAIN_CANISTERS[@]}" ] && [ "$LOW_CYCLES" -eq 0 ] && [ "$STOPPED" -eq 0 ] && [ "$NOT_FOUND" -eq 0 ]; then
    echo -e "${GREEN}🎉 All main canisters are running and healthy!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some canisters need attention${NC}"
    exit 1
fi
