#!/bin/bash
# Top up raven_ai canister and deploy

set -e

export DFX_WARNING=-mainnet_plaintext_identity
export TERM=xterm

RAVEN_AI_CANISTER="3noas-jyaaa-aaaao-a4xda-cai"
CYCLES_NEEDED="300_000_000_000"  # 300 billion cycles

echo "🔋 Checking cycles status..."

# Check raven_ai canister status
echo "Checking raven_ai canister cycles..."
dfx canister --network ic status $RAVEN_AI_CANISTER | grep -E "balance|cycles" || true

echo ""
echo "📝 Instructions:"
echo "1. The canister needs at least 266 billion cycles"
echo "2. You can top up via:"
echo "   - NNS Frontend: https://nns.ic0.app/ (find canister $RAVEN_AI_CANISTER)"
echo "   - Or use: dfx canister --network ic deposit-cycles $CYCLES_NEEDED $RAVEN_AI_CANISTER"
echo ""
echo "3. After topping up, run:"
echo "   dfx deploy raven_ai --network ic --yes"
echo ""

# Try to get wallet ID
WALLET_ID=$(dfx identity --network ic get-wallet 2>&1 | tail -1 || echo "")
if [ -n "$WALLET_ID" ]; then
    echo "Your wallet: $WALLET_ID"
    echo "Wallet balance: $(dfx wallet --network ic balance 2>&1 | tail -1 || echo 'Unknown')"
fi

