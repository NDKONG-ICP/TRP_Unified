#!/usr/bin/env node
/**
 * Create raven_ai via Management Canister using wallet to send cycles
 * This bypasses wallet_create_canister encoding issues
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
  console.log('🚀 Creating raven_ai via Management Canister');
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

  // Use Management Canister directly (identity should have cycles or we use wallet)
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

  const managementActor = Actor.createActor(managementIDL, {
    agent,
    canisterId: Principal.fromText('aaaaa-aa'),
  });

  try {
    console.log('📦 Creating canister via Management Canister...');
    // Try direct call first - if identity has cycles, this will work
    try {
      const createResult = await managementActor.create_canister({
        settings: [],
      });
      var canisterId = createResult.canister_id;
      console.log(`✅ Created: ${canisterId.toText()}\n`);
    } catch (createError) {
      if (createError.message.includes('insufficient cycles') || createError.message.includes('not enough cycles')) {
        console.log('   ⚠️  Identity needs cycles. Using wallet to proxy...');
        
        // Use wallet_call to proxy create_canister with cycles
        const walletCallIDL = ({ IDL }) => IDL.Service({
          wallet_call: IDL.Func(
            [IDL.Record({
              args: IDL.Vec(IDL.Nat8),
              cycles: IDL.Nat64,
              method_name: IDL.Text,
              canister: IDL.Principal,
            })],
            [
              IDL.Variant({
                Ok: IDL.Vec(IDL.Nat8),
                Err: IDL.Text,
              }),
            ],
            []
          ),
        });

        const wallet = Actor.createActor(walletCallIDL, {
          agent,
          canisterId: Principal.fromText(WALLET_ID),
        });

        // Encode create_canister args
        const createArgsIDL = ({ IDL }) => IDL.Record({
          settings: IDL.Opt(IDL.Record({
            controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
          })),
        });

        const encodedArgs = IDL.encode([createArgsIDL({ IDL })], [{
          settings: [],
        }]);

        const result = await wallet.wallet_call({
          canister: Principal.fromText('aaaaa-aa'),
          method_name: 'create_canister',
          args: Array.from(encodedArgs),
          cycles: 600_000_000_000n,
        });

        if ('Err' in result) {
          throw new Error(`Wallet call failed: ${result.Err}`);
        }

        // Decode result
        const resultIDL = ({ IDL }) => IDL.Record({
          canister_id: IDL.Principal,
        });

        const decoded = IDL.decode([resultIDL({ IDL })], new Uint8Array(result.Ok));
        var canisterId = decoded[0].canister_id;
        console.log(`✅ Created via wallet: ${canisterId.toText()}\n`);
      } else {
        throw createError;
      }
    }

    console.log('📦 Installing WASM...');
    await managementActor.install_code({
      mode: { install: null },
      canister_id: canisterId,
      wasm_module: Array.from(new Uint8Array(wasmModule)),
      arg: [],
    });

    console.log('✅ WASM installed successfully!\n');

    const newCanisterId = canisterId.toText();

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
