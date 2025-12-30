#!/bin/bash

# Deploy Frontend Assets to Mainnet
# Uses the repo-local dfx safe wrapper to avoid ColorOutOfRange / broken-pipe issues

set -e

cd "$(dirname "$0")/.."

echo "🌐 Deploying frontend assets to mainnet..."

# Sync declarations into the frontend (so new canister methods are available)
if [ -d "src/declarations" ] && [ -d "frontend/src/declarations" ]; then
  echo "📋 Syncing canister declarations into frontend..."
  rsync -a --delete src/declarations/ frontend/src/declarations/
fi

# Build frontend first
echo "🔨 Building frontend..."
cd frontend
npm run build
cd ..

# Deploy assets canister
echo "📦 Deploying assets canister..."
./scripts/dfx_safe.sh deploy assets --network ic --no-wallet --yes

ASSETS_ID=$(./scripts/dfx_safe.sh canister id assets --network ic 2>/dev/null || echo "")

if [ -n "$ASSETS_ID" ]; then
    echo ""
    echo "✅ Frontend deployed successfully!"
    echo "🌐 URL: https://${ASSETS_ID}.ic0.app"
else
    echo ""
    echo "⚠️  Deployment completed but could not retrieve canister ID"
fi

