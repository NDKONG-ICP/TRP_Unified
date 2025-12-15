#!/usr/bin/env node
/**
 * Check canister state and try to understand why install_code fails
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
  const pemPath = join(homedir(), '.config', 'dfx', 'identity', 'ic_deploy', 'identity.pem');
  return Secp256k1KeyIdentity.fromPem(readFileSync(pemPath, 'utf-8'));
}

async function main() {
  const identity = loadIdentity();
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
        settings: IDL.Record({
          controllers: IDL.Vec(IDL.Principal),
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
    console.log('🔍 Checking canister status...\n');
    const status = await managementActor.canister_status({
      canister_id: Principal.fromText(RAVEN_AI_ID),
    });

    console.log('✅ Canister Status:');
    console.log(`   Status: ${Object.keys(status.status)[0]}`);
    console.log(`   Module Hash: ${status.module_hash.length > 0 ? 'Present (WASM installed)' : 'None (no WASM)'}`);
    console.log(`   Controllers: ${status.settings.controllers.map(c => c.toText()).join(', ')}`);
    
    const isController = status.settings.controllers.some(
      c => c.toText() === identity.getPrincipal().toText()
    );
    console.log(`   Is Controller: ${isController ? 'YES ✅' : 'NO ❌'}`);
    
    if (Object.keys(status.status)[0] === 'stopped') {
      console.log('\n⚠️  Canister is STOPPED - this might prevent install_code');
      console.log('   Try starting it first or use IC Dashboard');
    }
    
  } catch (error) {
    console.error(`❌ Error checking status: ${error.message}`);
    
    if (error.message.includes('canister_not_found')) {
      console.error('\n💡 Management Canister says "canister_not_found"');
      console.error('   But we can read the canister state directly.');
      console.error('   This suggests a bug or subnet routing issue.');
      console.error('\n   Possible solutions:');
      console.error('   1. Use IC Dashboard (bypasses this issue)');
      console.error('   2. Wait and retry (subnet sync issue)');
      console.error('   3. Check if canister is on expected subnet');
    }
  }
}

main().catch(console.error);
