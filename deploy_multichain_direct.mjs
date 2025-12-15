#!/usr/bin/env node

/**
 * Deploy Multi-Chain Canisters Directly Using IC SDK
 * Bypasses dfx color bug by using @dfinity/agent directly
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Known canister IDs (from canisterConfig.ts)
const CANISTER_IDS = {
  siwe_canister: 'ehdei-liaaa-aaaao-a4zfa-cai',
  siws_canister: 'eacc4-gqaaa-aaaao-a4zfq-cai',
  siwb_canister: 'evftr-hyaaa-aaaao-a4zga-cai',
  sis_canister: 'e3h6z-4iaaa-aaaao-a4zha-cai',
  ordinals_canister: 'gb3wf-cyaaa-aaaao-a4zia-cai',
};

// Load identity
function loadIdentity() {
  const identityName = 'ic_deploy';
  try {
    // Try to get identity from dfx
    const pem = execSync(`dfx identity export ${identityName}`, { encoding: 'utf-8' });
    return Secp256k1KeyIdentity.fromPem(pem);
  } catch (error) {
    console.error('Failed to load identity:', error.message);
    process.exit(1);
  }
}

// Create agent
function createAgent(identity) {
  const host = 'https://ic0.app';
  const agent = new HttpAgent({ 
    host,
    identity,
  });
  // No need to fetch root key for mainnet
  return agent;
}

// Install code on canister
async function installCode(agent, canisterId, wasmPath) {
  const wasm = readFileSync(wasmPath);
  const canisterPrincipal = Principal.fromText(canisterId);
  
  // Management canister ID
  const managementCanisterId = Principal.fromText('aaaaa-aa');
  
  // Install code arguments
  const installCodeArgs = {
    mode: { upgrade: null },
    canister_id: canisterPrincipal,
    wasm_module: Array.from(wasm),
    arg: new Uint8Array(0),
  };
  
  // Encode arguments
  const installCodeIdl = IDL.Service({
    install_code: IDL.Func(
      [
        IDL.Record({
          mode: IDL.Variant({
            install: IDL.Null,
            reinstall: IDL.Null,
            upgrade: IDL.Null,
          }),
          canister_id: IDL.Principal,
          wasm_module: IDL.Vec(IDL.Nat8),
          arg: IDL.Vec(IDL.Nat8),
        }),
      ],
      [],
      []
    ),
  });
  
  try {
    console.log(`  Installing code on ${canisterId}...`);
    await agent.call(managementCanisterId, {
      methodName: 'install_code',
      arg: IDL.encode(installCodeIdl, [installCodeArgs]),
    });
    console.log(`  ✅ Successfully installed code on ${canisterId}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to install code:`, error.message);
    return false;
  }
}

// Main deployment function
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔗 Deploying Multi-Chain Canisters (Direct IC SDK)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  // Load identity
  console.log('📋 Loading identity...');
  const identity = loadIdentity();
  console.log(`   Principal: ${identity.getPrincipal().toText()}`);
  console.log('');
  
  // Create agent
  console.log('🌐 Creating agent...');
  const agent = createAgent(identity);
  console.log('   ✅ Agent created');
  console.log('');
  
  // Deploy each canister
  const canisters = [
    { name: 'siwe_canister', id: CANISTER_IDS.siwe_canister },
    { name: 'siws_canister', id: CANISTER_IDS.siws_canister },
    { name: 'siwb_canister', id: CANISTER_IDS.siwb_canister },
    { name: 'sis_canister', id: CANISTER_IDS.sis_canister },
    { name: 'ordinals_canister', id: CANISTER_IDS.ordinals_canister },
  ];
  
  console.log('🚀 Deploying canisters...');
  console.log('');
  
  for (const canister of canisters) {
    console.log(`📦 ${canister.name} (${canister.id})`);
    
    const wasmPath = join(process.cwd(), 'backend', canister.name, 'target', 'wasm32-unknown-unknown', 'release', `${canister.name}.wasm`);
    
    // Check if WASM exists
    try {
      readFileSync(wasmPath);
    } catch (error) {
      console.log(`  ⚠️  WASM not found at ${wasmPath}`);
      console.log(`  Building ${canister.name}...`);
      try {
        execSync(`cd backend && cargo build --target wasm32-unknown-unknown --release --package ${canister.name}`, {
          stdio: 'inherit',
        });
      } catch (buildError) {
        console.error(`  ❌ Build failed: ${buildError.message}`);
        continue;
      }
    }
    
    // Install code
    const success = await installCode(agent, canister.id, wasmPath);
    
    if (success) {
      console.log(`  ✅ ${canister.name} deployed successfully`);
    } else {
      console.log(`  ❌ ${canister.name} deployment failed`);
    }
    
    console.log('');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Deployment Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📊 Canister IDs:');
  for (const canister of canisters) {
    console.log(`  ${canister.name.padEnd(25)} ${canister.id}`);
  }
  console.log('');
}

main().catch(console.error);

