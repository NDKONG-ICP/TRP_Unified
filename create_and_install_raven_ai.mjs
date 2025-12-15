#!/usr/bin/env node
/**
 * Create raven_ai canister if needed and install WASM
 * Uses Management Canister to create canister, then install code
 */

import { readFileSync } from 'fs';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { homedir } from 'os';
import { join } from 'path';

function loadIdentity() {
  const paths = [
    join(homedir(), '.config', 'dfx', 'identity', 'ic_deploy', 'identity.pem'),
    join(homedir(), '.config', 'dfx', 'identity', 'default', 'identity.pem'),
  ];
  
  for (const path of paths) {
    try {
      return Secp256k1KeyIdentity.fromPem(readFileSync(path, 'utf-8'));
    } catch (e) {}
  }
  throw new Error('Could not load identity');
}

async function main() {
  console.log('🚀 Creating and installing raven_ai canister\n');

  const identity = loadIdentity();
  console.log(`Identity: ${identity.getPrincipal().toText()}\n`);

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  const wasmPath = 'target/wasm32-unknown-unknown/release/raven_ai.wasm';
  const wasmModule = readFileSync(wasmPath);
  
  console.log(`✅ WASM: ${(wasmModule.length / 1024 / 1024).toFixed(2)} MB\n`);

  const managementIDL = ({ IDL }) => IDL.Service({
    create_canister: IDL.Func(
      [IDL.Record({
        settings: IDL.Opt(IDL.Record({
          controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
          compute_allocation: IDL.Opt(IDL.Nat),
          memory_allocation: IDL.Opt(IDL.Nat),
          freezing_threshold: IDL.Opt(IDL.Nat),
        })),
      })],
      [IDL.Record({ canister_id: IDL.Principal })],
      []
    ),
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

  const managementActor = Actor.createActor(managementIDL, {
    agent,
    canisterId: Principal.fromText('aaaaa-aa'),
  });

  // Try to create canister first - use empty settings (all optional)
  console.log('📦 Creating new canister...');
  try {
    const createResult = await managementActor.create_canister({
      settings: [],
    });
    
    const newCanisterId = createResult.canister_id.toText();
    console.log(`✅ Created canister: ${newCanisterId}\n`);
    
    console.log('📦 Installing WASM...');
    await managementActor.install_code({
      mode: { install: null },
      canister_id: createResult.canister_id,
      wasm_module: Array.from(new Uint8Array(wasmModule)),
      arg: [],
    });
    
    console.log(`✅ raven_ai installed successfully!`);
    console.log(`\n📝 IMPORTANT: Update frontend config with new canister ID:`);
    console.log(`   raven_ai: '${newCanisterId}'`);
    console.log(`\n   File: frontend/src/services/canisterConfig.ts`);
    
  } catch (error) {
    if (error.message.includes('insufficient cycles')) {
      console.error('❌ Insufficient cycles to create canister');
      console.error('💡 Transfer cycles to your identity first');
    } else {
      console.error(`❌ Error: ${error.message}`);
    }
    process.exit(1);
  }
}

main().catch(console.error);
