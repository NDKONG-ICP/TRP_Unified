#!/usr/bin/env node
/**
 * Start canister if stopped, then install WASM
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
  const pemPath = join(homedir(), '.config', 'dfx', 'identity', 'ic_deploy', 'identity.pem');
  return Secp256k1KeyIdentity.fromPem(readFileSync(pemPath, 'utf-8'));
}

async function main() {
  console.log('🚀 Starting canister and installing WASM\n');

  const identity = loadIdentity();
  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  const managementIDL = ({ IDL }) => IDL.Service({
    start_canister: IDL.Func(
      [IDL.Record({ canister_id: IDL.Principal })],
      [],
      []
    ),
    stop_canister: IDL.Func(
      [IDL.Record({ canister_id: IDL.Principal })],
      [],
      []
    ),
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

  const canisterId = Principal.fromText(RAVEN_AI_ID);

  try {
    // Try to start the canister first (in case it's stopped)
    console.log('🔍 Starting canister (if stopped)...');
    try {
      await managementActor.start_canister({ canister_id: canisterId });
      console.log('✅ Canister started\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
      if (e.message.includes('already running') || e.message.includes('already started')) {
        console.log('✅ Canister is already running\n');
      } else {
        console.log(`⚠️  Could not start canister: ${e.message}\n`);
      }
    }

    // Now install WASM
    const wasmPath = 'target/wasm32-unknown-unknown/release/raven_ai.wasm';
    const wasmModule = readFileSync(wasmPath);
    
    console.log(`📦 Installing WASM (${(wasmModule.length / 1024 / 1024).toFixed(2)} MB)...`);
    console.log(`   Canister: ${RAVEN_AI_ID}\n`);

    await managementActor.install_code({
      mode: { reinstall: null },
      canister_id: canisterId,
      wasm_module: Array.from(new Uint8Array(wasmModule)),
      arg: [],
    });

    console.log('✅ Installation successful!\n');
    console.log('🧪 Verifying...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const ravenAIIDL = ({ IDL }) => IDL.Service({
      get_article_stats: IDL.Func([], [IDL.Record({
        total_articles: IDL.Nat64,
        next_article_id: IDL.Nat64,
      })], ['query']),
    });

    const ravenActor = Actor.createActor(ravenAIIDL, {
      agent,
      canisterId: canisterId,
    });

    const stats = await ravenActor.get_article_stats();
    console.log('✅ raven_ai is WORKING!');
    console.log(`   Total articles: ${stats.total_articles}`);
    console.log(`   Next article ID: ${stats.next_article_id}`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    
    if (error.message.includes('canister_not_found')) {
      console.error('\n💡 "canister_not_found" persists.');
      console.error('   This suggests a subnet routing issue with Management Canister.');
      console.error('   The canister exists but Management Canister cannot route to it.');
      console.error('\n   Possible solutions:');
      console.error('   1. Wait 5-10 minutes and retry (subnet sync)');
      console.error('   2. Check if canister is on a different subnet');
      console.error('   3. Use dfx (if color issue can be bypassed)');
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
