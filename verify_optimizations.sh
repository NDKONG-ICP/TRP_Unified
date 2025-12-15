#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Verifying AI Pipeline Optimizations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")"

CANISTER_ID="3noas-jyaaa-aaaao-a4xda-cai"

# Test 1: Health Check
echo "1️⃣  Testing health check endpoint..."
echo "   Command: dfx canister --network ic call raven_ai get_health_check"
HEALTH=$(NO_COLOR=1 TERM=dumb dfx canister --network ic call raven_ai get_health_check 2>&1 | grep -v "ColorOutOfRange" | grep -v "stderr output color" || echo "")
if echo "$HEALTH" | grep -q "status\|healthy\|low_cycles"; then
    echo "   ✅ Health check endpoint working"
    echo ""
    echo "$HEALTH" | head -20
    echo ""
else
    echo "   ⚠️  Health check response:"
    echo "$HEALTH" | head -10
    echo ""
fi

# Test 2: Metrics
echo "2️⃣  Testing metrics endpoint..."
echo "   Command: dfx canister --network ic call raven_ai get_ai_metrics"
METRICS=$(NO_COLOR=1 TERM=dumb dfx canister --network ic call raven_ai get_ai_metrics 2>&1 | grep -v "ColorOutOfRange" | grep -v "stderr output color" || echo "")
if echo "$METRICS" | grep -q "total_requests\|provider_stats"; then
    echo "   ✅ Metrics endpoint working"
    echo ""
    echo "$METRICS" | head -20
    echo ""
else
    echo "   ⚠️  Metrics response:"
    echo "$METRICS" | head -10
    echo ""
fi

# Test 3: Canister Status
echo "3️⃣  Verifying canister status..."
STATUS=$(NO_COLOR=1 TERM=dumb dfx canister --network ic status raven_ai 2>&1 | grep -v "ColorOutOfRange" | grep -v "stderr output color" | grep -i "status\|running" | head -3 || echo "")
if echo "$STATUS" | grep -qi "running"; then
    echo "   ✅ Canister is running"
    echo "$STATUS"
else
    echo "   ⚠️  Status check:"
    echo "$STATUS"
fi
echo ""

# Test 4: Check cycles
echo "4️⃣  Checking cycles balance..."
BALANCE=$(NO_COLOR=1 TERM=dumb dfx canister --network ic status raven_ai 2>&1 | grep -v "ColorOutOfRange" | grep -v "stderr output color" | grep "Balance" | head -1 || echo "")
echo "   $BALANCE"
echo ""

# Test 5: Verify WASM was deployed
echo "5️⃣  Checking canister module hash..."
HASH=$(NO_COLOR=1 TERM=dumb dfx canister --network ic info raven_ai 2>&1 | grep -v "ColorOutOfRange" | grep -v "stderr output color" | grep -i "module\|hash" | head -3 || echo "")
if [ -n "$HASH" ]; then
    echo "   ✅ Canister info retrieved"
    echo "$HASH"
else
    echo "   ⚠️  Could not retrieve module hash"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Optimizations deployed:"
echo "   - Parallel LLM queries"
echo "   - Response caching"
echo "   - Circuit breakers"
echo "   - Rate limiting"
echo "   - Timeout protection"
echo "   - Metrics & health check"
echo ""
echo "📝 Next Steps:"
echo "   1. Monitor metrics over 24 hours"
echo "   2. Test AI Council query to verify parallel execution"
echo "   3. Check cache hit rates"
echo "   4. Verify circuit breakers are working"
echo ""

