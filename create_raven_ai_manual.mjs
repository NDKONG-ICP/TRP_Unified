#!/usr/bin/env node
/**
 * Create raven_ai using manual IDL encoding to bypass Actor type checking
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
  console.log('🚀 Creating raven_ai canister (manual encoding)');
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

  // Use raw agent call to bypass Actor decoding issues
  async function walletCall(methodName, targetCanister, args, cycles) {
    const walletCallIDL = ({ IDL }) => IDL.Record({
      args: IDL.Vec(IDL.Nat8),
      cycles: IDL.Nat64,
      method_name: IDL.Text,
      canister: IDL.Principal,
    });

    const encodedArgs = IDL.encode([walletCallIDL({ IDL })], [{
      args: Array.from(args),
      cycles: cycles,
      method_name: methodName,
      canister: targetCanister,
    }]);

    // Call wallet directly using agent's call method
    const response = await agent.call(
      Principal.fromText(WALLET_ID),
      {
        methodName: 'wallet_call',
        arg: encodedArgs,
      }
    );

    // Decode response as variant
    const resultIDL = ({ IDL }) => IDL.Variant({
      Ok: IDL.Vec(IDL.Nat8),
      Err: IDL.Text,
    });

    const decoded = IDL.decode([resultIDL({ IDL })], response);
    if ('Err' in decoded[0]) {
      throw new Error(`Wallet call failed: ${decoded[0].Err}`);
    }
    return new Uint8Array(decoded[0].Ok);
  }

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
    console.log('📦 Creating canister via Management Canister (via wallet)...');
    
    // Use Management Canister's create_canister via wallet_call
    const createCanisterIDL = ({ IDL }) => IDL.Record({
      settings: IDL.Opt(IDL.Record({
        controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
      })),
    });

    // Encode create_canister args with empty settings (None)
    const args = IDL.encode([createCanisterIDL({ IDL })], [{
      settings: [], // None
    }]);

    const resultBytes = await walletCall(
      'create_canister',
      Principal.fromText('aaaaa-aa'),
      args,
      600_000_000_000n
    );

    // Decode Management Canister's create_canister result
    const createResultIDL = ({ IDL }) => IDL.Record({
      canister_id: IDL.Principal,
    });

    const decoded = IDL.decode([createResultIDL({ IDL })], resultBytes);
    const canisterId = decoded[0].canister_id;
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
    console.log(`\n🎉 SUCCESS! New canister: ${newCanisterId}`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

main().catch(console.error);
