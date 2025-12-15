#!/bin/bash

# Script to create all 20 articles using dfx canister calls
# This uses the create_article function we just added

set -euo pipefail

export DFX_WARNING=-mainnet_plaintext_identity

NETWORK="ic"
RAVEN_AI_CANISTER="3noas-jyaaa-aaaao-a4xda-cai"
ARTICLES_FILE="scripts/articles_data.json"

echo "=========================================="
echo "Creating 20 SEO-Optimized Articles"
echo "=========================================="
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is required but not installed."
    echo "   Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Check if articles file exists
if [ ! -f "$ARTICLES_FILE" ]; then
    echo "❌ Error: Articles file not found: $ARTICLES_FILE"
    exit 1
fi

# Count articles
TOTAL_ARTICLES=$(cat "$ARTICLES_FILE" | jq 'length')
echo "📝 Found $TOTAL_ARTICLES articles to create"
echo ""

# Convert persona string to Candid variant
convert_persona() {
    case "$1" in
        "Raven") echo "variant { Raven }" ;;
        "Harlee") echo "variant { Harlee }" ;;
        "Macho") echo "variant { Macho }" ;;
        *) echo "variant { Raven }" ;;
    esac
}

# Create articles
SUCCESS=0
FAILED=0

for i in $(seq 0 $((TOTAL_ARTICLES - 1))); do
    echo "Creating article $((i + 1))/$TOTAL_ARTICLES..."
    
    # Extract article data using jq
    PERSONA=$(cat "$ARTICLES_FILE" | jq -r ".[$i].persona")
    TITLE=$(cat "$ARTICLES_FILE" | jq -r ".[$i].title")
    SLUG=$(cat "$ARTICLES_FILE" | jq -r ".[$i].slug")
    EXCERPT=$(cat "$ARTICLES_FILE" | jq -r ".[$i].excerpt")
    CONTENT=$(cat "$ARTICLES_FILE" | jq -r ".[$i].content")
    CATEGORY=$(cat "$ARTICLES_FILE" | jq -r ".[$i].category")
    TAGS=$(cat "$ARTICLES_FILE" | jq -c ".[$i].tags")
    SEO_TITLE=$(cat "$ARTICLES_FILE" | jq -r ".[$i].seoTitle")
    SEO_DESC=$(cat "$ARTICLES_FILE" | jq -r ".[$i].seoDescription")
    SEO_KEYWORDS=$(cat "$ARTICLES_FILE" | jq -c ".[$i].seoKeywords")
    FEATURED=$(cat "$ARTICLES_FILE" | jq -r ".[$i].featured")
    
    # Convert persona
    PERSONA_VARIANT=$(convert_persona "$PERSONA")
    
    # Escape content for shell (replace newlines with \n and quotes)
    CONTENT_ESCAPED=$(echo "$CONTENT" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
    
    # Build the dfx command with proper escaping
    # Use a temporary file for the content to avoid shell escaping issues
    TEMP_FILE=$(mktemp)
    echo "$CONTENT" > "$TEMP_FILE"
    
    # Call dfx canister call with file input for content
    if dfx canister call --network "$NETWORK" "$RAVEN_AI_CANISTER" create_article "(
        \"$TITLE\",
        \"$SLUG\",
        \"$EXCERPT\",
        $(jq -Rs . "$TEMP_FILE"),
        $PERSONA_VARIANT,
        \"$CATEGORY\",
        $TAGS,
        \"$SEO_TITLE\",
        \"$SEO_DESC\",
        $SEO_KEYWORDS,
        $FEATURED
    )" 2>&1 | grep -q "Ok\|ok"; then
        echo "✅ Article $((i + 1)) created: $TITLE"
        ((SUCCESS++))
    else
        echo "❌ Failed to create article $((i + 1)): $TITLE"
        ((FAILED++))
    fi
    
    rm -f "$TEMP_FILE"
    echo ""
    
    # Small delay to avoid rate limiting
    sleep 1
done

echo "=========================================="
echo "Article Creation Complete"
echo "=========================================="
echo "✅ Success: $SUCCESS"
echo "❌ Failed: $FAILED"
echo ""
