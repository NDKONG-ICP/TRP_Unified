#!/usr/bin/env bash
# Deploy raven_ai canister to IC mainnet (plaintext output safe for Cursor terminals).

set -euo pipefail

REPO_ROOT="/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"
cd "${REPO_ROOT}"

# Ensure all dfx invocations are protected against ColorOutOfRange panics + prompts
source "./scripts/dfx_safe_env.sh"

echo "Building raven_ai canister..."
cd backend/raven_ai
cargo build --target wasm32-unknown-unknown --release
cd "${REPO_ROOT}"

echo "Deploying raven_ai to mainnet..."
echo "Note: Using --no-wallet to prevent automatic cycle top-ups"
./scripts/dfx_safe.sh deploy raven_ai --network ic --no-wallet --yes

echo "✅ raven_ai deployed successfully!"


