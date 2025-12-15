#!/bin/bash
# Complete deployment script for DeepSeek R1 architecture
# Runs all steps sequentially

set -e

NETWORK="ic"
export DFX_WARNING=-mainnet_plaintext_identity
export TERM=xterm-256color

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

echo "=========================================="
echo "DeepSeek R1 Architecture - Complete Deployment"
echo "=========================================="
echo ""

# Step 1: Kill any existing deployments
echo "Step 1: Cleaning up existing processes..."
pkill -f "dfx deploy" 2>/dev/null || true
pkill -f "dfx canister create" 2>/dev/null || true
sleep 2
echo "✅ Cleanup complete"
echo ""

# Step 2: Create canisters
echo "Step 2: Creating canisters..."
echo "Creating deepseek_model..."
dfx canister create deepseek_model --network $NETWORK 2>&1 | grep -E "(Creating|Created|already exists)" || echo "deepseek_model canister ready"
echo "Creating vector_db..."
dfx canister create vector_db --network $NETWORK 2>&1 | grep -E "(Creating|Created|already exists)" || echo "vector_db canister ready"
echo "Creating queen_bee..."
dfx canister create queen_bee --network $NETWORK 2>&1 | grep -E "(Creating|Created|already exists)" || echo "queen_bee canister ready"
echo "✅ Canisters created"
echo ""

# Step 3: Deploy canisters
echo "Step 3: Deploying canisters..."
echo "Deploying deepseek_model..."
dfx deploy deepseek_model --network $NETWORK
echo "✅ deepseek_model deployed"

echo "Deploying vector_db..."
dfx deploy vector_db --network $NETWORK
echo "✅ vector_db deployed"

echo "Deploying queen_bee..."
dfx deploy queen_bee --network $NETWORK
echo "✅ queen_bee deployed"
echo ""

# Step 4: Get canister IDs
echo "Step 4: Getting canister IDs..."
DEEPSEEK_ID=$(dfx canister id deepseek_model --network $NETWORK)
VECTOR_DB_ID=$(dfx canister id vector_db --network $NETWORK)
QUEEN_BEE_ID=$(dfx canister id queen_bee --network $NETWORK)

echo "DeepSeek Model ID: $DEEPSEEK_ID"
echo "Vector DB ID: $VECTOR_DB_ID"
echo "Queen Bee ID: $QUEEN_BEE_ID"
echo ""

# Step 5: Register canisters with queen_bee
echo "Step 5: Registering canisters with queen_bee..."
echo "Registering deepseek_model..."
dfx canister call queen_bee register_model_canister "(1, principal \"$DEEPSEEK_ID\")" --network $NETWORK
echo "Registering vector_db..."
dfx canister call queen_bee register_vector_db_canister "(1, principal \"$VECTOR_DB_ID\")" --network $NETWORK
echo "✅ Canisters registered"
echo ""

# Step 6: Update axiom_nft configuration
echo "Step 6: Updating axiom_nft configuration..."
sed -i.bak "s|const QUEEN_BEE_CANISTER: &str = \"\";|const QUEEN_BEE_CANISTER: &str = \"$QUEEN_BEE_ID\";|" backend/axiom_nft/src/lib.rs
sed -i.bak "s|const USE_QUEEN_BEE: bool = false;|const USE_QUEEN_BEE: bool = true;|" backend/axiom_nft/src/lib.rs
echo "✅ axiom_nft configuration updated"
echo "  QUEEN_BEE_CANISTER = \"$QUEEN_BEE_ID\""
echo "  USE_QUEEN_BEE = true"
echo ""

# Step 7: Build updated axiom_nft
echo "Step 7: Building updated axiom_nft..."
cargo build --release --package axiom_nft
echo "✅ axiom_nft built"
echo ""

# Step 8: Deploy updated axiom_nft canisters
echo "Step 8: Deploying updated axiom_nft canisters..."
echo "Deploying axiom_1..."
dfx deploy axiom_1 --network $NETWORK
echo "✅ axiom_1 deployed"

echo "Deploying axiom_2..."
dfx deploy axiom_2 --network $NETWORK
echo "✅ axiom_2 deployed"

echo "Deploying axiom_3..."
dfx deploy axiom_3 --network $NETWORK
echo "✅ axiom_3 deployed"

echo "Deploying axiom_4..."
dfx deploy axiom_4 --network $NETWORK
echo "✅ axiom_4 deployed"

echo "Deploying axiom_5..."
dfx deploy axiom_5 --network $NETWORK
echo "✅ axiom_5 deployed"
echo ""

# Step 9: Test integration
echo "Step 9: Testing queen_bee integration..."
dfx canister call queen_bee get_status --network $NETWORK
echo ""

echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Canister IDs:"
echo "  deepseek_model: $DEEPSEEK_ID"
echo "  vector_db: $VECTOR_DB_ID"
echo "  queen_bee: $QUEEN_BEE_ID"
echo ""
echo "All AXIOM NFTs are now connected to Queen Bee!"
echo "Test with: dfx canister call queen_bee process_ai_request '(...)' --network ic"




