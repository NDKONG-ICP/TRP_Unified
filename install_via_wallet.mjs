#!/usr/bin/env node
/**
 * Install raven_ai via wallet canister
 * The wallet canister may be the controller
 */

import { readFileSync } from 'fs';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { homedir } from 'os';
import { join } from 'path';

const RAVEN_AI_ID = '3noas-jyaaa-aaaao-a4xda-cai';
const WALLET_ID = 'daf6l-jyaaa-aaaao-a4nba-cai'; // Wallet canister that may control raven_ai

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
  console.log('🚀 Installing raven_ai via wallet canister\n');

  const identity = loadIdentity();
  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  const wasmPath = 'target/wasm32-unknown-unknown/release/raven_ai.wasm';
  const wasmModule = readFileSync(wasmPath);
  
  console.log(`✅ WASM: ${(wasmModule.length / 1024 / 1024).toFixed(2)} MB\n`);

  // Wallet canister interface - forward call to management canister
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

  try {
    const walletActor = Actor.createActor(walletIDL, {
      agent,
      canisterId: Principal.fromText(WALLET_ID),
    });

    // Encode install_code call
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

    console.log('📦 Calling wallet to install code...');
    const result = await walletActor.wallet_call({
      canister: Principal.fromText('aaaaa-aa'), // Management canister
      method_name: 'install_code',
      args: Array.from(installArgs),
      cycles: 0n,
    });

    if ('Ok' in result) {
      console.log('✅ Installation successful via wallet!');
    } else {
      console.error(`❌ Installation failed: ${result.Err}`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error('\n💡 Trying direct installation as fallback...\n');
    
    // Fallback to direct installation
    const managementIDL = ({ IDL }) => IDL.Service({
      install_code: IDL.Func(
        [
          IDL.Record({
            mode: IDL.Variant({ reinstall: IDL.Null }),
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
      await managementActor.install_code({
        mode: { reinstall: null },
        canister_id: Principal.fromText(RAVEN_AI_ID),
        wasm_module: Array.from(new Uint8Array(wasmModule)),
        arg: [],
      });
      console.log('✅ Direct installation succeeded!');
    } catch (e) {
      console.error(`❌ Direct installation also failed: ${e.message}`);
      process.exit(1);
    }
  }
}

main().catch(console.error);
