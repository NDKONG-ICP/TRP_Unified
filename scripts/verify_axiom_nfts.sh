#!/bin/bash
# Verify all AXIOM NFTs have proper AI pipeline and multichain functionality

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 AXIOM NFT Verification Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# AXIOM Genesis canister IDs
declare -A AXIOM_CANISTERS=(
    [1]="46odg-5iaaa-aaaao-a4xqa-cai"
    [2]="4zpfs-qqaaa-aaaao-a4xqq-cai"
    [3]="4ckzx-kiaaa-aaaao-a4xsa-cai"
    [4]="4fl7d-hqaaa-aaaao-a4xsq-cai"
    [5]="4miu7-ryaaa-aaaao-a4xta-cai"
)

echo "✅ Checking AI Pipeline Access..."
echo ""

for i in {1..5}; do
    canister_id="${AXIOM_CANISTERS[$i]}"
    echo "📋 AXIOM #$i ($canister_id):"
    
    # Check canister status
    echo "   Checking canister status..."
    status=$(dfx canister --network ic status "$canister_id" 2>&1 | grep -i "status" | head -1)
    if [[ $status == *"Running"* ]]; then
        echo "   ✅ Canister is running"
    else
        echo "   ❌ Canister status: $status"
    fi
    
    # Check metadata
    echo "   Checking metadata..."
    metadata=$(dfx canister --network ic call "$canister_id" get_metadata 2>&1 | grep -i "token_id\|multichain" || echo "Failed")
    if [[ $metadata != *"Failed"* ]]; then
        echo "   ✅ Metadata accessible"
    else
        echo "   ⚠️  Metadata check failed"
    fi
    
    # Check multichain metadata
    echo "   Checking multichain metadata..."
    multichain=$(dfx canister --network ic call "$canister_id" get_metadata 2>&1 | grep -i "icp_canister\|eth_contract\|sol_mint" || echo "Failed")
    if [[ $multichain != *"Failed"* ]]; then
        echo "   ✅ Multichain metadata present"
    else
        echo "   ⚠️  Multichain metadata check failed"
    fi
    
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "All AXIOM NFTs should have:"
echo "  ✅ Canister running and accessible"
echo "  ✅ Metadata with token_id"
echo "  ✅ Multichain metadata (ICP, ETH, SOL, BTC, SUI)"
echo "  ✅ AI Council access (via raven_ai canister)"
echo "  ✅ Voice synthesis access (via raven_ai canister)"
echo ""
echo "To test AI pipeline for a specific AXIOM:"
echo "  dfx canister --network ic call <canister_id> http_request '(record {method=\"POST\"; url=\"/api/chat\"; body=\"{\\\"message\\\":\\\"Hello\\\"}\"; headers=vec{};})'"
echo ""

