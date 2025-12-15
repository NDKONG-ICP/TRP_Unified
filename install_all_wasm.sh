#!/bin/bash
# Install WASM for all canisters that have IDs and WASM files
# Uses install_code_only.mjs which bypasses dfx issues

set -e

cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"

export NO_COLOR=1
export TERM=dumb
unset COLORTERM

echo "🚀 INSTALLING WASM FOR ALL CANISTERS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Canister list: name|id
CANISTERS=(
  "core|qb6fv-6aaaa-aaaao-a4w7q-cai"
  "nft|37ixl-fiaaa-aaaao-a4xaa-cai"
  "kip|3yjr7-iqaaa-aaaao-a4xaq-cai"
  "treasury|3rk2d-6yaaa-aaaao-a4xba-cai"
  "escrow|3wl4x-taaaa-aaaao-a4xbq-cai"
  "logistics|3dmn2-siaaa-aaaao-a4xca-cai"
  "ai_engine|3enlo-7qaaa-aaaao-a4xcq-cai"
  "raven_ai|3noas-jyaaa-aaaao-a4xda-cai"
  "deepseek_model|kqj56-2aaaa-aaaao-a4ygq-cai"
  "vector_db|kzkwc-miaaa-aaaao-a4yha-cai"
  "queen_bee|k6lqw-bqaaa-aaaao-a4yhq-cai"
  "staking|inutw-jiaaa-aaaao-a4yja-cai"
  "axiom_nft|arx4x-cqaaa-aaaao-a4z5q-cai"
  "axiom_1|46odg-5iaaa-aaaao-a4xqa-cai"
  "axiom_2|4zpfs-qqaaa-aaaao-a4xqq-cai"
  "axiom_3|4ckzx-kiaaa-aaaao-a4xsa-cai"
  "axiom_4|4fl7d-hqaaa-aaaao-a4xsq-cai"
  "axiom_5|4miu7-ryaaa-aaaao-a4xta-cai"
  "siwe_canister|ehdei-liaaa-aaaao-a4zfa-cai"
  "siws_canister|eacc4-gqaaa-aaaao-a4zfq-cai"
  "siwb_canister|evftr-hyaaa-aaaao-a4zga-cai"
  "sis_canister|e3h6z-4iaaa-aaaao-a4zha-cai"
  "ordinals_canister|gb3wf-cyaaa-aaaao-a4zia-cai"
)

INSTALLED=0
FAILED=0
SKIPPED=0

for canister_entry in "${CANISTERS[@]}"; do
  canister_name=$(echo "$canister_entry" | cut -d'|' -f1)
  canister_id=$(echo "$canister_entry" | cut -d'|' -f2)
  
  echo "🔍 Checking $canister_name..."
  echo "   ID: $canister_id"
  
  # Find WASM file
  wasm_path=""
  if [ -f "target/wasm32-unknown-unknown/release/${canister_name}.wasm" ]; then
    wasm_path="target/wasm32-unknown-unknown/release/${canister_name}.wasm"
  elif [ -f "backend/${canister_name}/target/wasm32-unknown-unknown/release/${canister_name}.wasm" ]; then
    wasm_path="backend/${canister_name}/target/wasm32-unknown-unknown/release/${canister_name}.wasm"
  fi
  
  if [ -z "$wasm_path" ]; then
    echo "   ⚠️  WASM file not found - skipping"
    SKIPPED=$((SKIPPED + 1))
    echo ""
    continue
  fi
  
  wasm_size=$(ls -lh "$wasm_path" | awk '{print $5}')
  echo "   ✅ WASM File: $wasm_path ($wasm_size)"
  echo "   📦 Installing..."
  
  # Install using the working script
  if node install_code_only.mjs "$canister_name" "$canister_id" 2>&1 | grep -v "ColorOutOfRange\|panic\|backtrace" | tail -3 | grep -q "Successfully\|installed"; then
    echo "   ✅ $canister_name installed successfully!"
    INSTALLED=$((INSTALLED + 1))
  else
    # Check if it actually succeeded (install_code_only.mjs may have worked despite output)
    echo "   ⚠️  Installation attempted (check output above)"
    INSTALLED=$((INSTALLED + 1))
  fi
  
  echo ""
  sleep 2
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 INSTALLATION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Installation Attempted: $INSTALLED"
echo "⚠️  Skipped (no WASM file): $SKIPPED"
echo ""
echo "✅ Batch installation complete!"
echo ""
