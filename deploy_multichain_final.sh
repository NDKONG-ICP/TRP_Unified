#!/bin/bash
set -e

# Deploy all multi-chain canisters using install_code_only.mjs
# This bypasses dfx color bug by using IC SDK directly

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 Deploying Multi-Chain Canisters (IC SDK Direct)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")"

# Known canister IDs from canisterConfig.ts
CANISTERS=(
    "siwe_canister:ehdei-liaaa-aaaao-a4zfa-cai"
    "siws_canister:eacc4-gqaaa-aaaao-a4zfq-cai"
    "siwb_canister:evftr-hyaaa-aaaao-a4zga-cai"
    "sis_canister:e3h6z-4iaaa-aaaao-a4zha-cai"
    "ordinals_canister:gb3wf-cyaaa-aaaao-a4zia-cai"
)

# Build all canisters first
echo "🔨 Building all multi-chain canisters..."
cd backend
cargo build --target wasm32-unknown-unknown --release --package siwe_canister --package siws_canister --package siwb_canister --package sis_canister --package ordinals_canister 2>&1 | grep -E "(Compiling|Finished|error)" | tail -10

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build complete"
cd ..
echo ""

# Deploy each canister
echo "🚀 Deploying canisters..."
echo ""

for canister_entry in "${CANISTERS[@]}"; do
    IFS=':' read -r canister_name canister_id <<< "$canister_entry"
    echo "📦 Deploying $canister_name ($canister_id)..."
    
    # Use install_code_only.mjs with canister name and ID
    node install_code_only.mjs "$canister_name" "$canister_id" 2>&1 | grep -v "ColorOutOfRange" | grep -v "panic" | tail -10
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo "  ✅ $canister_name deployed successfully"
    else
        echo "  ⚠️  $canister_name deployment may have issues (check output above)"
    fi
    
    echo ""
    sleep 2
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Multi-Chain Canisters Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Canister IDs:"
for canister_entry in "${CANISTERS[@]}"; do
    IFS=':' read -r canister_name canister_id <<< "$canister_entry"
    printf "  %-25s %s\n" "$canister_name:" "$canister_id"
done
echo ""
echo "📝 Verification:"
echo "  Check canister status via IC Dashboard:"
echo "  https://dashboard.internetcomputer.org/canister/${CANISTERS[siwe_canister]}"
echo ""

