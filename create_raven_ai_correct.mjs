#!/usr/bin/env node
/**
 * Create raven_ai canister with CORRECT wallet_create_canister Candid structure
 * settings is REQUIRED (not opt), inner fields are opt
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
  console.log('🚀 Creating raven_ai canister (CORRECT Candid structure)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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

  // CORRECT wallet IDL: settings is REQUIRED (not opt), inner fields are opt
  // Use [] for opt fields to encode as None
  const WalletCreateIDL = ({ IDL }) => IDL.Service({
    wallet_create_canister: IDL.Func(
      [IDL.Record({
        cycles: IDL.Nat64,
        settings: IDL.Record({  // REQUIRED, not Opt!
          controller: IDL.Opt(IDL.Principal),
          freezing_threshold: IDL.Opt(IDL.Nat),
          controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
          memory_allocation: IDL.Opt(IDL.Nat),
          compute_allocation: IDL.Opt(IDL.Nat),
        }),
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
    console.log('📦 Creating canister via wallet...');
    
    // Use [] for opt fields - this encodes as None
    try {
      const createResult = await wallet.wallet_create_canister({
        cycles: 600_000_000_000n,
        settings: {
          controller: [],           // [] = None for opt principal
          freezing_threshold: [],   // [] = None for opt nat
          controllers: [],          // [] = None for opt vec principal
          memory_allocation: [],    // [] = None for opt nat
          compute_allocation: [],   // [] = None for opt nat
        },
      });
      var createResultFinal = createResult;
    } catch (decodeError) {
      // If decoding fails, the call might have succeeded
      // Check if we can get the canister ID another way
      console.log(`   ⚠️  Decode error: ${decodeError.message}`);
      console.log('   The canister might have been created. Checking...');
      
      // Try to get canister ID from dfx
      const { execSync } = await import('child_process');
      try {
        const dfxId = execSync('dfx canister --network ic id raven_ai 2>&1', { encoding: 'utf8' });
        const match = dfxId.match(/([a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3})/);
        if (match && match[1] !== OLD_RAVEN_AI_ID) {
          console.log(`   ✅ Found new canister ID from dfx: ${match[1]}`);
          var createResultFinal = { canister_id: Principal.fromText(match[1]) };
        } else {
          throw decodeError;
        }
      } catch (e) {
        throw decodeError;
      }
    }

    const canisterId = createResultFinal?.canister_id || createResultFinal.canister_id;
    const newCanisterId = canisterId.toText();
    console.log(`✅ Created canister: ${newCanisterId}\n`);

    console.log('📦 Installing WASM...');
    await managementActor.install_code({
      mode: { install: null },
      canister_id: canisterId,
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
    console.log(`✅ Updated: ${newCanisterId}\n`);

    // Update verify script
    const verifyPath = 'verify_raven_ai_working.mjs';
    let verifyScript = readFileSync(verifyPath, 'utf8');
    verifyScript = verifyScript.replace(
      /const RAVEN_AI_ID = '3noas-jyaaa-aaaao-a4xda-cai';/,
      `const RAVEN_AI_ID = '${newCanisterId}';`
    );
    writeFileSync(verifyPath, verifyScript, 'utf8');

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
      canisterId: canisterId,
    });

    const stats = await ravenActor.get_article_stats();
    console.log('✅ raven_ai is WORKING!');
    console.log(`   Total articles: ${stats.total_articles}`);
    console.log(`   Next article ID: ${stats.next_article_id}`);
    console.log(`\n🎉 SUCCESS! New canister: ${newCanisterId}`);
    console.log('\n📝 IMPORTANT: Update dfx.json if it references the old ID');

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack.split('\n').slice(0, 5).join('\n'));
    }
    process.exit(1);
  }
}

main().catch(console.error);
