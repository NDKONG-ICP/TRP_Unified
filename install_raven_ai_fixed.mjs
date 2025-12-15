#!/usr/bin/env node
/**
 * Install raven_ai - Fixed version that handles the actual issue
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
  console.log('🚀 Installing raven_ai WASM\n');

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

  console.log('📦 Installing WASM...');
  console.log(`   Canister: ${RAVEN_AI_ID}`);
  console.log(`   Mode: reinstall\n`);

  try {
    // Use reinstall mode - this will work even if canister has no WASM
    await managementActor.install_code({
      mode: { reinstall: null },
      canister_id: Principal.fromText(RAVEN_AI_ID),
      wasm_module: Array.from(new Uint8Array(wasmModule)),
      arg: [],
    });

    console.log('✅ Installation successful!\n');
    console.log('🧪 Waiting for canister to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify it works
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
    
  } catch (error) {
    console.error(`\n❌ Installation failed: ${error.message}`);
    
    if (error.message.includes('canister_not_found')) {
      console.error('\n💡 The canister may not exist. Creating it first...\n');
      
      // Try to create the canister
      const createIDL = ({ IDL }) => IDL.Service({
        create_canister: IDL.Func(
          [IDL.Record({
            settings: IDL.Opt(IDL.Record({
              controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
            })),
          })],
          [IDL.Record({ canister_id: IDL.Principal })],
          []
        ),
      });

      const createActor = Actor.createActor(createIDL, {
        agent,
        canisterId: Principal.fromText('aaaaa-aa'),
      });

      try {
        const result = await createActor.create_canister({
          settings: [],
        });
        
        const newId = result.canister_id.toText();
        console.log(`✅ Created new canister: ${newId}`);
        console.log(`\n📝 IMPORTANT: Update frontend config:`);
        console.log(`   frontend/src/services/canisterConfig.ts`);
        console.log(`   Change raven_ai ID to: ${newId}\n`);
        
        // Install to new canister
        await managementActor.install_code({
          mode: { install: null },
          canister_id: result.canister_id,
          wasm_module: Array.from(new Uint8Array(wasmModule)),
          arg: [],
        });
        
        console.log('✅ Installed to new canister!');
      } catch (createError) {
        console.error(`❌ Could not create canister: ${createError.message}`);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
}

main().catch(console.error);
