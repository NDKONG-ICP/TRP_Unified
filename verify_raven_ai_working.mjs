#!/usr/bin/env node
/**
 * Verify raven_ai is actually working by calling it directly
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
  console.log('🧪 Testing raven_ai canister\n');

  const identity = loadIdentity();
  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  // Simple IDL for get_article_stats
  const ravenAIIDL = ({ IDL }) => IDL.Service({
    get_article_stats: IDL.Func([], [IDL.Record({
      total_articles: IDL.Nat64,
      next_article_id: IDL.Nat64,
    })], ['query']),
  });

  try {
    const actor = Actor.createActor(ravenAIIDL, {
      agent,
      canisterId: Principal.fromText(RAVEN_AI_ID),
    });

    console.log('📞 Calling get_article_stats...');
    const result = await actor.get_article_stats();
    
    console.log('✅ raven_ai is WORKING!');
    console.log(`   Total articles: ${result.total_articles}`);
    console.log(`   Next article ID: ${result.next_article_id}`);
    console.log('\n✅ WASM is installed and canister is functional!');
    
  } catch (error) {
    if (error.message.includes('no Wasm module') || error.message.includes('Wasm module')) {
      console.error('❌ raven_ai has NO WASM MODULE installed');
      console.error('\n💡 The installation did not succeed.');
      process.exit(1);
    } else {
      console.error(`❌ Error: ${error.message}`);
      console.error('\n💡 Canister may be installed but method signature may differ.');
      process.exit(1);
    }
  }
}

main().catch(console.error);
