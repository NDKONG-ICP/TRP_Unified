#!/bin/bash

# Deploy Optional Canisters to Mainnet
# siwe_canister, siws_canister, siwb_canister, sis_canister, ordinals_canister

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
echo -e "${CYAN}🚀 Deploying Optional Canisters to Mainnet${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# List of optional canisters
OPTIONAL_CANISTERS=(
    "siwe_canister"
    "siws_canister"
    "siwb_canister"
    "sis_canister"
    "ordinals_canister"
)

# Function to create canister if it doesn't exist
create_canister_if_needed() {
    local canister=$1
    echo -e "${YELLOW}  Checking $canister...${NC}"
    
    # Check if canister exists
    if dfx canister --network "$NETWORK" id "$canister" &>/dev/null; then
        echo -e "${GREEN}    ✓ $canister already exists${NC}"
    else
        echo -e "${YELLOW}    Creating $canister...${NC}"
        if dfx canister --network "$NETWORK" create "$canister" --no-wallet 2>&1 | grep -q "created\|already"; then
            echo -e "${GREEN}    ✓ $canister created${NC}"
        else
            echo -e "${RED}    ✗ Failed to create $canister${NC}"
            return 1
        fi
    fi
}

# Function to deploy canister
deploy_canister() {
    local canister=$1
    echo -e "${YELLOW}  Deploying $canister...${NC}"
    
    if dfx deploy --network "$NETWORK" "$canister" --no-wallet 2>&1 | tail -5; then
        echo -e "${GREEN}    ✓ $canister deployed${NC}"
        return 0
    else
        echo -e "${RED}    ✗ Failed to deploy $canister${NC}"
        return 1
    fi
}

# Step 1: Create canisters
echo -e "${CYAN}📦 Step 1: Creating canisters...${NC}"
echo ""

for canister in "${OPTIONAL_CANISTERS[@]}"; do
    create_canister_if_needed "$canister"
done

echo ""
echo -e "${GREEN}✓ All canisters ready${NC}"
echo ""

# Step 2: Deploy canisters
echo -e "${CYAN}🚀 Step 2: Deploying canisters...${NC}"
echo ""

DEPLOYED=0
FAILED=0

for canister in "${OPTIONAL_CANISTERS[@]}"; do
    if deploy_canister "$canister"; then
        DEPLOYED=$((DEPLOYED + 1))
    else
        FAILED=$((FAILED + 1))
    fi
    echo ""
done

# Step 3: Get canister IDs
echo -e "${CYAN}🔍 Step 3: Getting canister IDs...${NC}"
echo ""

for canister in "${OPTIONAL_CANISTERS[@]}"; do
    ID=$(dfx canister --network "$NETWORK" id "$canister" 2>&1 | grep -v "Warning" | head -1 || echo "NOT_FOUND")
    if [ "$ID" != "NOT_FOUND" ]; then
        echo -e "${GREEN}  $canister: $ID${NC}"
    else
        echo -e "${RED}  $canister: NOT FOUND${NC}"
    fi
done

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${CYAN}📋 Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "  ${GREEN}✅ Deployed: $DEPLOYED${NC}"
if [ "$FAILED" -gt 0 ]; then
    echo -e "  ${RED}❌ Failed: $FAILED${NC}"
fi
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}🎉 All optional canisters deployed successfully!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some canisters failed to deploy${NC}"
    exit 1
fi

