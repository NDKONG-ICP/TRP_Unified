#!/usr/bin/env python3
"""
Deploy canisters using ic-py (Python SDK)
This might have better wallet support than Node.js SDK
"""

import os
from pathlib import Path
from ic.identity import Identity
from ic.agent import Agent
from ic.principal import Principal
from ic.candid import encode, decode, Types

# Load identity - ic-py might need different format
# Try loading the PEM content and using secp256k1
identity_path = Path.home() / '.config/dfx/identity/ic_deploy/identity.pem'
print(f"Loading identity from: {identity_path}")

# Read PEM content
pem_content = identity_path.read_text()

# Try using Identity.from_pem with the content directly
# Or try secp256k1 if available
try:
    from ic.identity import Secp256k1Identity
    # Extract private key from EC PRIVATE KEY format
    import base64
    import re
    from ecdsa import SigningKey, SECP256k1
    
    # Parse EC PRIVATE KEY
    pem_match = re.search(r'-----BEGIN EC PRIVATE KEY-----\n(.*?)\n-----END EC PRIVATE KEY-----', pem_content, re.DOTALL)
    if pem_match:
        der = base64.b64decode(pem_match.group(1))
        # Extract the 32-byte private key (last 32 bytes of DER)
        private_key_bytes = der[-32:]
        key = SigningKey.from_string(private_key_bytes, curve=SECP256k1)
        identity = Secp256k1Identity.from_signing_key(key)
    else:
        identity = Identity.from_pem(str(identity_path))
except Exception as e:
    print(f"⚠️  Error loading identity: {e}")
    print("Trying standard Identity.from_pem...")
    identity = Identity.from_pem(str(identity_path))

print(f"✅ Identity: {identity.sender().to_str()}\n")

# Create agent
agent = Agent(identity, host="https://ic0.app")

# Wallet ID
wallet_id = Principal.from_str('daf6l-jyaaa-aaaao-a4nba-cai')

# Management canister
management_id = Principal.from_str('aaaaa-aa')

print(f"✓ Wallet: {wallet_id.to_str()}")
print(f"✓ Management: {management_id.to_str()}\n")

# Wallet interface - try with settings as optional
def deploy_canister(canister_name, wasm_path):
    print(f"\n📦 Deploying {canister_name}...")
    
    wasm_path_obj = Path(wasm_path)
    if not wasm_path_obj.exists():
        print(f"   ❌ WASM not found: {wasm_path}")
        return None
    
    wasm_bytes = wasm_path_obj.read_bytes()
    print(f"   ✓ WASM loaded: {len(wasm_bytes)} bytes")
    
    # Try wallet_create_canister
    try:
        print("   Creating canister via wallet...")
        
        # Encode arguments manually
        # wallet_create_canister(record {cycles: nat64; settings: opt record {...}})
        request_type = Types.Record({
            'cycles': Types.Nat64,
            'settings': Types.Opt(Types.Record({
                'controller': Types.Opt(Types.Principal),
                'freezing_threshold': Types.Opt(Types.Nat),
                'controllers': Types.Opt(Types.Vec(Types.Principal)),
                'memory_allocation': Types.Opt(Types.Nat),
                'compute_allocation': Types.Opt(Types.Nat),
            })),
        })
        
        # Encode with settings as None (empty for opt)
        args = encode([request_type], [{
            'cycles': 100_000_000_000,
            'settings': None,  # None for opt = use defaults
        }])
        
        # Call wallet
        result = agent.call(wallet_id, 'wallet_create_canister', args)
        
        # Decode result
        result_type = Types.Record({'canister_id': Types.Principal})
        decoded = decode([result_type], result)[0]
        canister_id = decoded['canister_id']
        
        print(f"   ✓ Canister created: {canister_id.to_str()}")
        
        # Install WASM
        print("   Installing WASM...")
        install_type = Types.Record({
            'mode': Types.Variant({'install': Types.Null}),
            'canister_id': Types.Principal,
            'wasm_module': Types.Vec(Types.Nat8),
            'arg': Types.Vec(Types.Nat8),
        })
        
        install_args = encode([install_type], [{
            'mode': {'install': None},
            'canister_id': canister_id,
            'wasm_module': list(wasm_bytes),
            'arg': [],
        }])
        
        agent.call(management_id, 'install_code', install_args)
        
        print(f"   ✅ {canister_name} deployed: {canister_id.to_str()}")
        return canister_id.to_str()
        
    except Exception as e:
        print(f"   ❌ Failed: {str(e)[:200]}")
        return None

# Deploy all canisters
canisters = [
    ('siwe_canister', './target/wasm32-unknown-unknown/release/siwe_canister.wasm'),
    ('siws_canister', './target/wasm32-unknown-unknown/release/siws_canister.wasm'),
    ('siwb_canister', './target/wasm32-unknown-unknown/release/siwb_canister.wasm'),
    ('sis_canister', './target/wasm32-unknown-unknown/release/sis_canister.wasm'),
    ('ordinals_canister', './target/wasm32-unknown-unknown/release/ordinals_canister.wasm'),
]

deployed = {}
for name, wasm in canisters:
    canister_id = deploy_canister(name, wasm)
    if canister_id:
        deployed[name] = canister_id
    import time
    time.sleep(3)

print('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
print('📋 DEPLOYMENT SUMMARY')
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

if deployed:
    print('✅ Successfully deployed:')
    for name, cid in deployed.items():
        print(f"   {name}: {cid}")
else:
    print('❌ No canisters were deployed')

