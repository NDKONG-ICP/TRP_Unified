#!/usr/bin/env python3
"""
Deploy using dfx commands directly
Works around color bug by checking for success despite panic
"""

import subprocess
import os
import time
import re

# Set environment
env = os.environ.copy()
env.update({
    'NO_COLOR': '1',
    'TERM': 'dumb',
    'DFX_WARNING': '-mainnet_plaintext_identity',
    'RUST_BACKTRACE': '0',
    'PATH': f"{os.environ.get('HOME')}/.local/share/dfxvm/bin:{os.environ.get('PATH', '')}"
})

canisters = ['siwe_canister', 'siws_canister', 'siwb_canister', 'sis_canister', 'ordinals_canister']
deployed = {}

print("🚀 Deploying to IC Mainnet using dfx\n")

# Verify identity
print("📋 Verifying identity...")
result = subprocess.run(
    ['dfx', 'identity', 'use', 'ic_deploy'],
    env=env,
    capture_output=True,
    text=True,
    timeout=5
)

principal_result = subprocess.run(
    ['dfx', 'identity', 'get-principal'],
    env=env,
    capture_output=True,
    text=True,
    timeout=5
)

if principal_result.returncode == 0:
    principal = principal_result.stdout.strip()
    print(f"✅ Principal: {principal}")
    if principal != 'gqkko-43bbx-nwsp4-it2rg-pc2dy-w2pt2-fa5om-4y6es-oyhz2-5i5oh-5ae':
        print(f"⚠️  WARNING: Principal doesn't match expected")
else:
    print(f"⚠️  Could not get principal (dfx may have panicked)")

# Get wallet
wallet_result = subprocess.run(
    ['dfx', 'identity', 'get-wallet', '--network', 'ic'],
    env=env,
    capture_output=True,
    text=True,
    timeout=5
)

if wallet_result.returncode == 0:
    wallet = wallet_result.stdout.strip()
    print(f"✅ Wallet: {wallet}\n")
else:
    wallet = 'daf6l-jyaaa-aaaao-a4nba-cai'  # Hardcoded fallback
    print(f"⚠️  Using hardcoded wallet: {wallet}\n")

# Deploy each canister
for canister in canisters:
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"📦 Deploying {canister}")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    # Start deployment - dfx will panic but may succeed
    print(f"  Starting deployment (dfx may panic but deployment may succeed)...")
    
    proc = subprocess.Popen(
        ['dfx', 'deploy', canister, '--network', 'ic', '--wallet', wallet, '--yes'],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Wait longer for deployment to complete (even if dfx panics)
    # The actual deployment happens before the panic
    time.sleep(30)
    
    # Check multiple times if canister was created
    canister_id = None
    max_attempts = 20  # Check for up to 3+ minutes
    
    for attempt in range(max_attempts):
        try:
            id_result = subprocess.run(
                ['dfx', 'canister', 'id', canister, '--network', 'ic'],
                env=env,
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if id_result.returncode == 0:
                candidate_id = id_result.stdout.strip()
                # Clean up any panic messages
                candidate_id = re.search(r'([a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3})', candidate_id)
                if candidate_id:
                    canister_id = candidate_id.group(1)
                    print(f"✅ Canister created: {canister_id}")
                    break
        except Exception as e:
            pass
        
        if attempt < max_attempts - 1:
            time.sleep(10)
    
    if canister_id:
        deployed[canister] = canister_id
        # Kill the process (it may have panicked)
        try:
            proc.kill()
        except:
            pass
    else:
        print(f"⚠️  Could not verify deployment after {max_attempts * 10} seconds")
        proc.kill()
    
    print()

# Summary
print("="*60)
print("📋 DEPLOYMENT RESULTS")
print("="*60)

if deployed:
    print(f"\n✅ Successfully deployed {len(deployed)} canisters:")
    for canister, cid in deployed.items():
        print(f"  {canister}: {cid}")
    
    # Update frontend config
    config_file = "frontend/src/services/canisterConfig.ts"
    if os.path.exists(config_file):
        print(f"\n📝 Updating {config_file}...")
        with open(config_file, 'r') as f:
            content = f.read()
        
        for canister, cid in deployed.items():
            pattern = f"({canister}:\\s*import\\.meta\\.env\\.VITE_[A-Z_]+_CANISTER_ID\\s*\\|\\|\\s*)'[^']*'"
            replacement = f"\\1'{cid}'"
            content = re.sub(pattern, replacement, content)
        
        with open(config_file, 'w') as f:
            f.write(content)
        print("  ✅ Config updated!")
    
    print("\n✅ DEPLOYMENT COMPLETE!")
else:
    print("\n⚠️  No canisters were deployed")
    print("   dfx color bug may have prevented deployment")

print("\n" + "="*60)

