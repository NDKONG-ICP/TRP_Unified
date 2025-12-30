#!/usr/bin/env node
/**
 * Install raven_ai WASM directly via Management Canister
 * Bypasses dfx completely
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
  console.log('🚀 Installing raven_ai WASM (Direct Method)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const identity = loadIdentity();
  console.log(`✅ Identity: ${identity.getPrincipal().toText()}\n`);

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

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

  try {
    console.log('📦 Installing WASM (reinstall mode)...');
    await managementActor.install_code({
      mode: { reinstall: null },
      canister_id: Principal.fromText(RAVEN_AI_ID),
      wasm_module: Array.from(new Uint8Array(wasmModule)),
      arg: [],
    });

    console.log('✅ WASM installed successfully!\n');

    // Verify
    console.log('🧪 Verifying installation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

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
    console.log(`\n🎉 SUCCESS! raven_ai canister is operational`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    
    if (error.message.includes('canister_not_found')) {
      console.error('\n💡 The canister does not exist on mainnet.');
      console.error('   You need to create it first via IC Dashboard or dfx.');
    } else if (error.message.includes('not a controller')) {
      console.error('\n💡 Identity is not a controller of this canister.');
      console.error(`   Current identity: ${identity.getPrincipal().toText()}`);
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
