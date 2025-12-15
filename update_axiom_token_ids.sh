#!/bin/bash
# Update token IDs for all 5 AXIOM Genesis NFTs

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

echo "🔄 Updating token IDs for AXIOM Genesis NFTs..."
echo ""

# Update each AXIOM NFT with correct token ID and name
for i in 1 2 3 4 5; do
    echo "Updating AXIOM #$i to token_id=$i..."
    env -i HOME="$HOME" PATH="$PATH" DFX_WARNING="-mainnet_plaintext_identity" \
    dfx canister --network ic call axiom_$i update_token_info \
      "($i : nat64, opt \"AXIOM Genesis #$i\")" \
      > /tmp/axiom_${i}_token_update.log 2>&1 &
    echo "  Started update for AXIOM #$i"
done

echo ""
echo "⏳ Waiting for updates to complete..."
wait

echo ""
echo "📊 Checking results..."
for i in 1 2 3 4 5; do
    echo ""
    echo "=== AXIOM #$i ==="
    if [ -f /tmp/axiom_${i}_token_update.log ]; then
        cat /tmp/axiom_${i}_token_update.log | grep -E "(Ok|Err|variant)" | head -2
    fi
done

echo ""
echo "✅ Token ID updates complete!"




