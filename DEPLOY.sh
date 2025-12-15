#!/bin/bash

# Raven Ecosystem Deployment Script
# This script deploys the entire unified ecosystem to mainnet

set -e

echo "🦅 Raven Ecosystem Deployment"
echo "=============================="
echo ""

# Check if dfx is available
if ! command -v dfx &> /dev/null; then
    echo "❌ dfx not found. Please install dfx first."
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")"

echo "📁 Project directory: $(pwd)"
echo ""

# Check network
NETWORK=${1:-ic}
echo "🌐 Deploying to network: $NETWORK"
echo ""

# Build frontend
echo "🔨 Building frontend..."
cd frontend
npm install
npm run build
cd ..
echo "✅ Frontend built"
echo ""

# Deploy canisters
echo "🚀 Deploying canisters..."

if [ "$NETWORK" == "ic" ]; then
    echo "Deploying to IC mainnet..."
    
    # Create canisters if they don't exist
    echo "Creating canisters..."
    dfx canister --network ic create --all 2>/dev/null || true
    
    # Deploy each canister
    echo "Deploying core canister..."
    dfx deploy --network ic core || echo "Core deployment needs cycles"
    
    echo "Deploying nft canister..."
    dfx deploy --network ic nft || echo "NFT deployment needs cycles"
    
    echo "Deploying kip canister..."
    dfx deploy --network ic kip || echo "KIP deployment needs cycles"
    
    echo "Deploying treasury canister..."
    dfx deploy --network ic treasury || echo "Treasury deployment needs cycles"
    
    echo "Deploying escrow canister..."
    dfx deploy --network ic escrow || echo "Escrow deployment needs cycles"
    
    echo "Deploying logistics canister..."
    dfx deploy --network ic logistics || echo "Logistics deployment needs cycles"
    
    echo "Deploying ai_engine canister..."
    dfx deploy --network ic ai_engine || echo "AI Engine deployment needs cycles"
    
    echo "Deploying assets canister..."
    dfx deploy --network ic assets || echo "Assets deployment needs cycles"
    
else
    echo "Deploying to local replica..."
    dfx start --background 2>/dev/null || true
    dfx deploy --all
fi

echo ""
echo "✅ Deployment complete!"
echo ""

# Get canister IDs
echo "📋 Canister IDs:"
dfx canister --network $NETWORK id core 2>/dev/null || echo "core: not deployed"
dfx canister --network $NETWORK id nft 2>/dev/null || echo "nft: not deployed"
dfx canister --network $NETWORK id kip 2>/dev/null || echo "kip: not deployed"
dfx canister --network $NETWORK id treasury 2>/dev/null || echo "treasury: not deployed"
dfx canister --network $NETWORK id escrow 2>/dev/null || echo "escrow: not deployed"
dfx canister --network $NETWORK id logistics 2>/dev/null || echo "logistics: not deployed"
dfx canister --network $NETWORK id ai_engine 2>/dev/null || echo "ai_engine: not deployed"
dfx canister --network $NETWORK id assets 2>/dev/null || echo "assets: not deployed"

echo ""
if [ "$NETWORK" == "ic" ]; then
    ASSETS_ID=$(dfx canister --network ic id assets 2>/dev/null || echo "")
    if [ -n "$ASSETS_ID" ]; then
        echo "🌐 Frontend URL: https://${ASSETS_ID}.icp0.io"
    fi
else
    ASSETS_ID=$(dfx canister id assets 2>/dev/null || echo "")
    if [ -n "$ASSETS_ID" ]; then
        echo "🌐 Frontend URL: http://${ASSETS_ID}.localhost:4943"
    fi
fi






