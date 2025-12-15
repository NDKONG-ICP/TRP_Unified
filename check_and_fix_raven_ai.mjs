#!/usr/bin/env node
/**
 * Check raven_ai controllers and install via proper method
 */

import { readFileSync } from 'fs';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { homedir } from 'os';
import { join } from 'path';

const RAVEN_AI_ID = '3noas-jyaaa-aaaao-a4xda-cai';
const WALLET_ID = 'daf6l-jyaaa-aaaao-a4nba-cai';

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
  console.log('🔍 Checking raven_ai canister status\n');

  const identity = loadIdentity();
  const identityPrincipal = identity.getPrincipal();
  console.log(`Identity: ${identityPrincipal.toText()}\n`);

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  // Check canister status
  const managementIDL = ({ IDL }) => IDL.Service({
    canister_status: IDL.Func(
      [IDL.Record({ canister_id: IDL.Principal })],
      [IDL.Record({
        status: IDL.Variant({
          running: IDL.Null,
          stopping: IDL.Null,
          stopped: IDL.Null,
        }),
        settings: IDL.Record({
          controllers: IDL.Vec(IDL.Principal),
        }),
        module_hash: IDL.Opt(IDL.Vec(IDL.Nat8)),
      })],
      ['query']
    ),
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

  try {
    console.log('📋 Getting canister status...');
    const status = await managementActor.canister_status({
      canister_id: Principal.fromText(RAVEN_AI_ID),
    });

    console.log(`✅ Canister status: ${Object.keys(status.status)[0]}`);
    console.log(`✅ Module hash: ${status.module_hash.length > 0 ? 'Present (WASM installed)' : 'None (no WASM)'}`);
    console.log(`\n📋 Controllers:`);
    
    const isController = status.settings.controllers.some(
      c => c.toText() === identityPrincipal.toText()
    );
    
    status.settings.controllers.forEach((controller, i) => {
      const isCurrent = controller.toText() === identityPrincipal.toText();
      console.log(`   ${i + 1}. ${controller.toText()}${isCurrent ? ' ← YOUR IDENTITY' : ''}`);
    });

    console.log(`\n🔐 Permission: ${isController ? '✅ You ARE a controller' : '❌ You are NOT a controller'}`);

    if (!isController) {
      console.log('\n💡 Your identity is not a controller.');
      console.log('   The wallet canister may be the controller.');
      console.log('   Trying installation via wallet...\n');
      
      // Try via wallet
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

      const wasmPath = 'target/wasm32-unknown-unknown/release/raven_ai.wasm';
      const wasmModule = readFileSync(wasmPath);
      
      // Encode install_code call
      const installArgs = IDL.encode(
        [IDL.Record({
          mode: IDL.Variant({ reinstall: IDL.Null }),
          canister_id: IDL.Principal,
          wasm_module: IDL.Vec(IDL.Nat8),
          arg: IDL.Vec(IDL.Nat8),
        })],
        [{
          mode: { reinstall: null },
          canister_id: Principal.fromText(RAVEN_AI_ID),
          wasm_module: Array.from(new Uint8Array(wasmModule)),
          arg: [],
        }]
      );

      console.log('📦 Installing via wallet (WASM too large, will fail but trying anyway)...');
      const result = await walletActor.wallet_call({
        canister: Principal.fromText('aaaaa-aa'),
        method_name: 'install_code',
        args: Array.from(installArgs),
        cycles: 0n,
      });

      if ('Ok' in result) {
        console.log('✅ Installation via wallet succeeded!');
      } else {
        console.log(`❌ Wallet call failed: ${result.Err}`);
        throw new Error('Wallet installation failed');
      }
    } else {
      // Identity is controller, try direct install
      console.log('\n📦 Installing WASM directly (you are a controller)...');
      
      const wasmPath = 'target/wasm32-unknown-unknown/release/raven_ai.wasm';
      const wasmModule = readFileSync(wasmPath);
      
      await managementActor.install_code({
        mode: { reinstall: null },
        canister_id: Principal.fromText(RAVEN_AI_ID),
        wasm_module: Array.from(new Uint8Array(wasmModule)),
        arg: [],
      });
      
      console.log('✅ Installation successful!');
    }

    // Verify
    console.log('\n🧪 Verifying installation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
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
    console.error(`\n❌ Error: ${error.message}`);
    
    if (error.message.includes('canister_not_found')) {
      console.error('\n💡 Management Canister says "canister_not_found"');
      console.error('   This usually means the identity is not a controller.');
      console.error('   Even though you can read the canister, you cannot install code.');
      console.error('\n   Solution: Add your identity as a controller via IC Dashboard');
      console.error('   OR use the wallet canister if it is the controller.');
    } else if (error.message.includes('Payload Too Large')) {
      console.error('\n💡 WASM is too large for wallet_call (2MB limit)');
      console.error('   You must use IC Dashboard to install large WASM files.');
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
