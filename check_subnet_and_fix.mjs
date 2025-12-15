#!/usr/bin/env node
/**
 * Check canister subnet and try to understand the routing issue
 */

import { HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
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
  console.log('🔍 Diagnosing canister routing issue\n');

  const identity = loadIdentity();
  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  const canisterId = Principal.fromText(RAVEN_AI_ID);

  try {
    // Try to read state with subnet path
    console.log('📡 Reading canister state (including subnet info)...');
    const state = await agent.readState(canisterId, {
      paths: [['subnet']],
    });
    
    console.log('✅ Can read canister state');
    console.log('   This confirms the canister exists and is accessible\n');
    
    // The Management Canister API issue might be because:
    // 1. The canister is on a subnet that Management Canister can't route to
    // 2. There's a bug in the Management Canister API for this specific canister
    // 3. The canister needs to be recreated
    
    console.log('💡 Since Management Canister API fails but we can read state:');
    console.log('   This is likely a Management Canister routing/subnet issue.');
    console.log('\n🔧 Possible solutions:');
    console.log('   1. Recreate the canister (will get new ID)');
    console.log('   2. Wait for subnet sync (could take hours)');
    console.log('   3. Contact DFINITY support about routing issue');
    console.log('   4. Try upgrading/reinstalling dfx to fix color bug');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

main().catch(console.error);
