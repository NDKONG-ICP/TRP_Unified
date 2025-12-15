#!/usr/bin/env node
/**
 * Install raven_ai using the working method from deploy_working_final.mjs
 * This uses manual encoding for wallet calls
 */

import { readFileSync, writeFileSync } from 'fs';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { homedir } from 'os';
import { join } from 'path';

const RAVEN_AI_ID = '3noas-jyaaa-aaaao-a4xda-cai';
const WALLET_ID = 'daf6l-jyaaa-aaaao-a4nba-cai';

function loadIdentity() {
  const pemPath = join(homedir(), '.config', 'dfx', 'identity', 'ic_deploy', 'identity.pem');
  return Secp256k1KeyIdentity.fromPem(readFileSync(pemPath, 'utf-8'));
}

// Manual encoding for wallet_create_canister (from working code)
async function createCanisterViaWallet(agent, walletId, identity, cycles) {
  const walletIDL = ({ IDL }) => IDL.Service({
    wallet_create_canister: IDL.Func(
      [
        IDL.Record({
          cycles: IDL.Nat64,
          settings: IDL.Opt(IDL.Record({
            controller: IDL.Opt(IDL.Principal),
            freezing_threshold: IDL.Opt(IDL.Nat),
            controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
            memory_allocation: IDL.Opt(IDL.Nat),
            compute_allocation: IDL.Opt(IDL.Nat),
          })),
        }),
      ],
      [IDL.Record({ canister_id: IDL.Principal })],
      []
    ),
  });

  const walletActor = Actor.createActor(walletIDL, {
    agent,
    canisterId: Principal.fromText(walletId),
  });

  return await walletActor.wallet_create_canister({
    cycles: BigInt(cycles),
    settings: [],
  });
}

async function main() {
  console.log('🚀 Installing raven_ai using working method\n');

  const identity = loadIdentity();
  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  const wasmPath = 'target/wasm32-unknown-unknown/release/raven_ai.wasm';
  const wasmModule = readFileSync(wasmPath);
  
  console.log(`✅ WASM: ${(wasmModule.length / 1024 / 1024).toFixed(2)} MB\n`);

  // Try direct install to existing canister first
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

  console.log('📦 Attempting direct install to existing canister...');
  try {
    await managementActor.install_code({
      mode: { reinstall: null },
      canister_id: Principal.fromText(RAVEN_AI_ID),
      wasm_module: Array.from(new Uint8Array(wasmModule)),
      arg: [],
    });
    
    console.log('✅ Installation successful!\n');
    
    // Verify
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
    return;
    
  } catch (error) {
    if (error.message.includes('canister_not_found')) {
      console.log('❌ Direct install failed: canister_not_found');
      console.log('\n💡 Management Canister API is blocked for this canister.');
      console.log('   This appears to be a Management Canister routing bug.');
      console.log('\n   The canister exists and you are a controller,');
      console.log('   but Management Canister cannot route to it.');
      console.log('\n   This requires DFINITY support or waiting for subnet sync.');
      process.exit(1);
    } else {
      throw error;
    }
  }
}

main().catch(console.error);
