#!/bin/bash
# Script to register canisters with queen_bee after deployment

set -e

NETWORK="ic"

echo "Getting canister IDs..."
DEEPSEEK_ID=$(dfx canister id deepseek_model --network $NETWORK)
VECTOR_DB_ID=$(dfx canister id vector_db --network $NETWORK)
QUEEN_BEE_ID=$(dfx canister id queen_bee --network $NETWORK)

echo "DeepSeek Model ID: $DEEPSEEK_ID"
echo "Vector DB ID: $VECTOR_DB_ID"
echo "Queen Bee ID: $QUEEN_BEE_ID"

echo ""
echo "Registering canisters with queen_bee..."

# Register model canister
echo "Registering deepseek_model..."
dfx canister call queen_bee register_model_canister "(1, principal \"$DEEPSEEK_ID\")" --network $NETWORK

# Register vector DB canister
echo "Registering vector_db..."
dfx canister call queen_bee register_vector_db_canister "(1, principal \"$VECTOR_DB_ID\")" --network $NETWORK

echo ""
echo "✅ Canisters registered successfully!"
echo ""
echo "Next: Update axiom_nft canisters to use queen_bee:"
echo "  QUEEN_BEE_CANISTER = \"$QUEEN_BEE_ID\""
echo "  USE_QUEEN_BEE = true"




