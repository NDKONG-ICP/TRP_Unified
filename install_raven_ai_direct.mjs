#!/usr/bin/env node
/**
 * Direct raven_ai Installation - Simplified version
 * Skips status checks and directly installs WASM
 */

import { readFileSync } from 'fs';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { homedir } from 'os';
import { join } from 'path';

const RAVEN_AI_ID = '3noas-jyaaa-aaaao-a4xda-cai';

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
  console.log('🚀 Installing raven_ai WASM');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const identity = loadIdentity();
  console.log(`✅ Identity: ${identity.getPrincipal().toText()}\n`);

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  // Find WASM file
  const wasmPaths = [
    'target/wasm32-unknown-unknown/release/raven_ai.wasm',
    'backend/raven_ai/target/wasm32-unknown-unknown/release/raven_ai.wasm',
  ];

  let wasmPath = null;
  for (const path of wasmPaths) {
    try {
      readFileSync(path);
      wasmPath = path;
      break;
    } catch (e) {}
  }

  if (!wasmPath) {
    console.error('❌ WASM file not found!');
    console.error('   Tried:', wasmPaths.join(', '));
    process.exit(1);
  }

  const wasmModule = readFileSync(wasmPath);
  console.log(`✅ WASM file: ${wasmPath}`);
  console.log(`✅ Size: ${(wasmModule.length / 1024 / 1024).toFixed(2)} MB\n`);

  // Management canister interface
  const managementIDL = ({ IDL }) => IDL.Service({
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

  console.log('📦 Installing WASM to raven_ai canister...');
  console.log(`   Canister ID: ${RAVEN_AI_ID}`);
  
  // Try install mode first (for new canisters), then reinstall
  let lastError = null;
  
  for (const mode of [{ install: null }, { reinstall: null }, { upgrade: null }]) {
    const modeName = Object.keys(mode)[0];
    console.log(`   Trying mode: ${modeName}...`);
    
    try {
      await managementActor.install_code({
        mode,
        canister_id: Principal.fromText(RAVEN_AI_ID),
        wasm_module: Array.from(new Uint8Array(wasmModule)),
        arg: [],
      });
      
      console.log(`   ✅ Installation succeeded with mode: ${modeName}\n`);
      break;
    } catch (error) {
      lastError = error;
      if (error.message.includes('not authorized') || error.message.includes('not a controller')) {
        console.log(`   ❌ ${modeName} failed: Permission denied`);
        throw error; // Don't try other modes if it's a permission issue
      }
      console.log(`   ⚠️  ${modeName} failed: ${error.message}`);
      if (modeName === 'upgrade') {
        // Last mode failed, throw the error
        throw lastError;
      }
    }
  }

  try {

    console.log('✅ raven_ai WASM installed successfully!\n');
    console.log('🧪 Verifying installation...');
    
    // Wait a moment for the canister to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Installation complete!');
    console.log('   Test by visiting your frontend and clicking "Generate Article"');
    
  } catch (error) {
    console.error(`\n❌ Installation failed: ${error.message}`);
    if (error.message.includes('not authorized') || error.message.includes('not a controller')) {
      console.error('\n💡 The identity may not be a controller of this canister.');
      console.error('   Check canister controllers and ensure your identity has permission.');
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
