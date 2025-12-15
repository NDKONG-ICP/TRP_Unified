#!/usr/bin/env node
/**
 * Create FRESH raven_ai canister and install WASM
 * The old canister doesn't exist on mainnet, so we create a new one
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
  const pemPath = join(homedir(), '.config', 'dfx', 'identity', 'ic_deploy', 'identity.pem');
  return Secp256k1KeyIdentity.fromPem(readFileSync(pemPath, 'utf-8'));
}

async function main() {
  console.log('🚀 Creating FRESH raven_ai canister on mainnet');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️  The old canister ID does not exist on mainnet.');
  console.log('   Creating a NEW canister and installing WASM.\n');

  const identity = loadIdentity();
  const identityPrincipal = identity.getPrincipal();
  console.log(`✅ Identity: ${identityPrincipal.toText()}\n`);

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
      settings: [{
        controllers: [[identityPrincipal]],
      }],
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
    
    // Replace old ID with new ID
    config = config.replace(
      /raven_ai:\s*['"]3noas-jyaaa-aaaao-a4xda-cai['"]/,
      `raven_ai: '${newCanisterId}'`
    );
    
    writeFileSync(configPath, config, 'utf8');
    console.log(`✅ Updated: ${configPath}`);
    console.log(`   Old ID: ${OLD_RAVEN_AI_ID}`);
    console.log(`   New ID: ${newCanisterId}\n`);
    
    // Update verify script to use new ID
    const verifyPath = 'verify_raven_ai_working.mjs';
    let verifyScript = readFileSync(verifyPath, 'utf8');
    verifyScript = verifyScript.replace(
      /const RAVEN_AI_ID = '3noas-jyaaa-aaaao-a4xda-cai';/,
      `const RAVEN_AI_ID = '${newCanisterId}';`
    );
    writeFileSync(verifyPath, verifyScript, 'utf8');
    console.log(`✅ Updated: ${verifyPath}\n`);
    
    // Verify installation
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
    console.log(`\n🎉 SUCCESS! New canister: ${newCanisterId}`);
    console.log('\n📝 IMPORTANT: Also update dfx.json if it has the old ID hardcoded');
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    
    if (error.message.includes('insufficient cycles')) {
      console.error('\n💡 Identity needs cycles to create canister.');
      console.error(`   Transfer cycles to: ${identityPrincipal.toText()}`);
    } else if (error.message.includes('canister_not_found')) {
      console.error('\n💡 Even create_canister failed with "canister_not_found".');
      console.error('   This suggests the identity cannot use Management Canister.');
      console.error('   Check if identity has cycles and proper permissions.');
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
