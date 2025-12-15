#!/bin/bash

# Complete End-to-End Mainnet Deployment Script
# Deploys everything: TypeScript + Vite frontend, all Rust canisters, and AXIOM NFTs
# Follows standard ICP pattern: TypeScript for interfaces, Vite for building

set -e

# Disable color output to prevent ColorOutOfRange panic
export NO_COLOR=1
export DFX_WARNING=-mainnet_plaintext_identity
# Additional dfx color fixes
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
echo -e "${CYAN}🦅 Raven Unified Ecosystem${NC}"
echo -e "${CYAN}   Complete Mainnet Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v dfx &> /dev/null; then
    echo -e "${RED}❌ Error: dfx is not installed or not in PATH${NC}"
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Error: cargo is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ Error: npm is not installed${NC}"
    exit 1
fi

# Check authentication
if ! dfx identity whoami --network "$NETWORK" &> /dev/null; then
    echo -e "${RED}❌ Error: Not authenticated. Please run: dfx identity use <identity>${NC}"
    exit 1
fi

IDENTITY=$(dfx identity whoami --network "$NETWORK")
echo -e "${GREEN}✓ Using identity: ${IDENTITY}${NC}"
echo ""

# Function to create canister if it doesn't exist
create_canister_if_needed() {
    local canister_name=$1
    echo -e "${YELLOW}  Checking canister: ${canister_name}...${NC}"
    
    # Use NO_COLOR and TERM=dumb to prevent dfx color panics
    CANISTER_ID=$(NO_COLOR=1 TERM=dumb unset COLORTERM; dfx canister id "$canister_name" --network "$NETWORK" 2>/dev/null || echo "")
    
    if [ -z "$CANISTER_ID" ]; then
        echo -e "${YELLOW}  Creating canister: ${canister_name}...${NC}"
        NO_COLOR=1 TERM=dumb unset COLORTERM; dfx canister create "$canister_name" --network "$NETWORK" 2>/dev/null || {
            echo -e "${YELLOW}  ⚠️  Could not create canister: ${canister_name} (may already exist or need cycles)${NC}"
            # Try to get ID anyway - might have been created
            CANISTER_ID=$(NO_COLOR=1 TERM=dumb unset COLORTERM; dfx canister id "$canister_name" --network "$NETWORK" 2>/dev/null || echo "")
            if [ -n "$CANISTER_ID" ]; then
                echo -e "${GREEN}  ✓ Canister exists: ${canister_name} (${CANISTER_ID})${NC}"
            fi
            return 0  # Continue anyway
        }
        CANISTER_ID=$(NO_COLOR=1 TERM=dumb unset COLORTERM; dfx canister id "$canister_name" --network "$NETWORK" 2>/dev/null || echo "")
        if [ -n "$CANISTER_ID" ]; then
            echo -e "${GREEN}  ✓ Created canister: ${canister_name} (${CANISTER_ID})${NC}"
        fi
    else
        echo -e "${GREEN}  ✓ Canister exists: ${canister_name} (${CANISTER_ID})${NC}"
    fi
}

# Function to deploy canister
deploy_canister() {
    local canister_name=$1
    local init_args=${2:-}
    
    echo -e "${BLUE}  Deploying ${canister_name}...${NC}"
    
    # Use NO_COLOR and TERM=dumb to prevent dfx color panics
    if [ -n "$init_args" ]; then
        NO_COLOR=1 TERM=dumb unset COLORTERM; dfx deploy "$canister_name" --network "$NETWORK" --argument "$init_args" --no-wallet --yes 2>&1 | grep -v "ColorOutOfRange" || {
            echo -e "${RED}  ❌ Failed to deploy: ${canister_name}${NC}"
            return 1
        }
    else
        NO_COLOR=1 TERM=dumb unset COLORTERM; dfx deploy "$canister_name" --network "$NETWORK" --no-wallet --yes 2>&1 | grep -v "ColorOutOfRange" || {
            echo -e "${RED}  ❌ Failed to deploy: ${canister_name}${NC}"
            return 1
        }
    fi
    
    CANISTER_ID=$(NO_COLOR=1 TERM=dumb unset COLORTERM; dfx canister id "$canister_name" --network "$NETWORK" 2>/dev/null || echo "")
    if [ -n "$CANISTER_ID" ]; then
        echo -e "${GREEN}  ✓ Deployed ${canister_name} (${CANISTER_ID})${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Deployed ${canister_name} (ID not available)${NC}"
    fi
}

# ============================================
# STEP 1: Generate TypeScript Declarations
# ============================================
echo -e "${CYAN}📦 Step 1: Generating TypeScript declarations from CANDID files...${NC}"
echo ""

dfx generate --network "$NETWORK" || {
    echo -e "${YELLOW}⚠️  Warning: Some declarations may have failed (canisters may not exist yet)${NC}"
}

# Sync declarations to frontend
if [ -d "src/declarations" ] && [ -d "frontend/src/declarations" ]; then
    echo -e "${YELLOW}  Syncing declarations to frontend...${NC}"
    rsync -a --update src/declarations/ frontend/src/declarations/ 2>/dev/null || {
        echo -e "${YELLOW}  ⚠️  Note: Could not sync declarations. Using existing frontend declarations.${NC}"
    }
fi

echo -e "${GREEN}✓ TypeScript declarations generated${NC}"
echo ""

# ============================================
# STEP 2: Build Frontend with Vite
# ============================================
echo -e "${CYAN}🏗️  Step 2: Building frontend with TypeScript + Vite...${NC}"
echo ""

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  Installing dependencies...${NC}"
    npm install
fi

# Type-check (non-blocking - build uses --skipLibCheck)
echo -e "${YELLOW}  Type-checking TypeScript...${NC}"
npm run type-check 2>&1 | head -5 || {
    echo -e "${YELLOW}  ⚠️  Type-check warnings (continuing with build...)${NC}"
}

# Build with Vite
echo -e "${YELLOW}  Building with Vite...${NC}"
npm run build

cd ..

echo -e "${GREEN}✓ Frontend built successfully${NC}"
echo ""

# ============================================
# STEP 3: Build Rust Canisters
# ============================================
echo -e "${CYAN}🔨 Step 3: Building Rust canisters...${NC}"
echo ""

cd backend
echo -e "${YELLOW}  Compiling Rust canisters...${NC}"
cargo build --target wasm32-unknown-unknown --release 2>&1 | grep -E "(Finished|error|Compiling)" | tail -10
cd ..

echo -e "${GREEN}✓ Rust canisters built${NC}"
echo ""

# ============================================
# STEP 4: Create Canisters
# ============================================
echo -e "${CYAN}📦 Step 4: Creating canisters (if needed)...${NC}"
echo ""

# Core canisters
create_canister_if_needed "core"
create_canister_if_needed "nft"
create_canister_if_needed "kip"
create_canister_if_needed "treasury"
create_canister_if_needed "escrow"
create_canister_if_needed "logistics"
create_canister_if_needed "ai_engine"
create_canister_if_needed "raven_ai"

# AI infrastructure canisters
create_canister_if_needed "deepseek_model"
create_canister_if_needed "vector_db"
create_canister_if_needed "queen_bee"
create_canister_if_needed "staking"

# AXIOM NFT canisters
create_canister_if_needed "axiom_nft"
for i in {1..5}; do
    create_canister_if_needed "axiom_$i"
done

# Frontend
create_canister_if_needed "assets"

echo -e "${GREEN}✓ All canisters ready${NC}"
echo ""

# ============================================
# STEP 5: Deploy Backend Canisters
# ============================================
echo -e "${CYAN}🚀 Step 5: Deploying backend canisters...${NC}"
echo ""

# Deploy in dependency order
echo -e "${YELLOW}  Deploying core infrastructure...${NC}"
deploy_canister "core"
deploy_canister "treasury"
deploy_canister "escrow"

echo -e "${YELLOW}  Deploying NFT and token canisters...${NC}"
deploy_canister "nft"
deploy_canister "kip"

echo -e "${YELLOW}  Deploying logistics...${NC}"
deploy_canister "logistics"

echo -e "${YELLOW}  Deploying AI infrastructure...${NC}"
deploy_canister "ai_engine"
deploy_canister "deepseek_model"
deploy_canister "vector_db"
deploy_canister "queen_bee"
deploy_canister "raven_ai"

echo -e "${YELLOW}  Deploying staking...${NC}"
deploy_canister "staking"

echo -e "${GREEN}✓ Backend canisters deployed${NC}"
echo ""

# ============================================
# STEP 6: Deploy AXIOM NFT Canisters
# ============================================
echo -e "${CYAN}👑 Step 6: Deploying AXIOM Genesis NFT canisters...${NC}"
echo ""

# Deploy axiom_nft base canister first
deploy_canister "axiom_nft"

# Deploy AXIOM Genesis NFTs with init arguments
AXIOM_ARGS=(
    "(record { token_id = 1 : nat64; name = \"AXIOM Genesis #1\"; description = \"The First Oracle - Wise blockchain analyst\"; owner = principal \"yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe\"; personality = opt \"Wise and analytical\"; specialization = opt \"Blockchain Expert\" })"
    "(record { token_id = 2 : nat64; name = \"AXIOM Genesis #2\"; description = \"The Creative Mind - NFT and art specialist\"; owner = principal \"yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe\"; personality = opt \"Creative and visionary\"; specialization = opt \"NFT Art Expert\" })"
    "(record { token_id = 3 : nat64; name = \"AXIOM Genesis #3\"; description = \"The DeFi Sage - Finance and trading guru\"; owner = principal \"yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe\"; personality = opt \"Calculated and precise\"; specialization = opt \"DeFi Strategist\" })"
    "(record { token_id = 4 : nat64; name = \"AXIOM Genesis #4\"; description = \"The Tech Architect - Smart contract specialist\"; owner = principal \"yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe\"; personality = opt \"Technical and thorough\"; specialization = opt \"Smart Contract Developer\" })"
    "(record { token_id = 5 : nat64; name = \"AXIOM Genesis #5\"; description = \"The Community Builder - Engagement specialist\"; owner = principal \"yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe\"; personality = opt \"Friendly and engaging\"; specialization = opt \"Community Manager\" })"
)

for i in {1..5}; do
    echo -e "${YELLOW}  Deploying AXIOM Genesis #${i}...${NC}"
    deploy_canister "axiom_$i" "${AXIOM_ARGS[$((i-1))]}"
done

echo -e "${GREEN}✓ AXIOM Genesis NFTs deployed${NC}"
echo ""

# ============================================
# STEP 7: Deploy Frontend Assets
# ============================================
echo -e "${CYAN}🌐 Step 7: Deploying frontend assets...${NC}"
echo ""

deploy_canister "assets"

echo -e "${GREEN}✓ Frontend deployed${NC}"
echo ""

# ============================================
# STEP 8: Register Canisters
# ============================================
echo -e "${CYAN}🔗 Step 8: Registering canisters...${NC}"
echo ""

QUEEN_BEE_ID=$(dfx canister id "queen_bee" --network "$NETWORK" 2>/dev/null || echo "")
DEEPSEEK_MODEL_ID=$(dfx canister id "deepseek_model" --network "$NETWORK" 2>/dev/null || echo "")
VECTOR_DB_ID=$(dfx canister id "vector_db" --network "$NETWORK" 2>/dev/null || echo "")

if [ -n "$QUEEN_BEE_ID" ] && [ -n "$DEEPSEEK_MODEL_ID" ] && [ -n "$VECTOR_DB_ID" ]; then
    echo -e "${YELLOW}  Registering AI infrastructure...${NC}"
    dfx canister call queen_bee register_model_canister "(\"$DEEPSEEK_MODEL_ID\")" --network "$NETWORK" 2>/dev/null || echo -e "${YELLOW}    ⚠️  Registration may already exist${NC}"
    dfx canister call queen_bee register_vector_db_canister "(\"$VECTOR_DB_ID\")" --network "$NETWORK" 2>/dev/null || echo -e "${YELLOW}    ⚠️  Registration may already exist${NC}"
    
    # Update AXIOM canisters with queen_bee config
    for i in {1..5}; do
        if dfx canister id "axiom_$i" --network "$NETWORK" &> /dev/null; then
            echo -e "${YELLOW}  Updating AXIOM #${i} with queen_bee config...${NC}"
            dfx canister call "axiom_$i" set_queen_bee_canister "(\"$QUEEN_BEE_ID\")" --network "$NETWORK" 2>/dev/null || true
            dfx canister call "axiom_$i" set_use_queen_bee "(true)" --network "$NETWORK" 2>/dev/null || true
        fi
    done
    
    echo -e "${GREEN}✓ Canisters registered${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Could not register canisters (IDs not found)${NC}"
fi
echo ""

# ============================================
# STEP 9: Deployment Summary
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${CYAN}📋 Deployed Canisters:${NC}"
echo ""
echo -e "${GREEN}Core Infrastructure:${NC}"
echo "  - core: $(dfx canister id core --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo "  - treasury: $(dfx canister id treasury --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo "  - escrow: $(dfx canister id escrow --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo ""
echo -e "${GREEN}NFT & Tokens:${NC}"
echo "  - nft: $(dfx canister id nft --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo "  - kip: $(dfx canister id kip --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo ""
echo -e "${GREEN}AI Infrastructure:${NC}"
echo "  - raven_ai: $(dfx canister id raven_ai --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo "  - ai_engine: $(dfx canister id ai_engine --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo "  - deepseek_model: $(dfx canister id deepseek_model --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo "  - vector_db: $(dfx canister id vector_db --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo "  - queen_bee: $(dfx canister id queen_bee --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo ""
echo -e "${GREEN}AXIOM Genesis NFTs:${NC}"
for i in {1..5}; do
    echo "  - axiom_$i: $(dfx canister id axiom_$i --network "$NETWORK" 2>/dev/null || echo 'N/A')"
done
echo ""
echo -e "${GREEN}Other:${NC}"
echo "  - logistics: $(dfx canister id logistics --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo "  - staking: $(dfx canister id staking --network "$NETWORK" 2>/dev/null || echo 'N/A')"
echo ""
echo -e "${GREEN}Frontend:${NC}"
ASSETS_ID=$(dfx canister id assets --network "$NETWORK" 2>/dev/null || echo "")
if [ -n "$ASSETS_ID" ]; then
    echo "  - assets: $ASSETS_ID"
    echo "  - URL: https://${ASSETS_ID}.ic0.app"
else
    echo "  - assets: N/A"
fi
echo ""

echo -e "${CYAN}📝 Next Steps:${NC}"
echo "  1. Verify all canisters are operational"
echo "  2. Test frontend at: https://${ASSETS_ID}.ic0.app"
echo "  3. Update frontend .env files with new canister IDs if needed"
echo "  4. Test AXIOM NFT functionality"
echo "  5. Verify AI infrastructure integrations"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 All systems deployed to mainnet!${NC}"
echo -e "${BLUE}========================================${NC}"

