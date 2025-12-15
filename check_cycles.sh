#!/bin/bash
# Quick Cycles Balance Check
# Checks all critical canisters and flags low balances

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

MIN_CYCLES=1000000000000  # 1T cycles minimum

echo "💰 CYCLES BALANCE REPORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

declare -A CANISTERS=(
  ["raven_ai"]="3noas-jyaaa-aaaao-a4xda-cai"
  ["axiom_1"]="qj5v5-3aaaa-aaaao-a4xca-cai"
  ["axiom_2"]="qj5v5-3aaaa-aaaao-a4xca-cai"
  ["axiom_3"]="qj5v5-3aaaa-aaaao-a4xca-cai"
  ["axiom_4"]="qj5v5-3aaaa-aaaao-a4xca-cai"
  ["axiom_5"]="qj5v5-3aaaa-aaaao-a4xca-cai"
  ["assets"]="3kpgg-eaaaa-aaaao-a4xdq-cai"
  ["nft"]="37ixl-fiaaa-aaaao-a4xaa-cai"
  ["core"]="qb6fv-6aaaa-aaaao-a4w7q-cai"
)

for name in "${!CANISTERS[@]}"; do
  id="${CANISTERS[$name]}"
  
  BALANCE_OUTPUT=$(NO_COLOR=1 TERM=dumb dfx canister --network ic status "$id" 2>&1 | grep "Balance:" | grep -v "ColorOutOfRange" || echo "")
  
  if [[ -n "$BALANCE_OUTPUT" ]]; then
    # Extract numeric balance
    BALANCE_RAW=$(echo "$BALANCE_OUTPUT" | awk '{print $2}' | tr -d ',' | tr -d '_')
    
    if [[ "$BALANCE_RAW" =~ ^[0-9]+$ ]]; then
      BALANCE_TC=$(echo "scale=2; $BALANCE_RAW / 1000000000000" | bc 2>/dev/null || echo "0")
      
      printf "%-15s %20s cycles (%6.2fT) " "$name" "$BALANCE_RAW" "$BALANCE_TC"
      
      if (( $(echo "$BALANCE_RAW >= $MIN_CYCLES" | bc -l 2>/dev/null || echo 0) )); then
        echo "✅"
      else
        echo "⚠️  LOW - Top up needed!"
      fi
    else
      echo "$name: Unable to read balance"
    fi
  else
    echo "$name: Status check failed"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

