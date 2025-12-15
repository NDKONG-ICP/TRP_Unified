#!/usr/bin/env python3
"""
Install raven_ai WASM using Python IC SDK
"""

import os
from pathlib import Path
from ic.agent import Agent
from ic.identity import Identity
from ic.candid import Types
from ic.canister import Canister
from ic.principal import Principal

RAVEN_AI_ID = "3noas-jyaaa-aaaao-a4xda-cai"

def load_identity():
    """Load identity from dfx config"""
    home = Path.home()
    pem_path = home / ".config" / "dfx" / "identity" / "ic_deploy" / "identity.pem"
    
    if not pem_path.exists():
        pem_path = home / ".config" / "dfx" / "identity" / "default" / "identity.pem"
    
    with open(pem_path, 'r') as f:
        pem_content = f.read()
    
    # Create identity from PEM
    identity = Identity.from_pem(pem_content)
    return identity

def main():
    print("🚀 Installing raven_ai via Python IC SDK\n")
    
    identity = load_identity()
    print(f"✅ Identity: {identity.principal().to_str()}\n")
    
    agent = Agent(identity, url="https://ic0.app")
    
    wasm_path = Path("target/wasm32-unknown-unknown/release/raven_ai.wasm")
    if not wasm_path.exists():
        print(f"❌ WASM file not found: {wasm_path}")
        return
    
    wasm_module = wasm_path.read_bytes()
    print(f"✅ WASM: {len(wasm_module) / 1024 / 1024:.2f} MB\n")
    
    management_canister = Principal.from_str("aaaaa-aa")
    canister_id = Principal.from_str(RAVEN_AI_ID)
    
    print("📦 Installing WASM...")
    try:
        # Use management canister to install code
        result = agent.update(
            management_canister,
            "install_code",
            {
                "mode": {"reinstall": None},
                "canister_id": canister_id,
                "wasm_module": list(wasm_module),
                "arg": [],
            }
        )
        
        print("✅ Installation successful!\n")
        
        # Verify
        import time
        time.sleep(5)
        
        print("🧪 Verifying...")
        raven_canister = Canister(agent=agent, canister_id=canister_id)
        stats = raven_canister.query("get_article_stats", {})
        
        print("✅ raven_ai is WORKING!")
        print(f"   Total articles: {stats.get('total_articles', 'N/A')}")
        print(f"   Next article ID: {stats.get('next_article_id', 'N/A')}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        if "canister_not_found" in str(e):
            print("\n💡 Management Canister API routing issue persists.")
            print("   This is a network/subnet issue that cannot be fixed programmatically.")
        raise

if __name__ == "__main__":
    main()
