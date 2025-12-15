#!/usr/bin/env node
/**
 * Create raven_ai using manual IDL encoding for wallet call
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
  console.log('🚀 Creating raven_ai via wallet (manual encoding)\n');

  const identity = loadIdentity();
  console.log(`✅ Identity: ${identity.getPrincipal().toText()}\n`);

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  const wasmPath = 'target/wasm32-unknown-unknown/release/raven_ai.wasm';
  const wasmModule = readFileSync(wasmPath);
  
  console.log(`✅ WASM: ${(wasmModule.length / 1024 / 1024).toFixed(2)} MB\n`);

  // Wallet interface for wallet_call
  const walletIDL = ({ IDL }) => IDL.Service({
    wallet_call: IDL.Func(
      [
        IDL.Record({
          args: IDL.Vec(IDL.Nat8),
          cycles: IDL.Nat64,
          method_name: IDL.Text,
          canister: IDL.Principal,
        }),
      ],
      [
        IDL.Variant({
          Ok: IDL.Vec(IDL.Nat8),
          Err: IDL.Text,
        }),
      ],
      []
    ),
  });

  const walletActor = Actor.createActor(walletIDL, {
    agent,
    canisterId: Principal.fromText(WALLET_ID),
  });

  // Management canister interface
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

  try {
    // Encode create_canister call manually
    const createArgs = IDL.encode(
      [IDL.Record({
        settings: IDL.Opt(IDL.Record({
          controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
        })),
      })],
      [{
        settings: [],
      }]
    );

    console.log('📦 Creating canister via wallet (manual encoding)...');
    // Need 500B cycles for canister creation fee + 100B for initial balance = 600B total
    const createResult = await walletActor.wallet_call({
      canister: Principal.fromText('aaaaa-aa'),
      method_name: 'create_canister',
      args: Array.from(createArgs),
      cycles: BigInt(600_000_000_000), // 0.6 TC (500B fee + 100B initial)
    });

    if ('Err' in createResult) {
      throw new Error(`Wallet call failed: ${createResult.Err}`);
    }

    // Decode the result
    const canisterId = IDL.decode(
      [IDL.Record({ canister_id: IDL.Principal })],
      new Uint8Array(createResult.Ok)
    )[0].canister_id;

    const newCanisterId = canisterId.toText();
    console.log(`✅ Created canister: ${newCanisterId}\n`);

    // Now install WASM directly via Management Canister
    console.log('📦 Installing WASM...');
    const managementActor = Actor.createActor(managementIDL, {
      agent,
      canisterId: Principal.fromText('aaaaa-aa'),
    });

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
    process.exit(1);
  }
}

main().catch(console.error);
