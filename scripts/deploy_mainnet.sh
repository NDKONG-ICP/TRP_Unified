#!/bin/bash

# Mainnet Deployment Script for Raven Unified Ecosystem
# This script deploys all canisters to IC mainnet sequentially

set -e

# Disable color output to prevent ColorOutOfRange panic
export NO_COLOR=1

# THIS LINE IS REQUIRED FOR MAINNET DEPLOYS WITH PLAINTEXT IDENTITIES
# Must be set INSIDE the script, not just in the calling shell
export DFX_WARNING=-mainnet_plaintext_identity

echo "Deploying to mainnet with identity: $(dfx identity whoami --network ic 2>/dev/null || echo 'unknown')"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Network
NETWORK="ic"

# Project root
PROJECT_ROOT="/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"
cd "$PROJECT_ROOT"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Raven Unified Ecosystem - Mainnet Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo -e "${RED}Error: dfx is not installed or not in PATH${NC}"
    exit 1
fi

# Check if logged in
echo -e "${YELLOW}Checking authentication...${NC}"
if ! dfx identity whoami --network "$NETWORK" &> /dev/null; then
    echo -e "${RED}Error: Not authenticated. Please run: dfx identity use <identity>${NC}"
    exit 1
fi

IDENTITY=$(dfx identity whoami --network "$NETWORK")
echo -e "${GREEN}Using identity: ${IDENTITY}${NC}"
echo ""

# Function to create canister if it doesn't exist
create_canister_if_needed() {
    local canister_name=$1
    echo -e "${YELLOW}Checking canister: ${canister_name}...${NC}"
    
    # DFX_WARNING is already exported at script level
    if ! dfx canister id "$canister_name" --network "$NETWORK" &> /dev/null; then
        echo -e "${YELLOW}Creating canister: ${canister_name}...${NC}"
        dfx canister create "$canister_name" --network "$NETWORK" || {
            echo -e "${RED}Failed to create canister: ${canister_name}${NC}"
            return 1
        }
        echo -e "${GREEN}✓ Created canister: ${canister_name}${NC}"
    else
        CANISTER_ID=$(dfx canister id "$canister_name" --network "$NETWORK")
        echo -e "${GREEN}✓ Canister exists: ${canister_name} (${CANISTER_ID})${NC}"
    fi
    echo ""
}

# Function to deploy canister
deploy_canister() {
    local canister_name=$1
    local init_args=${2:-}
    
    echo -e "${BLUE}Deploying ${canister_name}...${NC}"
    
    # DFX_WARNING is already exported at script level, no need to set again
    # Use --no-wallet to prevent stalling issues
    if [ -n "$init_args" ]; then
        TERM=xterm-256color dfx deploy "$canister_name" --network "$NETWORK" --argument "$init_args" --no-wallet --yes || {
            echo -e "${RED}Failed to deploy: ${canister_name}${NC}"
            return 1
        }
    else
        TERM=xterm-256color dfx deploy "$canister_name" --network "$NETWORK" --no-wallet --yes || {
            echo -e "${RED}Failed to deploy: ${canister_name}${NC}"
            return 1
        }
    fi
    
    CANISTER_ID=$(dfx canister id "$canister_name" --network "$NETWORK")
    echo -e "${GREEN}✓ Deployed ${canister_name} (${CANISTER_ID})${NC}"
    echo ""
}

# Step 1: Create canisters that don't exist
echo -e "${BLUE}Step 1: Creating canisters...${NC}"
echo ""

# New canisters
create_canister_if_needed "deepseek_model"
create_canister_if_needed "vector_db"
create_canister_if_needed "queen_bee"
create_canister_if_needed "staking"

# Step 2: Build all canisters
echo -e "${BLUE}Step 2: Building canisters...${NC}"
echo ""

echo -e "${YELLOW}Building backend canisters...${NC}"
cd backend
cargo build --target wasm32-unknown-unknown --release 2>&1 | grep -E "(Finished|error)" | tail -5
cd ..
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 3: Deploy canisters
echo -e "${BLUE}Step 3: Deploying canisters...${NC}"
echo ""

# Deploy new canisters first
deploy_canister "deepseek_model"
deploy_canister "vector_db"
deploy_canister "queen_bee"

# Deploy staking canister (no init args needed)
deploy_canister "staking"

# Deploy existing canisters
deploy_canister "raven_ai"
deploy_canister "core"
deploy_canister "nft"
deploy_canister "kip"
deploy_canister "treasury"
deploy_canister "escrow"
deploy_canister "logistics"
deploy_canister "ai_engine"

# Skip AXIOM NFT canisters - they require special init arguments
# Deploy them separately using: bash deploy_axioms.sh
echo -e "${YELLOW}Skipping AXIOM canisters (deploy separately with init args if needed)${NC}"
echo ""

# Deploy frontend
echo -e "${BLUE}Deploying frontend...${NC}"
deploy_canister "assets"
echo ""

# Step 4: Register canisters with queen_bee
echo -e "${BLUE}Step 4: Registering canisters with queen_bee...${NC}"
echo ""

QUEEN_BEE_ID=$(dfx canister id "queen_bee" --network "$NETWORK")
DEEPSEEK_MODEL_ID=$(dfx canister id "deepseek_model" --network "$NETWORK")
VECTOR_DB_ID=$(dfx canister id "vector_db" --network "$NETWORK")

if [ -n "$QUEEN_BEE_ID" ] && [ -n "$DEEPSEEK_MODEL_ID" ] && [ -n "$VECTOR_DB_ID" ]; then
    echo -e "${YELLOW}Registering deepseek_model with queen_bee...${NC}"
    dfx canister call queen_bee register_model_canister "(\"$DEEPSEEK_MODEL_ID\")" --network "$NETWORK" || echo -e "${YELLOW}Warning: Registration failed (may already be registered)${NC}"
    
    echo -e "${YELLOW}Registering vector_db with queen_bee...${NC}"
    dfx canister call queen_bee register_vector_db_canister "(\"$VECTOR_DB_ID\")" --network "$NETWORK" || echo -e "${YELLOW}Warning: Registration failed (may already be registered)${NC}"
    
    echo -e "${GREEN}✓ Registration complete${NC}"
else
    echo -e "${YELLOW}Warning: Could not register canisters (IDs not found)${NC}"
fi
echo ""

# Step 5: Update AXIOM NFT canisters with queen_bee config
echo -e "${BLUE}Step 5: Updating AXIOM NFT canisters...${NC}"
echo ""

if [ -n "$QUEEN_BEE_ID" ]; then
    for i in {1..5}; do
        if dfx canister id "axiom_$i" --network "$NETWORK" &> /dev/null; then
            echo -e "${YELLOW}Updating axiom_$i with queen_bee config...${NC}"
            dfx canister call "axiom_$i" set_queen_bee_canister "(\"$QUEEN_BEE_ID\")" --network "$NETWORK" || echo -e "${YELLOW}Warning: Failed to update axiom_$i${NC}"
            dfx canister call "axiom_$i" set_use_queen_bee "(true)" --network "$NETWORK" || echo -e "${YELLOW}Warning: Failed to enable queen_bee for axiom_$i${NC}"
        fi
    done
    echo -e "${GREEN}✓ AXIOM NFT canisters updated${NC}"
else
    echo -e "${YELLOW}Warning: Queen bee ID not found, skipping AXIOM updates${NC}"
fi
echo ""

# Step 6: Display deployment summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Deployment Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${GREEN}Deployed Canisters:${NC}"
echo "  - deepseek_model: $(dfx canister id deepseek_model --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo "  - vector_db: $(dfx canister id vector_db --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo "  - queen_bee: $(dfx canister id queen_bee --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo "  - staking: $(dfx canister id staking --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo "  - raven_ai: $(dfx canister id raven_ai --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo "  - core: $(dfx canister id core --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo "  - nft: $(dfx canister id nft --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo "  - kip: $(dfx canister id kip --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo "  - assets: $(dfx canister id assets --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo ""

echo -e "${GREEN}Next Steps:${NC}"
echo "  1. Update frontend .env files with new canister IDs"
echo "  2. Test all integrations"
echo "  3. Verify canister registrations"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${BLUE}========================================${NC}"

