#!/usr/bin/env node
/**
 * Reset raven_ai: Create new canister and install WASM
 * Handles wallet cycles check and provides clear instructions
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
  console.log('🚀 RESET raven_ai: Create new canister and install WASM');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️  The old canister (3noas-jyaaa-aaaao-a4xda-cai) does NOT exist on mainnet.');
  console.log('   Creating a NEW canister.\n');

  const identity = loadIdentity();
  console.log(`✅ Identity: ${identity.getPrincipal().toText()}\n`);

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  // Check wallet balance
  const walletBalanceIDL = ({ IDL }) => IDL.Service({
    wallet_balance: IDL.Func([], [IDL.Record({ amount: IDL.Nat64 })], ['query']),
  });

  const walletBalanceActor = Actor.createActor(walletBalanceIDL, {
    agent,
    canisterId: Principal.fromText(WALLET_ID),
  });

  try {
    console.log('💰 Checking wallet balance...');
    const balance = await walletBalanceActor.wallet_balance();
    const balanceTC = Number(balance.amount) / 1_000_000_000_000;
    console.log(`   Wallet balance: ${balanceTC.toFixed(3)} TC\n`);

    if (Number(balance.amount) < 600_000_000_000) {
      console.log('❌ Wallet has insufficient cycles for canister creation.');
      console.log(`   Current: ${balanceTC.toFixed(3)} TC`);
      console.log(`   Needed: 0.6 TC (for creation + initial balance)\n`);
      console.log('💡 Please top up the wallet:');
      console.log(`   Wallet ID: ${WALLET_ID}`);
      console.log(`   Transfer at least 1 TC to: ${WALLET_ID}\n`);
      process.exit(1);
    }
  } catch (e) {
    console.log(`⚠️  Could not check wallet balance: ${e.message}`);
    console.log('   Proceeding anyway...\n');
  }

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

  const walletActor = Actor.createActor(walletIDL, {
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
    console.log('📦 Creating canister via wallet...');
    const createResult = await walletActor.wallet_create_canister({
      cycles: BigInt(600_000_000_000), // 0.6 TC
    });

    const newCanisterId = createResult.canister_id.toText();
    console.log(`✅ Created canister: ${newCanisterId}\n`);

    console.log('📦 Installing WASM...');
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
    console.log('\n📝 IMPORTANT: Update dfx.json if it references the old ID');

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    
    if (error.message.includes('out of cycles')) {
      console.error('\n💡 Wallet is out of cycles.');
      console.error(`   Top up wallet: ${WALLET_ID}`);
      console.error('   Transfer at least 1 TC to the wallet canister.');
    } else if (error.message.includes('Record is missing key "settings"')) {
      console.error('\n💡 Wallet IDL encoding issue.');
      console.error('   This is a known issue with wallet_create_canister.');
      console.error('   Try using dfx canister create instead.');
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
