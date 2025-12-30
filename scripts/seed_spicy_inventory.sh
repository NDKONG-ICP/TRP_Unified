#!/bin/bash

# Seed script for IC SPICY RWA Storefront
# Populates the canister with real products from the Florida nursery

# Canister Name
CANISTER="icspicy"
NETWORK="ic" # Change to "local" for local development

echo "🌶️ Seeding IC SPICY RWA Storefront on $NETWORK..."

# Function to add a product
add_product() {
    local id=$1
    local name=$2
    local desc=$3
    local price=$4
    local category=$5
    local inventory=$6
    local in_stock=$7
    
    echo "Adding: $name..."
    
    dfx canister call $CANISTER add_shop_product "(record {
        id = \"$id\";
        name = \"$name\";
        description = \"$desc\";
        price_usd = $price;
        category = variant { $category };
        inventory = $inventory;
        in_stock = $in_stock;
        image_url = null;
    })" --network $NETWORK
}

# --- 1. FRESH PEPPER PODS ---
add_product "pod-reaper-lb" "Carolina Reaper Pods (1 lb)" "Freshly harvested World's Hottest Peppers (2.2M+ SHU) from our Florida greenhouse." "24.99" "Pods" 50 "true"
add_product "pod-ghost-lb" "Ghost Pepper Pods (1 lb)" "Authentic Bhut Jolokia. Extreme heat with smoky undertones." "19.99" "Pods" 75 "true"
add_product "pod-habanero-lb" "Orange Habanero Pods (1 lb)" "Bright, citrusy heat. Perfect for fresh salsas and hot sauces." "12.99" "Pods" 100 "true"
add_product "pod-scorpion-lb" "Trinidad Scorpion Pods (1 lb)" "Stingingly hot Moruga Scorpion peppers. Extreme potency." "22.99" "Pods" 30 "true"

# --- 2. NURSERY PLANTS (FL Registered) ---
add_product "plant-reaper-starter" "Carolina Reaper Starter Plant" "Live 4-6\" seedling from our FL registered nursery. Ready for transplant." "14.99" "Plants" 120 "true"
add_product "plant-ghost-starter" "Ghost Pepper Starter Plant" "Vigorous Bhut Jolokia seedling. Certified organic practices." "12.99" "Plants" 100 "true"
add_product "plant-habanero-starter" "Orange Habanero Starter Plant" "High-yield habanero plant. Great for container gardening." "9.99" "Plants" 150 "true"
add_product "plant-variety-6" "Superhot Variety Pack (6 Plants)" "Mix of Reaper, Ghost, Scorpion, and Habanero starters." "59.99" "Plants" 25 "true"

# --- 3. AUTHENTIC SEEDS ---
add_product "seed-reaper-10" "Carolina Reaper Seeds (10ct)" "Heirloom seeds harvested from our most potent 2024 crop." "6.99" "Seeds" 500 "true"
add_product "seed-ghost-10" "Ghost Pepper Seeds (10ct)" "High-germination Bhut Jolokia seeds. Growing guide included." "5.99" "Seeds" 500 "true"
add_product "seed-scorpion-10" "Trinidad Scorpion Seeds (10ct)" "Authentic Moruga Scorpion seeds for extreme growers." "6.99" "Seeds" 300 "true"
add_product "seed-superhot-mix" "Swarm Selection Seed Mix (25ct)" "Custom mix of 5 superhot varieties curated by SpicyAI." "12.99" "Seeds" 200 "true"

# --- 4. SPICE BLENDS ---
add_product "blend-reaper-powder" "Pure Carolina Reaper Powder (2oz)" "100% dried reaper pods. No fillers. Extreme heat." "14.99" "Blends" 200 "true"
add_product "blend-ghost-flakes" "Smoked Ghost Pepper Flakes (2oz)" "Slow-smoked Bhut Jolokia flakes for rich, spicy flavor." "11.99" "Blends" 150 "true"
add_product "blend-icspicy-sign" "IC SPICY Signature Blend" "Our secret recipe house rub. Perfect for BBQ and wings." "10.99" "Blends" 300 "true"

echo "✅ IC SPICY Storefront successfully seeded with 15 flagship products!"








