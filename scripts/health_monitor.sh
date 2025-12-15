#!/bin/bash
# Raven Ecosystem Health Monitor
# Monitors canister health, cycles, and frontend status

set -e

export DFX_WARNING=-mainnet_plaintext_identity
NETWORK="ic"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

LOG_FILE="$PROJECT_ROOT/health.log"
MIN_CYCLES=1000000000000  # 1T cycles minimum

echo "🏥 Raven Ecosystem Health Monitor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Started at: $(date)"
echo "Log file: $LOG_FILE"
echo ""

while true; do
  {
    echo ""
    echo "⏰ $(date)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check raven_ai health
    echo "🤖 AI Council (raven_ai):"
    STATUS=$(dfx canister --network $NETWORK status raven_ai 2>&1 | grep "Status:" | awk '{print $2}')
    CYCLES=$(dfx canister --network $NETWORK status raven_ai 2>&1 | grep "Balance:" | awk '{print $2, $3}')
    echo "  Status: $STATUS"
    echo "  Cycles: $CYCLES"
    
    # Test health endpoint
    HEALTH=$(dfx canister --network $NETWORK call raven_ai health 2>&1 | tail -1 || echo "Error")
    echo "  Health: $HEALTH"
    
    # Check cycles for critical canisters
    echo ""
    echo "💰 Cycles Status:"
    for c in raven_ai axiom_1 axiom_2 axiom_3 axiom_4 axiom_5 assets; do
      CYCLES_RAW=$(dfx canister --network $NETWORK status $c 2>&1 | grep "Balance:" | awk '{print $2}' | tr -d ',' | tr -d 'Cycles')
      if [ -n "$CYCLES_RAW" ]; then
        CYCLES_NUM=$(echo "$CYCLES_RAW" | tr -d '_')
        if [ "$CYCLES_NUM" -lt "$MIN_CYCLES" ]; then
          echo "  ⚠️  $c: $CYCLES_RAW (LOW!)"
        else
          echo "  ✅ $c: $CYCLES_RAW"
        fi
      else
        echo "  ❌ $c: Unable to check"
      fi
    done
    
    # Check frontend
    echo ""
    echo "🌐 Frontend:"
    FRONTEND_ID=$(dfx canister --network $NETWORK id assets 2>/dev/null || echo "")
    if [ -n "$FRONTEND_ID" ]; then
      HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${FRONTEND_ID}.icp0.io" 2>/dev/null || echo "000")
      if [ "$HTTP_CODE" = "200" ]; then
        echo "  ✅ Status: Online (HTTP $HTTP_CODE)"
        echo "  URL: https://${FRONTEND_ID}.icp0.io"
      else
        echo "  ⚠️  Status: HTTP $HTTP_CODE"
      fi
    else
      echo "  ❌ Frontend ID not found"
    fi
    
    # Check article count
    echo ""
    echo "📰 Articles:"
    ARTICLE_STATS=$(dfx canister --network $NETWORK call raven_ai get_article_stats 2>&1 | tail -1 || echo "Error")
    echo "  Stats: $ARTICLE_STATS"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
  } | tee -a "$LOG_FILE"
  
  sleep 300  # Check every 5 minutes
done

