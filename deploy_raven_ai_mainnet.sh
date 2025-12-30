#!/bin/bash
set -e

# Source safe environment
source "$(dirname "$0")/scripts/dfx_safe_env.sh"

echo "=== Building and Deploying RavenAI to Mainnet ==="

# Build the raven_ai canister
echo "Building raven_ai..."
cargo build --target wasm32-unknown-unknown --release -p raven_ai

# Deploy to mainnet
echo "Deploying raven_ai to mainnet..."
dfx deploy raven_ai --network ic

echo "=== RavenAI Deployment Complete ==="
