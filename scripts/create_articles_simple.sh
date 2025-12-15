#!/bin/bash

# Simplified script to create articles one at a time
# This version uses Python for better JSON handling

set -euo pipefail

export DFX_WARNING=-mainnet_plaintext_identity

NETWORK="ic"
RAVEN_AI_CANISTER="3noas-jyaaa-aaaao-a4xda-cai"
ARTICLES_FILE="scripts/articles_data.json"

echo "=========================================="
echo "Creating Articles (Simplified Approach)"
echo "=========================================="
echo ""

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 is required but not installed."
    exit 1
fi

# Create a Python script to handle the article creation
python3 << 'PYTHON_SCRIPT'
import json
import subprocess
import sys
import time

NETWORK = "ic"
CANISTER = "3noas-jyaaa-aaaao-a4xda-cai"

# Load articles
with open("scripts/articles_data.json", "r") as f:
    articles = json.load(f)

print(f"📝 Found {len(articles)} articles to create\n")

# Persona mapping
persona_map = {
    "Raven": "variant { Raven }",
    "Harlee": "variant { Harlee }",
    "Macho": "variant { Macho }"
}

success = 0
failed = 0

for i, article in enumerate(articles, 1):
    print(f"Creating article {i}/{len(articles)}: {article['title'][:50]}...")
    
    # Prepare arguments
    persona = persona_map.get(article['persona'], "variant { Raven }")
    
    # Escape content for Candid (replace newlines and quotes)
    content = article['content'].replace('"', '\\"').replace('\n', '\\n')
    
    # Build dfx command
    cmd = [
        "dfx", "canister", "call",
        "--network", NETWORK,
        CANISTER,
        "create_article",
        f'("{article["title"]}", "{article["slug"]}", "{article["excerpt"]}", "{content}", {persona}, "{article["category"]}", {json.dumps(article["tags"])}, "{article["seoTitle"]}", "{article["seoDescription"]}", {json.dumps(article["seoKeywords"])}, {str(article["featured"]).lower()})'
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
            env={**os.environ, "DFX_WARNING": "-mainnet_plaintext_identity"}
        )
        
        if result.returncode == 0 and ("Ok" in result.stdout or "ok" in result.stdout.lower()):
            print(f"✅ Article {i} created successfully")
            success += 1
        else:
            print(f"❌ Failed: {result.stderr[:100] if result.stderr else result.stdout[:100]}")
            failed += 1
    except subprocess.TimeoutExpired:
        print(f"❌ Timeout creating article {i}")
        failed += 1
    except Exception as e:
        print(f"❌ Error: {str(e)[:100]}")
        failed += 1
    
    print("")
    time.sleep(2)  # Delay between calls

print("==========================================")
print(f"✅ Success: {success}")
print(f"❌ Failed: {failed}")
print("==========================================")
PYTHON_SCRIPT

echo ""
echo "✅ Script completed"



