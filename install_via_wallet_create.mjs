#!/usr/bin/env node
/**
 * Create new canister via wallet and install WASM
 * Wallet canister can create canisters and might work where Management Canister fails
 */

import { readFileSync, writeFileSync } from 'fs';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { homedir } from 'os';
import { join } from 'path';

const WALLET_ID = 'daf6l-jyaaa-aaaao-a4nba-cai';
const OLD_RAVEN_AI_ID = '3noas-jyaaa-aaaao-a4xda-cai';

function loadIdentity() {
  const pemPath = join(homedir(), '.config', 'dfx', 'identity', 'ic_deploy', 'identity.pem');
  return Secp256k1KeyIdentity.fromPem(readFileSync(pemPath, 'utf-8'));
}

async function main() {
  console.log('🚀 Creating raven_ai via wallet and installing WASM\n');

  const identity = loadIdentity();
  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  const wasmPath = 'target/wasm32-unknown-unknown/release/raven_ai.wasm';
  const wasmModule = readFileSync(wasmPath);
  
  console.log(`✅ WASM: ${(wasmModule.length / 1024 / 1024).toFixed(2)} MB\n`);

  // Wallet canister interface
  const walletIDL = ({ IDL }) => IDL.Service({
    wallet_create_canister: IDL.Func(
      [
        IDL.Record({
          cycles: IDL.Nat64,
          settings: IDL.Opt(IDL.Record({
            controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
          })),
        }),
      ],
      [IDL.Record({ canister_id: IDL.Principal })],
      []
    ),
  });

  // Management canister interface for install_code
  const managementIDL = ({ IDL }) => IDL.Service({
    install_code: IDL.Func(
      [
        IDL.Record({
          mode: IDL.Variant({
            install: IDL.Null,
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

  const walletActor = Actor.createActor(walletIDL, {
    agent,
    canisterId: Principal.fromText(WALLET_ID),
  });

  const managementActor = Actor.createActor(managementIDL, {
    agent,
    canisterId: Principal.fromText('aaaaa-aa'),
  });

  try {
    console.log('📦 Creating canister via wallet...');
    const createResult = await walletActor.wallet_create_canister({
      cycles: BigInt(100_000_000_000), // 100B cycles
      settings: [],
    });
    
    const newCanisterId = createResult.canister_id.toText();
    console.log(`✅ Created new canister: ${newCanisterId}\n`);
    
    console.log('📦 Installing WASM...');
    await managementActor.install_code({
      mode: { install: null },
      canister_id: createResult.canister_id,
      wasm_module: Array.from(new Uint8Array(wasmModule)),
      arg: [],
    });
    
    console.log('✅ WASM installed successfully!\n');
    
    // Update frontend config
    console.log('📝 Updating frontend config...');
    const configPath = 'frontend/src/services/canisterConfig.ts';
    let config = readFileSync(configPath, 'utf8');
    
    config = config.replace(
      /raven_ai:\s*['"]3noas-jyaaa-aaaao-a4xda-cai['"]/,
      `raven_ai: '${newCanisterId}'`
    );
    
    writeFileSync(configPath, config, 'utf8');
    console.log(`✅ Updated frontend config: ${newCanisterId}\n`);
    
    // Verify
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
      canisterId: createResult.canister_id,
    });

    const stats = await ravenActor.get_article_stats();
    console.log('✅ raven_ai is WORKING!');
    console.log(`   Total articles: ${stats.total_articles}`);
    console.log(`   Next article ID: ${stats.next_article_id}`);
    console.log(`\n🎉 SUCCESS! New canister: ${newCanisterId}`);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    
    if (error.message.includes('canister_not_found')) {
      console.error('\n💡 Even wallet creation failed.');
      console.error('   The Management Canister API appears to be completely blocked.');
      console.error('   This might be a network/subnet issue or API bug.');
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
