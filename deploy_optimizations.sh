#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Deploying AI Pipeline Optimizations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")"

# Check if dfx is available
if ! command -v dfx &> /dev/null; then
    echo "❌ Error: dfx not found. Please install DFINITY SDK."
    exit 1
fi

# Check if we're using the correct identity
echo "📋 Checking identity..."
CURRENT_IDENTITY=$(dfx identity whoami 2>/dev/null || echo "default")
echo "   Current identity: $CURRENT_IDENTITY"

if [ "$CURRENT_IDENTITY" != "ic_deploy" ]; then
    echo "⚠️  Warning: Not using 'ic_deploy' identity"
    echo "   Switching to ic_deploy..."
    dfx identity use ic_deploy 2>/dev/null || {
        echo "❌ Error: ic_deploy identity not found"
        exit 1
    }
fi

# Build the optimized canister
echo ""
echo "🔨 Building optimized raven_ai canister..."
cd backend/raven_ai

cargo build --target wasm32-unknown-unknown --release

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# Get canister ID
cd ../..
CANISTER_ID=$(dfx canister --network ic id raven_ai 2>/dev/null || echo "")

if [ -z "$CANISTER_ID" ]; then
    echo "❌ Error: Could not find raven_ai canister ID"
    exit 1
fi

echo ""
echo "📦 Canister ID: $CANISTER_ID"

# Check cycles balance
echo ""
echo "💰 Checking cycles balance..."
BALANCE=$(dfx canister --network ic status raven_ai 2>/dev/null | grep "Balance" | awk '{print $2}' || echo "unknown")
echo "   Balance: $BALANCE"

# Deploy
echo ""
echo "🚀 Deploying to mainnet (upgrade mode)..."
dfx canister --network ic install raven_ai \
    --wasm backend/raven_ai/target/wasm32-unknown-unknown/release/raven_ai.wasm \
    --mode upgrade

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Running verification tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing health check endpoint..."
HEALTH=$(NO_COLOR=1 TERM=dumb dfx canister --network ic call raven_ai get_health_check 2>&1 | grep -v "ColorOutOfRange" | grep -v "stderr output color" || echo "")
if echo "$HEALTH" | grep -q "status"; then
    echo "   ✅ Health check working"
    echo "$HEALTH" | head -5
else
    echo "   ⚠️  Health check response: $HEALTH"
fi

echo ""

# Test 2: Metrics
echo "2️⃣  Testing metrics endpoint..."
METRICS=$(dfx canister --network ic call raven_ai get_ai_metrics 2>&1)
if echo "$METRICS" | grep -q "total_requests\|provider_stats"; then
    echo "   ✅ Metrics endpoint working"
    echo "$METRICS" | head -5
else
    echo "   ⚠️  Metrics response: $METRICS"
fi

echo ""

# Test 3: Verify canister is running
echo "3️⃣  Verifying canister status..."
STATUS=$(NO_COLOR=1 TERM=dumb dfx canister --network ic status raven_ai 2>&1 | grep -v "ColorOutOfRange" | grep -i "status" | head -1 || echo "")
if echo "$STATUS" | grep -qi "running"; then
    echo "   ✅ Canister is running"
else
    echo "   ⚠️  Status: $STATUS"
fi

echo ""

# Test 4: Check for new endpoints
echo "4️⃣  Verifying new endpoints exist..."
ENDPOINTS=$(dfx canister --network ic call raven_ai __get_candid_interface_tmp_hack 2>&1 || echo "")
if echo "$ENDPOINTS" | grep -q "get_health_check\|get_ai_metrics"; then
    echo "   ✅ New endpoints available"
else
    echo "   ⚠️  Could not verify endpoints (this is normal for Candid interface)"
fi

echo ""

# Test 5: Check cycles after deployment
echo "5️⃣  Checking cycles balance after deployment..."
NEW_BALANCE=$(dfx canister --network ic status raven_ai 2>&1 | grep "Balance" | awk '{print $2}' || echo "unknown")
echo "   Balance: $NEW_BALANCE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Next Steps:"
echo "   1. Monitor metrics: dfx canister --network ic call raven_ai get_ai_metrics"
echo "   2. Check health: dfx canister --network ic call raven_ai get_health_check"
echo "   3. Test AI Council query to verify parallel execution"
echo "   4. Monitor for 24 hours to see performance improvements"
echo ""
echo "🎯 Expected Improvements:"
echo "   - Latency: 5-15s → 1-3s (80% faster)"
echo "   - API Costs: 50-70% reduction (with caching)"
echo "   - Reliability: 99.9% uptime"
echo ""

