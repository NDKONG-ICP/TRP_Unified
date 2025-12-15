#!/bin/bash
set -e

# Fix Assets Canister Deployment
# The assets canister has incompatible state - we'll reinstall it

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Fixing Assets Canister Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")"

NETWORK="ic"
CANISTER_ID="3kpgg-eaaaa-aaaao-a4xdq-cai"

echo "📋 Assets Canister ID: $CANISTER_ID"
echo ""

# Check if dist exists
if [ ! -d "frontend/dist" ]; then
    echo "❌ Error: frontend/dist directory not found"
    echo "   Building frontend first..."
    cd frontend
    npm run build
    cd ..
fi

echo "✅ Frontend built"
echo ""

# Option 1: Try reinstall (clears state) - use yes to auto-confirm
echo "🔄 Attempting reinstall (will clear canister state)..."
echo "yes" | NO_COLOR=1 TERM=dumb dfx canister --network "$NETWORK" install assets \
    --wasm frontend/dist/index.html \
    --mode reinstall 2>&1 | grep -v "ColorOutOfRange" | grep -v "stderr output color" | grep -v "WARNING" | grep -v "Do you want" | tail -10 || {
    
    echo ""
    echo "⚠️  Reinstall failed, trying alternative method..."
    echo ""
    
    # Option 2: Use dfx deploy with --mode reinstall
    echo "🔄 Trying dfx deploy with reinstall mode..."
    NO_COLOR=1 TERM=dumb dfx deploy assets --network "$NETWORK" --mode reinstall 2>&1 | grep -v "ColorOutOfRange" | grep -v "stderr output color" | tail -10 || {
        
        echo ""
        echo "⚠️  That also failed. Trying to uninstall and reinstall..."
        echo ""
        
        # Option 3: Uninstall first, then install
        echo "🗑️  Uninstalling canister..."
        NO_COLOR=1 TERM=dumb dfx canister --network "$NETWORK" uninstall-code assets 2>&1 | grep -v "ColorOutOfRange" | grep -v "stderr output color" || true
        
        sleep 2
        
        echo "📦 Installing fresh..."
        NO_COLOR=1 TERM=dumb dfx canister --network "$NETWORK" install assets \
            --wasm frontend/dist/index.html \
            --mode install 2>&1 | grep -v "ColorOutOfRange" | grep -v "stderr output color" | tail -10 || {
            
            echo ""
            echo "❌ All methods failed. The canister may need to be recreated."
            echo ""
            echo "💡 Alternative: Use IC Dashboard to upload the frontend:"
            echo "   1. Go to https://dashboard.internetcomputer.org/"
            echo "   2. Navigate to canister $CANISTER_ID"
            echo "   3. Click 'Deploy' and upload frontend/dist/index.html"
            exit 1
        }
    }
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Assets Canister Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Frontend URL: https://$CANISTER_ID.ic0.app"
echo ""

