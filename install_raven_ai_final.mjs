#!/usr/bin/env node
/**
 * Final installation attempt - using correct identity and proper error handling
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
  // Use ic_deploy identity (the one that's a controller)
  const pemPath = join(homedir(), '.config', 'dfx', 'identity', 'ic_deploy', 'identity.pem');
  return Secp256k1KeyIdentity.fromPem(readFileSync(pemPath, 'utf-8'));
}

async function main() {
  console.log('🚀 Installing raven_ai WASM (using controller identity)\n');

  const identity = loadIdentity();
  const identityPrincipal = identity.getPrincipal();
  console.log(`✅ Identity: ${identityPrincipal.toText()}`);
  console.log(`   (This identity IS a controller)\n`);

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  // Verify we can access the canister first
  console.log('🔍 Verifying canister access...');
  try {
    await agent.readState(Principal.fromText(RAVEN_AI_ID), { paths: [] });
    console.log('✅ Can read canister state\n');
  } catch (e) {
    console.error(`❌ Cannot read canister: ${e.message}`);
    process.exit(1);
  }

  const wasmPath = 'target/wasm32-unknown-unknown/release/raven_ai.wasm';
  const wasmModule = readFileSync(wasmPath);
  
  console.log(`✅ WASM: ${(wasmModule.length / 1024 / 1024).toFixed(2)} MB\n`);

  const managementIDL = ({ IDL }) => IDL.Service({
    install_code: IDL.Func(
      [
        IDL.Record({
          mode: IDL.Variant({
            reinstall: IDL.Null,
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

  console.log('📦 Installing WASM...');
  console.log(`   Canister: ${RAVEN_AI_ID}`);
  console.log(`   Mode: reinstall\n`);

  try {
    const result = await managementActor.install_code({
      mode: { reinstall: null },
      canister_id: Principal.fromText(RAVEN_AI_ID),
      wasm_module: Array.from(new Uint8Array(wasmModule)),
      arg: [],
    });

    console.log('✅ Installation call completed!\n');
    console.log('🧪 Waiting for canister to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify it works
    console.log('🧪 Verifying installation...');
    const ravenAIIDL = ({ IDL }) => IDL.Service({
      get_article_stats: IDL.Func([], [IDL.Record({
        total_articles: IDL.Nat64,
        next_article_id: IDL.Nat64,
      })], ['query']),
    });

    const ravenActor = Actor.createActor(ravenAIIDL, {
      agent,
      canisterId: Principal.fromText(RAVEN_AI_ID),
    });

    const stats = await ravenActor.get_article_stats();
    console.log('✅ raven_ai is WORKING!');
    console.log(`   Total articles: ${stats.total_articles}`);
    console.log(`   Next article ID: ${stats.next_article_id}`);
    console.log('\n🎉 Installation successful!');
    
  } catch (error) {
    console.error(`\n❌ Installation failed: ${error.message}`);
    
    // Check if it's a specific error we can handle
    if (error.message.includes('canister_not_found')) {
      console.error('\n💡 "canister_not_found" error even though identity is controller.');
      console.error('   This might be a subnet/network issue.');
      console.error('   Try:');
      console.error('   1. Wait a few minutes and retry');
      console.error('   2. Check if canister is on a different subnet');
      console.error('   3. Use IC Dashboard as alternative');
    } else if (error.message.includes('insufficient cycles')) {
      console.error('\n💡 Canister needs more cycles.');
    } else {
      console.error('\n💡 Full error details:', error);
    }
    
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
