#!/bin/bash
# Script to top up raven_ai canister with cycles from wallet

set -euo pipefail

export DFX_WARNING=-mainnet_plaintext_identity
export TERM=xterm-256color

RAVEN_AI_CANISTER="3noas-jyaaa-aaaao-a4xda-cai"
CYCLES_AMOUNT="50_000_000_000_000"  # 50T cycles

echo "🔋 Topping up raven_ai canister with cycles..."
echo "Canister: $RAVEN_AI_CANISTER"
echo "Amount: $CYCLES_AMOUNT cycles"

# Get wallet ID
WALLET_ID=$(dfx identity --network ic get-wallet 2>&1 | tail -1)
echo "Wallet: $WALLET_ID"

# Check wallet balance
echo ""
echo "Checking wallet balance..."
dfx wallet --network ic balance

# Deposit cycles
echo ""
echo "Depositing cycles..."
dfx canister --network ic deposit-cycles $CYCLES_AMOUNT $RAVEN_AI_CANISTER --wallet $WALLET_ID

# Verify
echo ""
echo "✅ Verifying canister status..."
dfx canister --network ic status $RAVEN_AI_CANISTER | grep -E "balance|cycles"

echo ""
echo "✅ Top-up complete!"
