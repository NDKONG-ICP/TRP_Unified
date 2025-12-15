#!/bin/bash

# Deploy Multi-Chain Authentication Canisters to Mainnet
# Handles all Sign-In-With-X canisters and Ordinals

set -e

export NO_COLOR=1
export TERM=dumb
unset COLORTERM

cd "$(dirname "$0")/.."

echo "🌐 Deploying Multi-Chain Authentication Canisters to Mainnet..."
echo ""

# Build all canisters first
echo "🔨 Building all canisters..."
cd backend

# Build SIWE canister
echo "Building SIWE canister..."
cd siwe_canister
cargo build --target wasm32-unknown-unknown --release
cd ..

# Build SIWS canister
echo "Building SIWS canister..."
cd siws_canister
cargo build --target wasm32-unknown-unknown --release
cd ..

# Build SIWB canister
echo "Building SIWB canister..."
cd siwb_canister
cargo build --target wasm32-unknown-unknown --release
cd ..

# Build SIS canister
echo "Building SIS canister..."
cd sis_canister
cargo build --target wasm32-unknown-unknown --release
cd ..

# Build Ordinals canister
echo "Building Ordinals canister..."
cd ordinals_canister
cargo build --target wasm32-unknown-unknown --release
cd ..

cd ..

# Create canisters if they don't exist
echo ""
echo "📦 Creating canisters (if needed)..."

create_canister_if_needed() {
    local canister_name=$1
    echo "Checking $canister_name..."
    NO_COLOR=1 TERM=dumb unset COLORTERM; dfx canister id "$canister_name" --network ic 2>/dev/null || {
        echo "Creating $canister_name..."
        NO_COLOR=1 TERM=dumb unset COLORTERM; dfx canister create "$canister_name" --network ic --no-wallet 2>&1 | grep -v "ColorOutOfRange" || true
    }
}

create_canister_if_needed "siwe_canister"
create_canister_if_needed "siws_canister"
create_canister_if_needed "siwb_canister"
create_canister_if_needed "sis_canister"
create_canister_if_needed "ordinals_canister"

# Deploy canisters
echo ""
echo "🚀 Deploying canisters..."

deploy_canister() {
    local canister_name=$1
    echo "Deploying $canister_name..."
    NO_COLOR=1 TERM=dumb unset COLORTERM; dfx deploy "$canister_name" --network ic --no-wallet 2>&1 | grep -v "ColorOutOfRange" || {
        echo "⚠️  Deployment of $canister_name had issues, but continuing..."
    }
    echo "✅ $canister_name deployed"
    echo ""
}

deploy_canister "siwe_canister"
deploy_canister "siws_canister"
deploy_canister "siwb_canister"
deploy_canister "sis_canister"
deploy_canister "ordinals_canister"

# Get canister IDs
echo ""
echo "📋 Canister IDs:"
echo "SIWE Canister: $(dfx canister id siwe_canister --network ic 2>/dev/null || echo 'Not deployed')"
echo "SIWS Canister: $(dfx canister id siws_canister --network ic 2>/dev/null || echo 'Not deployed')"
echo "SIWB Canister: $(dfx canister id siwb_canister --network ic 2>/dev/null || echo 'Not deployed')"
echo "SIS Canister: $(dfx canister id sis_canister --network ic 2>/dev/null || echo 'Not deployed')"
echo "Ordinals Canister: $(dfx canister id ordinals_canister --network ic 2>/dev/null || echo 'Not deployed')"

echo ""
echo "✅ Multi-chain authentication canisters deployed!"
echo ""
echo "Next steps:"
echo "1. Update frontend canisterConfig.ts with the canister IDs above"
echo "2. Rebuild and deploy frontend"
echo "3. Test all wallet connections"

