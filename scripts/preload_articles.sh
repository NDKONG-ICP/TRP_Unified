#!/bin/bash

# Script to preload 20 SEO-optimized articles into Raven News
# Articles written by Raven, Harlee, and Macho personas

set -euo pipefail

export DFX_WARNING=-mainnet_plaintext_identity

NETWORK="ic"
PROJECT_ROOT="/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "Preloading 20 SEO-Optimized Articles"
echo "=========================================="
echo ""

# This script will call the backend to add articles
# For now, we'll create a Rust script that can be called via dfx

echo "✅ Article preload script created"
echo "📝 Next: Create Rust function to add articles directly"



