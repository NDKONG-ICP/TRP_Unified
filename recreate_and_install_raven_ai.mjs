#!/usr/bin/env node
/**
 * Recreate raven_ai canister and install WASM
 * This will get a NEW canister ID that Management Canister can route to
 */

import { readFileSync, writeFileSync } from 'fs';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { homedir } from 'os';
import { join } from 'path';

const OLD_RAVEN_AI_ID = '3noas-jyaaa-aaaao-a4xda-cai';

function loadIdentity() {
  const pemPath = join(homedir(), '.config', 'identity', 'ic_deploy', 'identity.pem');
  try {
    return Secp256k1KeyIdentity.fromPem(readFileSync(pemPath, 'utf-8'));
  } catch (e) {
    const altPath = join(homedir(), '.config', 'dfx', 'identity', 'ic_deploy', 'identity.pem');
    return Secp256k1KeyIdentity.fromPem(readFileSync(altPath, 'utf-8'));
  }
}

async function main() {
  console.log('🚀 RECREATING raven_ai canister and installing WASM');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️  This will create a NEW canister with a NEW ID');
  console.log('   Old ID: ' + OLD_RAVEN_AI_ID);
  console.log('   You will need to update frontend config with the new ID\n');

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
    create_canister: IDL.Func(
      [IDL.Record({
        settings: IDL.Opt(IDL.Record({
          controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
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
    console.log('📦 Creating new canister...');
    const createResult = await managementActor.create_canister({
      settings: [],
    });
    
    const newCanisterId = createResult.canister_id.toText();
    console.log(`✅ Created new canister: ${newCanisterId}\n`);
    
    console.log('📦 Installing WASM to new canister...');
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
    
    // Replace old ID with new ID
    config = config.replace(
      /raven_ai:\s*['"]3noas-jyaaa-aaaao-a4xda-cai['"]/,
      `raven_ai: '${newCanisterId}'`
    );
    
    writeFileSync(configPath, config, 'utf8');
    console.log(`✅ Updated ${configPath}`);
    console.log(`   Changed: 3noas-jyaaa-aaaao-a4xda-cai`);
    console.log(`   To:      ${newCanisterId}\n`);
    
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
      canisterId: createResult.canister_id,
    });

    const stats = await ravenActor.get_article_stats();
    console.log('✅ raven_ai is WORKING!');
    console.log(`   Total articles: ${stats.total_articles}`);
    console.log(`   Next article ID: ${stats.next_article_id}`);
    console.log(`\n🎉 SUCCESS! New canister ID: ${newCanisterId}`);
    console.log('\n📝 Also update dfx.json if needed:');
    console.log(`   Change canister ID in dfx.json to: ${newCanisterId}`);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient cycles')) {
      console.error('\n💡 Identity needs cycles to create canister.');
      console.error('   Transfer cycles to: ' + identity.getPrincipal().toText());
    } else if (error.message.includes('canister_not_found')) {
      console.error('\n💡 Even create_canister failed with "canister_not_found".');
      console.error('   This suggests the identity itself has issues with Management Canister.');
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
