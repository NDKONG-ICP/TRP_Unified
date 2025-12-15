#!/bin/bash
# Auto Top-Up Script for Raven Ecosystem Canisters
# Checks cycles and tops up if below threshold

set -e

export DFX_WARNING=-mainnet_plaintext_identity
NETWORK="ic"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

MIN_CYCLES=1000000000000  # 1T cycles minimum
TOPUP_AMOUNT=2000000000000  # 2T cycles to add
WALLET_ID=$(dfx identity --network $NETWORK get-wallet 2>&1 | tail -1)

echo "🔋 Auto Top-Up Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Wallet: $WALLET_ID"
echo "Minimum cycles: $MIN_CYCLES"
echo "Top-up amount: $TOPUP_AMOUNT"
echo ""

# Canisters to monitor
CANISTERS=("raven_ai" "axiom_1" "axiom_2" "axiom_3" "axiom_4" "axiom_5" "assets")

for canister in "${CANISTERS[@]}"; do
  echo "Checking $canister..."
  
  # Get balance
  BALANCE_RAW=$(dfx canister --network $NETWORK status $canister 2>&1 | grep "Balance:" | awk '{print $2}' | tr -d ',' | tr -d 'Cycles' || echo "0")
  BALANCE_NUM=$(echo "$BALANCE_RAW" | tr -d '_')
  
  if [ -z "$BALANCE_NUM" ] || [ "$BALANCE_NUM" = "0" ]; then
    echo "  ⚠️  Could not read balance for $canister"
    continue
  fi
  
  if [ "$BALANCE_NUM" -lt "$MIN_CYCLES" ]; then
    echo "  ⚠️  $canister is low on cycles ($BALANCE_RAW)! Topping up..."
    
    CANISTER_ID=$(dfx canister --network $NETWORK id $canister 2>/dev/null || echo "")
    if [ -n "$CANISTER_ID" ]; then
      dfx canister --network $NETWORK deposit-cycles $TOPUP_AMOUNT $canister --wallet $WALLET_ID 2>&1 | tail -3
      echo "  ✅ Topped up $canister"
    else
      echo "  ❌ Could not get canister ID for $canister"
    fi
  else
    echo "  ✅ $canister has sufficient cycles ($BALANCE_RAW)"
  fi
  echo ""
done

echo "✅ Top-up check complete!"

