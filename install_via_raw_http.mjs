#!/usr/bin/env node
/**
 * Install WASM using raw HTTP calls to bypass Management Canister API issues
 */

import { readFileSync } from 'fs';
import { HttpAgent } from '@dfinity/agent';
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
  console.log('🚀 Installing via raw HTTP (bypassing Management Canister API)\n');

  const identity = loadIdentity();
  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  const wasmPath = 'target/wasm32-unknown-unknown/release/raven_ai.wasm';
  const wasmModule = readFileSync(wasmPath);
  
  console.log(`✅ WASM: ${(wasmModule.length / 1024 / 1024).toFixed(2)} MB\n`);

  // Use agent.call directly instead of Actor
  const managementCanisterId = Principal.fromText('aaaaa-aa');
  const canisterId = Principal.fromText(RAVEN_AI_ID);

  // Build the install_code call manually
  const installCodeIDL = ({ IDL }) => IDL.Service({
    install_code: IDL.Func(
      [
        IDL.Record({
          mode: IDL.Variant({ reinstall: IDL.Null }),
          canister_id: IDL.Principal,
          wasm_module: IDL.Vec(IDL.Nat8),
          arg: IDL.Vec(IDL.Nat8),
        }),
      ],
      [],
      []
    ),
  });

  const args = {
    mode: { reinstall: null },
    canister_id: canisterId,
    wasm_module: Array.from(new Uint8Array(wasmModule)),
    arg: [],
  };

  console.log('📦 Calling install_code directly via agent...\n');

  try {
    // Use agent.call with the management canister
    const result = await agent.call(managementCanisterId, {
      methodName: 'install_code',
      arg: IDL.encode([installCodeIDL({ IDL })._fields.find(f => f[0] === 'install_code')[1].arg], [args]),
    });

    console.log('✅ Installation call completed!');
    console.log('🧪 Waiting for canister to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify
    const ravenAIIDL = ({ IDL }) => IDL.Service({
      get_article_stats: IDL.Func([], [IDL.Record({
        total_articles: IDL.Nat64,
        next_article_id: IDL.Nat64,
      })], ['query']),
    });

    const { Actor } = await import('@dfinity/agent');
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
    console.error('\n💡 Raw HTTP also failed. This suggests a fundamental routing issue.');
    process.exit(1);
  }
}

main().catch(console.error);
