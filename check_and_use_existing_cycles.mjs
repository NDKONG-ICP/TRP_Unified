#!/usr/bin/env node
/**
 * Check for existing cycles and create canister with minimal cycles
 * Tries to use wallet's existing cycles more efficiently
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
  console.log('💰 Use Existing Cycles & Create raven_ai');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const identity = loadIdentity();
  const identityPrincipal = identity.getPrincipal();
  console.log(`✅ Identity: ${identityPrincipal.toText()}\n`);

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  // Check wallet balance
  const walletBalanceIDL = ({ IDL }) => IDL.Service({
    wallet_balance: IDL.Func([], [IDL.Record({ amount: IDL.Nat64 })], ['query']),
  });

  const walletActor = Actor.createActor(walletBalanceIDL, {
    agent,
    canisterId: Principal.fromText(WALLET_ID),
  });

  let walletBalance = 0n;
  try {
    const balance = await walletActor.wallet_balance();
    walletBalance = balance.amount;
    const balanceTC = Number(walletBalance) / 1_000_000_000_000;
    console.log(`💰 Wallet balance: ${balanceTC.toFixed(3)} TC\n`);
  } catch (e) {
    console.log(`⚠️  Could not check wallet: ${e.message}\n`);
  }

  // Try to create with minimal cycles (just the creation fee + small buffer)
  // Minimum is 500B for creation fee, but we need some for the canister itself
  const MIN_CYCLES = 550_000_000_000n; // 0.55 TC (500B fee + 50B buffer)
  
  if (walletBalance < MIN_CYCLES) {
    console.log(`❌ Wallet has ${(Number(walletBalance) / 1_000_000_000_000).toFixed(3)} TC`);
    console.log(`   Need at least ${(Number(MIN_CYCLES) / 1_000_000_000_000).toFixed(3)} TC\n`);
    
    console.log('💡 The old canister (3noas-jyaaa-aaaao-a4xda-cai) does NOT exist,');
    console.log('   so there are no cycles to transfer from it.\n');
    
    console.log('🔧 Options:');
    console.log(`   1. Transfer cycles to wallet: ${WALLET_ID}`);
    console.log(`   2. Check if other canisters have cycles to transfer`);
    console.log(`   3. Use ICP to buy cycles (via NNS or cycles wallet)\n`);
    
    // Check other canisters from dfx.json
    console.log('📋 Checking other canisters for available cycles...');
    try {
      const dfxJson = JSON.parse(readFileSync('dfx.json', 'utf8'));
      const canisters = dfxJson.canisters || {};
      
      const managementStatusIDL = ({ IDL }) => IDL.Service({
        canister_status: IDL.Func(
          [IDL.Record({ canister_id: IDL.Principal })],
          [IDL.Record({
            status: IDL.Variant({
              running: IDL.Null,
              stopping: IDL.Null,
              stopped: IDL.Null,
            }),
            cycles: IDL.Nat64,
          })],
          []
        ),
      });
      
      const statusActor = Actor.createActor(managementStatusIDL, {
        agent,
        canisterId: Principal.fromText('aaaaa-aa'),
      });
      
      let foundCycles = false;
      for (const [name, config] of Object.entries(canisters)) {
        if (name === 'raven_ai' || !config.id) continue;
        
        try {
          const canisterId = Principal.fromText(config.id);
          const status = await statusActor.canister_status({ canister_id: canisterId });
          const cyclesTC = Number(status.cycles) / 1_000_000_000_000;
          
          if (Number(status.cycles) > 1_000_000_000_000) { // More than 1 TC
            console.log(`   ✅ ${name} (${config.id}): ${cyclesTC.toFixed(3)} TC`);
            foundCycles = true;
          }
        } catch (e) {
          // Canister might not exist or not accessible
        }
      }
      
      if (!foundCycles) {
        console.log('   ⚠️  No other canisters found with sufficient cycles.\n');
      } else {
        console.log('\n💡 You can transfer cycles from these canisters to the wallet.\n');
      }
    } catch (e) {
      console.log(`   ⚠️  Could not check other canisters: ${e.message}\n`);
    }
    
    process.exit(1);
  }

  // We have enough cycles, proceed with creation
  const wasmPath = 'target/wasm32-unknown-unknown/release/raven_ai.wasm';
  const wasmModule = readFileSync(wasmPath);
  
  console.log(`✅ WASM: ${(wasmModule.length / 1024 / 1024).toFixed(2)} MB\n`);

  // Wallet interface
  const walletIDL = ({ IDL }) => IDL.Service({
    wallet_create_canister: IDL.Func(
      [IDL.Record({
        cycles: IDL.Nat64,
        settings: IDL.Opt(IDL.Record({
          controller: IDL.Opt(IDL.Principal),
          freezing_threshold: IDL.Opt(IDL.Nat),
          controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
          memory_allocation: IDL.Opt(IDL.Nat),
          compute_allocation: IDL.Opt(IDL.Nat),
        })),
      })],
      [IDL.Record({ canister_id: IDL.Principal })],
      []
    ),
  });

  const walletCreateActor = Actor.createActor(walletIDL, {
    agent,
    canisterId: Principal.fromText(WALLET_ID),
  });

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
    // Use minimal cycles
    const cyclesToUse = MIN_CYCLES;
    console.log(`📦 Creating canister with ${(Number(cyclesToUse) / 1_000_000_000_000).toFixed(3)} TC...`);
    
    const createResult = await walletCreateActor.wallet_create_canister({
      cycles: cyclesToUse,
    });

    const newCanisterId = createResult.canister_id.toText();
    console.log(`✅ Created canister: ${newCanisterId}\n`);

    console.log('📦 Installing WASM...');
    await managementActor.install_code({
      mode: { install: null },
      canister_id: createResult.canister_id,
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
      canisterId: createResult.canister_id,
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
