#!/bin/bash
# Deploy raven_ai canister to mainnet with color output fixes

set -e

export NO_COLOR=1
export DFX_WARNING=-mainnet_plaintext_identity
export TERM=dumb
unset COLORTERM

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

echo "Building raven_ai canister..."
cd backend/raven_ai
cargo build --target wasm32-unknown-unknown --release
cd ../..

echo "Deploying raven_ai to mainnet..."
echo "Note: Using --no-wallet to prevent automatic cycle top-ups"
# Redirect stderr to /dev/null to avoid color panic, but capture real errors
dfx deploy raven_ai --network ic --no-wallet --yes 2>/dev/null || {
    # If that fails, try with explicit output redirection
    exec 2>&1
    dfx deploy raven_ai --network ic --no-wallet --yes
}

echo "✅ raven_ai deployed successfully!"

