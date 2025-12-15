#!/bin/bash

# Deploy Frontend Assets to Mainnet
# Handles dfx color issues

set -e

export NO_COLOR=1
export TERM=dumb
unset COLORTERM

cd "$(dirname "$0")/.."

echo "🌐 Deploying frontend assets to mainnet..."

# Build frontend first
echo "🔨 Building frontend..."
cd frontend
npm run build
cd ..

# Deploy assets canister
echo "📦 Deploying assets canister..."
dfx deploy assets --network ic --no-wallet --yes 2>&1 | grep -v "ColorOutOfRange" || {
    # If deployment fails due to color, try without filtering
    dfx deploy assets --network ic --no-wallet --yes
}

ASSETS_ID=$(dfx canister id assets --network ic 2>/dev/null || echo "")

if [ -n "$ASSETS_ID" ]; then
    echo ""
    echo "✅ Frontend deployed successfully!"
    echo "🌐 URL: https://${ASSETS_ID}.ic0.app"
else
    echo ""
    echo "⚠️  Deployment completed but could not retrieve canister ID"
fi

