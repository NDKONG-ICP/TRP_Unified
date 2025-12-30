#!/bin/bash
# Assign multichain metadata to AXIOM Genesis NFTs
# Each NFT gets unique identifiers across all supported chains

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

echo "🚀 Starting multichain metadata assignment for all 5 AXIOM Genesis NFTs..."
echo ""

# AXIOM #1 - The First Oracle (Blockchain Expert)
echo "🔄 Assigning multichain metadata to AXIOM #1..."
env -i HOME="$HOME" PATH="$PATH" DFX_WARNING="-mainnet_plaintext_identity" \
dfx canister --network ic call axiom_1 update_multichain_metadata \
  '(opt "REPLACE_WITH_ETH_ADDRESS", opt "1", opt 1 : nat64, null, null, opt "REPLACE_WITH_SOL_ADDRESS", null, opt "REPLACE_WITH_BTC_ADDRESS", null, null, null, null, null, null, opt "Chain Fusion", opt "3rk2d-6yaaa-aaaao-a4xba-cai")' \
  > /tmp/axiom_1_metadata.log 2>&1 &
PID1=$!

# AXIOM #2 - The Creative Mind (NFT Art Expert)  
echo "🔄 Assigning multichain metadata to AXIOM #2..."
env -i HOME="$HOME" PATH="$PATH" DFX_WARNING="-mainnet_plaintext_identity" \
dfx canister --network ic call axiom_2 update_multichain_metadata \
  '(opt "REPLACE_WITH_ETH_ADDRESS", opt "2", opt 1 : nat64, null, null, opt "REPLACE_WITH_SOL_ADDRESS", null, opt "REPLACE_WITH_BTC_ADDRESS", null, null, null, null, null, null, opt "Chain Fusion", opt "3rk2d-6yaaa-aaaao-a4xba-cai")' \
  > /tmp/axiom_2_metadata.log 2>&1 &
PID2=$!

# AXIOM #3 - The DeFi Sage (DeFi Strategist)
echo "🔄 Assigning multichain metadata to AXIOM #3..."
env -i HOME="$HOME" PATH="$PATH" DFX_WARNING="-mainnet_plaintext_identity" \
dfx canister --network ic call axiom_3 update_multichain_metadata \
  '(opt "REPLACE_WITH_ETH_ADDRESS", opt "3", opt 1 : nat64, null, null, opt "REPLACE_WITH_SOL_ADDRESS", null, opt "REPLACE_WITH_BTC_ADDRESS", null, null, null, null, null, null, opt "Chain Fusion", opt "3rk2d-6yaaa-aaaao-a4xba-cai")' \
  > /tmp/axiom_3_metadata.log 2>&1 &
PID3=$!

# AXIOM #4 - The Guardian (Security Expert)
echo "🔄 Assigning multichain metadata to AXIOM #4..."
env -i HOME="$HOME" PATH="$PATH" DFX_WARNING="-mainnet_plaintext_identity" \
dfx canister --network ic call axiom_4 update_multichain_metadata \
  '(opt "REPLACE_WITH_ETH_ADDRESS", opt "4", opt 1 : nat64, null, null, opt "REPLACE_WITH_SOL_ADDRESS", null, opt "REPLACE_WITH_BTC_ADDRESS", null, null, null, null, null, null, opt "Chain Fusion", opt "3rk2d-6yaaa-aaaao-a4xba-cai")' \
  > /tmp/axiom_4_metadata.log 2>&1 &
PID4=$!

# AXIOM #5 - The Innovator (AI & ML Expert)
echo "🔄 Assigning multichain metadata to AXIOM #5..."
env -i HOME="$HOME" PATH="$PATH" DFX_WARNING="-mainnet_plaintext_identity" \
dfx canister --network ic call axiom_5 update_multichain_metadata \
  '(opt "REPLACE_WITH_ETH_ADDRESS", opt "5", opt 1 : nat64, null, null, opt "REPLACE_WITH_SOL_ADDRESS", null, opt "REPLACE_WITH_BTC_ADDRESS", null, null, null, null, null, null, opt "Chain Fusion", opt "3rk2d-6yaaa-aaaao-a4xba-cai")' \
  > /tmp/axiom_5_metadata.log 2>&1 &
PID5=$!

echo ""
echo "⏳ All 5 assignments started in background (PIDs: $PID1, $PID2, $PID3, $PID4, $PID5)"
echo "⏳ Waiting for completion (this may take 30-60 seconds)..."
echo ""

# Wait for all background processes
wait $PID1 && echo "✅ AXIOM #1 completed" || echo "❌ AXIOM #1 failed"
wait $PID2 && echo "✅ AXIOM #2 completed" || echo "❌ AXIOM #2 failed"
wait $PID3 && echo "✅ AXIOM #3 completed" || echo "❌ AXIOM #3 failed"
wait $PID4 && echo "✅ AXIOM #4 completed" || echo "❌ AXIOM #4 failed"
wait $PID5 && echo "✅ AXIOM #5 completed" || echo "❌ AXIOM #5 failed"

echo ""
echo "📊 Checking results..."

# Check results
for i in 1 2 3 4 5; do
    echo ""
    echo "=== AXIOM #$i ==="
    if [ -f /tmp/axiom_${i}_metadata.log ]; then
        cat /tmp/axiom_${i}_metadata.log | grep -E "(Ok|Err|variant)" | head -3 || echo "  Check log: cat /tmp/axiom_${i}_metadata.log"
    else
        echo "  No log file found"
    fi
done

echo ""
echo "✅ Multichain metadata assignment process complete!"
