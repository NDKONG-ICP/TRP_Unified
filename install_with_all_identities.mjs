#!/usr/bin/env node
/**
 * Try installing with all available identities to find one with permission
 */

import { readFileSync, readdirSync } from 'fs';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { homedir } from 'os';
import { join } from 'path';

const RAVEN_AI_ID = '3noas-jyaaa-aaaao-a4xda-cai';

function loadAllIdentities() {
  const identities = [];
  const identityDir = join(homedir(), '.config', 'dfx', 'identity');
  
  try {
    const dirs = readdirSync(identityDir);
    for (const dir of dirs) {
      const pemPath = join(identityDir, dir, 'identity.pem');
      try {
        const identity = Secp256k1KeyIdentity.fromPem(readFileSync(pemPath, 'utf-8'));
        identities.push({ name: dir, identity, principal: identity.getPrincipal().toText() });
      } catch (e) {
        // Skip invalid identities
      }
    }
  } catch (e) {
    // Fallback to default paths
    const paths = [
      { name: 'ic_deploy', path: join(identityDir, 'ic_deploy', 'identity.pem') },
      { name: 'default', path: join(identityDir, 'default', 'identity.pem') },
    ];
    
    for (const { name, path: pemPath } of paths) {
      try {
        const identity = Secp256k1KeyIdentity.fromPem(readFileSync(pemPath, 'utf-8'));
        identities.push({ name, identity, principal: identity.getPrincipal().toText() });
      } catch (e) {}
    }
  }
  
  return identities;
}

async function tryInstallWithIdentity(identityInfo, wasmModule) {
  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity: identityInfo.identity,
  });

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
    return { success: true, identity: identityInfo };
  } catch (error) {
    return { success: false, identity: identityInfo, error: error.message };
  }
}

async function main() {
  console.log('🔍 Finding identity with permission to install...\n');

  const identities = loadAllIdentities();
  console.log(`Found ${identities.length} identity(ies):`);
  identities.forEach((id, i) => {
    console.log(`   ${i + 1}. ${id.name}: ${id.principal}`);
  });
  console.log('');

  const wasmPath = 'target/wasm32-unknown-unknown/release/raven_ai.wasm';
  const wasmModule = readFileSync(wasmPath);
  console.log(`✅ WASM: ${(wasmModule.length / 1024 / 1024).toFixed(2)} MB\n`);

  console.log('📦 Trying installation with each identity...\n');

  for (const identityInfo of identities) {
    console.log(`Trying ${identityInfo.name} (${identityInfo.principal.substring(0, 20)}...)...`);
    
    const result = await tryInstallWithIdentity(identityInfo, wasmModule);
    
    if (result.success) {
      console.log(`✅ SUCCESS with identity: ${identityInfo.name}`);
      console.log(`   Principal: ${identityInfo.principal}\n`);
      
      // Verify
      console.log('🧪 Verifying installation...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const ravenAIIDL = ({ IDL }) => IDL.Service({
        get_article_stats: IDL.Func([], [IDL.Record({
          total_articles: IDL.Nat64,
          next_article_id: IDL.Nat64,
        })], ['query']),
      });

      const agent = new HttpAgent({
        host: 'https://ic0.app',
        identity: identityInfo.identity,
      });

      const ravenActor = Actor.createActor(ravenAIIDL, {
        agent,
        canisterId: Principal.fromText(RAVEN_AI_ID),
      });

      const stats = await ravenActor.get_article_stats();
      console.log('✅ raven_ai is WORKING!');
      console.log(`   Total articles: ${stats.total_articles}`);
      console.log(`   Next article ID: ${stats.next_article_id}`);
      
      process.exit(0);
    } else {
      console.log(`   ❌ Failed: ${result.error.includes('canister_not_found') ? 'Not a controller' : result.error}\n`);
    }
  }

  console.log('❌ None of the identities have permission to install code.');
  console.log('💡 You need to add one of these identities as a controller via IC Dashboard.');
  process.exit(1);
}

main().catch(console.error);
