#!/bin/bash
# Deploy all DeepSeek R1 canisters with color output disabled

set -e

NETWORK="ic"
export NO_COLOR=1
export TERM=dumb

echo "Deploying DeepSeek R1 architecture canisters..."
echo ""

# Kill any existing deployments
pkill -f "dfx deploy.*deepseek_model|dfx deploy.*vector_db|dfx deploy.*queen_bee" 2>/dev/null || true
sleep 2

# Deploy in background with proper environment
echo "Starting deepseek_model deployment..."
NO_COLOR=1 TERM=dumb dfx deploy deepseek_model --network $NETWORK > /tmp/deepseek_deploy.log 2>&1 &
DEEPSEEK_PID=$!

echo "Starting vector_db deployment..."
NO_COLOR=1 TERM=dumb dfx deploy vector_db --network $NETWORK > /tmp/vector_db_deploy.log 2>&1 &
VECTOR_DB_PID=$!

echo "Starting queen_bee deployment..."
NO_COLOR=1 TERM=dumb dfx deploy queen_bee --network $NETWORK > /tmp/queen_bee_deploy.log 2>&1 &
QUEEN_BEE_PID=$!

echo ""
echo "✅ Deployments started in background"
echo "  deepseek_model PID: $DEEPSEEK_PID"
echo "  vector_db PID: $VECTOR_DB_PID"
echo "  queen_bee PID: $QUEEN_BEE_PID"
echo ""
echo "Monitor progress:"
echo "  tail -f /tmp/deepseek_deploy.log"
echo "  tail -f /tmp/vector_db_deploy.log"
echo "  tail -f /tmp/queen_bee_deploy.log"
echo ""
echo "Check if still running:"
echo "  ps aux | grep 'dfx deploy' | grep -v grep"




