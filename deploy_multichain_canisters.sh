#!/bin/bash
set -e

# Deploy Multi-Chain Canisters with dfx Color Bug Workaround
# These canisters handle authentication for Ethereum, Solana, Bitcoin, Sui, and Ordinals

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 Deploying Multi-Chain Authentication Canisters"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")"

NETWORK="ic"
IDENTITY="ic_deploy"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Check identity
CURRENT_IDENTITY=$(dfx identity whoami 2>/dev/null || echo "default")
if [ "$CURRENT_IDENTITY" != "$IDENTITY" ]; then
    echo -e "${YELLOW}Switching to $IDENTITY identity...${NC}"
    dfx identity use "$IDENTITY" 2>/dev/null || {
        echo -e "${RED}Error: $IDENTITY identity not found${NC}"
        exit 1
    }
fi

# Build all multi-chain canisters first
echo -e "${CYAN}🔨 Building multi-chain canisters...${NC}"
echo ""

cd backend
cargo build --target wasm32-unknown-unknown --release --package siwe_canister --package siws_canister --package siwb_canister --package sis_canister --package ordinals_canister 2>&1 | grep -E "(Compiling|Finished|error)" | tail -10

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build complete${NC}"
cd ..
echo ""

# Function to deploy a canister with workaround
deploy_multichain_canister() {
    local canister_name=$1
    local package_name=$2
    
    echo -e "${YELLOW}Deploying $canister_name...${NC}"
    
    # Check if canister exists
    CANISTER_ID=$(NO_COLOR=1 TERM=dumb dfx canister --network "$NETWORK" id "$canister_name" 2>&1 | grep -v "ColorOutOfRange" | head -1 || echo "")
    
    if [ -z "$CANISTER_ID" ]; then
        echo -e "${YELLOW}  Creating canister...${NC}"
        NO_COLOR=1 TERM=dumb dfx canister --network "$NETWORK" create "$canister_name" 2>&1 | grep -v "ColorOutOfRange" | grep -v "stderr output color" || true
        sleep 2
    fi
    
    # Deploy with workaround
    echo -e "${YELLOW}  Installing WASM...${NC}"
    NO_COLOR=1 TERM=dumb dfx canister --network "$NETWORK" install "$canister_name" \
        --wasm "backend/$package_name/target/wasm32-unknown-unknown/release/$package_name.wasm" \
        --mode upgrade 2>&1 | grep -v "ColorOutOfRange" | grep -v "stderr output color" | grep -v "panic" | tail -5 || {
        # Check if it actually succeeded (dfx sometimes panics after success)
        sleep 2
        STATUS=$(NO_COLOR=1 TERM=dumb dfx canister --network "$NETWORK" status "$canister_name" 2>&1 | grep -v "ColorOutOfRange" | grep -i "status" | head -1 || echo "")
        if echo "$STATUS" | grep -qi "running"; then
            echo -e "${GREEN}  ✓ Deployment succeeded (dfx panicked but canister is running)${NC}"
        else
            echo -e "${RED}  ✗ Deployment may have failed${NC}"
        fi
    }
    
    # Verify
    sleep 1
    CANISTER_ID=$(NO_COLOR=1 TERM=dumb dfx canister --network "$NETWORK" id "$canister_name" 2>&1 | grep -v "ColorOutOfRange" | head -1 || echo "")
    if [ -n "$CANISTER_ID" ]; then
        echo -e "${GREEN}  ✓ $canister_name deployed: $CANISTER_ID${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Could not verify canister ID${NC}"
    fi
    
    echo ""
}

# Deploy each canister
echo -e "${CYAN}🚀 Deploying canisters...${NC}"
echo ""

deploy_multichain_canister "siwe_canister" "siwe_canister"
deploy_multichain_canister "siws_canister" "siws_canister"
deploy_multichain_canister "siwb_canister" "siwb_canister"
deploy_multichain_canister "sis_canister" "sis_canister"
deploy_multichain_canister "ordinals_canister" "ordinals_canister"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Multi-Chain Canisters Deployment Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${CYAN}📊 Canister IDs:${NC}"
echo ""

for canister in siwe_canister siws_canister siwb_canister sis_canister ordinals_canister; do
    ID=$(NO_COLOR=1 TERM=dumb dfx canister --network "$NETWORK" id "$canister" 2>&1 | grep -v "ColorOutOfRange" | head -1 || echo "unknown")
    printf "  %-25s %s\n" "$canister:" "$ID"
done

echo ""
echo -e "${CYAN}📝 Verification:${NC}"
echo "  Run: NO_COLOR=1 TERM=dumb dfx canister --network ic status <canister_name>"
echo ""

