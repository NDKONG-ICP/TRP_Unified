#!/usr/bin/env python3
"""
IC Dashboard Deployment Helper
This script helps prepare files for IC Dashboard deployment
"""

import os
import json
import shutil
from pathlib import Path

def main():
    base_dir = Path(__file__).parent
    wasm_dir = base_dir / "target/wasm32-unknown-unknown/release"
    backend_dir = base_dir / "backend"
    output_dir = base_dir / "deployment_package"
    
    # Create deployment package directory
    output_dir.mkdir(exist_ok=True)
    
    canisters = [
        "siwe_canister",
        "siws_canister", 
        "siwb_canister",
        "sis_canister",
        "ordinals_canister"
    ]
    
    print("📦 Preparing Deployment Package for IC Dashboard\n")
    
    deployment_info = {}
    
    for canister in canisters:
        wasm_file = wasm_dir / f"{canister}.wasm"
        candid_file = backend_dir / canister / f"{canister}.did"
        
        if wasm_file.exists() and candid_file.exists():
            # Copy files to deployment package
            wasm_dest = output_dir / f"{canister}.wasm"
            candid_dest = output_dir / f"{canister}.did"
            
            shutil.copy2(wasm_file, wasm_dest)
            shutil.copy2(candid_file, candid_dest)
            
            deployment_info[canister] = {
                "wasm": str(wasm_dest.relative_to(base_dir)),
                "candid": str(candid_dest.relative_to(base_dir)),
                "wasm_size_kb": round(wasm_file.stat().st_size / 1024, 1)
            }
            
            print(f"✅ {canister}")
            print(f"   WASM: {wasm_dest} ({deployment_info[canister]['wasm_size_kb']} KB)")
            print(f"   Candid: {candid_dest}")
        else:
            print(f"❌ {canister}: Files not found")
            if not wasm_file.exists():
                print(f"   Missing: {wasm_file}")
            if not candid_file.exists():
                print(f"   Missing: {candid_file}")
    
    # Create deployment instructions
    instructions = f"""# IC Dashboard Deployment Instructions

## Files Ready in: {output_dir.relative_to(base_dir)}/

## Deployment Steps:

1. Go to https://dashboard.internetcomputer.org/
2. Navigate to "Canisters" section
3. For each canister below, click "Create Canister" or "Deploy":

"""
    
    for canister, info in deployment_info.items():
        instructions += f"""
### {canister}
- **WASM File**: `{info['wasm']}` ({info['wasm_size_kb']} KB)
- **Candid File**: `{info['candid']}`
- Upload both files
- Click Deploy
- **Copy the canister ID** and update `frontend/src/services/canisterConfig.ts`

"""
    
    instructions += """
## After Deployment:

1. Update `frontend/src/services/canisterConfig.ts` with canister IDs:
   ```typescript
   siwe_canister: import.meta.env.VITE_SIWE_CANISTER_ID || 'YOUR_ID_HERE',
   siws_canister: import.meta.env.VITE_SIWS_CANISTER_ID || 'YOUR_ID_HERE',
   siwb_canister: import.meta.env.VITE_SIWB_CANISTER_ID || 'YOUR_ID_HERE',
   sis_canister: import.meta.env.VITE_SIS_CANISTER_ID || 'YOUR_ID_HERE',
   ordinals_canister: import.meta.env.VITE_ORDINALS_CANISTER_ID || 'YOUR_ID_HERE',
   ```

2. Rebuild frontend:
   ```bash
   cd frontend
   npm run build
   ```

3. Deploy frontend assets via IC Dashboard or when dfx is fixed.
"""
    
    instructions_file = output_dir / "DEPLOYMENT_INSTRUCTIONS.md"
    with open(instructions_file, 'w') as f:
        f.write(instructions)
    
    # Save deployment info as JSON
    info_file = output_dir / "deployment_info.json"
    with open(info_file, 'w') as f:
        json.dump(deployment_info, f, indent=2)
    
    print(f"\n✅ Deployment package created in: {output_dir}")
    print(f"📄 Instructions: {instructions_file}")
    print(f"📋 Info file: {info_file}")
    print(f"\n🚀 Ready to deploy via IC Dashboard!")

if __name__ == "__main__":
    main()

