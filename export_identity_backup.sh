#!/bin/bash
# Export Identity Backup Script
# Creates secure backup of ic_deploy identity

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Identity Backup Export"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

IDENTITY="ic_deploy"
BACKUP_DIR="$HOME/backup/ic_identities"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📋 Identity: $IDENTITY"
echo "📁 Backup directory: $BACKUP_DIR"
echo ""

# Get principal
PRINCIPAL=$(dfx identity get-principal --identity "$IDENTITY" 2>&1 || echo "unknown")
echo "🔑 Principal: $PRINCIPAL"
echo ""

# Export PEM (try multiple methods)
echo "📦 Exporting identity..."

# Method 1: Direct export
if dfx identity export "$IDENTITY" > "$BACKUP_DIR/${IDENTITY}_${TIMESTAMP}.pem" 2>/dev/null; then
    echo "✅ Exported via dfx identity export"
elif [ -f "$HOME/.config/dfx/identity/$IDENTITY/identity.pem" ]; then
    # Method 2: Copy PEM file directly
    cp "$HOME/.config/dfx/identity/$IDENTITY/identity.pem" "$BACKUP_DIR/${IDENTITY}_${TIMESTAMP}.pem"
    echo "✅ Copied PEM file directly"
else
    echo "⚠️  Could not export identity"
    echo "   Identity may be stored differently or require seed phrase"
fi

# List all identities
echo ""
echo "📋 All available identities:"
dfx identity list 2>&1 | grep -v "ColorOutOfRange" || echo "  (dfx color bug may prevent listing)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Backup Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Backup location: $BACKUP_DIR"
echo ""
echo "⚠️  IMPORTANT:"
echo "   1. Store this backup securely (encrypted, password manager, etc.)"
echo "   2. If you have the seed phrase, store it separately"
echo "   3. Never commit PEM files or seed phrases to git"
echo ""

