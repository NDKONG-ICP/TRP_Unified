#!/bin/bash
# Deploy 5 Genesis AXIOM NFT Canisters to Mainnet
# This script deploys each AXIOM canister with proper init arguments

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

export TERM=dumb
export NO_COLOR=1

OWNER="yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe"

echo "Starting AXIOM Genesis NFT Deployment..."
echo "========================================="

# Deploy AXIOM #1
echo "Deploying AXIOM Genesis #1..."
dfx deploy axiom_1 --network ic --yes --argument "(record { token_id = 1 : nat64; name = \"AXIOM Genesis #1\"; description = \"The First Oracle - Wise blockchain analyst\"; owner = principal \"$OWNER\"; personality = opt \"Wise and analytical\"; specialization = opt \"Blockchain Expert\" })" 2>&1

# Deploy AXIOM #2
echo "Deploying AXIOM Genesis #2..."
dfx deploy axiom_2 --network ic --yes --argument "(record { token_id = 2 : nat64; name = \"AXIOM Genesis #2\"; description = \"The Creative Mind - NFT and art specialist\"; owner = principal \"$OWNER\"; personality = opt \"Creative and visionary\"; specialization = opt \"NFT Art Expert\" })" 2>&1

# Deploy AXIOM #3
echo "Deploying AXIOM Genesis #3..."
dfx deploy axiom_3 --network ic --yes --argument "(record { token_id = 3 : nat64; name = \"AXIOM Genesis #3\"; description = \"The DeFi Sage - Finance and trading guru\"; owner = principal \"$OWNER\"; personality = opt \"Calculated and precise\"; specialization = opt \"DeFi Strategist\" })" 2>&1

# Deploy AXIOM #4
echo "Deploying AXIOM Genesis #4..."
dfx deploy axiom_4 --network ic --yes --argument "(record { token_id = 4 : nat64; name = \"AXIOM Genesis #4\"; description = \"The Tech Architect - Smart contract specialist\"; owner = principal \"$OWNER\"; personality = opt \"Technical and thorough\"; specialization = opt \"Smart Contract Developer\" })" 2>&1

# Deploy AXIOM #5
echo "Deploying AXIOM Genesis #5..."
dfx deploy axiom_5 --network ic --yes --argument "(record { token_id = 5 : nat64; name = \"AXIOM Genesis #5\"; description = \"The Community Builder - Engagement specialist\"; owner = principal \"$OWNER\"; personality = opt \"Friendly and engaging\"; specialization = opt \"Community Manager\" })" 2>&1

echo "========================================="
echo "AXIOM Genesis NFT Deployment Complete!"
echo "Checking canister status..."

dfx canister status axiom_1 --network ic 2>&1 | head -5
dfx canister status axiom_2 --network ic 2>&1 | head -5
dfx canister status axiom_3 --network ic 2>&1 | head -5
dfx canister status axiom_4 --network ic 2>&1 | head -5
dfx canister status axiom_5 --network ic 2>&1 | head -5

echo "Done!"




