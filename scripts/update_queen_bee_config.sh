#!/bin/bash
# Script to update axiom_nft canisters with queen_bee canister ID

set -e

NETWORK="ic"
QUEEN_BEE_ID=$(dfx canister id queen_bee --network $NETWORK)

echo "Queen Bee Canister ID: $QUEEN_BEE_ID"
echo ""
echo "Updating axiom_nft/src/lib.rs with queen_bee canister ID..."

# Update the constant in axiom_nft
sed -i.bak "s|const QUEEN_BEE_CANISTER: &str = \"\";|const QUEEN_BEE_CANISTER: &str = \"$QUEEN_BEE_ID\";|" backend/axiom_nft/src/lib.rs
sed -i.bak "s|const USE_QUEEN_BEE: bool = false;|const USE_QUEEN_BEE: bool = true;|" backend/axiom_nft/src/lib.rs

echo "✅ Updated axiom_nft configuration!"
echo "  QUEEN_BEE_CANISTER = \"$QUEEN_BEE_ID\""
echo "  USE_QUEEN_BEE = true"
echo ""
echo "Next: Deploy updated axiom_nft canisters"




