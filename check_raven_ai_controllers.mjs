#!/usr/bin/env node
/**
 * Check raven_ai canister controllers and status
 */

import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const RAVEN_AI_ID = '3noas-jyaaa-aaaao-a4xda-cai';

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
  console.log('🔍 Checking raven_ai canister status and controllers\n');

  const identity = loadIdentity();
  console.log(`Identity: ${identity.getPrincipal().toText()}\n`);

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  const managementIDL = ({ IDL }) => IDL.Service({
    canister_status: IDL.Func(
      [IDL.Record({ canister_id: IDL.Principal })],
      [IDL.Record({
        status: IDL.Variant({
          running: IDL.Null,
          stopping: IDL.Null,
          stopped: IDL.Null,
        }),
        memory_size: IDL.Nat,
        cycles: IDL.Nat64,
        settings: IDL.Record({
          controllers: IDL.Vec(IDL.Principal),
          freezing_threshold: IDL.Nat,
          memory_allocation: IDL.Nat,
          compute_allocation: IDL.Nat,
        }),
        module_hash: IDL.Opt(IDL.Vec(IDL.Nat8)),
      })],
      ['query']
    ),
  });

  const managementActor = Actor.createActor(managementIDL, {
    agent,
    canisterId: Principal.fromText('aaaaa-aa'),
  });

  try {
    const status = await managementActor.canister_status({
      canister_id: Principal.fromText(RAVEN_AI_ID),
    });

    console.log('✅ Canister Status:');
    console.log(`   Status: ${Object.keys(status.status)[0]}`);
    console.log(`   Memory: ${(status.memory_size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Cycles: ${status.cycles.toString()}`);
    console.log(`   Module Hash: ${status.module_hash.length > 0 ? 'Present (WASM installed)' : 'None (no WASM)'}`);
    console.log('\n📋 Controllers:');
    status.settings.controllers.forEach((controller, i) => {
      const isCurrent = controller.toText() === identity.getPrincipal().toText();
      console.log(`   ${i + 1}. ${controller.toText()}${isCurrent ? ' ← YOUR IDENTITY' : ''}`);
    });

    const isController = status.settings.controllers.some(
      c => c.toText() === identity.getPrincipal().toText()
    );

    console.log('\n🔐 Permission Check:');
    if (isController) {
      console.log('   ✅ Your identity IS a controller - you can install code');
    } else {
      console.log('   ❌ Your identity is NOT a controller - you cannot install code');
      console.log('   💡 You need to add your identity as a controller first');
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (error.message.includes('not found')) {
      console.error('\n💡 The canister may not exist, or you may not have permission to query it.');
    }
  }
}

main().catch(console.error);
