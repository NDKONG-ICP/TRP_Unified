#!/usr/bin/env node
/**
 * Create raven_ai - try with settings: undefined
 */

import { readFileSync, writeFileSync } from 'fs';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { homedir } from 'os';
import { join } from 'path';

const WALLET_ID = 'daf6l-jyaaa-aaaao-a4nba-cai';

function loadIdentity() {
  const pemPath = join(homedir(), '.config', 'dfx', 'identity', 'ic_deploy', 'identity.pem');
  return Secp256k1KeyIdentity.fromPem(readFileSync(pemPath, 'utf-8'));
}

async function main() {
  console.log('🚀 Creating raven_ai canister');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const identity = loadIdentity();
  const agent = new HttpAgent({ host: 'https://ic0.app', identity });

  const wasmPath = 'target/wasm32-unknown-unknown/release/raven_ai.wasm';
  const wasmModule = readFileSync(wasmPath);
  
  console.log(`✅ WASM: ${(wasmModule.length / 1024 / 1024).toFixed(2)} MB\n`);

  const WalletCreateIDL = ({ IDL }) => IDL.Service({
    wallet_create_canister: IDL.Func(
      [IDL.Record({
        cycles: IDL.Nat64,
        settings: IDL.Opt(IDL.Record({
          controller: IDL.Opt(IDL.Principal),
          freezing_threshold: IDL.Opt(IDL.Nat),
          controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
          memory_allocation: IDL.Opt(IDL.Nat),
          compute_allocation: IDL.Opt(IDL.Nat),
        })),
      })],
      [IDL.Record({ canister_id: IDL.Principal })],
      []
    ),
  });

  const wallet = Actor.createActor(WalletCreateIDL, {
    agent,
    canisterId: Principal.fromText(WALLET_ID),
  });

  // Management canister
  const managementIDL = ({ IDL }) => IDL.Service({
    install_code: IDL.Func(
      [
        IDL.Record({
          mode: IDL.Variant({ install: IDL.Null }),
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
    console.log('📦 Creating canister (with empty settings object)...');
    
    // Try with empty object - might encode as None for Opt
    const createResult = await wallet.wallet_create_canister({
      cycles: 600_000_000_000n,
      settings: {}, // Empty object
    });

    const canisterId = createResult.canister_id;
    const newCanisterId = canisterId.toText();
    console.log(`✅ Created: ${newCanisterId}\n`);

    console.log('📦 Installing WASM...');
    await managementActor.install_code({
      mode: { install: null },
      canister_id: canisterId,
      wasm_module: Array.from(new Uint8Array(wasmModule)),
      arg: [],
    });

    console.log('✅ WASM installed!\n');

    // Update config
    const configPath = 'frontend/src/services/canisterConfig.ts';
    let config = readFileSync(configPath, 'utf8');
    config = config.replace(
      /raven_ai:\s*['"]3noas-jyaaa-aaaao-a4xda-cai['"]/,
      `raven_ai: '${newCanisterId}'`
    );
    writeFileSync(configPath, config, 'utf8');
    console.log(`✅ Updated config: ${newCanisterId}\n`);

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
      canisterId: canisterId,
    });

    const stats = await ravenActor.get_article_stats();
    console.log('✅ raven_ai is WORKING!');
    console.log(`   Articles: ${stats.total_articles}`);
    console.log(`   Next ID: ${stats.next_article_id}`);
    console.log(`\n🎉 SUCCESS! ${newCanisterId}`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
